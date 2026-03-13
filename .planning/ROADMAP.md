# Roadmap: Recipe Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-07)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-07</summary>

- [x] Phase 1: Backend Pipeline (4/4 plans) — completed 2026-03-05
- [x] Phase 2: Deployment Packaging (1/1 plan) — completed 2026-03-05
- [x] Phase 3: Frontend (3/3 plans) — completed 2026-03-06
- [x] Phase 4: Multi-tenant SaaS and Ecosystems (5/5 plans) — completed 2026-03-06
- [x] Phase 5: Ecosystem Onboarding and Strict Data Isolation (4/4 plans) — completed 2026-03-07
- [x] Phase 6: Human-in-the-Loop Review & Multi-Dimensional AI (3/3 plans) — completed 2026-03-07

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Backend Pipeline | v1.0 | 4/4 | Complete | 2026-03-05 |
| 2. Deployment Packaging | v1.0 | 1/1 | Complete | 2026-03-05 |
| 3. Frontend | v1.0 | 3/3 | Complete | 2026-03-06 |
| 4. Multi-tenant SaaS and Ecosystems | v1.0 | 5/5 | Complete | 2026-03-06 |
| 5. Ecosystem Onboarding and Strict Data Isolation | v1.0 | 4/4 | Complete | 2026-03-07 |
| 6. Human-in-the-Loop Review & Multi-Dimensional AI | v1.0 | 3/3 | Complete | 2026-03-07 |
| 7. Recipe Management | v1.1 | 3/3 | Complete | 2026-03-07 |
| 8. Workspace Switching | v1.1 | 2/2 | Complete | 2026-03-13 |
| 9. Workspace Invite Links | v1.1 | 0/3 | Pending | — |
| 10. Gallery Filters | v1.1 | 0/0 | Pending | — |

### Phase 7: Recipe Management — COMPLETE 2026-03-07

**Goal:** Enable users to edit and delete saved recipes — API endpoints, Supabase queries, React state. No CSS/styling.
**Requirements**: delete recipes from workspace; edit saved recipes via RecipeReviewScreen (post-save edit mode)
**Depends on:** Phase 6
**Plans:** 3/3 plans executed

Plans:
- [x] 07-01-PLAN.md — Backend: deleteRecipe + updateRecipe Supabase functions + DELETE/PUT API routes
- [x] 07-02-PLAN.md — Frontend delete: RecipeModal delete button + RecipeGallery optimistic removal
- [x] 07-03-PLAN.md — Frontend edit: RecipeReviewScreen editMode + RecipeGallery edit state wiring

### Phase 8: Workspace Switching — COMPLETE 2026-03-13

**Goal:** Allow users to switch workspace via join code, leave a workspace, and delete it if they are the sole member. No CSS/styling.
**Requirements**: user can switch to a different workspace using a join code, with workspace deletion if they are the sole member
**Depends on:** Phase 6
**Plans:** 2/2 plans complete

Plans:
- [x] 08-01-PLAN.md — WorkspaceProvider: add refreshWorkspaces() imperative method
- [x] 08-02-PLAN.md — JoinWorkspaceModal + LeaveWorkspaceModal components + WorkspaceSwitcher wiring

### Phase 9: Workspace Invite Links

**Goal:** Replace manual 6-character code entry with a seamless URL invite flow. Copy-invite-link UI, WhatsApp share, `/invite` route, authenticated confirmation modal, unauthenticated post-login auto-join.
**Requirements**: copy invite link as full URL; share on WhatsApp; /invite route with authenticated confirmation and unauthenticated localStorage-code + post-login auto-join
**Depends on:** Phase 8
**Plans:** 3 plans

Plans:
- [ ] 09-01-PLAN.md — Add react-router-dom; restructure app entry for /invite route outside AuthGate
- [ ] 09-02-PLAN.md — WorkspaceSwitcher: Copy Invite Link button + WhatsApp share icon
- [ ] 09-03-PLAN.md — InviteHandler component (auth + unauth flows) + post-login auto-join

### Phase 10: Gallery Filters

**Goal:** Add functional filter bar to gallery — meal type toggle, category multi-select, cuisine autocomplete from DB values, vibe tag pills. Supabase query integration only. No CSS/styling.
**Requirements**: gallery supports filtering by meal type (toggle), category (multi-select), cuisine (autocomplete from DB values), and vibe tags (pill buttons)
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 10 to break down)
