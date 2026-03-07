# Roadmap: Recipe Manager

## Overview

Three phases deliver a working app: first the backend pipeline processes Instagram URLs into structured recipes locally; then the server is packaged for persistent 24/7 deployment on Koyeb; finally the React frontend connects everything so a user can submit a URL and browse their recipe gallery from any browser.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Backend Pipeline** - Express server processes Instagram URLs into structured recipes saved to Supabase
- [ ] **Phase 2: Deployment Packaging** - Server Dockerized and environment documented for Koyeb deployment
- [ ] **Phase 3: Frontend** - React/Vite app lets users submit URLs and browse the recipe gallery

## Phase Details

### Phase 1: Backend Pipeline
**Goal**: The backend API accepts an Instagram URL and reliably saves a structured recipe to Supabase
**Depends on**: Nothing (first phase)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, BACK-07, BACK-08, BACK-09, INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. POST /api/process-recipe with a valid Instagram URL returns `{ success, recipe_id, title, ingredients_count }`
  2. A new recipe row appears in the Supabase `recipes` table after a successful request
  3. Ingredients rows appear in `ingredients` and junction rows in `recipe_ingredients` linked to the recipe
  4. Submitting the same Instagram URL twice does not create duplicate rows (upsert deduplication works)
  5. Submitting a URL with no post caption returns a meaningful error response (not a 500)
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Express server scaffold with CORS, PORT, and env wiring
- [ ] 01-02-PLAN.md — Apify Instagram scraper and Moonshot AI recipe extraction services
- [ ] 01-03-PLAN.md — Supabase persistence layer (recipe upsert, ingredient upsert, junction insert)
- [ ] 01-04-PLAN.md — POST /api/process-recipe route wiring and end-to-end verification

### Phase 2: Deployment Packaging
**Goal**: The server can be built into a Docker image and deployed to Koyeb with documented environment variables
**Depends on**: Phase 1
**Requirements**: INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. `docker build` completes without errors and the container starts the Express server
  2. `.env.example` lists every required variable (APIFY_TOKEN, MOONSHOT_API_KEY, SUPABASE_URL, SUPABASE_KEY, PORT)
**Plans**: 1 plan

Plans:
- [ ] 02-01-PLAN.md — Dockerfile, .dockerignore, and sanitized .env.example with placeholders

### Phase 3: Frontend
**Goal**: Users can submit an Instagram URL through a browser and immediately see new and existing recipes in a gallery
**Depends on**: Phase 1
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09, FE-10, FE-11
**Success Criteria** (what must be TRUE):
  1. User pastes a URL into the input field, clicks submit, and sees a loading indicator while the request is in flight
  2. On success, the UI shows the new recipe title and the gallery refreshes to include it
  3. On backend error, the UI shows a readable error message (not a blank screen or raw stack trace)
  4. The gallery displays existing recipes from Supabase on page load, each card showing title, category, and difficulty
  5. The Vite project deploys to Vercel with no server-side config — backend URL and Supabase credentials come from environment variables
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Vite/React project scaffold with SCSS, env wiring, and Vercel SPA config
- [ ] 03-02-PLAN.md — URL submission form with loading/success/error states
- [ ] 03-03-PLAN.md — Recipe gallery with Supabase direct reads and post-submit refresh

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Pipeline | 4/4 | In Progress (checkpoint) | - |
| 2. Deployment Packaging | 0/1 | Planned | - |
| 3. Frontend | 0/3 | Planned | - |

### Phase 4: Multi-tenant SaaS and Ecosystems

**Goal:** Users can log in with Google, belong to shared workspaces (ecosystems), and manage recipes scoped to their workspace with a full review-before-save flow and rich recipe detail view
**Depends on:** Phase 3
**Requirements:**
  1. Google Auth login via Supabase (SAAS-01)
  2. Ecosystems (Workspaces): `workspaces` and `workspace_users` tables; recipes linked to workspaces instead of being global (SAAS-02)
  3. Pre-save Edit UI: form to edit/verify the AI-extracted recipe before saving to Supabase (SAAS-03)
  4. AI Restrictions: Moonshot AI forced to use only predefined categories (SAAS-04)
  5. Full Recipe View: display instructions text and stateful ingredient checkboxes that sync with the workspace (SAAS-05)
**Plans:** 5/5 plans complete

Plans:
- [ ] 04-01-PLAN.md — Google Auth via Supabase OAuth: AuthProvider context, AuthGate login wall, sign-in/sign-out
- [ ] 04-02-PLAN.md — Workspace DB schema (workspaces, workspace_users, workspace_ingredient_checks) + server recipe scoping
- [ ] 04-03-PLAN.md — AI category restrictions: ALLOWED_CATEGORIES constant + updated Moonshot system prompt
- [ ] 04-04-PLAN.md — Pre-save Edit UI: /api/extract-recipe + /api/confirm-recipe + RecipeEditForm component
- [ ] 04-05-PLAN.md — Full Recipe View: instructions display + stateful ingredient checkboxes synced to Supabase

### Phase 5: Ecosystem Onboarding and Strict Data Isolation

**Goal:** Users are onboarded into workspaces explicitly, can switch between workspaces, and all recipe data is isolated at the database level via Supabase RLS policies
**Depends on:** Phase 5
**Requirements:** SAAS-WS-01, SAAS-WS-02, SAAS-WS-03, SAAS-WS-04, SAAS-WS-05, SAAS-WS-06, SAAS-WS-07
**Plans:** 4 plans

Plans:
- [ ] 05-01-PLAN.md — WorkspaceProvider context + localStorage persistence + workspace switcher dropdown in header
- [ ] 05-02-PLAN.md — Workspace onboarding screen (create or join via invite code)
- [ ] 05-03-PLAN.md — Supabase RLS policies migration + client-side query scoping to active workspace
- [ ] 05-04-PLAN.md — Orphaned data migration SQL script + server-side workspace_id validation hardening

### Phase 6: Human-in-the-Loop Review & Multi-Dimensional AI

**Goal:** AI extraction returns a rich multi-dimensional schema (meal type, cuisine, main ingredient, equipment, prep/cook time, dietary tags, instructions) and users validate the output on a premium split-screen review screen before explicitly approving and saving
**Requirements**: AI-SCHEMA-01, AI-SCHEMA-02, AI-SCHEMA-03, SERVER-PASSTHROUGH-01, DB-MIGRATION-01, UI-REVIEW-01, UI-REVIEW-02, UI-REVIEW-03
**Depends on:** Phase 5
**Plans:** 3 plans

Plans:
- [ ] 06-01-PLAN.md — Moonshot AI schema expansion: new fields, ALLOWED_CUISINES/DIETARY_TAGS enums, Hebrew prompt, server-side normalization, routes + saveRecipe() passthrough
- [ ] 06-02-PLAN.md — Supabase migration: add 7 nullable columns to recipes table (cuisine, meal_type, main_ingredient, equipment_needed, prep_time, cook_time, dietary_tags)
- [ ] 06-03-PLAN.md — RecipeReviewScreen: split-screen desktop / tab-switcher mobile, all fields editable, explicit אישור ושמירה save
