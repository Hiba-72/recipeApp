import React from "react";
import { Link } from "react-router-dom";
import { usePantry } from "../context/PantryContext";

/**
 * The saved fridge, summarised directly under the navbar. This is treatment A
 * from the design: always visible, so results never look like they came from
 * nowhere, and one click from being edited.
 *
 * Only the first few ingredients are named. A 40-item fridge would otherwise
 * push the actual content off the screen.
 */
export default function FridgeStrip({ visibleCount = 8 }) {
  const { pantry } = usePantry();

  if (!pantry.length) return null;

  const shown = pantry.slice(0, visibleCount);
  const overflow = pantry.length - shown.length;

  return (
    <div className="border-b border-line-strong bg-strip px-5 py-3 sm:px-10">
      <div className="flex items-center gap-4">
        <span className="hidden flex-shrink-0 text-[13px] font-medium text-muted sm:inline">
          Cooking from
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {shown.map((name) => (
            <span
              key={name}
              className="rounded-full border border-line-strong bg-surface px-[11px] py-1 text-[12.5px]"
            >
              {name}
            </span>
          ))}
          {overflow > 0 && (
            <span className="px-1 text-[12.5px] text-muted-2">
              +{overflow} more
            </span>
          )}
        </div>

        <Link
          to="/pantry"
          className="flex-shrink-0 text-[13px] font-semibold text-accent-ink underline underline-offset-[3px] hover:text-ink"
        >
          Edit fridge
        </Link>
      </div>
    </div>
  );
}
