# Recipe Manager

> Live project reference. Updated 2026-06-22. Paired with STATE.md (current
> position). The GSD `phases/`, `milestones/`, `MILESTONES.md`, `RETROSPECTIVE.md`,
> `config.json` are frozen archive — see `.planning/README.md`.

## What This Is

A full-stack web app for saving and browsing recipes from social media. Users paste a
recipe URL (Instagram, YouTube, or TikTok); the backend scrapes the caption/transcript,
extracts a rich multi-dimensional recipe via Moonshot AI (title, ingredients with
amount+unit, instructions, cuisine, meal type, dietary tags), and saves to Supabase
after the user validates the output on a split-screen review screen.

Users authenticate via Google OAuth, belong to workspaces, and all recipe data is
isolated per workspace via Supabase RLS. Installable as a PWA.

**Stack:** Node/Express (Koyeb) + React/Vite/SCSS (Vercel) + Supabase + Moonshot AI.
Scraping via RapidAPI (Instagram/TikTok) + youtube-transcript (YouTube), TikTok through
a Vercel proxy in prod.

## Core Value

Any social-media recipe URL becomes a browsable, structured recipe card in one click.

## Status

- ✅ **v1.0 MVP** shipped 2026-03-07 (phases 1–6)
- ✅ **v1.1 Functional Enhancements** shipped 2026-03-14 (phases 7–11): delete, edit, workspace switching, invite links, multi-platform scraping, ingredient measurements
- 🔧 **Now:** maintenance + hardening (no formal milestone). RLS Security-Advisor cleanup, deploy/compat fixes, PWA. See STATE.md.

## Requirements (delivered)

**v1.0**
- Two-step extract-then-confirm API for human-in-the-loop review
- Moonshot AI extracts multi-dimensional recipe schema (Hebrew prompt)
- Recipe → `recipes`; ingredients deduped in `ingredients`; junction in `recipe_ingredients`
- Dockerized Node server (Koyeb); React/Vite frontend (Vercel)
- Google OAuth (AuthProvider + AuthGate); workspace schema + per-workspace RLS isolation
- ALLOWED_* enum restrictions on AI output
- RecipeReviewScreen split-screen review; RecipeModal full view + ingredient checkboxes
- og:image → thumbnail_url fallback

**v1.1**
- Delete + edit saved recipes (post-save edit mode reuses RecipeReviewScreen)
- Workspace switching via join code; sole-member workspace deletion
- Invite links: `/invite` route, copy-link, WhatsApp share, post-login auto-join
- Multi-platform scraping: YouTube transcript + TikTok caption, URL detection, platform previews
- Ingredient measurements: `amount`+`unit` on `recipe_ingredients`, AI returns `{name,amount,unit}`

## Out of Scope

- Real-time multi-user collaboration — workspace model is sufficient
- Mobile native app — PWA + responsive web covers it
- Offline mode — Supabase connectivity required
- Bulk import / CSV — one-at-a-time URL flow is the UX

## Constraints

- **Backend:** Node + Express — persistent server (not serverless) on Koyeb
- **Frontend:** React + Vite + SCSS — handoff-friendly for non-Claude (Mor) frontend work
- **Database:** Supabase (Postgres + RLS)
- **Deploy:** Backend → Koyeb (Docker), Frontend → Vercel, TikTok proxy → Vercel function
- **Language:** all recipe content + AI prompts in Hebrew (RTL)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual /client + /server monorepo | Clean separation, each deployable | ✓ Good |
| Frontend reads Supabase directly | Gallery needn't proxy through backend | ✓ Good — auth tokens flow naturally |
| Two-step extract-then-confirm API | Separates AI extraction from persistence; enables review | ✓ Good — core UX pattern |
| ALLOWED_* enums as single source of truth in moonshot.js | AI prompt + normalization share one constant | ⚠️ Duplicated in client `RecipeReviewScreen.jsx` — keep in sync |
| workspace_id nullable FK on recipes | Backward-compatible migration | ✓ Good |
| JSONB for dietary_tags | Hebrew string arrays without junction tables | ✓ Good |
| RecipeReviewScreen split-screen | Premium feel; preview left, edit form right | ✓ Good |
| og:image → thumbnail_url | IG iframes sometimes blocked; thumbnail fallback | ✓ Good |
| Dropped cook_time + equipment_needed | UX review found them noisy | ✓ Good |
| **Removed Apify, switched to RapidAPI** | Apify scraper unreliable/costly; RapidAPI covers IG/TikTok/YT | ✓ Good |
| **TikTok via Vercel proxy** | RapidAPI blocked Koyeb egress IPs; proxy unblocks | ✓ Good |
| **Express 5 wildcard `*` → `/.*/`** | path-to-regexp v6 rejects bare `*` | ✓ Fixed |
| **Workspace RPCs in `private` schema + INVOKER wrappers** | Supabase Advisor: keep privileged logic off the exposed API; RLS on all public tables | ✓ Current branch |

## Moonshot AI

Hebrew system prompt forces structured JSON. Output normalized against
`ALLOWED_CATEGORIES`, `ALLOWED_CUISINES`, `ALLOWED_DIETARY_TAGS`, `ALLOWED_MEAL_TYPES`
(source of truth: `server/src/services/moonshot.js`). Ingredients returned as
`{name, amount, unit}` objects.

## Two-step API pattern

`POST /api/extract-recipe` → AI preview (not saved). `POST /api/confirm-recipe` → saves
user-edited recipe. Nothing persists until the user clicks "אישור ושמירה".

---
*Last updated 2026-06-22 — refreshed from code after dropping the GSD workflow.*
