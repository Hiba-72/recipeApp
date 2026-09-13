import React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import MacroPicker from "../../components/MacroPicker";
import { usePantry } from "../../context/PantryContext";

/**
 * Onboarding step 2. Step 1 already saved the fridge, so landing here with an
 * empty one means someone typed the URL — send them back rather than asking
 * about macros for a fridge that doesn't exist.
 */
export default function WelcomeMacros() {
  const navigate = useNavigate();
  const { pantry, completeOnboarding } = usePantry();

  if (!pantry.length) return <Navigate to="/welcome" replace />;

  // Either path finishes setup — skipping is a decision, not an escape.
  const finish = () => {
    completeOnboarding();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-ground pb-16">
      <div className="max-w-[900px] px-6 pt-12 sm:px-[68px] sm:pt-[52px]">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[.15em] text-accent-ink">
          Step 2 of 2 · {pantry.length} ingredients saved
        </div>
        <h1 className="mb-3 text-[38px] leading-[1.1] tracking-[-.03em] sm:text-[42px]">
          What are you eating for?
        </h1>
        <p className="mb-8 max-w-[520px] text-base leading-relaxed text-muted">
          Pick the one that sounds like you. This is what makes your
          suggestions yours, and you can change it any time.
        </p>

        <MacroPicker showHeading={false} />

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button type="button" onClick={finish} className="btn-accent">
            See my recipes →
          </button>
          <button
            type="button"
            onClick={finish}
            className="text-[13.5px] text-muted-2 underline underline-offset-[3px] hover:text-ink"
          >
            Skip — show me everything
          </button>
          <Link
            to="/welcome"
            className="text-[13.5px] text-muted-2 hover:text-ink"
          >
            ← Back to ingredients
          </Link>
        </div>
      </div>
    </div>
  );
}
