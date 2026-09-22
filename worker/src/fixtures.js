import search from './data/search.json';
import recipes from './data/recipes.json';
import catalogue from './data/ingredients.json';

/**
 * The safety net for a day the Spoonacular allowance is already gone.
 *
 * A free plan is a daily point budget. Once it's spent every upstream call
 * 402s, and without this the whole app is an error message until midnight —
 * which, for something whose main job is to be looked at, is the difference
 * between a working demo and a broken link.
 *
 * Captured from real API responses, then projected down to the fields the UI
 * reads. Genuine values, just not live ones, which is why every fixture
 * response is labelled as such on the way out: showing stale data as though it
 * were fresh would be worse than the error it replaces.
 *
 * Ported from the Express version by turning three disk reads into three
 * static imports. A Worker has no filesystem, so the JSON is bundled at build
 * time — which also removes the "no fixtures on disk" failure mode the old
 * one had to guard against.
 */

/** Flat list of every catalogue name, for the autocomplete fallback. */
const names = [];
for (const category of catalogue) {
  for (const sub of category.subcategories || []) {
    for (const item of sub.items || []) names.push(item);
  }
}

/** True when there is enough bundled to be worth falling back to. */
export function available() {
  return search.length > 0;
}

/** The captured sample, ignoring the query — it is a sample, not an answer. */
export function getSearch() {
  return search;
}

/** A captured recipe, or null when the id isn't one of the twelve. */
export function getRecipe(id) {
  return recipes[String(id)] || null;
}

/**
 * Catalogue names matching a prefix, shaped like the upstream response.
 *
 * Falls back to our own catalogue rather than a captured API response: it is
 * already bundled, it is larger than anything worth capturing, and unlike a
 * snapshot it stays in step with what the fridge grid actually offers.
 */
export function getAutocomplete(query) {
  const term = String(query).toLowerCase();
  return names
    .filter((name) => name.toLowerCase().includes(term))
    .slice(0, 6)
    .map((name) => ({ name: name.toLowerCase() }));
}

export const count = search.length;
