import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { useAuth } from './auth.jsx';

export const WorkspaceContext = createContext({
  workspaces: [],
  activeWorkspaceId: null,
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  loading: true,
});

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from('workspace_users')
      .select('workspace_id, workspaces(id, name, invite_code)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load workspaces:', error.message);
          setWorkspaces([]);
          setActiveWorkspaceId(null);
          setLoading(false);
          return;
        }

        const list = (data ?? [])
          .map((row) => row.workspaces)
          .filter(Boolean)
          .map(({ id, name, invite_code }) => ({
            id,
            name,
            invite_code: invite_code ?? null,
          }));

        setWorkspaces(list);

        const stored = localStorage.getItem('activeWorkspaceId');
        const isValid = list.some((ws) => ws.id === stored);
        const resolved = isValid ? stored : list[0]?.id ?? null;

        setActiveWorkspaceId(resolved);
        setLoading(false);
      });
  }, [user]);

  const setActiveWorkspace = (id) => {
    setActiveWorkspaceId(id);
    localStorage.setItem('activeWorkspaceId', id);
  };

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeWorkspaceId, activeWorkspace, setActiveWorkspace, loading }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
