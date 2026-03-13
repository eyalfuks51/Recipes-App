import { Router } from 'express';
import { scrapeInstagramCaption } from '../services/scraper.js';
import { scrapeYouTubeContent } from '../services/youtube.js';
import { scrapeTikTokContent } from '../services/tiktok.js';
import { extractRecipeFromCaption } from '../services/moonshot.js';
import { saveRecipe, deleteRecipe, updateRecipe } from '../services/supabase.js';

/**
 * Detects whether a URL is from YouTube, TikTok, or Instagram.
 * @param {string} url
 * @returns {'youtube' | 'tiktok' | 'instagram' | 'unknown'}
 */
function detectUrlType(url) {
  if (!url) return 'unknown';
  if (/(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/instagram\.com/.test(url)) return 'instagram';
  return 'unknown';
}

export const recipeRouter = Router();

recipeRouter.post('/process-recipe', async (req, res) => {
  const { instagram_url, workspace_id } = req.body;

  if (!instagram_url) {
    return res.status(400).json({ success: false, error: 'instagram_url is required' });
  }

  try {
    // Step 1: Scrape caption from Instagram post
    const { caption } = await scrapeInstagramCaption(instagram_url);

    // Step 2: Extract structured recipe from caption via Moonshot AI
    const recipe = await extractRecipeFromCaption(caption);

    // Step 3: Save recipe and ingredients to Supabase
    const saved = await saveRecipe({
      instagram_url,
      title: recipe.title,
      main_category: recipe.main_category,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      workspace_id,
    });

    return res.json({
      success: true,
      recipe_id: saved.recipe_id,
      title: saved.title,
      ingredients_count: saved.ingredients_count,
      workspace_id: saved.workspace_id ?? null,
    });
  } catch (err) {
    const isAbort = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    const message = isAbort
      ? 'Instagram scraping timed out — Apify is running slowly, please retry in a minute.'
      : (err?.message ?? String(err));
    const isUserError = message.includes('No caption found');
    const statusCode = isUserError ? 422 : 500;

    console.error('[process-recipe] Error:', message);
    return res.status(statusCode).json({ success: false, error: message });
  }
});

// POST /api/extract-recipe — scrape + extract only, no DB write (step 1 of 2-step flow)
// Accepts { url } for all sources, or legacy { instagram_url } for backward compatibility.
recipeRouter.post('/extract-recipe', async (req, res) => {
  const sourceUrl = req.body.url ?? req.body.instagram_url;

  if (!sourceUrl) {
    return res.status(400).json({ success: false, error: 'url is required' });
  }

  const sourceType = detectUrlType(sourceUrl);

  try {
    let text, thumbnailUrl;

    if (sourceType === 'youtube') {
      const result = await scrapeYouTubeContent(sourceUrl);
      text = result.text;
      thumbnailUrl = result.thumbnailUrl;
    } else if (sourceType === 'tiktok') {
      const result = await scrapeTikTokContent(sourceUrl);
      text = result.text;
      thumbnailUrl = result.thumbnailUrl;
    } else {
      // instagram or unknown — use existing scraper
      const result = await scrapeInstagramCaption(sourceUrl);
      text = result.caption;
      thumbnailUrl = result.thumbnailUrl;
    }

    // Extract structured recipe from raw text via Moonshot AI
    const recipe = await extractRecipeFromCaption(text);

    return res.json({
      success: true,
      source_url: sourceUrl,
      source_type: sourceType,
      title: recipe.title,
      main_category: recipe.main_category,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      meal_type: recipe.meal_type ?? 'ארוחת צהריים/ערב',
      cuisine: recipe.cuisine ?? 'אחר',
      main_ingredient: recipe.main_ingredient ?? null,
      prep_time: recipe.prep_time ?? null,
      dietary_tags: recipe.dietary_tags ?? [],
      instructions: recipe.instructions ?? [],
      thumbnail_url: thumbnailUrl ?? null,
    });
  } catch (err) {
    const isAbort = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    const sourceName = sourceType === 'youtube' ? 'YouTube' : sourceType === 'tiktok' ? 'TikTok' : 'Instagram';
    const message = isAbort
      ? `${sourceName} scraping timed out — please retry in a moment.`
      : (err?.message ?? String(err));
    const isUserError = message.includes('No caption found') || message.includes('No content found');
    const statusCode = isUserError ? 422 : 500;

    console.error('[extract-recipe] Error:', message);
    return res.status(statusCode).json({ success: false, error: message });
  }
});

// POST /api/confirm-recipe — accepts user-edited recipe data and saves to DB (step 2 of 2-step flow)
recipeRouter.post('/confirm-recipe', async (req, res) => {
  const {
    instagram_url, title, main_category, difficulty, ingredients, workspace_id,
    instructions, meal_type, cuisine, main_ingredient,
    prep_time, dietary_tags, thumbnail_url,
  } = req.body;

  // Validation
  if (!instagram_url) {
    return res.status(400).json({ success: false, error: 'instagram_url is required' });
  }
  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ success: false, error: 'ingredients must be an array' });
  }
  if (!workspace_id) {
    return res.status(400).json({ success: false, error: 'workspace_id is required' });
  }

  try {
    const saved = await saveRecipe({
      instagram_url,
      title,
      main_category,
      difficulty,
      ingredients,
      workspace_id,
      instructions,
      meal_type,
      cuisine,
      main_ingredient,
      prep_time,
      dietary_tags,
      thumbnail_url,
    });

    return res.json({
      success: true,
      recipe_id: saved.recipe_id,
      title: saved.title,
      ingredients_count: saved.ingredients_count,
      workspace_id: saved.workspace_id ?? null,
    });
  } catch (err) {
    const message = err?.message ?? String(err);
    console.error('[confirm-recipe] Error:', message);
    return res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/recipes/:id — remove a recipe by ID
recipeRouter.delete('/recipes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await deleteRecipe(id);
    return res.json({ success: true });
  } catch (err) {
    const message = err?.message ?? String(err);
    if (message === 'Recipe not found') {
      return res.status(404).json({ success: false, error: message });
    }
    console.error('[delete-recipe] Error:', message);
    return res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/recipes/:id — update an existing recipe by ID
recipeRouter.put('/recipes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title, main_category, difficulty, ingredients, workspace_id,
    instructions, meal_type, cuisine, main_ingredient,
    prep_time, dietary_tags, thumbnail_url,
  } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  try {
    const updated = await updateRecipe(id, {
      title, main_category, difficulty, ingredients, workspace_id,
      instructions, meal_type, cuisine, main_ingredient,
      prep_time, dietary_tags, thumbnail_url,
    });
    return res.json({ success: true, recipe_id: updated.recipe_id, title: updated.title });
  } catch (err) {
    const message = err?.message ?? String(err);
    if (message === 'Recipe not found') {
      return res.status(404).json({ success: false, error: message });
    }
    console.error('[update-recipe] Error:', message);
    return res.status(500).json({ success: false, error: message });
  }
});
