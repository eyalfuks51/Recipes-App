import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// We mock the Supabase client using a global hook approach, consistent with
// the pattern established in moonshot.test.js for ES module mocking without
// jest/vitest infrastructure.

// The supabase.js module checks global.__mockSupabaseClient to use a mock
// client during tests.

/**
 * Creates a mock Supabase chain builder that records method calls and
 * resolves with the given response at the terminal call.
 *
 * Supports: .from(table).upsert(data, opts).select(cols) -> resolves response
 *           .from(table).upsert(data, opts) -> resolves response (no select)
 */
function makeChain(response) {
  const chain = {
    upsert: mock.fn(() => chain),
    insert: mock.fn(() => chain),
    select: mock.fn(() => Promise.resolve(response)),
    // If .upsert is called without .select, we need it to resolve too.
    // We handle this by making upsert return the chain, and if .select
    // is not called, the chain itself acts as a Promise.
    then: undefined, // Will be set dynamically if needed
  };
  // Allow the chain to be awaited directly (in case .select is not called)
  chain.upsert = mock.fn(() => {
    const innerChain = {
      select: mock.fn(() => Promise.resolve(response)),
      then: (resolve, reject) => Promise.resolve(response).then(resolve, reject),
    };
    return innerChain;
  });
  chain.insert = mock.fn(() => Promise.resolve(response));
  chain.select = mock.fn(() => Promise.resolve(response));
  return chain;
}

describe('saveRecipe', () => {
  it('returns { recipe_id, title, ingredients_count } on successful save', async () => {
    const recipeRow = { id: 'uuid-recipe-1', title: 'פסטה בולונז' };
    const ingredientRows = [{ id: 'uuid-ing-1', name: 'ספגטי' }, { id: 'uuid-ing-2', name: 'בשר טחון' }];

    let fromCallCount = 0;
    const mockClient = {
      from: mock.fn((table) => {
        fromCallCount++;
        if (table === 'recipes') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
            })),
          };
        }
        if (table === 'ingredients') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: ingredientRows, error: null })),
            })),
          };
        }
        if (table === 'recipe_ingredients') {
          return {
            upsert: mock.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    const result = await mod.saveRecipe({
      instagram_url: 'https://instagram.com/p/abc123',
      title: 'פסטה בולונז',
      main_category: 'פסטה',
      difficulty: 'בינוני',
      ingredients: ['ספגטי', 'בשר טחון'],
    });

    assert.equal(result.recipe_id, 'uuid-recipe-1');
    assert.equal(result.title, 'פסטה בולונז');
    assert.equal(result.ingredients_count, 2);
  });

  it('normalizes ingredient names to lowercase+trimmed before upsert', async () => {
    let capturedIngredients = null;
    const recipeRow = { id: 'uuid-recipe-2', title: 'test' };

    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
            })),
          };
        }
        if (table === 'ingredients') {
          return {
            upsert: mock.fn((data) => {
              capturedIngredients = data;
              return {
                select: mock.fn(() => Promise.resolve({ data: [{ id: 'ing-1', name: 'olive oil' }, { id: 'ing-2', name: 'garlic' }, { id: 'ing-3', name: 'tomatoes' }], error: null })),
              };
            }),
          };
        }
        if (table === 'recipe_ingredients') {
          return {
            upsert: mock.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await mod.saveRecipe({
      instagram_url: 'https://instagram.com/p/xyz',
      title: 'test',
      main_category: 'test',
      difficulty: 'קל',
      ingredients: ['  Olive Oil  ', 'GARLIC', 'Tomatoes'],
    });

    assert.ok(capturedIngredients, 'Ingredients should have been captured');
    assert.equal(capturedIngredients[0].name, 'olive oil');
    assert.equal(capturedIngredients[1].name, 'garlic');
    assert.equal(capturedIngredients[2].name, 'tomatoes');
  });

  it('throws an error when recipe upsert fails', async () => {
    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() =>
                Promise.resolve({ data: null, error: { message: 'DB connection error' } })
              ),
            })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () =>
        mod.saveRecipe({
          instagram_url: 'https://instagram.com/p/fail',
          title: 'fail',
          main_category: 'fail',
          difficulty: 'קל',
          ingredients: ['test'],
        }),
      /Recipe upsert failed: DB connection error/
    );
  });

  it('throws an error when ingredients upsert fails', async () => {
    const recipeRow = { id: 'uuid-recipe-3', title: 'test' };

    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
            })),
          };
        }
        if (table === 'ingredients') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() =>
                Promise.resolve({ data: null, error: { message: 'Ingredients table error' } })
              ),
            })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () =>
        mod.saveRecipe({
          instagram_url: 'https://instagram.com/p/fail2',
          title: 'fail',
          main_category: 'fail',
          difficulty: 'קל',
          ingredients: ['test'],
        }),
      /Ingredients upsert failed: Ingredients table error/
    );
  });

  it('throws an error when recipe_ingredients upsert fails', async () => {
    const recipeRow = { id: 'uuid-recipe-4', title: 'test' };
    const ingredientRows = [{ id: 'ing-1', name: 'test' }];

    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
            })),
          };
        }
        if (table === 'ingredients') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: ingredientRows, error: null })),
            })),
          };
        }
        if (table === 'recipe_ingredients') {
          return {
            upsert: mock.fn(() => Promise.resolve({ data: null, error: { message: 'Junction insert error' } })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () =>
        mod.saveRecipe({
          instagram_url: 'https://instagram.com/p/fail3',
          title: 'fail',
          main_category: 'fail',
          difficulty: 'קל',
          ingredients: ['test'],
        }),
      /recipe_ingredients insert failed: Junction insert error/
    );
  });
});

describe('deleteRecipe', () => {
  function makeDeleteMock({ checksError, junctionError, recipeResult }) {
    return {
      from: mock.fn((table) => {
        if (table === 'workspace_ingredient_checks') {
          return {
            delete: mock.fn(() => ({
              eq: mock.fn(() => Promise.resolve({ error: checksError ?? null })),
            })),
          };
        }
        if (table === 'recipe_ingredients') {
          return {
            delete: mock.fn(() => ({
              eq: mock.fn(() => Promise.resolve({ error: junctionError ?? null })),
            })),
          };
        }
        if (table === 'recipes') {
          return {
            delete: mock.fn(() => ({
              eq: mock.fn(() => ({
                select: mock.fn(() => Promise.resolve(recipeResult)),
              })),
            })),
          };
        }
      }),
    };
  }

  it('returns { deleted: true } when recipe exists', async () => {
    const mockClient = makeDeleteMock({
      recipeResult: { data: [{ id: 'uuid-1' }], error: null },
    });

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    const result = await mod.deleteRecipe('uuid-1');

    assert.deepEqual(result, { deleted: true });
  });

  it('returns { deleted: false } when recipe does not exist', async () => {
    const mockClient = makeDeleteMock({
      recipeResult: { data: [], error: null },
    });

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    const result = await mod.deleteRecipe('nonexistent-id');

    assert.deepEqual(result, { deleted: false });
  });

  it('throws when Supabase returns an error', async () => {
    const mockClient = makeDeleteMock({
      recipeResult: { data: null, error: { message: 'DB error' } },
    });

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () => mod.deleteRecipe('uuid-1'),
      /Recipe delete failed: DB error/
    );
  });
});

describe('updateRecipe', () => {
  it('returns { recipe_id, title, workspace_id } on successful update without ingredients', async () => {
    const recipeRow = { id: 'uuid-recipe-1', title: 'Updated Title', workspace_id: 'ws-1' };

    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            update: mock.fn(() => ({
              eq: mock.fn(() => ({
                select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
              })),
            })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    const result = await mod.updateRecipe('uuid-recipe-1', { title: 'Updated Title', workspace_id: 'ws-1' });

    assert.equal(result.recipe_id, 'uuid-recipe-1');
    assert.equal(result.title, 'Updated Title');
    assert.equal(result.workspace_id, 'ws-1');
  });

  it('throws "Recipe not found" when Supabase returns empty data array', async () => {
    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            update: mock.fn(() => ({
              eq: mock.fn(() => ({
                select: mock.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () => mod.updateRecipe('nonexistent-id', { title: 'Test' }),
      /Recipe not found/
    );
  });

  it('throws when Supabase returns an error on update', async () => {
    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            update: mock.fn(() => ({
              eq: mock.fn(() => ({
                select: mock.fn(() => Promise.resolve({ data: null, error: { message: 'Update failed' } })),
              })),
            })),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    await assert.rejects(
      () => mod.updateRecipe('uuid-1', { title: 'Test' }),
      /Recipe update failed: Update failed/
    );
  });

  it('updates ingredients when ingredients array is provided', async () => {
    const recipeRow = { id: 'uuid-recipe-2', title: 'With Ingredients', workspace_id: null };
    const ingredientRows = [{ id: 'ing-1', name: 'tomato' }, { id: 'ing-2', name: 'garlic' }];

    let deleteCalled = false;
    let insertCalled = false;

    const mockClient = {
      from: mock.fn((table) => {
        if (table === 'recipes') {
          return {
            update: mock.fn(() => ({
              eq: mock.fn(() => ({
                select: mock.fn(() => Promise.resolve({ data: [recipeRow], error: null })),
              })),
            })),
          };
        }
        if (table === 'ingredients') {
          return {
            upsert: mock.fn(() => ({
              select: mock.fn(() => Promise.resolve({ data: ingredientRows, error: null })),
            })),
          };
        }
        if (table === 'recipe_ingredients') {
          return {
            delete: mock.fn(() => ({
              eq: mock.fn(() => {
                deleteCalled = true;
                return Promise.resolve({ data: [], error: null });
              }),
            })),
            insert: mock.fn(() => {
              insertCalled = true;
              return Promise.resolve({ data: [], error: null });
            }),
          };
        }
      }),
    };

    global.__mockSupabaseClient = mockClient;

    const mod = await import('../services/supabase.js?t=' + Date.now());
    const result = await mod.updateRecipe('uuid-recipe-2', {
      title: 'With Ingredients',
      ingredients: ['tomato', 'garlic'],
    });

    assert.equal(result.recipe_id, 'uuid-recipe-2');
    assert.ok(deleteCalled, 'Should have deleted old junction rows');
    assert.ok(insertCalled, 'Should have inserted new junction rows');
  });
});
