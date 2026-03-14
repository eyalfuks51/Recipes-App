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
| 9. Workspace Invite Links | v1.1 | 3/3 | Complete | 2026-03-13 |
| 10. Multi-Platform Media Scraping | v1.1 | 1/1 | Complete | 2026-03-14 |
| 11. Ingredient Measurements | v1.1 | 4/4 | Complete | 2026-03-14 |

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

### Phase 9: Workspace Invite Links — COMPLETE 2026-03-13

**Goal:** Replace manual 6-character code entry with a seamless URL invite flow. Copy-invite-link UI, WhatsApp share, `/invite` route, authenticated confirmation modal, unauthenticated post-login auto-join.
**Requirements**: copy invite link as full URL; share on WhatsApp; /invite route with authenticated confirmation and unauthenticated localStorage-code + post-login auto-join
**Depends on:** Phase 8
**Plans:** 3/3 plans complete

Plans:
- [x] 09-01-PLAN.md — Add react-router-dom; restructure app entry for /invite route outside AuthGate
- [x] 09-02-PLAN.md — WorkspaceSwitcher: Copy Invite Link button + WhatsApp share icon
- [x] 09-03-PLAN.md — InviteHandler component (auth + unauth flows) + post-login auto-join

### Phase 10: Multi-Platform Media Scraping — COMPLETE 2026-03-14

**Goal:** Expand recipe extraction to YouTube and TikTok. Generalise scraping layer to be source-agnostic; detect URL platform on frontend; render platform-appropriate embedded previews.
**Requirements**: YouTube transcript extraction, TikTok caption extraction via RapidAPI, short-link resolution for vm.tiktok.com, frontend URL detection with platform icons, multi-platform preview panel
**Depends on:** Phase 1 (scraping), Phase 3 (frontend)
**Plans:** 1/1 complete

Plans:
- [x] 10-COMPLETION.md — YouTube + TikTok scrapers, route generalisation, moonshot prompt update, frontend URL detection + previews

### Phase 11: Ingredient Measurements — COMPLETE 2026-03-14

**Goal:** Capture exact ingredient quantities and units from AI extraction. DB migration adds `amount` and `unit` columns to `recipe_ingredients`; Moonshot prompt updated to return structured ingredient objects; backend save/update logic handles new schema; frontend renders a dynamic per-ingredient input list.
**Requirements**: DB migration for amount+unit; AI returns {name, amount, unit} objects; backend inserts structured data; frontend renders and allows editing of full ingredient text
**Depends on:** Phase 1 (backend pipeline), Phase 3 (frontend), Phase 7 (recipe management)
**Plans:** 4/4 plans complete

Plans:
- [x] 11-01-PLAN.md — DB migration: add amount+unit columns to recipe_ingredients junction table
- [x] 11-02-PLAN.md — AI prompt: update HEBREW_SYSTEM_PROMPT to return {name,amount,unit} ingredient objects + normalization
- [x] 11-03-PLAN.md — Backend refactor: saveRecipe + updateRecipe propagate amount+unit into junction rows
- [x] 11-04-PLAN.md — Frontend update: RecipeReviewScreen dynamic per-ingredient input list + parse-on-save heuristic
