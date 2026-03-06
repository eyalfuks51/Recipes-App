---
phase: 05-ecosystem-onboarding-and-strict-data-isolation
plan: "04"
status: complete
---

# 05-04 Summary: Orphaned Data Migration and Server Validation

## What Was Built

- `supabase/migrations/20260306_orphan_migration.sql` — Parameterized DO $$ block to create default workspace, add invite_code column, migrate NULL recipes
- `server/src/routes/recipe.js` — /api/confirm-recipe returns 400 when workspace_id is absent

## Key Decisions

- Migration uses DO $$ block with v_user_id variable — developer replaces 'YOUR-USER-UUID-HERE' once before running
- invite_code column added via ADD COLUMN IF NOT EXISTS inside this migration (not a separate file)
- Run order: workspaces.sql → orphan_migration.sql → rls_policies.sql
- Server validation placed after ingredients check, before saveRecipe() call

## Verification

- supabase/migrations/20260306_orphan_migration.sql contains UPDATE recipes SET workspace_id, placeholder UUID, ADD COLUMN IF NOT EXISTS invite_code
- grep finds "workspace_id is required" in server/src/routes/recipe.js
