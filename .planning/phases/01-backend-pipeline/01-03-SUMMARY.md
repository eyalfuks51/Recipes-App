---
phase: 01-backend-pipeline
plan: 03
subsystem: database
tags: [supabase, supabase-js, upsert, persistence, node, es-modules]

# Dependency graph
requires:
  - phase: 01-backend-pipeline/01-01
    provides: Express server foundation with @supabase/supabase-js installed and SUPABASE_URL/SUPABASE_KEY env vars documented
provides:
  - saveRecipe function at server/src/services/supabase.js that upserts recipe, normalizes and upserts ingredients, inserts recipe_ingredients junction rows
  - supabase Proxy client exported from server/src/services/supabase.js (lazy init, usable as normal client)
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy Proxy client — supabase export defers createClient() to first property access so module imports without env vars set"
    - "global.__mockSupabaseClient test hook — ES module mock injection without jest/vitest, consistent with moonshot.js pattern"
    - "Three-step write: recipe upsert → ingredients upsert (normalized) → recipe_ingredients junction upsert"

key-files:
  created:
    - server/src/services/supabase.js
    - server/src/__tests__/supabase.test.js
  modified: []

key-decisions:
  - "Proxy-based lazy Supabase client — defers createClient() to call time so module can be imported in tests without env vars (consistent with moonshot.js lazy-init pattern)"
  - "Junction rows use upsert with onConflict: 'recipe_id,ingredient_id' — prevents duplicates if same recipe is submitted twice"

patterns-established:
  - "global.__mockSupabaseClient test hook — enables per-test mock client injection, each test uses fresh ?t= cache-bust import"
  - "Proxy export for Supabase client — transparent lazy init, callers use supabase.from() normally"

requirements-completed: [BACK-07, BACK-08, BACK-09]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 1 Plan 03: Supabase Persistence Layer Summary

**Three-step Supabase write path: recipe upsert by instagram_url, ingredient normalization (lowercase+trimmed) upsert by name, and recipe_ingredients junction upsert via @supabase/supabase-js with a Proxy-based lazy client**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-05T19:51:37Z
- **Completed:** 2026-03-05T19:54:11Z
- **Tasks:** 1 (TDD: 2 commits — test + feat)
- **Files modified:** 2

## Accomplishments

- saveRecipe function at server/src/services/supabase.js implementing the full three-step write path
- Ingredient name normalization (name.toLowerCase().trim()) applied before every upsert
- All Supabase errors propagate as thrown Errors (not swallowed)
- 5 passing tests covering happy path, normalization, and all three error paths

## Task Commits

Each task was committed atomically (TDD pattern: RED then GREEN):

1. **Task 1 RED: Failing tests for saveRecipe** - `48db49a` (test)
2. **Task 1 GREEN: saveRecipe implementation** - `257d191` (feat)

## Files Created/Modified

- `server/src/services/supabase.js` - Supabase client (Proxy lazy init) and saveRecipe function
- `server/src/__tests__/supabase.test.js` - 5 tests covering happy path, normalization, and error propagation

## Decisions Made

- Used Proxy-based lazy client rather than eager createClient() at module load time — allows the module to be imported in tests without SUPABASE_URL set, consistent with how moonshot.js defers OpenAI client construction
- Junction rows use upsert (not insert) with composite onConflict to prevent duplicate junction rows on repeated submissions of the same recipe

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Deferred Supabase client construction from module load to call time**
- **Found during:** Task 1 (verify step — plan's verify script)
- **Issue:** The plan's verify script imported supabase.js and the module-level `createClient()` call threw immediately because SUPABASE_URL is undefined without a .env file loaded
- **Fix:** Wrapped createClient() in a `getRealClient()` lazy singleton function; exported `supabase` as a Proxy that calls `getClient()` on first property access — same pattern moonshot.js uses for deferred OpenAI client init
- **Files modified:** server/src/services/supabase.js
- **Verification:** Plan's verify script prints PASS; all 5 tests pass
- **Committed in:** 257d191 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug — eager vs deferred init)
**Impact on plan:** Required for correctness — module must be importable without env vars for tests and verification scripts. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None for this plan. Plan 04 requires SUPABASE_URL and SUPABASE_KEY to be set in server/.env before running the integrated endpoint.

## Next Phase Readiness

- saveRecipe is fully implemented and tested — Plan 04 can import and call it directly
- The supabase export is available if Plan 04 needs raw Supabase client access
- Supabase table schema (recipes, ingredients, recipe_ingredients) must be created by user in Supabase dashboard before Plan 04 endpoint testing

---
*Phase: 01-backend-pipeline*
*Completed: 2026-03-05*
