import { createClient } from '@supabase/supabase-js';

/**
 * Lazily creates and caches the real Supabase client.
 * Deferred to call-time so the module can be imported in tests
 * without SUPABASE_URL/SUPABASE_KEY being set in the environment
 * (consistent with the moonshot.js lazy-init pattern).
 */
function getRealClient() {
  if (!getRealClient._instance) {
    getRealClient._instance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }
  return getRealClient._instance;
}

/**
 * Returns the active Supabase client.
 * Tests inject a mock via global.__mockSupabaseClient.
 */
function getClient() {
  return global.__mockSupabaseClient || getRealClient();
}

/**
 * Proxy that forwards all property access to the lazily-resolved client.
 * Exporting this as `supabase` lets callers use it like a normal client
 * (e.g. supabase.from('recipes')) while deferring real client construction
 * until the first property is accessed.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

/**
 * Saves a recipe and its ingredients to Supabase.
 * Uses upsert with merge-duplicates to prevent duplicate rows.
 *
 * @param {object} recipeData
 * @param {string} recipeData.instagram_url
 * @param {string} recipeData.title
 * @param {string} recipeData.main_category
 * @param {string} recipeData.difficulty
 * @param {string[]} recipeData.ingredients - Array of ingredient name strings
 * @returns {Promise<{recipe_id: string, title: string, ingredients_count: number}>}
 */
export async function saveRecipe({ instagram_url, title, main_category, difficulty, ingredients }) {
  const client = getClient();

  // Step 1: Upsert recipe row (deduplicates by instagram_url)
  const { data: recipeRows, error: recipeError } = await client
    .from('recipes')
    .upsert(
      { instagram_url, title, main_category, difficulty },
      { onConflict: 'instagram_url' }
    )
    .select('id, title');

  if (recipeError) throw new Error(`Recipe upsert failed: ${recipeError.message}`);

  const recipe = recipeRows[0];

  // Step 2: Upsert each ingredient (normalize name: lowercase + trim, deduplicates by name)
  const normalizedIngredients = ingredients.map((name) => ({
    name: name.toLowerCase().trim(),
  }));

  const { data: ingredientRows, error: ingredientsError } = await client
    .from('ingredients')
    .upsert(normalizedIngredients, { onConflict: 'name' })
    .select('id');

  if (ingredientsError) throw new Error(`Ingredients upsert failed: ${ingredientsError.message}`);

  // Step 3: Insert junction rows linking recipe to each ingredient
  const junctionRows = ingredientRows.map((ingredient) => ({
    recipe_id: recipe.id,
    ingredient_id: ingredient.id,
  }));

  const { error: junctionError } = await client
    .from('recipe_ingredients')
    .upsert(junctionRows, { onConflict: 'recipe_id,ingredient_id' });

  if (junctionError) throw new Error(`recipe_ingredients insert failed: ${junctionError.message}`);

  return {
    recipe_id: recipe.id,
    title: recipe.title,
    ingredients_count: ingredientRows.length,
  };
}
