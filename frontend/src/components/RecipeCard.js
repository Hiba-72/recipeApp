import React from "react";
import { useNavigate } from "react-router-dom";
import { evaluateMacro, missingNames } from "../lib/nutrition";

function MacroTile({ result }) {
  // Nothing to say: either the user isn't filtering on this macro, or the API
  // didn't return it. Render neutral rather than guessing.
  if (!result) return null;

  const good = result.status === "in";
  return (
    <div
      className={`flex-1 rounded-lg px-2.5 py-2 ${
        good ? "bg-have-bg" : "bg-need-bg"
      }`}
    >
      <div
        className={`text-[15px] font-semibold ${
          good ? "text-have" : "text-need"
        }`}
      >
        {result.amount}
        {result.unit === "g" ? " g" : ""}
      </div>
      <div
        className={`text-[10.5px] ${good ? "text-have-soft" : "text-need-soft"}`}
      >
        {result.key === "calories" ? "kcal" : result.key} · {result.note}
      </div>
    </div>
  );
}

export default function RecipeCard({ recipe, macros, onRemove }) {
  const navigate = useNavigate();
  const missing = missingNames(recipe);
  const calories = evaluateMacro(recipe, "calories", macros);
  const protein = evaluateMacro(recipe, "protein", macros);

  const open = () =>
    navigate("/recipe-detail", { state: { recipeId: recipe.id } });

  return (
    // h-full makes every card fill its grid row, so a two-line title no longer
    // leaves its neighbours short. The column layout below is what lets the
    // extra height land in one place instead of stretching the photo.
    <article
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="card group relative flex h-full cursor-pointer flex-col text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Only the favourites grid passes this. stopPropagation matters: the
          whole card is a click target, so without it removing a recipe would
          also navigate to the recipe you just removed. */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(recipe.id);
          }}
          aria-label={`Remove ${recipe.title} from saved recipes`}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/55 text-[15px] leading-none text-white backdrop-blur-sm transition-colors hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ✕
        </button>
      )}

      {/* Fixed height, never flexed: the photo is the one element that must be
          identical on every card, or the grid reads as ragged. */}
      {recipe.image ? (
        <img
          src={recipe.image}
          alt=""
          loading="lazy"
          className="h-56 w-full flex-none object-cover"
        />
      ) : (
        <div className="h-56 w-full flex-none bg-placeholder" />
      )}

      <div className="flex flex-1 flex-col p-[18px]">
        {/* Two lines, always — a short title holds the second line open so the
            macro tiles start at the same y on every card in the row. */}
        <h3 className="mb-3 line-clamp-2 min-h-[2.5em] text-[19px] font-bold leading-[1.25] tracking-[-.02em]">
          {recipe.title}
        </h3>

        {(calories || protein) && (
          <div className="mb-3 flex gap-2.5">
            <MacroTile result={calories} />
            <MacroTile result={protein} />
          </div>
        )}

        {/* mt-auto parks the footer against the bottom edge, so the have/need
            line sits on one baseline across the row whatever came above it. */}
        <div className="mt-auto pt-1">
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {recipe.readyInMinutes ? <span>{recipe.readyInMinutes} min</span> : null}
            {recipe.servings ? <span>· {recipe.servings} servings</span> : null}
            {Number.isFinite(recipe.healthScore) ? (
              <span>· health {recipe.healthScore}</span>
            ) : null}
          </div>

          {missing.length === 0 ? (
            <p className="text-[13px] font-semibold text-have">
              ✓ You have everything
              {recipe.usedIngredients?.length
                ? ` — all ${recipe.usedIngredients.length}`
                : ""}
            </p>
          ) : (
            <p className="line-clamp-2 text-[13px] text-need">
              <span className="font-bold">Need</span> {missing.join(", ")}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
