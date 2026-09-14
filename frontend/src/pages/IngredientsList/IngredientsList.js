import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchIngredients } from "../../redux/slices/ingredientsSlice";
import { usePantry } from "../../context/PantryContext";
import IngredientSearch from "../../components/IngredientSearch";
import Logo from "../../components/Logo";

/**
 * The ingredient grid, in two modes.
 *
 * `/welcome` is onboarding: full-bleed, no navbar, a sticky basket along the
 * bottom, and every tap saved immediately so an abandoned setup isn't lost.
 *
 * `/pantry` is editing: the same grid beside a panel of what's saved, where
 * changes stage up and commit together. Re-querying on every chip tap would
 * make a five-ingredient edit into five round trips.
 */
export default function IngredientsList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onboarding = pathname === "/welcome";

  const {
    categories,
    loading: catalogueLoading,
    error: catalogueError,
  } = useSelector((state) => state.ingredients);

  const {
    draftPantry,
    isDirty,
    toggleIngredient,
    removeIngredient,
    addIngredient,
    commitPantry,
    discardPantryEdits,
    savePantryNow,
  } = usePantry();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    dispatch(fetchIngredients());
  }, [dispatch]);

  const selected = useMemo(
    () => new Set(draftPantry.map((n) => n.toLowerCase())),
    [draftPantry]
  );

  const has = (name) => selected.has(name.toLowerCase());

  // In onboarding there's nothing to commit later, so each tap persists.
  const pick = (name) => {
    if (!onboarding) return toggleIngredient(name);
    const next = has(name)
      ? draftPantry.filter((n) => n.toLowerCase() !== name.toLowerCase())
      : [...draftPantry, name];
    savePantryNow(next);
  };

  const pickFromSearch = (name) => {
    if (!onboarding) return addIngredient(name);
    if (has(name)) return;
    savePantryNow([...draftPantry, name]);
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (categories || [])
      .filter((c) => !activeCategory || c.category === activeCategory)
      .map((c) => ({
        ...c,
        subcategories: (c.subcategories || [])
          .map((s) => ({
            ...s,
            items: (s.items || []).filter((i) =>
              i.toLowerCase().includes(term)
            ),
          }))
          .filter((s) => s.items.length),
      }))
      .filter((c) => c.subcategories.length);
  }, [categories, search, activeCategory]);

  const countFor = (cat) =>
    (cat.subcategories || []).reduce((n, s) => n + (s.items?.length || 0), 0);

  const grid = (
    <>
      <div className="mb-6">
        <IngredientSearch
          onSelect={pickFromSearch}
          onQueryChange={setSearch}
          autoFocus={onboarding}
        />
      </div>

      {categories?.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = activeCategory === c.category;
            return (
              <button
                key={c.category}
                type="button"
                onClick={() => setActiveCategory(active ? null : c.category)}
                className={`rounded-full px-[15px] py-2 text-[13.5px] transition-colors ${
                  active
                    ? "bg-ink font-semibold text-ground"
                    : "border border-line-strong text-muted hover:border-faintest"
                }`}
              >
                {c.category}{" "}
                <span className={active ? "opacity-60" : "text-faint"}>
                  {countFor(c)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {catalogueLoading && (
        <div className="space-y-7">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="mb-3.5 h-5 w-40 animate-pulse rounded bg-line" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-[46px] animate-pulse rounded-lg bg-line/70"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {catalogueError && !catalogueLoading && (
        <div className="rounded-xl border border-need-line bg-need-bg px-[22px] py-5">
          <h2 className="mb-1 text-[17px] text-need">
            The ingredient list didn't load
          </h2>
          <p className="text-[13px] leading-relaxed text-need-soft">
            Taktouka's own server is what serves the catalogue, so it's probably
            not running. You can still add ingredients with the search box above
            — that goes straight to the recipe service.
          </p>
        </div>
      )}

      {!catalogueLoading && !catalogueError && visible.length === 0 && (
        <p className="text-sm text-muted">
          Nothing in the catalogue matches “{search}”. The search box above can
          still add it.
        </p>
      )}

      <div className="flex flex-col gap-7">
        {visible.map((cat) =>
          cat.subcategories.map((sub) => (
            <div key={`${cat.category}-${sub.name}`}>
              <div className="mb-3.5 flex items-center gap-3">
                <h2 className="text-[18px] tracking-[-.01em]">{sub.name}</h2>
                {sub.tags?.length > 0 && (
                  <span className="text-xs text-faint">
                    {sub.tags.join(" · ")}
                  </span>
                )}
                <span className="h-px flex-1 bg-divider" />
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {sub.items.map((item) => {
                  const on = has(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(item)}
                      className={`chip ${on ? "chip-selected" : ""}`}
                    >
                      {on && <span className="mr-2">✓</span>}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  // ---- Onboarding ---------------------------------------------------------
  if (onboarding) {
    return (
      <div className="min-h-screen bg-ground pb-28">
        <div className="max-w-[900px] px-6 pt-12 sm:px-[68px] sm:pt-[52px]">
          {/* Onboarding renders outside the shell, so there is no navbar to
              carry the brand — this is the only place it can appear. */}
          <div className="mb-7 flex items-center gap-3">
            <Logo className="h-9 w-9" title="Taktouka" />
            <span className="text-[21px] font-bold tracking-[-.03em]">
              Taktouka
            </span>
          </div>

          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[.15em] text-accent-ink">
            Step 1 of 2
          </div>
          <h1 className="mb-3 text-[38px] leading-[1.1] tracking-[-.03em] sm:text-[46px]">
            What's in your fridge?
          </h1>
          <p className="max-w-[540px] text-base leading-relaxed text-muted">
            Tell us once. We'll remember it, and every time you come back you'll
            land on recipes you can actually cook tonight.
          </p>
        </div>

        <div className="px-6 pt-8 sm:px-[68px]">{grid}</div>

        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-4 bg-ink px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-[68px]">
          <div className="whitespace-nowrap text-[13px] font-semibold text-ground">
            In your fridge{" "}
            <span className="ml-1.5 inline-block rounded-full bg-accent px-2 py-0.5">
              {draftPantry.length}
            </span>
          </div>

          {/* Hidden on phones. Wrapped onto its own line it made this fixed bar
              tall enough to cover the grid behind it, and the count beside it
              already says how many you have — the chips above are where you'd
              deselect anyway. */}
          <div className="hidden max-h-16 flex-1 flex-wrap gap-1.5 overflow-y-auto sm:flex">
            {draftPantry.slice(-8).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(name)}
                className="rounded-full bg-ground/[.14] px-2.5 py-1 text-[12.5px] text-ground hover:bg-ground/25"
              >
                {name} ✕
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-xs text-ground/60 sm:inline">
              Saved as you go
            </span>
            <button
              type="button"
              disabled={draftPantry.length === 0}
              onClick={() => navigate("/welcome/macros")}
              className="btn-accent"
            >
              {draftPantry.length === 0 ? (
                "Pick at least one"
              ) : (
                <>
                  {/* The full label plus the counter is wider than a phone can
                      spare next to the count on its left. */}
                  <span className="sm:hidden">
                    Next ({draftPantry.length})
                  </span>
                  <span className="hidden sm:inline">
                    Next: your macros → ({draftPantry.length})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Pantry edit --------------------------------------------------------
  return (
    <main className="flex flex-col items-start lg:flex-row">
      <div className="flex-1 px-5 pb-14 pt-8 sm:px-10">
        <h1 className="mb-2 text-[30px] tracking-[-.03em]">Your fridge</h1>
        <p className="mb-6 text-sm text-muted">
          {draftPantry.length} ingredients
          {isDirty
            ? " — changes aren't saved until you update."
            : " saved."}
        </p>
        {grid}
      </div>

      {/* Pinned on desktop. The catalogue is several screens long, so leaving
          this in flow meant scrolling back to the top to see what you'd just
          added, or to reach Update. Full viewport height rather than hugging
          its content, so the dividing border doesn't stop mid-page. */}
      <aside className="w-full flex-none border-t border-line bg-surface px-6 py-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[330px] lg:flex-col lg:self-start lg:border-l lg:border-t-0">
        <div className="flex flex-none items-baseline justify-between">
          <h2 className="text-[18px] tracking-[-.02em]">In your fridge</h2>
          <span className="text-[13px] text-muted-2">{draftPantry.length}</span>
        </div>

        {/* The chips scroll, not the panel, so a long fridge can never push the
            Update button out of reach. min-h-0 is what lets a flex child
            actually shrink enough to scroll. */}
        <div className="mt-4 flex flex-wrap content-start gap-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {draftPantry.length === 0 && (
            <p className="text-[13px] text-muted">
              Empty. Pick from the grid, or search above.
            </p>
          )}
          {draftPantry.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => removeIngredient(name)}
              className="rounded-full bg-chip-bg px-[11px] py-1.5 text-[12.5px] hover:bg-line"
            >
              {name} <span className="text-faintest">✕</span>
            </button>
          ))}
        </div>

        {isDirty && (
          <div className="mt-5 flex flex-none flex-col gap-2.5 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => {
                commitPantry();
                navigate("/");
              }}
              className="btn-accent w-full"
            >
              Update suggestions
            </button>
            <button
              type="button"
              onClick={discardPantryEdits}
              className="text-[12.5px] text-muted-2 hover:text-ink"
            >
              Discard changes
            </button>
          </div>
        )}
      </aside>
    </main>
  );
}
