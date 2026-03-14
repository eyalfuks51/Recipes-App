---
phase: 11-ingredient-measurements
plan: 03
subsystem: backend-persistence
tags: [supabase, ingredients, measurements, junction-table]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [structured-ingredient-persistence]
  affects: [recipe_ingredients table rows]
tech_stack:
  added: []
  patterns: [name-map alignment, dual-shape normalization, delete-then-insert]
key_files:
  modified:
    - server/src/services/supabase.js
    - server/src/__tests__/supabase.test.js
decisions:
  - nameToRow map used instead of positional index to align ingredient IDs with amounts
  - Legacy string[] input preserved via typeof check, producing amount:null, unit:null
  - .select('id, name') required in both catalog upserts to enable name-map construction
metrics:
  duration: ~10 minutes
  completed: 2026-03-14
---

# Phase 11 Plan 03: Backend Persistence for Ingredient Measurements Summary

Refactored `saveRecipe` and `updateRecipe` in `server/src/services/supabase.js` to accept structured `{name, amount, unit}` ingredient objects and persist `amount` and `unit` into `recipe_ingredients` junction rows.

## Changes Made

### saveRecipe (lines 94-128)

**Lines changed: 94-128 (Step 2 + Step 3 blocks)**

- Replaced the old `[...new Set(ingredients.map(name => name.toLowerCase().trim()))].map(name => ({ name }))` normalization with a dual-shape parser that handles both `string[]` (legacy) and `{name, amount, unit}[]` (new AI output shape).
- Added Set-based deduplication that preserves the first occurrence's `amount` and `unit` values.
- Changed `.select('id')` to `.select('id, name')` on the catalog upsert so the name-to-id map can be built.
- Replaced positional `ingredientRows.map((ingredient) => ({ recipe_id, ingredient_id: ingredient.id }))` with `nameToRow` map lookup: `ingredient_id: nameToRow[ing.name]`.
- Junction rows now include `amount: ing.amount ?? null` and `unit: ing.unit ?? null`.

### updateRecipe (lines 195-236)

**Lines changed: 195-236 (ingredients block inside `if (Array.isArray(ingredients)...)`)**

- Same A/B/C changes applied as in `saveRecipe`.
- Uses `.insert()` (not `.upsert()`) for junction rows — correct per Phase 07 architectural decision (delete-then-insert pattern; no conflict key exists post-deletion).

### JSDoc update (line 53)

- `@param {string[]} recipeData.ingredients` updated to `@param {Array<string|{name:string,amount?:string|null,unit?:string|null}>}`.

### Test updates (supabase.test.js)

- Updated `ingredientRows` mock data in 4 tests to include `name` field alongside `id` — required so the `nameToRow` map produces valid `ingredient_id` values.

## Name-Map Alignment Confirmation

No positional index is used anywhere in the ingredient pipeline. Both `saveRecipe` and `updateRecipe` use:

```javascript
const nameToRow = Object.fromEntries(ingredientRows.map(r => [r.name, r.id]));
// ...
ingredient_id: nameToRow[ing.name],
```

This is safe against Supabase returning `ingredientRows` in arbitrary order.

## Test Results

All 21 server tests pass:

- `apify.test.js`: 5 tests pass
- `moonshot.test.js`: 4 tests pass
- `supabase.test.js`: 12 tests pass (saveRecipe x5, deleteRecipe x3, updateRecipe x4)

No failures, no skipped tests.

## DB Migration Status

Plan 11-01 added the `amount` and `unit` columns to the `recipe_ingredients` table. That migration must be applied to the Supabase database before these backend changes are live. If the migration has NOT been applied, runtime inserts will fail because the columns do not exist.

Per the STATE.md at the start of this plan, Plan 11-01 (DB migration) is marked complete — the `amount` and `unit` columns should exist in the database. These backend changes are safe to deploy.

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Updated test mocks to include `name` field in `ingredientRows`**
- **Found during:** Task 1 execution
- **Issue:** Existing test mocks returned `ingredientRows` with only `id` (e.g., `{ id: 'ing-1' }`). After switching to `nameToRow[ing.name]`, all `ingredient_id` values would be `undefined`, breaking test correctness.
- **Fix:** Added `name` field to `ingredientRows` in 4 test cases to match the ingredient strings passed in as input.
- **Files modified:** `server/src/__tests__/supabase.test.js`
- **Commit:** f8cba8f

## Self-Check: PASSED

- `server/src/services/supabase.js` — found and correct
- `server/src/__tests__/supabase.test.js` — found and correct
- Commit f8cba8f — found in git log
- No bare `.select('id')` in ingredient upsert paths (only in `deleteRecipe` at line 151 — unrelated)
- `nameToRow` present in both `saveRecipe` (line 115) and `updateRecipe` (line 223)
- `amount` and `unit` present in junction rows of both functions
