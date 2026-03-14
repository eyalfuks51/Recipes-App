import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useWorkspace } from '../lib/workspace.jsx';

export function JoinWorkspaceModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { refreshWorkspaces, setActiveWorkspace } = useWorkspace();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCancel = () => {
    setCode('');
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleJoin = async (e) => {
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

    await refreshWorkspaces();
    setActiveWorkspace(ws.id);
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 600 }}>Join Workspace</h2>

        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="6-character invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e0',
              borderRadius: '6px',
              fontSize: '1rem',
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />

          {error && (
            <p style={{ color: '#e53e3e', fontSize: '0.875rem', margin: '0 0 12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#e85d3e',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
