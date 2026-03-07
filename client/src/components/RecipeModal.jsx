import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth.jsx';
import { useWorkspace } from '../lib/workspace.jsx';
import './RecipeModal.scss';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractShortcode(url) {
  const match = url?.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ─── Ingredient Skeleton ───────────────────────────────────────────────────────
function IngredientSkeleton() {
  const widths = ['72%', '58%', '80%', '65%', '75%', '55%'];
  return (
    <ul className="ingredient-skeleton" aria-hidden="true">
      {widths.map((w, i) => (
        <li key={i} className="skeleton-ingredient" style={{ '--w': w }} />
      ))}
    </ul>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function RecipeModal({ recipe, ingredients, ingredientsLoading, onClose }) {
  const shortcode = extractShortcode(recipe.instagram_url);
  const embedUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : null;
  const diff = getDifficulty(recipe.difficulty);

  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [checksLoading, setChecksLoading] = useState(false);

  // Load existing checkbox state when ingredients are ready
  useEffect(() => {
    if (!activeWorkspaceId || ingredients.length === 0 || ingredientsLoading) return;
    setChecksLoading(true);
    supabase
      .from('workspace_ingredient_checks')
      .select('ingredient_id')
      .eq('workspace_id', activeWorkspaceId)
      .eq('recipe_id', recipe.id)
      .eq('checked', true)
      .then(({ data }) => {
        if (data) setCheckedIds(new Set(data.map((r) => r.ingredient_id)));
        setChecksLoading(false);
      });
  }, [ingredients, activeWorkspaceId, ingredientsLoading, recipe.id]);

  async function handleToggle(ingredientId) {
    if (!activeWorkspaceId) return;
    const nowChecked = !checkedIds.has(ingredientId);
    // Optimistic update
    setCheckedIds((prev) => {
      const next = new Set(prev);
      nowChecked ? next.add(ingredientId) : next.delete(ingredientId);
      return next;
    });
    // Persist to Supabase (upsert)
    await supabase.from('workspace_ingredient_checks').upsert({
      workspace_id: activeWorkspaceId,
      recipe_id: recipe.id,
      ingredient_id: ingredientId,
      checked: nowChecked,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,recipe_id,ingredient_id' });
  }

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-recipe-title"
      >
        {/* ── Close ───────────────────────────────────────────────────── */}
        <button className="modal-close" onClick={onClose} aria-label="Close recipe">
          <IconX />
        </button>

        <div className="modal-body">
          {/* ── Left: Instagram embed ─────────────────────────────────── */}
          <div className="modal-left">
            <div className="modal-media-container">
              {recipe.thumbnail_url ? (
                <a
                  href={recipe.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-thumbnail-link"
                  aria-label="View on Instagram"
                >
                  <img src={recipe.thumbnail_url} alt={recipe.title} className="modal-thumbnail-img" />
                  <div className="modal-play-btn" aria-hidden="true">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="24" fill="rgba(255,255,255,0.9)" />
                      <polygon points="19,15 36,24 19,33" fill="#0f0f0f" />
                    </svg>
                  </div>
                </a>
              ) : embedUrl ? (
                <iframe className="modal-iframe" src={embedUrl} title={`Instagram post: ${recipe.title}`} frameBorder="0" scrolling="no" allowTransparency="true" loading="lazy" />
              ) : (
                <div className="modal-iframe-fallback">
                  <IconInstagram />
                  <span>Preview unavailable</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Recipe details ──────────────────────────────────── */}
          <div className="modal-right">
            <div className="modal-content">
              {/* Badges */}
              <div className="modal-badges">
                {recipe.main_category && (
                  <span className="modal-badge modal-badge--category">
                    {recipe.main_category}
                  </span>
                )}
                {recipe.difficulty && (
                  <span
                    className="modal-badge modal-badge--difficulty"
                    style={{ '--diff-color': diff.color, '--diff-bg': diff.bg }}
                  >
                    <span className="difficulty-dot" aria-hidden="true" />
                    {diff.label}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 id="modal-recipe-title" className="modal-title">
                {recipe.title}
              </h2>

              <div className="modal-divider" />

              {/* Ingredients */}
              <section className="modal-ingredients">
                <h3 className="modal-section-heading">Ingredients</h3>

                {ingredientsLoading && <IngredientSkeleton />}

                {!ingredientsLoading && ingredients.length > 0 && (
                  <ul className="ingredient-list">
                    {ingredients.map((ingredient) => (
                      <li key={ingredient.id} className={`ingredient-item ${checkedIds.has(ingredient.id) ? 'ingredient-item--checked' : ''}`}>
                        <label className="ingredient-label">
                          <input
                            type="checkbox"
                            checked={checkedIds.has(ingredient.id)}
                            onChange={() => handleToggle(ingredient.id)}
                            className="ingredient-checkbox"
                          />
                          <span>{capitalize(ingredient.name)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {!ingredientsLoading && ingredients.length === 0 && (
                  <p className="modal-empty-ingredients">No ingredients saved for this recipe.</p>
                )}
              </section>

              {/* Instructions */}
              {Array.isArray(recipe.instructions)
                ? recipe.instructions.length > 0 && (
                    <section className="modal-instructions">
                      <h3 className="modal-section-heading">הוראות הכנה</h3>
                      <ol className="modal-instructions-list" dir="rtl">
                        {recipe.instructions.map((step, i) => (
                          <li key={i} className="modal-instruction-step">{step}</li>
                        ))}
                      </ol>
                    </section>
                  )
                : !!recipe.instructions && (
                    <section className="modal-instructions">
                      <h3 className="modal-section-heading">הוראות הכנה</h3>
                      <p className="modal-instructions-text" dir="auto">{recipe.instructions}</p>
                    </section>
                  )
              }

              {/* Instagram link */}
              {recipe.instagram_url && (
                <a
                  href={recipe.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-ig-link"
                >
                  <IconInstagram />
                  View original post
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
