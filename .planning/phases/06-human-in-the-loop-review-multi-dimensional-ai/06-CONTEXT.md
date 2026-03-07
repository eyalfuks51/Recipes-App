# Phase 6: Human-in-the-Loop Review & Multi-Dimensional AI - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the AI extraction to a rich multi-dimensional schema (meal type, cuisine, main ingredient, equipment, prep/cook time, dietary tags, cooking steps) and deliver a premium review/edit screen where users validate AI output — with the original Instagram post visible alongside the editable form — before explicitly approving and saving to the database.

This phase does NOT add: new workspace features, recipe search/filtering, batch processing, or alternate AI providers. Those belong in future phases.

</domain>

<decisions>
## Implementation Decisions

### AI dimensions to extract

Expand the Moonshot AI response schema to include ALL of the following fields. Every extracted string, label, and step MUST be in Hebrew:

**New fields (in addition to existing title, main_category, difficulty, ingredients[]):**
- `meal_type` — free-form Hebrew string (e.g., `ארוחת בוקר`, `ארוחת ערב`, `חטיף`, `קינוח`)
- `cuisine` — fixed enum, Hebrew (see ALLOWED_CUISINES below)
- `main_ingredient` — single Hebrew string, the primary ingredient only (e.g., `עוף`, `פסטה`)
- `equipment_needed` — array of Hebrew strings (e.g., `['מיקסר', 'תבנית אפייה']`)
- `prep_time` — integer minutes or `null` if not determinable from caption
- `cook_time` — integer minutes or `null` if not determinable from caption
- `dietary_tags` — array from fixed enum (see ALLOWED_DIETARY_TAGS below)
- `instructions` — array of Hebrew step strings (each step is clean text, no number prefix); `[]` if no steps found

**ALLOWED_CUISINES (fixed list, server-enforced):**
`'איטלקי'`, `'אסייתי'`, `'מקסיקני'`, `'אמריקאי'`, `'ים-תיכוני'`, `'ישראלי'`, `'מרוקאי'`, `'עיראקי'`, `'תוניסאי'`, `'צרפתי'`, `'פיוז'ן'`, `'אחר'`

**ALLOWED_DIETARY_TAGS (fixed list, server-enforced):**
`'עתיר חלבון'`, `'דל פחמימה'`, `'מושחת'`, `'קליל'`

### AI model and prompt strategy

- **Single Moonshot AI call** — one structured JSON schema prompt handles all dimensions
- **Model:** `moonshot-v1-8k` (current model — no upgrade needed)
- **Hebrew enforcement:** System prompt must explicitly instruct AI to return ALL text in Hebrew, including step text, ingredient names, equipment names, and all enum values

### Server-side normalization (same pattern as Phase 4 ALLOWED_CATEGORIES)

- Unknown `cuisine` value → normalized to `'אחר'`
- Unrecognized `dietary_tags` values → stripped from array (only known tags kept)
- `instructions` missing or null → normalize to `[]`
- `equipment_needed` missing or null → normalize to `[]`
- `dietary_tags` missing or null → normalize to `[]`

### Database schema changes

- **Backward-compatible:** all new fields added as nullable columns to the existing `recipes` table (JSONB for arrays, INTEGER for times, TEXT for strings)
- **No backfill:** existing recipes keep `null` for new fields — UI handles null gracefully
- New columns: `cuisine`, `meal_type`, `main_ingredient`, `equipment_needed` (JSONB), `prep_time` (INTEGER), `cook_time` (INTEGER), `dietary_tags` (JSONB), `instructions` (JSONB)
- **`instructions` already accepted by `/api/confirm-recipe`** — add the rest

### Review/Edit screen (premium dedicated screen)

- Replaces or supersedes the existing `RecipeEditForm` — this is a premium dedicated screen
- **Desktop layout:** split-screen — Instagram iframe embed on the left, scrollable edit form on the right
- **Mobile layout:** tab switcher with two tabs: "פוסט" (shows Instagram iframe) and "עריכה" (shows the edit form)
- **Instagram embed:** live iframe (same approach as RecipeModal) — user sees the original video/photo while reviewing
- **Explicit save:** "אישור ושמירה" (Approve & Save) button — NO auto-save; nothing goes to DB until this is clicked

### Edit form field hierarchy (top to bottom)

1. **Title** — large, prominent editable text input
2. **Instructions** — numbered steps, each in its own text input
   - User can edit, delete, and add steps (+ Add Step button)
   - UI renders step numbers dynamically (not stored in the text)
3. **Ingredients** — existing ingredient list editing (same as current form)
4. **Metadata section** — all fields always visible (no collapsible sections):
   - Main Category (existing dropdown, ALLOWED_CATEGORIES)
   - Cuisine (dropdown, ALLOWED_CUISINES)
   - Meal Type (text input, free-form Hebrew)
   - Main Ingredient (text input)
   - Difficulty (existing: קל / בינוני / קשה)
   - Prep Time (number input, minutes)
   - Cook Time (number input, minutes)
   - Dietary Tags (multi-select checkboxes, ALLOWED_DIETARY_TAGS)
   - Equipment Needed (tag-style editable list)

### Claude's Discretion

- Exact SCSS styling of the new review screen (must be consistent with existing app aesthetic)
- Drag-to-reorder for instructions steps (nice-to-have — use judgment on complexity)
- Exact Hebrew label text for UI elements beyond what is specified above
- Whether to refactor `RecipeEditForm.jsx` or create a new `RecipeReviewScreen.jsx` component
- Supabase migration SQL specifics (column types, nullability constraints)

</decisions>

<specifics>
## Specific Ideas

- All extracted text must be Hebrew — this is non-negotiable. The AI prompt must enforce it explicitly.
- The dietary tags are intentionally "vibe" tags (`מושחת`, `קליל`) not just health labels — captures the recipe's personality
- The split-screen review feels like an "inbox" for AI-extracted recipes — user sees the source post while verifying each field
- `instructions` stored as clean step text (no number prefix) so the UI can dynamically number them and support reordering

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `moonshot.js` — `ALLOWED_CATEGORIES` pattern and `extractRecipeFromCaption()`: expand the JSON schema and add `ALLOWED_CUISINES` + `ALLOWED_DIETARY_TAGS` exports following the same pattern
- `RecipeModal.jsx` — Instagram iframe embed already implemented; reuse the iframe approach for the review screen left panel
- `RecipeEditForm.jsx` — existing form component to use as base or reference for the new premium review screen
- `/api/confirm-recipe` route — already accepts `instructions`; needs to accept all new fields
- `/api/extract-recipe` route — already returns AI data without saving; needs to return new fields

### Established Patterns
- `ALLOWED_CATEGORIES` + post-parse normalization in `moonshot.js` → follow same pattern for `ALLOWED_CUISINES` and `ALLOWED_DIETARY_TAGS`
- Two-step extract → confirm flow is locked (Phase 4); this phase enriches the data flowing through it, not the flow itself
- Nullable workspace_id backward-compat pattern (Phase 4) → same approach for all new recipe columns

### Integration Points
- `server/src/services/moonshot.js` — expand `HEBREW_SYSTEM_PROMPT` and `extractRecipeFromCaption()` return schema
- `server/src/routes/recipe.js` — `/api/extract-recipe` and `/api/confirm-recipe` need to pass new fields through
- `server/src/services/supabase.js` — `saveRecipe()` needs to accept and persist new fields
- `client/src/components/RecipeEditForm.jsx` — upgrade or replace with premium review screen
- `supabase/migrations/` — new migration SQL to add columns to `recipes` table

</code_context>

<deferred>
## Deferred Ideas

- Alternate AI providers for extraction (Claude, GPT-4) — future phase
- Batch recipe re-extraction (backfilling old recipes with new fields) — future phase
- Nutritional info extraction (calories, macros) — future phase
- Recipe search and filtering by cuisine/dietary tags — future phase
- AI confidence scores shown to reviewer — future phase

</deferred>

---

*Phase: 06-human-in-the-loop-review-multi-dimensional-ai*
*Context gathered: 2026-03-07*
