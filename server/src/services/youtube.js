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
  const host = process.env.RAPIDAPI_YOUTUBE_HOST ?? 'youtube138.p.rapidapi.com';
  const res = await fetch(
    `https://${host}/video/details/?id=${videoId}&hl=en&gl=US`,
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
  const text = [data?.title, data?.description].filter(Boolean).join('\n');
  if (!text) throw new Error('No content found in YouTube RapidAPI response');
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
    text = await fetchDescriptionRapidAPI(videoId);
    console.log('[youtube] Description extracted via RapidAPI');
  }

  return { text, thumbnailUrl, videoId };
}
