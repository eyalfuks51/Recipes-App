# Phase 11: Ingredient Measurements — COMPLETE 2026-03-14

## Goal

Capture exact ingredient quantities and units from AI extraction across the full stack: DB schema, AI prompt, backend persistence, and frontend editing UI.

## What Was Built

### Plan 11-01 — Database Migration

**File:** `supabase/migrations/20260314_ingredient_measurements.sql`

Added two nullable columns to the `recipe_ingredients` junction table (not the `ingredients` catalog — amounts are per-recipe-use):

```sql
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS amount TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;
```

- `amount TEXT` nullable — Hebrew quantity words ("קורט", "לפי הטעם", "חצי") and numerals ("2", "1.5")
- `unit TEXT` nullable — unit of measure ("כוסות", "גרם") or NULL for unitless ingredients (e.g., "3 ביצים")
- Migration is idempotent (`IF NOT EXISTS` guards)

⚠️ **Manual step required:** Apply via Supabase Dashboard → SQL Editor before backend changes take effect.

---

### Plan 11-02 — AI Prompt Engineering

**File:** `server/src/services/moonshot.js`

**The root problem fixed:** A single line in `HEBREW_SYSTEM_PROMPT` instructed the AI to return `[מערך של שמות מרכיבים בעברית]` — a plain string array with no schema for amount or unit. The AI either discarded measurements or fused them into the name string unpredictably.

**Replacement prompt line (exact Hebrew):**
```javascript
`"ingredients": [מערך של אובייקטים, כל אחד בפורמט: {"name": string (שם המרכיב בלבד, ללא כמות או הכנה, למשל: "קמח", "בצל", "שמן זית"), "amount": string או null (הכמות בלבד, כולל ביטויים כמו "קורט", "לפי הטעם", "חצי" — בדיוק כפי שמופיע במקור; null אם אין כמות), "unit": string או null (יחידת המידה בלבד, למשל "כוסות", "גרם", "כפות"; null אם אין יחידה)}], ` +
```

**Field semantics enforced by the prompt:**
- `name` — canonical ingredient identity only, no size ("גדול") or prep ("קצוץ דק")
- `amount` — verbatim Hebrew phrasing, preserving "קורט", "חצי", "לפי הטעם" as-is
- `unit` — unit of measure only, or null

**Post-parse normalization added to `extractRecipeFromCaption`:** Converts legacy plain strings to `{name, amount: null, unit: null}` objects, lowercases and trims names, filters empty entries. The AI now always produces a typed `Array<{name, amount, unit}>` regardless of model behavior.

**Edge cases addressed:**

| Category | Before | After |
|---|---|---|
| "קורט מלח" | AI returns "קורט מלח" as name — pollutes ingredient catalog | `{name: "מלח", amount: "קורט", unit: null}` |
| "1 וחצי כוסות" | AI makes arbitrary format choice | `{name: "קמח", amount: "1 וחצי", unit: "כוסות"}` — verbatim preserved |
| "בצל גדול קצוץ דק" | Stored as full string — "בצל" and "בצל גדול קצוץ דק" become different catalog entries | `{name: "בצל", amount: "1 גדול", unit: null}` |
| "3 ביצים" | Inconsistent — "3 ביצים" or "ביצים" | `{name: "ביצים", amount: "3", unit: null}` |

---

### Plan 11-03 — Backend Refactor

**File:** `server/src/services/supabase.js`

Both `saveRecipe` and `updateRecipe` updated with identical pattern:

1. **Dual-shape normalization** — accepts either `string[]` (legacy) or `{name,amount,unit}[]` (new AI shape). Lowercases and trims names. Deduplicates by name (first occurrence wins for amount/unit).
2. **`.select('id, name')`** on the catalog upsert — required to build the name→id map.
3. **`nameToRow` map alignment** — builds `{ [name]: id }` from upsert results. Junction rows use `nameToRow[ing.name]` to get the correct ingredient ID. Fixes the ordering bug where Supabase returns upserted rows in arbitrary order.
4. **Junction rows now include** `amount: ing.amount ?? null` and `unit: ing.unit ?? null`.

`updateRecipe` uses the same normalization + name-map pattern, with the existing delete-then-insert pattern unchanged (old junction rows deleted, fresh ones with amounts inserted).

Test suite updated: mock `ingredientRows` now include `name` field to support name-map lookup. All 21 server tests pass.

---

### Plan 11-04 — Frontend Update

**File:** `client/src/components/RecipeReviewScreen.jsx`

Replaced the single ingredients `<textarea>` with a **dynamic list of individual `<input>` fields** — one per ingredient — mirroring the existing steps/instructions list pattern exactly.

**State change:** `ingredientsText: string` → `ingredientLines: string[]`

**Initialization** — converts `{name, amount, unit}` objects to display strings:
```javascript
[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
// → "2 כוסות קמח", "קורט מלח", "3 ביצים"
```

**UI — three handlers mirroring the steps list:**
- `handleIngredientChange(index, value)` — edits a row
- `handleIngredientDelete(index)` — removes a row
- `handleIngredientAdd()` — appends an empty row

**JSX** — reuses existing CSS classes (`steps-list`, `step-row`, `step-input`, `step-delete`, `btn-add-step`) — zero new styles.

**On save — KNOWN_UNITS / AMOUNT_PATTERN heuristic** parses each line back to `{name, amount, unit}`:
```
"2 כוסות קמח"   → {name: "קמח",  amount: "2",     unit: "כוסות"}
"קורט מלח"      → {name: "מלח",  amount: "קורט",  unit: null}
"3 ביצים"        → {name: "ביצים", amount: "3",    unit: null}
"שמן זית"       → {name: "שמן זית", amount: null,  unit: null}
```

Both `POST /api/confirm-recipe` and `PUT /api/recipes/:id` receive the parsed object array. Build passes clean (100 modules, no errors).

---

## Key Technical Decisions

| Decision | Reason |
|---|---|
| `amount`/`unit` on `recipe_ingredients`, not `ingredients` | Amounts are per-recipe-use; `ingredients` is a canonical name catalog — "בצל" has different amounts in different recipes |
| `amount` is `TEXT` not `NUMERIC` | Hebrew amounts include words ("קורט", "לפי הטעם") — numeric type would reject them |
| Preserve verbatim amount phrasing in prompt | "חצי" → "0.5" is lossy for thirds; preserving original Hebrew maintains author voice |
| `nameToRow` map instead of positional array | Supabase upsert returns rows in arbitrary order — positional index would align wrong IDs |
| Token heuristic parse on frontend save | AI does the hard extraction; user edits are minor corrections in well-structured format; regex is sufficient |
| Reuse `steps-list` CSS classes for ingredient list | Zero new CSS; ingredient list is structurally identical to instructions list |
| Normalization block after validation guard | Invalid AI responses still throw early; normalization only runs on structurally valid responses |

---

## Commits

| Commit | Description |
|---|---|
| `69c9f32` | feat(11-01): add amount and unit columns to recipe_ingredients |
| `ea8636b` | feat(11-02): update HEBREW_SYSTEM_PROMPT to request ingredient objects |
| `a9f8091` | feat(11-02): add ingredient shape normalization in extractRecipeFromCaption |
| `f8cba8f` | feat(11-03): propagate amount+unit from ingredient objects into junction rows |
| `58d9571` | feat(11-04): replace ingredientsText textarea with ingredientLines dynamic list |
