// Nutritionix API — natural language food parsing
// Free tier: 500 API calls/day
// Get keys at: https://www.nutritionix.com/business/api

const NUTRITIONIX_URL = 'https://trackapi.nutritionix.com/v2/natural/nutrients';

function getCreds() {
  return {
    appId:  import.meta.env.VITE_NUTRITIONIX_APP_ID  || localStorage.getItem('nutritionix_app_id')  || '',
    appKey: import.meta.env.VITE_NUTRITIONIX_APP_KEY || localStorage.getItem('nutritionix_app_key') || '',
  };
}

export function hasNutritionixKey() {
  const { appId, appKey } = getCreds();
  return !!(appId && appKey);
}

export function saveNutritionixKeys(appId, appKey) {
  localStorage.setItem('nutritionix_app_id',  appId.trim());
  localStorage.setItem('nutritionix_app_key', appKey.trim());
}

export function clearNutritionixKeys() {
  localStorage.removeItem('nutritionix_app_id');
  localStorage.removeItem('nutritionix_app_key');
}

// ── Main Analysis ─────────────────────────────────────────────────────────────

export async function analyzeFood(query) {
  const { appId, appKey } = getCreds();
  if (!appId || !appKey) throw new Error('NO_KEY');

  const res = await fetch(NUTRITIONIX_URL, {
    method: 'POST',
    headers: {
      'x-app-id':       appId,
      'x-app-key':      appKey,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error('Invalid Nutritionix credentials');
    if (res.status === 404) throw new Error('Food not recognized. Try a different description.');
    throw new Error(`Nutritionix error ${res.status}: ${text.slice(0, 100)}`);
  }

  const data  = await res.json();
  const foods = data.foods ?? [];

  if (foods.length === 0) throw new Error('No foods found in that query. Be more specific.');

  // Aggregate totals
  const total = foods.reduce((acc, f) => ({
    calories: acc.calories + (f.nf_calories              ?? 0),
    protein:  acc.protein  + (f.nf_protein               ?? 0),
    carbs:    acc.carbs    + (f.nf_total_carbohydrate     ?? 0),
    fat:      acc.fat      + (f.nf_total_fat              ?? 0),
    fiber:    acc.fiber    + (f.nf_dietary_fiber          ?? 0),
    sugar:    acc.sugar    + (f.nf_sugars                 ?? 0),
    sodium:   acc.sodium   + (f.nf_sodium                 ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  Object.keys(total).forEach(k => { total[k] = Math.round(total[k] * 10) / 10; });

  // Simple health score
  const proteinRatio = total.protein / Math.max(1, total.calories / 4);
  const fiberScore   = Math.min(1, total.fiber / 8);
  const fatRatio     = (total.fat * 9) / Math.max(1, total.calories);
  const healthScore  = Math.round(
    proteinRatio * 30 + fiberScore * 30 + (1 - Math.max(0, fatRatio - 0.35)) * 25 +
    (total.sodium < 600 ? 15 : total.sodium < 1200 ? 8 : 0)
  );

  // Per-food items
  const items = foods.map(f => ({
    name:        f.food_name,
    qty:         `${f.serving_qty ?? 1} ${f.serving_unit ?? 'serving'}`,
    calories:    Math.round(f.nf_calories    ?? 0),
    protein:     Math.round(f.nf_protein     ?? 0),
    carbs:       Math.round(f.nf_total_carbohydrate ?? 0),
    fat:         Math.round(f.nf_total_fat   ?? 0),
    thumb:       f.photo?.thumb ?? null,
  }));

  return { items, total, healthScore: Math.min(100, Math.max(0, healthScore)) };
}

// ── Demo Fallback ─────────────────────────────────────────────────────────────

export function getDemoFoodResult(query = '2 eggs and toast') {
  return {
    items: [
      { name: 'egg',             qty: '2 large',       calories: 143, protein: 13, carbs: 1,  fat: 10, thumb: null },
      { name: 'whole wheat toast', qty: '2 slices',    calories: 138, protein: 6,  carbs: 26, fat: 2,  thumb: null },
    ],
    total: { calories: 281, protein: 19, carbs: 27, fat: 12, fiber: 3.5, sugar: 3, sodium: 320 },
    healthScore: 74,
  };
}
