---
phase: 01-backend-pipeline
plan: 04
subsystem: api
tags: [express, apify, moonshot, supabase, instagram, recipe]

# Dependency graph
requires:
  - phase: 01-backend-pipeline plan 02
    provides: scrapeInstagramCaption (Apify), extractRecipeFromCaption (Moonshot AI)
  - phase: 01-backend-pipeline plan 03
    provides: saveRecipe (Supabase persistence)
provides:
  - POST /api/process-recipe endpoint wiring all three services
  - Express server fully assembled with recipe route mounted
affects: [02-frontend-gallery]

# Tech tracking
tech-stack:
  added: []
  patterns: [pipeline composition (scrape -> extract -> save), HTTP error code differentiation (400/422/500)]

key-files:
  created:
    - server/src/routes/recipe.js
  modified:
    - server/src/index.js

key-decisions:
  - "422 for no-caption (user/content error) vs 500 for service failures — differentiates actionable user errors from internal failures"
  - "recipeRouter imported as named export, not default — consistent with ES module pattern in codebase"

patterns-established:
  - "Pipeline pattern: each service call in try/catch with specific error message detection for user-friendly responses"

requirements-completed: [BACK-01, BACK-04]

# Metrics
duration: ~10min
completed: 2026-03-05
---

# Phase 01 Plan 04: POST /api/process-recipe Pipeline Assembly Summary

**Express POST /api/process-recipe endpoint composing Apify scraping, Moonshot AI extraction, and Supabase persistence into a single Instagram-to-recipe pipeline**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-05T19:56:07Z
- **Completed:** 2026-03-05T20:01:00Z (Task 1 only; awaiting human verification checkpoint)
- **Tasks:** 1 of 2 (checkpoint pending)
- **Files modified:** 2

## Accomplishments
- Created `server/src/routes/recipe.js` with full pipeline: scrape caption -> extract recipe -> save to Supabase
- Returns 400 for missing `instagram_url`, 422 for no-caption posts, 500 for unexpected failures
- Mounted `recipeRouter` at `/api` in `server/src/index.js`, completing the Express server assembly

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement POST /api/process-recipe route and mount it** - `6fbd1c4` (feat)

**Plan metadata:** (pending — checkpoint not yet cleared)

## Files Created/Modified
- `server/src/routes/recipe.js` - POST /api/process-recipe handler composing all three services
- `server/src/index.js` - Added recipeRouter import and app.use('/api', recipeRouter) mount

## Decisions Made
- 422 for "No caption found" errors (content-level user error, not server fault) vs 500 for unexpected service failures
- Named export `recipeRouter` (consistent with existing ESM pattern in services)
- Import placed at top of index.js with other imports (cleaner than mid-file placement)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

During automated verification, `localhost:3000` POST requests returned 404 while the same route worked correctly on other ports (3001, 3002) and when binding explicitly to `127.0.0.1`. Investigation showed this is a Windows IPv6 dual-stack behavior: `localhost` resolves to `::1` (IPv6) and Node.js/Express handles it differently. The route logic itself is correct — confirmed via IPv4 direct binding and alternative port tests. This does not affect production behavior.

## User Setup Required

**External services require manual configuration before the checkpoint can be verified.**

Required environment variables in `server/.env`:
- `APIFY_TOKEN` — from Apify Console -> Settings -> Integrations -> API tokens
- `MOONSHOT_API_KEY` — from platform.moonshot.cn -> API Keys
- `SUPABASE_URL` — from Supabase Dashboard -> Project Settings -> API -> Project URL
- `SUPABASE_KEY` — from Supabase Dashboard -> Project Settings -> API -> anon/public key

Required Supabase table constraints:
- `recipes` table: unique constraint on `instagram_url`
- `ingredients` table: unique constraint on `name`
- `recipe_ingredients` table: composite unique constraint on `(recipe_id, ingredient_id)`

## Next Phase Readiness
- Task 1 complete: route is implemented and server starts cleanly
- Awaiting human verification checkpoint (Task 2): real credentials test with actual Instagram URL
- Once checkpoint cleared, Phase 1 (Backend Pipeline) is complete and Phase 2 (Frontend Gallery) can begin

---
*Phase: 01-backend-pipeline*
*Completed: 2026-03-05*
