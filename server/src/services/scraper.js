/**
 * Fetches the og:image URL from an Instagram post page.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchOgImage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts the shortcode from an Instagram post URL.
 * Handles /p/, /reel/, /reels/, and /tv/ formats.
 * @param {string} instagramUrl
 * @returns {string} shortcode
 */
function extractShortcode(instagramUrl) {
  const match = instagramUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`Could not extract shortcode from URL: ${instagramUrl}`);
  return match[1];
}

/**
 * Attempts to scrape the caption via RapidAPI.
 * @param {string} instagramUrl
 * @returns {Promise<string>} caption text
 */
async function scrapeWithRapidAPI(instagramUrl) {
  const shortcode = extractShortcode(instagramUrl);

  const response = await fetch(
    `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/post?shortcode=${shortcode}`,
    {
      headers: {
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      },
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const caption = data?.caption?.text;

  if (!caption) throw new Error('No caption found in RapidAPI response');

  // Extract thumbnail from the API response payload
  const thumbnailUrl =
    data?.thumbnail_url ||
    data?.display_url ||
    data?.image_versions2?.candidates?.[0]?.url ||
    null;

  return { caption, thumbnailUrl };
}

/**
 * Scrapes an Instagram post caption via RapidAPI.
 * @param {string} instagramUrl
 * @returns {Promise<{caption: string, thumbnailUrl: string|null}>}
 */
export async function scrapeInstagramCaption(instagramUrl) {
  const { caption, thumbnailUrl: rapidApiThumbnail } = await scrapeWithRapidAPI(instagramUrl);
  console.log('[scraper] RapidAPI succeeded');
  // Use thumbnail from RapidAPI payload if available, fall back to og:image scraping
  const thumbnailUrl = rapidApiThumbnail ?? await fetchOgImage(instagramUrl);
  return { caption, thumbnailUrl };
}
