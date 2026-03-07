# Summary: Plan 03-02 — URL Submission Form

## Files Created / Modified

| File | Action |
|------|--------|
| `client/src/components/SubmitForm.jsx` | Created — full state machine component |
| `client/src/components/SubmitForm.scss` | Created — premium SCSS styles |
| `client/src/App.jsx` | Updated — renders SubmitForm (finalised in 03-03) |

## SubmitForm Component API

**Props:**
- `onSuccess(recipe)` — called after a successful submit with `{ recipe_id, title, ingredients_count }`

**State machine:**
```
idle → loading → success
              ↘ error
(success/error) resets to same state on next submit
```

**State variables:**
- `url: string` — controlled input value
- `status: 'idle' | 'loading' | 'success' | 'error'`
- `result: { title, ingredients_count } | { error: string } | null`

## onSuccess Wiring (for 03-03 to complete)

In `App.jsx`, `SubmitForm` receives `onSuccess={handleSuccess}`. Plan 03-03 replaces the stub `handleSuccess` with a version that increments `refreshCount`, which is passed as `refreshTrigger` to `RecipeGallery`.

## UI Enhancements (above plan baseline)

- Instagram icon in the input prefix
- CSS spinner animation in button loading state
- Success/error feedback rendered in styled pill with SVG icon and animated entry
- Input has focus ring (3px rgba coral glow) and prefix icon colour transitions
- Button has gradient, hover lift (+shadow), active press-down micro-interactions
- Feedback animates in with `fadeSlideIn` keyframes

## Verification Results

- [x] `npm run build` exits 0
- [x] `import.meta.env.VITE_API_URL` referenced in fetch call
- [x] Button is `disabled` when `status === 'loading'`
- [x] `.error-msg` rendered when status is `'error'`
- [x] `SubmitForm.scss` imported in `SubmitForm.jsx`
- [x] `App.jsx` renders `<SubmitForm onSuccess={handleSuccess} />`
