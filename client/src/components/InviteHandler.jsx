import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

export function InviteHandler() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const code = searchParams.get('code')?.trim().toUpperCase() ?? '';

  // Unauthenticated flow — save code and trigger OAuth
  useEffect(() => {
    if (authLoading) return;
    if (user) return; // handled by confirmation modal

    if (!code) {
      navigate('/');
      return;
    }

    setRedirecting(true);
    localStorage.setItem('pendingInviteCode', code);
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }, [authLoading, user, code]);

  // Authenticated edge case — no code in URL
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!code) {
      navigate('/');
    }
  }, [authLoading, user, code]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    const { data: ws, error: lookupErr } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('invite_code', code)
      .single();

    if (lookupErr || !ws) {
      setError('לא נמצאה סביבת עבודה עם הקוד הזה');
      setJoining(false);
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
      setJoining(false);
      return;
    }

    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="auth-loading">
        <span className="spinner" />
      </div>
    );
  }

  // Unauthenticated — redirecting to OAuth
  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>מעביר לדף ההתחברות…</div>
    );
  }

  // No code in URL — useEffect will navigate('/') but render nothing in the meantime
  if (!code) {
    return null;
  }

  // Authenticated — confirmation modal
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '32px 28px',
          maxWidth: '360px',
          width: '90%',
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <h2
          style={{
            margin: '0 0 12px',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#1a202c',
          }}
        >
          הוזמנת להצטרף לסביבת עבודה
        </h2>

        <p style={{ margin: '0 0 24px', color: '#4a5568', fontSize: '0.9375rem' }}>
          האם ברצונך להצטרף?
        </p>

        {error && (
          <p
            style={{
              margin: '0 0 16px',
              color: '#e53e3e',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              padding: '10px 22px',
              background: joining ? '#f0a090' : '#e85d3e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: joining ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9375rem',
            }}
          >
            {joining ? 'מצטרף…' : 'הצטרף/י'}
          </button>

          <button
            onClick={handleCancel}
            disabled={joining}
            style={{
              padding: '10px 22px',
              background: '#f7fafc',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: joining ? 'not-allowed' : 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
