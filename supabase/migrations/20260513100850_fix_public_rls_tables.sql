-- Migration: fix_public_rls_tables
-- Purpose: Enable RLS on public tables flagged by Supabase Security Advisor:
--   public.ingredients, public.workspaces, public.workspace_users.
--
-- The app now uses SECURITY DEFINER RPCs for workspace create/join/leave flows,
-- so browser clients do not need direct writes to workspaces or workspace_users.

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT;

DO $$
DECLARE
  v_workspace_id UUID;
  v_invite_code TEXT;
BEGIN
  FOR v_workspace_id IN
    SELECT id
    FROM (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY invite_code
          ORDER BY created_at NULLS LAST, id
        ) AS rn
      FROM public.workspaces
      WHERE invite_code IS NOT NULL
    ) duplicates
    WHERE rn > 1
  LOOP
    LOOP
      v_invite_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE invite_code = v_invite_code
      );
    END LOOP;

    UPDATE public.workspaces
    SET invite_code = v_invite_code
    WHERE id = v_workspace_id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_invite_code_unique_idx
  ON public.workspaces (invite_code)
  WHERE invite_code IS NOT NULL;

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- Helper used by policies. SECURITY DEFINER avoids recursive RLS checks on
-- workspace_users while still evaluating membership for auth.uid().
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users wu
    WHERE wu.workspace_id = p_workspace_id
      AND wu.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "ingredients_select_authenticated" ON public.ingredients;
CREATE POLICY "ingredients_select_authenticated"
  ON public.ingredients FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "workspaces_select_workspace_member" ON public.workspaces;
CREATE POLICY "workspaces_select_workspace_member"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(id));

DROP POLICY IF EXISTS "workspace_users_select_workspace_member" ON public.workspace_users;
CREATE POLICY "workspace_users_select_workspace_member"
  ON public.workspace_users FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE OR REPLACE FUNCTION public.create_workspace(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := trim(p_name);
  v_invite_code TEXT;
  v_workspace public.workspaces%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 50 THEN
    RAISE EXCEPTION 'Workspace name must be between 2 and 50 characters.';
  END IF;

  LOOP
    v_invite_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.workspaces WHERE invite_code = v_invite_code
    );
  END LOOP;

  INSERT INTO public.workspaces (name, invite_code)
  VALUES (v_name, v_invite_code)
  RETURNING * INTO v_workspace;

  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (v_workspace.id, v_user_id, 'owner');

  RETURN jsonb_build_object(
    'id', v_workspace.id,
    'name', v_workspace.name,
    'invite_code', v_workspace.invite_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_workspace_by_invite(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite_code TEXT := upper(trim(p_invite_code));
  v_workspace public.workspaces%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_workspace
  FROM public.workspaces
  WHERE invite_code = v_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No workspace found with that code.';
  END IF;

  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (v_workspace.id, v_user_id, 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_workspace.id,
    'name', v_workspace.name,
    'invite_code', v_workspace.invite_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_workspace_by_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_workspace_by_invite(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_member_count(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Not a workspace member.';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_count
  FROM public.workspace_users
  WHERE workspace_id = p_workspace_id;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_member_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_member_count(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_workspace(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_member_count INTEGER;
  v_deleted_workspace BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Not a workspace member.';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_member_count
  FROM public.workspace_users
  WHERE workspace_id = p_workspace_id;

  DELETE FROM public.workspace_users
  WHERE workspace_id = p_workspace_id
    AND user_id = v_user_id;

  IF v_member_count <= 1 THEN
    DELETE FROM public.workspaces
    WHERE id = p_workspace_id;
    v_deleted_workspace := true;
  END IF;

  RETURN jsonb_build_object('deleted_workspace', v_deleted_workspace);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_workspace(UUID) TO authenticated;
