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
**Plans**: TBD

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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Pipeline | 1/4 | In Progress|  |
| 2. Deployment Packaging | 0/TBD | Not started | - |
| 3. Frontend | 0/TBD | Not started | - |
