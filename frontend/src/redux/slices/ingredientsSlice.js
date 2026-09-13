import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import { API_BASE_URL } from '../../lib/api';

export const fetchIngredients = createAsyncThunk(
  'ingredients/fetchIngredients',
  async () => {
    const response = await axios.get(`${API_BASE_URL}/api/ingredients`);
    return response.data;
  }
);

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState: { categories: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default ingredientsSlice.reducer;
