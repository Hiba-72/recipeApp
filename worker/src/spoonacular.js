import * as fixtures from './fixtures';

const BASE = 'https://api.spoonacular.com';

// Sent on every response the fixtures served, so the UI can say plainly that
// it is showing a sample. Stale data passed off as live is worse than an error.
export const FIXTURE_HEADER = 'X-Data-Source';

// The API sorts only approximately, so we pull a wider pool and the frontend
// orders it itself. Measured on a 27-item fridge: 24 results surfaced 7
// complete matches, 60 surfaced 9. Past 60 it plateaus.
const RESULT_COUNT = 60;

// A free Spoonacular plan is a daily point budget, not a request count, and a
// search with nutrition costs several points. Caching is what lets more than a
// handful of visitors look around in one day: two people with similar fridges
// pay for one call between them.
export const TTL = {
  search: 6 * 60 * 60, // 6h, in seconds — recipe results barely move day to day
  detail: 24 * 60 * 60, // 24h — a recipe's own page moves less still
};

/**
 * Quota exhaustion is the one upstream failure with a good answer available,
 * so it is the only one that falls back. A network blip or a bad request
 * should still surface as an error — quietly serving twelve fixed recipes in
 * place of a real failure would hide the bug that caused it.
 */
export function shouldFallBack(error) {
  return error.status === 402 && fixtures.available();
}

/** Bounded integer, or null when the caller sent nothing usable. */
export function num(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Comma list in, clean array out. Capped so one request can't build a URL of
 * unbounded length against the upstream API.
 */
export function list(value, limit = 100) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 60)
    .slice(0, limit);
}

/**
 * Drops results with no photograph.
 *
 * A recipe card is mostly its image. One card falling back to the stripe
 * placeholder in an otherwise photographic grid reads as a broken image, not
 * as a deliberate blank, and it is the single thing that makes the whole grid
 * look unfinished.
 *
 * Measured: across 180 live results from three different fridges, every one
 * already had an image. This is a guarantee, not a filter doing visible work.
 */
export function withImages(results) {
  return results.filter(
    (r) => typeof r.image === 'string' && r.image.trim() !== ''
  );
}

/**
 * The API key is read from the Worker's secret store, used to build one
 * outbound URL, and never appears in a response — which is the whole reason
 * this proxy exists. Anything the browser is allowed to see, it can copy.
 *
 * Unlike the Node version this takes the key as an argument: a Worker gets its
 * environment per-request rather than from a module-level process.env, so
 * there is nothing to read at import time.
 */
export async function callSpoonacular(path, params, apiKey) {
  const url = `${BASE}${path}?${params.toString()}&apiKey=${apiKey}`;
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

/**
 * Builds the Spoonacular search query from a fridge and a macro target.
 *
 * Every decision about how a fridge becomes an upstream query is made here, so
 * the browser never needs to know the API's shape — or its key. Lifted from
 * the Express implementation without changing a single parameter: this is the
 * part of the app that took the longest to get right, and the port was not an
 * excuse to revisit it.
 */
export function buildSearchParams(query) {
  // Sorted: order carries no meaning to includeIngredients, but an unsorted
  // list gives the same fridge a different cache key depending on the order
  // things were added in, which quietly doubles the quota it costs.
  const ingredients = list(query.ingredients).sort();
  const text = String(query.query || '').trim().slice(0, 100);
  const types = list(query.type, 10);

  if (ingredients.length === 0 && !text) return null;

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
  if (text && ingredients.length > 0) {
    params.set('query', text);
    params.set('includeIngredients', ingredients.join(','));
    params.set('ranking', '2');
  } else if (text) {
    params.set('query', text);
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
    const min = num(query[`min${name}`], floor, ceiling);
    const max = num(query[`max${name}`], floor, ceiling);
    if (min === null || max === null) continue;
    if (min <= floor && max >= ceiling) continue; // unset
    params.set(`min${name}`, String(min));
    params.set(`max${name}`, String(max));
  }

  // Sorted, so two fridges holding the same things share one cache entry
  // whatever order they were added in.
  params.sort();
  return params;
}
