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
    dietaryTags: searchParams.get('tags') ? searchParams.get('tags').split(',') : [],
    prepTimeRange: searchParams.get('prep') || null,
    mainIngredient: searchParams.get('ingredient') || null,
  };

  const hasActiveAdvancedFilters =
    filters.dietaryTags.length > 0 ||
    filters.prepTimeRange !== null ||
    filters.mainIngredient !== null;

  const buildParams = (next) => {
    const p = {};
    if (next.mealType) p.meal = next.mealType;
    if (next.dietaryTags?.length) p.tags = next.dietaryTags.join(',');
    if (next.prepTimeRange) p.prep = next.prepTimeRange;
    if (next.mainIngredient) p.ingredient = next.mainIngredient;
    return p;
  };

  const handleQuickFilter = (mealType) => {
    setSearchParams(buildParams({ ...filters, mealType }));
  };

  const handleAdvancedFilters = (newFilters) => {
    setSearchParams(buildParams({ ...filters, ...newFilters }));
    setFilterSheetOpen(false);
  };

  const handleClearAllFilters = () => {
    setSearchParams({});
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
