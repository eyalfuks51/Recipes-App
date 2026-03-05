# Requirements: Recipe Manager

**Defined:** 2026-03-05
**Core Value:** Any Instagram recipe URL becomes a browsable, structured recipe card in one click.

## v1 Requirements

### Backend — Recipe Processing

- [ ] **BACK-01**: POST /api/process-recipe accepts `{ instagram_url }` and returns `{ success, recipe_id, title, ingredients_count }`
- [x] **BACK-02**: Endpoint normalizes Instagram URL to include `www.` prefix before calling Apify
- [x] **BACK-03**: Endpoint calls Apify `apify~instagram-scraper` actor to scrape post caption
- [x] **BACK-04**: If Apify returns no caption, endpoint returns a meaningful error response
- [x] **BACK-05**: Endpoint sends caption to Moonshot AI (`moonshot-v1-8k`) with the Hebrew system prompt to extract `{ title, main_category, difficulty, ingredients[] }`
- [x] **BACK-06**: AI response is parsed with regex fallback to handle markdown-wrapped JSON
- [x] **BACK-07**: Recipe is upserted to Supabase `recipes` table with `resolution=merge-duplicates`
- [x] **BACK-08**: Each ingredient is upserted to `ingredients` table (lowercase+trimmed name) with deduplication
- [x] **BACK-09**: Junction records are inserted into `recipe_ingredients` table linking recipe to ingredients

### Backend — Infrastructure

- [x] **INFRA-01**: Express server starts on configurable PORT from environment variable
- [x] **INFRA-02**: CORS configured to allow frontend origin
- [x] **INFRA-03**: Environment variables for APIFY_TOKEN, MOONSHOT_API_KEY, SUPABASE_URL, SUPABASE_KEY
- [ ] **INFRA-04**: Dockerfile builds a runnable Node.js image suitable for Koyeb deployment
- [ ] **INFRA-05**: `.env.example` documents all required environment variables

### Frontend — URL Submission

- [ ] **FE-01**: Input field accepts Instagram URL text
- [ ] **FE-02**: Submit button sends POST request to backend `/api/process-recipe`
- [ ] **FE-03**: UI shows loading state while request is in flight
- [ ] **FE-04**: UI shows success message with recipe title on completion
- [ ] **FE-05**: UI shows error message if backend returns an error

### Frontend — Recipe Gallery

- [ ] **FE-06**: Gallery fetches recipes directly from Supabase on page load
- [ ] **FE-07**: Each recipe card displays: title, main_category, difficulty
- [ ] **FE-08**: Gallery refreshes after a new recipe is successfully submitted

### Frontend — Infrastructure

- [ ] **FE-09**: Vite project structured for Vercel deployment (no server-side config needed)
- [ ] **FE-10**: SCSS used for styling (not CSS-in-JS)
- [ ] **FE-11**: Backend URL and Supabase credentials read from environment variables (`.env`)

## v2 Requirements

### Features

- **V2-01**: Recipe detail page showing full ingredient list
- **V2-02**: Filter/search recipes by category or difficulty
- **V2-03**: Delete recipe from gallery
- **V2-04**: Recipe image fetched from Instagram post

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication | Personal tool — no multi-user needs in v1 |
| Recipe editing UI | Read-only gallery sufficient for v1 |
| Mobile app | Web-first, Vercel handles responsive |
| Real-time updates | Polling/refresh on submit is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | Pending |
| BACK-02 | Phase 1 | Complete |
| BACK-03 | Phase 1 | Complete |
| BACK-04 | Phase 1 | Complete |
| BACK-05 | Phase 1 | Complete |
| BACK-06 | Phase 1 | Complete |
| BACK-07 | Phase 1 | Complete |
| BACK-08 | Phase 1 | Complete |
| BACK-09 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 2 | Pending |
| INFRA-05 | Phase 2 | Pending |
| FE-01 | Phase 3 | Pending |
| FE-02 | Phase 3 | Pending |
| FE-03 | Phase 3 | Pending |
| FE-04 | Phase 3 | Pending |
| FE-05 | Phase 3 | Pending |
| FE-06 | Phase 3 | Pending |
| FE-07 | Phase 3 | Pending |
| FE-08 | Phase 3 | Pending |
| FE-09 | Phase 3 | Pending |
| FE-10 | Phase 3 | Pending |
| FE-11 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after initial definition*
