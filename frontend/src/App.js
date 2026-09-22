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
import Preferences from "./pages/Preferences/Preferences";
import WelcomeMacros from "./pages/Welcome/WelcomeMacros";
import IngredientsList from "./pages/IngredientsList/IngredientsList.js";
import RecipeDetail from "./pages/RecipeDetail/RecipeDetail.js";
import Favorites from "./pages/Favorites/Favorites";
import Landing from "./pages/Landing/Landing";

/**
 * "/" is a switch, not a redirect.
 *
 * A browser that has never set Taktouka up gets the landing page, which
 * explains what fridge-first means and hands off to onboarding. Anyone with a
 * saved fridge gets their recipes and never sees it. Before this, a stranger
 * opening the site was dropped straight into an ingredient form with no
 * explanation of what they were filling in or why.
 *
 * The branch is on `onboarded`, never on pantry.length: emptying your fridge
 * should leave you in the app looking at the "nothing matched" state, not
 * thrown back out to a marketing page.
 *
 * Landing brings its own chrome, so it renders outside Layout — which is why
 * this is a gate component rather than a parent route.
 */
function Home() {
  const { firstRun } = usePantry();
  if (firstRun) return <Landing />;
  return (
    <Layout>
      <Suggestions />
    </Layout>
  );
}

/** Guards the inner screens, which assume a fridge already exists. */
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

      {/* Outside the shell: Home decides whether there is a shell at all. */}
      <Route path="/" element={<Home />} />

      <Route element={<Layout />}>
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
            <RequireFridge>
              <Favorites />
            </RequireFridge>
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
