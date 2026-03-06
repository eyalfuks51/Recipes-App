import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useWorkspace } from '../lib/workspace.jsx';
import './WorkspaceOnboarding.scss';

export function WorkspaceOnboarding({ onComplete }) {
  const { user } = useAuth();
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

    const inviteCode = (Math.random().toString(36).toUpperCase() + 'AAAAAA').slice(2, 8);

    const { data: workspace, error: insertErr } = await supabase
      .from('workspaces')
      .insert({ name: trimmedName, invite_code: inviteCode })
      .select()
      .single();

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase
      .from('workspace_users')
      .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' });

    if (memberErr) {
      setError(memberErr.message);
      setLoading(false);
      return;
    }

    setActiveWorkspace(workspace.id);
    onComplete();
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

    const { data: ws, error: lookupErr } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('invite_code', trimmedCode)
      .single();

    if (lookupErr || !ws) {
      setError('No workspace found with that code.');
      setLoading(false);
      return;
    }

    const { error: joinErr } = await supabase
      .from('workspace_users')
      .upsert(
        { workspace_id: ws.id, user_id: user.id, role: 'member' },
        { onConflict: 'workspace_id,user_id' }
      );

    if (joinErr) {
      setError(joinErr.message);
      setLoading(false);
      return;
    }

    setActiveWorkspace(ws.id);
    onComplete();
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
