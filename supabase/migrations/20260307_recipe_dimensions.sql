-- Migration: 20260307_recipe_dimensions
-- Purpose: Add multi-dimensional AI extraction fields to recipes table.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
--
-- New nullable columns added to recipes:
--   cuisine          TEXT     — fixed enum (server-enforced), Hebrew cuisine type
--   meal_type        TEXT     — free-form Hebrew (e.g. ארוחת בוקר, חטיף)
--   main_ingredient  TEXT     — primary ingredient in Hebrew
--   equipment_needed JSONB    — array of Hebrew equipment strings
--   prep_time        INTEGER  — prep time in minutes (null if not determinable)
--   cook_time        INTEGER  — cook time in minutes (null if not determinable)
--   dietary_tags     JSONB    — array of Hebrew dietary tag strings (fixed enum)
--
-- Note: instructions column (TEXT) already exists (added in 20260306_workspaces.sql).
-- No backfill: existing rows retain NULL for new fields.

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS main_ingredient TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS equipment_needed JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_tags JSONB;

-- No backfill: existing rows retain NULL for new fields
