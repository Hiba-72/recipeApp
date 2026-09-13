import React from "react";
import { Link } from "react-router-dom";

/**
 * Honest stand-in for a screen the design specifies but that isn't built yet.
 * Better than a nav link that silently bounces you back to the home screen.
 */
export default function Placeholder({ title, children }) {
  return (
    <main className="px-5 py-16 sm:px-10">
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface px-8 py-10 text-center">
        <h1 className="mb-3 text-[26px] tracking-[-.02em]">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">{children}</p>
        <Link to="/" className="btn-outline">
          Back to suggestions
        </Link>
      </div>
    </main>
  );
}
