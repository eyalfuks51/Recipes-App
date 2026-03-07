# Retrospective: Recipe Manager

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-07
**Phases:** 6 | **Plans:** 20

### What Was Built

- Express backend pipeline: Apify Instagram scraping → Moonshot AI extraction → Supabase persistence
- Docker deployment packaging for Koyeb with documented environment
- React/Vite frontend: URL submission form, recipe gallery, skeleton loading — deployed to Vercel
- Google OAuth login, workspace/ecosystem schema, two-step extract-then-confirm recipe review flow
- Workspace onboarding, multi-workspace switcher, Supabase RLS data isolation per workspace
- Multi-dimensional AI schema (meal type, cuisine, dietary tags, instructions) + split-screen RecipeReviewScreen with human-in-the-loop validation
- og:image thumbnail extraction pipeline as media fallback when Instagram iframe blocked

### What Worked

- **Two-step API pattern** (extract → human review → confirm save) proved excellent UX — keeps AI as assistant, human as approver
- **ALLOWED_* constants as single source of truth** in moonshot.js prevented drift between AI prompt and UI validation
- **Wave-based parallelization** in GSD significantly accelerated phases 4-6
- **Nullable FK / optional-spread pattern** in saveRecipe() enabled clean backward-compatible schema evolution
- **Quick task mechanism** (quick-1) handled post-UAT visual regressions cleanly without derailing phase tracking

### What Was Inefficient

- Requirements tracking was not kept current as scope expanded — 12 "Pending" requirements were actually delivered but never checked off
- ROADMAP.md accumulated phases 4-6 as informal additions without proper progress table updates
- STATE.md showed inaccurate progress % (25%) despite 100% plan completion — tracking metadata got stale

### Patterns Established

- Two-step extract-then-confirm as the standard recipe save flow
- ALLOWED_CATEGORIES / ALLOWED_CUISINES / ALLOWED_DIETARY_TAGS exported from moonshot.js and duplicated client-side with sync comments
- Proxy-based lazy Supabase client — defers createClient() for module importability without env vars
- workspaceKey fallback: `recipe.workspace_id ?? user.id` — personal recipes use user.id as workspace key
- og:image → thumbnail_url extraction during scraping for resilient media display

### Key Lessons

- Requirements.md must be updated as scope expands, not just at the end — tracking debt compounds
- Visual regressions post-UAT are common; budget a quick-fix pass after every major UI phase
- Removing schema fields (cook_time, equipment_needed) after implementation is normal — building, reviewing, simplifying is the right cycle
- Windows IPv6 dual-stack behavior (localhost → ::1) caused misleading test failures; always test on 127.0.0.1 explicitly on Windows

### Cost Observations

- Sessions: ~10 sessions across 3 days
- Model: claude-sonnet-4-6 (balanced profile)
- Notable: Phase 6 UAT caught real visual regressions; quick task pattern handled them efficiently without full plan overhead

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Key Pattern |
|-----------|--------|-------|------|-------------|
| v1.0 MVP | 6 | 20 | 3 | Scope expansion without requirements update |
