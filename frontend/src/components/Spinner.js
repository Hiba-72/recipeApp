import React from "react";

/**
 * Looping activity indicator.
 *
 * A skeleton alone is static: on a slow response it's indistinguishable from
 * a layout that has finished rendering badly. Pairing the skeleton with
 * something that visibly moves is what tells you the app is still working.
 *
 * Honours prefers-reduced-motion by falling back to a pulse instead of a
 * spin — vestibular triggers are a real accessibility concern, and an
 * indicator is exactly the kind of always-on motion that provokes them.
 */
export default function Spinner({ size = 20, label = "Loading" }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center motion-safe:animate-spin motion-reduce:animate-pulse"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-line-strong"
        />
        {/* A quarter arc is what makes the rotation legible — a full ring
            would look identical at every angle. */}
        <path
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-accent"
        />
      </svg>
    </span>
  );
}
