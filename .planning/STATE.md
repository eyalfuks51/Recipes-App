---
project: Recipe Manager
milestone: v1.1 shipped — now maintenance / hardening
branch: fix/supabase-rls-advisor
status: active
last_updated: 2026-06-22
---

# Project State

> Scanned 2026-06-22 from code + git + data model. Replaces the old GSD-format
> STATE.md (was frozen at Phase 11, 2026-03-14). PROJECT.md is also stale — it
> still names Apify, which was removed; treat this file as truth where they differ.

## What it is

Paste a social-media recipe URL (Instagram / YouTube / TikTok) → backend scrapes
caption/transcript → Moonshot AI extracts a structured Hebrew recipe → user reviews
on a split-screen → saves to Supabase. Workspace-scoped, Google OAuth, RLS-isolated.

## Stack (current)

- **Server** `server/` — Node/Express 5.2, ESM. Deploy: Docker `node:20-alpine` → Koyeb.
- **Client** `client/` — React 19.1 + Vite 6 + SCSS, react-router-dom 7. Deploy: Vercel.
- **DB** — Supabase (Postgres + RLS), `@supabase/supabase-js` 2.98.
- **AI** — Moonshot via OpenAI-compatible SDK (`openai` 6.26), Hebrew prompts.
- **Scraping** — RapidAPI for IG/TikTok, `youtube-transcript` (→ RapidAPI → page-scrape fallback) for YT. TikTok routed through a Vercel serverless proxy in prod (RapidAPI IP block). **Apify removed.**
- **Env (server):** `MOONSHOT_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `RAPIDAPI_KEY`, `PORT?`

## Current position

On `fix/supabase-rls-advisor` — closing out Supabase Security Advisor findings (RLS
on public tables, privileged logic moved out of the exposed API).

**Uncommitted:**
- `CLAUDE.md` modified
- `AGENTS.md` new — Codex instruction mirror (multi-model Claude+Codex workflow)

## Roadmap

Phases 1–11 complete. v1.0 shipped 2026-03-07; v1.1 (phases 7–11) done 2026-03-14.

| Phase | Title | Status |
|-------|-------|--------|
| 1–6 | v1.0 MVP (pipeline, deploy, frontend, multi-tenant SaaS, data isolation, human-in-loop AI) | ✅ |
| 7 | Recipe Management (edit/delete) | ✅ |
| 8 | Workspace Switching | ✅ |
| 9 | Workspace Invite Links | ✅ |
| 10 | Multi-Platform Scraping (YT + TikTok) | ✅ |
| 11 | Ingredient Measurements (amount+unit) | ✅ |

### Post-v1.1 work (Mar 14 → Jun 22, not phase-tracked)

- Removed Apify scraper; fixed delete route
- Fixed double-slash API URL; TikTok 403 fix (browser headers, 502 on upstream fail)
- Vercel proxy for TikTok (bypass RapidAPI IP block)
- Express 5 path-to-regexp: wildcard `*` → `/.*/`
- PWA install prompt (platform-specific)
- **RLS hardening (current branch):** RLS enabled on `ingredients`, `workspaces`, `workspace_users`; workspace create/join/leave/count moved to `private` schema SECURITY DEFINER fns with public SECURITY INVOKER wrappers; `is_workspace_member` helper in `private`

## Data model

Tables (`supabase/migrations/`):
- `recipes` — core; unique `instagram_url`; workspace-scoped; +dimensions, +`thumbnail_url`
- `ingredients` — global catalog, unique lowercase Hebrew `name`
- `recipe_ingredients` — junction, +`amount` +`unit` (phase 11)
- `workspaces` — +`invite_code` (unique partial index)
- `workspace_users` — membership + role
- `workspace_ingredient_checks` — per-workspace checkbox state

**RLS posture:** all enabled. Reads gated by `private.is_workspace_member()`. Workspace
mutations only via SECURITY DEFINER RPCs in `private`, exposed through INVOKER wrappers
in `public` (browser has no direct write to workspace tables). Server uses service_role key.

## API surface

All in `server/src/routes/recipe.js`, mounted `/api`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | health (index.js) |
| POST | `/api/process-recipe` | one-shot scrape+extract+save |
| POST | `/api/extract-recipe` | step 1: scrape+AI, no write |
| POST | `/api/confirm-recipe` | step 2: save edited recipe |
| PUT | `/api/recipes/:id` | update |
| DELETE | `/api/recipes/:id` | delete (cascade) |

## Watch / debt

- **Enum drift:** `ALLOWED_CATEGORIES/CUISINES/DIETARY_TAGS/MEAL_TYPES` defined in `moonshot.js`, duplicated in client `RecipeReviewScreen.jsx`. Keep in sync.
- `DIFFICULTY_MAP` duplicated in `RecipeGallery.jsx` + `RecipeModal.jsx`.
- `PROJECT.md` is stale (Apify, Mar-7 milestone text) — refresh if it's still used.
- `.planning/phases/*` are GSD-era artifacts; kept as history, not live process.

## Open / next

None tracked. Finish RLS advisor branch → PR.
