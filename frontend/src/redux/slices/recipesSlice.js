import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { isMacroUnset } from '../../lib/storage';
import { API_BASE_URL } from '../../lib/api';

export const fetchRecipes = createAsyncThunk(
  'recipes/fetchRecipes',
  async (params, { rejectWithValue }) => {
    const {
      ingredients = [],
      recipeSearch: query,
      dishTypes: type,
      macros,
    } = params || {};

    if (ingredients.length === 0 && !query) {
      return rejectWithValue(
        'Add something to your fridge, or search for a recipe by name.'
      );
    }

    // Everything below is a request to our own server, which holds the
    // Spoonacular key and decides how these turn into an upstream query.
    // Nothing here reaches the browser that a visitor couldn't already see.
    const search = new URLSearchParams();

    if (ingredients.length > 0) {
      search.set('ingredients', ingredients.map((n) => n.trim()).join(','));
    }
    if (query) search.set('query', query);
    if (type?.length && !type.includes('all')) search.set('type', type.join(','));

    // A macro sitting at its full range means "don't filter on this", so it is
    // left out rather than sent as a no-op constraint.
    if (macros) {
      const send = (key, name) => {
        if (isMacroUnset(key, macros[key])) return;
        search.set(`min${name}`, macros[key].min);
        search.set(`max${name}`, macros[key].max);
      };
      send('calories', 'Calories');
      send('protein', 'Protein');
      send('fat', 'Fat');
      send('carbs', 'Carbs');
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/recipes/search?${search.toString()}`
      );
      return {
        results: response.data || [],
        // The server sets this when it served the captured sample instead of
        // live data, which the UI has to disclose rather than quietly show.
        fixture: response.headers['x-data-source'] === 'fixture',
      };
    } catch (error) {
      // 402 is the daily quota, and it's the one a visitor is most likely to
      // hit. The server phrases it; we just don't overwrite it.
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }

      // No response at all: wrong URL, CORS, or nothing listening. In
      // development, name the address actually being called — a stale
      // REACT_APP_API_URL in frontend/.env silently overrides the default and
      // points the app at a server that no longer exists, which is invisible
      // from a message that only says "could not reach".
      if (process.env.NODE_ENV === 'development') {
        return rejectWithValue(
          `Could not reach the recipe service at ${
            API_BASE_URL || 'this origin'
          }. Is the Worker running on that address? Check REACT_APP_API_URL in frontend/.env.`
        );
      }

      return rejectWithValue('Could not reach the recipe service.');
    }
  }
);

const recipesSlice = createSlice({
  name: 'recipes',
  initialState: {
    // One ranked list. The old two-bucket split (all-ingredients vs missing)
    // was near-permanently lopsided, because Spoonacular counts every recipe
    // ingredient you didn't list as missing — salt and oil included.
    results: [],
    loading: false,
    error: null,
    // True when these results are the offline sample, not a live search.
    usingSample: false,
  },
  reducers: {
    clearRecipes(state) {
      state.results = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecipes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.results;
        state.usingSample = action.payload.fixture;
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        state.results = [];
      });
  },
});

export const { clearRecipes } = recipesSlice.actions;
export default recipesSlice.reducer;
