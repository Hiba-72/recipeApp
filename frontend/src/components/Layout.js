import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import FridgeStrip from "./FridgeStrip";
import { usePantry } from "../context/PantryContext";

/**
 * Chrome shared by every signed-in screen. Onboarding renders outside this,
 * deliberately — it has no navbar and no fridge to summarise yet.
 */
export default function Layout() {
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

      <Outlet />
    </div>
  );
}
