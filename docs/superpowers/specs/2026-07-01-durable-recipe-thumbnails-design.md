# Durable Recipe Thumbnails Design

## Problem

Instagram and TikTok scrapers return signed CDN URLs. The application stores
those URLs in `recipes.thumbnail_url` and renders them directly later. Once a
signature expires, the CDN correctly returns HTTP 403 and saved recipe cards
lose their image.

## Outcome

Every newly extracted social thumbnail is copied into application-owned
Supabase Storage before it reaches the client. Existing recipes with unmanaged
thumbnail URLs can be repaired once with a backfill command.

## Architecture

- A public Supabase Storage bucket named `recipe-thumbnails` stores JPEG, PNG,
  and WebP files up to 8 MiB.
- `server/src/services/thumbnailStorage.js` validates scraper-provided image
  URLs, downloads the bytes with a timeout, verifies MIME type and size, and
  uploads them with `upsert: true`.
- Object paths are deterministic: `<source-type>/<sha256(source-url)>.<ext>`.
  Re-extracting a recipe refreshes the same object rather than creating copies.
- The extraction route replaces the temporary scraper URL with the resulting
  Supabase public URL. Thumbnail persistence is fail-soft: recipe extraction
  continues with `thumbnail_url: null` when storage is unavailable or the
  upstream response is not a valid image.
- A backfill service and executable script select recipes whose thumbnail URL
  is not already managed, obtain a fresh source thumbnail when necessary,
  persist it, and update only `recipes.thumbnail_url`.

## Security and Reliability

- Only HTTPS image URLs on known Instagram, Facebook CDN, TikTok CDN, and
  YouTube thumbnail hosts are accepted.
- Client-supplied URLs are never fetched by the storage service during recipe
  confirmation; persistence runs on values returned by backend scrapers.
- Content type and post-download byte length are checked before upload.
- Storage or per-row backfill failures are logged without aborting unrelated
  recipe extraction or backfill rows.

## Data Flow

1. The existing scraper returns recipe text and a temporary thumbnail URL.
2. The backend validates, downloads, and uploads the image.
3. Supabase returns an application-owned public URL.
4. The extraction response carries that stable URL through review and save.
5. Gallery and modal rendering remain unchanged.

## Existing Data

The backfill runs sequentially to avoid unnecessary pressure on RapidAPI. It
skips null and already-managed URLs, re-scrapes Instagram/TikTok sources to
replace expired CDN signatures, and can reuse stable YouTube thumbnail URLs.
It reports repaired, skipped, and failed counts and is safe to rerun.

## Verification

- Unit tests cover stable upload URLs, host/MIME/size rejection, and fail-soft
  extraction behavior.
- Backfill tests cover repair, managed-URL skipping, and per-row failures.
- The full server tests, client tests, and production client build must pass.
- The Supabase migration is dry-run, pushed through the linked CLI project,
  and verified by querying the bucket through the CLI-supported database path.
