import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useWorkspace } from '../lib/workspace.jsx';
import { getWorkspaceMemberCount, leaveWorkspace } from '../lib/workspaceApi.js';

export function LeaveWorkspaceModal({ isOpen, onClose, workspace }) {
  const { refreshWorkspaces } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSoleMember, setIsSoleMember] = useState(null);
  const [checked, setChecked] = useState(false);

  // Run sole-member check when modal opens
  useEffect(() => {
    if (!isOpen || !workspace?.id) return;

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
  }, [isOpen, workspace?.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSoleMember(null);
      setChecked(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !workspace) return null;

  const handleCancel = () => {
    onClose();
  };

  const handleConfirmLeave = async () => {
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
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600 }}>Leave Workspace</h2>

        <p style={{ margin: '0 0 16px', fontWeight: 500, color: '#1a202c' }}>{workspace.name}</p>

        {!checked && (
          <p style={{ color: '#718096', fontSize: '0.875rem', margin: '0 0 16px' }}>Checking…</p>
        )}

        {checked && isSoleMember && (
          <p style={{ color: '#c53030', fontSize: '0.875rem', margin: '0 0 16px', lineHeight: 1.5 }}>
            You are the only member.{' '}
            <strong>This workspace and all its recipes will be permanently deleted.</strong>{' '}
            This cannot be undone.
          </p>
        )}

        {checked && !isSoleMember && (
          <p style={{ color: '#4a5568', fontSize: '0.875rem', margin: '0 0 16px', lineHeight: 1.5 }}>
            You will leave this workspace. You can rejoin with the invite code.
          </p>
        )}

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
            type="button"
            onClick={handleConfirmLeave}
            disabled={loading || !checked}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#e53e3e',
              color: '#fff',
              cursor: loading || !checked ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: loading || !checked ? 0.6 : 1,
            }}
          >
            {loading ? 'Leaving…' : 'Confirm Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
