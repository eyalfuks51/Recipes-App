# Phase 5: Ecosystem Onboarding and Strict Data Isolation - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the multi-tenant foundation started in Phase 4. This phase delivers:
1. An explicit workspace onboarding UI (create or join via code) shown to users who aren't yet in a workspace
2. A workspace switcher dropdown in the navigation header (multi-workspace support, selection persisted in localStorage)
3. Supabase RLS policies enforcing strict data isolation at the database level
4. Client-side query filtering to scope all data to the active workspace
5. A SQL migration script to migrate the existing user and orphaned recipes to a default workspace

Creating, editing, or deleting recipes is handled by prior phases. New workspace management features (admin panel, member removal, rename) belong in a future phase.

</domain>

<decisions>
## Implementation Decisions

### Workspace creation flow
- Show an explicit Onboarding UI — do NOT silently auto-create a workspace
- Two paths: "Create New Workspace" (user enters a name) or "Join via Code" (user enters a 6-char alphanumeric invite code)
- Onboarding screen appears after login when the user belongs to no workspace
- After completing onboarding, navigate directly to the recipe gallery (no intermediate confirmation screen)

### Invite codes
- 6-character alphanumeric code (e.g., `A3XK92`) stored as a column in the `workspaces` table
- Generated when a workspace is created
- Anyone with the code can join the workspace
- Code is displayed to the workspace owner somewhere accessible (e.g., workspace settings or header dropdown)

### Workspace switcher
- Simple dropdown in the navigation header showing the active workspace name
- Lists all workspaces the user belongs to
- Switching workspace updates the active workspace ID used by all data queries
- Active workspace persisted in `localStorage` — survives page refresh and new sessions
- Falls back to first available workspace if stored ID is no longer valid

### Data isolation strategy
- **Both** client-side filtering AND Supabase RLS policies — RLS is mandatory
- Rationale: Vite app uses the Supabase anon key (publicly visible in browser); without RLS any user could query any workspace's data directly
- RLS policies required on: `recipes`, `recipe_ingredients`, `workspace_ingredient_checks`
- Client-side: all Supabase queries in the frontend filter by the active `workspace_id`
- Server-side: `/api/confirm-recipe` already accepts `workspace_id`; ensure it is always populated from the authenticated user's active workspace

### Orphaned data migration
- Provide a SQL migration script (new file in `supabase/migrations/`) that:
  1. Creates a default workspace named "My Recipes" for the existing registered user
  2. Inserts that user into `workspace_users` with `role = 'owner'`
  3. Updates all recipes where `workspace_id IS NULL` to point to the new workspace
  4. Sets an invite code on the new workspace
- Script is parameterized with the existing user's UUID (developer fills in their own UUID before running)

### Claude's Discretion
- Exact styling of the onboarding screen (should be consistent with AuthGate card aesthetic)
- RLS policy syntax details and exact policy names
- How the invite code is displayed to the workspace owner (e.g., tooltip, settings section in dropdown)
- Workspace switcher dropdown animation/open behavior

</decisions>

<specifics>
## Specific Ideas

- Onboarding screen should feel like an extension of the existing `AuthGate` card — same visual language, not a jarring new UI
- The workspace switcher is a simple dropdown, not a full settings page — keep it minimal
- RLS is the hard requirement; client-side filtering is UX, RLS is security

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthGate.jsx` / `AuthGate.scss` — visual card pattern and Google Sign-In button style; onboarding screen should reuse this aesthetic
- `useAuth()` hook (`client/src/lib/auth.jsx`) — provides `user` object with `user.id` for all workspace membership checks
- `supabase` client (`client/src/lib/supabase.js`) — already configured for frontend queries; RLS will apply automatically once policies are set
- `workspace_users` table — already exists; join queries can get a user's workspaces by `user_id`

### Established Patterns
- `AuthProvider` wraps the whole app; a new `WorkspaceProvider` should follow the same pattern and wrap below `AuthProvider`
- `localStorage` already used implicitly via Supabase session; workspace ID can follow the same approach
- `RecipeGallery` uses `supabase.from('recipes').select(...)` — needs a `.eq('workspace_id', activeWorkspaceId)` filter added
- Server `saveRecipe()` accepts optional `workspace_id`; Phase 5 should make it required when a user is authenticated

### Integration Points
- `App.jsx` — needs `WorkspaceProvider` added; onboarding screen inserted between `AuthGate` and the main app
- `RecipeGallery.jsx` — all recipe queries must be scoped to active workspace
- `RecipeModal.jsx` — `workspace_ingredient_checks` queries already use `workspace_id`; verify they use the active workspace from context
- `server/src/routes/recipe.js` — `/api/confirm-recipe` should receive `workspace_id` from the authenticated session, not trust client-supplied value (security hardening)

</code_context>

<deferred>
## Deferred Ideas

- Workspace admin panel (rename workspace, remove members, regenerate invite code) — future phase
- Per-workspace recipe categories or custom category lists — future phase
- Workspace activity feed or member list UI — future phase

</deferred>

---

*Phase: 05-ecosystem-onboarding-and-strict-data-isolation*
*Context gathered: 2026-03-06*
