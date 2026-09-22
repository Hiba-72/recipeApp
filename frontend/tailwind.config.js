/** @type {import('tailwindcss').Config} */
// Tokens from the Taktouka design canvas, matured one pass: the ground moved
// off blush pink to a warm bone, and the whole neutral ramp off aubergine to a
// true warm grey. The pink cast was what made the app read as a lifestyle blog
// rather than a tool — terracotta stays, because it comes from the logo and is
// the one place colour is meant to be doing work.
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#faf8f5", // page background — warm, but no hue you can name
        surface: "#ffffff", // cards, panels
        strip: "#f2efe9", // fridge summary bar
        ink: "#23201d", // headings, primary text, navbar
        "ink-soft": "#46413b", // body copy
        // The neutral ramp is flatter than it was on purpose. Every step below
        // carries real text at 12–13px, so each one clears 4.5:1 on both the
        // ground and white; a prettier ramp that fails at the light end just
        // means the small print is unreadable.
        muted: "#635c54", // 6.2:1 on ground
        "muted-2": "#6f6860", // 5.2:1
        faint: "#787168", // 4.5:1 — the floor for body text
        faintest: "#b8b0a4", // borders, disabled fills — never text that matters
        // Terracotta, from the logo. Two tokens because one can't do both jobs:
        // the brand terracotta (#c4785e) is only 3.4:1 on white, so it can't
        // carry white button text. `accent` is darkened just enough to clear
        // 4.5:1 as a background; `accent-ink` is darker still, for the times
        // the accent is the text and the light ground is behind it.
        accent: "#ae5e46", // primary action background, focus rings
        "accent-ink": "#944b36", // accent as text on a light ground, and hovers
        "accent-soft": "#e5c0ac", // only ever on ink: nav underline, active card
        tint: "#fbf4ef", // hovered rows in the ingredient dropdown
        "chip-bg": "#f3e9e1", // saved-ingredient chips
        track: "#e7e1d8", // macro slider track
        "track-unset": "#d3ccc1", // …and its fill when the macro is unset
        line: "#e8e3db", // card borders
        "line-strong": "#ddd6cb", // inputs, strip border
        divider: "#e8e3db",
        // You have it
        have: "#2a7053",
        "have-bg": "#eaf2ed",
        "have-soft": "#4f6f5e",
        "have-line": "#cde0d4",
        // You need it
        need: "#b03a2e",
        "need-bg": "#fbecea",
        "need-soft": "#8a4034",
        "need-line": "#f0d8d3",
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        // Stand-in for recipe photography while images are unwired.
        placeholder:
          "repeating-linear-gradient(45deg,#e9e4dc 0 9px,#f2eee7 9px 18px)",
      },
    },
  },
  plugins: [],
};
