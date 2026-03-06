-- Migration: 20260306_orphan_migration
-- Purpose: Migrate existing user and orphaned recipes into a default workspace.
--
-- BEFORE RUNNING:
--   1. Replace 'YOUR-USER-UUID-HERE' with your actual Supabase auth user UUID.
--      Find it in: Supabase Dashboard → Authentication → Users → copy your user's UUID.
--   2. Run AFTER 20260306_workspaces.sql (workspaces table must exist).
--   3. Run BEFORE 20260306_rls_policies.sql (so recipes get workspace_id before RLS locks them out).
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run

DO $$
DECLARE
  v_user_id    UUID := 'YOUR-USER-UUID-HERE';  -- REPLACE THIS with your UUID
  v_ws_id      UUID;
  v_invite     TEXT;
BEGIN
  -- Add invite_code column to workspaces if not present
  ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT;

  -- Generate a 6-char alphanumeric invite code
  v_invite := upper(substring(md5(random()::text) from 1 for 6));

  -- Create the default workspace
  INSERT INTO workspaces (name, invite_code)
  VALUES ('My Recipes', v_invite)
  RETURNING id INTO v_ws_id;

  -- Add the user as owner of the new workspace
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (v_ws_id, v_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Reassign all orphaned recipes (NULL workspace_id) to the new workspace
  UPDATE recipes
  SET workspace_id = v_ws_id
  WHERE workspace_id IS NULL;

  RAISE NOTICE 'Migration complete.';
  RAISE NOTICE '  Workspace ID:   %', v_ws_id;
  RAISE NOTICE '  Invite code:    %', v_invite;
  RAISE NOTICE '  Recipes updated: %', (SELECT count(*) FROM recipes WHERE workspace_id = v_ws_id);
END;
$$;
