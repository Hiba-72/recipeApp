import React from "react";
import { usePantry } from "../context/PantryContext";
import {
  MACRO_LIMITS,
  MACRO_PRESETS,
  isMacroUnset,
} from "../lib/storage";

/** Human-readable summary of one macro row. */
function describeRange(key, range) {
  const limit = MACRO_LIMITS[key];
  const unit = key === "calories" ? "kcal" : "g";
  if (isMacroUnset(key, range)) return "any amount";
  if (range.min <= limit.min) return `under ${range.max} ${unit}`;
  if (range.max >= limit.max) return `${range.min} ${unit} and up`;
  return `${range.min} – ${range.max} ${unit}`;
}

/**
 * One macro as a two-handled range.
 *
 * Both handles are real range inputs so keyboard and screen-reader users get
 * the native behaviour; the visible track underneath is decoration. The
 * handles are prevented from crossing, which would otherwise let you express
 * an impossible "min above max".
 */
function MacroRow({ macroKey, range, onChange }) {
  const limit = MACRO_LIMITS[macroKey];
  const unset = isMacroUnset(macroKey, range);
  // Unitless 0–1 fractions, not percentages: they're multiplied by a calc()
  // expression that already mixes % and px, and CSS can't take a percentage
  // of a percentage.
  const span = limit.max - limit.min;
  const minFrac = (range.min - limit.min) / span;
  const maxFrac = (range.max - limit.min) / span;

  const setMin = (value) =>
    onChange({ ...range, min: Math.min(Number(value), range.max) });
  const setMax = (value) =>
    onChange({ ...range, max: Math.max(Number(value), range.min) });

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-[22px] ${
        unset ? "opacity-60" : ""
      }`}
    >
      <span className="flex-none text-[13.5px] font-semibold sm:w-[110px]">
        {limit.label}
      </span>

      {/* w-full rather than flex-1: on mobile this row is a flex column, where
          flex-1 would resolve against the cross axis and collapse the track.
          --thumb is the single source of truth for the handle size — the CSS
          sizes the input, the runnable track and the thumb from it, and the
          insets below keep the painted bar under the handle.

          The handle is deliberately larger on touch: 16px is under every
          mobile hit-target guideline, and this is a control you drag. */}
      <div
        className="relative h-7 w-full [--thumb:26px] sm:h-5 sm:flex-1 sm:[--thumb:18px]"
      >
        {/* Inset by half a handle at each end. A native range parks its thumb
            centre between thumb/2 and width - thumb/2, so a bar drawn edge to
            edge drifts from the handle by up to half its width at the
            extremes — which reads as the handle sitting off the line. */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-sm bg-track"
          style={{
            left: "calc(var(--thumb) / 2)",
            right: "calc(var(--thumb) / 2)",
          }}
        />
        <div
          className={`absolute top-1/2 h-1 -translate-y-1/2 rounded-sm ${
            unset ? "bg-track-unset" : "bg-accent"
          }`}
          style={{
            left: `calc(${minFrac} * (100% - var(--thumb)) + var(--thumb) / 2)`,
            width: `calc(${maxFrac - minFrac} * (100% - var(--thumb)))`,
          }}
        />
        <input
          type="range"
          className={`range-thumb ${unset ? "is-unset" : ""}`}
          // Whichever handle is nearer the top end sits above the other, so a
          // pair that has met at one end can still be pulled apart.
          style={{ zIndex: minFrac > 0.5 ? 4 : 3 }}
          min={limit.min}
          max={limit.max}
          value={range.min}
          onChange={(e) => setMin(e.target.value)}
          aria-label={`Minimum ${limit.label.toLowerCase()}`}
          aria-valuetext={`${range.min} ${limit.unit}`}
        />
        <input
          type="range"
          className={`range-thumb ${unset ? "is-unset" : ""}`}
          style={{ zIndex: minFrac > 0.5 ? 3 : 4 }}
          min={limit.min}
          max={limit.max}
          value={range.max}
          onChange={(e) => setMax(e.target.value)}
          aria-label={`Maximum ${limit.label.toLowerCase()}`}
          aria-valuetext={`${range.max} ${limit.unit}`}
        />
      </div>

      <span
        className={`flex-none font-mono text-[13px] sm:w-[128px] sm:text-right ${
          unset ? "text-muted-2" : "text-muted"
        }`}
      >
        {describeRange(macroKey, range)}
      </span>
    </div>
  );
}

/**
 * Presets first, numbers second.
 *
 * Most people are picking a goal, not dialling in grams — so the four presets
 * carry the decision and the sliders are there for anyone who wants them.
 * Touching a slider drops the preset selection, because the numbers no longer
 * describe it.
 */
export default function MacroPicker({ showHeading = true }) {
  const { macroPreset, macros, setMacroPreset, setMacroRange } = usePantry();

  return (
    <div>
      {showHeading && (
        <h2 className="mb-4 border-b border-divider pb-2.5 text-[19px]">
          What are you eating for?
        </h2>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        {Object.entries(MACRO_PRESETS).map(([key, preset]) => {
          const active = macroPreset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMacroPreset(key)}
              aria-pressed={active}
              className={`rounded-xl px-[22px] py-5 text-left transition-colors ${
                active
                  ? "bg-ink text-ground"
                  : "border border-line bg-surface hover:border-faintest"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-[19px] font-bold tracking-[-.02em]">
                  {preset.name}
                </span>
                {active && (
                  <span className="flex-none text-xs opacity-80">
                    ✓ selected
                  </span>
                )}
              </div>
              <p
                className={`mb-3 text-[13.5px] leading-[1.5] ${
                  active ? "text-ground/85" : "text-muted"
                }`}
              >
                {preset.blurb}
              </p>
              <div
                className={`font-mono text-xs ${
                  active ? "text-accent-soft" : "text-muted-2"
                }`}
              >
                {describePresetNumbers(preset.macros)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface px-6 py-[22px]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">
            Fine-tune the numbers
          </span>
          <span className="text-[12.5px] text-muted-2">
            {macroPreset === "custom" ? "custom" : "optional"}
          </span>
        </div>
        <p className="mb-6 text-[13px] text-muted-2">
          Per serving. Drag either end; leave a row alone to ignore that macro.
        </p>

        <div className="flex flex-col gap-6">
          {Object.keys(MACRO_LIMITS).map((key) => (
            <MacroRow
              key={key}
              macroKey={key}
              range={macros[key]}
              onChange={(next) => setMacroRange(key, next)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact numeric summary shown on each preset card. */
function describePresetNumbers(macros) {
  const parts = [];
  for (const key of Object.keys(MACRO_LIMITS)) {
    const range = macros[key];
    if (isMacroUnset(key, range)) continue;
    const limit = MACRO_LIMITS[key];
    const unit = key === "calories" ? "kcal" : "g";
    const label = limit.label.toLowerCase();
    if (range.min <= limit.min) parts.push(`under ${range.max} ${unit} ${label}`);
    else if (range.max >= limit.max) parts.push(`${range.min} ${unit}+ ${label}`);
    else parts.push(`${range.min}–${range.max} ${unit} ${label}`);
  }
  return parts.length ? parts.join(" · ") : "no macro filtering";
}
