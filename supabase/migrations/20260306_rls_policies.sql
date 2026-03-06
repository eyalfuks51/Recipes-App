-- Migration: 20260306_rls_policies
-- Purpose: Enable Row Level Security on workspace-scoped tables.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
-- Run AFTER 20260306_workspaces.sql and 20260306_orphan_migration.sql
--
-- Security model:
--   Authenticated users can only access rows belonging to workspaces they are a member of.
--   The anon key is public — RLS is the security boundary, not the client.

-- ── recipes ────────────────────────────────────────────────────────────────────

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Read: user must be a member of the recipe's workspace
CREATE POLICY "recipes_select_workspace_member"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Insert: user can only insert into a workspace they belong to
CREATE POLICY "recipes_insert_workspace_member"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Update: same membership check
CREATE POLICY "recipes_update_workspace_member"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Delete: same membership check
CREATE POLICY "recipes_delete_workspace_member"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- ── recipe_ingredients ─────────────────────────────────────────────────────────
-- Access controlled via recipe's workspace (join to recipes table)

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_select_workspace_member"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "recipe_ingredients_insert_workspace_member"
  ON recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
      )
    )
  );

-- ── workspace_ingredient_checks ────────────────────────────────────────────────

ALTER TABLE workspace_ingredient_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wic_select_workspace_member"
  ON workspace_ingredient_checks FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wic_insert_workspace_member"
  ON workspace_ingredient_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wic_update_workspace_member"
  ON workspace_ingredient_checks FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- ── server role bypass ─────────────────────────────────────────────────────────
-- The Express server uses the service_role key (bypasses RLS by default in Supabase).
-- No additional policy needed for server writes — service_role already bypasses RLS.
-- If server uses anon key instead, add: TO authenticated, service_role in each policy.
