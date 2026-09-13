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
  const span = limit.max - limit.min;
  const leftPct = ((range.min - limit.min) / span) * 100;
  const rightPct = ((range.max - limit.min) / span) * 100;

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

      <div className="relative h-5 flex-1">
        {/* Decorative track and the selected span. */}
        <div className="absolute inset-x-0 top-2 h-1 rounded-sm bg-track" />
        <div
          className={`absolute top-2 h-1 rounded-sm ${
            unset ? "bg-track-unset" : "bg-accent"
          }`}
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <input
          type="range"
          className={`range-thumb ${unset ? "is-unset" : ""}`}
          style={{ zIndex: 3 }}
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
          style={{ zIndex: 4 }}
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
