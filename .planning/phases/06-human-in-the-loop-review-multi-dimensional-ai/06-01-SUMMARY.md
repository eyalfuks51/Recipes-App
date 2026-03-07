---
phase: 06-human-in-the-loop-review-multi-dimensional-ai
plan: "01"
subsystem: ai-extraction
tags: [moonshot, ai, schema, recipe-fields, normalization, supabase]
dependency_graph:
  requires: []
  provides: [expanded-ai-schema, new-recipe-fields-passthrough]
  affects: [server/src/services/moonshot.js, server/src/routes/recipe.js, server/src/services/supabase.js]
tech_stack:
  added: []
  patterns: [optional-spread-normalization, post-parse-normalization, allowed-list-constants]
key_files:
  created: []
  modified:
    - server/src/services/moonshot.js
    - server/src/routes/recipe.js
    - server/src/services/supabase.js
decisions:
  - ALLOWED_CUISINES and ALLOWED_DIETARY_TAGS exported from moonshot.js as single source of truth for new enum fields
  - cuisine unknown values normalize to 'אחר'; dietary_tags strips unrecognized values (consistent with existing ALLOWED_CATEGORIES pattern)
  - Optional-spread pattern extended to 7 new fields in saveRecipe() for backward-compatible DB upserts
metrics:
  duration: "~2 minutes"
  completed: "2026-03-07"
---

# Phase 06 Plan 01: Multi-Dimensional AI Schema Expansion Summary

Multi-dimensional recipe extraction schema with ALLOWED_CUISINES/ALLOWED_DIETARY_TAGS normalization, wired end-to-end from AI extraction through HTTP routes to Supabase persistence.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Expand moonshot.js AI schema, prompt, and normalization | 3bc8a27 | server/src/services/moonshot.js |
| 2 | Pass new fields through server routes and saveRecipe() | 1277638 | server/src/routes/recipe.js, server/src/services/supabase.js |

## What Was Built

### Task 1: moonshot.js expansion

Added `ALLOWED_CUISINES` (12 values: איטלקי, אסייתי, מקסיקני, אמריקאי, ים-תיכוני, ישראלי, מרוקאי, עיראקי, תוניסאי, צרפתי, פיוז'ן, אחר) and `ALLOWED_DIETARY_TAGS` (4 values: עתיר חלבון, דל פחמימה, מושחת, קליל) as exported constants.

Expanded `HEBREW_SYSTEM_PROMPT` to request a full 12-field JSON object from the AI: the original 4 fields plus 8 new ones (meal_type, cuisine, main_ingredient, equipment_needed, prep_time, cook_time, dietary_tags, instructions). Prompt opens with explicit Hebrew-only instruction.

Added post-parse normalization after the existing `main_category` normalization:
- `cuisine` not in ALLOWED_CUISINES → falls back to 'אחר'
- `dietary_tags` filters to only recognized values (strips unknowns)
- `instructions` and `equipment_needed` default to `[]` if missing or non-array

### Task 2: Route and persistence passthrough

`/api/extract-recipe` response now includes all 8 new fields with null-coalescing defaults.

`/api/confirm-recipe` destructures all 8 new fields from `req.body` and passes them to `saveRecipe()`.

`saveRecipe()` signature extended to accept the 7 new fields (meal_type, cuisine, main_ingredient, equipment_needed, prep_time, cook_time, dietary_tags) and includes them in `recipeData` via the existing optional-spread pattern.

## Decisions Made

- **ALLOWED_CUISINES and ALLOWED_DIETARY_TAGS as exported constants** — same pattern as ALLOWED_CATEGORIES; provides single source of truth for both AI prompt generation and server-side normalization.
- **Post-parse normalization for new fields** — defense-in-depth: even if AI ignores prompt constraints, server normalizes to known values before returning to client.
- **Optional-spread for new saveRecipe() fields** — maintains backward compatibility; existing recipes without these fields are unaffected on upsert.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- server/src/services/moonshot.js: FOUND and modified (ALLOWED_CUISINES 12 values, ALLOWED_DIETARY_TAGS 4 values)
- server/src/routes/recipe.js: FOUND and modified (meal_type, cuisine, dietary_tags present)
- server/src/services/supabase.js: FOUND and modified (meal_type, cuisine, dietary_tags present)
- Commit 3bc8a27: FOUND (Task 1)
- Commit 1277638: FOUND (Task 2)
