import { createHash } from 'node:crypto';
import { supabase } from './supabase.js';

const BUCKET = 'recipe-thumbnails';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const APPROVED_HOST_SUFFIXES = [
  'cdninstagram.com',
  'fbcdn.net',
  'ytimg.com',
  'youtube.com',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokv.com',
  'byteoversea.com',
  'ibytedtos.com',
  'muscdn.com',
];

function hostMatches(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function parseApprovedThumbnailUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Thumbnail URL is invalid');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Thumbnail URL must use HTTPS');
  }

  const hostname = url.hostname.toLowerCase();
  if (!APPROVED_HOST_SUFFIXES.some((suffix) => hostMatches(hostname, suffix))) {
    throw new Error(`Thumbnail host is not an approved social image host: ${hostname}`);
  }

  return url;
}

function getSourceType(sourceUrl) {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();
  if (hostMatches(hostname, 'instagram.com')) return 'instagram';
  if (hostMatches(hostname, 'tiktok.com')) return 'tiktok';
  if (hostMatches(hostname, 'youtube.com') || hostMatches(hostname, 'youtu.be')) return 'youtube';
  return 'source';
}

function getContentType(response) {
  return (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
}

function assertAllowedSize(response, byteLength) {
  const declaredLength = Number(response.headers.get('content-length'));
  if ((Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) || byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Thumbnail image exceeds 8 MiB');
  }
}

async function fetchApprovedThumbnail(externalUrl, sourceUrl, fetchImpl) {
  let currentUrl = externalUrl;
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetchImpl(currentUrl, {
      headers: {
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeThumbnailBot/1.0)',
        'Referer': new URL(sourceUrl).origin + '/',
      },
      redirect: 'manual',
      signal,
    });

    if (!REDIRECT_STATUSES.has(response.status)) return response;
    if (redirects === MAX_REDIRECTS) throw new Error('Thumbnail download exceeded redirect limit');

    const location = response.headers.get('location');
    if (!location) throw new Error('Thumbnail redirect is missing a location');
    currentUrl = parseApprovedThumbnailUrl(new URL(location, currentUrl));
  }

  throw new Error('Thumbnail download exceeded redirect limit');
}

export function isManagedThumbnailUrl(value) {
  if (!value || !process.env.SUPABASE_URL) return false;

  try {
    const candidate = new URL(value);
    const project = new URL(process.env.SUPABASE_URL);
    return candidate.origin === project.origin
      && candidate.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`);
  } catch {
    return false;
  }
}

/**
 * Copies a short-lived social thumbnail into application-owned Supabase Storage.
 * The URL must come from a backend scraper, never directly from request input.
 */
export async function persistThumbnail({ sourceUrl, thumbnailUrl, fetchImpl = fetch }) {
  if (!sourceUrl) throw new Error('Source URL is required to persist a thumbnail');
  if (!thumbnailUrl) throw new Error('Thumbnail URL is required');

  const externalUrl = parseApprovedThumbnailUrl(thumbnailUrl);
  const sourceType = getSourceType(sourceUrl);
  const sourceHash = createHash('sha256').update(sourceUrl).digest('hex');

  const response = await fetchApprovedThumbnail(externalUrl, sourceUrl, fetchImpl);

  if (!response.ok) {
    throw new Error(`Thumbnail download failed: ${response.status} ${response.statusText}`);
  }

  const contentType = getContentType(response);
  const extension = MIME_EXTENSIONS.get(contentType);
  if (!extension) {
    throw new Error(`Thumbnail has unsupported content type: ${contentType || 'missing'}`);
  }

  assertAllowedSize(response, 0);
  const bytes = Buffer.from(await response.arrayBuffer());
  assertAllowedSize(response, bytes.byteLength);

  const objectPath = `${sourceType}/${sourceHash}.${extension}`;
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(objectPath, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  });

  if (error) throw new Error(`Thumbnail upload failed: ${error.message}`);

  const { data } = bucket.getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error('Supabase did not return a public thumbnail URL');
  return data.publicUrl;
}
