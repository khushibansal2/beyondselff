/**
 * sustainabilityService.js — Real Sustainability Carbon Engine
 *
 * Calculates a dynamic, telemetry-driven carbon footprint from:
 *   1. Finance records (transactions matched by merchant/category)
 *   2. Health records (steps and workout minutes as active transit offsets)
 *   3. Manually logged eco-actions (direct CO₂ offset credits)
 *
 * Formulas (monthly, kg CO₂e):
 *   TRANSPORT: Base 60 kg + fuel/ride-hail/airline spend multipliers
 *   ENERGY:    Base 50 kg + utility bill spend multipliers
 *   FOOD:      Base 40 kg + food delivery/dining/grocery spend multipliers
 *   OFFSETS:   Steps above 4000/day, workout minutes, logged eco-actions
 */

// ── Carbon multipliers (kg CO₂e per currency unit spent) ──────────────────────
// Source-category to CO₂ rate mapping
const TRANSPORT_MULTIPLIERS = {
  // Merchant keyword → kg CO₂e per rupee/dollar spent
  fuel: 0.00018,        // petrol pumps
  petrol: 0.00018,
  diesel: 0.00018,
  'indian oil': 0.00018,
  bharat: 0.00018,
  hp: 0.00018,
  shell: 0.00018,
  uber: 0.00008,        // ride-hailing
  ola: 0.00008,
  rapido: 0.00006,
  lyft: 0.00008,
  indriver: 0.00008,
  airline: 0.00012,     // flights
  indigo: 0.00012,
  'air india': 0.00012,
  spicejet: 0.00012,
  vistara: 0.00012,
  'go first': 0.00012,
  akasa: 0.00012,
  'air asia': 0.00012,
  irctc: 0.000025,      // rail is low carbon
  train: 0.000025,
  metro: 0.000015,
};

const ENERGY_MULTIPLIERS = {
  electricity: 0.00006,
  tata power: 0.00006,
  bses: 0.00006,
  bescom: 0.00006,
  tneb: 0.00006,
  adani: 0.00006,
  msedcl: 0.00006,
  'mahadiscom': 0.00006,
  'electric': 0.00006,
  utility: 0.00006,
  'gas bill': 0.00005,
  indane: 0.00005,
  'mahanagar gas': 0.00005,
  'bharat gas': 0.00005,
  bsnl: 0.000015,       // internet/broadband (indirect energy)
  broadband: 0.000015,
  airtel: 0.000015,
  jio: 0.000015,
  vodafone: 0.000015,
};

const FOOD_MULTIPLIERS = {
  swiggy: 0.000035,     // food delivery (packaging + delivery vehicle)
  zomato: 0.000035,
  dunzo: 0.000030,
  'food panda': 0.000030,
  eatsure: 0.000030,
  zepto: 0.000025,      // grocery delivery
  blinkit: 0.000025,
  bigbasket: 0.000020,
  grofers: 0.000020,
  jiomart: 0.000018,
  // restaurants/cafes
  mcdonald: 0.00004,
  'burger king': 0.00004,
  domino: 0.000035,
  pizza: 0.000035,
  kfc: 0.000040,
  subway: 0.000028,
  starbucks: 0.000030,
  'cafe coffee day': 0.000025,
  // general grocery
  dmart: 0.000012,
  more: 0.000012,
  reliance: 0.000012,
  supermarket: 0.000012,
  // meat-heavy keyword
  licious: 0.000055,
  fresho: 0.000040,
  ninjacart: 0.000015,
};

// Category-level fallback multipliers (used when no merchant keyword matches)
const CATEGORY_MULTIPLIERS = {
  transport: 0.00006,
  travel: 0.00008,
  fuel: 0.00018,
  food: 0.000030,
  groceries: 0.000020,
  dining: 0.000035,
  restaurant: 0.000035,
  utilities: 0.00006,
  bills: 0.00004,
};

// ── Eco-action offsets (already have kg CO₂ saved per log) ───────────────────
// These come directly from ecoActions[].points (kg)

// ── Health offsets ────────────────────────────────────────────────────────────
const STEPS_DAILY_THRESHOLD = 4000;      // steps/day before credit kicks in
const STEPS_CO2_PER_1K     = 0.25;      // kg CO₂e saved per 1000 steps above threshold
const STEPS_MAX_DAILY_OFFSET = 3.0;     // max per day
const WORKOUT_CO2_PER_MIN   = 0.04;     // kg CO₂e saved per workout minute
const DAYS_IN_MONTH         = 30;

// ── Base baselines (monthly, no activity data) ─────────────────────────────
const BASE_TRANSPORT = 60;
const BASE_ENERGY    = 50;
const BASE_FOOD      = 40;

/**
 * Match a lowercase string (merchant name or category) against a keyword map.
 * Returns the multiplier if matched, null otherwise.
 */
function matchKeyword(str, multiplierMap) {
  const s = (str || '').toLowerCase();
  for (const [keyword, rate] of Object.entries(multiplierMap)) {
    if (s.includes(keyword)) return rate;
  }
  return null;
}

/**
 * Compute the CO₂ contribution of a single finance record.
 * Returns { transport, energy, food, label, amount } or null if irrelevant.
 */
function classifyTransaction(record) {
  const amount = Math.abs(parseFloat(record.amount) || 0);
  if (amount === 0) return null;

  // Only debit transactions contribute to carbon footprint
  const txType = (record.transactionType || record.type || 'debit').toLowerCase();
  if (txType === 'credit' || amount < 0) return null;

  const merchant  = (record.merchant || record.description || '').toLowerCase();
  const category  = (record.category || '').toLowerCase();

  // Try transport keywords first
  let rate = matchKeyword(merchant, TRANSPORT_MULTIPLIERS) || matchKeyword(category, TRANSPORT_MULTIPLIERS);
  if (rate) {
    return { transport: amount * rate, energy: 0, food: 0, label: record.merchant || record.description, amount };
  }

  // Energy/utility keywords
  rate = matchKeyword(merchant, ENERGY_MULTIPLIERS) || matchKeyword(category, ENERGY_MULTIPLIERS);
  if (rate) {
    return { transport: 0, energy: amount * rate, food: 0, label: record.merchant || record.description, amount };
  }

  // Food/grocery keywords
  rate = matchKeyword(merchant, FOOD_MULTIPLIERS) || matchKeyword(category, FOOD_MULTIPLIERS);
  if (rate) {
    return { transport: 0, energy: 0, food: amount * rate, label: record.merchant || record.description, amount };
  }

  // Category-level fallback for generic categories
  if (category === 'transport' || category === 'travel') {
    return { transport: amount * CATEGORY_MULTIPLIERS.transport, energy: 0, food: 0, label: record.merchant || record.description, amount };
  }
  if (category === 'food' || category === 'dining' || category === 'restaurant') {
    return { transport: 0, energy: 0, food: amount * CATEGORY_MULTIPLIERS.food, label: record.merchant || record.description, amount };
  }
  if (category === 'groceries') {
    return { transport: 0, energy: 0, food: amount * CATEGORY_MULTIPLIERS.groceries, label: record.merchant || record.description, amount };
  }
  if (category === 'utilities' || category === 'bills') {
    return { transport: 0, energy: amount * CATEGORY_MULTIPLIERS.bills, food: 0, label: record.merchant || record.description, amount };
  }

  return null; // No carbon contribution (shopping, investments, etc.)
}

/**
 * Compute health-based CO₂ offsets from step count and workout minutes.
 * Returns { stepsOffset, workoutOffset, totalOffset }.
 */
function computeHealthOffsets(healthRecords) {
  if (!healthRecords || healthRecords.length === 0) {
    return { stepsOffset: 0, workoutOffset: 0, totalOffset: 0, details: [] };
  }

  let totalStepsOffset   = 0;
  let totalWorkoutOffset = 0;
  const details = [];

  for (const rec of healthRecords) {
    const steps          = parseFloat(rec.steps || rec.stepsCount || 0);
    const workoutMinutes = parseFloat(rec.workoutMinutes || rec.workout || 0);
    const date           = rec.date || rec.recordDate || '';

    if (steps > STEPS_DAILY_THRESHOLD) {
      const stepsAbove     = steps - STEPS_DAILY_THRESHOLD;
      const rawOffset      = (stepsAbove / 1000) * STEPS_CO2_PER_1K;
      const clampedOffset  = Math.min(rawOffset, STEPS_MAX_DAILY_OFFSET);
      totalStepsOffset    += clampedOffset;
      details.push({
        type: 'steps',
        label: `${Math.round(steps).toLocaleString()} steps`,
        date,
        offset: clampedOffset,
      });
    }

    if (workoutMinutes > 0) {
      const wOffset        = workoutMinutes * WORKOUT_CO2_PER_MIN;
      totalWorkoutOffset  += wOffset;
      details.push({
        type: 'workout',
        label: `${Math.round(workoutMinutes)} min workout`,
        date,
        offset: wOffset,
      });
    }
  }

  return {
    stepsOffset:   totalStepsOffset,
    workoutOffset: totalWorkoutOffset,
    totalOffset:   totalStepsOffset + totalWorkoutOffset,
    details,
  };
}

/**
 * Main export — computes the full sustainability footprint from telemetry.
 *
 * @param {Object} params
 * @param {Array}  params.financeRecords — records[] from DataContext (backend or uploaded)
 * @param {Array}  params.healthRecords  — records[] from DataContext (backend or uploaded)
 * @param {Array}  params.ecoActions     — ecoActions[] from sustainability state
 * @returns {Object} { transport, energy, food, total, offsets, breakdown, healthOffsets }
 */
export function calculateRealSustainability({ financeRecords = [], healthRecords = [], ecoActions = [] }) {
  // 1. Start from monthly baselines
  let transport = BASE_TRANSPORT;
  let energy    = BASE_ENERGY;
  let food      = BASE_FOOD;
  const txBreakdown = [];

  // 2. Add finance-driven carbon from transactions
  for (const rec of financeRecords) {
    const classified = classifyTransaction(rec);
    if (classified) {
      transport += classified.transport;
      energy    += classified.energy;
      food      += classified.food;
      txBreakdown.push({
        label:     classified.label,
        amount:    classified.amount,
        transport: classified.transport,
        energy:    classified.energy,
        food:      classified.food,
        co2:       classified.transport + classified.energy + classified.food,
      });
    }
  }

  // 3. Apply health offsets (active transit)
  const healthOffsets = computeHealthOffsets(healthRecords);

  // Distribute health offsets primarily against transport (active commuting)
  const transportOffset = Math.min(transport - 1, healthOffsets.totalOffset * 0.7);
  const foodOffset      = Math.min(food - 1, healthOffsets.totalOffset * 0.3);
  transport = Math.max(1, transport - transportOffset);
  food      = Math.max(1, food - foodOffset);

  // 4. Apply manually logged eco-action offsets
  const loggedOffset = (ecoActions || []).reduce((sum, a) => sum + (parseFloat(a.points) || 0), 0);
  // Distribute logged offsets equally across all categories
  const perCategory = loggedOffset / 3;
  transport = Math.max(1, transport - perCategory);
  energy    = Math.max(1, energy - perCategory);
  food      = Math.max(1, food - perCategory);

  // 5. Round to 1 decimal place
  transport = Math.round(transport * 10) / 10;
  energy    = Math.round(energy * 10) / 10;
  food      = Math.round(food * 10) / 10;
  const total = Math.round((transport + energy + food) * 10) / 10;

  // 6. Top emitting transactions (sorted by CO₂)
  const topEmitters = [...txBreakdown]
    .sort((a, b) => b.co2 - a.co2)
    .slice(0, 8)
    .map(t => ({
      ...t,
      co2: Math.round(t.co2 * 10) / 10,
    }));

  return {
    transport,
    energy,
    food,
    total,
    offsets: {
      health:    Math.round((healthOffsets.totalOffset) * 10) / 10,
      ecoLogged: Math.round(loggedOffset * 10) / 10,
      total:     Math.round((healthOffsets.totalOffset + loggedOffset) * 10) / 10,
    },
    topEmitters,
    healthOffsets,
    hasRealData: financeRecords.length > 0 || healthRecords.length > 0,
    financeRecordCount: financeRecords.length,
    healthRecordCount:  healthRecords.length,
  };
}

/**
 * Determine the data source label for the UI badge.
 */
export function getSustainabilitySourceLabel(result) {
  if (!result.hasRealData) return 'Demo Data';
  const parts = [];
  if (result.financeRecordCount > 0) parts.push(`${result.financeRecordCount} transactions`);
  if (result.healthRecordCount  > 0) parts.push(`${result.healthRecordCount} health logs`);
  return parts.join(' · ');
}

/**
 * Carbon rating label + color from a total kg value.
 */
export function getCarbonRating(total, target = 238) {
  if (total <= target * 0.7)  return { label: 'Excellent', color: '#10b981' };
  if (total <= target)         return { label: 'On Track',  color: '#22c55e' };
  if (total <= target * 1.3)  return { label: 'Over Budget', color: '#f59e0b' };
  return { label: 'Critical', color: '#ef4444' };
}
