import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchRecipes } from "../../redux/slices/recipesSlice";
import { usePantry } from "../../context/PantryContext";
import { hasNoMacroFilter } from "../../lib/storage";
import {
  describeTarget,
  meetsTarget,
  missingNames,
  targetDistance,
} from "../../lib/nutrition";
import RecipeCard from "../../components/RecipeCard";
import ProgressBar from "../../components/ProgressBar";
import Spinner from "../../components/Spinner";

const SORTS = {
  target: "Closest to target",
  missing: "Fewest missing",
  quickest: "Quickest",
};

export default function Suggestions() {
  const dispatch = useDispatch();
  const { pantry, macros, dishTypes } = usePantry();
  const { results, loading, error, usingSample } = useSelector(
    (state) => state.recipes
  );

  const [sort, setSort] = useState("target");
  // Lets someone see what their fridge alone turns up without destroying the
  // macro target they set. Session-only on purpose — it isn't a saved change.
  const [ignoreMacros, setIgnoreMacros] = useState(false);

  const activeMacros = ignoreMacros ? null : macros;
  const macrosOff = ignoreMacros || hasNoMacroFilter(macros);

  // The whole promise of a saved fridge: results without asking for them.
  useEffect(() => {
    if (!pantry.length) return;
    dispatch(
      fetchRecipes({ ingredients: pantry, macros: activeMacros, dishTypes })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, pantry, dishTypes, ignoreMacros, macros]);

  // "Closest to target" is meaningless with no target, so it quietly falls
  // back to fewest-missing rather than leaving no sort active at all.
  const effectiveSort = sort === "target" && macrosOff ? "missing" : sort;

  const sorted = useMemo(() => {
    // Always ordered here, never left in the order the API returned it.
    // Spoonacular's own min-missing sort is only approximate — a complete
    // match routinely arrives behind several partial ones — so trusting it
    // hides exactly the recipes you most want to see.
    const list = [...results];
    const byMissing = (a, b) =>
      missingNames(a).length - missingNames(b).length;

    if (effectiveSort === "missing") return list.sort(byMissing);

    if (effectiveSort === "quickest") {
      return list.sort(
        (a, b) => (a.readyInMinutes ?? 1e6) - (b.readyInMinutes ?? 1e6)
      );
    }

    // Closest to target, with fewest-missing breaking ties: among recipes that
    // all hit your macros, the one needing no shopping should come first.
    return list.sort((a, b) => {
      const diff = targetDistance(a, macros) - targetDistance(b, macros);
      return diff !== 0 ? diff : byMissing(a, b);
    });
  }, [results, effectiveSort, macros]);

  const completeMatches = useMemo(
    () => results.filter((r) => missingNames(r).length === 0).length,
    [results]
  );

  const onTarget = macrosOff
    ? results.length
    : results.filter((r) => meetsTarget(r, macros)).length;

  return (
    <main className="pb-12">
      <ProgressBar active={loading} />

      <header className="flex flex-wrap items-start justify-between gap-5 px-5 pt-8 sm:items-end sm:gap-6 sm:px-10">
        <div>
          <h1 className="mb-2 text-[28px] leading-[1.1] tracking-[-.03em] sm:text-[36px]">
            Tonight you can cook
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            {/* The bar at the top of the window is easy to miss on a phone,
                where the header is what you're actually looking at. */}
            {loading && <Spinner size={14} label="Loading recipes" />}
            {loading
              ? "Looking through your fridge…"
              : usingSample
              ? // These weren't matched against this fridge, so the usual
                // "from your fridge" count would be a claim we can't make.
                `${results.length} example recipes`
              : `${results.length} recipes from your fridge · ${completeMatches} need nothing you don't have${
                  macrosOff ? "" : ` · ${onTarget} hit your macros`
                }`}
          </p>
        </div>

        {/* Full width and left-aligned on a phone: right-aligning a block that
            already fills the row just makes the ragged edge land on the wrong
            side. It only becomes a right-hand column once there's room. */}
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            {/* The target itself now lives on the preferences screen — this
                button is all that stands in for the old summary card. */}
            <Link to="/preferences" className="btn-outline !py-2.5 !text-[13px]">
              Edit macro preferences
            </Link>
            {/* Ignoring macros is session state with no other home now that the
                card is gone, so the way back has to stay reachable. */}
            {ignoreMacros && (
              <button
                type="button"
                onClick={() => setIgnoreMacros(false)}
                className="text-[13px] font-medium text-muted-2 underline underline-offset-[3px] hover:text-ink"
              >
                Apply macros again
              </button>
            )}
          </div>

          {/* Three sort pills plus their label need ~444px; a phone gives 375.
              Wrapping is what keeps the whole page from scrolling sideways. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-muted-2">Sort</span>
            {Object.entries(SORTS).map(([key, label]) => {
              // Sorting by target is meaningless with no target set.
              if (key === "target" && macrosOff) return null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className={`rounded-full px-[15px] py-2 text-[13px] transition-colors ${
                    effectiveSort === key
                      ? "bg-ink font-semibold text-ground"
                      : "border border-line-strong text-muted hover:border-faintest"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* The recipe allowance is a daily budget shared by everyone who visits.
          When it's gone the app shows a saved sample rather than an error —
          but it says so, because results that look live and aren't are worse
          than no results. */}
      {usingSample && !loading && (
        <div className="mx-5 mt-5 rounded-xl border border-line-strong bg-strip px-[22px] py-4 sm:mx-10">
          <p className="text-sm font-semibold">
            Showing a saved sample, not your fridge
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Taktouka's recipe allowance for today is used up — it runs on a free
            plan with a daily budget. These twelve recipes are a stored example
            so you can still see how everything works. It resets tomorrow.
          </p>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-5 rounded-xl border border-need-line bg-need-bg px-[22px] py-4 sm:mx-10">
          <p className="text-sm font-semibold text-need">{error}</p>
          <p className="mt-1 text-[13px] text-need-soft">
            Your fridge is safe — nothing was lost.
          </p>
        </div>
      )}

      {/* Nothing matched, but the fridge is fine — it's the macros that are
          too tight. That's recoverable, so say which lever to pull. */}
      {!loading && !error && results.length === 0 && !macrosOff && (
        <div className="mx-5 mt-5 rounded-xl border border-line bg-surface px-[22px] py-8 text-center sm:mx-10">
          <h2 className="mb-2 text-[20px]">Nothing fits those macros tonight</h2>
          <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-muted">
            Your fridge has {pantry.length} ingredients, but nothing in it meets{" "}
            {describeTarget(macros)}. Loosening the target usually fixes this
            faster than shopping does.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setIgnoreMacros(true)}
              className="btn-accent"
            >
              Show me everything anyway
            </button>
            <Link to="/preferences" className="btn-outline">
              Edit macro preferences
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && results.length === 0 && macrosOff && (
        <div className="mx-5 mt-5 rounded-xl border border-line bg-surface px-[22px] py-8 text-center sm:mx-10">
          <h2 className="mb-2 text-[20px]">Nothing matched your fridge</h2>
          <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-muted">
            That usually means the fridge is short on the kind of staple recipes
            get built around. Adding a few basics opens up a lot.
          </p>
          <Link to="/pantry" className="btn-accent">
            Add to my fridge
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-[22px] px-5 pt-[22px] sm:grid-cols-2 sm:px-10 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card flex h-full animate-pulse flex-col">
                <div className="h-56 w-full flex-none bg-placeholder" />
                <div className="flex-1 space-y-3 p-[18px]">
                  <div className="h-5 w-3/4 rounded bg-line" />
                  <div className="h-12 rounded bg-line/60" />
                  <div className="h-3 w-1/2 rounded bg-line" />
                </div>
              </div>
            ))
          : sorted.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} macros={activeMacros} />
            ))}
      </div>
    </main>
  );
}
