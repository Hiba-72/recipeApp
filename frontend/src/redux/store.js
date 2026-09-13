import { configureStore } from '@reduxjs/toolkit';
import ingredientsReducer from './slices/ingredientsSlice';
import recipesReducer from './slices/recipesSlice';
import recipeDetailsReducer from './slices/recipeDetailsSlice';

const store = configureStore({
  reducer: {
    ingredients: ingredientsReducer,
    recipes: recipesReducer,
    recipeDetails: recipeDetailsReducer
  }
});

export default store;