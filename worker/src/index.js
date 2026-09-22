import { Hono } from 'hono';
import { cors } from 'hono/cors';

import * as fixtures from './fixtures';
import {
  FIXTURE_HEADER,
  TTL,
  buildSearchParams,
  callSpoonacular,
  list,
  num,
  shouldFallBack,
  withImages,
} from './spoonacular';

/**
 * Taktouka's API, as a Cloudflare Worker.
 *
 * This replaces an Express server on Render's free tier, where the whole
 * instance spun down after 15 minutes idle and took roughly 50 seconds to
 * cold-boot. A Worker starts in single-digit milliseconds because there is no
 * container to boot, so the cold start is not shortened — it stops existing.
 *
 * The port was possible because this service is thinner than it looks: it
 * proxies Spoonacular to keep the API key off the client, and that is all. It
 * had no writes, no sessions and no sockets, and its one database read served
 * a 5 KB catalogue that now ships in the frontend bundle instead.
 *
 * Two things genuinely changed, both noted where they happen: the cache moved
 * from an in-process Map to the Cloudflare edge cache, and rate limiting moved
 * out of the code entirely.
 */
const app = new Hono();

/**
 * Same-origin is gone, so CORS is real configuration now rather than something
 * avoided by serving both halves from one process.
 *
 * ALLOWED_ORIGINS is a comma-separated allowlist. An empty list denies every
 * browser origin, which is the safe default for a misconfigured deploy: the
 * API stops answering the frontend loudly, rather than answering everyone
 * quietly.
 */
app.use('/api/*', async (c, next) => {
  const allowed = String(c.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ['GET', 'OPTIONS'],
  })(c, next);
});

/**
 * Cloudflare's edge cache, standing in for the old in-process Map.
 *
 * A Worker has no long-lived process to hang a Map off — isolates are created
 * and discarded freely, so an in-memory cache would be empty most of the time
 * and would never be shared between two visitors. The Cache API is the right
 * replacement and is strictly better here: it survives isolate churn and is
 * shared by everyone hitting the same location.
 *
 * The quota argument is unchanged and is the whole point. A free Spoonacular
 * plan is a daily point budget, and a search with nutrition costs several
 * points, so two people with similar fridges paying for one call between them
 * is what lets more than a handful of visitors look around in one day.
 */
async function cached(c, key, ttl, produce) {
  // A cache key has to be a URL. This one is never fetched — it just has to be
  // stable and distinct, so the request's own origin plus the logical key is
  // enough.
  const cacheUrl = new URL(c.req.url);
  cacheUrl.pathname = '/__cache';
  cacheUrl.search = `?k=${encodeURIComponent(key)}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const store = caches.default;

  const hit = await store.match(cacheKey);
  if (hit) {
    const body = await hit.json();
    return c.json(body, 200, { 'X-Cache': 'HIT' });
  }

  const value = await produce();

  // Cached under its own key rather than the visitor's request, so the stored
  // copy carries no CORS headers meant for one particular origin.
  c.executionCtx.waitUntil(
    store.put(
      cacheKey,
      new Response(JSON.stringify(value), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttl}`,
        },
      })
    )
  );

  return c.json(value, 200, { 'X-Cache': 'MISS' });
}

/** Lets a deploy platform tell a cold start from a broken one. */
app.get('/api/health', (c) =>
  c.json({
    ok: true,
    runtime: 'cloudflare-worker',
    recipes: c.env.SPOONACULAR_API_KEY ? 'configured' : 'missing api key',
    // A deploy with no fixtures has no safety net once the daily budget goes.
    sample: fixtures.available() ? `${fixtures.count} recipes` : 'none',
  })
);

/**
 * Recipe search.
 *
 * The frontend sends its fridge and its macro target; every decision about how
 * that becomes a Spoonacular query lives in buildSearchParams.
 */
app.get('/api/recipes/search', async (c) => {
  const query = c.req.query();
  const params = buildSearchParams(query);

  if (!params) {
    return c.json(
      { message: 'Add something to your fridge, or search for a recipe by name.' },
      400
    );
  }

  if (c.env.USE_FIXTURES === 'true') {
    return c.json(fixtures.getSearch(), 200, { [FIXTURE_HEADER]: 'fixture' });
  }

  try {
    return await cached(c, `search:${params.toString()}`, TTL.search, async () => {
      const data = await callSpoonacular(
        '/recipes/complexSearch',
        params,
        c.env.SPOONACULAR_API_KEY
      );
      return withImages(data.results || []);
    });
  } catch (error) {
    if (shouldFallBack(error)) {
      return c.json(fixtures.getSearch(), 200, { [FIXTURE_HEADER]: 'fixture' });
    }
    return c.json({ message: error.message }, error.status || 502);
  }
});

/**
 * Ingredient autocomplete for the fridge search box.
 *
 * Mounted under /api/ingredients, but it is the same upstream account and the
 * same key, so it belongs with the rest of the proxy.
 *
 * Note there is no /api/ingredients catalogue route any more: that list is a
 * static import in the frontend bundle, so it loads instantly and cannot fail.
 */
app.get('/api/ingredients/autocomplete', async (c) => {
  const query = String(c.req.query('query') || '').trim().slice(0, 50);
  if (query.length < 2) return c.json([]);

  if (c.env.USE_FIXTURES === 'true') {
    return c.json(fixtures.getAutocomplete(query), 200, {
      [FIXTURE_HEADER]: 'fixture',
    });
  }

  try {
    // Long TTL: the set of foods that exist does not change.
    return await cached(
      c,
      `autocomplete:${query.toLowerCase()}`,
      TTL.detail,
      async () => {
        const data = await callSpoonacular(
          '/food/ingredients/autocomplete',
          new URLSearchParams({ query, number: '6' }),
          c.env.SPOONACULAR_API_KEY
        );
        return Array.isArray(data) ? data : [];
      }
    );
  } catch (error) {
    // The fridge grid stays usable even with no upstream budget left: these
    // names come from our own catalogue, so they are always available.
    if (error.status === 402) {
      return c.json(fixtures.getAutocomplete(query), 200, {
        [FIXTURE_HEADER]: 'fixture',
      });
    }
    return c.json({ message: error.message }, error.status || 502);
  }
});

/**
 * One recipe, with nutrition.
 *
 * Registered after /search, which Hono requires for the same reason Express
 * did: this route's :id would otherwise swallow the literal path "search".
 */
app.get('/api/recipes/:id', async (c) => {
  const id = num(c.req.param('id'), 1, Number.MAX_SAFE_INTEGER);
  if (id === null) {
    return c.json({ message: 'That is not a recipe id.' }, 400);
  }

  // A card in the sample grid has to open, or the fallback only half works.
  const fixture = fixtures.getRecipe(id);

  if (c.env.USE_FIXTURES === 'true') {
    if (fixture) {
      return c.json(fixture, 200, { [FIXTURE_HEADER]: 'fixture' });
    }
    // The flag means "spend no quota", so an id outside the sample is a miss,
    // not a reason to go upstream anyway.
    return c.json({ message: 'That recipe is not part of the offline sample.' }, 404);
  }

  try {
    return await cached(c, `detail:${id}`, TTL.detail, () =>
      callSpoonacular(
        `/recipes/${id}/information`,
        new URLSearchParams({ includeNutrition: 'true' }),
        c.env.SPOONACULAR_API_KEY
      )
    );
  } catch (error) {
    if (shouldFallBack(error) && fixture) {
      return c.json(fixture, 200, { [FIXTURE_HEADER]: 'fixture' });
    }
    return c.json({ message: error.message }, error.status || 502);
  }
});

app.all('/api/*', (c) => c.json({ message: 'No such endpoint.' }, 404));

// The frontend is served by Cloudflare Pages, not by this Worker. Anything
// that reaches here and isn't /api is someone poking at the API's hostname.
app.all('*', (c) => c.json({ message: 'Taktouka API. Try /api/health.' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ message: 'Something went wrong on our end.' }, 500);
});

export default app;

/*
 * WHAT IS NOT HERE: rate limiting.
 *
 * The Express version used express-rate-limit to cap /api/recipes and the
 * autocomplete endpoint at 60 requests per 15 minutes, because the recipe
 * allowance is a shared, exhaustible daily budget and one script hammering
 * search burns it for everyone.
 *
 * That package keeps its counters in process memory, which a Worker does not
 * have — isolates come and go, so every request could see a fresh, empty
 * counter. Porting it as-is would have produced something that looked like
 * protection and wasn't, which is worse than none.
 *
 * The replacement belongs in Cloudflare rather than in this file: add a Rate
 * Limiting Rule on the Worker's route in the dashboard (Security -> WAF ->
 * Rate limiting rules). It runs before the Worker is even invoked, so it also
 * costs nothing when it fires. Until that rule exists, the edge cache above is
 * the only thing between a public URL and an empty allowance.
 */
