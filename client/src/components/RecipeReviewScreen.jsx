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

function extractShortcode(url) {
  const match = url?.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function RecipeReviewScreen({
  extractedRecipe,
  instagramUrl,
  workspaceId,
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
  const [mealType, setMealType] = useState(extractedRecipe.meal_type ?? '');
  const [cuisine, setCuisine] = useState(extractedRecipe.cuisine ?? '');
  const [mainIngredient, setMainIngredient] = useState(extractedRecipe.main_ingredient ?? '');
  const [equipment, setEquipment] = useState(
    Array.isArray(extractedRecipe.equipment_needed) ? extractedRecipe.equipment_needed : []
  );
  const [prepTime, setPrepTime] = useState(
    extractedRecipe.prep_time != null ? String(extractedRecipe.prep_time) : ''
  );
  const [cookTime, setCookTime] = useState(
    extractedRecipe.cook_time != null ? String(extractedRecipe.cook_time) : ''
  );
  const [dietaryTags, setDietaryTags] = useState(
    Array.isArray(extractedRecipe.dietary_tags) ? extractedRecipe.dietary_tags : []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeTab, setActiveTab] = useState('post');
  const [newEquipment, setNewEquipment] = useState('');

  const shortcode = extractShortcode(instagramUrl);
  const embedUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : null;

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

  function handleEquipmentRemove(index) {
    setEquipment((prev) => prev.filter((_, i) => i !== index));
  }

  function handleEquipmentAdd() {
    const trimmed = newEquipment.trim();
    if (!trimmed) return;
    setEquipment((prev) => [...prev, trimmed]);
    setNewEquipment('');
  }

  function handleEquipmentKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEquipmentAdd();
    }
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
    const parsedCookTime = parseInt(cookTime) || null;

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
            equipment_needed: equipment,
            prep_time: parsedPrepTime,
            cook_time: parsedCookTime,
            dietary_tags: dietaryTags,
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
          {embedUrl ? (
            <iframe
              src={embedUrl}
              frameBorder="0"
              scrolling="no"
              allowTransparency="true"
              loading="lazy"
              title="Instagram post"
            />
          ) : (
            <div className="review-left-fallback">
              <p>לא ניתן לטעון את הפוסט</p>
            </div>
          )}
        </div>

        {/* Right panel: edit form */}
        <div className={`review-right ${activeTab === 'post' ? 'review-right--hidden-mobile' : ''}`}>
          <form onSubmit={handleSave}>

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

            <label className="field-label">
              סוג ארוחה
              <input
                type="text"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="field-input"
                placeholder="ארוחת בוקר, ארוחת ערב, חטיף..."
                dir="rtl"
              />
            </label>

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

            <div className="time-row">
              <label className="field-label time-field">
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
              <label className="field-label time-field">
                זמן בישול (דקות)
                <input
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="field-input"
                  placeholder="0"
                />
              </label>
            </div>

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

            {/* Equipment needed */}
            <div className="section-heading">ציוד נדרש</div>
            <div className="equipment-tags">
              {equipment.map((item, index) => (
                <span key={index} className="equipment-tag">
                  {item}
                  <button
                    type="button"
                    onClick={() => handleEquipmentRemove(index)}
                    aria-label={`הסר ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="equipment-add-row">
              <input
                type="text"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                onKeyDown={handleEquipmentKeyDown}
                className="field-input equipment-input"
                placeholder="הוסף ציוד..."
                dir="rtl"
              />
              <button type="button" className="btn-add-equipment" onClick={handleEquipmentAdd}>
                הוסף
              </button>
            </div>

            {/* Error message */}
            {saveError && <p className="review-error">{saveError}</p>}

            {/* Actions */}
            <div className="review-actions">
              <button type="button" className="btn-secondary" onClick={onDiscard}>
                ביטול
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'שומר...' : 'אישור ושמירה'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
