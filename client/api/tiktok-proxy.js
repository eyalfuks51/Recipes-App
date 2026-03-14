/**
 * Vercel serverless function — TikTok RapidAPI proxy.
 *
 * Koyeb's datacenter IPs are blocked by RapidAPI's TikTok scraper.
 * This function runs on Vercel's infrastructure (unblocked IPs) and
 * acts as a thin proxy: it resolves short TikTok URLs, calls RapidAPI,
 * and returns the raw JSON response to the Koyeb backend for processing.
 *
 * Security: requests must include the X-Proxy-Secret header matching
 * the TIKTOK_PROXY_SECRET environment variable (set in both Vercel and Koyeb).
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Shared-secret guard — prevents public misuse of this proxy
  const secret = process.env.TIKTOK_PROXY_SECRET;
  if (secret && req.headers['x-proxy-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url } = req.body ?? {};
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    const host = process.env.RAPIDAPI_TIKTOK_HOST ?? 'tiktok-scraper7.p.rapidapi.com';

    // Resolve short links (vm.tiktok.com / vt.tiktok.com) from Vercel's IPs
    let resolvedUrl = url;
    if (/(?:vm|vt)\.tiktok\.com/.test(url)) {
      console.log('[tiktok-proxy] Resolving short URL:', url);
      resolvedUrl = await resolveShortUrl(url);
      console.log('[tiktok-proxy] Resolved to:', resolvedUrl);
    }

    const endpoint = `https://${host}/?url=${encodeURIComponent(resolvedUrl)}`;
    console.log('[tiktok-proxy] Calling RapidAPI:', endpoint);

    const apiRes = await fetch(endpoint, {
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

    if (!apiRes.ok) {
      const body = await apiRes.text();
      console.error(`[tiktok-proxy] RapidAPI HTTP ${apiRes.status}. Body:`, body.slice(0, 500));
      return res.status(502).json({
        error: `RapidAPI returned ${apiRes.status} ${apiRes.statusText}`,
        detail: body.slice(0, 500),
      });
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    console.error('[tiktok-proxy] Error:', err?.message);
    return res.status(isTimeout ? 504 : 500).json({ error: err?.message ?? String(err) });
  }
}
