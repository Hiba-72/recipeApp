import { createSlice } from '@reduxjs/toolkit';

import catalogue from '../../data/ingredients.json';

/**
 * The ingredient catalogue.
 *
 * This used to be an HTTP request to /api/ingredients, which read the same
 * data out of MongoDB. That was the only thing the database was ever used
 * for — read-only, no writes anywhere in the app — so the database existed to
 * serve one 5 KB file that was already sitting in the repo.
 *
 * Shipping it in the bundle instead removes three problems at once:
 *
 *   1. Onboarding no longer waits on the backend. On a free tier the API
 *      sleeps, and this fetch was the first thing a new visitor hit, so
 *      building a fridge could stall for the better part of a minute on a
 *      list that never changes.
 *   2. It cannot fail. A failed catalogue fetch left the picker empty with no
 *      way forward; there is no failure mode left to handle.
 *   3. The database and its seed step are gone entirely.
 *
 * The trade is that changing the catalogue now needs a deploy rather than a
 * reseed. For a list that is edited by hand a few times a year, that is the
 * better side of the bargain — and it is the same deploy that ships the code
 * reading it, so the two can never drift apart.
 */
const ingredientsSlice = createSlice({
  name: 'ingredients',
  // Loaded before the first render, so there is no loading state to model.
  initialState: { categories: catalogue, loading: false, error: null },
  reducers: {},
});

export default ingredientsSlice.reducer;
