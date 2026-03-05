/**
 * Scrapes an Instagram post caption using Apify's instagram-scraper actor.
 * @param {string} instagramUrl - The Instagram post URL
 * @returns {Promise<string>} The post caption
 * @throws {Error} If no caption is found
 */
export async function scrapeInstagramCaption(instagramUrl) {
  // Normalize URL to include www. prefix (required by Apify actor)
  const normalizedUrl = instagramUrl.replace(
    /^(https?:\/\/)((?!www\.))/,
    '$1www.'
  );

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: [normalizedUrl],
        resultsType: 'posts',
        resultsLimit: 1,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify request failed: ${response.status} ${response.statusText}`);
  }

  const items = await response.json();

  if (!items || items.length === 0 || !items[0].caption) {
    throw new Error('No caption found for this Instagram post');
  }

  return items[0].caption;
}
