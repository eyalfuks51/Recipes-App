/**
 * Follows redirects on a short TikTok URL (vm.tiktok.com, vt.tiktok.com)
 * to recover the full tiktok.com/@user/video/ID URL.
 * @param {string} shortUrl
 * @returns {Promise<string>} expanded URL
 */
async function resolveShortUrl(shortUrl) {
  const res = await fetch(shortUrl, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  // res.url is the final URL after all redirects
  return res.url;
}


/**
 * Walks a response object and tries every known field path for the caption text.
 * Logs the full structure so the path can be corrected if the API changes.
 */
function extractText(data) {
  // Log the top-level keys to help diagnose shape mismatches
  console.log('[tiktok] Response top-level keys:', Object.keys(data ?? {}));

  const candidates = [
    data?.data?.desc,
    data?.data?.aweme_detail?.desc,
    data?.aweme_detail?.desc,
    data?.data?.item?.desc,
    data?.item?.desc,
    data?.data?.title,
    data?.title,
  ];

  const text = candidates.find((v) => typeof v === 'string' && v.trim().length > 0) ?? '';
  if (!text) {
    // Log the raw payload (truncated) so the correct path can be identified
    console.error('[tiktok] Could not find caption. Raw response (first 1000 chars):',
      JSON.stringify(data).slice(0, 1000));
  }
  return text;
}

/**
 * Walks a response object and tries every known field path for the thumbnail URL.
 */
function extractThumbnail(data) {
  return (
    data?.data?.video?.cover?.url_list?.[0] ||
    data?.data?.aweme_detail?.video?.cover?.url_list?.[0] ||
    data?.aweme_detail?.video?.cover?.url_list?.[0] ||
    data?.data?.video?.dynamic_cover?.url_list?.[0] ||
    null
  );
}

/**
 * Extracts textual content (caption/description) from a TikTok video via RapidAPI.
 * Uses the "Tiktok Scraper" API (tiktok-scraper7.p.rapidapi.com) /video/detail endpoint.
 * Resolves vm.tiktok.com / vt.tiktok.com short links before extracting the video ID.
 * @param {string} url - TikTok URL (full or short)
 * @returns {Promise<{ text: string, thumbnailUrl: string|null }>}
 */
export async function scrapeTikTokContent(url) {
  const host = process.env.RAPIDAPI_TIKTOK_HOST ?? 'tiktok-scraper7.p.rapidapi.com';

  // Resolve short links before trying to extract the video ID
  let resolvedUrl = url;
  if (/(?:vm|vt)\.tiktok\.com/.test(url)) {
    console.log('[tiktok] Resolving short URL:', url);
    resolvedUrl = await resolveShortUrl(url);
    console.log('[tiktok] Resolved to:', resolvedUrl);
  }

  const endpoint = `https://${host}/?url=${encodeURIComponent(resolvedUrl)}`;
  console.log('[tiktok] Calling:', endpoint);

  const res = await fetch(endpoint, {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[tiktok] RapidAPI HTTP ${res.status}. Body:`, body.slice(0, 500));
    throw new Error(`TikTok RapidAPI failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = extractText(data);
  if (!text) throw new Error('No caption found in TikTok RapidAPI response');

  const thumbnailUrl = extractThumbnail(data);
  return { text, thumbnailUrl };
}
