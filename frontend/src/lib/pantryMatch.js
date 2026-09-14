/**
 * Matching a recipe's ingredient list against the saved fridge.
 *
 * The search API hands back `usedIngredients` / `missedIngredients` already
 * split for us, but a single recipe fetched by id does not — it just lists
 * everything the recipe needs. So anywhere we show a recipe we looked up
 * ourselves, we have to do the comparison here.
 */

/** Lowercased, depluralised, punctuation stripped. */
export function normalise(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(es|s)$/, "");
}

/** The fridge as a set of normalised names, ready to compare against. */
export function pantryIndex(pantry) {
  return new Set((pantry || []).map(normalise).filter(Boolean));
}

/**
 * Is this recipe ingredient already in the fridge?
 *
 * Substring in both directions on purpose: the fridge says "Olive Oil" where
 * the recipe says "extra virgin olive oil", and "Chicken Breast" where the
 * recipe just says "chicken". Neither would match on equality alone.
 */
export function inPantry(ingredientName, index) {
  const target = normalise(ingredientName);
  if (!target) return false;
  for (const owned of index) {
    if (target.includes(owned) || owned.includes(target)) return true;
  }
  return false;
}

/** Split a recipe's ingredients into what you have and what you'd have to buy. */
export function splitByPantry(ingredients, index) {
  const have = [];
  const need = [];
  for (const item of ingredients || []) {
    (inPantry(item.nameClean || item.name, index) ? have : need).push(item);
  }
  return { have, need };
}

/**
 * Reshape a single fetched recipe to look like a search result.
 *
 * RecipeCard reads `usedIngredients` / `missedIngredients`, which only the
 * search endpoint provides. Filling them in here means the favourites grid can
 * use the very same card as the suggestions grid instead of a near-copy that
 * would drift away from it.
 */
export function asSearchResult(detail, index) {
  const { have, need } = splitByPantry(detail.extendedIngredients, index);
  const name = (i) => ({ name: i.nameClean || i.name });
  return {
    ...detail,
    usedIngredients: have.map(name),
    missedIngredients: need.map(name),
  };
}
