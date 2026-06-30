import { persistThumbnail } from './thumbnailStorage.js';

/**
 * Converts a scraper thumbnail into a durable application-owned URL.
 * Thumbnail failures must never prevent recipe extraction.
 */
export async function stabilizeThumbnail({
  sourceUrl,
  thumbnailUrl,
  persist = persistThumbnail,
  logger = console,
}) {
  if (!thumbnailUrl) return null;

  try {
    return await persist({ sourceUrl, thumbnailUrl });
  } catch (error) {
    logger.warn('[thumbnail] Persistence failed; continuing without thumbnail:', error?.message ?? String(error));
    return null;
  }
}
