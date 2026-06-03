// Nutritionix API — natural language food parsing
// Free tier: 500 API calls/day
// Get keys at: https://www.nutritionix.com/business/api
// Falls back to the built-in mock database when no keys are configured.

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

// ── Mock Food Database ─────────────────────────────────────────────────────────
// Values: { cal, protein, carbs, fat, fiber, sodium } per 1 standard serving.
// servingDesc describes what "1 serving" means for scaling display.

const FOOD_DB = {
  // ── Grains & Staples ──
  'rice':           { cal: 206, protein: 4.3, carbs: 45,  fat: 0.4, fiber: 0.6, sodium: 9,   servingDesc: '1 cup cooked' },
  'brown rice':     { cal: 216, protein: 5,   carbs: 45,  fat: 1.8, fiber: 3.5, sodium: 10,  servingDesc: '1 cup cooked' },
  'chapati':        { cal: 104, protein: 3.1, carbs: 18,  fat: 2.8, fiber: 2.4, sodium: 180, servingDesc: '1 medium roti' },
  'roti':           { cal: 104, protein: 3.1, carbs: 18,  fat: 2.8, fiber: 2.4, sodium: 180, servingDesc: '1 medium roti' },
  'paratha':        { cal: 192, protein: 4,   carbs: 25,  fat: 8,   fiber: 2,   sodium: 280, servingDesc: '1 medium paratha' },
  'naan':           { cal: 262, protein: 9,   carbs: 45,  fat: 5,   fiber: 2,   sodium: 520, servingDesc: '1 piece' },
  'bread':          { cal: 79,  protein: 2.7, carbs: 15,  fat: 1,   fiber: 0.6, sodium: 152, servingDesc: '1 slice' },
  'toast':          { cal: 79,  protein: 2.7, carbs: 15,  fat: 1,   fiber: 0.6, sodium: 152, servingDesc: '1 slice' },
  'oats':           { cal: 150, protein: 5,   carbs: 27,  fat: 2.5, fiber: 4,   sodium: 5,   servingDesc: '½ cup dry' },
  'poha':           { cal: 250, protein: 4,   carbs: 44,  fat: 6,   fiber: 1.5, sodium: 380, servingDesc: '1 cup cooked' },
  'upma':           { cal: 198, protein: 5,   carbs: 32,  fat: 6,   fiber: 2,   sodium: 420, servingDesc: '1 cup' },
  'idli':           { cal: 58,  protein: 2,   carbs: 11,  fat: 0.4, fiber: 0.5, sodium: 182, servingDesc: '1 piece' },
  'dosa':           { cal: 168, protein: 4,   carbs: 28,  fat: 5,   fiber: 1,   sodium: 450, servingDesc: '1 medium' },
  'pasta':          { cal: 220, protein: 8,   carbs: 43,  fat: 1.3, fiber: 2.5, sodium: 6,   servingDesc: '1 cup cooked' },
  'noodles':        { cal: 220, protein: 7,   carbs: 40,  fat: 2.5, fiber: 2,   sodium: 400, servingDesc: '1 cup cooked' },
  // ── Proteins ──
  'egg':            { cal: 72,  protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0,   sodium: 71,  servingDesc: '1 large' },
  'chicken breast': { cal: 165, protein: 31,  carbs: 0,   fat: 3.6, fiber: 0,   sodium: 74,  servingDesc: '100g cooked' },
  'chicken':        { cal: 165, protein: 31,  carbs: 0,   fat: 3.6, fiber: 0,   sodium: 74,  servingDesc: '100g cooked' },
  'paneer':         { cal: 265, protein: 18,  carbs: 3,   fat: 20,  fiber: 0,   sodium: 400, servingDesc: '100g' },
  'tofu':           { cal: 94,  protein: 10,  carbs: 2,   fat: 5.2, fiber: 0.3, sodium: 14,  servingDesc: '100g firm' },
  'tuna':           { cal: 109, protein: 24,  carbs: 0,   fat: 1,   fiber: 0,   sodium: 320, servingDesc: '100g canned' },
  'salmon':         { cal: 208, protein: 20,  carbs: 0,   fat: 13,  fiber: 0,   sodium: 59,  servingDesc: '100g' },
  'dal':            { cal: 198, protein: 12,  carbs: 36,  fat: 1,   fiber: 8,   sodium: 380, servingDesc: '1 cup cooked' },
  'rajma':          { cal: 225, protein: 15,  carbs: 40,  fat: 0.9, fiber: 11,  sodium: 360, servingDesc: '1 cup cooked' },
  'chana':          { cal: 269, protein: 14,  carbs: 45,  fat: 4,   fiber: 12,  sodium: 400, servingDesc: '1 cup cooked' },
  'lentils':        { cal: 230, protein: 18,  carbs: 40,  fat: 0.8, fiber: 16,  sodium: 4,   servingDesc: '1 cup cooked' },
  'greek yogurt':   { cal: 100, protein: 17,  carbs: 6,   fat: 0.7, fiber: 0,   sodium: 60,  servingDesc: '170g' },
  'yogurt':         { cal: 150, protein: 8,   carbs: 17,  fat: 3.8, fiber: 0,   sodium: 113, servingDesc: '1 cup' },
  'milk':           { cal: 149, protein: 8,   carbs: 12,  fat: 8,   fiber: 0,   sodium: 107, servingDesc: '1 cup 240ml' },
  'cottage cheese': { cal: 110, protein: 12,  carbs: 3,   fat: 5,   fiber: 0,   sodium: 380, servingDesc: '½ cup' },
  // ── Vegetables ──
  'spinach':        { cal: 23,  protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sodium: 79,  servingDesc: '1 cup raw' },
  'broccoli':       { cal: 55,  protein: 3.7, carbs: 11,  fat: 0.6, fiber: 5.1, sodium: 64,  servingDesc: '1 cup' },
  'potato':         { cal: 163, protein: 4.3, carbs: 37,  fat: 0.2, fiber: 3.8, sodium: 17,  servingDesc: '1 medium' },
  'sweet potato':   { cal: 103, protein: 2.3, carbs: 24,  fat: 0.1, fiber: 3.8, sodium: 41,  servingDesc: '1 medium' },
  'carrot':         { cal: 52,  protein: 1.2, carbs: 12,  fat: 0.3, fiber: 3.6, sodium: 88,  servingDesc: '1 medium' },
  'tomato':         { cal: 22,  protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, sodium: 6,   servingDesc: '1 medium' },
  'onion':          { cal: 44,  protein: 1.2, carbs: 10,  fat: 0.1, fiber: 1.9, sodium: 4,   servingDesc: '1 medium' },
  'cucumber':       { cal: 16,  protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sodium: 2,   servingDesc: '1 cup sliced' },
  'lettuce':        { cal: 5,   protein: 0.5, carbs: 1,   fat: 0.1, fiber: 0.5, sodium: 7,   servingDesc: '1 cup' },
  'mushroom':       { cal: 21,  protein: 3,   carbs: 3.1, fat: 0.3, fiber: 1,   sodium: 5,   servingDesc: '1 cup' },
  // ── Fruits ──
  'banana':         { cal: 89,  protein: 1.1, carbs: 23,  fat: 0.3, fiber: 2.6, sodium: 1,   servingDesc: '1 medium' },
  'apple':          { cal: 95,  protein: 0.5, carbs: 25,  fat: 0.3, fiber: 4.4, sodium: 2,   servingDesc: '1 medium' },
  'mango':          { cal: 201, protein: 2.8, carbs: 50,  fat: 1.3, fiber: 5.4, sodium: 3,   servingDesc: '1 cup sliced' },
  'orange':         { cal: 62,  protein: 1.2, carbs: 15,  fat: 0.2, fiber: 3.1, sodium: 0,   servingDesc: '1 medium' },
  'grapes':         { cal: 104, protein: 1.1, carbs: 27,  fat: 0.2, fiber: 1.4, sodium: 3,   servingDesc: '1 cup' },
  'strawberry':     { cal: 49,  protein: 1,   carbs: 12,  fat: 0.5, fiber: 3,   sodium: 1,   servingDesc: '1 cup' },
  'watermelon':     { cal: 86,  protein: 1.7, carbs: 22,  fat: 0.4, fiber: 1.1, sodium: 3,   servingDesc: '2 cups diced' },
  // ── Fats & Nuts ──
  'almonds':        { cal: 164, protein: 6,   carbs: 6,   fat: 14,  fiber: 3.5, sodium: 0,   servingDesc: '1 oz / 23 almonds' },
  'peanut butter':  { cal: 188, protein: 7,   carbs: 7,   fat: 16,  fiber: 1.9, sodium: 147, servingDesc: '2 tbsp' },
  'avocado':        { cal: 240, protein: 3,   carbs: 13,  fat: 22,  fiber: 10,  sodium: 11,  servingDesc: '1 medium' },
  'ghee':           { cal: 112, protein: 0,   carbs: 0,   fat: 12.7,fiber: 0,   sodium: 0,   servingDesc: '1 tbsp' },
  'butter':         { cal: 102, protein: 0.1, carbs: 0,   fat: 11.5,fiber: 0,   sodium: 91,  servingDesc: '1 tbsp' },
  'olive oil':      { cal: 119, protein: 0,   carbs: 0,   fat: 13.5,fiber: 0,   sodium: 0,   servingDesc: '1 tbsp' },
  // ── Drinks ──
  'chai':           { cal: 60,  protein: 2,   carbs: 10,  fat: 1.5, fiber: 0,   sodium: 60,  servingDesc: '1 cup with milk + sugar' },
  'coffee':         { cal: 5,   protein: 0.3, carbs: 0,   fat: 0,   fiber: 0,   sodium: 5,   servingDesc: '1 cup black' },
  'orange juice':   { cal: 112, protein: 1.7, carbs: 26,  fat: 0.5, fiber: 0.5, sodium: 2,   servingDesc: '1 cup 240ml' },
  'protein shake':  { cal: 130, protein: 25,  carbs: 7,   fat: 1.5, fiber: 1,   sodium: 130, servingDesc: '1 scoop in water' },
  'whey protein':   { cal: 130, protein: 25,  carbs: 7,   fat: 1.5, fiber: 1,   sodium: 130, servingDesc: '1 scoop' },
  // ── Indian Dishes ──
  'samosa':         { cal: 308, protein: 5,   carbs: 28,  fat: 20,  fiber: 3,   sodium: 480, servingDesc: '2 pieces' },
  'biryani':        { cal: 380, protein: 14,  carbs: 55,  fat: 12,  fiber: 2,   sodium: 520, servingDesc: '1 cup' },
  'palak paneer':   { cal: 240, protein: 11,  carbs: 8,   fat: 18,  fiber: 3,   sodium: 520, servingDesc: '1 cup' },
  'butter chicken': { cal: 290, protein: 20,  carbs: 12,  fat: 18,  fiber: 1,   sodium: 680, servingDesc: '1 cup' },
  'chole':          { cal: 268, protein: 14,  carbs: 40,  fat: 6,   fiber: 10,  sodium: 590, servingDesc: '1 cup' },
  'dahi':           { cal: 150, protein: 8,   carbs: 17,  fat: 3.8, fiber: 0,   sodium: 113, servingDesc: '1 cup' },
  'khichdi':        { cal: 250, protein: 9,   carbs: 44,  fat: 5,   fiber: 4,   sodium: 380, servingDesc: '1 cup' },
  'moong dal':      { cal: 212, protein: 14,  carbs: 38,  fat: 0.8, fiber: 7,   sodium: 340, servingDesc: '1 cup cooked' },
  'sabji':          { cal: 120, protein: 4,   carbs: 16,  fat: 5,   fiber: 4,   sodium: 380, servingDesc: '1 cup' },
  'salad':          { cal: 50,  protein: 2,   carbs: 8,   fat: 1.5, fiber: 3,   sodium: 150, servingDesc: '2 cups' },
  'burger':         { cal: 354, protein: 17,  carbs: 29,  fat: 17,  fiber: 1.5, sodium: 495, servingDesc: '1 regular' },
  'pizza':          { cal: 266, protein: 11,  carbs: 33,  fat: 10,  fiber: 2,   sodium: 598, servingDesc: '1 slice' },
  'dark chocolate': { cal: 170, protein: 2,   carbs: 13,  fat: 12,  fiber: 3,   sodium: 6,   servingDesc: '30g / 1 oz' },
};

// Alias map — common alternate names / regional names
const ALIASES = {
  'chawal': 'rice', 'dal chawal': 'rice', 'chapatti': 'chapati', 'phulka': 'chapati',
  'anda': 'egg', 'eggs': 'egg', 'boiled egg': 'egg', 'scrambled egg': 'egg',
  'chicken breast': 'chicken breast', 'boneless chicken': 'chicken',
  'curd': 'yogurt', 'dahi': 'yogurt', 'lassi': 'yogurt',
  'rotis': 'roti', 'rotii': 'roti', 'wheat roti': 'roti',
  'oatmeal': 'oats', 'porridge': 'oats',
  'peanut butter toast': 'toast',
  'masala chai': 'chai', 'tea': 'chai',
  'green salad': 'salad', 'veg salad': 'salad',
  'dal fry': 'dal', 'dal tadka': 'dal', 'yellow dal': 'moong dal',
  'sprouts': 'chana', 'mixed sprouts': 'chana',
  'whey': 'whey protein', 'protein powder': 'protein shake',
  'aloo': 'potato', 'alu': 'potato',
  'shakarkandi': 'sweet potato',
  'palak': 'spinach', 'kale': 'spinach',
  'gobhi': 'broccoli', 'cauliflower': 'broccoli',
  'sabzi': 'sabji', 'curry': 'sabji',
  'rajma chawal': 'rajma',
  'butter chicken curry': 'butter chicken',
  'paneer tikka': 'paneer',
  'almonds': 'almonds', 'badam': 'almonds', 'mixed nuts': 'almonds',
};

// Unit multipliers relative to 1 serving
const UNIT_GRAMS = {
  'g': 1, 'gram': 1, 'grams': 1, 'kg': 1000,
};
const UNIT_VOLUME = {
  'cup': 1, 'cups': 1,
  'tbsp': 0.0625, 'tablespoon': 0.0625, 'tablespoons': 0.0625,
  'tsp': 0.02, 'teaspoon': 0.02,
  'bowl': 1.2, 'plate': 1.5, 'serving': 1,
};

// ── Query Parser ───────────────────────────────────────────────────────────────

function tokenizeQuery(raw) {
  return raw
    .toLowerCase()
    .replace(/\band\b/g, ',')
    .replace(/\bwith\b/g, ',')
    .replace(/\bplus\b/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parsePart(part) {
  // Match: [number?] [unit?] [of?] [food name]
  // e.g. "2 eggs", "1 cup rice", "100g chicken", "a bowl of dal", "toast"
  const m = part.match(/^([\d.]+)\s*(g|gram|grams|kg|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|bowl|plate|slice|slices|piece|pieces|serving|scoop)?\s*(?:of\s+)?(.*)/i);
  if (m) {
    const qty = parseFloat(m[1]);
    const unit = (m[2] || '').toLowerCase();
    const food = m[3].trim().replace(/^a\s+/, '') || 'unknown';
    return { qty, unit, food };
  }
  // No leading number — try "a/an [food]" or just "[food]"
  const plain = part.replace(/^an?\s+/i, '').trim();
  return { qty: 1, unit: '', food: plain };
}

function lookupFood(name) {
  // Direct match
  if (FOOD_DB[name]) return FOOD_DB[name];
  // Alias match
  const alias = ALIASES[name];
  if (alias && FOOD_DB[alias]) return FOOD_DB[alias];
  // Partial match — find first key that includes the query word or vice versa
  const words = name.split(' ');
  for (const key of Object.keys(FOOD_DB)) {
    if (words.some(w => w.length > 2 && key.includes(w))) return FOOD_DB[key];
  }
  for (const key of Object.keys(FOOD_DB)) {
    if (key.split(' ').some(w => w.length > 2 && name.includes(w))) return FOOD_DB[key];
  }
  return null;
}

function scaleMacros(entry, qty, unit) {
  let multiplier = qty;

  if (unit && UNIT_GRAMS[unit]) {
    // qty is in grams — need per-100g conversion
    // We'll estimate: a typical serving is ~180g, so per-gram = entry.cal / 180
    const estimatedServingG = 180;
    multiplier = (qty * UNIT_GRAMS[unit]) / estimatedServingG;
  } else if (unit && UNIT_VOLUME[unit]) {
    multiplier = qty * UNIT_VOLUME[unit];
  } else {
    multiplier = qty;
  }

  return {
    calories: Math.round(entry.cal      * multiplier),
    protein:  Math.round(entry.protein  * multiplier * 10) / 10,
    carbs:    Math.round(entry.carbs    * multiplier * 10) / 10,
    fat:      Math.round(entry.fat      * multiplier * 10) / 10,
    fiber:    Math.round(entry.fiber    * multiplier * 10) / 10,
    sodium:   Math.round(entry.sodium   * multiplier),
  };
}

// ── Mock result builder ─────────────────────────────────────────────────────

export function getMockFoodResult(query) {
  const parts = tokenizeQuery(query);
  const items = [];
  const unrecognized = [];

  for (const part of parts) {
    const { qty, unit, food } = parsePart(part);
    const entry = lookupFood(food);
    if (!entry) {
      unrecognized.push(food);
      // Provide a generic estimate so the result is never empty
      items.push({
        name: food,
        qty: `${qty} ${unit || 'serving'}`.trim(),
        calories: Math.round(qty * 150),
        protein:  Math.round(qty * 6),
        carbs:    Math.round(qty * 20),
        fat:      Math.round(qty * 5),
        estimated: true,
      });
      continue;
    }
    const macros = scaleMacros(entry, qty, unit);
    items.push({
      name: food,
      qty: qty === 1 && !unit ? entry.servingDesc : `${qty}${unit ? ' ' + unit : ''}`,
      ...macros,
      estimated: false,
    });
  }

  const total = items.reduce((acc, f) => ({
    calories: acc.calories + f.calories,
    protein:  acc.protein  + f.protein,
    carbs:    acc.carbs    + f.carbs,
    fat:      acc.fat      + f.fat,
    fiber:    acc.fiber    + (f.fiber || 0),
    sodium:   acc.sodium   + (f.sodium || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });

  Object.keys(total).forEach(k => { total[k] = Math.round(total[k] * 10) / 10; });

  const proteinRatio = total.protein / Math.max(1, total.calories / 4);
  const fiberScore   = Math.min(1, total.fiber / 8);
  const fatRatio     = (total.fat * 9) / Math.max(1, total.calories);
  const healthScore  = Math.round(
    proteinRatio * 30 + fiberScore * 30 + (1 - Math.max(0, fatRatio - 0.35)) * 25 +
    (total.sodium < 600 ? 15 : total.sodium < 1200 ? 8 : 0)
  );

  return {
    items,
    total,
    healthScore: Math.min(100, Math.max(0, healthScore)),
    isMock: true,
    unrecognized: unrecognized.length > 0 ? unrecognized : null,
  };
}

// ── Main Analysis ─────────────────────────────────────────────────────────────

export async function analyzeFood(query) {
  const { appId, appKey } = getCreds();

  // No keys — use mock instantly (no network call)
  if (!appId || !appKey) {
    return getMockFoodResult(query);
  }

  const res = await fetch(NUTRITIONIX_URL, {
    method: 'POST',
    headers: {
      'x-app-id':     appId,
      'x-app-key':    appKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      clearNutritionixKeys();
      return getMockFoodResult(query);
    }
    if (res.status === 404) throw new Error('Food not recognized. Try a different description.');
    throw new Error(`Nutritionix error ${res.status}: ${text.slice(0, 100)}`);
  }

  const data  = await res.json();
  const foods = data.foods ?? [];
  if (foods.length === 0) return getMockFoodResult(query);

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

  const proteinRatio = total.protein / Math.max(1, total.calories / 4);
  const fiberScore   = Math.min(1, total.fiber / 8);
  const fatRatio     = (total.fat * 9) / Math.max(1, total.calories);
  const healthScore  = Math.round(
    proteinRatio * 30 + fiberScore * 30 + (1 - Math.max(0, fatRatio - 0.35)) * 25 +
    (total.sodium < 600 ? 15 : total.sodium < 1200 ? 8 : 0)
  );

  const items = foods.map(f => ({
    name:      f.food_name,
    qty:       `${f.serving_qty ?? 1} ${f.serving_unit ?? 'serving'}`,
    calories:  Math.round(f.nf_calories             ?? 0),
    protein:   Math.round(f.nf_protein              ?? 0),
    carbs:     Math.round(f.nf_total_carbohydrate   ?? 0),
    fat:       Math.round(f.nf_total_fat            ?? 0),
    thumb:     f.photo?.thumb ?? null,
    estimated: false,
  }));

  return { items, total, healthScore: Math.min(100, Math.max(0, healthScore)), isMock: false };
}

// ── Legacy Demo Fallback ───────────────────────────────────────────────────────

export function getDemoFoodResult(query = '2 eggs and toast') {
  return getMockFoodResult(query);
}
