import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { usePantry } from "../../context/PantryContext";
import { API_BASE_URL } from "../../lib/api";
import { asSearchResult, pantryIndex } from "../../lib/pantryMatch";
import RecipeCard from "../../components/RecipeCard";

/**
 * The recipes you saved.
 *
 * Only ids are stored — saving a whole recipe would freeze its nutrition and
 * photo at the moment you pressed the button — so this screen fetches each one
 * back. State is local rather than a Redux slice on purpose: the other slices
 * exist because several screens share their data, and nothing else reads this.
 *
 * Fetches are remembered for the life of the page, so removing one recipe
 * doesn't re-request the rest, and coming back from a recipe costs nothing.
 */
export default function Favorites() {
  const { favorites, macros, pantry, toggleFavorite } = usePantry();

  const [byId, setById] = useState({});
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(false);
  const requested = useRef(new Set());

  const index = useMemo(() => pantryIndex(pantry), [pantry]);

  useEffect(() => {
    const missing = favorites.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));

    let cancelled = false;
    setLoading(true);

    // allSettled, not all: one recipe the API no longer knows about shouldn't
    // blank the whole screen.
    Promise.allSettled(
      missing.map((id) => axios.get(`${API_BASE_URL}/api/recipes/${id}`))
    )
      .then((results) => {
        if (cancelled) return;
        const loaded = {};
        const lost = [];
        results.forEach((result, i) => {
          if (result.status === "fulfilled") loaded[missing[i]] = result.value.data;
          else lost.push(missing[i]);
        });
        setById((prev) => ({ ...prev, ...loaded }));
        if (lost.length) setFailed((prev) => [...prev, ...lost]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [favorites]);

  // Newest first — the thing you just saved is the thing you're looking for.
  const recipes = useMemo(
    () =>
      [...favorites]
        .reverse()
        .map((id) => byId[id])
        .filter(Boolean)
        .map((detail) => asSearchResult(detail, index)),
    [favorites, byId, index]
  );

  const pending = favorites.filter(
    (id) => !byId[id] && !failed.includes(id)
  ).length;

  if (favorites.length === 0) {
    return (
      <main className="px-5 pb-16 pt-8 sm:px-10">
        <h1 className="mb-2 text-[28px] leading-[1.1] tracking-[-.03em] sm:text-[36px]">
          Saved recipes
        </h1>
        <div className="mt-6 rounded-xl border border-line bg-surface px-[22px] py-10 text-center">
          <h2 className="mb-2 text-[20px]">Nothing saved yet</h2>
          <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-muted">
            Open a recipe you like and press <strong>Save recipe</strong>. It'll
            wait here — in this browser, so there's no account to make.
          </p>
          <Link to="/" className="btn-accent">
            Find something to cook
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-12">
      <header className="px-5 pt-8 sm:px-10">
        <h1 className="mb-2 text-[28px] leading-[1.1] tracking-[-.03em] sm:text-[36px]">
          Saved recipes
        </h1>
        <p className="text-sm text-muted">
          {loading && recipes.length === 0
            ? "Fetching what you saved…"
            : `${favorites.length} saved${
                pending > 0 ? ` · ${pending} still loading` : ""
              }`}
        </p>
      </header>

      {/* A saved id can outlive the recipe behind it. Say so plainly and let
          them clear it, rather than showing a silently shorter list. */}
      {failed.length > 0 && (
        <div className="mx-5 mt-5 rounded-xl border border-need-line bg-need-bg px-[22px] py-4 sm:mx-10">
          <p className="text-sm font-semibold text-need">
            {failed.length} saved{" "}
            {failed.length === 1 ? "recipe" : "recipes"} couldn't be loaded
          </p>
          <p className="mt-1 text-[13px] text-need-soft">
            The recipe service no longer returns{" "}
            {failed.length === 1 ? "it" : "them"} — or today's allowance is
            spent.{" "}
            <button
              type="button"
              onClick={() => {
                failed.forEach((id) => toggleFavorite(id));
                setFailed([]);
              }}
              className="font-semibold underline underline-offset-[3px] hover:text-need"
            >
              Remove {failed.length === 1 ? "it" : "them"}
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-[22px] px-5 pt-[22px] sm:grid-cols-2 sm:px-10 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            macros={macros}
            onRemove={toggleFavorite}
          />
        ))}

        {Array.from({ length: pending }).map((_, i) => (
          <div key={`pending-${i}`} className="card flex h-full animate-pulse flex-col">
            <div className="h-56 w-full flex-none bg-placeholder" />
            <div className="flex-1 space-y-3 p-[18px]">
              <div className="h-5 w-3/4 rounded bg-line" />
              <div className="h-12 rounded bg-line/60" />
              <div className="h-3 w-1/2 rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
