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
      setError('Workspace name must be between 2 and 50 characters.');
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
      setError('Please enter an invite code.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const ws = await joinWorkspaceByInvite(supabase, trimmedCode);
      setActiveWorkspace(ws.id);
      onComplete();
    } catch (err) {
      setError(err.message || 'No workspace found with that code.');
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
        <h1>Recipe Manager</h1>
        <p>You need a workspace to get started. Create a new one or join an existing one.</p>

        <div className="onboarding-tabs">
          <button
            type="button"
            className={`onboarding-tab-btn${activeTab === 'create' ? ' onboarding-tab-btn--active' : ''}`}
            onClick={() => handleTabSwitch('create')}
          >
            Create workspace
          </button>
          <button
            type="button"
            className={`onboarding-tab-btn${activeTab === 'join' ? ' onboarding-tab-btn--active' : ''}`}
            onClick={() => handleTabSwitch('join')}
          >
            Join workspace
          </button>
        </div>

        {activeTab === 'create' && (
          <form onSubmit={handleCreate}>
            <input
              className="onboarding-input"
              type="text"
              placeholder="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
              disabled={loading}
            />
            {error && <p className="onboarding-error">{error}</p>}
            <button type="submit" className="btn-google" disabled={loading}>
              {loading ? 'Creating…' : 'Create Workspace'}
            </button>
          </form>
        )}

        {activeTab === 'join' && (
          <form onSubmit={handleJoin}>
            <input
              className="onboarding-input"
              type="text"
              placeholder="6-character invite code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              disabled={loading}
            />
            {error && <p className="onboarding-error">{error}</p>}
            <button type="submit" className="btn-google" disabled={loading}>
              {loading ? 'Joining…' : 'Join Workspace'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
