import React from "react";
import { useNavigate } from "react-router-dom";
import MacroPicker from "../../components/MacroPicker";
import { usePantry } from "../../context/PantryContext";

const DISH_TYPES = [
  "all",
  "main course",
  "side dish",
  "dessert",
  "appetizer",
  "salad",
  "bread",
  "breakfast",
  "soup",
  "beverage",
  "sauce",
  "marinade",
  "fingerfood",
  "snack",
  "drink",
];

export default function Preferences() {
  const navigate = useNavigate();
  const { dishTypes, setDishTypes, pantry, resetEverything } = usePantry();

  // "all" and a specific type are mutually exclusive — picking one clears the
  // other, so the filter can never say "everything, but only breakfast".
  const toggleDish = (type) => {
    if (type === "all") return setDishTypes(["all"]);
    const withoutAll = dishTypes.filter((t) => t !== "all");
    const next = withoutAll.includes(type)
      ? withoutAll.filter((t) => t !== type)
      : [...withoutAll, type];
    setDishTypes(next.length ? next : ["all"]);
  };

  return (
    <main className="px-5 pb-16 pt-8 sm:px-10">
      <div className="max-w-[760px]">
        <h1 className="mb-2 text-[30px] tracking-[-.03em]">Preferences</h1>
        <p className="mb-8 text-sm text-muted">
          Saved, and applied to every suggestion — not just one search.
        </p>

        <MacroPicker />

        <section className="mt-10">
          <h2 className="mb-4 border-b border-divider pb-2.5 text-[19px]">
            Dish types
          </h2>
          <div className="flex flex-wrap gap-2">
            {DISH_TYPES.map((type) => {
              const active = dishTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDish(type)}
                  className={`rounded-full px-[15px] py-2 text-[13px] capitalize transition-colors ${
                    active
                      ? "bg-ink font-semibold text-ground"
                      : "border border-line-strong text-muted hover:border-faintest"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-1.5 border-b border-divider pb-2.5 text-[19px]">
            Reset
          </h2>
          <p className="mb-4 mt-3 text-[13px] leading-relaxed text-muted">
            Taktouka keeps your fridge in this browser only. Clearing site data
            wipes it, and so does this button — {pantry.length} ingredients and
            your macro target would be gone.
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Clear your fridge and preferences? This can't be undone."
                )
              ) {
                resetEverything();
                navigate("/welcome");
              }
            }}
            className="rounded-full border border-need px-5 py-3 text-sm font-semibold text-need transition-colors hover:bg-need-bg"
          >
            Clear everything
          </button>
        </section>
      </div>
    </main>
  );
}
