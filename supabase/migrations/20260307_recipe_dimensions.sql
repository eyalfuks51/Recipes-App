-- Migration: 20260307_recipe_dimensions
-- Purpose: Add multi-dimensional AI extraction fields to recipes table.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
-- This script is idempotent (IF NOT EXISTS / IF EXISTS guards).
--
-- Columns added:
--   cuisine          TEXT     — fixed enum (server-enforced), Hebrew cuisine type
--   meal_type        TEXT     — strict enum: 'ארוחת בוקר' | 'ארוחת צהריים/ערב'
--   main_ingredient  TEXT     — primary ingredient in Hebrew
--   prep_time        INTEGER  — prep time in minutes (null if not determinable)
--   dietary_tags     JSONB    — array of Hebrew dietary tag strings (fixed enum)
--
-- Columns NOT included (removed from schema):
--   cook_time        — removed; use prep_time only
--   equipment_needed — removed; unnecessary complexity
--
-- Note: instructions column (TEXT) already exists (added in 20260306_workspaces.sql).

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS main_ingredient TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_tags JSONB;

-- Drop removed columns if they were previously added
ALTER TABLE recipes DROP COLUMN IF EXISTS cook_time;
ALTER TABLE recipes DROP COLUMN IF EXISTS equipment_needed;
