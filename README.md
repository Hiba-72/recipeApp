# Taktouka

Tells you what you can cook **tonight**, from what's already in your fridge.

Most recipe sites start from the dish and leave you to go shopping. Taktouka starts
from your ingredients: save your fridge once, set a macro target if you want one, and
every visit opens on recipes ranked by how little you're missing.

> **Live demo:** _add your URL here_ · **Walkthrough:** _add your GIF here_

## What it does

- **A fridge you save once.** Ingredients persist in the browser, so you land on
  results instead of a search box. Names are canonicalised against the recipe API on
  entry, so a typo can't quietly degrade every future suggestion.
- **Macro targets, in plain language.** Pick "Build muscle" or set the sliders. Each
  card shows its own kcal and protein against your target, green when it fits.
- **Ranked by what you're missing.** Not the API's ordering — see the note below.
- **297-ingredient catalogue**, including a Moroccan section (preserved lemon,
  harissa, ras el hanout, smen) that general recipe apps tend to skip.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 (CRA), Redux Toolkit, React Router, Tailwind CSS |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB — the ingredient catalogue |
| Recipe data | [Spoonacular](https://spoonacular.com/food-api), proxied server-side |

## Architecture

```
browser ──▶ Express (backend/server.js) ──▶ Spoonacular
   │             │  holds the API key
   │             │  caches + rate-limits
   │             └──▶ MongoDB (ingredient catalogue)
   └── localStorage: your fridge, macros, favourites
```

**The browser never talks to Spoonacular directly.** Every call goes through
`/api/recipes/*`, which is the only place the API key exists. A `REACT_APP_*` variable
is compiled into the bundle and readable by anyone who opens devtools, so a key there
is a published key — the proxy in [`backend/spoonacular.js`](backend/spoonacular.js)
is what makes this deployable in public at all.

Two things that proxy buys beyond secrecy:

- **A response cache** (6h on searches, 24h on recipes). A free Spoonacular plan is a
  daily point budget, and a search with nutrition costs several points. Fridges are
  sorted before they become a cache key, so the same ingredients added in a different
  order share one entry rather than paying twice.
- **Rate limiting** — 60 recipe requests per IP per 15 minutes, so one script can't
  burn the day's allowance for everyone else.

### When the allowance runs out

A free plan is a daily point budget, and once it's spent every upstream call fails
until midnight. For an app whose main job is to be looked at, that's the difference
between a working demo and a broken link — so the proxy falls back to a captured
sample instead of an error.

- Twelve real recipes in [`backend/fixtures/`](backend/fixtures), captured from live
  API responses by `npm run capture-fixtures` and projected down to the fields the UI
  reads (1.3 MB verbatim → 60 KB).
- Every fixture response carries `X-Data-Source: fixture`, and the UI says plainly
  that it's showing a sample. Stale data presented as live would be worse than the
  error it replaces.
- Ingredient autocomplete falls back to the local 297-item catalogue rather than a
  snapshot, so it stays in step with what the fridge grid offers.
- **Only quota exhaustion falls back.** A network blip or a bad request still surfaces
  as an error — quietly serving twelve fixed recipes in place of a real failure would
  hide the bug that caused it.

`USE_FIXTURES=true` forces this path, so you can see what a visitor gets on an
exhausted day without waiting for one.

## Getting started

Requires Node.js 18+ and a MongoDB instance (Docker is the easiest route).

```bash
# 1. Install everything
npm run install:all

# 2. Configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# put your Spoonacular API key in backend/.env  (server-side, not frontend)

# 3. Start MongoDB (skip if you already run one on :27017)
npm run db

# 4. Load the ingredient catalogue
npm run seed

# 5. Run the API (:5000) and the dev server (:3001)
npm start
```

Open http://localhost:3001.

```bash
npm test    # unit tests for the macro logic
```

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `backend/.env` | `SPOONACULAR_API_KEY` | **Server-side only.** Never sent to the browser. |
| `backend/.env` | `MONGODB_URI` | Connection string (default `mongodb://localhost:27017/RecipeFinder`) |
| `backend/.env` | `PORT` | API port (default `5000`) |
| `backend/.env` | `USE_FIXTURES` | Force the offline sample instead of live calls (default `false`) |
| `backend/.env` | `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API. Leave empty in production when one service serves both halves. |
| `frontend/.env` | `REACT_APP_API_URL` | Where the API lives. Leave unset in production — requests are then same-origin. |
| `frontend/.env` | `PORT` | Dev server port (`3001`) |

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness, DB state, recipe key, and whether a fallback sample is present |
| `GET` | `/api/ingredients` | The ingredient catalogue |
| `GET` | `/api/ingredients/autocomplete?query=` | Ingredient name lookup (proxied) |
| `GET` | `/api/recipes/search?ingredients=&query=&type=&min*=&max*=` | Ranked recipe search (proxied, cached) |
| `GET` | `/api/recipes/:id` | One recipe with nutrition (proxied, cached) |

The catalogue is **read-only over HTTP** by design — it's seeded from
`backend/seed/ingredients.json` by `npm run seed`, so there's no reason to expose a
write route to the internet.

## Deploying

The backend serves the built frontend when `frontend/build` exists, so the whole app
is one service and every API call is same-origin.

```bash
npm run build     # installs, then builds the frontend
npm run serve     # one process serving API + app
```

On a platform like Render: build `npm run build`, start `npm run serve`, and set
`SPOONACULAR_API_KEY` and `MONGODB_URI` (MongoDB Atlas has a free tier) as environment
variables. `ALLOWED_ORIGINS` can stay empty.

## Notes on the implementation

A few decisions that aren't obvious from the code:

- **`sort=min-missing-ingredients` is load-bearing, not cosmetic.** Without it
  Spoonacular treats `includeIngredients` as a strict AND — every listed ingredient
  must appear — and a realistic fridge matches nothing. Measured on a 7-ingredient
  fridge: 0 results without it, 3323 with.
- **Results are re-sorted client-side.** The API's own ordering is approximate; a
  recipe you can cook completely routinely arrives behind several you can't.
- **Recipe instructions are sanitised before rendering.** They're third-party HTML
  going into `dangerouslySetInnerHTML`, so DOMPurify strips them to a formatting-only
  allowlist — no scripts, handlers, links or embeds.

## Decisions

- **No user accounts, deliberately.** The app's promise is that you save your fridge
  once and land straight on results — a sign-up wall would sit in front of the one
  thing it does well. State lives in `localStorage`, which delivers that with no
  credential surface to get wrong. The trade is no cross-device sync; worth it here.
- **The catalogue is a fixed seed file, not user-editable over HTTP.** Ingredient
  names are the join key to the recipe API, so uncontrolled entries would quietly
  degrade every future search.

## Known gaps

- `/favorites` is a placeholder — saving works and persists, the listing screen
  doesn't exist yet.
- The response cache is in-process, so it resets on restart and isn't shared across
  instances. Redis would be the next step if this ever ran on more than one dyno.
- Express 4 carries a moderate `qs` advisory; clearing it means the Express 5
  migration.

## License

MIT — see [LICENSE](LICENSE).
