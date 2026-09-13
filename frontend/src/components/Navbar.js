import React from "react";
import { NavLink } from "react-router-dom";
import { usePantry } from "../context/PantryContext";
import Logo from "./Logo";

const linkBase =
  "py-[21px] text-sm font-medium transition-colors border-b-2 border-transparent";

function navClass({ isActive }) {
  return isActive
    ? `${linkBase} text-white border-accent-soft`
    : `${linkBase} text-ground/[.68] hover:text-white`;
}

export default function Navbar() {
  const { favorites } = usePantry();

  return (
    <nav className="bg-ink">
      <div className="flex h-[62px] items-center gap-6 px-5 sm:gap-9 sm:px-10">
        {/* The mark carries the brand colour everywhere else, but on the ink
            navbar terracotta on plum is muddy — so it goes mono and reads as
            one clean silhouette against the bar. */}
        <NavLink
          to="/"
          className="flex flex-shrink-0 items-center gap-2.5 text-ground"
          aria-label="Taktouka — home"
        >
          <Logo tone="mono" className="h-[26px] w-[26px]" />
          <span className="text-[19px] font-bold tracking-[-.03em]">
            Taktouka
          </span>
        </NavLink>

        <div className="flex flex-1 items-center gap-5 overflow-x-auto sm:gap-6">
          <NavLink to="/" end className={navClass}>
            Suggestions
          </NavLink>
          <NavLink to="/pantry" className={navClass}>
            Pantry
          </NavLink>
          <NavLink to="/favorites" className={navClass}>
            Favorites{" "}
            {favorites.length > 0 && (
              <span className="opacity-70">{favorites.length}</span>
            )}
          </NavLink>
          <NavLink to="/preferences" className={navClass}>
            Preferences
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
