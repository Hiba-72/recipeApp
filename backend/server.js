// Must run before anything reads process.env — spoonacular.js picks up the API
// key at require time.
//
// The path is pinned to this directory rather than left to default. dotenv
// resolves a bare .env against process.cwd(), but every npm script here runs
// `node backend/server.js` from the repo root, so the default looked for
// ../.env, silently found nothing, and the server came up with no API key —
// /api/health reported "missing api key". It never surfaced in production
// because Render injects env vars into the process directly.
require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
  quiet: true,
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const Ingredient = require('./models/Ingredient');
const spoonacular = require('./spoonacular');
const fixtures = require('./fixtures');

const app = express();

// Behind a platform proxy (Render, Railway, Fly) the client IP arrives in
// X-Forwarded-For. Without this every visitor looks like the proxy and shares
// one rate-limit bucket.
app.set('trust proxy', 1);

// Same-origin in production, so the list is empty and no cross-origin request
// is allowed. Locally the dev server is on another port, which is a genuine
// cross-origin call and needs naming.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, health checks, and same-origin navigations.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // false, not an Error: the response simply carries no CORS headers and
      // the browser refuses it. Throwing here would turn a blocked origin into
      // a 500 with a stack trace, which reads like a server fault.
      callback(null, false);
    },
  })
);

app.use(express.json({ limit: '10kb' }));

// The recipe budget is a shared, exhaustible resource — one script hammering
// /api/recipes burns the whole day's quota for everyone. This is the cheapest
// thing standing between a public URL and an empty allowance.
app.use(
  ['/api/recipes', '/api/ingredients/autocomplete'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many recipe searches. Try again in a few minutes.' },
  })
);

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/RecipeFinder';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
  });

// Lets a deploy platform tell a cold start from a broken one.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    recipes: spoonacular.hasKey() ? 'configured' : 'missing api key',
    // A deploy with no fixtures has no safety net once the daily budget goes.
    sample: fixtures.available() ? `${fixtures.count} recipes` : 'none',
  });
});

// The ingredient catalogue. Read-only over HTTP by design: it is seeded from
// backend/seed/ingredients.json by `npm run seed`, so there is no reason to
// expose a write route to the internet.
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().lean();
    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ message: 'Error fetching ingredients' });
  }
});

// Everything Spoonacular, proxied. The key stays on this side.
app.use('/api/recipes', spoonacular.router);
app.use('/api/ingredients', spoonacular.ingredientsRouter);

// An unknown /api path is a client calling something that doesn't exist, and
// it should hear that in the same format as every other API response — not in
// Express's default HTML error page.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'No such endpoint.' });
});

// In production this one service also serves the built frontend. That is what
// makes every /api call same-origin — no CORS to configure, one process to
// deploy, and the API key sitting behind the same wall as everything else.
// In development the CRA dev server owns the frontend, so this is skipped.
const buildDir = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));

  // Client-side routing: anything that isn't an API call is a route React
  // knows about, so hand it index.html and let the router decide.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

// Registered last, because Express only treats a four-argument middleware as
// an error handler if everything that might throw is already mounted above it.
// An unexpected throw should not put a stack trace in front of a visitor.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong on our end.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  if (!spoonacular.hasKey()) {
    console.warn(
      'SPOONACULAR_API_KEY is not set — recipe search will return errors.'
    );
  }
});
