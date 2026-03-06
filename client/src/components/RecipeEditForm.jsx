import { useState } from 'react';
import './RecipeEditForm.scss';

// Must stay in sync with server/src/services/moonshot.js ALLOWED_CATEGORIES
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

export function RecipeEditForm({ extractedRecipe, instagramUrl, workspaceId, onSaved, onDiscard }) {
  const [title, setTitle] = useState(extractedRecipe.title ?? '');
  const [category, setCategory] = useState(extractedRecipe.main_category ?? '');
  const [difficulty, setDifficulty] = useState(extractedRecipe.difficulty ?? '');
  const [ingredientsText, setIngredientsText] = useState(
    Array.isArray(extractedRecipe.ingredients)
      ? extractedRecipe.ingredients.join('\n')
      : ''
  );
  const [instructions, setInstructions] = useState(extractedRecipe.instructions ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const ingredients = ingredientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

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
            instructions,
            workspace_id: workspaceId,
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
    <div className="recipe-edit-form">
      <h2>Review &amp; Edit Recipe</h2>
      <form onSubmit={handleSave}>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {ALLOWED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label>
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="קל">קל</option>
            <option value="בינוני">בינוני</option>
            <option value="קשה">קשה</option>
          </select>
        </label>

        <label>
          Ingredients (one per line)
          <textarea
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            rows={8}
          />
        </label>

        <label>
          Instructions (optional)
          <textarea
            className="instructions-textarea"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
            placeholder="Preparation steps, cooking times, tips..."
            dir="auto"
          />
        </label>

        {saveError && <p className="edit-error">{saveError}</p>}

        <div className="edit-actions">
          <button type="button" onClick={onDiscard} className="btn-secondary">
            Discard
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
