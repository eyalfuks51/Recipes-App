import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { WorkspaceProvider, useWorkspace } from './lib/workspace.jsx';
import { supabase } from './lib/supabase.js';
import { joinWorkspaceByInvite } from './lib/workspaceApi.js';
import { InviteHandler } from './components/InviteHandler.jsx';
import { AuthGate } from './components/AuthGate';
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding.jsx';
import { SubmitForm } from './components/SubmitForm';
import { RecipeGallery } from './components/RecipeGallery';
import { FilterBottomSheet } from './components/FilterBottomSheet';
import { RecipeLibraryMenu } from './components/RecipeLibraryMenu.jsx';
import { PwaInstallPrompt, PwaInstallManual, usePwaInstall } from './components/PwaInstallPrompt.jsx';

function AppContent() {
  const [refreshCount, setRefreshCount] = useState(0);
  const { user, signOut } = useAuth();
  const pwa = usePwaInstall();

  const [searchParams, setSearchParams] = useSearchParams();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filters = {
    mealType: searchParams.get('meal') || null,
    dietaryTags: searchParams.get('tags') ? [...new Set(searchParams.get('tags').split(',').filter(Boolean))] : [],
    prepTimeRange: searchParams.get('prep') || null,
    mainIngredient: searchParams.get('ingredient') || null,
    query: searchParams.get('q') || '',
  };

  const hasActiveAdvancedFilters =
    filters.dietaryTags.length > 0 ||
    filters.prepTimeRange !== null ||
    filters.mainIngredient !== null;

  const hasAnyFilter = !!(filters.mealType || filters.dietaryTags.length || filters.prepTimeRange || filters.mainIngredient || filters.query.trim());

  const buildParams = (next) => {
    const p = new URLSearchParams(searchParams);
    p.delete('meal'); if (next.mealType) p.set('meal', next.mealType);
    p.delete('tags'); if (next.dietaryTags?.length) p.set('tags', next.dietaryTags.join(','));
    p.delete('prep'); if (next.prepTimeRange) p.set('prep', next.prepTimeRange);
    p.delete('ingredient'); if (next.mainIngredient) p.set('ingredient', next.mainIngredient);
    p.delete('q'); if (next.query) p.set('q', next.query);
    return p;
  };

  const handleQuickFilter = (mealType) => {
    setSearchParams(buildParams({ ...filters, mealType }));
  };

  const handleAdvancedFilters = (newFilters) => {
    setSearchParams(buildParams({ ...filters, ...newFilters }));
    setFilterSheetOpen(false);
  };

  const handleSearch = (query) => {
    setSearchParams(buildParams({ ...filters, query }), { replace: true });
  };

  const handleRemoveChip = (chip) => {
    const next = { ...filters };
    if (chip.type === 'meal') next.mealType = null;
    else if (chip.type === 'tag') next.dietaryTags = filters.dietaryTags.filter((t) => t !== chip.value);
    else if (chip.type === 'prep') next.prepTimeRange = null;
    else if (chip.type === 'ingredient') next.mainIngredient = null;
    else if (chip.type === 'query') next.query = '';
    setSearchParams(buildParams(next));
  };

  const handleClearAllFilters = () => {
    const p = new URLSearchParams(searchParams);
    ['meal', 'tags', 'prep', 'ingredient', 'q'].forEach((k) => p.delete(k));
    setSearchParams(p);
    setFilterSheetOpen(false);
  };

  const handleSuccess = (recipe) => {
    console.log('New recipe saved~~~~~:', recipe.title);
    setRefreshCount((c) => c + 1);
  };

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <span className="brand__name">Re-smash</span>
          </div>

          <RecipeLibraryMenu pwa={pwa} />

          {user && (
            <button
              className="btn-signout btn-signout--icon"
              onClick={signOut}
              aria-label="התנתקות"
              title="התנתקות"
            />
          )}
        </div>
      </header>

      <section className="hero" aria-label="Submit a recipe">
        <div className="hero__inner">
          <SubmitForm onSuccess={handleSuccess} />
        </div>
      </section>

      <main className="content" aria-label="Recipe gallery">
        <div className="content__inner">
          <RecipeGallery
            refreshTrigger={refreshCount}
            filters={filters}
            activeFilter={filters.mealType}
            onFilterChange={handleQuickFilter}
            onOpenFilterSheet={() => setFilterSheetOpen(true)}
            hasActiveAdvancedFilters={hasActiveAdvancedFilters}
            searchQuery={filters.query}
            onSearchChange={handleSearch}
            onRemoveChip={handleRemoveChip}
            onClearAll={handleClearAllFilters}
            hasAnyFilter={hasAnyFilter}
          />
        </div>
      </main>

      <FilterBottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        currentFilters={filters}
        onApply={handleAdvancedFilters}
        onClearAll={handleClearAllFilters}
      />

      <PwaInstallPrompt pwa={pwa} />
      <PwaInstallManual pwa={pwa} />
    </div>
  );
}

function WorkspaceGate() {
  const { workspaces, loading, refreshWorkspaces, setActiveWorkspace } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || loading) return;
    const code = localStorage.getItem('pendingInviteCode');
    if (!code) return;

    const autoJoin = async () => {
      localStorage.removeItem('pendingInviteCode');
      const trimmedCode = code.trim().toUpperCase();

      try {
        const ws = await joinWorkspaceByInvite(supabase, trimmedCode);
        await refreshWorkspaces();
        setActiveWorkspace(ws.id);
      } catch (err) {
        console.warn('pendingInviteCode: join failed', err.message);
      }
    };

    autoJoin();
  }, [user, loading, refreshWorkspaces, setActiveWorkspace]);

  // Only show the full-screen spinner on the FIRST load. A background refetch
  // (token refresh, tab refocus, screenshot blur) flips loading=true while
  // workspaces are still populated — unmounting AppContent here would wipe any
  // in-progress recipe preview. Keep the app mounted once we have workspaces.
  if (loading && workspaces.length === 0) {
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
