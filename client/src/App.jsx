import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { WorkspaceProvider, useWorkspace } from './lib/workspace.jsx';
import { AuthGate } from './components/AuthGate';
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding.jsx';
import { SubmitForm } from './components/SubmitForm';
import { RecipeGallery } from './components/RecipeGallery';

function BrandIcon() {
  return (
    <svg
      className="brand__icon"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3" />
      <path d="M21 15v7" />
    </svg>
  );
}

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  if (workspaces.length === 0) return null;

  const handleSelect = (id) => {
    setActiveWorkspace(id);
    setOpen(false);
  };

  const handleCopy = () => {
    if (activeWorkspace?.invite_code) {
      navigator.clipboard.writeText(activeWorkspace.invite_code);
    }
  };

  return (
    <div
      className="workspace-switcher"
      ref={ref}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        className="workspace-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.1)',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {activeWorkspace?.name ?? 'Loading\u2026'}
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div
          className="workspace-switcher__dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '180px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace?.id;
            return (
              <button
                key={ws.id}
                aria-current={isActive ? 'true' : undefined}
                className={`workspace-switcher__option${isActive ? ' workspace-switcher__option--active' : ''}`}
                onClick={() => handleSelect(ws.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  background: isActive ? '#f0f7ff' : 'transparent',
                  color: isActive ? '#1a56db' : '#1a202c',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {isActive && (
                  <span style={{ marginRight: '6px', fontSize: '0.75rem' }}>\u2713</span>
                )}
                {ws.name}
              </button>
            );
          })}

          {activeWorkspace?.invite_code && (
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                color: '#4a5568',
              }}
            >
              <div style={{ marginBottom: '4px', fontWeight: 500 }}>Invite code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <code
                  style={{
                    background: '#f7fafc',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeWorkspace.invite_code}
                </code>
                <button
                  onClick={handleCopy}
                  title="Copy invite code"
                  style={{
                    border: '1px solid #cbd5e0',
                    borderRadius: '4px',
                    background: '#fff',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [refreshCount, setRefreshCount] = useState(0);
  const { user, signOut } = useAuth();

  const handleSuccess = (recipe) => {
    console.log('New recipe saved:', recipe.title);
    setRefreshCount((c) => c + 1);
  };

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <BrandIcon />
            <span className="brand__name">Recipe Manager</span>
          </div>
          <WorkspaceSwitcher />
          {user && (
            <button className="btn-signout" onClick={signOut}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* ── Hero / Submit ──────────────────────────────────────────────── */}
      <section className="hero" aria-label="Submit a recipe">
        <div className="hero__inner">
          <h1 className="hero__title">Save Instagram recipes instantly</h1>
          <p className="hero__subtitle">
            Paste any Instagram post URL and we'll extract the full recipe automatically.
          </p>
          <SubmitForm onSuccess={handleSuccess} />
        </div>
      </section>

      {/* ── Gallery ────────────────────────────────────────────────────── */}
      <main className="content" aria-label="Recipe gallery">
        <div className="content__inner">
          <RecipeGallery refreshTrigger={refreshCount} />
        </div>
      </main>
    </div>
  );
}

function WorkspaceGate() {
  const { workspaces, loading } = useWorkspace();

  if (loading) {
    return <div className="auth-loading"><span className="spinner" /></div>;
  }

  if (workspaces.length === 0) {
    return <WorkspaceOnboarding onComplete={() => window.location.reload()} />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkspaceProvider>
          <WorkspaceGate />
        </WorkspaceProvider>
      </AuthGate>
    </AuthProvider>
  );
}
