# Phase 10: Multi-Platform Media Scraping — COMPLETE 2026-03-14

## Goal

Expand recipe extraction beyond Instagram to support YouTube and TikTok video sources. Generalize the scraping layer to be source-agnostic, detect URL platform on the frontend, and render appropriate embedded previews per platform.

## What Was Built

### Server — New Scrapers

#### `server/src/services/youtube.js` — Triple-Fallback Architecture

Extraction attempts three strategies in order, stopping at the first success:

**Option A — Transcript (Primary)**
- Uses `youtube-transcript` npm package to fetch auto-generated captions
- Returns full spoken-word transcript, highest quality input for AI
- Fails when: transcript/captions are disabled on the video (common on Shorts)

**Option B — RapidAPI `ytstream-download-youtube-videos` (Secondary)**
- Calls `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id={videoId}`
- Returns `{ status, title, description, keywords, ... }` — uses `title + description` as text
- Requires `RAPIDAPI_KEY` env var and an active subscription to "YTStream - Download YouTube Videos" on RapidAPI
- Works for both standard videos and Shorts
- Fails when: API key missing, subscription lapsed, or API returns non-OK status

**Option C — Raw HTML Page Scrape (Final safety net)**
- Fetches `https://www.youtube.com/watch?v={videoId}` directly with a browser User-Agent
- Primary extraction: parses `ytInitialData` JSON embedded in the page script tags — gets full description text from `videoSecondaryInfoRenderer.attributedDescription`
- Secondary extraction (fallback within fallback): reads `og:title` + `og:description` meta tags
- Requires no API key; works for all video types including Shorts
- Only fails if YouTube blocks the request entirely

**Env vars for YouTube:**
```
RAPIDAPI_KEY=...
RAPIDAPI_YOUTUBE_HOST=ytstream-download-youtube-videos.p.rapidapi.com
```

Other return values: `{ text, videoId, thumbnailUrl }` — thumbnail derived from `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`

#### `server/src/services/tiktok.js`
- Calls RapidAPI **Tiktok Scraper API** (`tiktok-scraper7.p.rapidapi.com`) at the root endpoint `/` with a `url` query parameter (full TikTok URL)
- Resolves `vm.tiktok.com` short-links before hitting the API — short-link resolution via HTTP redirect follow
- Normalises multi-shape API responses: handles both flat and nested `data.video` / `data.item_info` shapes
- Extracts caption/description text, video cover thumbnail, and video URL for AI processing
- Returns `{ text, thumbnailUrl, videoUrl, sourceUrl }`

#### Environment variables added (`.env` / `.env.example`)
```
RAPIDAPI_KEY=...
RAPIDAPI_TIKTOK_HOST=tiktok-scraper7.p.rapidapi.com
```

### Server — Route Generalisation (`server/src/routes/recipe.js`)

- `POST /api/extract-recipe` now detects URL platform via helper `detectPlatform(url)` — returns `'instagram' | 'youtube' | 'tiktok'`
- Dispatches to the correct scraper service based on detected platform
- Passes scraped `text` (transcript / caption / description) to Moonshot AI regardless of source
- Response shape unchanged: `{ recipe, sourceUrl, ... }` — frontend unaffected

#### `server/src/services/moonshot.js`
- System prompt updated from Instagram-specific Hebrew instructions to source-agnostic text processing
- No longer references "Instagram post" — now processes any video transcript or description

### Client — URL Detection & Platform Icons (`client/src/components/SubmitForm.jsx`)

- Live URL detection on input change: classifies typed URL as `instagram | youtube | tiktok | unknown`
- Platform-specific icon rendered next to input (Instagram camera, YouTube play, TikTok note)
- Placeholder text updates dynamically: "הדבק קישור לרסיפת Instagram/YouTube/TikTok..."
- `instagramUrl` request field renamed to `url` in the fetch payload to match generalised backend

### Client — Multi-Platform Previews (`client/src/components/RecipeReviewScreen.jsx`)

- Preview panel detects platform from `sourceUrl` returned by backend
- **YouTube**: renders `<iframe>` embed using video ID extracted from source URL
- **TikTok**: renders cover thumbnail image (no embeddable iframe available without script injection)
- **Instagram**: unchanged — existing oEmbed embed preserved
- Source URL on review screen now reads from backend response (`recipe.source_url`) rather than frontend form state

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| YouTube triple-fallback: transcript → RapidAPI → page scrape | Shorts often have transcripts disabled; RapidAPI may be unavailable; page scrape is always free but weakest signal |
| RapidAPI YouTube: `ytstream-download-youtube-videos` not `youtube138` | `youtube138` returned 404 for Shorts video IDs — `ytstream` confirmed working for both standard and Shorts |
| Page scrape targets `ytInitialData` JSON, not just meta tags | `og:description` truncates at ~200 chars; `ytInitialData` contains the full description needed for recipe extraction |
| TikTok short-link resolution server-side | `vm.tiktok.com` URLs return 301 — must resolve before RapidAPI call |
| Use caption/description as AI input (not audio transcription) | Transcript APIs for TikTok are not reliably available; captions are sufficient for recipe extraction |
| Root endpoint `/` with `url` param for tiktok-scraper7 | `/video/detail` endpoint does not exist on this host — root path is the correct API shape |
| `youtube-transcript` ESM import fix | Package uses named exports; required `import { YoutubeTranscript }` not default import |
| Source-agnostic moonshot prompt | Single system prompt handles any platform's text; no platform branching in AI layer |

## Packages Added

| Package | Where | Purpose |
|---------|-------|---------|
| `youtube-transcript` | server | Fetch YouTube video transcript by video ID |

---

## Minor Prerequisite: URL Filter State Management (completed immediately before this phase)

Before starting media scraping work, a small UX improvement was applied to the recipe gallery:

**What changed:** Filter state (meal type, category, cuisine, vibe tags) is now persisted in the URL as search parameters (`?mealType=...&category=...`) rather than local `useState`.

**Files changed:** `client/src/App.jsx` — replaced `useState` filter variables with `useSearchParams` from `react-router-dom`.

**Why it's here and not its own phase:** This was a ~10-line refactor that took under a minute. No backend changes, no new components, no planning required. Originally scoped as Phase 10 ("Gallery Filters"), but the full filter bar UI (meal type toggles, category multi-select, cuisine autocomplete, vibe tag pills with Supabase query integration) remains deferred to a future phase.
