# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Run server (node src/index.js)
node --test            # Run all tests (Node.js built-in test runner)
node --test src/__tests__/moonshot.test.js   # Run a single test file
```

Note: `npm test` is not configured — use `node --test` directly. No build step — ESM source runs directly. No linter configured.

## Architecture

Express 5 server that powers a recipe extraction pipeline: Instagram URL → scrape caption → AI extraction → Supabase storage.

### Request Flow

Entry point: `src/index.js` → single route file `src/routes/recipe.js`. Health check at `GET /health`.

Two API flows exist:

1. **One-shot:** `POST /api/process-recipe` — scrape + extract + save in one call
2. **Two-step (primary):** `POST /api/extract-recipe` (scrape + AI, returns preview) → `POST /api/confirm-recipe` (user-edited data saved to DB)

### Service Layer (`src/services/`)

- **scraper.js** — Orchestrator: scrapes Instagram captions via RapidAPI. Also fetches `og:image` thumbnail.
- **moonshot.js** — Moonshot AI via OpenAI-compatible SDK. Hebrew system prompt. Normalizes output against `ALLOWED_CATEGORIES`, `ALLOWED_CUISINES`, `ALLOWED_DIETARY_TAGS`, `ALLOWED_MEAL_TYPES` enums. These enums are duplicated in the client's `RecipeEditForm.jsx`.
- **supabase.js** — Proxy-based lazy client (defers initialization so tests can import without env vars). Uses `global.__mockSupabaseClient` for test injection. `saveRecipe` does a 3-step upsert: recipe → ingredients → junction rows. Uses optional-spread pattern for nullable fields.

### Testing Patterns

Tests use Node.js built-in `node:test` and `node:assert/strict`. No jest/vitest.

Mocking strategy for ES modules: inject mocks via `global.__mockOpenAICreate` (moonshot) and `global.__mockSupabaseClient` (supabase). Module cache busting via dynamic `import('...?t=' + Date.now())`.

### Environment Variables

Required in `.env`: `MOONSHOT_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `RAPIDAPI_KEY`. Optional: `PORT` (default 3000).

### Deployment

Docker → Koyeb. `Dockerfile` uses `node:20-alpine`, `npm ci --omit=dev`. Env vars must be set in Koyeb dashboard separately from `.env`.

### Key Conventions

- ESM throughout (`"type": "module"` in package.json)
- All recipe content and AI prompts are in Hebrew
- Ingredient names normalized to lowercase + trimmed before DB storage
- `instagram_url` is the unique key for recipe deduplication (upsert on conflict)
