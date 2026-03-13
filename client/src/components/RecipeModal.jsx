import { useEffect, useRef, useState } from 'react';
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

function IconPen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconFlame() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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
export function RecipeModal({ recipe, ingredients, ingredientsLoading, onClose, onDelete, onEdit }) {
  const shortcode = extractShortcode(recipe.instagram_url);
  const embedUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : null;
  const hasMedia = !!(embedUrl || recipe.thumbnail_url);
  const diff = getDifficulty(recipe.difficulty);

  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [checksLoading, setChecksLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [cookingMode, setCookingMode] = useState(false);
  const wakeLockRef = useRef(null);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('recipe');

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

  async function handleDelete() {
    if (deleting || !onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${recipe.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        onDelete(recipe.id);
        handleClose();
      } else {
        setDeleteError(data.error || 'מחיקה נכשלה — נסה שוב');
        setDeleting(false);
      }
    } catch (err) {
      setDeleteError(err.message || 'שגיאת רשת');
      setDeleting(false);
    }
  }

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }

  // ── Cooking Mode (Wake Lock) ──────────────────────────────────────────────
  async function toggleCookingMode() {
    try {
      if (!cookingMode) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setCookingMode(true);
      } else {
        await wakeLockRef.current?.release();
        wakeLockRef.current = null;
        setCookingMode(false);
      }
    } catch {
      setCookingMode(false);
    }
  }

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    if (!cookingMode) return;
    function handleVisibility() {
      if (document.visibilityState === 'visible' && cookingMode) {
        navigator.wakeLock.request('screen').then(s => { wakeLockRef.current = s; }).catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [cookingMode]);

  // Release wake lock on unmount
  useEffect(() => {
    return () => { wakeLockRef.current?.release(); };
  }, []);

  // ── Share Recipe ─────────────────────────────────────────────────────────────
  async function handleShare() {
    const shareData = { title: recipe.title, text: recipe.title, url: recipe.instagram_url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(recipe.title + '\n' + recipe.instagram_url);
        setShareTooltip(true);
        setTimeout(() => setShareTooltip(false), 2000);
      }
    } catch { /* user cancelled share */ }
  }

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, closing]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  return createPortal(
    <div
      className={`modal-backdrop${closing ? ' modal-backdrop--closing' : ''}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={`modal-panel${closing ? ' modal-panel--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-recipe-title"
      >
        {/* ── Close ───────────────────────────────────────────────────── */}
        <button className="modal-close" onClick={handleClose} aria-label="Close recipe">
          <IconX />
        </button>

        {/* ── Actions (top-right) ─────────────────────────────────────── */}
        <div className="modal-actions">
          {recipe.instagram_url && (
            <button
              className="modal-action-btn"
              onClick={handleShare}
              aria-label="שתף מתכון"
            >
              <IconShare />
            </button>
          )}
          {onEdit && (
            <button
              className="modal-action-btn"
              onClick={() => onEdit(recipe)}
              disabled={deleting}
              aria-label="ערוך מתכון"
            >
              <IconPen />
            </button>
          )}
          {shareTooltip && <span className="modal-share-tooltip">הקישור הועתק!</span>}
        </div>

        {hasMedia && (
          <div className="modal-tabs">
            <button
              className={activeTab === 'video' ? 'modal-tab modal-tab--active' : 'modal-tab'}
              onClick={() => setActiveTab('video')}
            >
              סרטון
            </button>
            <button
              className={activeTab === 'recipe' ? 'modal-tab modal-tab--active' : 'modal-tab'}
              onClick={() => setActiveTab('recipe')}
            >
              מתכון
            </button>
          </div>
        )}

        <div className={`modal-body${hasMedia ? '' : ' modal-body--no-media'}${hasMedia && activeTab === 'video' ? ' modal-body--video-active' : ''}`}>
          {/* ── Left: Instagram embed (desktop always; mobile only on video tab) ── */}
          {hasMedia && (
            <div className={`modal-left${activeTab === 'recipe' ? ' modal-left--hidden-mobile' : ''}`}>
              <div className="modal-media-container">
                {embedUrl ? (
                  <iframe className="modal-iframe" src={embedUrl} title={`Instagram post: ${recipe.title}`} frameBorder="0" scrolling="no" allowTransparency="true" loading="lazy" />
                ) : (
                  <img src={recipe.thumbnail_url} alt={recipe.title} className="modal-thumbnail-img" />
                )}
              </div>
            </div>
          )}

          {/* ── Right: Recipe details ──────────────────────────────────── */}
          <div className={`modal-right${hasMedia && activeTab === 'video' ? ' modal-right--hidden-mobile' : ''}`}>
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
                <div className="modal-ingredients-header">
                  <h3 className="modal-section-heading">מצרכים</h3>
                  {'wakeLock' in navigator && (
                    <button
                      className={`cooking-mode-btn${cookingMode ? ' cooking-mode-btn--active' : ''}`}
                      onClick={toggleCookingMode}
                    >
                      <IconFlame />
                      {cookingMode ? 'מצב בישול פעיל' : 'מצב בישול'}
                    </button>
                  )}
                </div>

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
                  <p className="modal-empty-ingredients">לא נשמרו מצרכים למתכון הזה.</p>
                )}
              </section>

              {/* Instructions */}
              {(() => {
                let steps = recipe.instructions;
                if (typeof steps === 'string') {
                  try { steps = JSON.parse(steps); } catch { steps = steps ? [steps] : []; }
                }
                if (!Array.isArray(steps) || steps.length === 0) return null;
                return (
                  <section className="modal-instructions">
                    <h3 className="modal-section-heading">הוראות הכנה</h3>
                    <ol className="modal-instructions-list" dir="rtl">
                      {steps.map((step, i) => (
                        <li key={i} className="modal-instruction-step">{step}</li>
                      ))}
                    </ol>
                  </section>
                );
              })()}

              {/* Instagram link */}
              {recipe.instagram_url && (
                <a
                  href={recipe.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-ig-link"
                >
                  <IconInstagram />
                  צפייה בפוסט המקורי
                </a>
              )}

              {onDelete && (
                <div className="modal-delete-section">
                  <button
                    className="modal-delete-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'מוחק...' : 'מחק מתכון'}
                  </button>
                  {deleteError && <p className="modal-delete-error-inline">{deleteError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
