import { scrapeInstagramCaption } from './scraper.js';
import { scrapeTikTokContent } from './tiktok.js';
import { persistThumbnail, isManagedThumbnailUrl } from './thumbnailStorage.js';
import { supabase } from './supabase.js';

function detectSourceType(sourceUrl) {
  if (/(?:youtube\.com|youtu\.be)/i.test(sourceUrl ?? '')) return 'youtube';
  if (/tiktok\.com/i.test(sourceUrl ?? '')) return 'tiktok';
  if (/instagram\.com/i.test(sourceUrl ?? '')) return 'instagram';
  return 'unknown';
}

async function resolveFreshThumbnail(row) {
  const sourceType = detectSourceType(row.instagram_url);

  // YouTube thumbnail URLs are stable and can be copied directly.
  if (sourceType === 'youtube') return row.thumbnail_url;
  if (sourceType === 'tiktok') {
    const result = await scrapeTikTokContent(row.instagram_url);
    return result.thumbnailUrl;
  }
  if (sourceType === 'instagram') {
    const result = await scrapeInstagramCaption(row.instagram_url);
    return result.thumbnailUrl;
  }

  throw new Error(`Unsupported recipe source URL: ${row.instagram_url}`);
}

export async function backfillThumbnailRows(rows, {
  isManaged = isManagedThumbnailUrl,
  resolveThumbnail = resolveFreshThumbnail,
  persist = persistThumbnail,
  updateThumbnail,
  logger = console,
}) {
  if (typeof updateThumbnail !== 'function') {
    throw new Error('updateThumbnail dependency is required');
  }

  const summary = { repaired: 0, skipped: 0, failed: 0 };

  for (const row of rows) {
    if (!row.thumbnail_url || isManaged(row.thumbnail_url)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const freshThumbnailUrl = await resolveThumbnail(row);
      if (!freshThumbnailUrl) throw new Error('Source scraper returned no thumbnail');

      const durableUrl = await persist({
        sourceUrl: row.instagram_url,
        thumbnailUrl: freshThumbnailUrl,
      });
      await updateThumbnail(row.id, durableUrl);
      summary.repaired += 1;
    } catch (error) {
      summary.failed += 1;
      logger.warn(`[thumbnail-backfill] Recipe ${row.id} failed:`, error?.message ?? String(error));
    }
  }

  return summary;
}

async function loadThumbnailRows(client, pageSize = 500) {
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('recipes')
      .select('id, instagram_url, thumbnail_url')
      .not('thumbnail_url', 'is', null)
      .order('id')
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Thumbnail backfill query failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function runThumbnailBackfill({ client = supabase, logger = console } = {}) {
  const rows = await loadThumbnailRows(client);

  return backfillThumbnailRows(rows, {
    logger,
    updateThumbnail: async (recipeId, thumbnailUrl) => {
      const { error } = await client
        .from('recipes')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', recipeId);
      if (error) throw new Error(`Recipe thumbnail update failed: ${error.message}`);
    },
  });
}
