---
phase: 11-ingredient-measurements
plan: "01"
subsystem: database
tags: [migration, schema, recipe_ingredients, supabase]
dependency_graph:
  requires: []
  provides: [recipe_ingredients.amount, recipe_ingredients.unit]
  affects: [11-02, 11-03, 11-04]
tech_stack:
  added: []
  patterns: [ADD COLUMN IF NOT EXISTS, idempotent migration]
key_files:
  created:
    - supabase/migrations/20260314_ingredient_measurements.sql
  modified: []
decisions:
  - "amount and unit belong on recipe_ingredients (junction table), NOT on ingredients catalog — amounts are per-recipe-use, not per-ingredient"
  - "Both columns are TEXT and nullable — Hebrew amounts include words (קורט, לפי הטעם) and NULL is correct for legacy rows with no measurement data"
  - "Used ADD COLUMN IF NOT EXISTS for idempotent migration matching project convention"
metrics:
  duration: "< 5 minutes"
  completed_date: "2026-03-14"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 11 Plan 01: Ingredient Measurements DB Migration Summary

One-liner: SQL migration adding nullable amount TEXT and unit TEXT columns to the recipe_ingredients junction table with idempotent IF NOT EXISTS guards.

## What Was Built

Created `supabase/migrations/20260314_ingredient_measurements.sql` — a single idempotent SQL migration that adds two columns to the `recipe_ingredients` junction table:

- `amount TEXT` (nullable) — stores the quantity as-is from the recipe source, including Hebrew quantity words ("קורט", "לפי הטעם", "חצי") and numerals ("2", "1.5")
- `unit TEXT` (nullable) — stores the unit of measure ("כוסות", "גרם", "כפות") or NULL when an ingredient has no unit (e.g., "3 ביצים" — amount: "3", unit: null)

## Migration File

**Path:** `supabase/migrations/20260314_ingredient_measurements.sql`

```sql
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS amount TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;
```

Full file with header comment matches the project's existing migration format established in `20260307_recipe_dimensions.sql`.

## Database Application Status

**The migration has NOT been applied to the Supabase database.**

The migration file was created and committed, but it must be run manually via the Supabase Dashboard.

**Action required before Plan 11-03 can function correctly:**

1. Open Supabase Dashboard
2. Navigate to: SQL Editor
3. Paste the contents of `supabase/migrations/20260314_ingredient_measurements.sql`
4. Click Run

Until this is done, the `amount` and `unit` columns do not exist in `recipe_ingredients`. Plan 11-03 (backend) will fail at runtime when attempting to insert those columns.

## Observations About `recipe_ingredients` Structure

Based on research (`11-RESEARCH.md`) and migration analysis:

**Current structure (before this migration):**
```sql
recipe_ingredients (
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, ingredient_id)
)
```

**After this migration:**
```sql
recipe_ingredients (
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  amount        TEXT,  -- NEW: nullable, quantity as spoken in recipe
  unit          TEXT,  -- NEW: nullable, unit of measure or null
  PRIMARY KEY (recipe_id, ingredient_id)
)
```

Key design note: `amount` and `unit` are correctly placed on `recipe_ingredients` (the junction table), not on the `ingredients` catalog table. An ingredient like "בצל" has different amounts in different recipes — that data is per-recipe-use, not a property of the ingredient itself.

## Deviations from Plan

None — plan executed exactly as written. The migration SQL is identical to the content specified in the plan.

## Self-Check

- [x] Migration file exists at `supabase/migrations/20260314_ingredient_measurements.sql`
- [x] Contains `ALTER TABLE recipe_ingredients`
- [x] Contains `ADD COLUMN IF NOT EXISTS amount TEXT`
- [x] Contains `ADD COLUMN IF NOT EXISTS unit TEXT`
- [x] Does NOT alter the `ingredients` catalog table
- [x] Committed as `69c9f32` on branch `tiktokadd`
