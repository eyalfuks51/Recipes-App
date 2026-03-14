---
phase: 11-ingredient-measurements
plan: 02
subsystem: ai-extraction
tags: [moonshot, prompt-engineering, normalization, ingredients]
dependency_graph:
  requires: []
  provides: [ingredient-objects-from-ai]
  affects: [extractRecipeFromCaption, saveRecipe]
tech_stack:
  added: []
  patterns: [shape-normalization, legacy-fallback]
key_files:
  modified:
    - server/src/services/moonshot.js
decisions:
  - "Normalization placed after JSON.parse validation guard so invalid responses still throw early"
  - "Legacy string responses converted to {name, amount: null, unit: null} — never discarded"
  - "Empty-name objects filtered after normalization to prevent blank ingredient rows"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-14"
---

# Phase 11 Plan 02: Ingredient Prompt + Shape Normalization Summary

Updated `HEBREW_SYSTEM_PROMPT` to instruct Moonshot AI to return ingredients as structured `{name, amount, unit}` objects, then added post-parse normalization in `extractRecipeFromCaption` to guarantee a well-typed array regardless of AI response format.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace ingredients line in HEBREW_SYSTEM_PROMPT | ea8636b | server/src/services/moonshot.js |
| 2 | Add ingredient shape normalization | a9f8091 | server/src/services/moonshot.js |

## Exact Replacement Line (Task 1)

The following line replaced the old `"ingredients": [מערך של שמות מרכיבים בעברית]` entry on line 37 of `HEBREW_SYSTEM_PROMPT`:

```javascript
`"ingredients": [מערך של אובייקטים, כל אחד בפורמט: {"name": string (שם המרכיב בלבד, ללא כמות או הכנה, למשל: "קמח", "בצל", "שמן זית"), "amount": string או null (הכמות בלבד, כולל ביטויים כמו "קורט", "לפי הטעם", "חצי" — בדיוק כפי שמופיע במקור; null אם אין כמות), "unit": string או null (יחידת המידה בלבד, למשל "כוסות", "גרם", "כפות"; null אם אין יחידה)}], ` +
```

## Normalization Block Insertion (Task 2)

Inserted immediately after the validation guard on lines 96-98 (`!Array.isArray(recipe.ingredients)`) and before the `// Normalize category` comment. The normalization block now occupies lines 100-111 of `moonshot.js`:

```javascript
// Normalize ingredient shape: AI should return [{name, amount, unit}] objects.
// If AI returns plain strings (legacy or fallback), convert to object shape.
recipe.ingredients = recipe.ingredients.map(item => {
  if (typeof item === 'string') {
    return { name: item.toLowerCase().trim(), amount: null, unit: null };
  }
  return {
    name: (item.name ?? '').toLowerCase().trim(),
    amount: item.amount ?? null,
    unit: item.unit ?? null,
  };
}).filter(item => item.name.length > 0);
```

## Test Results

```
tests 4
pass  4
fail  0
duration_ms 102.7
```

All 4 existing tests pass without modification.

## Edge Cases Observed in Existing Test Suite

The existing tests mock AI responses with **plain string arrays** (e.g., `["ספגטי","בשר טחון","עגבניות"]`). These now pass through the legacy-string normalization path and are converted to object shape. The tests verify `result.ingredients.length === 3` and `Array.isArray(result.ingredients)` — both still hold. The tests do NOT assert on the internal shape of ingredient items (`name`/`amount`/`unit`), so they required no changes.

**Recommendation for future tests:** Add assertions verifying that each `result.ingredients[i]` has `name`, `amount`, and `unit` keys, to lock in the object shape contract. A test with an object-shaped AI response (new format) would also be valuable.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `server/src/services/moonshot.js` modified
- [x] Commit `ea8636b` exists (Task 1)
- [x] Commit `a9f8091` exists (Task 2)
- [x] `אובייקטים` present in HEBREW_SYSTEM_PROMPT (grep confirmed)
- [x] `מערך של שמות מרכיבים בעברית` no longer present (grep confirmed)
- [x] Normalization block at lines 100-111, after validation guard, before category normalization
- [x] All 4 tests pass
