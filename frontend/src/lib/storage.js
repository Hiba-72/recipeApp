// Everything Taktouka remembers about you lives here, in this browser.
// There are no accounts, so localStorage is the whole persistence story.
//
// Every read and write is guarded: private windows, cleared site data and
// browsers set to block storage can all make these throw or come back empty,
// and none of that should be able to take the app down.

const KEY = "taktouka.v1";

// Full slider ranges. A macro row sitting at its full range means "don't filter
// on this", which is why the defaults below are the outer bounds.
export const MACRO_LIMITS = {
  calories: { min: 0, max: 5000, unit: "kcal", label: "Calories" },
  protein: { min: 0, max: 300, unit: "g", label: "Protein" },
  fat: { min: 0, max: 200, unit: "g", label: "Fat" },
  carbs: { min: 0, max: 500, unit: "g", label: "Carbohydrates" },
};

// The four presets from the design. Plain language first, numbers second —
// most people pick a goal, and only some want to touch the sliders.
export const MACRO_PRESETS = {
  muscle: {
    name: "Build muscle",
    blurb: "Protein forward, calories moderate.",
    summary: "High protein, moderate calories",
    macros: {
      calories: { min: 200, max: 800 },
      protein: { min: 20, max: 300 },
      fat: { min: 0, max: 60 },
      carbs: { min: 0, max: 500 },
    },
  },
  lighter: {
    name: "Eat lighter",
    blurb: "Lower calorie, lower fat, nothing heavy.",
    summary: "Lighter meals",
    macros: {
      calories: { min: 0, max: 500 },
      protein: { min: 0, max: 300 },
      fat: { min: 0, max: 20 },
      carbs: { min: 0, max: 500 },
    },
  },
  lowcarb: {
    name: "Low carb",
    blurb: "Keeps carbs down, fat and protein free.",
    summary: "Low carb",
    macros: {
      calories: { min: 0, max: 5000 },
      protein: { min: 0, max: 300 },
      fat: { min: 0, max: 200 },
      carbs: { min: 0, max: 50 },
    },
  },
  none: {
    name: "No limits",
    blurb: "Just show me what I can cook.",
    summary: "No macro filtering",
    macros: {
      calories: { min: 0, max: 5000 },
      protein: { min: 0, max: 300 },
      fat: { min: 0, max: 200 },
      carbs: { min: 0, max: 500 },
    },
  },
};

export const DEFAULT_STATE = {
  // Canonical Spoonacular ingredient names, never the user's raw typing.
  pantry: [],
  // Whether setup was actually finished.
  //
  // This deliberately isn't inferred from `pantry.length`. Onboarding saves
  // every tap so an abandoned setup isn't lost, which means the fridge is
  // non-empty from the first ingredient onward — inferring from it would throw
  // you out of onboarding the moment you picked one thing.
  onboarded: false,
  macroPreset: "none",
  macros: MACRO_PRESETS.none.macros,
  dishTypes: ["all"],
  favorites: [],
};

/**
 * True when a macro row spans its whole range, i.e. the user isn't filtering
 * on it. Used to decide which params to send and what to grey out in the UI.
 */
export function isMacroUnset(key, range) {
  const limit = MACRO_LIMITS[key];
  if (!limit || !range) return true;
  return range.min <= limit.min && range.max >= limit.max;
}

/** True when no macro is being filtered on at all. */
export function hasNoMacroFilter(macros) {
  return Object.keys(MACRO_LIMITS).every((key) =>
    isMacroUnset(key, macros?.[key])
  );
}

function clampRange(key, range) {
  const limit = MACRO_LIMITS[key];
  const fallback = DEFAULT_STATE.macros[key];
  if (!range || typeof range !== "object") return { ...fallback };
  const min = Number(range.min);
  const max = Number(range.max);
  return {
    min: Number.isFinite(min) ? Math.max(limit.min, Math.min(min, limit.max)) : limit.min,
    max: Number.isFinite(max) ? Math.max(limit.min, Math.min(max, limit.max)) : limit.max,
  };
}

/**
 * Anything could be sitting in localStorage — an older shape, a half-written
 * value, something a user pasted in by hand. Coerce it into a state object the
 * rest of the app can trust rather than letting a bad field spread.
 */
function normalize(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };

  const pantry = Array.isArray(raw.pantry)
    ? [...new Set(raw.pantry.filter((n) => typeof n === "string" && n.trim()))]
    : [];

  const macroPreset = MACRO_PRESETS[raw.macroPreset] ? raw.macroPreset : "none";

  const macros = {};
  for (const key of Object.keys(MACRO_LIMITS)) {
    macros[key] = clampRange(key, raw.macros?.[key]);
  }

  const dishTypes =
    Array.isArray(raw.dishTypes) && raw.dishTypes.length
      ? [...new Set(raw.dishTypes.filter((t) => typeof t === "string"))]
      : ["all"];

  const favorites = Array.isArray(raw.favorites)
    ? [...new Set(raw.favorites.map(Number).filter(Number.isFinite))]
    : [];

  // Data saved before the flag existed has no `onboarded` key. Those users
  // already have a fridge, so infer completion from it rather than dropping
  // them back into setup. Only a genuinely absent key is inferred — an
  // explicit `false` is someone mid-onboarding and must be respected.
  const onboarded =
    typeof raw.onboarded === "boolean" ? raw.onboarded : pantry.length > 0;

  return { pantry, onboarded, macroPreset, macros, dishTypes, favorites };
}

export function loadState() {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (!stored) return { ...DEFAULT_STATE };
    return normalize(JSON.parse(stored));
  } catch (err) {
    // Storage unavailable or the payload is unparseable. Start fresh rather
    // than blocking the app — the user just sees onboarding again.
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    // Quota exceeded, or storage is blocked. The session still works; it just
    // won't survive a reload, so callers may want to say so.
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Whether to show onboarding rather than the suggestions screen.
 *
 * Keyed on finishing setup, not on having ingredients — see `onboarded` above
 * for why the two can't be the same thing.
 */
export function isFirstRun(state) {
  return !state?.onboarded;
}
