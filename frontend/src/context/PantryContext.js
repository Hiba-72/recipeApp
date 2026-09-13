import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MACRO_PRESETS,
  isFirstRun,
  loadState,
  saveState,
  clearState,
} from "../lib/storage";

const PantryContext = createContext(null);

/**
 * Holds the saved fridge and preferences, and keeps them in sync with
 * localStorage.
 *
 * Two ideas worth knowing before you use this:
 *
 * 1. `pantry` is what's saved. `draftPantry` is what the pantry screen is
 *    currently showing. They're the same until someone starts editing, which
 *    is what lets the pantry stage a batch of changes and commit them with one
 *    button instead of re-querying on every chip tap.
 *
 * 2. Ingredient names are the join key to the recipe API, so only canonical
 *    names the API gave us should ever reach `addIngredient`.
 */
export function PantryProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [draftPantry, setDraftPantry] = useState(() => state.pantry);
  const [storageBlocked, setStorageBlocked] = useState(false);

  // Persist on every committed change. Draft edits deliberately don't land
  // here — nothing is saved until the user commits them.
  useEffect(() => {
    const ok = saveState(state);
    setStorageBlocked(!ok);
  }, [state]);

  const isDirty = useMemo(() => {
    if (draftPantry.length !== state.pantry.length) return true;
    const saved = new Set(state.pantry);
    return draftPantry.some((name) => !saved.has(name));
  }, [draftPantry, state.pantry]);

  const addIngredient = useCallback((name) => {
    if (!name || typeof name !== "string") return;
    const clean = name.trim();
    if (!clean) return;
    setDraftPantry((prev) =>
      prev.some((n) => n.toLowerCase() === clean.toLowerCase())
        ? prev
        : [...prev, clean]
    );
  }, []);

  const removeIngredient = useCallback((name) => {
    setDraftPantry((prev) =>
      prev.filter((n) => n.toLowerCase() !== String(name).toLowerCase())
    );
  }, []);

  const toggleIngredient = useCallback((name) => {
    if (!name) return;
    const clean = String(name).trim();
    setDraftPantry((prev) =>
      prev.some((n) => n.toLowerCase() === clean.toLowerCase())
        ? prev.filter((n) => n.toLowerCase() !== clean.toLowerCase())
        : [...prev, clean]
    );
  }, []);

  /** Save the staged fridge. This is the pantry screen's "Update" button. */
  const commitPantry = useCallback(() => {
    setState((prev) => ({ ...prev, pantry: draftPantry }));
  }, [draftPantry]);

  /** Throw away staged edits and snap back to what's saved. */
  const discardPantryEdits = useCallback(() => {
    setDraftPantry(state.pantry);
  }, [state.pantry]);

  /** Onboarding saves as it goes, so there's nothing to lose on abandon. */
  const savePantryNow = useCallback((names) => {
    setDraftPantry(names);
    setState((prev) => ({ ...prev, pantry: names }));
  }, []);

  /**
   * Marks setup finished. Until this is called the user stays in onboarding no
   * matter how full the fridge gets, which is what lets step 1 save as it goes.
   */
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboarded: true }));
  }, []);

  const setMacroPreset = useCallback((presetKey) => {
    const preset = MACRO_PRESETS[presetKey];
    if (!preset) return;
    setState((prev) => ({
      ...prev,
      macroPreset: presetKey,
      macros: preset.macros,
    }));
  }, []);

  /**
   * Hand-tuning a slider means the numbers no longer match whichever preset
   * was picked, so the preset selection is dropped rather than left lying.
   */
  const setMacroRange = useCallback((key, range) => {
    setState((prev) => ({
      ...prev,
      macroPreset: "custom",
      macros: { ...prev.macros, [key]: range },
    }));
  }, []);

  const setDishTypes = useCallback((dishTypes) => {
    setState((prev) => ({
      ...prev,
      dishTypes: dishTypes?.length ? dishTypes : ["all"],
    }));
  }, []);

  const toggleFavorite = useCallback((recipeId) => {
    const id = Number(recipeId);
    if (!Number.isFinite(id)) return;
    setState((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(id)
        ? prev.favorites.filter((f) => f !== id)
        : [...prev.favorites, id],
    }));
  }, []);

  const resetEverything = useCallback(() => {
    clearState();
    const fresh = loadState();
    setState(fresh);
    setDraftPantry(fresh.pantry);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      draftPantry,
      isDirty,
      firstRun: isFirstRun(state),
      storageBlocked,
      addIngredient,
      removeIngredient,
      toggleIngredient,
      commitPantry,
      discardPantryEdits,
      savePantryNow,
      completeOnboarding,
      setMacroPreset,
      setMacroRange,
      setDishTypes,
      toggleFavorite,
      resetEverything,
    }),
    [
      state,
      draftPantry,
      isDirty,
      storageBlocked,
      addIngredient,
      removeIngredient,
      toggleIngredient,
      commitPantry,
      discardPantryEdits,
      savePantryNow,
      completeOnboarding,
      setMacroPreset,
      setMacroRange,
      setDishTypes,
      toggleFavorite,
      resetEverything,
    ]
  );

  return (
    <PantryContext.Provider value={value}>{children}</PantryContext.Provider>
  );
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error("usePantry must be used inside a <PantryProvider>");
  }
  return ctx;
}
