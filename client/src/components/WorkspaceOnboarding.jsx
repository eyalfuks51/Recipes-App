import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useWorkspace } from '../lib/workspace.jsx';
import { createWorkspace, joinWorkspaceByInvite } from '../lib/workspaceApi.js';
import './WorkspaceOnboarding.scss';

export function WorkspaceOnboarding({ onComplete }) {
  const { setActiveWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create tab state
  const [name, setName] = useState('');

  // Join tab state
  const [code, setCode] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
      setError('שם הספרייה צריך להיות בין 2 ל-50 תווים.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const workspace = await createWorkspace(supabase, trimmedName);
      setActiveWorkspace(workspace.id);
      onComplete();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('צריך להזין קוד הזמנה.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const ws = await joinWorkspaceByInvite(supabase, trimmedCode);
      setActiveWorkspace(ws.id);
      onComplete();
    } catch (err) {
      setError(err.message || 'לא נמצאה ספרייה עם הקוד הזה.');
      setLoading(false);
    }
  }

  function handleTabSwitch(tab) {
    setActiveTab(tab);
    setError(null);
  }

  return (
    <div className="auth-gate">
      <div className="auth-card onboarding-card">
        <h1>Re-smash</h1>
        <p>כדי להתחיל, צרו ספריית מתכונים או הצטרפו לספרייה קיימת.</p>

        <div className="onboarding-tabs">
          <button
            type="button"
            className={`onboarding-tab-btn${activeTab === 'create' ? ' onboarding-tab-btn--active' : ''}`}
            onClick={() => handleTabSwitch('create')}
          >
            יצירת ספרייה
          </button>
          <button
            type="button"
            className={`onboarding-tab-btn${activeTab === 'join' ? ' onboarding-tab-btn--active' : ''}`}
            onClick={() => handleTabSwitch('join')}
          >
            הצטרפות לספרייה
          </button>
        </div>

        {activeTab === 'create' && (
          <form onSubmit={handleCreate}>
            <input
              className="onboarding-input"
              type="text"
              placeholder="שם הספרייה"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
              disabled={loading}
            />
            {error && <p className="onboarding-error">{error}</p>}
            <button type="submit" className="btn-google" disabled={loading}>
              {loading ? 'יוצר...' : 'יצירת ספרייה'}
            </button>
          </form>
        )}

        {activeTab === 'join' && (
          <form onSubmit={handleJoin}>
            <input
              className="onboarding-input"
              type="text"
              placeholder="קוד הזמנה"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              disabled={loading}
            />
            {error && <p className="onboarding-error">{error}</p>}
            <button type="submit" className="btn-google" disabled={loading}>
              {loading ? 'מצטרף...' : 'הצטרפות לספרייה'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
