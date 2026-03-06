# Supabase Migrations

This project does not use the Supabase CLI. Migrations are applied manually via the Supabase Dashboard SQL Editor.

## How to apply a migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open the migration file from `supabase/migrations/` in your editor, copy the entire contents.
5. Paste into the SQL Editor query window.
6. Click **Run** (or press Ctrl+Enter).
7. Confirm there are no errors in the output panel.

## Migration history

| File | Date | Description |
|------|------|-------------|
| `20260306_workspaces.sql` | 2026-03-06 | Add workspaces, workspace_users, workspace_ingredient_checks tables; add recipes.workspace_id and recipes.instructions columns |

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so they are safe to re-run.
- `recipes.workspace_id` is nullable — existing recipes without a workspace continue to work unchanged.
- `recipes.instructions` is nullable — added for the Phase 4 Full Recipe View feature.
