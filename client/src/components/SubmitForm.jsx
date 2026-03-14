import { useEffect, useRef, useState } from 'react';
import './SubmitForm.scss';
import { useWorkspace } from '../lib/workspace.jsx';
import { RecipeReviewScreen } from './RecipeReviewScreen.jsx';

// ─── URL type detection ───────────────────────────────────────────────────────
function detectUrlType(url) {
  if (!url) return 'unknown';
  if (/(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/instagram\.com/.test(url)) return 'instagram';
  return 'unknown';
}

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

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" ry="3" />
      <polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
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

  const sourceType = detectUrlType(url);

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
          body: JSON.stringify({ url }),
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
        instagramUrl={extractedRecipe.source_url ?? url}
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
              {sourceType === 'youtube' ? <IconYouTube /> : sourceType === 'tiktok' ? <IconTikTok /> : <IconInstagram />}
            </span>
            <input
              type="url"
              placeholder="הדבק קישור מאינסטגרם, יוטיוב או טיקטוק..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={status === 'loading'}
              aria-label="Recipe video URL"
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
