---
phase: 11-ingredient-measurements
plan: "04"
subsystem: frontend
tags: [ingredients, react, state, jsx, parsing]
dependency_graph:
  requires: [11-02]
  provides: [dynamic-ingredient-input-list]
  affects: [RecipeReviewScreen, confirm-recipe POST, recipes PUT]
tech_stack:
  added: []
  patterns: [array-state-list-pattern, token-parsing-heuristic]
key_files:
  modified:
    - client/src/components/RecipeReviewScreen.jsx
key_decisions:
  - "ingredientLines uses the same steps-list CSS classes (steps-list, step-row, step-input, step-delete, btn-add-step) — no new styles added"
  - "Initialization handles both legacy string items and {name,amount,unit} objects via typeof check"
  - "KNOWN_UNITS / AMOUNT_PATTERN heuristic placed inside handleSave (not module scope) to keep parse logic co-located with API call"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-14"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 11 Plan 04: Ingredient List Dynamic Inputs Summary

Dynamic per-ingredient input list with delete and add controls, replacing the ingredients textarea in RecipeReviewScreen.

## What Was Built

Replaced the `ingredientsText` string state and `<textarea>` in `RecipeReviewScreen.jsx` with an `ingredientLines: string[]` array and a dynamic list of `<input>` fields — one per ingredient — mirroring the existing steps/instructions list pattern exactly.

## Lines Changed

### State initialization (lines 57–61 → 57–63)

- Replaced `ingredientsText` string state (joined with `\n`) with `ingredientLines` string array
- Initialization converts `{name,amount,unit}` objects to display strings: `[amount, unit, name].filter(Boolean).join(' ')`
- Handles legacy plain strings via `typeof ing === 'string'` check
- Default changed from `''` to `[]`

### Handler functions (added after line 93)

Three new handler functions added immediately after `handleStepAdd`, mirroring the step handler pattern:
- `handleIngredientChange(index, value)` — updates a single line in the array
- `handleIngredientDelete(index)` — removes a line by index
- `handleIngredientAdd()` — appends an empty string

### handleSave parse (lines 107–110 → 107–121)

Replaced the simple `split('\n').map().filter()` with the KNOWN_UNITS / AMOUNT_PATTERN heuristic:
- Single-token lines: `{ name: tokens[0], amount: null, unit: null }`
- Leading amount + known unit: `{ name: rest, amount: tokens[0], unit: tokens[1] }`
- Leading amount only: `{ name: rest, amount: tokens[0], unit: null }`
- Unrecognized pattern: `{ name: line, amount: null, unit: null }`

Both PUT and POST paths receive the same parsed `{name, amount, unit}[]` array.

### JSX (lines 276–286 → 276–303)

Replaced:
```jsx
<label className="field-label" style={{ marginTop: '24px' }}>
  מצרכים (אחד בכל שורה)
  <textarea ... />
</label>
```

With a `steps-list` div containing per-row inputs and delete buttons, plus a `btn-add-step` button — identical structure to the instructions list.

## CSS Classes Reused

No new CSS classes were introduced. The following existing classes from the steps list are reused:
- `steps-list` — wrapping container
- `step-row` — per-ingredient row
- `step-input` — text input field
- `step-delete` — delete button per row
- `btn-add-step` — "Add Ingredient" button below the list

## Build Result

`npm run build` passed with no errors: 100 modules transformed, built in 2.14s.

## Deviations from Plan

None — plan executed exactly as written.

## Edge Cases Observed

- The ingredients section omits the `<span className="step-number">` index indicator that steps have; the plan specification did not include it for ingredients and it was not added.

## Self-Check: PASSED

- `client/src/components/RecipeReviewScreen.jsx` modified with all required changes
- Commit `58d9571` verified in git log
- `ingredientsText` fully absent from the file
- `ingredientLines`, `handleIngredientChange`, `handleIngredientDelete`, `handleIngredientAdd` all present
- `KNOWN_UNITS`, `AMOUNT_PATTERN` present in `handleSave`
- All five CSS classes (`steps-list`, `step-row`, `step-input`, `step-delete`, `btn-add-step`) present
- Build passes clean
