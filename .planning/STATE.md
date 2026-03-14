---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 11-02 — Ingredient prompt + shape normalization in moonshot.js
last_updated: "2026-03-14T00:00:00.000Z"
last_activity: 2026-03-14 — Completed Plan 11-02 (HEBREW_SYSTEM_PROMPT updated to request {name,amount,unit} objects; post-parse normalization added to extractRecipeFromCaption)
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 10
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 09-03 — InviteHandler + auto-join + AuthGate redirectTo fix
last_updated: "2026-03-13T15:23:52.868Z"
last_activity: 2026-03-13 — Completed Plan 01 (react-router-dom installed, /invite route added outside AuthGate)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 96
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 09-01 — BrowserRouter + /invite route routing foundation
last_updated: "2026-03-13T15:18:05.300Z"
last_activity: 2026-03-13 — Phase 9 pivoted to Workspace Invite Links; Phase 10 is Gallery Filters
progress:
  [██████████] 96%
  completed_phases: 2
  total_plans: 8
  completed_plans: 6
  percent: 93
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 08-02 — JoinWorkspaceModal, LeaveWorkspaceModal, WorkspaceSwitcher wired
last_updated: "2026-03-13T14:31:22.181Z"
last_activity: 2026-03-07 — Completed Plan 03 (Edit recipe UI — editMode on RecipeReviewScreen, Edit button in RecipeModal, gallery edit state)
progress:
  [█████████░] 93%
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 07-03 — Edit recipe UI (RecipeReviewScreen editMode + RecipeGallery edit flow)
last_updated: "2026-03-07T20:35:26.170Z"
last_activity: 2026-03-07 — Completed Plan 03 (Edit recipe UI — editMode on RecipeReviewScreen, Edit button in RecipeModal, gallery edit state)
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Any social-media recipe URL (Instagram, YouTube, TikTok) becomes a browsable, structured recipe card in one click.
**Current focus:** v1.1 — Functional Enhancements (Phases 7–10 complete; Phase 11 next: ingredient quantities)

## Current Position

Phase: 11-ingredient-measurements — IN PROGRESS
Current plan: 11-02 COMPLETE (DB migration done; prompt updated; normalization added)
Status: Plan 11-02 done — HEBREW_SYSTEM_PROMPT instructs AI to return {name,amount,unit} objects; extractRecipeFromCaption normalizes all ingredient items
Last activity: 2026-03-14 — Completed Plan 11-02 (ingredient prompt + shape normalization)

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table.

Key architectural decisions from v1.0:
- Two-step extract-then-confirm API pattern (separates AI from persistence)
- ALLOWED_* constants as single source of truth in moonshot.js
- Workspace/ecosystem model with Supabase RLS for data isolation
- RecipeReviewScreen split-screen as core human-in-the-loop UX

v1.1 decisions:
- updateRecipe uses insert (not upsert) for junction rows after delete, since no conflict key exists post-deletion
- updateRecipe skips ingredients processing when no ingredients array provided (sparse update)
- [Phase 07-recipe-management]: Delete fetch in RecipeModal; RecipeGallery responds via onDelete callback after success
- [Phase 07-recipe-management]: onDelete called before onClose to ensure gallery state updated before modal unmounts
- [Phase 07-recipe-management Plan 03]: Edit button uses deleting flag to disable — prevents conflicting actions in modal
- [Phase 07-recipe-management Plan 03]: handleEdit resets selectedRecipe before setting editingRecipe — prevents dual render
- [Phase 07-recipe-management Plan 03]: Optimistic title patch uses data.recipe_id from PUT response — matches API contract
- [Phase 07-recipe-management Plan 03]: ingredients:[] in edit pre-fill is intentional v1.1 trade-off
- [Phase 08-workspace-switching]: fetchWorkspaces extracted as useCallback([user]); refreshWorkspaces wraps it as stable useCallback for consumers
- [Phase 08-workspace-switching]: JoinWorkspaceModal calls refreshWorkspaces() then setActiveWorkspace() — refresh syncs list, setActiveWorkspace makes new workspace active immediately
- [Phase 08-workspace-switching]: Leave flow does NOT call setActiveWorkspace manually — refreshWorkspaces() auto-corrects activeWorkspaceId to first remaining workspace
- [Phase 09-workspace-invite-links Plan 01]: /invite route wraps only AuthProvider (no AuthGate) — unauthenticated users must reach invite URL without login block
- [Phase 09-workspace-invite-links]: Full URL constructed client-side via window.location.origin; raw invite code display removed in favour of copy-link and WA share buttons
- [Phase 09-workspace-invite-links]: InviteHandler does not use useWorkspace — /invite route has no WorkspaceProvider; navigate('/') triggers fresh fetch
- [Phase 09-workspace-invite-links]: pendingInviteCode cleared early in autoJoin before async calls — prevents double-join on re-render
- [Phase 11-ingredient-measurements Plan 02]: Normalization placed after JSON.parse validation guard so invalid responses still throw early; legacy string items converted to {name, amount: null, unit: null} (not discarded); empty-name objects filtered after normalization

### Roadmap Evolution

- Phase 7 added: Recipe Management (edit + delete recipes, API + state, no CSS)
- Phase 8 added: Workspace Switching (join code, leave, sole-member deletion, no CSS)
- Phase 9 PIVOTED 2026-03-13: replaced Gallery Filters with Workspace Invite Links (URL invite flow, /invite route, WhatsApp share, post-login auto-join)
- Phase 10 RENAMED + EXPANDED 2026-03-14: was "Gallery Filters" (minor URL search-params refactor done inline); became "Multi-Platform Media Scraping" — YouTube transcript, TikTok RapidAPI, short-link resolution, frontend URL detection, multi-platform preview embeds
- Phase 11 (upcoming): Ingredient quantities — structured quantity/unit data model

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-14T00:00:00.000Z
Stopped at: Completed 11-02 — Ingredient prompt + shape normalization in moonshot.js
Resume file: None
