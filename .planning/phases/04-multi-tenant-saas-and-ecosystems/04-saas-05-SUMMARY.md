---
phase: 04-multi-tenant-saas-and-ecosystems
plan: "04-05"
subsystem: ui
tags: [react, supabase, checkbox, instructions, modal, ingredient-checks]

# Dependency graph
requires:
  - phase: 04-multi-tenant-saas-and-ecosystems
    plan: 04-01
    provides: useAuth() hook and AuthProvider
  - phase: 04-multi-tenant-saas-and-ecosystems
    plan: 04-02
    provides: workspace_ingredient_checks table with composite PK (workspace_id, recipe_id, ingredient_id)
  - phase: 04-multi-tenant-saas-and-ecosystems
    plan: 04-04
    provides: RecipeEditForm component and /api/confirm-recipe endpoint
provides:
  - Interactive ingredient checkboxes in RecipeModal with Supabase-backed persistence
  - Instructions text display in RecipeModal (when recipe has instructions stored)
  - Instructions textarea in RecipeEditForm pre-save edit flow
  - /api/confirm-recipe now accepts and saves instructions field
  - RecipeGallery fetches instructions and workspace_id columns from recipes table
  - Ingredient fetch returns {id, name}[] instead of string[] for checkbox keying
affects:
  - Any future plan modifying RecipeModal or RecipeEditForm
  - Any plan adding more fields to the confirm-recipe endpoint

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic UI update on checkbox toggle followed by Supabase upsert
    - workspaceKey fallback pattern: recipe.workspace_id ?? user.id (personal-mode compatibility)
    - Conditional optional spread for saving optional fields (instructions, workspace_id)

key-files:
  created: []
  modified:
    - client/src/components/RecipeModal.jsx
    - client/src/components/RecipeModal.scss
    - client/src/components/RecipeEditForm.jsx
    - client/src/components/RecipeGallery.jsx
    - server/src/routes/recipe.js
    - server/src/services/supabase.js

key-decisions:
  - "workspaceKey fallback: recipe.workspace_id ?? user.id — personal recipes (no workspace) use user.id as workspace key for checkbox state"
  - "Optimistic UI update on checkbox toggle — checkedIds updated immediately, upsert fires async"
  - "ingredient_id used as checkbox key — fetched via recipe_ingredients join, stored in {id, name}[] shape"

patterns-established:
  - "Optimistic update pattern: set local state first, then persist to Supabase"
  - "workspaceKey fallback: workspace_id ?? user?.id for personal-mode compatibility"

requirements-completed: [SAAS-05]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 4 Plan 05: Full Recipe View — Instructions and Stateful Ingredient Checkboxes Summary

**Supabase-backed ingredient checkboxes per workspace with optimistic UI, plus instructions textarea in edit form and instructions display in modal**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T16:04:50Z
- **Completed:** 2026-03-06T16:08:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Ingredient list in RecipeModal now renders checkbox inputs instead of static bullets; checked state loads from workspace_ingredient_checks on modal open and persists on toggle via upsert
- Instructions textarea added to RecipeEditForm; instructions field passed through confirm-recipe endpoint to Supabase upsert via optional spread pattern
- Instructions section renders conditionally in RecipeModal when recipe.instructions is non-empty, with dir="auto" for RTL support
- RecipeGallery recipe fetch now includes instructions and workspace_id columns; ingredient fetch returns {id, name}[] objects with ingredient_id for checkbox keying

## Task Commits

Each task was committed atomically:

1. **Task 1: Add instructions to edit form, server endpoint, and gallery fetch** - `78544cc` (feat)
2. **Task 2: Add instructions display and stateful checkboxes to RecipeModal** - `bc5c93e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `client/src/components/RecipeModal.jsx` - Added useAuth, supabase import, checkedIds state, checkbox rendering, instructions section
- `client/src/components/RecipeModal.scss` - Added ingredient-label, ingredient-checkbox, ingredient-item--checked, modal-instructions styles
- `client/src/components/RecipeEditForm.jsx` - Added instructions textarea state field and POST body inclusion
- `client/src/components/RecipeGallery.jsx` - Extended recipe select to include instructions+workspace_id; ingredient fetch returns {id, name}[]
- `server/src/routes/recipe.js` - confirm-recipe destructures and passes instructions to saveRecipe
- `server/src/services/supabase.js` - saveRecipe accepts instructions param, included in upsert via optional spread

## Decisions Made

- **workspaceKey fallback:** `recipe.workspace_id ?? user?.id` — recipes without a workspace use the auth user's ID as the workspace key so personal-mode users still get checkbox persistence without a dedicated workspace entity.
- **Optimistic UI:** checkedIds updated immediately on toggle, Supabase upsert fires asynchronously — avoids visible lag on checkbox interaction.
- **Ingredient shape change:** RecipeGallery now returns `{id, name}[]` to RecipeModal; the modal was updated accordingly. The `id` is the actual `ingredient_id` UUID from recipe_ingredients, which matches the workspace_ingredient_checks PK.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The workspace_ingredient_checks table was created in plan 04-02.

## Next Phase Readiness

- Modal is now a full interactive cooking assistant with ingredient tracking and instructions display
- The instructions column already exists in the recipes table (added in migration 04-02)
- No blockers for next phase

## Self-Check: PASSED

All files confirmed present. All task commits confirmed in git log.

---
*Phase: 04-multi-tenant-saas-and-ecosystems*
*Completed: 2026-03-06*
