import { MACRO_LIMITS, isMacroUnset } from "./storage";

// Spoonacular's nutrient names, mapped to our macro keys.
const NUTRIENT_NAMES = {
  calories: "Calories",
  protein: "Protein",
  fat: "Fat",
  carbs: "Carbohydrates",
};

/**
 * Pull a nutrient out of a recipe's nutrition block.
 * Values from complexSearch are per serving.
 */
export function getNutrient(recipe, key) {
  const wanted = NUTRIENT_NAMES[key];
  if (!wanted) return null;
  const found = recipe?.nutrition?.nutrients?.find((n) => n.name === wanted);
  if (!found) return null;
  return { amount: Math.round(found.amount), unit: found.unit || "" };
}

/**
 * How one macro measures up against the user's target.
 *
 * Returns `null` when the user isn't filtering on this macro or the API didn't
 * give us the number — both mean "nothing to say", which the UI renders as
 * neutral rather than inventing a pass or a fail.
 */
export function evaluateMacro(recipe, key, macros) {
  const range = macros?.[key];
  if (!range || isMacroUnset(key, range)) return null;

  const value = getNutrient(recipe, key);
  if (!value) return null;

  const limit = MACRO_LIMITS[key];
  const { amount } = value;
  const unit = key === "calories" ? "kcal" : "g";

  if (amount < range.min) {
    return {
      key,
      amount,
      unit,
      status: "under",
      // "4 g short" reads better on a card than "16 g (min 20 g)".
      note: `${range.min - amount} ${unit} short`,
    };
  }

  if (amount > range.max) {
    return {
      key,
      amount,
      unit,
      status: "over",
      note: `${amount - range.max} ${unit} over`,
    };
  }

  return {
    key,
    amount,
    unit,
    status: "in",
    note:
      range.min > limit.min && range.max < limit.max
        ? `in ${range.min}–${range.max}`
        : "in range",
  };
}

/** Every macro the user is filtering on, evaluated. Unset macros are dropped. */
export function evaluateMacros(recipe, macros) {
  return Object.keys(MACRO_LIMITS)
    .map((key) => evaluateMacro(recipe, key, macros))
    .filter(Boolean);
}

/** True when a recipe satisfies every macro the user set. */
export function meetsTarget(recipe, macros) {
  return evaluateMacros(recipe, macros).every((m) => m.status === "in");
}

/**
 * How far off target a recipe is, for the "closest to target" sort.
 * Zero means it satisfies everything the user asked for.
 */
export function targetDistance(recipe, macros) {
  return evaluateMacros(recipe, macros).reduce((total, m) => {
    if (m.status === "in") return total;
    const digits = String(m.note).match(/\d+/);
    return total + (digits ? Number(digits[0]) : 0);
  }, 0);
}

/** The missing ingredients, as names. This is what the cards actually say. */
export function missingNames(recipe) {
  return (recipe?.missedIngredients || [])
    .map((i) => i.name)
    .filter(Boolean);
}

/**
 * A plain-language summary of the active target, for the strip above the grid.
 * Falls back to a sentence rather than showing an empty row.
 */
export function describeTarget(macros) {
  const parts = [];
  for (const key of Object.keys(MACRO_LIMITS)) {
    const range = macros?.[key];
    if (isMacroUnset(key, range)) continue;

    const limit = MACRO_LIMITS[key];
    const unit = key === "calories" ? "kcal" : "g";
    const label = limit.label.toLowerCase();

    if (range.min <= limit.min) parts.push(`under ${range.max} ${unit} ${label}`);
    else if (range.max >= limit.max) parts.push(`${range.min} ${unit}+ ${label}`);
    else parts.push(`${range.min}–${range.max} ${unit} ${label}`);
  }
  return parts.length ? parts.join(" · ") : "No macro filtering";
}
