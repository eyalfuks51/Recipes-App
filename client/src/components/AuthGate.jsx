import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import './AuthGate.scss';

export function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    const handleGoogleSignIn = () => {
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
    };

    return (
      <div className="auth-gate" dir="rtl">
        {/* Floating food decorations */}
        <img className="auth-gate__float auth-gate__float--pasta" src="/images/pasta.png" alt="" />
        <img className="auth-gate__float auth-gate__float--dumplings" src="/images/dumplings.png" alt="" />
        <img className="auth-gate__float auth-gate__float--pancakes" src="/images/pancakes.png" alt="" />

        {/* Main content */}
        <div className="auth-gate__content">
          <h1 className="auth-gate__logo">Re-smash</h1>

          <div className="auth-gate__hero">
            <video src="/videos/cooking_video.mp4" className="auth-gate__hero-img" autoPlay loop muted playsInline />
          </div>

          <p className="auth-gate__tagline">
            כל המתכונים שאהבת מהרשת<br />מסודרים במקום אחד.
          </p>

          <button className="auth-gate__cta" onClick={handleGoogleSignIn}>
            כאן מתחילים
          </button>

          <p className="auth-gate__signin-link">
            ואם כבר ביקרת פה{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); handleGoogleSignIn(); }}>להתחברות</a>
          </p>
        </div>
      </div>
    );
  }

  return children;
}
