import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// We need to mock fetch before importing the module
// Using global fetch mock approach

describe('scrapeInstagramCaption', () => {
  let scrapeInstagramCaption;

  beforeEach(async () => {
    // Reset module by re-importing with fresh mock state
  });

  it('normalizes URL without www to include www', async () => {
    // Mock fetch to return a valid caption
    global.fetch = mock.fn(async (url, options) => {
      const body = JSON.parse(options.body);
      // Verify normalized URL was passed
      assert.match(body.directUrls[0], /^https:\/\/www\./);
      return {
        ok: true,
        json: async () => [{ caption: 'test caption' }],
      };
    });

    const mod = await import('../services/apify.js?t=' + Date.now());
    scrapeInstagramCaption = mod.scrapeInstagramCaption;

    const result = await scrapeInstagramCaption('https://instagram.com/p/abc');
    assert.equal(result, 'test caption');
  });

  it('does not double-add www when already present', async () => {
    global.fetch = mock.fn(async (url, options) => {
      const body = JSON.parse(options.body);
      // URL should not have www.www.
      assert.doesNotMatch(body.directUrls[0], /www\.www\./);
      assert.match(body.directUrls[0], /^https:\/\/www\.instagram/);
      return {
        ok: true,
        json: async () => [{ caption: 'caption text' }],
      };
    });

    const mod = await import('../services/apify.js?t=' + Date.now());
    const result = await mod.scrapeInstagramCaption('https://www.instagram.com/p/abc');
    assert.equal(result, 'caption text');
  });

  it('throws Error when no items returned', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => [],
    }));

    const mod = await import('../services/apify.js?t=' + Date.now());
    await assert.rejects(
      () => mod.scrapeInstagramCaption('https://instagram.com/p/abc'),
      { message: 'No caption found for this Instagram post' }
    );
  });

  it('throws Error when items[0].caption is null', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => [{ caption: null }],
    }));

    const mod = await import('../services/apify.js?t=' + Date.now());
    await assert.rejects(
      () => mod.scrapeInstagramCaption('https://instagram.com/p/abc'),
      { message: 'No caption found for this Instagram post' }
    );
  });

  it('throws Error when Apify response is not ok', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }));

    const mod = await import('../services/apify.js?t=' + Date.now());
    await assert.rejects(
      () => mod.scrapeInstagramCaption('https://instagram.com/p/abc'),
      /Apify request failed/
    );
  });
});
