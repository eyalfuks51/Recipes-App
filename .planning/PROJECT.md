# Recipe Manager

## What This Is

A full-stack web application for saving and browsing Instagram recipes. Users paste an Instagram post URL; the backend scrapes the caption via Apify, extracts a rich multi-dimensional recipe via Moonshot AI (title, ingredients, instructions, cuisine, meal type, dietary tags), and saves to Supabase after the user validates the output on a split-screen review screen.

Users authenticate via Google OAuth, belong to workspaces (ecosystems), and all recipe data is isolated per workspace via Supabase RLS. The React frontend lets users submit URLs, review AI-extracted content before saving, and browse a categorized gallery with full recipe modal view including ingredient checklists synced to Supabase.

**Stack:** Node.js/Express (Koyeb) + React/Vite/SCSS (Vercel) + Supabase + Moonshot AI + Apify

## Core Value

Any Instagram recipe URL becomes a browsable, structured recipe card in one click.

## Requirements

### Validated

- ✓ POST /api/extract-recipe + /api/confirm-recipe: two-step extract-then-confirm API for human-in-the-loop review — v1.0
- ✓ Apify `apify~instagram-scraper` scrapes post caption; `www.` prefix normalization — v1.0
- ✓ Moonshot AI (`moonshot-v1-8k`) extracts multi-dimensional recipe schema with Hebrew prompt — v1.0
- ✓ Recipe upserted to Supabase `recipes` table; ingredients deduplicated in `ingredients` table; junction in `recipe_ingredients` — v1.0
- ✓ Node.js server Dockerized (node:20-alpine) for Koyeb deployment with `.env.example` — v1.0
- ✓ React/Vite frontend with SCSS, deployed to Vercel — v1.0
- ✓ URL submission form with loading/success/error states — v1.0
- ✓ Recipe gallery fetches directly from Supabase with skeleton loading — v1.0
- ✓ Google OAuth via Supabase: AuthProvider, AuthGate login wall, sign-out — v1.0
- ✓ Workspace schema: `workspaces`, `workspace_users`, `workspace_ingredient_checks`; recipes scoped to workspace — v1.0
- ✓ AI category restrictions: `ALLOWED_CATEGORIES` constant + `ALLOWED_CUISINES` + `ALLOWED_DIETARY_TAGS` enums — v1.0
- ✓ RecipeEditForm / RecipeReviewScreen: two-step review before save ("אישור ושמירה") — v1.0
- ✓ Full Recipe View: RecipeModal with instructions + stateful ingredient checkboxes synced to Supabase — v1.0
- ✓ WorkspaceProvider context, localStorage persistence, workspace switcher dropdown — v1.0
- ✓ Workspace onboarding screen: create or join via invite code — v1.0
- ✓ Supabase RLS policies: all recipe/workspace reads scoped to authenticated user's workspaces — v1.0
- ✓ Multi-dimensional AI schema: cuisine, meal_type, main_ingredient, prep_time, dietary_tags added to `recipes` table — v1.0
- ✓ RecipeReviewScreen: split-screen desktop / tab-switcher mobile, all AI fields editable — v1.0
- ✓ og:image extraction → thumbnail_url pipeline for recipe media fallback — v1.0

### Active

(None — v1.0 complete. Start `/gsd:new-milestone` for v1.1.)

### Out of Scope

- Real-time multi-user collaboration — single-user tool, workspace model sufficient
- Mobile native app — PWA/responsive web covers mobile needs
- Offline mode — Supabase connectivity required for recipe sync
- Bulk import / CSV upload — one-at-a-time URL flow is the UX

## Context

**Shipped:** v1.0 — 2026-03-07
**Codebase:** ~4,600 LOC JS/JSX/SCSS across `/server` and `/client` monorepo
**Deployment:** Backend on Koyeb (Docker), Frontend on Vercel
**Database:** Supabase with tables: `recipes`, `ingredients`, `recipe_ingredients`, `workspaces`, `workspace_users`, `workspace_ingredient_checks`

**Moonshot AI:** Hebrew prompt forces structured JSON with `main_category` from `ALLOWED_CATEGORIES` (14 values), `cuisine` from `ALLOWED_CUISINES` (12 values), `dietary_tags` from `ALLOWED_DIETARY_TAGS` (4 values), strict `meal_type` toggle (ארוחת בוקר / ארוחת צהריים / ארוחת ערב / חטיף)

**Two-step API pattern:** `/api/extract-recipe` → AI preview (not saved); `/api/confirm-recipe` → saves user-edited recipe to Supabase. Nothing persists until user clicks "אישור ושמירה".

## Constraints

- **Backend runtime:** Node.js + Express — persistent server (not serverless) on Koyeb
- **Frontend:** React + Vite + SCSS — handoff-friendly for non-Claude developer
- **Database:** Supabase (PostgreSQL with RLS)
- **Deployment:** Backend → Koyeb (Docker), Frontend → Vercel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual /client + /server monorepo | Clean separation, each deployable independently | ✓ Good — no coupling issues |
| Frontend reads Supabase directly | Gallery doesn't need to proxy through backend — simpler | ✓ Good — auth tokens flow naturally |
| No auth for v1 original plan | Personal tool | ⚠️ Revisit — Google OAuth added in Phase 4; essential for workspace isolation |
| Two-step extract-then-confirm API | Separates AI extraction from persistence; enables human review | ✓ Good — core UX pattern |
| ALLOWED_CATEGORIES as single source of truth in moonshot.js | AI prompt and normalization share one constant | ✓ Good — prevents drift |
| workspace_id nullable FK on recipes | Backward-compatible; existing recipes unaffected | ✓ Good — smooth migration |
| JSONB for dietary_tags | Stores Hebrew string arrays without junction tables | ✓ Good — simple and sufficient |
| RecipeReviewScreen split-screen | Premium feel; Instagram iframe left, edit form right | ✓ Good — well received in UAT |
| og:image → thumbnail_url pipeline | Instagram iframes sometimes blocked; thumbnail fallback ensures media visible | ✓ Good — resilient UX |
| Removed cook_time and equipment_needed | UX review found them noisy; strict meal_type toggle cleaner | ✓ Good — schema simplified |

---
*Last updated: 2026-03-07 after v1.0 milestone*
