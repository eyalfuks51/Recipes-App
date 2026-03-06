---
phase: 04-multi-tenant-saas-and-ecosystems
plan: "04-02"
subsystem: database
tags: [supabase, postgresql, multi-tenant, workspaces, schema-migration]

# Dependency graph
requires:
  - phase: 01-backend-pipeline
    provides: recipes/ingredients/recipe_ingredients tables, saveRecipe service, supabase lazy client pattern
provides:
  - workspaces table (id, name, created_at)
  - workspace_users junction table (workspace_id, user_id, role)
  - workspace_ingredient_checks table (per-workspace ingredient checked state)
  - recipes.workspace_id nullable FK column
  - recipes.instructions nullable text column
  - saveRecipe accepts and persists workspace_id
  - POST /api/process-recipe accepts workspace_id in body and returns it in response
affects: [04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional spread pattern for nullable FK: ...(workspace_id ? { workspace_id } : {}) avoids writing null to DB"
    - "Manual Supabase migrations via SQL Editor (no CLI) — migrations stored in supabase/migrations/"

key-files:
  created:
    - supabase/migrations/20260306_workspaces.sql
    - supabase/README.md
  modified:
    - server/src/services/supabase.js
    - server/src/routes/recipe.js

key-decisions:
  - "workspace_id stored as nullable FK — backward-compatible, existing recipes unaffected"
  - "instructions and workspace_ingredient_checks added in same migration to avoid second schema change in Wave 2"
  - "Optional spread pattern for workspace_id avoids persisting null (only set FK when provided)"

patterns-established:
  - "Optional FK spread: ...(workspace_id ? { workspace_id } : {}) — use for all optional FK fields"
  - "select() includes new FK fields after upsert to return them in result"

requirements-completed: [SAAS-02]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 4 Plan 02: Workspace DB Schema and Server Recipe Scoping Summary

**Supabase workspace schema (workspaces, workspace_users, workspace_ingredient_checks tables) with recipes.workspace_id nullable FK, plus server pipeline updated to accept and persist workspace_id**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-06T07:38:07Z
- **Completed:** 2026-03-06T07:43:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `supabase/migrations/20260306_workspaces.sql` with all workspace schema changes in a single idempotent migration
- Added `workspaces`, `workspace_users`, and `workspace_ingredient_checks` tables
- Added nullable `workspace_id` FK and `instructions` column to `recipes` table (backward-compatible)
- Updated `saveRecipe` to accept optional `workspace_id`, spread it into upsert only when provided, and return it in result
- Updated POST `/api/process-recipe` to extract `workspace_id` from request body and include it in success response

## Task Commits

Each task was committed atomically:

1. **Task 1: Define Supabase schema migration SQL** - `ef9b078` (feat)
2. **Task 2: Update server saveRecipe and route for workspace_id** - `54eba81` (feat)

## Files Created/Modified
- `supabase/migrations/20260306_workspaces.sql` - Full workspace schema migration (3 new tables, 2 new columns, 1 index)
- `supabase/README.md` - Instructions for applying migrations via Supabase Dashboard SQL Editor
- `server/src/services/supabase.js` - saveRecipe updated to accept workspace_id, spread pattern for optional FK, returns workspace_id in result
- `server/src/routes/recipe.js` - Extracts workspace_id from req.body, passes to saveRecipe, includes in response JSON

## Decisions Made
- Used optional spread `...(workspace_id ? { workspace_id } : {})` rather than passing null — avoids overwriting an existing workspace_id on recipe re-submission with no workspace context
- Added `instructions` column and `workspace_ingredient_checks` table in the same migration as workspaces to avoid a second Supabase schema change when Wave 2 plans run
- `recipes.workspace_id` nullable (not required) — backward-compatible, existing recipes and tests unaffected

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Database migration must be applied manually.** To apply:

1. Open Supabase Dashboard for your project
2. Navigate to SQL Editor
3. Paste contents of `supabase/migrations/20260306_workspaces.sql`
4. Click Run

See `supabase/README.md` for full instructions.

## Next Phase Readiness
- Workspace schema is defined and ready for Google Auth integration (plan 04-01) to populate workspace membership
- Server pipeline is workspace-aware; any client sending `workspace_id` in the POST body will have recipes scoped accordingly
- `workspace_ingredient_checks` table is pre-created for plan 04-05 (Full Recipe View)

---
*Phase: 04-multi-tenant-saas-and-ecosystems*
*Completed: 2026-03-06*
