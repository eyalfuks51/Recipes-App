# Summary: Plan 03-01 — Vite/React Project Scaffold

## Files Created

| File | Purpose |
|------|---------|
| `client/package.json` | Project manifest with all dependencies |
| `client/index.html` | Vite HTML entry, loads Inter font from Google Fonts |
| `client/vite.config.js` | Vite + React plugin config |
| `client/vercel.json` | SPA rewrite: `/(.*) → /index.html` |
| `client/.env.example` | Documents VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| `client/src/main.jsx` | Renders App into #root, imports main.scss |
| `client/src/App.jsx` | Shell — expanded in 03-02/03-03 |
| `client/src/styles/main.scss` | Full design token system (CSS custom properties), reset, global layout |

## Dependency Versions

```json
{
  "@supabase/supabase-js": "^2.49.1",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^4.3.4",
  "sass": "^1.86.0",
  "vite": "^6.4.1"  // resolved at install time
}
```

## Key Decisions

- **Font**: Google Fonts Inter (400/500/600/700) loaded via `<link>` in index.html — avoids FOUT, CDN cached
- **Design tokens**: CSS custom properties in `:root` for colors, radii, shadows, transitions — enables consistent theming across all SCSS files
- **App layout**: Flexbox column on `.app` so hero sticks at top and gallery fills remaining height
- **No SCSS partials**: Single `main.scss` for globals (avoids unnecessary file fragmentation for this scale)

## Verification Results

- [x] `npm run build` exits 0, produces `dist/` (10kB CSS, 325kB JS)
- [x] `client/vercel.json` contains rewrites array
- [x] `client/.env.example` documents all 3 required env vars
- [x] `client/src/main.jsx` imports `./styles/main.scss`
- [x] `client/package.json` lists `@supabase/supabase-js`, `sass`, `@vitejs/plugin-react`
