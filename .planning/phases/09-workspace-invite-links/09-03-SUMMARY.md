---
phase: 09-workspace-invite-links
plan: 03
subsystem: ui
tags: [react, invite-flow, oauth, supabase, localStorage, react-router-dom]

# Dependency graph
requires:
  - 09-01
  - 09-02
provides:
  - InviteHandler.jsx with auth/unauth invite flows and confirmation modal
  - WorkspaceGate auto-join on login via pendingInviteCode localStorage key
  - AuthGate redirectTo uses window.location.href (full URL)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pendingInviteCode localStorage key for deferred post-login invite auto-join"
    - "OAuth redirectTo: window.location.href preserves /invite?code= for post-login return"
    - "WorkspaceGate useEffect on [user, loading] detects and processes pendingInviteCode"
    - "InviteHandler: unauthenticated flow triggers OAuth; authenticated flow shows modal"

key-files:
  created:
    - client/src/components/InviteHandler.jsx
  modified:
    - client/src/App.jsx
    - client/src/components/AuthGate.jsx

key-decisions:
  - "InviteHandler does NOT import useWorkspace — WorkspaceProvider is not in the /invite route tree; on success it navigates('/') and WorkspaceProvider re-fetches on mount"
  - "pendingInviteCode cleared before async Supabase call in WorkspaceGate — prevents double-join on re-render"
  - "useEffect dependency array [user, loading] intentionally omits refreshWorkspaces/setActiveWorkspace to avoid infinite re-renders (no linter in project)"

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 9 Plan 03: InviteHandler + Auto-Join Flow Summary

**Full invite URL flow implemented: InviteHandler handles authenticated modal-confirm-join and unauthenticated localStorage-save-then-OAuth; WorkspaceGate auto-joins on login; AuthGate OAuth redirectTo preserves full URL**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13T15:21:41Z
- **Completed:** 2026-03-13T15:32:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `InviteHandler.jsx` with full auth-aware logic:
  - Unauthenticated: saves code to `localStorage.pendingInviteCode`, calls `supabase.auth.signInWithOAuth` with `redirectTo: window.location.href` to return to invite URL after login
  - Authenticated + code: confirmation modal ("הוזמנת להצטרף לסביבת עבודה") with join/cancel buttons, Supabase workspace lookup + upsert, error display, navigates to `/` on success
  - Authenticated + no code: immediate `navigate('/')`
  - Auth loading: spinner
  - Inline styles only — no SCSS
- Updated `App.jsx`:
  - Added `import { InviteHandler } from './components/InviteHandler.jsx'`
  - Added `useNavigate` to react-router-dom imports
  - Added `import { supabase } from './lib/supabase.js'`
  - Removed inline stub `function InviteHandler()`
  - `WorkspaceGate` updated with `useEffect` on `[user, loading]` that reads `pendingInviteCode`, auto-joins workspace via Supabase upsert, calls `refreshWorkspaces()` + `setActiveWorkspace(ws.id)`, clears the key
- Updated `AuthGate.jsx`: `redirectTo` changed from `window.location.origin` to `window.location.href`

## Task Commits

1. **Task 1: Create InviteHandler.jsx** - `c55ce05` (feat)
2. **Task 2: Wire App.jsx + fix AuthGate** - `69f68cb` (feat)

## Files Created/Modified

- `client/src/components/InviteHandler.jsx` — New file: full invite handler with auth/unauth flows, 190 lines
- `client/src/App.jsx` — Real InviteHandler import, supabase import, useNavigate, WorkspaceGate auto-join useEffect
- `client/src/components/AuthGate.jsx` — redirectTo updated to window.location.href

## Decisions Made

- `InviteHandler` does not use `useWorkspace` — the `/invite` route tree only wraps `AuthProvider`, not `WorkspaceProvider`. After a successful join, navigating to `/` causes the `WorkspaceProvider` on the `/*` route to fetch workspaces fresh on mount, so the new workspace appears automatically.
- `pendingInviteCode` is removed from localStorage at the start of `autoJoin()` (before the async Supabase calls) to prevent a double-join if the component re-renders during the async operation.
- `useEffect` deps `[user, loading]` intentionally omit `refreshWorkspaces` and `setActiveWorkspace` to avoid infinite re-renders — the project has no linter so the warning is not surfaced.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Build passes cleanly (vite 1.63s, 0 errors, 101 modules).

## User Setup Required

None — feature ready for manual end-to-end testing with a live Supabase instance.

## Phase 9 Completion

Plan 09-03 is the final plan in Phase 9. The complete workspace invite link flow is now implemented:
- Plan 09-01: Routing foundation (BrowserRouter, /invite route outside AuthGate)
- Plan 09-02: WorkspaceSwitcher copy-link + WhatsApp share buttons
- Plan 09-03: InviteHandler component + post-login auto-join + AuthGate fix

---
*Phase: 09-workspace-invite-links*
*Completed: 2026-03-13*
