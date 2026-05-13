# Supabase Migrations

This project uses the Supabase CLI for linked-project maintenance. Older
migrations were applied manually via the Supabase Dashboard SQL Editor.

## How to apply a migration

1. Link the project if needed:
   `npx supabase link --project-ref ltsyqnxkyzfcmejcjtsb`
2. Apply a targeted migration file:
   `npx supabase db query --linked -f supabase/migrations/<migration>.sql`
3. Verify security advisories:
   `npx supabase db advisors --linked --type security --level warn`

If CLI auth is unavailable, apply the migration manually in the Supabase
Dashboard SQL Editor and then run the advisor check with the CLI.

## Migration history

| File | Date | Description |
|------|------|-------------|
| `20260306_workspaces.sql` | 2026-03-06 | Add workspaces, workspace_users, workspace_ingredient_checks tables; add recipes.workspace_id and recipes.instructions columns |
| `20260513100850_fix_public_rls_tables.sql` | 2026-05-13 | Enable RLS on workspaces, workspace_users, and ingredients; add workspace RPC helpers |
| `20260513101806_move_workspace_rpcs_private.sql` | 2026-05-13 | Move privileged workspace RPC logic to private schema and expose invoker wrappers |

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so they are safe to re-run.
- `recipes.workspace_id` is nullable — existing recipes without a workspace continue to work unchanged.
- `recipes.instructions` is nullable — added for the Phase 4 Full Recipe View feature.
