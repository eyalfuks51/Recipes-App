---
phase: 04-multi-tenant-saas-and-ecosystems
plan: "04-04"
subsystem: ui
tags: [react, vite, express, supabase, hebrew, forms]

# Dependency graph
requires:
  - phase: 04-multi-tenant-saas-and-ecosystems
    provides: extract-recipe and confirm-recipe endpoints, RecipeEditForm component

provides:
  - POST /api/extract-recipe endpoint (scrape + AI extract, no DB write)
  - POST /api/confirm-recipe endpoint (validates and saves user-edited recipe to Supabase)
  - RecipeEditForm component with Hebrew category dropdown, difficulty select, ingredients textarea
  - Two-step submit flow in SubmitForm: extract preview -> user edit -> confirmed save

affects:
  - Any future UI work consuming SubmitForm
  - Any client that calls the recipe pipeline endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-step extract-then-confirm API pattern for AI-assisted data entry with user correction
    - ALLOWED_CATEGORIES duplicated client-side as JS const (browser cannot import server module)
    - Ingredients stored as textarea (one per line), parsed back to array on submit

key-files:
  created:
    - client/src/components/RecipeEditForm.jsx
    - client/src/components/RecipeEditForm.scss
  modified:
    - server/src/routes/recipe.js
    - client/src/components/SubmitForm.jsx

key-decisions:
  - "Two-step flow: /api/extract-recipe returns AI preview without saving; /api/confirm-recipe saves user-edited data — separates AI extraction from persistence"
  - "ALLOWED_CATEGORIES duplicated in RecipeEditForm.jsx as client-side constant — server module not importable from browser; comment notes to keep in sync with moonshot.js"
  - "Ingredients textarea (one per line) is simplest editable UX — parsed back to array on confirm submit by splitting on newlines and filtering empty strings"
  - "SubmitForm button label changed from 'Save Recipe' to 'Extract Recipe' to reflect that the URL submit step no longer saves"

patterns-established:
  - "Extract-preview-confirm: AI extraction step returns JSON preview, user edits in form, separate confirm call persists"
  - "Status machine extended: idle | loading | preview | success | error — preview state shows edit form inline"

requirements-completed: [SAAS-03]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 04 Plan 04: Pre-save Edit UI with Confirm-Save Endpoint Summary

**Two-step recipe pipeline: /api/extract-recipe previews AI extraction, RecipeEditForm lets users correct it, /api/confirm-recipe persists the edited result to Supabase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T16:03:07Z
- **Completed:** 2026-03-06T16:05:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added POST /api/extract-recipe (scrape + AI extract only, no DB write) and POST /api/confirm-recipe (validates and saves user-edited recipe) to recipe router — existing /api/process-recipe unchanged
- Created RecipeEditForm component with editable fields (title, Hebrew category dropdown with 14 options, difficulty select, ingredients textarea) that posts to /api/confirm-recipe
- Updated SubmitForm to call /api/extract-recipe on URL submit, show RecipeEditForm in 'preview' state, and defer gallery refresh until user confirms save

## Task Commits

1. **Task 1: Add /api/extract-recipe and /api/confirm-recipe server endpoints** - `35acd69` (feat)
2. **Task 2: Create RecipeEditForm and update SubmitForm for two-step flow** - `71cb208` (feat)

## Files Created/Modified

- `server/src/routes/recipe.js` - Added two new route handlers (extract-recipe, confirm-recipe); process-recipe unchanged
- `client/src/components/RecipeEditForm.jsx` - New editable form component for AI-extracted recipe preview
- `client/src/components/RecipeEditForm.scss` - Styles for edit form card
- `client/src/components/SubmitForm.jsx` - Updated to two-step flow with preview state and RecipeEditForm integration

## Decisions Made

- Two-step flow chosen: extract endpoint returns AI preview without saving; confirm endpoint saves user-edited data. This separates AI extraction from persistence and allows error correction.
- ALLOWED_CATEGORIES duplicated in RecipeEditForm.jsx as a client-side constant with a comment to keep in sync with server/src/services/moonshot.js — browser cannot import server modules.
- Ingredients textarea (one per line) is the simplest editable UX; parsed back to string array by splitting on newlines and filtering empty strings on submit.
- SubmitForm button label changed from "Save Recipe" to "Extract Recipe" to better communicate that the first step does not yet persist anything.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Two-step recipe pipeline complete and client builds cleanly
- RecipeEditForm ready for styling polish or additional field validation if needed
- /api/process-recipe preserved for any backward-compatible clients

---
*Phase: 04-multi-tenant-saas-and-ecosystems*
*Completed: 2026-03-06*
