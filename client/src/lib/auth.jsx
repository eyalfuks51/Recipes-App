import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes (handles OAuth redirect callback automatically)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // ponytail: Supabase re-fires SIGNED_IN/TOKEN_REFRESHED on every tab
      // focus & token refresh. Keep the same user object ref when the id is
      // unchanged — a new ref cascades through WorkspaceProvider and remounts
      // AppContent, wiping any in-progress recipe preview. Compare by id.
      const next = session?.user ?? null;
      setUser((prev) => (prev?.id === next?.id ? prev : next));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
