import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { WorkspaceProvider, useWorkspace } from './lib/workspace.jsx';
import { supabase } from './lib/supabase.js';
import { InviteHandler } from './components/InviteHandler.jsx';
import { AuthGate } from './components/AuthGate';
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding.jsx';
import { SubmitForm } from './components/SubmitForm';
import { RecipeGallery } from './components/RecipeGallery';
import { QuickFilterPills } from './components/QuickFilterPills';
import { FilterBottomSheet } from './components/FilterBottomSheet';
import { JoinWorkspaceModal } from './components/JoinWorkspaceModal.jsx';
import { LeaveWorkspaceModal } from './components/LeaveWorkspaceModal.jsx';

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
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

  const handleCopyLink = () => {
    if (activeWorkspace?.invite_code) {
      const url = `${window.location.origin}/invite?code=${activeWorkspace.invite_code}`;
      navigator.clipboard.writeText(url);
    }
  };

  const handleWhatsApp = () => {
    if (activeWorkspace?.invite_code) {
      const url = `${window.location.origin}/invite?code=${activeWorkspace.invite_code}`;
      const text = encodeURIComponent(`הצטרפ/י לסביבת העבודה שלי ב-Re-smash: ${url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
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
            right: 0,
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
                  textAlign: 'right',
                  padding: '10px 14px',
                  border: 'none',
                  background: isActive ? '#fff0ec' : 'transparent',
                  color: isActive ? '#e85d3e' : '#1a202c',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {isActive && (
                  <span style={{ marginLeft: '6px', fontSize: '0.75rem' }}>\u2713</span>
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
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>קישור הזמנה</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleCopyLink}
                  title="העתק קישור הזמנה"
                  style={{
                    flexGrow: 1,
                    border: '1px solid #cbd5e0',
                    borderRadius: '4px',
                    background: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  העתק קישור הזמנה
                </button>
                <button
                  onClick={handleWhatsApp}
                  title="שתף בוואטסאפ"
                  style={{
                    border: '1px solid #25D366',
                    borderRadius: '4px',
                    background: '#25D366',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  WA
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={() => { setOpen(false); setJoinOpen(true); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: '#1a202c',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Join Workspace
            </button>
            <button
              onClick={() => { setOpen(false); setLeaveOpen(true); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: '#e53e3e',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Leave Workspace
            </button>
          </div>
        </div>
      )}

      <JoinWorkspaceModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
      <LeaveWorkspaceModal
        isOpen={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        workspace={activeWorkspace}
      />
    </div>
  );
}

function AppContent() {
  const [refreshCount, setRefreshCount] = useState(0);
  const { user, signOut } = useAuth();

  // ── Filter state ──────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    mealType: null,
    dietaryTags: [],
    prepTimeRange: null,
    mainIngredient: null,
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const hasActiveAdvancedFilters = filters.dietaryTags.length > 0 || filters.prepTimeRange !== null || filters.mainIngredient !== null;

  const handleQuickFilter = (mealType) => {
    setFilters((prev) => ({ ...prev, mealType }));
  };

  const handleAdvancedFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setFilterSheetOpen(false);
  };

  const handleClearAllFilters = () => {
    setFilters({ mealType: null, dietaryTags: [], prepTimeRange: null, mainIngredient: null });
    setFilterSheetOpen(false);
  };

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
            <span className="brand__name">Re-smash</span>
          </div>
          <WorkspaceSwitcher />
          {user && (
            <button className="btn-signout" onClick={signOut}>
              התנתקות
            </button>
          )}
        </div>
      </header>

      {/* ── Hero / Submit ──────────────────────────────────────────────── */}
      <section className="hero" aria-label="Submit a recipe">
        <div className="hero__inner">
          <SubmitForm onSuccess={handleSuccess} />
        </div>
      </section>

      {/* ── Gallery ────────────────────────────────────────────────────── */}
      <main className="content" aria-label="Recipe gallery">
        <div className="content__inner">
          <RecipeGallery
            refreshTrigger={refreshCount}
            filters={filters}
            activeFilter={filters.mealType}
            onFilterChange={handleQuickFilter}
            onOpenFilterSheet={() => setFilterSheetOpen(true)}
            hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          />
        </div>
      </main>

      {/* ── Filter Bottom Sheet ───────────────────────────────────────── */}
      <FilterBottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        currentFilters={filters}
        onApply={handleAdvancedFilters}
        onClearAll={handleClearAllFilters}
      />
    </div>
  );
}

function WorkspaceGate() {
  const { workspaces, loading, refreshWorkspaces, setActiveWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || loading) return;
    const code = localStorage.getItem('pendingInviteCode');
    if (!code) return;

    const autoJoin = async () => {
      localStorage.removeItem('pendingInviteCode'); // clear early to prevent double-join
      const trimmedCode = code.trim().toUpperCase();

      const { data: ws, error: lookupErr } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('invite_code', trimmedCode)
        .single();

      if (lookupErr || !ws) {
        console.warn('pendingInviteCode: workspace not found for code', trimmedCode);
        return;
      }

      const { error: joinErr } = await supabase
        .from('workspace_users')
        .upsert(
          { workspace_id: ws.id, user_id: user.id, role: 'member' },
          { onConflict: 'workspace_id,user_id' }
        );

      if (joinErr) {
        console.warn('pendingInviteCode: join failed', joinErr.message);
        return;
      }

      await refreshWorkspaces();
      setActiveWorkspace(ws.id);
    };

    autoJoin();
  }, [user, loading]);

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
    <BrowserRouter>
      <Routes>
        <Route
          path="/invite"
          element={
            <AuthProvider>
              <InviteHandler />
            </AuthProvider>
          }
        />
        <Route
          path="/*"
          element={
            <AuthProvider>
              <AuthGate>
                <WorkspaceProvider>
                  <WorkspaceGate />
                </WorkspaceProvider>
              </AuthGate>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
