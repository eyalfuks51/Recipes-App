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
 * @param {string} [recipeData.workspace_id] - Optional workspace UUID for multi-tenant scoping
 * @param {string[]} [recipeData.instructions] - Optional cooking instructions steps array
 * @param {string} [recipeData.meal_type] - Optional meal type ('ארוחת בוקר' or 'ארוחת צהריים/ערב')
 * @param {string} [recipeData.cuisine] - Optional cuisine type (one of ALLOWED_CUISINES)
 * @param {string} [recipeData.main_ingredient] - Optional primary ingredient
 * @param {number} [recipeData.prep_time] - Optional prep time in minutes
 * @param {string[]} [recipeData.dietary_tags] - Optional dietary tags (subset of ALLOWED_DIETARY_TAGS)
 * @returns {Promise<{recipe_id: string, title: string, ingredients_count: number, workspace_id: string|null}>}
 */
export async function saveRecipe({ instagram_url, title, main_category, difficulty, ingredients, workspace_id, instructions, meal_type, cuisine, main_ingredient, prep_time, dietary_tags, thumbnail_url }) {
  const client = getClient();

  // Step 1: Upsert recipe row (deduplicates by instagram_url)
  const recipeData = {
    instagram_url,
    title,
    main_category,
    difficulty,
    ...(workspace_id ? { workspace_id } : {}),
    ...(instructions ? { instructions } : {}),
    ...(meal_type != null ? { meal_type } : {}),
    ...(cuisine != null ? { cuisine } : {}),
    ...(main_ingredient != null ? { main_ingredient } : {}),
    ...(prep_time != null ? { prep_time } : {}),
    ...(Array.isArray(dietary_tags) && dietary_tags.length ? { dietary_tags } : {}),
    ...(thumbnail_url != null && { thumbnail_url }),
  };

  const { data: recipeRows, error: recipeError } = await client
    .from('recipes')
    .upsert(
      recipeData,
      { onConflict: 'instagram_url' }
    )
    .select('id, title, workspace_id');

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
    workspace_id: recipe.workspace_id ?? null,
  };
}

/**
 * Deletes a recipe from Supabase by ID.
 *
 * @param {string} id - The recipe UUID to delete
 * @returns {Promise<{ deleted: true }>}
 */
export async function deleteRecipe(id) {
  const client = getClient();

  const { data, error } = await client
    .from('recipes')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(`Recipe delete failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Recipe not found');

  return { deleted: true };
}

/**
 * Updates an existing recipe and optionally replaces its ingredients.
 *
 * @param {string} id - The recipe UUID to update
 * @param {object} fields - Fields to update
 * @returns {Promise<{ recipe_id: string, title: string, workspace_id: string|null }>}
 */
export async function updateRecipe(id, { title, main_category, difficulty, ingredients, workspace_id, instructions, meal_type, cuisine, main_ingredient, prep_time, dietary_tags, thumbnail_url }) {
  const client = getClient();

  const recipeData = {
    ...(title != null ? { title } : {}),
    ...(main_category != null ? { main_category } : {}),
    ...(difficulty != null ? { difficulty } : {}),
    ...(workspace_id != null ? { workspace_id } : {}),
    ...(instructions != null ? { instructions } : {}),
    ...(meal_type != null ? { meal_type } : {}),
    ...(cuisine != null ? { cuisine } : {}),
    ...(main_ingredient != null ? { main_ingredient } : {}),
    ...(prep_time != null ? { prep_time } : {}),
    ...(Array.isArray(dietary_tags) && dietary_tags.length ? { dietary_tags } : {}),
    ...(thumbnail_url != null ? { thumbnail_url } : {}),
  };

  const { data, error } = await client
    .from('recipes')
    .update(recipeData)
    .eq('id', id)
    .select('id, title, workspace_id');

  if (error) throw new Error(`Recipe update failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Recipe not found');

  const recipe = data[0];

  if (Array.isArray(ingredients) && ingredients.length > 0) {
    // Upsert ingredients (normalize name: lowercase + trim)
    const normalizedIngredients = ingredients.map((name) => ({
      name: name.toLowerCase().trim(),
    }));

    const { data: ingredientRows, error: ingredientsError } = await client
      .from('ingredients')
      .upsert(normalizedIngredients, { onConflict: 'name' })
      .select('id');

    if (ingredientsError) throw new Error(`Ingredients upsert failed: ${ingredientsError.message}`);

    // Delete existing junction rows for this recipe
    const { error: deleteError } = await client
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id);

    if (deleteError) throw new Error(`recipe_ingredients delete failed: ${deleteError.message}`);

    // Insert fresh junction rows
    const junctionRows = ingredientRows.map((ingredient) => ({
      recipe_id: recipe.id,
      ingredient_id: ingredient.id,
    }));

    const { error: junctionError } = await client
      .from('recipe_ingredients')
      .insert(junctionRows);

    if (junctionError) throw new Error(`recipe_ingredients insert failed: ${junctionError.message}`);
  }

  return {
    recipe_id: recipe.id,
    title: recipe.title,
    workspace_id: recipe.workspace_id ?? null,
  };
}
