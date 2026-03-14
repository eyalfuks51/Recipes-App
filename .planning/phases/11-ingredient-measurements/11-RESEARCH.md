# Phase 11: Ingredient Measurements - Research

**Researched:** 2026-03-14
**Domain:** Prompt engineering (Hebrew NLP), Supabase schema migration, backend ingredient pipeline, React ingredient editing
**Confidence:** HIGH — all findings come from direct source code analysis

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-11-01 | DB migration adds `amount` and `unit` columns to `recipe_ingredients` | Migration SQL pattern established; `recipe_ingredients` structure confirmed; RLS policy impact documented |
| REQ-11-02 | AI returns `{name, amount, unit}` objects instead of plain strings | Full current prompt quoted; weakness analysis done; replacement prompt section specified |
| REQ-11-03 | Backend `saveRecipe` and `updateRecipe` insert structured data into new columns | Current insert paths traced; exact code changes identified |
| REQ-11-04 | Frontend renders and allows editing of full ingredient text (e.g. "2 כוסות קמח") | Current textarea approach documented; simplest upgrade path defined |
</phase_requirements>

---

## Summary

The current system treats ingredients as a flat string array. The Moonshot prompt instructs the AI to return `"ingredients": [מערך של שמות מרכיבים בעברית]` — a plain array of name strings with no quantity or unit separation. This means all measurement information is either discarded or fused into the name string, making it unusable for structured display, scaling, or shopping-list generation.

The four categories of edge cases — vague amounts, mixed number formats, compound preparation-embedded names, and quantity/unit separation — all stem from this single root problem: the prompt schema never asked the AI to separate measurement data from ingredient identity.

The fix spans four layers: (1) a new Moonshot prompt section that outputs `{name, amount, unit}` objects, (2) a Supabase migration adding `amount TEXT` and `unit TEXT` columns to `recipe_ingredients`, (3) backend changes in `supabase.js` to propagate the new fields through the ingredients pipeline, and (4) a minimal frontend change in `RecipeReviewScreen.jsx` to initialize and send the ingredient data while preserving the user-friendly single-line editing model.

**Primary recommendation:** Keep the user-facing textarea editing model (one line per ingredient, full string like "2 כוסות קמח") but add a client-side parsing step at save time that splits each line into `{name, amount, unit}` before sending to the API. The AI does the hard extraction; users can correct the full string if needed; the backend stores the parsed structure.

---

## Current System — Exact Analysis

### The Current Moonshot Prompt (full)

The `HEBREW_SYSTEM_PROMPT` constant in `server/src/services/moonshot.js` (line 31–44):

```javascript
`חשוב ביותר: כל הטקסט בתשובה חייב להיות בעברית בלבד. ` +
`אתה עוזר לניתוח מתכונים. קרא את הטקסט הבא וחזור רק ב-JSON תקני עם השדות הבאים: ` +
`{"title": string (שם המתכון בעברית), ` +
`"main_category": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_CATEGORIES.join(', ')}), ` +
`"difficulty": string (אחד מ: קל, בינוני, קשה), ` +
`"ingredients": [מערך של שמות מרכיבים בעברית], ` +    // <-- THE PROBLEM LINE
`"meal_type": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_MEAL_TYPES.join(', ')}), ` +
`"cuisine": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_CUISINES.join(', ')}), ` +
`"main_ingredient": string (המרכיב הראשי היחיד של המתכון בעברית), ` +
`"prep_time": integer (מספר דקות הכנה, או null אם לא ניתן לקבוע), ` +
`"dietary_tags": [מערך, כל איבר חייב להיות אחד מ: ${ALLOWED_DIETARY_TAGS.join(', ')}, [] אם אין], ` +
`"instructions": [מערך של שלבי הכנה בעברית ללא מספור, [] אם אין שלבים]}. ` +
`אם הקטגוריה אינה מתאימה לאף אחת מהאפשרויות, השתמש ב"אחר". אל תוסיף טקסט מחוץ ל-JSON.`
```

**The problem line verbatim:** `"ingredients": [מערך של שמות מרכיבים בעברית]`

Translation: "ingredients: array of ingredient names in Hebrew"

This instruction only asks for names. No amount, no unit. The AI has no schema to put measurement data into, so it either:
- Embeds measurements in the name string ("2 כוסות קמח")
- Discards them entirely ("קמח")

Behavior is unpredictable because the prompt does not specify.

### Current JSON Schema for Ingredients

```json
{
  "ingredients": ["קמח", "ביצים", "חמאה"]
}
```

Array of plain strings — no structure.

### Current Validation in `extractRecipeFromCaption`

```javascript
if (!recipe.title || !Array.isArray(recipe.ingredients)) {
  throw new Error('AI response missing required recipe fields');
}
```

No validation of ingredient object shape — any array passes.

---

## Weakness Analysis

### Category 1: Vague Amounts ("קורט מלח", "לפי הטעם", "חופן", "מעט")

**What goes wrong:** The prompt only asks for ingredient names. When the AI encounters vague amounts, it either drops them (returning just "מלח") or fuses them (returning "קורט מלח" as the name — but then the ingredient table's `name` unique constraint deduplicates "מלח" and "קורט מלח" as different rows, corrupting the ingredient catalog).

**Root cause:** No `amount` field means the AI has nowhere to put "קורט" or "לפי הטעם".

**Fix needed:** The prompt must specify that vague amounts go into `amount` as-is (preserve the user's original language — "לפי הטעם" is semantically meaningful).

### Category 2: Mixed Number Formats ("1.5" vs "1 וחצי" vs "חצי")

**What goes wrong:** Hebrew recipe content mixes decimal notation ("1.5 כוסות"), spoken Hebrew fractions ("כוס וחצי", "שלושת רבעי כוס"), and pure text ("חצי בצל"). The current flat-string output means the AI makes an arbitrary choice about representation. Downstream consumers (frontend display, potential scaling) get inconsistent formats.

**Root cause:** No schema guidance tells the AI how to normalize fractions. Without a structured `amount` field, normalization is irrelevant — it all goes into the name blob.

**Fix needed:** The prompt should instruct the AI to preserve the original Hebrew phrasing in `amount` verbatim (e.g., amount: "חצי", unit: "כוס") rather than converting to decimal. This preserves the author's voice and avoids lossy conversion (1/3 cannot be exactly represented in decimal).

### Category 3: Compound Strings Embedding Preparation ("בצל גדול קצוץ דק", "שמן זית לטיגון")

**What goes wrong:** Hebrew culinary language routinely embeds size ("גדול"), form ("קצוץ דק"), and purpose ("לטיגון") in the ingredient description. The current schema dumps all of this into the name. This means:
- "בצל" and "בצל גדול קצוץ דק" are stored as different ingredient rows in the `ingredients` table (the deduplicate-by-name upsert treats them as distinct items).
- The ingredient catalog becomes polluted with preparation-specific variants.

**Root cause:** No separation between ingredient identity ("בצל"), size modifier ("גדול"), and preparation instruction ("קצוץ דק"). Preparation instructions belong in the recipe steps, not the ingredient list.

**Fix needed:** The prompt must instruct the AI to put the clean ingredient name in `name` (e.g., "בצל") and put size/preparation notes either in `amount` (e.g., "1 גדול") or, if purely preparation, move them to the nearest instruction step. The key rule: `name` should be the canonical ingredient identity, matchable across recipes.

### Category 4: Separation of Quantity/Unit from Ingredient Name

**What goes wrong:** With the current flat-string schema, the AI must decide how to format "2 כוסות קמח" — does it return "קמח" (dropping amount) or "2 כוסות קמח" (embedding it)? Both are seen in practice. The frontend then joins everything into a textarea with one string per line, so the user sees whatever the AI decided.

**Root cause:** The schema does not distinguish `amount` ("2"), `unit` ("כוסות"), and `name` ("קמח") as separate fields.

**Fix needed:** Explicit three-field object schema forces the separation. The AI is very capable of this split when given a clear schema to populate.

---

## Standard Stack

No new libraries required. This phase is:
- SQL migration (Supabase Dashboard)
- Prompt string change (moonshot.js)
- Backend JS change (supabase.js)
- Frontend JS/JSX change (RecipeReviewScreen.jsx)

### Core
| Component | Current Version | Change |
|-----------|----------------|--------|
| Moonshot AI (moonshot-v1-8k) | Unchanged | Prompt text only |
| Supabase JS client | Unchanged | New columns in queries |
| React 19 + Vite | Unchanged | State shape change |

---

## Architecture Patterns

### Recommended Project Structure (no change)

The existing service/route/component structure is not changing. Only the data flowing through those layers changes shape.

### Pattern: Three-Table Ingredient Storage

The current ingredients pipeline uses three tables:

```
ingredients table:           { id UUID, name TEXT UNIQUE }
recipe_ingredients table:    { recipe_id UUID, ingredient_id UUID }   <-- add amount, unit here
recipes table:               { id UUID, ... }
```

**Key insight:** `amount` and `unit` belong on `recipe_ingredients` (the junction table), NOT on `ingredients`. An ingredient ("בצל") has different amounts in different recipes. The `ingredients` table is a canonical catalog; per-recipe measurement is junction-scoped.

This is the correct relational model. Adding `amount TEXT` and `unit TEXT` to `recipe_ingredients` is the right approach.

### Pattern: Prompt Schema Specification

Other structured fields in the current prompt use strict schema specification patterns that work well:

- `"main_category": string (חייב להיות אחד בדיוק מהרשימה: ...)` — works because it gives exact constraint
- `"prep_time": integer (מספר דקות הכנה, או null אם לא ניתן לקבוע)` — works because it handles the null case explicitly

The ingredients field must follow the same pattern: give the AI an object schema with field descriptions and null-case instructions.

### Anti-Patterns to Avoid

- **Storing preparation text in `name`:** "בצל קצוץ דק" as the ingredient name pollutes the `ingredients` catalog with recipe-specific variants. Keep `name` as canonical identity.
- **Converting Hebrew fractions to decimals in the prompt:** "חצי" → "0.5" is lossy for thirds and creates unnatural output. Preserve original Hebrew in `amount`.
- **Adding `amount`/`unit` to the `ingredients` table:** Wrong table. Amounts are per-recipe-use, not per-ingredient.
- **Requiring `unit` to be non-null:** Some ingredients have no unit ("3 ביצים" — amount is "3", unit is null or ""). Make `unit` nullable/optional.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Parsing "2 כוסות קמח" into {amount, unit, name} on the frontend | A Hebrew NLP parser | Let the AI do it in the Moonshot extraction step; user can correct the full string |
| Normalizing Hebrew fraction strings | A fraction converter | Preserve verbatim in `amount`; no normalization needed |
| Unit validation/normalization | A units enum | `unit TEXT` free-text — too many Hebrew unit variants to enumerate |

---

## Common Pitfalls

### Pitfall 1: Adding `amount`/`unit` to the Wrong Table

**What goes wrong:** Developer adds columns to `ingredients` table instead of `recipe_ingredients`.
**Why it happens:** The `ingredients` table is conceptually "about ingredients" — feels natural to add measurement there.
**How to avoid:** Remember that `ingredients` is a canonical catalog (unique by name). Amount is per-recipe-use, stored in the junction table `recipe_ingredients`.
**Warning signs:** If you see `ALTER TABLE ingredients ADD COLUMN amount`, stop — wrong table.

### Pitfall 2: The `name` Unique Constraint Collision

**What goes wrong:** After adding structured objects, the backend still normalizes `ingredient.name` to lowercase+trim. If the AI returns `{name: "בצל גדול", ...}` instead of `{name: "בצל", ...}`, the catalog gets polluted again.
**Why it happens:** The prompt instructions aren't precise enough about stripping size/prep from `name`.
**How to avoid:** The prompt must explicitly say: `"name"` = clean ingredient identity only, no size or prep. The backend normalization (lowercase+trim) continues to apply to `name`.

### Pitfall 3: `recipe_ingredients` Upsert Conflict Key Breaks

**What goes wrong:** The current `recipe_ingredients` upsert uses `onConflict: 'recipe_id,ingredient_id'`. After adding `amount` and `unit` columns, the upsert semantics need to either update those columns on conflict or the conflict key must be reconsidered.
**Why it happens:** Supabase upsert with named conflict columns only updates if `ignoreDuplicates: false` (default). The existing code does not pass column names to update, so new `amount`/`unit` values may not be written on re-save.
**How to avoid:** In `saveRecipe`, the junction insert always comes after ingredient dedup+upsert. For new saves this is not an issue. For `updateRecipe`, the delete-then-insert pattern (already in place) handles this correctly — old junction rows are deleted and fresh ones inserted with the new amounts. No change needed for updateRecipe. For `saveRecipe` (which uses upsert), the junction upsert should be changed to update `amount` and `unit` on conflict.

### Pitfall 4: Frontend Sends Wrong Shape to Backend

**What goes wrong:** After changing the AI to return `[{name, amount, unit}]`, the frontend still calls `.join('\n')` on the array to populate `ingredientsText`. If `ingredient.join('\n')` is called on an array of objects, it produces `[object Object]\n[object Object]`.
**Why it happens:** `RecipeReviewScreen.jsx` line 58–61 initializes `ingredientsText` by calling `.join('\n')` on `extractedRecipe.ingredients`. This works for strings but breaks for objects.
**How to avoid:** The initialization must convert objects to display strings: `ingredients.map(i => [i.amount, i.unit, i.name].filter(Boolean).join(' ')).join('\n')`.

### Pitfall 5: Backend Receives String Array Instead of Object Array After User Edits

**What goes wrong:** The user edits ingredients in the textarea as free-form text ("2 כוסות קמח"). On save, `RecipeReviewScreen` splits by newline and sends an array of strings. The backend and DB expect structured objects.
**Why it happens:** The textarea editing model produces strings, not objects.
**How to avoid:** Two options:
  1. Parse the display string back into `{name, amount, unit}` client-side on save (simple regex: first token = amount, second = unit, rest = name — imperfect but good enough for re-saves after user edits).
  2. Send the full display string to the backend and let it store just the `name` (losing structured data after user edit).

  **Recommended:** Option 1 — client-side parse on save. The regex heuristic handles the common case. The AI extraction already did the hard parsing; user edits are minor corrections in well-structured format.

### Pitfall 6: `confirm-recipe` Route Validation Breaks

**What goes wrong:** `POST /api/confirm-recipe` validates `!Array.isArray(ingredients)` but doesn't validate element shape. After changing to object arrays, the validation stays permissive, which is fine — but the `saveRecipe` function must handle both string and object shapes for backward compatibility during transition.
**Why it happens:** Old `process-recipe` route still sends string ingredients. The two routes (legacy `process-recipe` and primary `confirm-recipe`) share `saveRecipe`.
**How to avoid:** In `saveRecipe`, detect element shape: if `ingredients[0]` is a string, treat as legacy; if object, extract `.name`, `.amount`, `.unit`. Or simply migrate both routes simultaneously.

### Pitfall 7: RLS Policy on `recipe_ingredients` Does Not Cover DELETE

**What goes wrong:** The `updateRecipe` function deletes old junction rows with `.delete().eq('recipe_id', id)`. Looking at `20260306_rls_policies.sql`, only SELECT and INSERT policies are defined for `recipe_ingredients` — there is no DELETE policy.
**Why it happens:** The server uses the `SUPABASE_KEY` which is likely the service_role key (bypasses RLS). But this is worth verifying.
**How to avoid:** Confirm the server key type. If it is the anon key, a DELETE policy on `recipe_ingredients` is needed. The migration for this phase is a good time to add it if missing.

---

## Code Examples

### Proposed New Prompt Section (Exact Replacement)

Replace the current ingredients line in `HEBREW_SYSTEM_PROMPT`:

**Current (line 37 in moonshot.js):**
```javascript
`"ingredients": [מערך של שמות מרכיבים בעברית], ` +
```

**Replacement:**
```javascript
`"ingredients": [מערך של אובייקטים, כל אחד בפורמט: {"name": string (שם המרכיב בלבד, ללא כמות או הכנה, למשל: "קמח", "בצל", "שמן זית"), "amount": string או null (הכמות בלבד, כולל ביטויים כמו "קורט", "לפי הטעם", "חצי" — בדיוק כפי שמופיע במקור; null אם אין כמות), "unit": string או null (יחידת המידה בלבד, למשל "כוסות", "גרם", "כפות"; null אם אין יחידה)}], ` +
```

**Full replacement object explained:**
- `name`: canonical ingredient identity only — no size descriptors ("גדול"), no preparation ("קצוץ דק"), no purpose ("לטיגון")
- `amount`: verbatim original phrasing of the quantity — "קורט", "חצי", "2", "לפי הטעם", or `null` if absent
- `unit`: unit of measure only — "כוסות", "גרם", "כפות", or `null` if none (e.g., "3 ביצים" → unit: null)

### New JSON Schema Output Example

```json
{
  "ingredients": [
    { "name": "קמח", "amount": "2", "unit": "כוסות" },
    { "name": "ביצים", "amount": "3", "unit": null },
    { "name": "מלח", "amount": "קורט", "unit": null },
    { "name": "שמן זית", "amount": "לפי הטעם", "unit": null },
    { "name": "בצל", "amount": "1", "unit": null },
    { "name": "שום", "amount": "חצי", "unit": "ראש" }
  ]
}
```

### Validation Update in `extractRecipeFromCaption`

```javascript
// After: if (!recipe.title || !Array.isArray(recipe.ingredients)) { ... }
// Add shape normalization:
recipe.ingredients = recipe.ingredients.map(item => {
  if (typeof item === 'string') {
    // Legacy fallback: AI returned string instead of object
    return { name: item.toLowerCase().trim(), amount: null, unit: null };
  }
  return {
    name: (item.name ?? '').toLowerCase().trim(),
    amount: item.amount ?? null,
    unit: item.unit ?? null,
  };
}).filter(item => item.name.length > 0);
```

---

## DB Schema Analysis

### Current `recipe_ingredients` Table Structure

Inferred from insert logic in `supabase.js` and RLS policy in `20260306_rls_policies.sql`:

```sql
-- Current structure (inferred — no explicit CREATE TABLE in migrations)
recipe_ingredients (
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, ingredient_id)
)
```

RLS policies confirm columns: `recipe_id`, `ingredient_id`. The upsert in `saveRecipe` uses `onConflict: 'recipe_id,ingredient_id'`.

### Current `ingredients` Table Structure

```sql
ingredients (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
)
```

Inferred from: `upsert(normalizedIngredients, { onConflict: 'name' })` and `.map((name) => ({ name }))`.

### Required Migration SQL

```sql
-- Migration: 20260314_ingredient_measurements
-- Purpose: Add amount and unit columns to recipe_ingredients junction table.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste contents → Run
--
-- Columns added:
--   recipe_ingredients.amount  TEXT  — quantity as-is from recipe ("2", "קורט", "חצי", "לפי הטעם")
--   recipe_ingredients.unit    TEXT  — unit of measure ("כוסות", "גרם", null if unitless)
--
-- Note: Both columns are nullable — existing rows have no measurement data (NULL is correct default).

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS amount TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;
```

**Why both TEXT and nullable:**
- `amount TEXT` — not numeric, because Hebrew amounts include words ("קורט", "לפי הטעם", "חצי ראש")
- `unit TEXT` — not an enum, because Hebrew unit vocabulary is large and recipe-context-dependent
- Both nullable — existing rows have no amount/unit data; NULL is semantically correct for "unknown/not recorded"

**No RLS policy change needed** for `recipe_ingredients` — the existing SELECT and INSERT policies remain correct. The DELETE policy gap (Pitfall 7 above) is a pre-existing issue; this migration can optionally add it.

---

## Backend Impact Analysis

### `saveRecipe` in `supabase.js`

**Current flow (lines 94–115):**
1. `ingredients` is `string[]`
2. Normalize: `ingredients.map((name) => name.toLowerCase().trim())`
3. Upsert `ingredients` table with `{ name }`
4. Build junction rows: `ingredientRows.map(ingredient => ({ recipe_id, ingredient_id: ingredient.id }))`
5. Upsert `recipe_ingredients` with `onConflict: 'recipe_id,ingredient_id'`

**Required changes:**
1. Accept `ingredients` as either `string[]` (legacy) or `{name, amount, unit}[]` (new)
2. Normalize: extract `.name` (or use as-is for strings), lowercase+trim
3. Upsert `ingredients` table — same as now (name only)
4. Build junction rows: include `amount` and `unit` from the input objects
5. Upsert `recipe_ingredients` — add `amount` and `unit` to the row objects; update on conflict to overwrite amounts

**Junction row shape after change:**
```javascript
const junctionRows = ingredientRows.map((ingredient, index) => ({
  recipe_id: recipe.id,
  ingredient_id: ingredient.id,
  amount: normalizedIngredients[index].amount ?? null,
  unit: normalizedIngredients[index].unit ?? null,
}));
```

**Alignment problem:** `ingredientRows` from the upsert come back in arbitrary order (Supabase upsert returns inserted/updated rows but order may not match input). Must correlate by name after upsert, or use a different approach.

**Recommended approach:** After upserting, fetch ingredient rows by name and build a name→id map:
```javascript
const nameToRow = Object.fromEntries(ingredientRows.map(r => [r.name, r.id]));
const junctionRows = normalizedIngredients.map(ing => ({
  recipe_id: recipe.id,
  ingredient_id: nameToRow[ing.name],
  amount: ing.amount ?? null,
  unit: ing.unit ?? null,
}));
```

This requires the upsert to also `.select('id, name')` (currently only `.select('id')`).

### `updateRecipe` in `supabase.js`

**Current flow (lines 181–212):**
1. Same normalization as saveRecipe
2. Delete all existing junction rows for this recipe
3. Insert fresh junction rows

**Required changes:**
- Same normalization change as saveRecipe
- Junction row construction: add `amount` and `unit`
- The delete-then-insert pattern already handles the "old amounts get replaced" requirement — no additional change needed beyond adding the fields

**Current normalization code (line 183):**
```javascript
const normalizedIngredients = [...new Set(ingredients.map((name) => name.toLowerCase().trim()))]
  .map((name) => ({ name }));
```

**After change (handles both string and object input):**
```javascript
const parsed = ingredients.map(item =>
  typeof item === 'string'
    ? { name: item.toLowerCase().trim(), amount: null, unit: null }
    : { name: (item.name ?? '').toLowerCase().trim(), amount: item.amount ?? null, unit: item.unit ?? null }
).filter(i => i.name.length > 0);

// Deduplicate by name (preserving first occurrence's amount/unit)
const seen = new Set();
const normalizedIngredients = parsed.filter(i => seen.has(i.name) ? false : (seen.add(i.name), true));
```

### `confirm-recipe` Route Body

The route currently destructures `ingredients` from `req.body` and passes it to `saveRecipe`. No change needed in the route handler — the shape change flows through transparently. The validation `!Array.isArray(ingredients)` remains correct.

---

## Frontend Impact Analysis

### How `RecipeReviewScreen` Currently Handles Ingredients

**Initialization (lines 57–61):**
```javascript
const [ingredientsText, setIngredientsText] = useState(
  Array.isArray(extractedRecipe.ingredients)
    ? extractedRecipe.ingredients.join('\n')
    : ''
);
```
Joins string array with newlines → one ingredient per line in textarea.

**On save (lines 107–110):**
```javascript
const ingredients = ingredientsText
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
```
Splits textarea back into string array → sends `string[]` to API.

### What Must Change

**Step 1 — Initialization:** Convert `{name, amount, unit}` objects to display strings:
```javascript
const [ingredientsText, setIngredientsText] = useState(
  Array.isArray(extractedRecipe.ingredients)
    ? extractedRecipe.ingredients.map(ing =>
        typeof ing === 'string'
          ? ing
          : [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
      ).join('\n')
    : ''
);
```
Display format: "2 כוסות קמח", "קורט מלח", "3 ביצים" — natural Hebrew ingredient line.

**Step 2 — On save (client-side parse):** Convert each line back to `{name, amount, unit}`:
```javascript
const ingredients = ingredientsText
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map(line => {
    // Heuristic: first token = amount (if starts with digit or is known Hebrew quantity word)
    // second token = unit (if followed by more tokens), rest = name
    const tokens = line.split(/\s+/);
    const amountPattern = /^[\d.,½¼¾⅓⅔]+$|^(קורט|מעט|חצי|שליש|רבע|לפי|כמה)$/;
    if (tokens.length === 1) {
      return { name: tokens[0], amount: null, unit: null };
    }
    if (amountPattern.test(tokens[0])) {
      // Has amount
      const unitCandidates = ['כוסות','כוס','גרם','קג','מל','ליטר','כפות','כף','כפיות','כפית','יח\'','חבילות','חבילה'];
      if (tokens.length >= 3 && unitCandidates.includes(tokens[1])) {
        return { name: tokens.slice(2).join(' '), amount: tokens[0], unit: tokens[1] };
      }
      return { name: tokens.slice(1).join(' '), amount: tokens[0], unit: null };
    }
    return { name: line, amount: null, unit: null };
  });
```

**Note:** The heuristic parse is a best-effort fallback for user-edited lines. The AI extraction handles the real parsing. This ensures re-saves after minor user edits still produce structured data.

### The Textarea UX — No Change Required

The textarea editing model (one line per ingredient, free text) remains unchanged. Users see and edit natural Hebrew strings like "2 כוסות קמח". The structured data is an implementation detail invisible to users. This is the right UX decision — no new UI components needed.

---

## State of the Art

| Old Approach | Current Approach (Phase 11) | Impact |
|---|---|---|
| `"ingredients": [string[]]` | `"ingredients": [{name, amount, unit}[]]` | Structured data, measurable, scalable |
| Amount/unit lost or fused into name | Amount/unit stored separately in junction table | Shopping list, recipe scaling become possible |
| `ingredients` table stores "2 כוסות קמח" as a name | `ingredients` table stores "קמח"; junction stores amount+unit | Clean ingredient catalog, proper dedup |

---

## Open Questions

1. **Server key type: service_role or anon?**
   - What we know: `SUPABASE_KEY` env var is used; `20260306_rls_policies.sql` comment says "The Express server uses the service_role key (bypasses RLS by default)."
   - What's unclear: Is this actually the case in the deployed Koyeb environment?
   - Recommendation: Verify in Koyeb env vars dashboard. If service_role: no policy changes needed. If anon: the missing DELETE policy on `recipe_ingredients` must be added in this migration.

2. **`process-recipe` legacy route: update or ignore?**
   - What we know: The `process-recipe` one-shot route (line 23 in recipe.js) also calls `saveRecipe` with `ingredients: recipe.ingredients`. After the moonshot prompt change, `recipe.ingredients` will be `{name,amount,unit}[]`. The route passes this to `saveRecipe` without modification.
   - What's unclear: Is this route still actively used, or is it dead code since the two-step flow (`extract-recipe` + `confirm-recipe`) became the primary pattern?
   - Recommendation: Update `saveRecipe` to handle both string and object shapes (the normalization change above already does this). The `process-recipe` route will work correctly after that.

3. **`workspace_ingredient_checks` table: does it need updating?**
   - What we know: `workspace_ingredient_checks` stores `(workspace_id, recipe_id, ingredient_id, checked)`. It references `ingredient_id`, not the junction row. Amount/unit are not relevant to checkbox state.
   - What's unclear: Nothing. This table does not need changes.
   - Recommendation: No action needed.

---

## Sources

### Primary (HIGH confidence)
- `server/src/services/moonshot.js` — full system prompt quoted verbatim, exact JSON schema analyzed
- `server/src/services/supabase.js` — full `saveRecipe` and `updateRecipe` logic analyzed
- `server/src/routes/recipe.js` — all routes and data flow analyzed
- `client/src/components/RecipeReviewScreen.jsx` — full ingredient init and save logic quoted
- `supabase/migrations/20260306_workspaces.sql` — `recipe_ingredients` RLS and table structure
- `supabase/migrations/20260307_recipe_dimensions.sql` — migration pattern for column additions
- `supabase/migrations/20260306_rls_policies.sql` — confirms `recipe_ingredients` has SELECT+INSERT policies only
- `.planning/STATE.md`, `.planning/ROADMAP.md` — project context and prior decisions

### Secondary (MEDIUM confidence)
- Hebrew culinary linguistics analysis — based on common recipe source patterns in Hebrew social media content

---

## Metadata

**Confidence breakdown:**
- Current prompt weaknesses: HIGH — quoted verbatim from source, analysis is direct
- DB schema: HIGH — inferred directly from upsert calls with conflict keys
- Migration SQL: HIGH — follows established migration pattern in this repo
- Backend changes: HIGH — traced through exact code paths
- Frontend changes: HIGH — exact initialization and save code quoted and analyzed
- Client-side parse heuristic: MEDIUM — heuristic logic, edge cases possible; covered by the AI doing the real extraction

**Research date:** 2026-03-14
**Valid until:** Until moonshot.js, supabase.js, or RecipeReviewScreen.jsx change structurally (~90 days stable)
