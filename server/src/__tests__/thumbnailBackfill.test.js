import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('backfillThumbnailRows', () => {
  it('re-scrapes, persists, and updates an unmanaged thumbnail', async () => {
    const calls = [];
    const { backfillThumbnailRows } = await import('../services/thumbnailBackfill.js');
    const rows = [{
      id: 'recipe-1',
      instagram_url: 'https://www.instagram.com/reel/ABC123/',
      thumbnail_url: 'https://scontent.cdninstagram.com/expired.jpg',
    }];

    const result = await backfillThumbnailRows(rows, {
      isManaged: () => false,
      resolveThumbnail: async (row) => {
        calls.push(['resolve', row.id]);
        return 'https://scontent.cdninstagram.com/fresh.jpg';
      },
      persist: async (input) => {
        calls.push(['persist', input]);
        return 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg';
      },
      updateThumbnail: async (id, url) => calls.push(['update', id, url]),
    });

    assert.deepEqual(result, { repaired: 1, skipped: 0, failed: 0 });
    assert.deepEqual(calls, [
      ['resolve', 'recipe-1'],
      ['persist', {
        sourceUrl: 'https://www.instagram.com/reel/ABC123/',
        thumbnailUrl: 'https://scontent.cdninstagram.com/fresh.jpg',
      }],
      ['update', 'recipe-1', 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg'],
    ]);
  });

  it('skips thumbnails already managed by this project', async () => {
    const { backfillThumbnailRows } = await import('../services/thumbnailBackfill.js');
    const result = await backfillThumbnailRows([{
      id: 'recipe-1',
      instagram_url: 'https://www.instagram.com/reel/ABC123/',
      thumbnail_url: 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/hash.jpg',
    }], {
      isManaged: () => true,
      resolveThumbnail: async () => assert.fail('managed rows must not be scraped'),
      persist: async () => assert.fail('managed rows must not be uploaded'),
      updateThumbnail: async () => assert.fail('managed rows must not be updated'),
    });

    assert.deepEqual(result, { repaired: 0, skipped: 1, failed: 0 });
  });

  it('records a failed row and continues repairing later rows', async () => {
    const warnings = [];
    const updated = [];
    const { backfillThumbnailRows } = await import('../services/thumbnailBackfill.js');
    const rows = [
      { id: 'broken', instagram_url: 'https://www.instagram.com/reel/BROKEN/', thumbnail_url: 'https://scontent.cdninstagram.com/old-1.jpg' },
      { id: 'healthy', instagram_url: 'https://www.instagram.com/reel/HEALTHY/', thumbnail_url: 'https://scontent.cdninstagram.com/old-2.jpg' },
    ];

    const result = await backfillThumbnailRows(rows, {
      isManaged: () => false,
      resolveThumbnail: async (row) => {
        if (row.id === 'broken') throw new Error('post unavailable');
        return 'https://scontent.cdninstagram.com/fresh.jpg';
      },
      persist: async () => 'https://project.supabase.co/storage/v1/object/public/recipe-thumbnails/instagram/healthy.jpg',
      updateThumbnail: async (id) => updated.push(id),
      logger: { warn: (...args) => warnings.push(args) },
    });

    assert.deepEqual(result, { repaired: 1, skipped: 0, failed: 1 });
    assert.deepEqual(updated, ['healthy']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].join(' '), /post unavailable/);
  });
});
