import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// We mock the openai module before importing moonshot.js
// Using a module mock approach with ES modules

describe('extractRecipeFromCaption', () => {
  it('parses plain JSON response from AI', async () => {
    // Mock the OpenAI client
    const mockCreate = mock.fn(async () => ({
      choices: [
        {
          message: {
            content: '{"title":"פסטה בולונז","main_category":"פסטה","difficulty":"בינוני","ingredients":["ספגטי","בשר טחון","עגבניות"]}',
          },
        },
      ],
    }));

    // Inject mock via global
    global.__mockOpenAICreate = mockCreate;

    const mod = await import('../services/moonshot.js?t=' + Date.now());
    const result = await mod.extractRecipeFromCaption('מתכון לפסטה');

    assert.equal(result.title, 'פסטה בולונז');
    assert.equal(result.main_category, 'פסטה');
    assert.equal(result.difficulty, 'בינוני');
    assert.ok(Array.isArray(result.ingredients));
    assert.equal(result.ingredients.length, 3);
  });

  it('parses markdown-wrapped JSON response', async () => {
    const mockCreate = mock.fn(async () => ({
      choices: [
        {
          message: {
            content: '```json\n{"title":"סלט ירקות","main_category":"סלט","difficulty":"קל","ingredients":["מלפפון","עגבנייה"]}\n```',
          },
        },
      ],
    }));

    global.__mockOpenAICreate = mockCreate;

    const mod = await import('../services/moonshot.js?t=' + Date.now());
    const result = await mod.extractRecipeFromCaption('מתכון לסלט');

    assert.equal(result.title, 'סלט ירקות');
    assert.ok(Array.isArray(result.ingredients));
  });

  it('throws when AI returns no JSON at all', async () => {
    const mockCreate = mock.fn(async () => ({
      choices: [
        {
          message: {
            content: 'מצטער, לא הצלחתי לנתח את המתכון.',
          },
        },
      ],
    }));

    global.__mockOpenAICreate = mockCreate;

    const mod = await import('../services/moonshot.js?t=' + Date.now());
    await assert.rejects(
      () => mod.extractRecipeFromCaption('some caption'),
      { message: 'Failed to parse recipe from AI response' }
    );
  });

  it('throws when JSON is missing required fields', async () => {
    const mockCreate = mock.fn(async () => ({
      choices: [
        {
          message: {
            content: '{"main_category":"פסטה"}',
          },
        },
      ],
    }));

    global.__mockOpenAICreate = mockCreate;

    const mod = await import('../services/moonshot.js?t=' + Date.now());
    await assert.rejects(
      () => mod.extractRecipeFromCaption('some caption'),
      /missing required recipe fields/
    );
  });
});
