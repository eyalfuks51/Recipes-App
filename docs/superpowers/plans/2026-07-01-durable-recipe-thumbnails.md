# Durable Recipe Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace expiring social-media CDN thumbnail URLs with durable Supabase Storage URLs and repair existing saved recipes.

**Architecture:** A focused thumbnail storage service validates and copies scraper-provided image bytes into a public bucket. The extraction route uses that service fail-soft, while a separate backfill service refreshes unmanaged existing rows sequentially.

**Tech Stack:** Node.js 20 ESM, Express 5, Supabase JS 2.98, Supabase CLI migrations, Node built-in test runner.

## Global Constraints

- Do not change gallery or modal rendering contracts; `recipes.thumbnail_url` remains the sole persisted field.
- Never fetch a client-supplied thumbnail URL from `/confirm-recipe`.
- Accept only HTTPS URLs on the approved social image host allowlist.
- Accept only JPEG, PNG, and WebP up to 8 MiB.
- Preserve recipe extraction when thumbnail persistence fails by returning `null` for the thumbnail.
- Leave the unrelated untracked `video/` directory untouched.

---

### Task 1: Storage bucket migration

**Files:**
- Create: `supabase/migrations/20260701000000_recipe_thumbnails_bucket.sql`

**Interfaces:**
- Produces: public bucket `recipe-thumbnails`, 8 MiB limit, MIME allowlist.

- [ ] Write an idempotent migration inserting/updating `storage.buckets`.
- [ ] Run `supabase db push --dry-run` and confirm only the new migration is pending.
- [ ] Apply it with `supabase db push` and verify the migration list is synchronized.

### Task 2: Thumbnail persistence service

**Files:**
- Create: `server/src/__tests__/thumbnailStorage.test.js`
- Create: `server/src/services/thumbnailStorage.js`

**Interfaces:**
- Produces: `persistThumbnail({ sourceUrl, thumbnailUrl, fetchImpl? }): Promise<string>`.
- Produces: `isManagedThumbnailUrl(url): boolean`.

- [ ] Write failing tests for successful upload/public URL, unsupported host,
      invalid MIME type, and oversized payload.
- [ ] Run `node --test src/__tests__/thumbnailStorage.test.js` and confirm the
      missing-module failure.
- [ ] Implement URL validation, timed image download, size/MIME validation,
      deterministic object naming, upload, and public URL retrieval.
- [ ] Run the focused test and then all server tests.

### Task 3: Extraction-route integration

**Files:**
- Create: `server/src/__tests__/thumbnailPipeline.test.js`
- Modify: `server/src/routes/recipe.js`
- Create: `server/src/services/thumbnailPipeline.js`

**Interfaces:**
- Consumes: `persistThumbnail(...)` from Task 2.
- Produces: `stabilizeThumbnail({ sourceUrl, thumbnailUrl, persist? }): Promise<string|null>`.

- [ ] Write failing tests proving a durable URL is returned on success and
      `null` is returned when persistence fails.
- [ ] Implement the fail-soft pipeline helper.
- [ ] Call it after source scraping and before returning the extraction result.
- [ ] Run focused and full server tests.

### Task 4: Existing-recipe backfill

**Files:**
- Create: `server/src/__tests__/thumbnailBackfill.test.js`
- Create: `server/src/services/thumbnailBackfill.js`
- Create: `server/scripts/backfill-thumbnails.js`
- Modify: `server/package.json`

**Interfaces:**
- Consumes: existing source scrapers and Task 2 persistence service.
- Produces: `backfillThumbnailRows(rows, dependencies): Promise<{repaired:number,skipped:number,failed:number}>`.
- Produces: `npm run backfill-thumbnails`.

- [ ] Write failing tests for unmanaged repair, managed skip, and per-row failure.
- [ ] Implement source thumbnail refresh and sequential row processing.
- [ ] Add an executable runner that loads recipes, invokes the service, updates
      `thumbnail_url`, and exits nonzero only for setup/query failures.
- [ ] Run focused and full server tests.
- [ ] Execute the backfill against the linked project and record its summary.

### Task 5: Final verification and handoff

**Files:**
- Modify: `.planning/STATE.md` only if the final implementation materially
  changes the documented current architecture.

**Interfaces:**
- Produces: verified branch ready for review.

- [ ] Run `node --test` in `server/`.
- [ ] Run `npm test` and `npm run build` in `client/`.
- [ ] Inspect `git diff --check`, `git status --short`, and the scoped diff.
- [ ] Commit only task files, push `fix/durable-recipe-thumbnails`, and remind
      the user to open a Pull Request. Do not merge.
