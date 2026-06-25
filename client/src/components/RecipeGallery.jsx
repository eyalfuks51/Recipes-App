import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace.jsx';
import { RecipeModal } from './RecipeModal';
import { RecipeReviewScreen } from './RecipeReviewScreen';
import { QuickFilterPills } from './QuickFilterPills';
import { normalizeRecipe, matchPrepBucket, matchesQuery, activeChips } from '../lib/taxonomy';
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

function getSourceType(url) {
  if (/(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/.test(url ?? '')) return 'youtube';
  if (/tiktok\.com/.test(url ?? '')) return 'tiktok';
  if (/instagram\.com/.test(url ?? '')) return 'instagram';
  return 'source';
}

function getSourceLabel(type) {
  return {
    instagram: 'אינסטגרם',
    youtube: 'יוטיוב',
    tiktok: 'טיקטוק',
    source: 'מקור',
  }[type] ?? 'מקור';
}

function SourceIcon({ type }) {
  if (type === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="M10 9l5 3-5 3V9Z" />
      </svg>
    );
  }

  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.5 5.2c1 .9 2.1 1.4 3.5 1.5v3a7.3 7.3 0 0 1-3.4-.9v6.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.1a2.7 2.7 0 1 0 1.7 2.5V3h3v2.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" />
    </svg>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="recipe-card recipe-card--with-media recipe-card--skeleton" aria-hidden="true">
      <div className="card-media">
        <div className="skeleton-media" />
      </div>
      <div className="card-body">
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--title short" />
        <div className="skeleton-line skeleton-line--meta" />
      </div>
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onClick, onDelete }) {
  const diff = getDifficulty(recipe.difficulty);
  const hasThumbnail = Boolean(recipe.thumbnail_url);
  const sourceType = getSourceType(recipe.instagram_url);
  const sourceLabel = getSourceLabel(sourceType);
  const prepTime = Number.parseInt(recipe.prep_time, 10);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmRef = useRef(null);

  // Close popup on click outside
  useEffect(() => {
    if (!confirmingDelete) return;
    function handleClickOutside(e) {
      if (confirmRef.current && !confirmRef.current.contains(e.target)) {
        setConfirmingDelete(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [confirmingDelete]);

  function handleTrashClick(e) {
    e.stopPropagation();
    if (deleting) return;
    setConfirmingDelete(true);
  }

  async function handleConfirmDelete(e) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${recipe.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        onDelete(recipe.id);
      } else {
        setDeleting(false);
        setConfirmingDelete(false);
      }
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  function handleCancelDelete(e) {
    e.stopPropagation();
    setConfirmingDelete(false);
  }

  const deleteControl = (
    <div className="card-delete-control" ref={confirmRef}>
      <button
        className="card-trash"
        onClick={handleTrashClick}
        disabled={deleting}
        aria-label="מחק מתכון"
      >
        <img src="/icons/trash.svg" width="16" height="16" alt="" aria-hidden="true" />
      </button>
      {confirmingDelete && (
        <div className="card-delete-confirm">
          <p className="card-delete-confirm__text">למחוק את המתכון?</p>
          <div className="card-delete-confirm__actions">
            <button className="card-delete-confirm__cancel" onClick={handleCancelDelete}>ביטול</button>
            <button className="card-delete-confirm__confirm" onClick={handleConfirmDelete} disabled={deleting}>מחיקה</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={hasThumbnail ? 'recipe-card recipe-card--with-media' : 'recipe-card'}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Open ${recipe.title}`}
    >
      {hasThumbnail ? (
        <div className="card-media">
          <img src={recipe.thumbnail_url} alt="" className="card-thumbnail" loading="lazy" />
          <div className="card-media-top">
            {recipe.main_category && (
              <span className="card-category card-category--media">{recipe.main_category}</span>
            )}
            {deleteControl}
          </div>
        </div>
      ) : (
        <div className="card-header">
          {recipe.main_category && (
            <span className="card-category">{recipe.main_category}</span>
          )}
          {deleteControl}
        </div>
      )}

      <div className="card-body">
        <h3 className="card-title">{recipe.title}</h3>
        <div className="card-meta">
          {recipe.difficulty && (
            <p
              className="card-difficulty"
              style={{ '--diff-color': diff.color, '--diff-bg': diff.bg }}
            >
              <span className="difficulty-dot" aria-hidden="true" />
              {diff.label}
            </p>
          )}
          {Number.isFinite(prepTime) && prepTime > 0 && (
            <span className="card-duration">{prepTime} דק׳</span>
          )}
          <span className={`card-source card-source--${sourceType}`} aria-label={sourceLabel} title={sourceLabel}>
            <SourceIcon type={sourceType} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export function RecipeGallery({ refreshTrigger = 0, filters = {}, activeFilter, onFilterChange, onOpenFilterSheet, hasActiveAdvancedFilters, searchQuery = '', onSearchChange, onRemoveChip, onClearAll, hasAnyFilter }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalIngredients, setModalIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    async function fetchRecipes() {
      if (!activeWorkspaceId) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from('recipes')
        .select('id, title, main_category, difficulty, instagram_url, instructions, workspace_id, meal_type, cuisine, main_ingredient, prep_time, dietary_tags, thumbnail_url')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: false });

      if (sbError) {
        setError(sbError.message);
      } else {
        setRecipes(data || []);
      }

      setLoading(false);
    }

    fetchRecipes();
  }, [refreshTrigger, activeWorkspaceId]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  // Filters compare canonical slugs (see lib/taxonomy). normalizeRecipe maps each
  // stored recipe's Hebrew/free-text fields onto slugs at read time — additive, so
  // cards still render every original field. URL params already carry slugs.
  const filteredRecipes = useMemo(() => {
    return recipes.map(normalizeRecipe).filter((recipe) => {
      // Meal type
      if (filters.mealType && recipe._mealType !== filters.mealType) return false;

      // Tags — recipe must have ALL selected tag slugs
      if (filters.dietaryTags?.length > 0) {
        if (!filters.dietaryTags.every((slug) => recipe._tags.includes(slug))) return false;
      }

      // Prep time bucket (cumulative ≤15/≤30/≤60, plus >60)
      if (filters.prepTimeRange && !matchPrepBucket(recipe.prep_time, filters.prepTimeRange)) {
        return false;
      }

      // Main ingredient group
      if (filters.mainIngredient && recipe._ingredientGroup !== filters.mainIngredient) {
        return false;
      }

      // Text search: title + main_ingredient + main_category
      if (filters.query && !matchesQuery(recipe, filters.query)) return false;

      return true;
    });
  }, [recipes, filters]);

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

  function handleDelete(recipeId) {
    // Optimistic removal: remove recipe from list immediately
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setSelectedRecipe(null);
    setModalIngredients([]);
  }

  function handleEdit(recipe) {
    setSelectedRecipe(null);   // close modal
    setModalIngredients([]);
    setEditingRecipe(recipe);  // enter edit mode
  }

  function handleEditSaved(data) {
    // Patch the recipe in the local list with the fields we know changed
    // data = { success: true, recipe_id: string, title: string }
    setRecipes((prev) =>
      prev.map((r) => r.id === data.recipe_id ? { ...r, title: data.title } : r)
    );
    setEditingRecipe(null);
  }

  function handleEditDiscard() {
    setEditingRecipe(null);
  }

  return (
    <div className="recipe-gallery">
      <div className="gallery-header">
        <div className="gallery-header__top">
          <h2>ספר המתכונים שלך</h2>
          {!loading && !error && recipes.length > 0 && (
            <span className="gallery-count">{filteredRecipes.length}</span>
          )}
        </div>
        <input
          type="search"
          className="library-search"
          placeholder="חיפוש מתכון…"
          aria-label="חיפוש מתכון"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          dir="rtl"
        />
        <QuickFilterPills
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onOpenFilterSheet={onOpenFilterSheet}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
        />
        {activeChips(filters).length > 0 && (
          <div className="filter-chips" role="list" aria-label="מסננים פעילים">
            {activeChips(filters).map((chip) => (
              <span key={`${chip.type}-${chip.value}`} className="chip" role="listitem">
                {chip.label}
                <button
                  className="chip__remove"
                  onClick={() => onRemoveChip?.(chip)}
                  aria-label={`הסר ${chip.label}`}
                >
                  ×
                </button>
              </span>
            ))}
            {hasAnyFilter && (
              <button className="chip-clear" onClick={onClearAll}>
                נקה הכל
              </button>
            )}
          </div>
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
        <p className="gallery-error">שגיאה בטעינת המתכונים: {error}</p>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div className="gallery-empty">
          <svg className="empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3" />
            <path d="M21 15v7" />
          </svg>
          <p className="gallery-empty__title">אין מתכונים עדיין</p>
          <p className="gallery-empty__sub">הדביקו קישור מאינסטגרם למעלה כדי לשמור את המתכון הראשון שלכם.</p>
        </div>
      )}

      {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && hasAnyFilter && (
        <div className="gallery-empty gallery-empty--filtered">
          <p className="gallery-empty__title">לא נמצאו מתכונים שמתאימים לסינון</p>
          <button className="gallery-empty__clear-btn" onClick={onClearAll}>
            נקה סינון
          </button>
        </div>
      )}

      {!loading && !error && filteredRecipes.length > 0 && (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => handleCardClick(recipe)}
              onDelete={handleDelete}
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
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      {editingRecipe && (
        <RecipeReviewScreen
          extractedRecipe={{
            title: editingRecipe.title,
            main_category: editingRecipe.main_category,
            difficulty: editingRecipe.difficulty,
            ingredients: [],
            instructions: Array.isArray(editingRecipe.instructions) ? editingRecipe.instructions :
              (typeof editingRecipe.instructions === 'string' ? JSON.parse(editingRecipe.instructions || '[]') : []),
            meal_type: editingRecipe.meal_type ?? 'ארוחת צהריים/ערב',
            cuisine: editingRecipe.cuisine ?? '',
            main_ingredient: editingRecipe.main_ingredient ?? '',
            prep_time: editingRecipe.prep_time ?? null,
            dietary_tags: Array.isArray(editingRecipe.dietary_tags) ? editingRecipe.dietary_tags : [],
          }}
          instagramUrl={editingRecipe.instagram_url}
          workspaceId={editingRecipe.workspace_id ?? activeWorkspaceId}
          thumbnailUrl={editingRecipe.thumbnail_url ?? null}
          editMode={true}
          recipeId={editingRecipe.id}
          onSaved={handleEditSaved}
          onDiscard={handleEditDiscard}
        />
      )}
    </div>
  );
}
