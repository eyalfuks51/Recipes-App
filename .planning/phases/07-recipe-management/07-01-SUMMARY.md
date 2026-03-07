---
phase: 07-recipe-management
plan: "01"
subsystem: backend-api
tags: [supabase, express, recipe-management, delete, update]
dependency_graph:
  requires: []
  provides: [deleteRecipe, updateRecipe, "DELETE /api/recipes/:id", "PUT /api/recipes/:id"]
  affects: [server/src/services/supabase.js, server/src/routes/recipe.js]
tech_stack:
  added: []
  patterns: [lazy-client mock pattern, TDD with node:test, try/catch 404/500 error handling]
key_files:
  created: []
  modified:
    - server/src/services/supabase.js
    - server/src/routes/recipe.js
    - server/src/__tests__/supabase.test.js
decisions:
  - "Used insert (not upsert) for junction rows in updateRecipe after delete, since there's no conflict key after deletion"
  - "updateRecipe only processes ingredients when array is non-empty, matching saveRecipe convention"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-07"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 7 Plan 01: Backend Recipe Delete and Update Endpoints Summary

**One-liner:** DELETE and PUT /api/recipes/:id endpoints backed by deleteRecipe and updateRecipe Supabase service functions with full TDD coverage.

## What Was Built

Two new Supabase service functions and two new Express route handlers enabling recipe deletion and editing from the backend.

### deleteRecipe(id)

- Calls `client.from('recipes').delete().eq('id', id).select('id')`
- Throws `Recipe delete failed: <message>` on Supabase error
- Throws `Recipe not found` when returned data array is empty
- Returns `{ deleted: true }` on success

### updateRecipe(id, fields)

- Builds sparse update object (only provided fields included)
- Calls `client.from('recipes').update(recipeData).eq('id', id).select('id, title, workspace_id')`
- Throws `Recipe update failed: <message>` on Supabase error
- Throws `Recipe not found` when returned data array is empty
- When `ingredients` array provided: upserts ingredients table, deletes old junction rows, inserts fresh junction rows
- Returns `{ recipe_id, title, workspace_id }`

### DELETE /api/recipes/:id

- Calls `deleteRecipe(id)`, returns `200 { success: true }`
- Returns `404 { success: false, error: 'Recipe not found' }` on not-found
- Returns `500` on other errors

### PUT /api/recipes/:id

- Validates `title` required, returns `400` if missing
- Calls `updateRecipe(id, fields)`, returns `200 { success: true, recipe_id, title }`
- Returns `404` on not-found, `500` on other errors

## Test Results

All 12 supabase.test.js tests pass:
- 5 existing saveRecipe tests (no regressions)
- 3 new deleteRecipe tests (success, not-found, error propagation)
- 4 new updateRecipe tests (success without ingredients, not-found, error propagation, with ingredients)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | 5e650e6 | test(07-01): add failing tests for deleteRecipe and updateRecipe |
| Task 1 GREEN | 0632a35 | feat(07-01): implement deleteRecipe and updateRecipe in supabase.js |
| Task 2 | af45db5 | feat(07-01): add DELETE /api/recipes/:id and PUT /api/recipes/:id routes |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `server/src/services/supabase.js` modified — exports deleteRecipe and updateRecipe
- [x] `server/src/routes/recipe.js` modified — registers DELETE and PUT handlers
- [x] `server/src/__tests__/supabase.test.js` modified — 7 new tests added
- [x] All 12 tests pass
- [x] Commits 5e650e6, 0632a35, af45db5 exist

## Self-Check: PASSED
