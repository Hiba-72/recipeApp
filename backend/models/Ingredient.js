const mongoose = require('mongoose');

// Matches the shape the frontend expects: a category holding named
// subcategories, each with a flat list of ingredient names.
const IngredientSchema = new mongoose.Schema({
  category: String,
  subcategories: [
    {
      name: String,
      tags: [String],
      items: [String]
    }
  ]
});

module.exports = mongoose.model('Ingredient', IngredientSchema);
