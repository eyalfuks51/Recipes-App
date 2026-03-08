# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start server:** `npm start` (runs `node src/index.js`, no `dev` script)
- **Run all tests:** `node --test src/__tests__/` (uses Node.js built-in test runner, no jest/vitest)
- **Run single test:** `node --test src/__tests__/moonshot.test.js`
- **Build for production:** `docker build -t recipes-server .` (Node 20 Alpine)
- **No linter configured.**

## Environment Variables

Required in `.env` (loaded via `dotenv/config`):
- `SUPABASE_URL`, `SUPABASE_KEY` — Supabase project credentials
- `MOONSHOT_API_KEY` — Moonshot AI API key (OpenAI-compatible endpoint at `api.moonshot.ai/v1`)
- `APIFY_TOKEN` — Apify API token for Instagram scraping
- `PORT` — optional, defaults to 3000

## Architecture

ESM-only Node.js + Express 5 server. Entry point: `src/index.js`.

### Request Flow (Two-Step Recipe Pipeline)

1. **`POST /api/extract-recipe`** — Scrapes Instagram caption via Apify, sends it to Moonshot AI for structured extraction, returns preview JSON to client (no DB write).
2. **`POST /api/confirm-recipe`** — Client sends user-edited recipe data, server saves to Supabase.
3. **`POST /api/process-recipe`** — Legacy single-step endpoint (scrape + extract + save in one call).

### Services (`src/services/`)

- **`scraper.js`** — Thin re-export from `apify.js`. Previously had RapidAPI-first logic; now Apify-only.
- **`apify.js`** — Calls Apify's `instagram-scraper` actor synchronously with a 5-minute timeout. Normalizes URLs to include `www.` prefix.
- **`moonshot.js`** — Sends caption to Moonshot AI (`moonshot-v1-8k` model) with a Hebrew system prompt. Returns structured JSON with title, category, difficulty, ingredients, instructions, cuisine, meal_type, dietary_tags, etc. Normalizes AI output against `ALLOWED_*` enums (fallback to defaults). These enums are duplicated in the client's `RecipeEditForm.jsx`.
- **`supabase.js`** — Lazy-initialized Supabase client via Proxy pattern. `saveRecipe()` does a 3-step upsert: recipe row -> ingredient rows -> junction rows. Uses optional-spread pattern (`...(field != null ? { field } : {})`) for nullable columns.

### Testing Pattern

Tests use Node.js built-in `node:test` + `node:assert/strict`. Mocking is done via globals (`global.__mockOpenAICreate`, `global.__mockSupabaseClient`) — no DI framework. Module re-imports use cache-busting query strings (`?t=Date.now()`).

### Deployment

Dockerized on Koyeb. The Dockerfile uses `node:20-alpine` and `npm ci --omit=dev`.

## Key Conventions

- All recipe content and AI prompts are in **Hebrew**.
- The `ingredients` table stores lowercase-trimmed names; deduplication is handled by upsert on `name`.
- Recipes are deduplicated by `instagram_url` (unique constraint).
- The client reads Supabase directly for the gallery — the server is only used for scraping and AI extraction.
