import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_SUPABASE_URL = process.env.SUPABASE_URL;

afterEach(() => {
  delete global.__mockSupabaseClient;
  if (ORIGINAL_SUPABASE_URL == null) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = ORIGINAL_SUPABASE_URL;
});

describe('persistThumbnail', () => {
  it('uploads an approved image and returns its public Supabase URL', async () => {
    const uploads = [];
    global.__mockSupabaseClient = {
      storage: {
        from(bucket) {
          assert.equal(bucket, 'recipe-thumbnails');
          return {
            async upload(path, bytes, options) {
              uploads.push({ path, bytes, options });
              return { error: null };
            },
            getPublicUrl(path) {
              return {
                data: {
                  publicUrl: `https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/${path}`,
                },
              };
            },
          };
        },
      },
    };

    const fetchImpl = async () => new Response(Buffer.from('jpeg-bytes'), {
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
    });
    const { persistThumbnail } = await import('../services/thumbnailStorage.js');

    const result = await persistThumbnail({
      sourceUrl: 'https://www.instagram.com/reel/ABC123/',
      thumbnailUrl: 'https://scontent-mrs2-3.cdninstagram.com/image.jpg?oe=123',
      fetchImpl,
    });

    assert.match(result, /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/public\/recipe-thumbnails\/instagram\/[a-f0-9]{64}\.jpg$/);
    assert.equal(uploads.length, 1);
    assert.match(uploads[0].path, /^instagram\/[a-f0-9]{64}\.jpg$/);
    assert.equal(Buffer.from(uploads[0].bytes).toString(), 'jpeg-bytes');
    assert.deepEqual(uploads[0].options, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    });
  });

  it('rejects image URLs outside the approved social CDN hosts', async () => {
    const { persistThumbnail } = await import('../services/thumbnailStorage.js');

    await assert.rejects(
      persistThumbnail({
        sourceUrl: 'https://www.instagram.com/reel/ABC123/',
        thumbnailUrl: 'https://example.com/internal-image.jpg',
        fetchImpl: async () => assert.fail('fetch must not run for an unapproved host'),
      }),
      /not an approved social image host/
    );
  });

  it('does not follow redirects to hosts outside the approved allowlist', async () => {
    let fetchCalls = 0;
    const { persistThumbnail } = await import('../services/thumbnailStorage.js');

    await assert.rejects(
      persistThumbnail({
        sourceUrl: 'https://www.instagram.com/reel/ABC123/',
        thumbnailUrl: 'https://scontent.cdninstagram.com/redirecting.jpg',
        fetchImpl: async () => {
          fetchCalls += 1;
          return new Response(null, {
            status: 302,
            headers: { location: 'https://169.254.169.254/latest/meta-data/' },
          });
        },
      }),
      /not an approved social image host/
    );

    assert.equal(fetchCalls, 1);
  });

  it('rejects responses that are not supported image types', async () => {
    const { persistThumbnail } = await import('../services/thumbnailStorage.js');

    await assert.rejects(
      persistThumbnail({
        sourceUrl: 'https://www.instagram.com/reel/ABC123/',
        thumbnailUrl: 'https://scontent.cdninstagram.com/image.jpg',
        fetchImpl: async () => new Response('<html>blocked</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      }),
      /unsupported content type: text\/html/
    );
  });

  it('rejects images larger than the storage limit before reading the body', async () => {
    const { persistThumbnail } = await import('../services/thumbnailStorage.js');

    await assert.rejects(
      persistThumbnail({
        sourceUrl: 'https://www.instagram.com/reel/ABC123/',
        thumbnailUrl: 'https://scontent.cdninstagram.com/image.jpg',
        fetchImpl: async () => new Response('small-body', {
          status: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': String(8 * 1024 * 1024 + 1),
          },
        }),
      }),
      /exceeds 8 MiB/
    );
  });
});

describe('isManagedThumbnailUrl', () => {
  it('recognizes this project storage bucket and rejects external lookalikes', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    const { isManagedThumbnailUrl } = await import('../services/thumbnailStorage.js');
    const path = '/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg';

    assert.equal(isManagedThumbnailUrl(`https://project.supabase.co${path}`), true);
    assert.equal(isManagedThumbnailUrl(`https://attacker.example${path}`), false);
  });
});
