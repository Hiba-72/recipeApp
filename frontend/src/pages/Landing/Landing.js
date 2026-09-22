import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

/**
 * The front door.
 *
 * Only ever rendered for a browser that has never set Taktouka up — the route
 * at "/" branches on the onboarded flag, so anyone with a saved fridge goes
 * straight to their recipes and never sees this. That means this page has
 * exactly one job: make a stranger understand fridge-first in a few seconds
 * and start adding ingredients.
 *
 * It carries its own chrome rather than sitting inside Layout. The app nav is
 * Pantry / Favorites / Preferences, and all three are meaningless before a
 * fridge exists.
 *
 * There is deliberately no "Sign in": Taktouka has no accounts at all. The
 * fridge lives in this browser's localStorage, which is also why the hero can
 * honestly promise no account is needed.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-ground">
      {/* ── Masthead ─────────────────────────────────────────────── */}
      <header className="bg-ink">
        <div className="mx-auto flex h-[62px] max-w-[1120px] items-center gap-2.5 px-5 sm:px-10">
          <Logo tone="mono" className="h-[26px] w-[26px] text-ground" />
          <span className="text-[19px] font-bold tracking-[-.03em] text-ground">
            Taktouka
          </span>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-[22px] px-5 pb-10 pt-11 sm:px-10 sm:pb-20 sm:pt-24">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-[26px] bg-accent" />
            <span className="text-[11px] font-bold uppercase tracking-[.16em] text-accent-ink">
              Issue one · Tonight
            </span>
          </div>

          {/* clamp() rather than breakpoints: the headline is the one element
              that should scale continuously, so it never lands at an awkward
              size between two fixed steps. */}
          <h1
            className="max-w-[16ch] leading-[1.02] [text-wrap:balance]"
            style={{ fontSize: "clamp(40px, 7.5vw, 84px)" }}
          >
            The fridge knows first.
          </h1>

          <p
            className="max-w-[46ch] leading-[1.6] text-ink-soft"
            style={{ fontSize: "clamp(16px, 2vw, 21px)" }}
          >
            Half a block of feta, a jar of harissa, three tomatoes going soft.
            Recipe sites ask what you want to eat, then hand you a shopping
            list. Taktouka asks what you have, then ranks dinner by how little
            is missing.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-1.5">
            <Link
              to="/welcome"
              className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
            >
              Build my fridge
            </Link>
            <span className="text-[13.5px] text-muted">
              About a minute. No account needed.
            </span>
          </div>
        </div>
      </section>

      {/* ── The mechanic ─────────────────────────────────────────── */}
      <section className="border-b border-line bg-tint">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-6 px-5 py-9 sm:gap-14 sm:px-10 sm:py-[72px] lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p
              className="leading-[1.25] tracking-[-.02em]"
              style={{ fontSize: "clamp(22px, 3vw, 32px)" }}
            >
              Two answers, and only two:{" "}
              <span className="text-have">you have everything</span>, or{" "}
              <span className="text-need">here's the short list</span>.
            </p>
            <p className="max-w-[44ch] text-[15px] leading-[1.6] text-ink-soft">
              No stars, no scores to interpret. The distance between your
              fridge and dinner, written out on every card.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-[13px] rounded-[10px] border border-have-line bg-have-bg px-4 py-3.5">
              <span className="text-[15px] font-bold text-have">✓</span>
              <div>
                <div className="text-[15px] font-semibold">
                  Shakshuka with Feta
                </div>
                <div className="text-[13px] font-semibold text-have">
                  You have everything — all 6
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[13px] rounded-[10px] border border-need-line bg-need-bg px-4 py-3.5">
              <span className="text-[15px] font-bold text-need">+</span>
              <div>
                <div className="text-[15px] font-semibold">
                  Lentil &amp; Preserved Lemon Soup
                </div>
                <div className="text-[13px] text-need-soft">
                  Needs 2: preserved lemon, cumin
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-[1120px] flex-col gap-7 px-5 py-9 sm:gap-10 sm:px-10 sm:py-[72px]">
        <h2 className="border-b border-line pb-2.5 text-[13px] font-bold uppercase tracking-[.14em] text-faint">
          How it works
        </h2>

        {/* 228px min track: below that the third step orphans onto its own
            row, which reads as two steps and a straggler rather than three. */}
        <div className="grid gap-[26px] sm:gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,228px),1fr))]">
          <Step
            n="01"
            title="Save your fridge"
            body="Staples and tonight's odds and ends, once. It's remembered."
          >
            <FridgeSketch />
          </Step>
          <Step
            n="02"
            title="Set macros, if you track them"
            body="Calorie and protein ranges. Entirely optional."
          >
            <MacroSketch />
          </Step>
          <Step
            n="03"
            title="Open to a ranked list"
            body="Closest to cookable at the top, every time you come back."
          >
            <RankedSketch />
          </Step>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────── */}
      <section className="bg-ink">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-[18px] px-5 py-9 sm:px-10 sm:py-[72px]">
          <h2
            className="max-w-[18ch] leading-[1.08] text-ground"
            style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
          >
            Start with what's in there.
          </h2>
          <Link
            to="/welcome"
            className="inline-flex self-start items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Build my fridge
          </Link>

          {/* Saying the limits out loud costs nothing and buys the rest of the
              page its credibility. A visitor who hits the daily cap having
              been warned reads it as a known constraint, not a broken app. */}
          <p className="mt-3.5 max-w-[62ch] border-t border-ground/[.18] pt-[18px] text-[13.5px] leading-[1.65] text-accent-soft">
            A portfolio project, hosted on a free tier. Recipes come from a
            public API with a daily request cap — late in the day the list
            thins out, and the first load after a quiet hour is slow.
          </p>
        </div>
      </section>
    </div>
  );
}

/** One numbered step: a sketch above, the number and copy below. */
function Step({ n, title, body, children }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Fixed ratio so the three sketches sit on one baseline whatever they
          contain, exactly as a row of photographs would. */}
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[10px] border border-line bg-surface p-4">
        {children}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-xs text-accent-ink">{n}</span>
        <div>
          <h3 className="mb-1.5 text-[19px] tracking-[-.02em]">{title}</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-soft">{body}</p>
        </div>
      </div>
    </div>
  );
}

/*
 * The three sketches below replace what the design had as photography.
 *
 * Stock food photos would say "recipe site", which is the category Taktouka is
 * trying to distinguish itself from — and a placeholder that admits it is a
 * placeholder undercuts the whole page. Building each one out of the app's own
 * interface instead means the section demonstrates the product rather than
 * gesturing at the subject matter, needs no photography to ship, and stays
 * correct if the palette changes.
 *
 * They are decorative summaries of what the step does, so they are hidden from
 * assistive tech — the heading and body text next to them carry the meaning.
 */

/** Step 01 — ingredient chips accumulating in a fridge. */
function FridgeSketch() {
  const items = ["Tomato", "Red Onion", "Garlic", "Feta", "Harissa", "Eggs"];
  return (
    <div
      aria-hidden="true"
      className="flex w-full flex-wrap content-center justify-center gap-1.5"
    >
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-chip-bg px-2.5 py-1 text-[11px] text-ink-soft"
        >
          {item}
        </span>
      ))}
      <span className="rounded-full border border-dashed border-faintest px-2.5 py-1 text-[11px] text-faint">
        +
      </span>
    </div>
  );
}

/** Step 02 — two macro rows at rest, one set and one left alone. */
function MacroSketch() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col justify-center gap-4">
      <SketchSlider label="Calories" from={0.12} to={0.58} active />
      <SketchSlider label="Protein" from={0} to={1} />
    </div>
  );
}

function SketchSlider({ label, from, to, active = false }) {
  return (
    <div className={active ? "" : "opacity-55"}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold text-ink-soft">
          {label}
        </span>
        <span className="font-mono text-[9.5px] text-muted-2">
          {active ? "400 – 700" : "any"}
        </span>
      </div>
      <div className="relative h-2.5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-sm bg-track" />
        <div
          className={`absolute top-1/2 h-1 -translate-y-1/2 rounded-sm ${
            active ? "bg-accent" : "bg-track-unset"
          }`}
          style={{ left: `${from * 100}%`, right: `${(1 - to) * 100}%` }}
        />
        {[from, to].map((pos, i) => (
          <span
            key={i}
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-white ${
              active ? "border-accent" : "border-track-unset"
            }`}
            style={{ left: `calc(${pos * 100}% - 5px)` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Step 03 — the ranked list, complete matches first. */
function RankedSketch() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col justify-center gap-1.5">
      <SketchRow tone="have" label="You have everything" width="w-[78%]" />
      <SketchRow tone="have" label="You have everything" width="w-[62%]" />
      <SketchRow tone="need" label="Needs 1" width="w-[70%]" />
      <SketchRow tone="need" label="Needs 3" width="w-[54%]" />
    </div>
  );
}

function SketchRow({ tone, label, width }) {
  const have = tone === "have";
  return (
    <div
      className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
        have ? "border-have-line bg-have-bg" : "border-need-line bg-need-bg"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full ${
          have ? "bg-have" : "bg-need"
        }`}
      />
      <span className={`h-1.5 rounded-sm bg-line-strong ${width}`} />
      <span
        className={`ml-auto flex-none text-[8.5px] font-semibold ${
          have ? "text-have" : "text-need-soft"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
