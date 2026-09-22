/**
 * Captures a small set of real Spoonacular responses to disk, for the app to
 * fall back on when the daily allowance runs out.
 *
 * Run it rarely — it spends quota. `npm run capture-fixtures` from worker/.
 *
 * Writes into src/data/, which the Worker imports directly: a Worker has no
 * filesystem, so the fallback data has to be bundled rather than read at
 * runtime. That is also why the twelve recipe details land in one keyed
 * recipes.json rather than twelve separate files — one import, instead of a
 * directory listing that would not exist at the edge.
 *
 * The point is that a visitor arriving on a day the budget is already gone
 * still sees a working app instead of an error, so what lands here has to be
 * genuine API output: same shape, same fields, nothing hand-written.
 */
const fs = require('fs');
const path = require('path');

// The key lives in worker/.dev.vars (gitignored) — the same file `wrangler dev`
// reads, so there is one local secret rather than one per tool.
const DEV_VARS = path.join(__dirname, '..', '.dev.vars');
if (fs.existsSync(DEV_VARS)) {
  for (const line of fs.readFileSync(DEV_VARS, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE = 'https://api.spoonacular.com';
const OUT = path.join(__dirname, '..', 'src', 'data');

// A deliberately ordinary fridge. The sample should look like something a
// person actually owns, because it is the first thing a visitor sees when the
// live budget is gone.
const DEMO_FRIDGE = [
  'Chicken Breast',
  'Tomato',
  'Onion',
  'Garlic',
  'Olive Oil',
  'Pasta',
  'Rice',
  'Eggs',
  'Butter',
  'Lemon',
  'Parsley',
  'Bell Pepper',
  'Potato',
  'Carrot',
  'Cheddar',
];

// Enough to fill the grid without bloating the repo — each detail response is
// substantial once nutrition is included.
const KEEP = 12;

// Nutrient names the UI ever displays. A raw response carries ~30 more, plus
// a per-ingredient breakdown, and they are most of the file size.
const USED_NUTRIENTS = new Set([
  'Calories',
  'Protein',
  'Fat',
  'Carbohydrates',
  'Fiber',
  'Sugar',
]);

const nutrition = (raw) =>
  raw?.nutrients
    ? { nutrients: raw.nutrients.filter((n) => USED_NUTRIENTS.has(n.name)) }
    : undefined;

/**
 * Keep the fields the app reads and drop the rest.
 *
 * These stay real API values — nothing is invented — but a verbatim capture is
 * ~1.3 MB for twelve recipes, most of it wine pairings, taste profiles and
 * per-step equipment metadata nothing renders. Projecting them down keeps the
 * repo honest about its own weight.
 */
function slimSearchResult(r) {
  return {
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    healthScore: r.healthScore,
    nutrition: nutrition(r.nutrition),
    usedIngredients: (r.usedIngredients || []).map((i) => ({ name: i.name })),
    missedIngredients: (r.missedIngredients || []).map((i) => ({ name: i.name })),
  };
}

function slimDetail(d) {
  return {
    id: d.id,
    title: d.title,
    image: d.image,
    readyInMinutes: d.readyInMinutes,
    servings: d.servings,
    healthScore: d.healthScore,
    vegetarian: d.vegetarian,
    vegan: d.vegan,
    glutenFree: d.glutenFree,
    dairyFree: d.dairyFree,
    veryHealthy: d.veryHealthy,
    sourceUrl: d.sourceUrl,
    creditsText: d.creditsText,
    nutrition: nutrition(d.nutrition),
    extendedIngredients: (d.extendedIngredients || []).map((i) => ({
      id: i.id,
      name: i.name,
      nameClean: i.nameClean,
      amount: i.amount,
      unit: i.unit,
    })),
    analyzedInstructions: (d.analyzedInstructions || []).slice(0, 1).map((b) => ({
      steps: (b.steps || []).map((s) => ({ number: s.number, step: s.step })),
    })),
    instructions: d.instructions,
  };
}

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url.split('?')[0]}`);
  }
  return response.json();
}

async function main() {
  if (!API_KEY) {
    console.error('SPOONACULAR_API_KEY is not set. Nothing to capture.');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const params = new URLSearchParams({
    fillIngredients: 'true',
    addRecipeInformation: 'true',
    addRecipeNutrition: 'true',
    number: String(KEEP),
    sort: 'min-missing-ingredients',
    ranking: '1',
    includeIngredients: [...DEMO_FRIDGE].sort().join(','),
    apiKey: API_KEY,
  });

  console.log(`Searching with a ${DEMO_FRIDGE.length}-ingredient demo fridge…`);
  const search = await get(`${BASE}/recipes/complexSearch?${params}`);
  const results = search.results || [];

  if (results.length === 0) {
    console.error('The search came back empty — not overwriting the fixtures.');
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(OUT, 'search.json'),
    JSON.stringify(results.map(slimSearchResult), null, 2)
  );
  console.log(`  search.json — ${results.length} recipes`);

  // Every card in the sample has to be clickable, so each one needs its detail
  // response captured too. Keyed by id into a single file, because a keyed
  // object is what the Worker can import — it cannot read a directory.
  const details = {};
  for (const recipe of results) {
    const detail = await get(
      `${BASE}/recipes/${recipe.id}/information?includeNutrition=true&apiKey=${API_KEY}`
    );
    details[String(recipe.id)] = slimDetail(detail);
    console.log(`  ${recipe.id} — ${detail.title}`);
  }
  fs.writeFileSync(path.join(OUT, 'recipes.json'), JSON.stringify(details));
  console.log(`  recipes.json — ${Object.keys(details).length} details`);

  const bytes =
    fs.statSync(path.join(OUT, 'recipes.json')).size +
    fs.statSync(path.join(OUT, 'search.json')).size;
  console.log(`\nCaptured ${results.length} recipes, ${(bytes / 1024).toFixed(0)} KB total.`);
}

main().catch((err) => {
  console.error('Capture failed:', err.message);
  process.exit(1);
});
