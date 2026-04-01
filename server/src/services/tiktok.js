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
 * Follows redirects on a short TikTok URL to recover the full URL.
 * Used only in the local-dev direct path (production uses the Vercel proxy).
 */
async function resolveShortUrl(shortUrl) {
  const res = await fetch(shortUrl, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  return res.url;
}

/**
 * Calls RapidAPI directly. Used as the local-dev fallback when TIKTOK_PROXY_URL
 * is not set (local IPs are not blocked by RapidAPI).
 */
async function fetchFromRapidApiDirect(url) {
  const host = process.env.RAPIDAPI_TIKTOK_HOST ?? 'tiktok-scraper7.p.rapidapi.com';

  let resolvedUrl = url;
  if (/(?:vm|vt)\.tiktok\.com/.test(url)) {
    console.log('[tiktok] Resolving short URL:', url);
    resolvedUrl = await resolveShortUrl(url);
    console.log('[tiktok] Resolved to:', resolvedUrl);
  }

  const endpoint = `https://${host}/?url=${encodeURIComponent(resolvedUrl)}`;
  console.log('[tiktok] Calling RapidAPI directly (local dev):', endpoint);

  const res = await fetch(endpoint, {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.tiktok.com/',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[tiktok] RapidAPI HTTP ${res.status}. Body:`, body.slice(0, 500));
    const err = new Error(`TikTok RapidAPI failed: ${res.status} ${res.statusText}`);
    err.upstreamStatus = res.status;
    throw err;
  }

  return res.json();
}

/**
 * Extracts textual content (caption/description) from a TikTok video.
 *
 * Production: calls the Vercel proxy (TIKTOK_PROXY_URL) which runs on unblocked
 * Vercel IPs and forwards the request to RapidAPI.
 *
 * Local dev: if TIKTOK_PROXY_URL is not set, calls RapidAPI directly (local IPs
 * are not blocked). Requires RAPIDAPI_KEY in the local .env.
 *
 * @param {string} url - TikTok URL (full or short)
 * @returns {Promise<{ text: string, thumbnailUrl: string|null }>}
 */
export async function scrapeTikTokContent(url) {
  const proxyUrl = process.env.TIKTOK_PROXY_URL;

  let data;
  if (proxyUrl) {
    // Production path — route through Vercel proxy
    console.log('[tiktok] Calling Vercel proxy for URL:', url);

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

    data = await res.json();
  } else {
    // Local dev path — call RapidAPI directly (local IPs are not blocked)
    console.log('[tiktok] TIKTOK_PROXY_URL not set — using direct RapidAPI call (local dev mode)');
    data = await fetchFromRapidApiDirect(url);
  }

  const text = extractText(data);
  if (!text) throw new Error('No caption found in TikTok RapidAPI response');

  const thumbnailUrl = extractThumbnail(data);
  return { text, thumbnailUrl };
}
