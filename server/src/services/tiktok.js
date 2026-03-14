/**
 * Walks a response object and tries every known field path for the caption text.
 * Logs the full structure so the path can be corrected if the API changes.
 */
function extractText(data) {
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
 * Extracts textual content (caption/description) from a TikTok video by calling
 * the Vercel proxy route (TIKTOK_PROXY_URL), which in turn calls RapidAPI from
 * Vercel's unblocked IP space.
 *
 * The proxy handles short-URL resolution and the RapidAPI call; this service
 * handles data extraction from the raw response.
 *
 * @param {string} url - TikTok URL (full or short)
 * @returns {Promise<{ text: string, thumbnailUrl: string|null }>}
 */
export async function scrapeTikTokContent(url) {
  const proxyUrl = process.env.TIKTOK_PROXY_URL;
  if (!proxyUrl) {
    throw new Error('TIKTOK_PROXY_URL is not configured — set it in Koyeb env vars');
  }

  console.log('[tiktok] Calling Vercel proxy:', proxyUrl, 'for URL:', url);

  const headers = { 'Content-Type': 'application/json' };
  const secret = process.env.TIKTOK_PROXY_SECRET;
  if (secret) headers['x-proxy-secret'] = secret;

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[tiktok] Proxy returned HTTP ${res.status}. Body:`, body.slice(0, 500));
    const err = new Error(`TikTok proxy failed: ${res.status} ${res.statusText}`);
    err.upstreamStatus = res.status;
    throw err;
  }

  const data = await res.json();
  const text = extractText(data);
  if (!text) throw new Error('No caption found in TikTok RapidAPI response');

  const thumbnailUrl = extractThumbnail(data);
  return { text, thumbnailUrl };
}
