const express = require('express');
const fixtures = require('./fixtures');

// Forces the captured sample instead of live calls. Set it to see exactly what
// a visitor gets on a day the allowance is gone, without waiting for that day.
const FORCE_FIXTURES = process.env.USE_FIXTURES === 'true';

// Sent on every response the fixtures served, so the UI can say plainly that
// it is showing a sample. Stale data passed off as live is worse than an error.
const FIXTURE_HEADER = 'X-Data-Source';

/**
 * Quota exhaustion is the one upstream failure with a good answer available,
 * so it is the only one that falls back. A network blip or a bad request
 * should still surface as an error — quietly serving twelve fixed recipes in
 * place of a real failure would hide the bug that caused it.
 */
function shouldFallBack(error) {
  return error.status === 402 && fixtures.available();
}

// The API key lives here and only here. It is read from the environment, used
// to build an outbound URL on this server, and never appears in a response —
// which is the whole reason this proxy exists. Anything the browser is allowed
// to see, it can copy.
const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE = 'https://api.spoonacular.com';

// The API sorts only approximately, so we pull a wider pool and the frontend
// orders it itself. Measured on a 27-item fridge: 24 results surfaced 7
// complete matches, 60 surfaced 9. Past 60 it plateaus.
const RESULT_COUNT = 60;

// A free Spoonacular plan is a daily point budget, not a request count, and a
// search with nutrition costs several points. Caching is what lets more than a
// handful of visitors look around in one day: two people with similar fridges
// pay for one call between them.
const TTL = {
  search: 6 * 60 * 60 * 1000, // 6h — recipe results barely move day to day
  detail: 24 * 60 * 60 * 1000, // 24h — a recipe's own page moves less still
};
const MAX_ENTRIES = 500;

const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  // Re-insert so the Map's insertion order doubles as a recency list.
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key, value, ttl) {
  if (cache.size >= MAX_ENTRIES) {
    // Oldest key first — Map iteration order is insertion order.
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { value, expires: Date.now() + ttl });
}

/** Bounded integer, or null when the caller sent nothing usable. */
function num(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Comma list in, clean array out. Capped so one request can't build a URL of
 *  unbounded length against the upstream API. */
function list(value, limit = 100) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 60)
    .slice(0, limit);
}

async function callSpoonacular(path, params) {
  const url = `${BASE}${path}?${params.toString()}&apiKey=${API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    const err = new Error(
      response.status === 402
        ? "Taktouka's recipe allowance for today is used up. It resets tomorrow."
        : 'Could not reach the recipe service.'
    );
    err.status = response.status === 402 ? 402 : 502;
    throw err;
  }

  return response.json();
}

const router = express.Router();

/**
 * Recipe search.
 *
 * The frontend sends its fridge and its macro target; every decision about how
 * that becomes a Spoonacular query is made here, so the browser never needs to
 * know the API's shape — or its key.
 */
router.get('/search', async (req, res) => {
  // Sorted: order carries no meaning to includeIngredients, but an unsorted
  // list gives the same fridge a different cache key depending on the order
  // things were added in, which quietly doubles the quota it costs.
  const ingredients = list(req.query.ingredients).sort();
  const query = String(req.query.query || '').trim().slice(0, 100);
  const types = list(req.query.type, 10);

  if (ingredients.length === 0 && !query) {
    return res.status(400).json({
      message: 'Add something to your fridge, or search for a recipe by name.',
    });
  }

  const params = new URLSearchParams({
    fillIngredients: 'true',
    addRecipeInformation: 'true',
    // Needed for the kcal / protein figures on every card.
    addRecipeNutrition: 'true',
    number: String(RESULT_COUNT),
  });

  // DO NOT REMOVE while includeIngredients is in play.
  //
  // This looks like a cosmetic ordering preference. It isn't. Without it
  // Spoonacular treats includeIngredients as a strict AND — the recipe must
  // contain every ingredient you listed — so a realistic fridge matches
  // nothing at all. With it, the same list becomes a ranking hint.
  //
  // Measured on a 7-ingredient fridge: 0 results without, 3323 with.
  if (ingredients.length > 0) {
    params.set('sort', 'min-missing-ingredients');
  }

  // ranking=1 minimises missing ingredients, which is the whole point of a
  // saved fridge. A text query is a different intent, though: there you want
  // the dish you asked for, so ranking=2 maximises the ingredients you already
  // have instead of burying the match.
  if (query && ingredients.length > 0) {
    params.set('query', query);
    params.set('includeIngredients', ingredients.join(','));
    params.set('ranking', '2');
  } else if (query) {
    params.set('query', query);
  } else {
    params.set('includeIngredients', ingredients.join(','));
    params.set('ranking', '1');
  }

  if (types.length > 0 && !types.includes('all')) {
    params.set('type', types.join(','));
  }

  // Only a macro the user actually set reaches the API. A row sitting at its
  // full range means "don't filter on this", and sending it would narrow
  // results for no reason.
  const MACROS = {
    Calories: [0, 5000],
    Protein: [0, 300],
    Fat: [0, 200],
    Carbs: [0, 500],
  };
  for (const [name, [floor, ceiling]] of Object.entries(MACROS)) {
    const min = num(req.query[`min${name}`], floor, ceiling);
    const max = num(req.query[`max${name}`], floor, ceiling);
    if (min === null || max === null) continue;
    if (min <= floor && max >= ceiling) continue; // unset
    params.set(`min${name}`, String(min));
    params.set(`max${name}`, String(max));
  }

  // Sorted, so two fridges holding the same things share one cache entry
  // whatever order they were added in.
  params.sort();
  const key = `search:${params.toString()}`;

  if (FORCE_FIXTURES) {
    res.set(FIXTURE_HEADER, 'fixture');
    return res.json(fixtures.getSearch());
  }

  const cached = cacheGet(key);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await callSpoonacular('/recipes/complexSearch', params);
    const results = data.results || [];
    cacheSet(key, results, TTL.search);
    res.set('X-Cache', 'MISS');
    res.json(results);
  } catch (error) {
    if (shouldFallBack(error)) {
      res.set(FIXTURE_HEADER, 'fixture');
      return res.json(fixtures.getSearch());
    }
    res.status(error.status || 502).json({ message: error.message });
  }
});

/**
 * Ingredient autocomplete for the fridge search box.
 *
 * Mounted under /api/ingredients rather than here, but it is the same upstream
 * account and the same key, so it belongs in this file.
 */
const ingredientsRouter = express.Router();

ingredientsRouter.get('/autocomplete', async (req, res) => {
  const query = String(req.query.query || '').trim().slice(0, 50);
  if (query.length < 2) return res.json([]);

  if (FORCE_FIXTURES) {
    res.set(FIXTURE_HEADER, 'fixture');
    return res.json(fixtures.getAutocomplete(query));
  }

  const key = `autocomplete:${query.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await callSpoonacular(
      '/food/ingredients/autocomplete',
      new URLSearchParams({ query, number: '6' })
    );
    const results = Array.isArray(data) ? data : [];
    // Long TTL: the set of foods that exist does not change.
    cacheSet(key, results, TTL.detail);
    res.set('X-Cache', 'MISS');
    res.json(results);
  } catch (error) {
    // The fridge grid stays usable even with no upstream budget left: these
    // names come from our own catalogue, so they are always available.
    if (error.status === 402) {
      res.set(FIXTURE_HEADER, 'fixture');
      return res.json(fixtures.getAutocomplete(query));
    }
    res.status(error.status || 502).json({ message: error.message });
  }
});

/** One recipe, with nutrition. Registered last: /search would otherwise be
 *  swallowed by this route's :id parameter. */
router.get('/:id', async (req, res) => {
  const id = num(req.params.id, 1, Number.MAX_SAFE_INTEGER);
  if (id === null) {
    return res.status(400).json({ message: 'That is not a recipe id.' });
  }

  // A card in the sample grid has to open, or the fallback only half works.
  const fixture = fixtures.getRecipe(id);
  if (FORCE_FIXTURES) {
    if (fixture) {
      res.set(FIXTURE_HEADER, 'fixture');
      return res.json(fixture);
    }
    // The flag means "spend no quota", so an id outside the sample is a miss,
    // not a reason to go upstream anyway.
    return res
      .status(404)
      .json({ message: 'That recipe is not part of the offline sample.' });
  }

  const key = `detail:${id}`;
  const cached = cacheGet(key);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await callSpoonacular(
      `/recipes/${id}/information`,
      new URLSearchParams({ includeNutrition: 'true' })
    );
    cacheSet(key, data, TTL.detail);
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (error) {
    if (shouldFallBack(error) && fixture) {
      res.set(FIXTURE_HEADER, 'fixture');
      return res.json(fixture);
    }
    res.status(error.status || 502).json({ message: error.message });
  }
});

module.exports = {
  router,
  ingredientsRouter,
  hasKey: () => Boolean(API_KEY),
};
