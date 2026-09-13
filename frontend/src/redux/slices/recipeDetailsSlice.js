import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';

export const fetchRecipeDetails = createAsyncThunk(
  'recipeDetails/fetchRecipeDetails',
  async (recipeId, { rejectWithValue }) => {
    try {
      // Proxied through our own server, which holds the Spoonacular key.
      const response = await axios.get(
        `${API_BASE_URL}/api/recipes/${encodeURIComponent(recipeId)}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Could not load that recipe.'
      );
    }
  }
);

const recipeDetailsSlice = createSlice({
  name: 'recipeDetails',
  initialState: { recipeDetails: null, loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecipeDetails.pending, (state) => {
        state.loading = true;
        // Without this a failure on one recipe follows you to the next one,
        // which then renders fine but under a stale error.
        state.error = null;
      })
      .addCase(fetchRecipeDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.recipeDetails = action.payload;
      })
      .addCase(fetchRecipeDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default recipeDetailsSlice.reducer;
