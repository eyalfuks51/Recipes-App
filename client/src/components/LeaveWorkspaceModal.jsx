import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useWorkspace } from '../lib/workspace.jsx';
import { getWorkspaceMemberCount, leaveWorkspace } from '../lib/workspaceApi.js';
import './RecipeLibraryMenu.scss';

export function LeaveWorkspaceModal({ isOpen, onClose, workspace }) {
  const { refreshWorkspaces, workspaces } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSoleMember, setIsSoleMember] = useState(null);
  const [checked, setChecked] = useState(false);

  const isOnlyLibrary = workspaces.length <= 1;

  useEffect(() => {
    if (!isOpen || !workspace?.id) return;

    if (isOnlyLibrary) {
      setIsSoleMember(null);
      setChecked(true);
      return;
    }

    let cancelled = false;

    const checkSoleMember = async () => {
      try {
        const count = await getWorkspaceMemberCount(supabase, workspace.id);

        if (!cancelled) {
          setIsSoleMember(count === 1);
          setChecked(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setChecked(true);
        }
      }
    };

    checkSoleMember();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isOnlyLibrary, workspace?.id]);

  useEffect(() => {
    if (!isOpen) {
      setIsSoleMember(null);
      setChecked(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !workspace) return null;

  const handleConfirmLeave = async () => {
    if (isOnlyLibrary) return;

    setLoading(true);
    setError(null);

    try {
      await leaveWorkspace(supabase, workspace.id);
      await refreshWorkspaces();
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <h2 className="library-modal__title">עזיבת הספרייה</h2>
        <p className="library-modal__copy">
          <strong>{workspace.name}</strong>
        </p>

        {!checked && (
          <p className="library-modal__copy">בודקים את מצב הספרייה...</p>
        )}

        {checked && isOnlyLibrary && (
          <p className="library-modal__warning">
            זו הספרייה היחידה שלך. לפני עזיבה צריך ליצור או להצטרף לספרייה אחרת.
          </p>
        )}

        {checked && !isOnlyLibrary && isSoleMember && (
          <p className="library-modal__warning">
            לא זיהינו חברים נוספים בספרייה הזו. אחרי העזיבה לא תוכלו לגשת אליה מתוך החשבון הזה.
          </p>
        )}

        {checked && !isOnlyLibrary && !isSoleMember && (
          <p className="library-modal__copy">
            תצאו מהספרייה הזו. תוכלו להצטרף שוב עם קישור הזמנה.
          </p>
        )}

        {error && <p className="library-modal__error">{error}</p>}

        <div className="library-modal__actions">
          <button
            type="button"
            className="library-modal__button library-modal__button--ghost"
            onClick={onClose}
            disabled={loading}
          >
            ביטול
          </button>
          <button
            type="button"
            className="library-modal__button library-modal__button--danger"
            onClick={handleConfirmLeave}
            disabled={loading || !checked || isOnlyLibrary}
          >
            {isOnlyLibrary ? 'צריך ספרייה נוספת קודם' : loading ? 'עוזב...' : 'עזיבת הספרייה'}
          </button>
        </div>
      </div>
    </div>
  );
}
