import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { INGREDIENT_GROUPS, PREP_BUCKETS, UI_TAGS } from '../lib/taxonomy';
import './FilterBottomSheet.scss';

export function FilterBottomSheet({ isOpen, onClose, currentFilters, onApply, onClearAll }) {
  const [dietaryTags, setDietaryTags] = useState(currentFilters.dietaryTags || []);
  const [prepTimeRange, setPrepTimeRange] = useState(currentFilters.prepTimeRange || null);
  const [mainIngredient, setMainIngredient] = useState(currentFilters.mainIngredient || null);

  // Sync local state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setDietaryTags(currentFilters.dietaryTags || []);
      setPrepTimeRange(currentFilters.prepTimeRange || null);
      setMainIngredient(currentFilters.mainIngredient || null);
    }
  }, [isOpen, currentFilters]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDietaryTag = (tag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApply = () => {
    onApply({ dietaryTags, prepTimeRange, mainIngredient });
  };

  const handleClear = () => {
    setDietaryTags([]);
    setPrepTimeRange(null);
    setMainIngredient(null);
    onClearAll();
  };

  return createPortal(
    <div className="filter-sheet-backdrop" onClick={onClose}>
      <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="filter-sheet__header">
          <h2 className="filter-sheet__title">סינון מתכונים</h2>
          <button className="filter-sheet__close" onClick={onClose} aria-label="Close filters">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="filter-sheet__body">
          {/* Nutrition tags */}
          <div className="filter-section">
            <h3 className="filter-section__title">מאפיינים</h3>
            <div className="filter-chips">
              {UI_TAGS.map((tag) => (
                <button
                  key={tag.slug}
                  className={`filter-chip${dietaryTags.includes(tag.slug) ? ' filter-chip--selected' : ''}`}
                  onClick={() => toggleDietaryTag(tag.slug)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prep Time */}
          <div className="filter-section">
            <h3 className="filter-section__title">זמן הכנה</h3>
            <div className="filter-chips">
              {PREP_BUCKETS.map((opt) => (
                <button
                  key={opt.slug}
                  className={`filter-chip${prepTimeRange === opt.slug ? ' filter-chip--selected' : ''}`}
                  onClick={() => setPrepTimeRange(prepTimeRange === opt.slug ? null : opt.slug)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Ingredient */}
          <div className="filter-section">
            <h3 className="filter-section__title">מרכיב עיקרי</h3>
            <div className="filter-chips">
              {INGREDIENT_GROUPS.map((ing) => (
                <button
                  key={ing.slug}
                  className={`filter-chip${mainIngredient === ing.slug ? ' filter-chip--selected' : ''}`}
                  onClick={() => setMainIngredient(mainIngredient === ing.slug ? null : ing.slug)}
                >
                  {ing.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="filter-sheet__footer">
          <button className="filter-sheet__clear" onClick={handleClear}>
            נקה הכל
          </button>
          <button className="filter-sheet__apply" onClick={handleApply}>
            הצג תוצאות
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
