# Milestones

## v1.0 MVP (Shipped: 2026-03-07)

**Phases completed:** 6 phases, 20 plans
**Timeline:** 2026-03-05 → 2026-03-07 (3 days)
**LOC:** ~4,600 JS/JSX/SCSS

**Key accomplishments:**
1. Express backend pipeline: Apify Instagram scraping → Moonshot AI extraction → Supabase persistence with full deduplication
2. Node.js server Dockerized for Koyeb deployment with lean node:20-alpine image and documented environment variables
3. React/Vite frontend gallery with Supabase direct reads, skeleton loading, and URL submission form — deployed to Vercel
4. Google OAuth authentication via Supabase, workspace/ecosystem schema, and two-step extract-then-confirm recipe review flow
5. Multi-workspace onboarding, workspace switcher, and Supabase RLS data isolation per workspace
6. Multi-dimensional AI schema (meal type, cuisine, main ingredient, dietary tags, instructions) with premium split-screen RecipeReviewScreen for human-in-the-loop validation before save

**Known Gaps (requirements tracking lag):**
- BACK-01, FE-01 through FE-11 marked Pending in REQUIREMENTS.md but all functionally delivered; project scope expanded beyond original v1 requirements and tracking was not kept current

**Archive:**
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---
