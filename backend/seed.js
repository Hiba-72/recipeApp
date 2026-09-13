const mongoose = require('mongoose');
const ingredients = require('./seed/ingredients.json');
const Ingredient = require('./models/Ingredient');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/RecipeFinder';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const deleted = await Ingredient.deleteMany({});
  const inserted = await Ingredient.insertMany(ingredients);
  const itemCount = inserted.reduce(
    (total, category) =>
      total + category.subcategories.reduce((sub, s) => sub + s.items.length, 0),
    0
  );
  console.log(
    `Removed ${deleted.deletedCount} categories, inserted ${inserted.length} categories (${itemCount} ingredients).`
  );
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
