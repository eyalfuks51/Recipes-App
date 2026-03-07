---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/RecipeReviewScreen.jsx
  - client/src/components/RecipeReviewScreen.scss
  - client/src/components/RecipeModal.jsx
  - client/src/components/RecipeModal.scss
  - server/src/services/scraper.js
  - server/src/routes/recipe.js
  - server/src/services/supabase.js
  - supabase/migrations/20260308_thumbnail_url.sql
autonomous: true
requirements: [VISUAL-FIX-01, VISUAL-FIX-02, VISUAL-FIX-03, VISUAL-FIX-04]

must_haves:
  truths:
    - "Review screen action buttons (אישור ושמירה, ביטול) are always visible without scrolling"
    - "RecipeModal instructions section renders an ordered list when instructions array has items, renders nothing when array is empty"
    - "Media area in both RecipeModal and RecipeReviewScreen shows a thumbnail image with play button when thumbnail_url is available; falls back to iframe when not"
    - "Media containers maintain 9:16 aspect ratio and never collapse when iframe is blocked"
    - "thumbnail_url is extracted from og:image meta tag and stored in Supabase recipes table"
  artifacts:
    - path: "client/src/components/RecipeReviewScreen.jsx"
      provides: "Sticky footer actions outside scrollable form"
    - path: "client/src/components/RecipeModal.jsx"
      provides: "Smart media container with thumbnail fallback and correct instructions rendering"
    - path: "server/src/services/scraper.js"
      provides: "fetchOgImage() returning og:image URL; scrapeInstagramCaption returns {caption, thumbnailUrl}"
    - path: "supabase/migrations/20260308_thumbnail_url.sql"
      provides: "thumbnail_url TEXT column on recipes table"
  key_links:
    - from: "server/src/services/scraper.js scrapeInstagramCaption"
      to: "server/src/routes/recipe.js /api/extract-recipe"
      via: "destructured {caption, thumbnailUrl} return value"
    - from: "/api/confirm-recipe"
      to: "server/src/services/supabase.js saveRecipe"
      via: "thumbnail_url field in request body and recipeData spread"
    - from: "client RecipeReviewScreen"
      to: "/api/confirm-recipe"
      via: "thumbnail_url in JSON body"
---

<objective>
Fix four confirmed visual and functional regressions introduced during Phase 6:
1. Review screen action buttons scroll out of view (sticky footer fix)
2. Empty instructions array renders as "[]" in RecipeModal (guard fix)
3. Media area collapses when iframe is blocked (9:16 aspect-ratio fix)
4. Instagram iframes frequently show "Preview unavailable" (og:image thumbnail fallback)

Purpose: The review screen is the primary human-in-the-loop UX. All four issues degrade the experience for the primary workflow.
Output: Fixed JSX/SCSS for both components, updated backend pipeline to extract and persist thumbnail_url, DB migration for the new column.
</objective>

<execution_context>
@C:/Users/Eyal/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Eyal/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix RecipeReviewScreen — sticky footer + CSS layout</name>
  <files>client/src/components/RecipeReviewScreen.jsx, client/src/components/RecipeReviewScreen.scss</files>
  <action>
    **JSX changes (RecipeReviewScreen.jsx):**

    Extract `.review-actions` div OUT of the `<form>` element. The new structure inside `.review-right` must be:

    ```jsx
    <div className="review-right ...">
      <form onSubmit={handleSave} className="review-form">
        {/* all existing fields stay here */}
        {saveError && <p className="review-error">{saveError}</p>}
        {/* DO NOT include review-actions here anymore */}
      </form>

      {/* Sticky footer OUTSIDE the form */}
      <div className="review-actions">
        <button type="button" className="btn-secondary" onClick={onDiscard}>
          ביטול
        </button>
        <button type="submit" form="review-form" className="btn-primary" disabled={saving}>
          {saving ? 'שומר...' : 'אישור ושמירה'}
        </button>
      </div>
    </div>
    ```

    Add `id="review-form"` to the `<form>` element so the submit button outside can target it via `form="review-form"`.

    **SCSS changes (RecipeReviewScreen.scss):**

    `.review-right`:
    - Remove `max-width: 600px` if present
    - Add: `display: flex; flex-direction: column; height: 100%; overflow: hidden;`

    `.review-form` (new class, or target `form` inside `.review-right`):
    - `flex: 1; overflow-y: auto; padding: 32px;`

    `.review-actions`:
    - Remove from inside form scroll area positioning
    - Add: `flex-shrink: 0; padding: 16px 32px; border-top: 1px solid #e5e7eb; background: #fff; display: flex; gap: 12px; justify-content: flex-end;`
    - On mobile (max-width: 768px): `padding: 12px 16px;`

    `.review-left iframe`:
    - Add: `aspect-ratio: 9/16; width: 100%; border: none;`

    `.review-left`:
    - Ensure: `height: 100%; overflow: hidden;` (desktop keeps existing height, just make iframe aspect-ratio constrained)
  </action>
  <verify>
    Open the review screen in browser. Scroll the form. Confirm action buttons remain visible at the bottom of `.review-right` at all times without scrolling. Confirm no horizontal overflow/clipping on the inputs.
  </verify>
  <done>Action buttons are always visible. Form scrolls independently. No max-width clipping on inputs.</done>
</task>

<task type="auto">
  <name>Task 2: Fix RecipeModal — empty instructions bug + 9:16 aspect ratio</name>
  <files>client/src/components/RecipeModal.jsx, client/src/components/RecipeModal.scss</files>
  <action>
    **Instructions rendering fix (RecipeModal.jsx):**

    Replace the current instructions block (lines ~232–237):
    ```jsx
    {recipe.instructions && (
      <section className="modal-instructions">
        <h3 className="modal-section-heading">Instructions</h3>
        <p className="modal-instructions-text" dir="auto">{recipe.instructions}</p>
      </section>
    )}
    ```

    With:
    ```jsx
    {Array.isArray(recipe.instructions)
      ? recipe.instructions.length > 0 && (
          <section className="modal-instructions">
            <h3 className="modal-section-heading">הוראות הכנה</h3>
            <ol className="modal-instructions-list" dir="rtl">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="modal-instruction-step">{step}</li>
              ))}
            </ol>
          </section>
        )
      : !!recipe.instructions && (
          <section className="modal-instructions">
            <h3 className="modal-section-heading">הוראות הכנה</h3>
            <p className="modal-instructions-text" dir="auto">{recipe.instructions}</p>
          </section>
        )
    }
    ```

    **9:16 aspect ratio fix (RecipeModal.jsx + RecipeModal.scss):**

    In the JSX, wrap the iframe/fallback inside `.modal-left` with a new `<div className="modal-media-container">`:
    ```jsx
    <div className="modal-left">
      <div className="modal-media-container">
        {embedUrl ? (
          <iframe className="modal-iframe" ... />
        ) : (
          <div className="modal-iframe-fallback">...</div>
        )}
      </div>
    </div>
    ```

    In RecipeModal.scss, add `.modal-media-container`:
    ```scss
    .modal-media-container {
      width: 100%;
      aspect-ratio: 9 / 16;
      background: #0f0f0f;
      border-radius: 12px;
      overflow: hidden;
      position: relative;

      iframe,
      .modal-iframe-fallback {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
      }
    }
    ```

    Also add instructions list styling in RecipeModal.scss:
    ```scss
    .modal-instructions-list {
      padding-right: 20px;
      margin: 0;

      .modal-instruction-step {
        margin-bottom: 8px;
        line-height: 1.6;
        color: #374151;
        font-size: 14px;
      }
    }
    ```
  </action>
  <verify>
    1. Open a recipe with empty instructions array — confirm no "[]" text renders in the modal.
    2. Open a recipe with instructions array — confirm a numbered Hebrew list renders.
    3. Open a recipe with a blocked Instagram iframe — confirm `.modal-media-container` maintains 9:16 shape and does not collapse.
  </verify>
  <done>Empty instructions renders nothing. Array instructions render as ordered list. Media area maintains 9:16 ratio even when iframe is blocked.</done>
</task>

<task type="auto">
  <name>Task 3: Backend — og:image extraction + thumbnail_url pipeline</name>
  <files>server/src/services/scraper.js, server/src/routes/recipe.js, server/src/services/supabase.js, supabase/migrations/20260308_thumbnail_url.sql</files>
  <action>
    **scraper.js — add fetchOgImage and update return shape:**

    Add this function before `scrapeInstagramCaption`:
    ```js
    async function fetchOgImage(url) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)',
            'Accept': 'text/html',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return match?.[1] ?? null;
      } catch {
        return null;
      }
    }
    ```

    Update `scrapeInstagramCaption` to run `fetchOgImage` in parallel and return both:
    ```js
    // At the top of scrapeInstagramCaption, run both in parallel:
    const [caption, thumbnailUrl] = await Promise.all([
      // existing caption extraction logic (wrap in async IIFE or extract helper)
      (async () => { /* existing logic */ })(),
      fetchOgImage(url),
    ]);
    return { caption, thumbnailUrl };
    ```

    If the existing function has a complex early-return structure, instead just add at the end:
    ```js
    // After caption is obtained, before returning:
    const thumbnailUrl = await fetchOgImage(url);
    return { caption, thumbnailUrl };
    ```

    Choose whichever approach fits the existing function structure. The key contract: function returns `{ caption, thumbnailUrl }` where `thumbnailUrl` may be null.

    **routes/recipe.js — update both endpoints:**

    `/api/extract-recipe`: Destructure the new return shape:
    ```js
    const { caption, thumbnailUrl } = await scrapeInstagramCaption(instagram_url);
    // Pass thumbnailUrl through to client in response:
    res.json({ recipe: extractedRecipe, thumbnail_url: thumbnailUrl ?? null });
    ```

    `/api/confirm-recipe`: Accept `thumbnail_url` from request body and pass to saveRecipe:
    ```js
    const { instagram_url, title, ..., thumbnail_url } = req.body;
    await saveRecipe({ instagram_url, title, ..., thumbnail_url });
    ```

    **supabase.js — update saveRecipe:**

    In the `recipeData` object spread, add:
    ```js
    ...(thumbnail_url != null && { thumbnail_url }),
    ```

    **Migration file — supabase/migrations/20260308_thumbnail_url.sql:**
    ```sql
    -- Add thumbnail_url column to recipes table
    ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ```

    Run the migration: `npx supabase db push` or apply via Supabase dashboard SQL editor if local CLI not set up.
  </action>
  <verify>
    POST to `/api/extract-recipe` with a valid Instagram URL. Response JSON must contain a `thumbnail_url` field (string or null — not missing). Confirm `scrapeInstagramCaption` no longer returns a plain string (check callers don't break).
  </verify>
  <done>extract-recipe response includes thumbnail_url. confirm-recipe accepts and persists thumbnail_url. recipes table has thumbnail_url column.</done>
</task>

<task type="auto">
  <name>Task 4: Frontend — smart media container with thumbnail + play button</name>
  <files>client/src/components/RecipeModal.jsx, client/src/components/RecipeModal.scss, client/src/components/RecipeReviewScreen.jsx, client/src/components/RecipeReviewScreen.scss</files>
  <action>
    **RecipeReviewScreen.jsx — wire thumbnail_url prop and smart media:**

    Add `thumbnailUrl` to the component props:
    ```jsx
    export function RecipeReviewScreen({ extractedRecipe, instagramUrl, workspaceId, thumbnailUrl, onSaved, onDiscard }) {
    ```

    Replace the current `.review-left` content:
    ```jsx
    <div className="review-left ...">
      <div className="review-media-container">
        {thumbnailUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="review-thumbnail-link"
            aria-label="פתח פוסט ב-Instagram"
          >
            <img src={thumbnailUrl} alt="תצוגה מקדימה" className="review-thumbnail-img" />
            <div className="review-play-btn" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.9)" />
                <polygon points="16,13 30,20 16,27" fill="#0f0f0f" />
              </svg>
            </div>
          </a>
        ) : embedUrl ? (
          <iframe src={embedUrl} frameBorder="0" scrolling="no" allowTransparency="true" loading="lazy" title="Instagram post" />
        ) : (
          <div className="review-left-fallback">
            <p>לא ניתן לטעון את הפוסט</p>
          </div>
        )}
      </div>
    </div>
    ```

    **RecipeModal.jsx — wire thumbnail_url from recipe + smart media:**

    `recipe.thumbnail_url` is already on the recipe object from Supabase. Update the `modal-left` section (replacing the `modal-media-container` wrapper added in Task 2):

    ```jsx
    <div className="modal-left">
      <div className="modal-media-container">
        {recipe.thumbnail_url ? (
          <a
            href={recipe.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-thumbnail-link"
            aria-label="View on Instagram"
          >
            <img src={recipe.thumbnail_url} alt={recipe.title} className="modal-thumbnail-img" />
            <div className="modal-play-btn" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="rgba(255,255,255,0.9)" />
                <polygon points="19,15 36,24 19,33" fill="#0f0f0f" />
              </svg>
            </div>
          </a>
        ) : embedUrl ? (
          <iframe className="modal-iframe" src={embedUrl} title={`Instagram post: ${recipe.title}`} frameBorder="0" scrolling="no" allowTransparency="true" loading="lazy" />
        ) : (
          <div className="modal-iframe-fallback">
            <IconInstagram />
            <span>Preview unavailable</span>
          </div>
        )}
      </div>
    </div>
    ```

    **SCSS additions — RecipeReviewScreen.scss:**
    ```scss
    .review-media-container {
      width: 100%;
      aspect-ratio: 9 / 16;
      background: #0f0f0f;
      overflow: hidden;
      position: relative;

      iframe,
      .review-left-fallback,
      .review-thumbnail-link {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
    }

    .review-thumbnail-link {
      display: block;
      text-decoration: none;
      position: relative;
    }

    .review-thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .review-play-btn {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.15);
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }

      svg {
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        transition: transform 0.15s;
      }
    }

    .review-thumbnail-link:hover .review-play-btn svg {
      transform: scale(1.08);
    }
    ```

    **SCSS additions — RecipeModal.scss** (add to `.modal-media-container` block already added in Task 2):
    ```scss
    .modal-thumbnail-link {
      position: absolute;
      inset: 0;
      display: block;
      text-decoration: none;
    }

    .modal-thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .modal-play-btn {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.1);
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.25);
      }

      svg {
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
        transition: transform 0.15s;
      }
    }

    .modal-thumbnail-link:hover .modal-play-btn svg {
      transform: scale(1.08);
    }
    ```

    **Wire thumbnailUrl through SubmitForm/parent component:**

    Find where `RecipeReviewScreen` is rendered (likely `SubmitForm.jsx` or `App.jsx`). The `thumbnail_url` comes back from `/api/extract-recipe` response. Pass it as `thumbnailUrl` prop to `RecipeReviewScreen`.
  </action>
  <verify>
    1. Extract a recipe — confirm thumbnail image with play button renders in review screen if thumbnail_url is returned.
    2. Open an existing recipe modal with thumbnail_url in DB — confirm thumbnail + play button renders.
    3. Click the play button — confirm Instagram URL opens in new tab.
    4. For a recipe without thumbnail_url — confirm iframe fallback renders within the 9:16 container.
  </verify>
  <done>Thumbnail + play button renders when thumbnail_url available. Clicking opens Instagram in new tab. Iframe fallback renders correctly with 9:16 aspect ratio maintained. No collapsed media containers.</done>
</task>

</tasks>

<verification>
1. `cd client && npm run build` — no TypeScript/lint errors
2. Open review screen, scroll form — action buttons stay visible
3. Open modal for recipe with empty instructions — no "[]" text visible
4. Open modal for recipe with instructions array — numbered list renders
5. Open modal for recipe where iframe is blocked — 9:16 container holds shape, thumbnail or fallback visible
6. POST `/api/extract-recipe` — response includes `thumbnail_url` key
7. New recipe flow end-to-end — thumbnail_url saved in Supabase, visible in modal
</verification>

<success_criteria>
- Action buttons always visible in review screen without scrolling
- Empty instructions never render as "[]"
- Media containers never collapse — 9:16 aspect ratio enforced
- Recipes with thumbnail_url show image + play button; clicking opens Instagram in new tab
- Recipes without thumbnail_url fall back to iframe within same 9:16 container
- Backend returns and persists thumbnail_url; DB has thumbnail_url column
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-phase-6-visual-regressions-css-layou/1-SUMMARY.md` with what was changed, any deviations from the plan, and confirmation of success criteria met.
</output>
