-- Migration: 20260306_workspaces
-- Purpose: Add workspace (multi-tenancy) support to the recipes schema.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
--
-- Tables added:
--   workspaces              — tenant/ecosystem unit
--   workspace_users         — many-to-many: auth.users <-> workspaces
--   workspace_ingredient_checks — stateful per-workspace ingredient checkboxes
--
-- Columns added:
--   recipes.workspace_id    — nullable FK to workspaces (backward-compatible)
--   recipes.instructions    — free-text cooking instructions (for full recipe view)

-- Workspaces (ecosystems)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace membership (many-to-many: auth.users <-> workspaces)
CREATE TABLE IF NOT EXISTS workspace_users (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- references auth.users(id)
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Add workspace_id to recipes (nullable for backward compatibility)
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Index for efficient workspace recipe queries
CREATE INDEX IF NOT EXISTS idx_recipes_workspace_id ON recipes(workspace_id);

-- Add instructions column for Phase 4 Full Recipe View
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Ingredient checked state per workspace (for stateful checkboxes)
CREATE TABLE IF NOT EXISTS workspace_ingredient_checks (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, recipe_id, ingredient_id)
);
