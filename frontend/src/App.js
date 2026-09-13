import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { PantryProvider, usePantry } from "./context/PantryContext";
import Layout from "./components/Layout";
import Suggestions from "./pages/Suggestions/Suggestions";
import Placeholder from "./pages/Placeholder";
import Preferences from "./pages/Preferences/Preferences";
import WelcomeMacros from "./pages/Welcome/WelcomeMacros";
import IngredientsList from "./pages/IngredientsList/IngredientsList.js";
import RecipeDetail from "./pages/RecipeDetail/RecipeDetail.js";

/**
 * One boolean decides the entry point: an empty fridge means this browser has
 * never set Taktouka up, so it gets onboarding instead of an empty grid.
 */
function RequireFridge({ children }) {
  const { firstRun } = usePantry();
  return firstRun ? <Navigate to="/welcome" replace /> : children;
}

/** Once a fridge exists, onboarding has nothing left to ask. */
function RedirectIfSetUp({ children }) {
  const { firstRun } = usePantry();
  return firstRun ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Onboarding sits outside the shell — no navbar, no fridge to summarise. */}
      <Route
        path="/welcome"
        element={
          <RedirectIfSetUp>
            <IngredientsList />
          </RedirectIfSetUp>
        }
      />
      <Route
        path="/welcome/macros"
        element={
          <RedirectIfSetUp>
            <WelcomeMacros />
          </RedirectIfSetUp>
        }
      />

      <Route element={<Layout />}>
        <Route
          index
          element={
            <RequireFridge>
              <Suggestions />
            </RequireFridge>
          }
        />
        <Route
          path="/pantry"
          element={
            <RequireFridge>
              <IngredientsList />
            </RequireFridge>
          }
        />
        <Route path="/recipe-detail" element={<RecipeDetail />} />
        <Route
          path="/favorites"
          element={
            <Placeholder title="Favorites">
              Saved recipes will live here. The heart on a recipe already
              stores its id, so this screen is mostly a matter of reading them
              back.
            </Placeholder>
          }
        />
        <Route path="/preferences" element={<Preferences />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <PantryProvider>
      <Router>
        <AppRoutes />
      </Router>
    </PantryProvider>
  );
}
