// Direct ESM import — the package's main field incorrectly points to CJS dist
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

/**
 * Extracts the 11-character video ID from various YouTube URL formats.
 * Handles watch?v=, youtu.be/, /shorts/, and /embed/ patterns.
 * @param {string} url
 * @returns {string} videoId
 */
export function extractYouTubeVideoId(url) {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  throw new Error(`Could not extract video ID from YouTube URL: ${url}`);
}

/**
 * Fetches the video description via RapidAPI as a fallback.
 * @param {string} videoId
 * @returns {Promise<string>} description text
 */
async function fetchDescriptionRapidAPI(videoId) {
  const host = process.env.RAPIDAPI_YOUTUBE_HOST ?? 'ytstream-download-youtube-videos.p.rapidapi.com';
  const res = await fetch(
    `https://${host}/dl?id=${videoId}`,
    {
      headers: {
        'x-rapidapi-host': host,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) throw new Error(`YouTube RapidAPI failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data?.status !== 'OK') throw new Error(`YouTube RapidAPI returned status: ${data?.status}`);
  const text = [data?.title, data?.description].filter(Boolean).join('\n');
  if (!text) throw new Error('No content found in YouTube RapidAPI response');
  return text;
}

/**
 * Scrapes the YouTube page directly to extract title + description.
 * Free fallback — no API key required. Works for watch, shorts, and embed URLs.
 * Extracts from ytInitialData embedded in the page script tags.
 * @param {string} videoId
 * @returns {Promise<string>} title + description text
 */
async function fetchDescriptionFromPage(videoId) {
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(20_000),
    }
  );
  if (!res.ok) throw new Error(`YouTube page fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();

  // Extract full description from ytInitialData JSON embedded in the page
  const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      // Description lives at: engagementPanels[].header.engagementPanelTitleHeaderRenderer
      // More reliably: videoDetails is in ytInitialPlayerResponse, but description is in
      // the attributedDescriptionBodyText runs array inside videoSecondaryInfoRenderer
      const runs =
        data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
          ?.find(c => c.videoSecondaryInfoRenderer)
          ?.videoSecondaryInfoRenderer?.attributedDescription?.content;
      const title =
        data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
          ?.find(c => c.videoPrimaryInfoRenderer)
          ?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text;
      if (runs || title) {
        return [title, runs].filter(Boolean).join('\n');
      }
    } catch {
      // fall through to meta tag extraction
    }
  }

  // Fallback within fallback: og:title + og:description meta tags
  const title = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  const desc = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
  const text = [title, desc].filter(Boolean).join('\n');
  if (!text) throw new Error('No content found on YouTube page');
  return text;
}

/**
 * Extracts textual content from a YouTube video.
 * Primary: spoken transcript via youtube-transcript.
 * Fallback: video description via RapidAPI.
 * @param {string} url - Full YouTube URL
 * @returns {Promise<{ text: string, thumbnailUrl: string, videoId: string }>}
 */
export async function scrapeYouTubeContent(url) {
  const videoId = extractYouTubeVideoId(url);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  let text;
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    text = segments.map((s) => s.text).join(' ');
    console.log('[youtube] Transcript extracted via youtube-transcript');
  } catch (primaryErr) {
    console.warn('[youtube] Transcript failed, falling back to RapidAPI:', primaryErr.message);
    try {
      text = await fetchDescriptionRapidAPI(videoId);
      console.log('[youtube] Description extracted via RapidAPI');
    } catch (rapidErr) {
      console.warn('[youtube] RapidAPI failed, falling back to page scrape:', rapidErr.message);
      text = await fetchDescriptionFromPage(videoId);
      console.log('[youtube] Description extracted via page scrape');
    }
  }

  return { text, thumbnailUrl, videoId };
}
