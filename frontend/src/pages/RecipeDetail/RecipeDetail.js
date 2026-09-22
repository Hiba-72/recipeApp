import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { fetchRecipeDetails } from "../../redux/slices/recipeDetailsSlice";
import { usePantry } from "../../context/PantryContext";
import Spinner from "../../components/Spinner";
import { inPantry, pantryIndex, splitByPantry } from "../../lib/pantryMatch";

// The four that drive the rest of the app, then the two people look for next.
const NUTRIENTS = [
  { name: "Calories", label: "kcal" },
  { name: "Protein", label: "protein" },
  { name: "Fat", label: "fat" },
  { name: "Carbohydrates", label: "carbs" },
  { name: "Fiber", label: "fiber" },
  { name: "Sugar", label: "sugar" },
];

const DIET_FLAGS = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "glutenFree", label: "Gluten-free" },
  { key: "dairyFree", label: "Dairy-free" },
  { key: "veryHealthy", label: "Very healthy" },
];

function Skeleton() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-10">
      {/* The spinner sits outside the pulsing block on purpose. A skeleton
          fading in and out looks the same whether a request is still running
          or has quietly died; something that loops says the app is alive. */}
      <div className="mb-6 flex items-center gap-2.5 text-[13px] text-muted">
        <Spinner size={16} label="Loading recipe" />
        <span>Fetching the recipe…</span>
      </div>

      <div className="grid animate-pulse gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="h-[340px] rounded-xl bg-placeholder" />
        <div className="space-y-4">
          <div className="h-9 w-4/5 rounded bg-line" />
          <div className="h-4 w-2/5 rounded bg-line" />
          <div className="h-24 rounded-xl bg-line/60" />
        </div>
      </div>
    </main>
  );
}

/** One nutrition figure. Neutral by default; green when it clears the target. */
function NutrientTile({ name, label, amount, unit }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3.5 py-3">
      <div className="text-[19px] font-semibold leading-none tracking-[-.02em]">
        {Math.round(amount)}
        <span className="ml-0.5 text-[12px] font-medium text-muted-2">
          {unit === "kcal" ? "" : unit}
        </span>
      </div>
      <div className="mt-1.5 text-[11px] text-muted-2">
        {name === "Calories" ? "kcal per serving" : label}
      </div>
    </div>
  );
}

export default function RecipeDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pantry, favorites, toggleFavorite } = usePantry();

  const recipeId = location.state?.recipeId;
  const { recipeDetails, loading, error } = useSelector(
    (state) => state.recipeDetails
  );

  useEffect(() => {
    if (!recipeId) {
      navigate("/", { replace: true });
      return;
    }
    dispatch(fetchRecipeDetails(recipeId));
  }, [dispatch, recipeId, navigate]);

  // Arriving from a card scrolled halfway down the grid otherwise lands you
  // halfway down the recipe.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [recipeId]);

  const pantrySet = useMemo(() => pantryIndex(pantry), [pantry]);

  // Memoised so the fallback [] isn't a fresh array on every render, which
  // would re-split have/need each time.
  const ingredients = useMemo(
    () => recipeDetails?.extendedIngredients || [],
    [recipeDetails]
  );

  const { have, need } = useMemo(
    () => splitByPantry(ingredients, pantrySet),
    [ingredients, pantrySet]
  );

  // The slice holds whichever recipe was opened last, so a fresh fetch would
  // otherwise flash the previous recipe under the new one's title.
  const stale = recipeDetails && Number(recipeDetails.id) !== Number(recipeId);

  if (loading || stale) return <Skeleton />;

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10 sm:px-10">
        <div className="rounded-xl border border-need-line bg-need-bg px-[22px] py-8 text-center">
          <h1 className="mb-2 text-[22px]">That recipe wouldn't load</h1>
          <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-need-soft">
            {error}
          </p>
          <Link to="/" className="btn-accent">
            Back to suggestions
          </Link>
        </div>
      </main>
    );
  }

  if (!recipeDetails) return <Skeleton />;

  const nutrients = recipeDetails.nutrition?.nutrients || [];
  const shown = NUTRIENTS.map((n) => {
    const found = nutrients.find((x) => x.name === n.name);
    return found ? { ...n, amount: found.amount, unit: found.unit } : null;
  }).filter(Boolean);

  const steps = recipeDetails.analyzedInstructions?.[0]?.steps || [];
  const isFavorite = favorites.includes(Number(recipeId));
  const diets = DIET_FLAGS.filter((f) => recipeDetails[f.key]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 text-[13px] font-medium text-muted-2 transition-colors hover:text-ink"
      >
        ← Back to suggestions
      </button>

      {/* Hero: photo and everything you decide on before you start cooking. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {recipeDetails.image ? (
          <img
            src={recipeDetails.image}
            alt=""
            className="h-[340px] w-full rounded-xl border border-line object-cover"
          />
        ) : (
          <div className="h-[340px] w-full rounded-xl border border-line bg-placeholder" />
        )}

        <div className="flex flex-col">
          <h1 className="text-[34px] leading-[1.12] tracking-[-.03em]">
            {recipeDetails.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
            {recipeDetails.readyInMinutes ? (
              <span>{recipeDetails.readyInMinutes} min</span>
            ) : null}
            {recipeDetails.servings ? (
              <span>· {recipeDetails.servings} servings</span>
            ) : null}
            {Number.isFinite(recipeDetails.healthScore) ? (
              <span>· health {recipeDetails.healthScore}</span>
            ) : null}
          </div>

          {diets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {diets.map((d) => (
                <span
                  key={d.key}
                  className="rounded-full border border-have-line bg-have-bg px-3 py-1 text-[12px] font-medium text-have"
                >
                  {d.label}
                </span>
              ))}
            </div>
          )}

          {/* The headline the whole app is built around: can you cook this
              tonight, or is there a shop in the way? */}
          {ingredients.length > 0 && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3.5 ${
                need.length === 0
                  ? "border-have-line bg-have-bg"
                  : "border-need-line bg-need-bg"
              }`}
            >
              {need.length === 0 ? (
                <p className="text-[14px] font-semibold text-have">
                  ✓ You have everything — all {have.length} ingredients
                </p>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-need">
                    {need.length} missing from your fridge
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-need-soft">
                    {need.map((i) => i.nameClean || i.name).join(", ")}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            <button
              type="button"
              onClick={() => toggleFavorite(recipeId)}
              aria-pressed={isFavorite}
              className={isFavorite ? "btn-accent" : "btn-outline"}
            >
              {isFavorite ? "♥ Saved" : "♡ Save recipe"}
            </button>
            {recipeDetails.sourceUrl && (
              <a
                href={recipeDetails.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-muted-2 underline underline-offset-[3px] hover:text-ink"
              >
                Original recipe
              </a>
            )}
          </div>
        </div>
      </div>

      {shown.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-2">
            Per serving
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {shown.map((n) => (
              <NutrientTile key={n.name} {...n} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <section>
          <h2 className="mb-4 text-[22px] tracking-[-.02em]">
            Ingredients
            <span className="ml-2 text-[13px] font-normal text-muted-2">
              {ingredients.length} total
            </span>
          </h2>

          {ingredients.length === 0 ? (
            <p className="text-sm text-muted">
              No ingredient list came back for this one.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {/* Ordered by what you're missing, so the shopping is the first
                  thing you see rather than something to scan for. */}
              {[...need, ...have].map((item, i) => {
                const owned = inPantry(item.nameClean || item.name, pantrySet);
                return (
                  <li
                    key={`${item.id || item.name}-${i}`}
                    className="flex items-baseline gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5"
                  >
                    <span
                      className={`text-[13px] font-semibold ${
                        owned ? "text-have" : "text-need"
                      }`}
                      aria-hidden="true"
                    >
                      {owned ? "✓" : "+"}
                    </span>
                    <span className="flex-1 text-[14px] leading-snug">
                      <span className="font-medium">
                        {item.amount
                          ? `${Math.round(item.amount * 100) / 100} `
                          : ""}
                        {item.unit}{" "}
                      </span>
                      {item.nameClean || item.name}
                    </span>
                    <span className="sr-only">
                      {owned ? "in your fridge" : "not in your fridge"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-[22px] tracking-[-.02em]">Method</h2>

          {steps.length > 0 ? (
            <ol className="space-y-4">
              {steps.map((step) => (
                <li key={step.number} className="flex gap-4">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[12.5px] font-semibold text-ground">
                    {step.number}
                  </span>
                  <p className="pt-0.5 text-[15px] leading-relaxed text-ink-soft">
                    {step.step}
                  </p>
                </li>
              ))}
            </ol>
          ) : recipeDetails.instructions ? (
            // Some recipes only ever come back as a blob of HTML. It is
            // third-party content going straight into the DOM, so it is
            // sanitised to a formatting-only allowlist first — no scripts, no
            // event handlers, no links or embeds.
            <div
              className="space-y-3 text-[15px] leading-relaxed text-ink-soft [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(recipeDetails.instructions, {
                  ALLOWED_TAGS: [
                    "p",
                    "br",
                    "ol",
                    "ul",
                    "li",
                    "b",
                    "strong",
                    "i",
                    "em",
                    "span",
                    "h3",
                    "h4",
                  ],
                  ALLOWED_ATTR: [],
                }),
              }}
            />
          ) : (
            <p className="text-sm text-muted">
              This one didn't come with written steps.{" "}
              {recipeDetails.sourceUrl ? "The original has them." : ""}
            </p>
          )}

          {recipeDetails.creditsText && (
            <p className="mt-8 border-t border-divider pt-4 text-[12px] text-faint">
              Recipe by {recipeDetails.creditsText}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
