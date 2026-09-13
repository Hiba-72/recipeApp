import React from "react";

/**
 * The Taktouka mark: a sprout in a bowl — two petals over a stem, flanked by
 * leaves, with a seed above.
 *
 * Drawn rather than imported as an image so it stays sharp at every size,
 * takes its colour from wherever it's placed, and costs nothing to load. The
 * geometry was traced from the original artwork on a 100×100 grid.
 *
 * `tone` picks the palette: "brand" on light ground, "mono" when it sits on
 * ink (the navbar) and has to read as a single silhouette.
 */
export default function Logo({ className = "", tone = "brand", title }) {
  const petal = tone === "mono" ? "currentColor" : "#c4785e";
  const seed = tone === "mono" ? "currentColor" : "#69806d";
  const seedOpacity = tone === "mono" ? 0.65 : 1;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {/* Seed */}
      <path
        d="M50 3 L58.5 11.5 L50 20 L41.5 11.5 Z"
        fill={seed}
        opacity={seedOpacity}
      />

      {/* Bowl and stem, one continuous shape: the two petals meet in a notch
          at the centre and run down into a single tapering stem. */}
      <path
        d="M3.8 21
           L34.6 21
           C42 21.5 47 27 50 36.5
           C53 27 58 21.5 65.4 21
           L96.2 21
           L96.2 31
           Q96.2 42.3 84 42.3
           L68.5 42.3
           C60 45 52 53 51.5 64.5
           Q50 66.5 48.5 64.5
           C48 53 40 45 31.5 42.3
           L16 42.3
           Q3.8 42.3 3.8 31
           Z"
        fill={petal}
      />

      {/* Leaves — mirrored, their outer edges tracing the mark's circle. */}
      <path d="M9.6 51.5 C6 71 12 90 47 100 C45 80 41 62 9.6 51.5 Z" fill={petal} />
      <path d="M90.4 51.5 C94 71 88 90 53 100 C55 80 59 62 90.4 51.5 Z" fill={petal} />
    </svg>
  );
}
