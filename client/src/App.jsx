import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { AuthGate } from './components/AuthGate';
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

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  );
}
