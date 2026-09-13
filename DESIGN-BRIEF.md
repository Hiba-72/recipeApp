# Taktouka — Design Brief

Handoff document for design work. Design direction is **settled**; the sections
below marked *built* are in the code already.

---

## Decided

- **Name.** Taktouka.
- **Palette.** Aubergine ink `#3d1b2c` on a blush ground `#f7f1f3`, surfaces
  white. Terracotta for actions, taken from the logo — but in two tokens, not
  one: the brand terracotta `#c4785e` is only 3.4:1 on white, so `accent`
  `#ae5e46` carries white button text (4.7:1) and `accent-ink` `#944b36` is the
  accent used *as* text on the light ground (5.7:1). `accent-soft` `#ddc1c4`
  appears only on ink — the active nav underline and the selected preset card.
  Green `#2f7d5b` carries "you have it", brick `#b03a2e` carries "you need it" —
  those two never do any other job.
- **Type.** Archivo throughout, 400/500/600/700. No serif in the UI (the logo
  wordmark is the one exception).
- **Fridge placement.** Treatment A — a summary strip directly under the navbar
  on every screen, with "Edit fridge" as the way into the pantry.
- **Flow.** First run goes ingredients → macros → home.
- **Cards.** kcal and protein tiles showing in-range or how far short, plus a
  named missing list ("Need basil, feta") rather than a ratio.

Tokens live in `frontend/tailwind.config.js`; component classes in
`frontend/src/index.css`. Nothing hardcodes a hex.

---

## Product model

**You tell it what's in your fridge once. It suggests recipes you can cook right now.**

The fridge is persistent state, not a search query. A returning user opens the app and
sees suggestions immediately — they do not re-pick ingredients. Selection happens once
at first run, and is editable afterwards. Macro preferences persist the same way.

Everything is stored locally in the browser. There are no accounts.

Recipe data comes from the Spoonacular API, proxied through the app's own backend —
the API key never reaches the browser. That backend also serves the ingredient
catalogue, caches recipe responses, and falls back to a captured sample when the
daily API allowance runs out.

### What the current build gets wrong

The existing app inverts this. Ingredient-picking *is* the home screen, nothing is
saved, and every visit starts from an empty fridge. Refreshing the results page loses
everything. The design work is largely about correcting this inversion — the pantry
becomes durable state, and the home screen becomes suggestions.

---

## Screens

### 1. First run — "What's in your fridge?"

Only shown when no saved pantry exists. This is the current ingredient grid, repurposed
as onboarding.

- Categories → subcategories → clickable ingredient chips, 4 across on desktop
- Live search that filters the grid as you type
- Free-text input to add an ingredient that isn't in the catalogue
- Macro preferences (a second step, or skippable with defaults)
- Needs a persistent, visible basket of what you've picked — across a 140-item
  catalogue you lose track. The current build shows selections only as highlighted
  chips scattered through the grid, with no summary anywhere. **Biggest gap here.**
- Must handle abandonment — what happens if someone picks two things and leaves?

### 2. Home — Suggestions (returning user, the default screen)

Does not exist today. This is the screen the product is actually about.

Loads saved pantry and macros, fetches, and shows ranked results with no user action
required. Each card should carry a **"you have 6 of 8"** completeness indicator — that
ratio is the core value signal and is currently displayed nowhere.

Needs a visible summary of which fridge produced these results, and a fast route to
edit it.

### 3. Pantry — edit your fridge

The onboarding grid again in edit mode, reachable from the navbar (`/pantry` is already
linked there — it was never built). Add and remove ingredients; results refresh.

Open question: does editing re-fetch immediately, or on an explicit "update"?

### 4. Preferences — macros and dish types

Saved, not per-search. Four dual-handle ranges plus a 15-option dish-type multi-select.
Could live inside the pantry screen or stand alone.

### 5. Recipe detail

Styled and functional today. Title, hero image, health panel (vegetarian / vegan /
gluten-free / dairy-free / very healthy / health score, plus Calories, Protein, Fat,
Carbohydrates, Sugar, Fiber), ingredients list, instructions.

Should gain: which ingredients you already have vs. need to buy. The data is in the
response, and it is the natural payoff of a fridge-based app.

### 6. Favorites

Linked in the navbar, never built. Cheap with local storage.

---

## Local persistence

Nothing like this exists in the code yet. Suggested shape:

```js
{
  pantry:    ["Tomato", "Garlic", "Olive Oil"],      // ingredient names
  macros:    { calories: {min, max}, protein: {min, max},
               fat: {min, max}, carbs: {min, max} },
  dishTypes: ["all"],
  favorites: [657933, 660101]                        // spoonacular recipe ids
}
```

Design consequences worth deciding:

- **First-run detection** is just "is the pantry empty?" — that boolean picks the screen.
- Clearing browser data wipes the fridge. Is an export/import or a reset affordance needed?

### Ingredient entry is validated against the API — decided

Ingredient names are the join key to Spoonacular. In a throwaway search a typo costs
nothing; saved in a fridge forever, an unmatched entry silently degrades every future
suggestion. So custom entries are validated on entry.

**Design it as an autocomplete picker, not a text box with an error state.** The user
types, sees real ingredients, and picks one — invalid input becomes unrepresentable and
there is no error state left to design.

Verified working on the current key:

| Endpoint | Returns | Use for |
| --- | --- | --- |
| `/food/ingredients/autocomplete?query=tom` | `tomato`, `tomatillos`, `tomato soup` (+ image) | as-you-type suggestions |
| `/food/ingredients/search?query=zucchini` | same, plus canonical `id` (`11477`) | resolving the final pick |

Store the canonical name the API returns, never the user's raw typing.

---

## Data shapes

### Ingredient catalogue (own backend, `GET /api/ingredients`)

```json
[{ "category": "Produce",
   "subcategories": [
     { "name": "Vegetables", "tags": ["vegetarian", "vegan"],
       "items": ["Tomato", "Onion", "Garlic"] }]}]
```

Current catalogue: 6 categories / 19 subcategories / 140 items.

| Category | Subcategories | Items |
| --- | --- | --- |
| Produce | Vegetables, Fruits, Herbs | 37 |
| Protein | Meat, Seafood, Plant Protein | 25 |
| Dairy & Eggs | Dairy, Cheese, Eggs | 15 |
| Pantry | Grains & Pasta, Oils & Vinegars, Canned & Jarred, Baking | 31 |
| Spices & Condiments | Spices, Condiments | 20 |
| Nuts & Seeds | Nuts, Seeds | 12 |

> This catalogue is a reconstruction. The original was lost with the old machine — it
> only ever lived in a local MongoDB and was never committed to git. If the real
> taxonomy should differ, decide that before the grid is designed around 6 categories.

`tags` exists on every subcategory but nothing reads it — a free dietary filter
(vegetarian / vegan / pescatarian) sitting unused.

### Recipe result card (Spoonacular)

`id`, `title`, `image` (312×231 jpg), `readyInMinutes`, `servings`, `healthScore`,
`vegetarian`, `vegan`, `glutenFree`, `dairyFree`, `veryHealthy`, `cheap`,
`aggregateLikes`, `usedIngredients[]`, `missedIngredients[]`, `sourceUrl`, `sourceName`.

The current card shows only image and title. Cook time, servings, health score, diet
badges and the used/missed ratio are all already in the response, free to display.

### Filter values

- **Dish types (15):** all, main course, side dish, dessert, appetizer, salad, bread,
  breakfast, soup, beverage, sauce, marinade, fingerfood, snack, drink
- **Macro ranges:** Calories 0–5000 · Protein 0–300 g · Fat 0–200 g · Carbs 0–500 g

---

## Screen states to design

Today every one of these renders as unstyled black text on white.

| State | Today |
| --- | --- |
| First run, empty fridge | no such concept |
| Catalogue loading | "Loading ingredients..." |
| Backend down | "Error: ..." — full-page, blocks everything |
| Suggestions loading | button label flips to "Loading..." |
| No recipes match | "No recipes found..." |
| Nothing matches *because macros are too tight* | indistinguishable from the above |
| API quota exhausted | generic error string |
| Detail loading / missing | bare text |

The too-tight-macros case deserves its own treatment — it is recoverable, and the user
needs to be told which filter to loosen.

---

## Existing visual language

**Palette** (lavender/purple, hardcoded as arbitrary Tailwind values)

| Hex | Used for |
| --- | --- |
| `#faf8fe` | page background |
| `#ece1fc` | input backgrounds |
| `#ceb3f6` | selected ingredient chip, focus ring |
| `#bb95f3` | primary button |
| white | navbar, cards |

**Type:** Epilogue (400/500/700/900), Noto Sans fallback — already loaded from Google
Fonts in `public/index.html`.

**Shape:** heavily rounded — `rounded-3xl` inputs, `rounded-full` buttons, `rounded-lg`
cards. Soft shadows (`0 2px 8px rgba(0,0,0,0.1)`).

**Inconsistency to resolve:** macro sliders are green (`#22c55e`) and selected
dish-type rows are `bg-green-100` — leftovers from an earlier palette that clash with
the purple.

**Unused assets** in `public/images/`: `carousel1.png`, `carousel2.png`, `car2`–`car5.jpg`,
`doodle.jpg` — never referenced anywhere. `App.css` defines a 70px `.sidebar` that no
component uses, and the file is never imported.

---

## Decisions the design needs to make

1. **Onboarding vs. home.** Two entry states from one boolean. How does first run flow
   into the first set of suggestions?
2. **Where the fridge lives on screen** once it is persistent — sticky bar, chip tray,
   drawer, or a count in the navbar.
3. **Result cards built around "you have 6 of 8"** rather than a two-bucket split.
4. **Editing the fridge from the results screen** without losing your place.
5. **Favorites and shopping list.** "What you're missing" is one step from a shopping
   list, and the data is already there.
6. **Surface the dietary `tags`** as a filter, or drop them from the data.
7. **Mobile.** The layout declares `lg:` breakpoints, but the two-column split has
   never been checked at phone width.

---

## Where the API key belongs

The key currently ships inside the browser bundle, where anyone can read it and spend
your quota. `REACT_APP_*` variables are compiled in — moving it to `.env` hid it from
git but not from users.

This is worth fixing for a reason beyond security: **the backend currently does nothing
that requires a backend.** It serves a static catalogue that could be a JSON file. Move
the Spoonacular calls behind Express and it earns its place — the key stays server-side,
and caching responses against the pantry has somewhere to live. Better architecture, and
a better story for a portfolio reviewer.

## Technical note for whoever implements

Measured against the live API with a realistic 16-item fridge:

- **Use `complexSearch` with `ranking=1`.** Returns 50 results, most missing only one
  ingredient, and it honours macro and dish-type filters.
- **Do not use `findByIngredients`.** It ranks better (used 8 / missed 2) but
  **silently ignores** `minProtein`, `type`, and every other filter — no error, it just
  drops them. Incompatible with saved macro preferences.
- The current code sends `ranking` only when there is a text query. It must be sent
  always, or fridge results rank poorly.
- Persisting the pantry also removes an existing bug: the results page reads
  `location.state.selectedIngredients` while the caller passes `ingredients`, so a
  refresh silently empties the list. With a saved fridge, results are always
  recomputable and the navigation-state dependency disappears.

## Build status

| Screen | State |
| --- | --- |
| First run · ingredients | **Built** — `pages/IngredientsList` in onboarding mode |
| First run · macros | Not built — presets and optional sliders |
| Home · suggestions | **Built** — `pages/Suggestions` |
| Pantry | **Built** — same component, edit mode, staged commit |
| Recipe detail | Old markup, not yet redesigned |
| Favorites | Placeholder route |
| Preferences | Placeholder route |

Also built: the localStorage layer (`lib/storage.js`), the shared state
(`context/PantryContext.js`), validated ingredient entry
(`components/IngredientSearch.js`), and macro evaluation (`lib/nutrition.js`).

The malformed Tailwind classes in the old ingredient grid are gone — that markup
was replaced wholesale, as expected.
