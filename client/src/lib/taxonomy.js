// Canonical filter taxonomy — single source of truth for recipe filtering.
//
// Internal logic uses stable English slugs. Hebrew strings appear ONLY as
// `label` (display) and `aliases`/`keywords` (matching legacy stored data,
// which is all Hebrew free-text or Hebrew enums). Never branch on a Hebrew
// string in component filter logic — go through this file's matchers/slugs.
//
// ponytail: filter values only. The AI-output enums (server moonshot.js +
// RecipeReviewScreen/RecipeEditForm) still hold the Hebrew vocabulary the AI
// must produce; the read-time normalizer below maps that legacy data onto these
// slugs, so filtering is decoupled from how recipes were stored. Unify the AI
// enums into this file later if they start drifting.

export const MEAL_TYPES = [
  { slug: 'breakfast', label: 'בוקר', aliases: ['ארוחת בוקר'] },
  // Stored data combines lunch+dinner as one value; older/looser variants alias in.
  { slug: 'main', label: 'צהריים/ערב', aliases: ['ארוחת צהריים/ערב', 'ארוחת ערב', 'ארוחת צהריים'] },
];

// Quick-filter pills in the gallery header (subset of MEAL_TYPES + "all").
export const MEAL_PILLS = [
  { slug: null, label: 'הכל' },
  { slug: 'breakfast', label: 'בוקר' },
  { slug: 'main', label: 'צהריים/ערב' },
];

// Prep-time buckets. Upper bounds are CUMULATIVE so nothing falls through the
// 31–60 gap: a 45-min recipe matches '60' (≤60). '60+' is the strict >60 tail.
export const PREP_BUCKETS = [
  { slug: '15', label: "עד 15 דק'", test: (m) => m <= 15 },
  { slug: '30', label: "עד 30 דק'", test: (m) => m <= 30 },
  { slug: '60', label: 'עד שעה', test: (m) => m <= 60 },
  { slug: '60+', label: 'מעל שעה', test: (m) => m > 60 },
];

// Ingredient groups replace the old `main_ingredient.includes()` substring match.
// `keywords` are Hebrew substrings found in the free-text main_ingredient field.
export const INGREDIENT_GROUPS = [
  { slug: 'chicken', label: 'עוף', keywords: ['עוף', 'פרגית', 'חזה עוף', 'שוקיים', 'כרעיים', 'הודו'] },
  { slug: 'beef', label: 'בקר', keywords: ['בקר', 'אסאדו', 'אנטריקוט', 'סטייק', 'המבורגר', 'בשר טחון', 'שריר', 'בשר'] },
  { slug: 'fish', label: 'דגים', keywords: ['סלמון', 'טונה', 'בקלה', 'לברק', 'דניס', 'מושט', 'דג'] },
  { slug: 'pasta', label: 'פסטה', keywords: ['פסטה', 'ספגטי', 'פנה', 'לזניה', 'נוקי', 'אטריות', 'נודלס'] },
  { slug: 'rice', label: 'אורז', keywords: ['אורז', 'ריזוטו'] },
  { slug: 'legumes', label: 'קטניות', keywords: ['שעועית', 'עדשים', 'חומוס', 'אפונה', 'קטניות', 'פול', 'מאש', 'טופו'] },
  { slug: 'vegetables', label: 'ירקות', keywords: ['חציל', 'קישוא', 'עגבני', 'בטטה', 'תפוח אדמה', 'כרובית', 'ברוקולי', 'פטריות', 'ירקות', 'ירק'] },
  { slug: 'eggs', label: 'ביצים', keywords: ['ביצה', 'ביצים', 'חביתה'] },
  { slug: 'cheese', label: 'גבינה', keywords: ['גבינה', 'גבינת', 'מוצרלה', 'פטה', 'ריקוטה'] },
];

// Fallback: when main_ingredient is vague/missing, the legacy main_category
// (which mixed dish + ingredient) still hints the ingredient group.
const CATEGORY_TO_INGREDIENT = {
  'בשר': 'beef', 'עוף': 'chicken', 'דגים': 'fish', 'אורז': 'rice',
  'ביצים': 'eggs', 'ירקות': 'vegetables', 'פסטה': 'pasta',
};

// dish_type — split out of the old mixed main_category. No filter UI yet (kept
// off per "don't redesign UI"); derived so the data contract is clean and a
// future dish-type filter is a one-liner.
export const DISH_TYPES = [
  { slug: 'pasta', label: 'פסטה', aliases: ['פסטה'] },
  { slug: 'salad', label: 'סלט', aliases: ['סלט'] },
  { slug: 'dessert', label: 'קינוח', aliases: ['קינוח'] },
  { slug: 'soup', label: 'מרק', aliases: ['מרק'] },
  { slug: 'baked', label: 'מאפה', aliases: ['מאפה'] },
  { slug: 'drink', label: 'שתייה', aliases: ['שתייה'] },
  { slug: 'main-dish', label: 'מנה עיקרית', aliases: ['בשר', 'עוף', 'דגים', 'ביצים', 'אורז', 'ירקות'] },
  { slug: 'other', label: 'אחר', aliases: ['אחר', 'ארוחת בוקר'] },
];

// Tags grouped by intent. Only `nutrition` has stored data today, so only it is
// rendered in the filter sheet (FilterBottomSheet reads `inUi`). dietary/kashrut
// slugs exist for forward-compat — flip `inUi` once recipes actually carry them.
export const TAG_GROUPS = [
  {
    key: 'nutrition', label: 'תזונה', inUi: true,
    tags: [
      { slug: 'high-protein', label: 'עתיר חלבון', aliases: ['עתיר חלבון'] },
      { slug: 'low-carb', label: 'דל פחמימה', aliases: ['דל פחמימה'] },
      { slug: 'light', label: 'קליל', aliases: ['קליל', 'דל קלוריות'] },
      { slug: 'indulgent', label: 'מושחת', aliases: ['מושחת'] },
    ],
  },
  {
    key: 'dietary', label: 'תזונה מיוחדת', inUi: false,
    tags: [
      { slug: 'vegan', label: 'טבעוני', aliases: ['טבעוני'] },
      { slug: 'vegetarian', label: 'צמחוני', aliases: ['צמחוני'] },
      { slug: 'gluten-free', label: 'ללא גלוטן', aliases: ['ללא גלוטן'] },
    ],
  },
  {
    key: 'kashrut', label: 'כשרות', inUi: false,
    tags: [
      { slug: 'kosher', label: 'כשר', aliases: ['כשר'] },
      { slug: 'pareve', label: 'פרווה', aliases: ['פרווה'] },
    ],
  },
];

const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

// Tags actually shown in the filter sheet.
export const UI_TAGS = TAG_GROUPS.filter((g) => g.inUi).flatMap((g) => g.tags);

// ── Matchers ────────────────────────────────────────────────────────────────

// Exact (trimmed) alias match → slug, for enum-ish fields (meal_type, tags, category).
function slugByAlias(value, list) {
  if (!value) return null;
  const v = String(value).trim();
  const hit = list.find((item) => item.aliases.some((a) => a === v));
  return hit ? hit.slug : null;
}

export function mealTypeSlug(recipe) {
  return slugByAlias(recipe?.meal_type, MEAL_TYPES);
}

export function dishTypeSlug(recipe) {
  return slugByAlias(recipe?.main_category, DISH_TYPES);
}

export function ingredientGroupSlug(recipe) {
  const raw = (recipe?.main_ingredient ?? '').trim();
  if (raw) {
    const hit = INGREDIENT_GROUPS.find((g) => g.keywords.some((k) => raw.includes(k)));
    if (hit) return hit.slug;
  }
  return CATEGORY_TO_INGREDIENT[(recipe?.main_category ?? '').trim()] ?? null;
}

export function tagSlugs(recipe) {
  const tags = Array.isArray(recipe?.dietary_tags) ? recipe.dietary_tags : [];
  return tags.map((t) => slugByAlias(t, ALL_TAGS)).filter(Boolean);
}

export function matchPrepBucket(prepTime, slug) {
  const m = Number.parseInt(prepTime, 10);
  if (Number.isNaN(m)) return false;
  const bucket = PREP_BUCKETS.find((b) => b.slug === slug);
  return bucket ? bucket.test(m) : true;
}

// Compatibility normalizer: augment a stored recipe with derived slug fields so
// the gallery filters on slugs without mutating stored data. Additive — every
// original field is preserved, so cards render unchanged even for legacy rows.
export function normalizeRecipe(recipe) {
  return {
    ...recipe,
    _mealType: mealTypeSlug(recipe),
    _dishType: dishTypeSlug(recipe),
    _ingredientGroup: ingredientGroupSlug(recipe),
    _tags: tagSlugs(recipe),
  };
}

// ── UI helpers ───────────────────────────────────────────────────────────────

// Internal lookup so chips/labels resolve Hebrew text from a slug.
const LABEL_LISTS = {
  meal: MEAL_TYPES,
  ingredient: INGREDIENT_GROUPS,
  prep: PREP_BUCKETS,
  tag: ALL_TAGS,
};

export function labelFor(kind, slug) {
  const list = LABEL_LISTS[kind] ?? [];
  return list.find((x) => x.slug === slug)?.label ?? slug;
}

// v1 search: title + main_ingredient + main_category, case-insensitive substring.
// ponytail: no ingredients-table join in v1.
export function matchesQuery(recipe, q) {
  const needle = String(q ?? '').trim().toLowerCase();
  if (!needle) return true;
  const hay = [recipe?.title, recipe?.main_ingredient, recipe?.main_category]
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(needle);
}

// Active filter chips, in display order. type drives removal in App.jsx.
export function activeChips(filters) {
  const chips = [];
  if (filters.mealType) chips.push({ type: 'meal', value: filters.mealType, label: labelFor('meal', filters.mealType) });
  (filters.dietaryTags ?? []).forEach((t) => chips.push({ type: 'tag', value: t, label: labelFor('tag', t) }));
  if (filters.prepTimeRange) chips.push({ type: 'prep', value: filters.prepTimeRange, label: labelFor('prep', filters.prepTimeRange) });
  if (filters.mainIngredient) chips.push({ type: 'ingredient', value: filters.mainIngredient, label: labelFor('ingredient', filters.mainIngredient) });
  // Whitespace-only query matches everything (matchesQuery trims) — no chip for it.
  if (filters.query?.trim()) chips.push({ type: 'query', value: filters.query, label: `"${filters.query.trim()}"` });
  return chips;
}
