---
phase: quick-1
plan: 01
subsystem: frontend-components, backend-pipeline
tags: [bug-fix, css, ux, media, thumbnail, instagram]
dependency_graph:
  requires: []
  provides: [sticky-footer-actions, safe-instructions-render, 9-16-media-container, og-image-thumbnail-pipeline]
  affects: [RecipeReviewScreen, RecipeModal, scraper, recipe-routes, supabase-saveRecipe]
tech_stack:
  added: []
  patterns: [aspect-ratio-container, sticky-flex-footer, og-image-fetch, thumbnail-play-button]
key_files:
  created:
    - supabase/migrations/20260308_thumbnail_url.sql
  modified:
    - client/src/components/RecipeReviewScreen.jsx
    - client/src/components/RecipeReviewScreen.scss
    - client/src/components/RecipeModal.jsx
    - client/src/components/RecipeModal.scss
    - client/src/components/SubmitForm.jsx
    - server/src/services/scraper.js
    - server/src/routes/recipe.js
    - server/src/services/supabase.js
decisions:
  - "Moved review-actions outside <form> and used form='review-form' attribute on submit button for sticky footer without breaking form submission"
  - "scrapeInstagramCaption now returns {caption, thumbnailUrl} object — all callers updated (process-recipe destructures only caption)"
  - "thumbnail preferred over iframe in both review and modal; iframe is the fallback, not the primary"
metrics:
  duration: ~15 minutes
  completed: 2026-03-07
  tasks_completed: 4
  files_changed: 8
---

# Quick Task 1: Fix Phase 6 Visual Regressions — CSS Layout & Media Summary

One-liner: Sticky footer for review screen actions, safe array/empty instructions rendering, 9:16 aspect-ratio media containers, and og:image thumbnail pipeline replacing blocked Instagram iframes.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Sticky footer + CSS layout for RecipeReviewScreen | 841c997 | RecipeReviewScreen.jsx, RecipeReviewScreen.scss |
| 2 | Empty instructions fix + 9:16 aspect ratio in RecipeModal | 09bc636 | RecipeModal.jsx, RecipeModal.scss |
| 3 | Backend og:image extraction + thumbnail_url pipeline | 0e95973 | scraper.js, recipe.js, supabase.js, migration |
| 4 | Smart media container with thumbnail + play button | fc5735c | RecipeReviewScreen.jsx/.scss, SubmitForm.jsx |

## Changes Made

### Task 1: RecipeReviewScreen sticky footer
- Extracted `.review-actions` div **outside** the `<form>` element
- Added `id="review-form"` to form; submit button uses `form="review-form"` attribute
- `.review-right` now uses `display: flex; flex-direction: column; height: 100%; overflow: hidden`
- `.review-form` (new class on form element) has `flex: 1; overflow-y: auto; padding: 32px`
- `.review-actions` has `flex-shrink: 0` so it is always pinned to bottom
- Removed `max-width: 600px` from `.review-right` to fix input clipping
- Mobile: `.review-form` padding `20px 16px`; `.review-actions` padding `12px 16px`

### Task 2: RecipeModal instructions + media
- Instructions block now guards on `Array.isArray()`: empty array renders nothing, populated array renders `<ol>` with Hebrew heading "הוראות הכנה", plain string falls back to `<p>`
- Wrapped `modal-left` content in `.modal-media-container` with `aspect-ratio: 9/16` — never collapses
- Added `.modal-thumbnail-link`, `.modal-thumbnail-img`, `.modal-play-btn` styles
- Thumbnail preferred when `recipe.thumbnail_url` present; iframe fallback otherwise

### Task 3: Backend thumbnail pipeline
- `fetchOgImage(url)` added to `scraper.js` — fetches og:image meta tag via HTTP with 5s timeout
- `scrapeInstagramCaption` now returns `{ caption, thumbnailUrl }` instead of plain string
- `/api/process-recipe` destructures `{ caption }` only (no change in behavior)
- `/api/extract-recipe` response now includes `thumbnail_url: thumbnailUrl ?? null`
- `/api/confirm-recipe` accepts `thumbnail_url` from body and passes to `saveRecipe`
- `saveRecipe` spreads `thumbnail_url` into upsert when not null
- Migration `20260308_thumbnail_url.sql`: `ALTER TABLE recipes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`

### Task 4: Review screen thumbnail + play button
- `.review-media-container` added with `aspect-ratio: 9/16` containing all media states
- When `thumbnailUrl` prop present: shows `<img>` with play button SVG overlay, links to Instagram in new tab
- When no thumbnail: falls back to iframe or text fallback, all within the 9:16 container
- `SubmitForm.jsx` passes `thumbnailUrl={extractedRecipe.thumbnail_url ?? null}` to `RecipeReviewScreen`
- `RecipeReviewScreen` sends `thumbnail_url` in the confirm-recipe POST body

## Verification

- `cd client && npm run build` — passed, 0 errors, 0 warnings
- Build output: 349 kB JS, 24 kB CSS

## Deviations from Plan

None — plan executed exactly as written. The `process-recipe` legacy endpoint was also updated to destructure `{ caption }` from the new return shape (Rule 3 — blocking issue prevented by updating the caller).

## Success Criteria Met

- [x] Action buttons always visible in review screen without scrolling
- [x] Empty instructions never render as "[]"
- [x] Media containers never collapse — 9:16 aspect ratio enforced
- [x] Recipes with thumbnail_url show image + play button; clicking opens Instagram in new tab
- [x] Recipes without thumbnail_url fall back to iframe within same 9:16 container
- [x] Backend returns and persists thumbnail_url; DB has thumbnail_url column

## Self-Check: PASSED

Commits verified:
- 841c997 — Task 1 (sticky footer)
- 09bc636 — Task 2 (modal instructions + 9:16)
- 0e95973 — Task 3 (backend pipeline)
- fc5735c — Task 4 (review screen thumbnail)

Key files verified present:
- client/src/components/RecipeReviewScreen.jsx
- client/src/components/RecipeModal.jsx
- server/src/services/scraper.js
- supabase/migrations/20260308_thumbnail_url.sql
