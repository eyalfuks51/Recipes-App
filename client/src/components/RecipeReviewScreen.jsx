import { useState } from 'react';
import './RecipeReviewScreen.scss';

// Must stay in sync with server/src/services/moonshot.js
const ALLOWED_CATEGORIES = [
  'פסטה',
  'סלט',
  'קינוח',
  'מרק',
  'בשר',
  'עוף',
  'דגים',
  'אורז',
  'ירקות',
  'ביצים',
  'מאפה',
  'שתייה',
  'ארוחת בוקר',
  'אחר',
];

// Must stay in sync with server/src/services/moonshot.js ALLOWED_CUISINES
const ALLOWED_CUISINES = [
  'איטלקי',
  'אסייתי',
  'מקסיקני',
  'אמריקאי',
  'ים-תיכוני',
  'ישראלי',
  'מרוקאי',
  'עיראקי',
  'תוניסאי',
  'צרפתי',
  "פיוז'ן",
  'אחר',
];

// Must stay in sync with server/src/services/moonshot.js ALLOWED_DIETARY_TAGS
const ALLOWED_DIETARY_TAGS = ['עתיר חלבון', 'דל פחמימה', 'מושחת', 'קליל'];

// Must stay in sync with server/src/services/moonshot.js ALLOWED_MEAL_TYPES
const ALLOWED_MEAL_TYPES = ['ארוחת בוקר', 'ארוחת צהריים/ערב'];

export function RecipeReviewScreen({
  extractedRecipe,
  instagramUrl,
  workspaceId,
  thumbnailUrl,
  onSaved,
  onDiscard,
}) {
  const [title, setTitle] = useState(extractedRecipe.title ?? '');
  const [category, setCategory] = useState(extractedRecipe.main_category ?? '');
  const [difficulty, setDifficulty] = useState(extractedRecipe.difficulty ?? '');
  const [ingredientsText, setIngredientsText] = useState(
    Array.isArray(extractedRecipe.ingredients)
      ? extractedRecipe.ingredients.join('\n')
      : ''
  );
  const [steps, setSteps] = useState(
    Array.isArray(extractedRecipe.instructions) ? extractedRecipe.instructions : []
  );
  const [mealType, setMealType] = useState(
    ALLOWED_MEAL_TYPES.includes(extractedRecipe.meal_type)
      ? extractedRecipe.meal_type
      : 'ארוחת צהריים/ערב'
  );
  const [cuisine, setCuisine] = useState(extractedRecipe.cuisine ?? '');
  const [mainIngredient, setMainIngredient] = useState(extractedRecipe.main_ingredient ?? '');
  const [prepTime, setPrepTime] = useState(
    extractedRecipe.prep_time != null ? String(extractedRecipe.prep_time) : ''
  );
  const [dietaryTags, setDietaryTags] = useState(
    Array.isArray(extractedRecipe.dietary_tags) ? extractedRecipe.dietary_tags : []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeTab, setActiveTab] = useState('post');


  function handleStepChange(index, value) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function handleStepDelete(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function handleStepAdd() {
    setSteps((prev) => [...prev, '']);
  }

  function handleDietaryTagToggle(tag) {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const ingredients = ingredientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedPrepTime = parseInt(prepTime) || null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/confirm-recipe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instagram_url: instagramUrl,
            title,
            main_category: category,
            difficulty,
            ingredients,
            workspace_id: workspaceId,
            instructions: steps,
            meal_type: mealType,
            cuisine,
            main_ingredient: mainIngredient,
            prep_time: parsedPrepTime,
            dietary_tags: dietaryTags,
            thumbnail_url: thumbnailUrl ?? null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        onSaved(data);
      } else {
        setSaveError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setSaveError(err.message || 'Network error — check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="review-screen">
      {/* Mobile-only tab switcher */}
      <div className="review-tabs">
        <button
          type="button"
          className={activeTab === 'post' ? 'tab tab--active' : 'tab'}
          onClick={() => setActiveTab('post')}
        >
          פוסט
        </button>
        <button
          type="button"
          className={activeTab === 'edit' ? 'tab tab--active' : 'tab'}
          onClick={() => setActiveTab('edit')}
        >
          עריכה
        </button>
      </div>

      <div className="review-body">
        {/* Left panel: Instagram embed */}
        <div className={`review-left ${activeTab === 'edit' ? 'review-left--hidden-mobile' : ''}`}>
          <div className="review-media-container">
            {thumbnailUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="review-thumbnail-link"
                aria-label="פתח פוסט ב-Instagram"
              >
                <img src={thumbnailUrl} alt="תצוגה מקדימה" className="review-thumbnail-img" />
                <div className="review-play-btn" aria-hidden="true">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.9)" />
                    <polygon points="16,13 30,20 16,27" fill="#0f0f0f" />
                  </svg>
                </div>
              </a>
            ) : (
              <div className="review-left-fallback">
                <p>לא ניתן לטעון תצוגה מקדימה</p>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="review-fallback-link">פתח ב-Instagram</a>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: edit form */}
        <div className={`review-right ${activeTab === 'post' ? 'review-right--hidden-mobile' : ''}`}>
          <form id="review-form" onSubmit={handleSave} className="review-form">

            {/* Title */}
            <label className="field-label">
              כותרת
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="field-input"
              />
            </label>

            {/* Instructions */}
            <div className="section-heading">הוראות הכנה</div>
            <div className="steps-list">
              {steps.length === 0 && (
                <p className="steps-empty-msg">אין שלבי הכנה — לחץ להוספה</p>
              )}
              {steps.map((step, index) => (
                <div key={index} className="step-row">
                  <span className="step-number">{index + 1}</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className="field-input step-input"
                    placeholder={`שלב ${index + 1}`}
                    dir="rtl"
                  />
                  <button
                    type="button"
                    className="step-delete"
                    onClick={() => handleStepDelete(index)}
                    aria-label="מחק שלב"
                  >
                    מחק
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-step" onClick={handleStepAdd}>
              + הוסף שלב
            </button>

            {/* Ingredients */}
            <label className="field-label" style={{ marginTop: '24px' }}>
              מצרכים (אחד בכל שורה)
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={6}
                className="field-input"
                dir="rtl"
              />
            </label>

            {/* Metadata section */}
            <div className="section-heading">פרטים נוספים</div>

            <label className="field-label">
              קטגוריה
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field-input"
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              מטבח
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="field-input"
              >
                <option value="">-- בחר מטבח --</option>
                {ALLOWED_CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-label">
              סוג ארוחה
              <div className="meal-type-toggle">
                {ALLOWED_MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`meal-type-btn${mealType === type ? ' meal-type-btn--active' : ''}`}
                    onClick={() => setMealType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <label className="field-label">
              מרכיב עיקרי
              <input
                type="text"
                value={mainIngredient}
                onChange={(e) => setMainIngredient(e.target.value)}
                className="field-input"
                placeholder="עוף, פסטה, ירקות..."
                dir="rtl"
              />
            </label>

            <label className="field-label">
              רמת קושי
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="field-input"
              >
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
              </select>
            </label>

            <label className="field-label">
              זמן הכנה (דקות)
              <input
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="field-input"
                placeholder="0"
              />
            </label>

            {/* Dietary tags */}
            <div className="section-heading" style={{ marginTop: '16px' }}>תגיות תזונה</div>
            <div className="dietary-tags">
              {ALLOWED_DIETARY_TAGS.map((tag) => (
                <label key={tag} className="dietary-tag-label">
                  <input
                    type="checkbox"
                    checked={dietaryTags.includes(tag)}
                    onChange={() => handleDietaryTagToggle(tag)}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>

            {/* Error message */}
            {saveError && <p className="review-error">{saveError}</p>}

          </form>

          {/* Sticky footer OUTSIDE the form */}
          <div className="review-actions">
            <button type="button" className="btn-secondary" onClick={onDiscard}>
              ביטול
            </button>
            <button type="submit" form="review-form" className="btn-primary" disabled={saving}>
              {saving ? 'שומר...' : 'אישור ושמירה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
