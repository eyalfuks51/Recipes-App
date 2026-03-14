-- Migration: 20260314_ingredient_measurements
-- Purpose: Add amount and unit columns to recipe_ingredients junction table.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
-- This script is idempotent (IF NOT EXISTS guards).
--
-- Columns added:
--   recipe_ingredients.amount  TEXT  — quantity as-is from recipe
--                                      ("2", "קורט", "חצי", "לפי הטעם")
--   recipe_ingredients.unit    TEXT  — unit of measure
--                                      ("כוסות", "גרם", "כפות"; null if unitless)
--
-- Note: Both columns are nullable — existing rows have no measurement data
--       (NULL is the correct default for legacy rows).
--
-- Note: amount and unit belong on recipe_ingredients (the junction table),
--       NOT on the ingredients catalog table. An ingredient ("בצל") has
--       different amounts in different recipes.

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS amount TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;
