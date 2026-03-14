import OpenAI from 'openai';

export const ALLOWED_CATEGORIES = [
  'פסטה',
  'סלט',
  'קינוח',
  'מרק',
  'בשר',
  'עוף',
  'דגים',
  'אורז',
  'ירקות',
  'ביצים',
  'מאפה',
  'שתייה',
  'ארוחת בוקר',
  'אחר',
];

export const ALLOWED_CUISINES = [
  'איטלקי','אסייתי','מקסיקני','אמריקאי','ים-תיכוני',
  'ישראלי','מרוקאי','עיראקי','תוניסאי','צרפתי',"פיוז'ן",'אחר',
];

export const ALLOWED_DIETARY_TAGS = [
  'עתיר חלבון','דל פחמימה','מושחת','קליל',
];

export const ALLOWED_MEAL_TYPES = ['ארוחת בוקר', 'ארוחת צהריים/ערב'];

const HEBREW_SYSTEM_PROMPT =
  `חשוב ביותר: כל הטקסט בתשובה חייב להיות בעברית בלבד. ` +
  `אתה עוזר לניתוח מתכונים. קרא את הטקסט הבא וחזור רק ב-JSON תקני עם השדות הבאים: ` +
  `{"title": string (שם המתכון בעברית), ` +
  `"main_category": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_CATEGORIES.join(', ')}), ` +
  `"difficulty": string (אחד מ: קל, בינוני, קשה), ` +
  `"ingredients": [מערך של אובייקטים, כל אחד בפורמט: {"name": string (שם המרכיב בלבד, ללא כמות או הכנה, למשל: "קמח", "בצל", "שמן זית"), "amount": string או null (הכמות בלבד, כולל ביטויים כמו "קורט", "לפי הטעם", "חצי" — בדיוק כפי שמופיע במקור; null אם אין כמות), "unit": string או null (יחידת המידה בלבד, למשל "כוסות", "גרם", "כפות"; null אם אין יחידה)}], ` +
  `"meal_type": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_MEAL_TYPES.join(', ')}), ` +
  `"cuisine": string (חייב להיות אחד בדיוק מהרשימה: ${ALLOWED_CUISINES.join(', ')}), ` +
  `"main_ingredient": string (המרכיב הראשי היחיד של המתכון בעברית), ` +
  `"prep_time": integer (מספר דקות הכנה, או null אם לא ניתן לקבוע), ` +
  `"dietary_tags": [מערך, כל איבר חייב להיות אחד מ: ${ALLOWED_DIETARY_TAGS.join(', ')}, [] אם אין], ` +
  `"instructions": [מערך של שלבי הכנה בעברית ללא מספור, [] אם אין שלבים]}. ` +
  `אם הקטגוריה אינה מתאימה לאף אחת מהאפשרויות, השתמש ב"אחר". אל תוסיף טקסט מחוץ ל-JSON.`;

/**
 * Creates an OpenAI client configured for Moonshot AI.
 * Exported for testing purposes (allows injection of mock client factory).
 */
export function createClient() {
  return new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: 'https://api.moonshot.ai/v1',
  });
}

/**
 * Extracts structured recipe data from an Instagram post caption using Moonshot AI.
 * @param {string} caption - The Instagram post caption
 * @returns {Promise<{title: string, main_category: string, difficulty: string, ingredients: Array<{name: string, amount: string|null, unit: string|null}>}>}
 * @throws {Error} If AI response cannot be parsed as recipe JSON
 */
export async function extractRecipeFromCaption(caption) {
  // Allow test injection via global mock
  let completionsCreate;
  if (typeof global.__mockOpenAICreate === 'function') {
    completionsCreate = global.__mockOpenAICreate;
  } else {
    const client = createClient();
    completionsCreate = client.chat.completions.create.bind(client.chat.completions);
  }

  const completion = await completionsCreate({
    model: 'moonshot-v1-8k',
    messages: [
      { role: 'system', content: HEBREW_SYSTEM_PROMPT },
      { role: 'user', content: caption },
    ],
  });

  const rawContent = completion.choices[0].message.content;

  // Regex fallback: extract JSON block from potential markdown wrapping
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse recipe from AI response');
  }

  let recipe;
  try {
    recipe = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse recipe from AI response');
  }

  if (!recipe.title || !Array.isArray(recipe.ingredients)) {
    throw new Error('AI response missing required recipe fields');
  }

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

  // Normalize category to allowed list; fallback to 'אחר'
  if (recipe.main_category && !ALLOWED_CATEGORIES.includes(recipe.main_category)) {
    recipe.main_category = 'אחר';
  }

  // Normalize cuisine
  if (!ALLOWED_CUISINES.includes(recipe.cuisine)) {
    recipe.cuisine = 'אחר';
  }
  // Normalize dietary_tags — keep only recognized values
  if (!Array.isArray(recipe.dietary_tags)) {
    recipe.dietary_tags = [];
  } else {
    recipe.dietary_tags = recipe.dietary_tags.filter(tag => ALLOWED_DIETARY_TAGS.includes(tag));
  }
  // Normalize meal_type to strict enum; fallback to 'ארוחת צהריים/ערב'
  if (!ALLOWED_MEAL_TYPES.includes(recipe.meal_type)) {
    recipe.meal_type = 'ארוחת צהריים/ערב';
  }

  // Normalize arrays that may be missing
  if (!Array.isArray(recipe.instructions)) recipe.instructions = [];

  return recipe;
}
