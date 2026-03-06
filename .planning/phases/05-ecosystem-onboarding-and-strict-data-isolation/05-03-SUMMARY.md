---
phase: 05-ecosystem-onboarding-and-strict-data-isolation
plan: "03"
status: complete
---

# 05-03 Summary: RLS Policies and Workspace-Scoped Queries

## What Was Built

- `supabase/migrations/20260306_rls_policies.sql` — RLS policies for recipes, recipe_ingredients, workspace_ingredient_checks
- `client/src/components/RecipeGallery.jsx` — recipes query filtered by activeWorkspaceId; refetches on workspace switch
- `client/src/components/RecipeModal.jsx` — ingredient checks use activeWorkspaceId from useWorkspace (not recipe.workspace_id fallback)
- `client/src/components/SubmitForm.jsx` — passes activeWorkspaceId to RecipeEditForm
- `client/src/components/RecipeEditForm.jsx` — accepts workspaceId prop; includes in /api/confirm-recipe POST body

## Key Decisions

- RLS uses workspace membership subquery on workspace_users table for all policies
- recipe_ingredients access controlled via join through recipes table (no direct workspace_id column)
- service_role key (used by server) bypasses RLS by default — no extra policies needed for server writes
- Gallery guards with `if (!activeWorkspaceId) { setRecipes([]); return; }` to prevent empty workspace query

## Verification

- `npm run build` passes
- 9 CREATE POLICY statements in migration file
- All three frontend components import useWorkspace and use activeWorkspaceId
