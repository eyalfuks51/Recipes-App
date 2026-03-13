# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite, hot reload)
- **Production build:** `npm run build`
- **Preview build:** `npm run preview`
- No test framework is configured. No linter is configured.

## Environment Variables

Requires a `.env` file with:
- `VITE_API_URL` — Backend server URL (used by SubmitForm and RecipeEditForm for API calls)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key

## Architecture

React 19 + Vite + SCSS. No router — single-page app with modal-based navigation.

### Provider Hierarchy

```
AuthProvider → AuthGate → WorkspaceProvider → WorkspaceGate → AppContent
```

- **AuthProvider** (`lib/auth.jsx`): Supabase Google OAuth session management via `useAuth()` hook.
- **AuthGate** (`components/AuthGate.jsx`): Blocks unauthenticated users with a sign-in screen.
- **WorkspaceProvider** (`lib/workspace.jsx`): Loads user's workspaces from Supabase, manages active workspace selection (persisted in localStorage) via `useWorkspace()` hook.
- **WorkspaceGate** (in `App.jsx`): Shows `WorkspaceOnboarding` if user has no workspaces, otherwise renders `AppContent`.

### Data Flow

Two-step recipe submission:
1. **Extract:** `SubmitForm` → `POST /api/extract-recipe` → AI returns structured recipe preview
2. **Review:** `RecipeReviewScreen` shows split-screen (Instagram thumbnail + editable form)
3. **Confirm:** User edits and saves → `POST /api/confirm-recipe` → persisted to Supabase

Gallery reads directly from Supabase (no backend proxy): `RecipeGallery` queries `recipes` table filtered by `activeWorkspaceId`.

### Supabase Client

Single shared client in `lib/supabase.js`. Used directly by components for reads (gallery, ingredients, workspace queries, ingredient checkbox state) and by auth/workspace providers.

### Styling

- Global tokens and layout in `src/styles/main.scss` (CSS custom properties under `:root`)
- Component-scoped SCSS files co-located with components (e.g., `RecipeGallery.scss`)
- No CSS modules — uses BEM-style class naming

### Key Conventions

- Context files must use `.jsx` extension (not `.js`) for JSX content
- `ALLOWED_CATEGORIES`, `ALLOWED_CUISINES`, `ALLOWED_DIETARY_TAGS`, `ALLOWED_MEAL_TYPES` are duplicated in `RecipeReviewScreen.jsx` (and partially in `RecipeEditForm.jsx`) — must stay in sync with `server/src/services/moonshot.js`
- `DIFFICULTY_MAP` is duplicated in both `RecipeGallery.jsx` and `RecipeModal.jsx`
- All recipe content and UI labels in the review/edit forms are in Hebrew
- `RecipeModal` renders via `createPortal` to `document.body`
