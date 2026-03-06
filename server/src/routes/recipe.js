import { Router } from 'express';
import { scrapeInstagramCaption } from '../services/scraper.js';
import { extractRecipeFromCaption } from '../services/moonshot.js';
import { saveRecipe } from '../services/supabase.js';

export const recipeRouter = Router();

recipeRouter.post('/process-recipe', async (req, res) => {
  const { instagram_url, workspace_id } = req.body;

  if (!instagram_url) {
    return res.status(400).json({ success: false, error: 'instagram_url is required' });
  }

  try {
    // Step 1: Scrape caption from Instagram post
    const caption = await scrapeInstagramCaption(instagram_url);

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
