import { useEffect, useRef, useState } from 'react';
import './SubmitForm.scss';
import { useWorkspace } from '../lib/workspace.jsx';
import { RecipeReviewScreen } from './RecipeReviewScreen.jsx';

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Loader messages ─────────────────────────────────────────────────────────
const LOADER_MESSAGES = [
  'מחלץ נתונים מהמתכון...',
  'מעבד נתונים ב-AI...',
  'מחלץ את רשימת המצרכים...',
  'מחלק שלבי הכנה...',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function SubmitForm({ onSuccess }) {
  const { activeWorkspaceId } = useWorkspace();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'preview' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [extractedRecipe, setExtractedRecipe] = useState(null);
  const submittingRef = useRef(false);
  const [loaderIndex, setLoaderIndex] = useState(0);

  useEffect(() => {
    if (status !== 'loading') {
      setLoaderIndex(0);
      return;
    }
    const id = setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % LOADER_MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [status]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus('loading');
    setResult(null);

    try {
      const API = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      const response = await fetch(
        `${API}/api/extract-recipe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instagram_url: url }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('preview');
        setExtractedRecipe(data);
        // Do NOT call onSuccess yet — wait for user confirmation
      } else {
        setStatus('error');
        setResult({ error: data.error || 'Something went wrong. Please try again.' });
      }
    } catch (err) {
      setStatus('error');
      setResult({ error: err.message || 'Network error — check your connection.' });
    } finally {
      submittingRef.current = false;
    }
  }

  function handleRecipeSaved(data) {
    onSuccess(data);
    setStatus('idle');
    setExtractedRecipe(null);
    setUrl('');
  }

  function handleDiscard() {
    setStatus('idle');
    setExtractedRecipe(null);
  }

  if (status === 'preview' && extractedRecipe) {
    return (
      <RecipeReviewScreen
        extractedRecipe={extractedRecipe}
        instagramUrl={url}
        workspaceId={activeWorkspaceId}
        thumbnailUrl={extractedRecipe.thumbnail_url ?? null}
        onSaved={handleRecipeSaved}
        onDiscard={handleDiscard}
      />
    );
  }

  return (
    <div className="submit-form">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="input-wrapper">
            <span className="input-icon" aria-hidden="true">
              <IconInstagram />
            </span>
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={status === 'loading'}
              aria-label="Instagram post URL"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className={status === 'loading' ? 'btn-primary loading' : 'btn-primary'}
          >
            {status === 'loading' ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span className="loader-text" key={loaderIndex}>
                  {LOADER_MESSAGES[loaderIndex]}
                </span>
              </>
            ) : (
              'הוספת מתכון'
            )}
          </button>
        </div>

        {(status === 'success' || status === 'error') && (
          <div className="form-feedback">
            {status === 'success' && (
              <p className="success-msg">
                <span className="feedback-icon feedback-icon--success"><IconCheck /></span>
                <span>
                  <strong>{result.title}</strong> saved — {result.ingredients_count} ingredient{result.ingredients_count !== 1 ? 's' : ''} extracted
                </span>
              </p>
            )}
            {status === 'error' && (
              <p className="error-msg">
                <span className="feedback-icon feedback-icon--error"><IconAlert /></span>
                <span>{result.error}</span>
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
