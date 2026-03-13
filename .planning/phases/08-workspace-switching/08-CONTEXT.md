# Phase 8: Workspace Switching - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow users to join a new workspace via invite code and leave a workspace they're currently in — from within the running app (not just onboarding). If the user is the sole member of a workspace they leave, the workspace and all its contents are permanently deleted. No CSS/styling work — functional wiring only.

</domain>

<decisions>
## Implementation Decisions

### Join flow entry point
- Add a "Join Workspace" option inside the existing `WorkspaceSwitcher` dropdown in the header
- Clicking it opens a modal that reuses the join-via-code logic from `WorkspaceOnboarding.jsx`
- The modal uses the same 6-char invite code input and Supabase upsert pattern already in `WorkspaceOnboarding`

### Leave + delete flow
- Add a "Leave Workspace" option inside the `WorkspaceSwitcher` dropdown (per-workspace, or for the active workspace)
- Always show a confirmation modal before leaving — no silent action
- If the user is the sole member: the confirmation warning must explicitly state that **the workspace and all its recipes will be permanently deleted**
- If not the sole member: standard "leave workspace" confirmation without deletion warning
- Sole-member check happens before showing the modal (Supabase query: count members in `workspace_users` for the workspace)

### WorkspaceProvider refresh
- Add a `refreshWorkspaces()` mutation method to `WorkspaceProvider` (and expose via `useWorkspace()`)
- After a successful join or leave, call `refreshWorkspaces()` to re-fetch the workspaces list from Supabase — no full page reload
- `WorkspaceProvider` currently fetches on `user` change; the refresh method triggers the same fetch imperatively

### Post-leave state
- After leaving, auto-switch the active workspace to the first available workspace in the refreshed list
- If the user has 0 workspaces remaining after leaving, `refreshWorkspaces()` updates the list to `[]`, and the existing `WorkspaceGate` (which shows `WorkspaceOnboarding` when `workspaces.length === 0`) handles routing automatically — no extra logic needed

### Claude's Discretion
- Whether "Join Workspace" and "Leave Workspace" appear as separate dropdown items or combined in a settings sub-section
- Exact modal component structure (inline in App.jsx vs new component file)
- Workspace deletion implementation: cascade delete via Supabase FK constraints or explicit delete of related rows first
- Order of operations for leave: remove from `workspace_users` first, then check if workspace is empty, then delete workspace if applicable

</decisions>

<specifics>
## Specific Ideas

- The join modal reuses the existing `WorkspaceOnboarding` join logic — avoid duplicating the Supabase query and validation; extract or reuse directly
- The sole-member deletion warning must be explicit: "This workspace and all its recipes will be permanently deleted" — not just a generic "are you sure"
- No page reload after join or leave — smooth in-app state update via `refreshWorkspaces()`
- `WorkspaceGate` already handles the 0-workspaces case — rely on it, don't add new routing logic

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WorkspaceOnboarding.jsx` — contains complete join-via-code logic: input validation, Supabase lookup by `invite_code`, upsert into `workspace_users`. Reuse or extract this logic for the join modal.
- `WorkspaceSwitcher` (in `App.jsx`) — the dropdown component where both "Join Workspace" and "Leave Workspace" actions will be added. Already has `open`/`setOpen` state, click-outside handler, and workspace list rendering.
- `WorkspaceGate` (in `App.jsx`) — already renders `WorkspaceOnboarding` when `workspaces.length === 0`. Post-leave routing is free.

### Established Patterns
- `WorkspaceProvider` (`lib/workspace.jsx`) — currently fetches workspaces in a `useEffect([user])`. A `refreshWorkspaces` method should trigger the same fetch logic imperatively and update `workspaces` + `activeWorkspaceId` state.
- `setActiveWorkspace(id)` already exists in `WorkspaceProvider` and persists to `localStorage`
- All workspace Supabase operations are done client-side (no backend routes for workspace management)
- Confirmation/loading/error pattern: `loading` + `error` state in component, same as `WorkspaceOnboarding`

### Integration Points
- `WorkspaceProvider` — add `refreshWorkspaces()` to context value and expose via `useWorkspace()`
- `WorkspaceSwitcher` (App.jsx) — add "Join" and "Leave" action buttons to dropdown; add modal state
- `workspace_users` table — used for leave (delete row) and sole-member check (count rows)
- `workspaces` table — delete workspace row when sole member leaves

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-workspace-switching*
*Context gathered: 2026-03-13*
