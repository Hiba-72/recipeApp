import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../lib/api";

/**
 * Ingredient entry that can only produce real ingredients.
 *
 * Typed text is never saved. You pick from what the recipe API actually knows,
 * and we store the canonical name it gives back. In a throwaway search a typo
 * costs you one bad result; saved in a fridge forever, it quietly degrades
 * every future suggestion. Making invalid input unrepresentable removes a
 * whole error state instead of designing one.
 */
export default function IngredientSearch({
  onSelect,
  onQueryChange,
  placeholder = "Search ingredients, or add your own",
  autoFocus = false,
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  // Let the parent filter its grid as you type, without coupling the two.
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  // Debounced so a fast typist doesn't fire a request per keystroke.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setMatches([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Proxied through our own server, which holds the Spoonacular key.
        const { data } = await axios.get(
          `${API_BASE_URL}/api/ingredients/autocomplete`,
          { params: { query: term }, signal: controller.signal }
        );
        setMatches(Array.isArray(data) ? data : []);
        setHighlight(0);
      } catch (err) {
        // An aborted request is the expected case while typing, not a failure.
        if (!axios.isCancel(err)) setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close on an outside click, the way any combobox should.
  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const choose = (name) => {
    onSelect(name);
    setQuery("");
    setMatches([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(matches[highlight].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative max-w-[520px]">
      <input
        type="text"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Search ingredients"
        aria-expanded={open && matches.length > 0}
        role="combobox"
        aria-controls="ingredient-matches"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="field"
      />

      {open && query.trim().length >= 2 && (
        <div
          id="ingredient-matches"
          role="listbox"
          className="absolute left-0 right-0 top-[52px] z-20 overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-[0_10px_28px_rgba(35,32,29,.14)]"
        >
          <div className="border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-faint">
            {loading ? "Looking…" : "Matched in the catalogue"}
          </div>

          {!loading && matches.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-muted">
              No ingredient by that name. Try a simpler word — “pepper” rather
              than “red bell peppers”.
            </div>
          )}

          {matches.map((m, i) => (
            <button
              key={m.name}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(m.name)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                i === highlight ? "bg-tint" : "bg-surface"
              }`}
            >
              <span className="h-6 w-6 flex-none rounded-[5px] bg-placeholder" />
              <span
                className={`text-sm ${
                  i === highlight ? "font-semibold" : "font-normal"
                }`}
              >
                {m.name}
              </span>
            </button>
          ))}

          {matches.length > 0 && (
            <p className="border-t border-line bg-tint px-4 py-2.5 text-[11.5px] leading-[1.4] text-muted">
              Pick from the list — we store the name the recipe database uses,
              so nothing silently stops matching.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
