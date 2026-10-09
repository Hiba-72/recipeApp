# Taktouka

Tells you what you can cook **tonight**, from what's already in your fridge.

Most recipe sites start from the dish and leave you to go shopping. Taktouka starts
from your ingredients: save your fridge once, set a macro target if you want one, and
every visit opens on recipes ranked by how little you're missing.

> **[Live demo →](https://taktouka.pages.dev)**
>
> Static frontend on Cloudflare Pages, API on a Worker. Nothing sleeps: the page is
> served from a CDN and the Worker starts in about 20 ms. The previous deploy put
> both halves in one container on a free tier that span down after 15 minutes idle,
> so the first page load after a quiet hour measured **42 seconds** — before any
> JavaScript existed to show that anything was happening.

## What it does

- **A fridge you save once.** Ingredients persist in the browser, so you land on
  results instead of a search box. Names are canonicalised against the recipe API on
  entry, so a typo can't quietly degrade every future suggestion.
- **Macro targets, in plain language.** Pick "Build muscle" or set the sliders. Each
  card shows its own kcal and protein against your target, green when it fits.
- **Ranked by what you're missing.** Not the API's ordering — see the note below.
- **297-ingredient catalogue**, including a Moroccan section (preserved lemon,
  harissa, ras el hanout, smen) that general recipe apps tend to skip.
- **Saved recipes**, kept as ids and re-fetched on demand — so a recipe you saved
  last month shows today's nutrition against today's fridge, not a stale copy.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 (CRA), Redux Toolkit, React Router, Tailwind CSS |
| API | Cloudflare Workers + Hono |
| Hosting | Cloudflare Pages (static) + Workers (API) |
| Recipe data | [Spoonacular](https://spoonacular.com/food-api), proxied edge-side |

## Architecture

```
Cloudflare Pages  ──▶  Cloudflare Worker  ──▶  Spoonacular
 (static bundle)        (worker/src/index.js)
   │                      holds the API key
   │                      caches at the edge
   │
   ├── ingredient catalogue: bundled JSON, no network call
   └── localStorage: your fridge, macros, favourites
```

**Two deploys, not one.** The frontend is static files on a CDN and the API is a
Worker on its own hostname. That split is deliberate: the previous single-service
deploy on a free container tier spun down after 15 minutes idle, so the *first page
load* — HTML included — waited ~50s for the server to boot. A static page has nothing
to wake up, and a Worker starts in milliseconds because there is no container.

**The browser never talks to Spoonacular directly.** Every call goes through
`/api/recipes/*`, which is the only place the API key exists. A `REACT_APP_*` variable
is compiled into the bundle and readable by anyone who opens devtools, so a key there
is a published key — the proxy in [`worker/src/index.js`](worker/src/index.js)
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

- Twelve real recipes in [`worker/src/data/`](worker/src/data), captured from live
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

Requires Node.js 18+. No database — the ingredient catalogue ships in the bundle.

```bash
# 1. Install everything
npm run install:all

# 2. Configure
cp worker/.dev.vars.example worker/.dev.vars
# put your Spoonacular API key in worker/.dev.vars  (never in the frontend)

# 3. Run the Worker (:8787) and the dev server (:3001)
npm start
```

Open http://localhost:3001.

```bash
npm test    # unit tests for the macro logic
```

## Environment variables

The API key is a **secret** and never lives in a file that is committed.

| Where | Variable | Purpose |
| --- | --- | --- |
| `worker/.dev.vars` | `SPOONACULAR_API_KEY` | Local only. Gitignored. |
| `wrangler secret put` | `SPOONACULAR_API_KEY` | Deployed. Stored by Cloudflare, not in the repo. |
| `worker/wrangler.toml` | `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API. Must include the Pages URL. |
| `worker/wrangler.toml` | `USE_FIXTURES` | Force the offline sample instead of live calls (default `false`) |
| Pages build settings | `REACT_APP_API_URL` | The Worker's URL. Baked into the bundle at build time. |

## API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness, recipe key, and whether a fallback sample is present |
| `GET` | `/api/ingredients/autocomplete?query=` | Ingredient name lookup (proxied) |
| `GET` | `/api/recipes/search?ingredients=&query=&type=&min*=&max*=` | Ranked recipe search (proxied, cached) |
| `GET` | `/api/recipes/:id` | One recipe with nutrition (proxied, cached) |

There is **no catalogue endpoint**. That list used to be the app's only database
read — read-only, no writes anywhere — so a whole MongoDB instance existed to serve
one 5 KB file that was already in the repo. It now ships in the frontend bundle as
[`frontend/src/data/ingredients.json`](frontend/src/data/ingredients.json), which
means onboarding never waits on the network and cannot fail.

## Deploying

Two pieces, both on Cloudflare's free tier, neither of which sleeps.

**1. The API (Workers)**

```bash
cd worker
npx wrangler secret put SPOONACULAR_API_KEY   # prompts; never written to disk
npx wrangler deploy
```

Note the URL it prints — that's `REACT_APP_API_URL`. For this project it is
`https://taktouka-api.hiba-elfachtali.workers.dev`.

**2. The frontend (Pages)**

Connect the repo in the Cloudflare dashboard, then:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `frontend/build` |
| Environment variable | `REACT_APP_API_URL` = the Worker URL from step 1 |

**3. Close the loop**

Put the Pages URL into `ALLOWED_ORIGINS` in `worker/wrangler.toml` and redeploy the
Worker. Until you do, the browser will be refused by CORS — deliberately: an empty
allowlist denies every origin, so a half-finished deploy fails loudly instead of
answering everyone quietly.

Use the **stable** Pages URL (`https://taktouka.pages.dev`), not the per-deployment
one with a hash in front of it — that hash changes on every push. Preview deployments
still work: the Worker accepts any subdomain of a `.pages.dev` host on the allowlist,
which covers `https://<hash>.taktouka.pages.dev` without listing each one. That
expansion is restricted to `.pages.dev` entries on purpose; doing it for arbitrary
origins would hand API access to anyone holding a subdomain of them.

**4. Rate limiting — configured in code, nothing to click**

The recipe allowance is a shared daily budget, so a loop over search burns it for
every visitor afterwards. Express guarded this with `express-rate-limit`, which keeps
counters in process memory — something a Worker does not have, since isolates are
created and discarded freely.

It is enforced instead by a `[[ratelimits]]` binding in `wrangler.toml`: 10 requests
per minute per IP, on `/api/recipes/*` and the autocomplete endpoint. It runs before
the cache and before any upstream call, so a rejected request costs nothing.
`/api/health` is exempt, and `/api/health` reports whether the binding is actually
live — a limiter that fails open looks identical to a working one from outside.

This is **not** a WAF rate limiting rule. Those are scoped to a zone, meaning a domain
added to your Cloudflare account; this Worker answers on `*.workers.dev`, which is
Cloudflare's zone and not yours, so there is no zone to attach one to.

Requires **wrangler 4**. Under wrangler 3 the only way to declare this was
`[[unsafe.bindings]]`, which uploads as "Unsafe Metadata" and produces a binding that
exists, accepts calls, and returns success for every one — 60 requests a minute
against a limit of 20, all allowed.

What it does and does not buy: a free Spoonacular plan is 150 points a day and a
search with nutrition costs about 3.9, so the entire daily budget is roughly 38
searches. No per-IP limit can protect that — ten a minute from one address would
exhaust it in four minutes. What this stops is the accidental case: a scraper, a stuck
retry, a loop. Measured on the deployed Worker, 40 parallel requests saw 8 rejected,
while 20 sequential ones saw none; Cloudflare's counters are per-location and
best-effort, so the cutoff is a region rather than a cliff. That shape is the right
one here — bursts get trimmed, ordinary browsing never notices.

The edge cache is what genuinely stretches the budget, and the bundled fixtures are
what make exhaustion survivable rather than fatal.

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

- **The catalogue is a fixed seed file, not user-editable over HTTP.** Ingredient
  names are the join key to the recipe API, so uncontrolled entries would quietly
  degrade every future search.

## On phones

Built to be used one-handed on a phone browser, not just to survive being opened on
one: layouts reflow rather than scroll sideways, inputs are 16px so iOS doesn't zoom
in on focus, the macro sliders get larger thumbs on touch devices, and the onboarding
bar clears the iPhone home indicator.

## Known gaps

- The response cache is in-process, so it resets on restart and isn't shared across
  instances. Redis would be the next step if this ever ran on more than one dyno.
- Express 4 carries a moderate `qs` advisory; clearing it means the Express 5
  migration.

## License

MIT — see [LICENSE](LICENSE).
