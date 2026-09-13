const fs = require('fs');
const path = require('path');

/**
 * The safety net for a day the Spoonacular allowance is already gone.
 *
 * A free plan is a daily point budget. Once it's spent every upstream call
 * 402s, and without this the whole app is an error message until midnight —
 * which, for something whose main job is to be looked at, is the difference
 * between a working demo and a broken link.
 *
 * Captured from real API responses by scripts/capture-fixtures.js, then
 * projected down to the fields the UI reads. Genuine values, just not live
 * ones, which is why every fixture response is labelled as such on the way
 * out: showing stale data as though it were fresh would be worse than the
 * error it replaces.
 */
const DIR = path.join(__dirname, 'fixtures');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// Loaded once at startup. These never change while the process runs, and a
// fallback that needs the disk to be healthy is not much of a fallback.
const search = readJSON(path.join(DIR, 'search.json')) || [];

const recipes = new Map();
try {
  for (const file of fs.readdirSync(path.join(DIR, 'recipes'))) {
    const detail = readJSON(path.join(DIR, 'recipes', file));
    if (detail?.id) recipes.set(Number(detail.id), detail);
  }
} catch {
  // No fixtures on disk. The proxy will surface the upstream error instead,
  // which is the old behaviour — degraded, but not broken.
}

// Ingredient autocomplete falls back to our own catalogue rather than a
// captured response: the seed file is already in the repo, it is larger than
// anything worth capturing, and unlike a snapshot it stays in step with what
// the fridge grid actually offers.
const catalogue = (() => {
  const seed = readJSON(path.join(__dirname, 'seed', 'ingredients.json')) || [];
  const names = [];
  for (const category of seed) {
    for (const sub of category.subcategories || []) {
      for (const item of sub.items || []) names.push(item);
    }
  }
  return names;
})();

/** True when there is enough on disk to be worth falling back to. */
function available() {
  return search.length > 0;
}

/** The captured sample, ignoring the query — it is a sample, not an answer. */
function getSearch() {
  return search;
}

/** A captured recipe, or null when the id isn't one of the twelve. */
function getRecipe(id) {
  return recipes.get(Number(id)) || null;
}

/** Catalogue names matching a prefix, shaped like the upstream response. */
function getAutocomplete(query) {
  const term = String(query).toLowerCase();
  return catalogue
    .filter((name) => name.toLowerCase().includes(term))
    .slice(0, 6)
    .map((name) => ({ name: name.toLowerCase() }));
}

module.exports = {
  available,
  getSearch,
  getRecipe,
  getAutocomplete,
  count: search.length,
};
