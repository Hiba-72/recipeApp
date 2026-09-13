/** @type {import('tailwindcss').Config} */
// Tokens come from the Taktouka design canvas: aubergine ink on a blush ground,
// magenta for actions, and a green/brick pair that carries have vs. need.
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#f7f1f3", // page background
        surface: "#ffffff", // cards, panels
        strip: "#f4e7df", // fridge summary bar
        ink: "#3d1b2c", // headings, primary text, navbar
        "ink-soft": "#5c3a49", // body copy
        muted: "#7a5464",
        "muted-2": "#8a6273",
        faint: "#a3808f",
        faintest: "#b393a1",
        // Terracotta, from the logo. Two tokens because one can't do both jobs:
        // the brand terracotta (#c4785e) is only 3.4:1 on white, so it can't
        // carry white button text. `accent` is darkened just enough to clear
        // 4.5:1 as a background; `accent-ink` is darker still, for the times
        // the accent is the text and the light ground is behind it.
        accent: "#ae5e46", // primary action background, focus rings
        "accent-ink": "#944b36", // accent as text on a light ground, and hovers
        "accent-soft": "#ddc1c4", // only ever on ink: nav underline, active card
        tint: "#fdf4ef", // hovered rows in the ingredient dropdown
        "chip-bg": "#f6e4dd", // saved-ingredient chips
        track: "#ecdcd3", // macro slider track
        "track-unset": "#d6c3b8", // …and its fill when the macro is unset
        line: "#ecdae0", // card borders
        "line-strong": "#e4d3d9", // inputs, strip border
        divider: "#e8d8de",
        // You have it
        have: "#2f7d5b",
        "have-bg": "#e7f2ec",
        "have-soft": "#5a7a68",
        "have-line": "#c9e2d5",
        // You need it
        need: "#b03a2e",
        "need-bg": "#fbe9e7",
        "need-soft": "#8f4034",
        "need-line": "#f3d9d4",
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        // Stand-in for recipe photography while images are unwired.
        placeholder:
          "repeating-linear-gradient(45deg,#ecdde2 0 9px,#f4e8ec 9px 18px)",
      },
    },
  },
  plugins: [],
};
