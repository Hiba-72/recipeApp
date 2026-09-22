import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import FridgeStrip from "./FridgeStrip";
import { usePantry } from "../context/PantryContext";

/**
 * Chrome shared by every screen that has a fridge behind it. Onboarding and
 * the landing page render outside this, deliberately — neither has a navbar
 * or a fridge to summarise yet.
 *
 * Takes `children` as well as an <Outlet/> so it can be used directly by the
 * "/" gate, which picks between the landing page and the app and therefore
 * cannot be expressed as a parent route.
 */
export default function Layout({ children }) {
  const { storageBlocked } = usePantry();

  return (
    <div className="min-h-screen bg-ground">
      <Navbar />
      <FridgeStrip />

      {storageBlocked && (
        <div className="border-b border-need-line bg-need-bg px-5 py-2.5 text-[13px] text-need-soft sm:px-10">
          This browser is blocking storage, so your fridge won't be here when
          you come back. Everything else works as normal.
        </div>
      )}

      {children ?? <Outlet />}
    </div>
  );
}
