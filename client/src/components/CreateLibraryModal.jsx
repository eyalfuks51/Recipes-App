import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useWorkspace } from '../lib/workspace.jsx';
import { createWorkspace } from '../lib/workspaceApi.js';
import './RecipeLibraryMenu.scss';

export function CreateLibraryModal({ isOpen, onClose }) {
  const { refreshWorkspaces, setActiveWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCancel = () => {
    setName('');
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
      setError('שם הספרייה צריך להיות בין 2 ל-50 תווים.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const library = await createWorkspace(supabase, trimmedName);
      await refreshWorkspaces();
      setActiveWorkspace(library.id);
      setName('');
      onClose();
    } catch (err) {
      setError(err.message || 'לא הצלחנו ליצור ספרייה חדשה.');
      setLoading(false);
    }
  };

  return (
    <div className="library-modal-overlay" onClick={handleCancel}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <h2 className="library-modal__title">יצירת ספרייה חדשה</h2>
        <p className="library-modal__copy">תנו שם לספרייה שבה תרצו לשמור מתכונים.</p>

        <form className="library-modal__form" onSubmit={handleCreate}>
          <input
            className="library-modal__input"
            type="text"
            placeholder="למשל: מתכונים לשישי"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={50}
            disabled={loading}
            autoFocus
          />

          {error && <p className="library-modal__error">{error}</p>}

          <div className="library-modal__actions">
            <button
              className="library-modal__button library-modal__button--ghost"
              type="button"
              onClick={handleCancel}
              disabled={loading}
            >
              ביטול
            </button>
            <button
              className="library-modal__button library-modal__button--primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'יוצר...' : 'יצירת ספרייה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
