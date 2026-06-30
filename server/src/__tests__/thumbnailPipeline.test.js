import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('stabilizeThumbnail', () => {
  it('returns the durable URL produced by thumbnail persistence', async () => {
    const calls = [];
    const { stabilizeThumbnail } = await import('../services/thumbnailPipeline.js');

    const result = await stabilizeThumbnail({
      sourceUrl: 'https://www.instagram.com/reel/ABC123/',
      thumbnailUrl: 'https://scontent.cdninstagram.com/temporary.jpg',
      persist: async (input) => {
        calls.push(input);
        return 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg';
      },
    });

    assert.equal(result, 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg');
    assert.deepEqual(calls, [{
      sourceUrl: 'https://www.instagram.com/reel/ABC123/',
      thumbnailUrl: 'https://scontent.cdninstagram.com/temporary.jpg',
    }]);
  });

  it('returns null and logs a warning when persistence fails', async () => {
    const warnings = [];
    const { stabilizeThumbnail } = await import('../services/thumbnailPipeline.js');

    const result = await stabilizeThumbnail({
      sourceUrl: 'https://www.instagram.com/reel/ABC123/',
      thumbnailUrl: 'https://scontent.cdninstagram.com/temporary.jpg',
      persist: async () => { throw new Error('storage unavailable'); },
      logger: { warn: (...args) => warnings.push(args) },
    });

    assert.equal(result, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].join(' '), /storage unavailable/);
  });

  it('returns null without calling persistence when no thumbnail exists', async () => {
    const { stabilizeThumbnail } = await import('../services/thumbnailPipeline.js');

    const result = await stabilizeThumbnail({
      sourceUrl: 'https://www.instagram.com/reel/ABC123/',
      thumbnailUrl: null,
      persist: async () => assert.fail('persistence must not run without a thumbnail'),
    });

    assert.equal(result, null);
  });
});
