import React from "react";
import { NavLink } from "react-router-dom";
import Logo from "./Logo";

const linkBase =
  "py-[21px] text-sm font-medium transition-colors border-b-2 border-transparent";

function navClass({ isActive }) {
  return isActive
    ? `${linkBase} text-white border-accent-soft`
    : `${linkBase} text-ground/[.68] hover:text-white`;
}

export default function Navbar() {
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

        {/* No "Suggestions" link: the logo already goes there, and on a phone
            the four links plus the wordmark left nothing room to breathe. */}
        <div className="flex flex-1 items-center gap-5 overflow-x-auto sm:gap-6">
          <NavLink to="/pantry" className={navClass}>
            Pantry
          </NavLink>
          <NavLink to="/favorites" className={navClass}>
            Favorites
          </NavLink>
          <NavLink to="/preferences" className={navClass}>
            Preferences
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
