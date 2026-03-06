import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RecipeModal } from './RecipeModal';
import './RecipeGallery.scss';

// ─── Difficulty config ─────────────────────────────────────────────────────────
const DIFFICULTY_MAP = {
  easy: { label: 'קל', color: '#16a34a', bg: '#f0fdf4' },
  beginner: { label: 'Beginner', color: '#16a34a', bg: '#f0fdf4' },
  medium: { label: 'בינוני', color: '#d97706', bg: '#fffbeb' },
  intermediate: { label: 'Intermediate', color: '#d97706', bg: '#fffbeb' },
  moderate: { label: 'Moderate', color: '#d97706', bg: '#fffbeb' },
  hard: { label: 'קשה', color: '#dc2626', bg: '#fef2f2' },
  advanced: { label: 'Advanced', color: '#dc2626', bg: '#fef2f2' },
  difficult: { label: 'Difficult', color: '#dc2626', bg: '#fef2f2' },
  קל: { label: 'קל', color: '#16a34a', bg: '#f0fdf4' },
  בינוני: { label: 'בינוני', color: '#d97706', bg: '#fffbeb' },
  קשה: { label: 'קשה', color: '#dc2626', bg: '#fef2f2' },
};

function getDifficulty(value) {
  return DIFFICULTY_MAP[value?.toLowerCase()] ?? DIFFICULTY_MAP[value] ?? { label: value || '—', color: '#78716c', bg: '#f5f5f4' };
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="recipe-card recipe-card--skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-line--badge" />
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--title short" />
      <div className="skeleton-line skeleton-line--meta" />
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onClick }) {
  const diff = getDifficulty(recipe.difficulty);

  return (
    <div
      className="recipe-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open ${recipe.title}`}
    >
      <div className="card-header">
        {recipe.main_category && (
          <span className="card-category">{recipe.main_category}</span>
        )}
      </div>
      <h3 className="card-title">{recipe.title}</h3>
      {recipe.difficulty && (
        <p
          className="card-difficulty"
          style={{ '--diff-color': diff.color, '--diff-bg': diff.bg }}
        >
          <span className="difficulty-dot" aria-hidden="true" />
          {diff.label}
        </p>
      )}
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export function RecipeGallery({ refreshTrigger = 0 }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalIngredients, setModalIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from('recipes')
        .select('id, title, main_category, difficulty, instagram_url, instructions, workspace_id')
        .order('created_at', { ascending: false });

      if (sbError) {
        setError(sbError.message);
      } else {
        setRecipes(data || []);
      }

      setLoading(false);
    }

    fetchRecipes();
  }, [refreshTrigger]);

  async function handleCardClick(recipe) {
    // Show modal immediately with card data; load ingredients in background
    setSelectedRecipe(recipe);
    setModalIngredients([]);
    setIngredientsLoading(true);

    const { data, error: sbError } = await supabase
      .from('recipe_ingredients')
      .select('ingredient_id, ingredients(id, name)')
      .eq('recipe_id', recipe.id);

    if (!sbError && data) {
      setModalIngredients(
        data.map((row) => ({ id: row.ingredient_id, name: row.ingredients?.name })).filter((i) => i.name)
      );
    }

    setIngredientsLoading(false);
  }

  function handleModalClose() {
    setSelectedRecipe(null);
    setModalIngredients([]);
  }

  return (
    <div className="recipe-gallery">
      <div className="gallery-header">
        <h2>Your Recipes</h2>
        {!loading && !error && recipes.length > 0 && (
          <span className="gallery-count">{recipes.length}</span>
        )}
      </div>

      {loading && (
        <div className="recipe-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="gallery-error">Failed to load recipes: {error}</p>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div className="gallery-empty">
          <svg className="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3" />
            <path d="M21 15v7" />
          </svg>
          <p className="gallery-empty__title">No recipes yet</p>
          <p className="gallery-empty__sub">Paste an Instagram URL above to save your first recipe.</p>
        </div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => handleCardClick(recipe)}
            />
          ))}
        </div>
      )}

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          ingredients={modalIngredients}
          ingredientsLoading={ingredientsLoading}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
