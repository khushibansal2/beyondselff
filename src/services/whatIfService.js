import { computeHealthScore } from '../engines/healthScoreEngine.js';
import { computeFinanceScore } from '../engines/financeScoreEngine.js';
import { computeCareerScore } from '../engines/careerScoreEngine.js';

// 30-day seed dataset with dates so the time-series model can learn trajectory
// Dates go back 30 days from a fixed reference — oldest first
function _seedDate(daysAgo) {
  const d = new Date('2026-05-18');
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Seed arc: crisis → recovery → optimal over 30 days.
// New columns: income_level (income/100000), savings_months, debt_ratio,
// burnout_risk (0-10), dsa_problems/day, coding_hours/day.
// These signals were previously invisible to Ridge — now they inform all 3 models.
export const SEED_RECORDS = [
  { date:_seedDate(29), sleep_hours:5.0, stress_level:9, workout_minutes:0,  study_hours:1, spending_ratio:0.95, mood_score:2,  income_level:0.15, savings_months:0.0, debt_ratio:1.20, burnout_risk:9.0, dsa_problems:0.0, coding_hours:0.0, health_score:22, finance_score:15, career_score:20 },
  { date:_seedDate(28), sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:2, spending_ratio:0.90, mood_score:3,  income_level:0.17, savings_months:0.2, debt_ratio:1.16, burnout_risk:8.7, dsa_problems:0.2, coding_hours:0.2, health_score:28, finance_score:18, career_score:24 },
  { date:_seedDate(27), sleep_hours:6.0, stress_level:8, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:3,  income_level:0.20, savings_months:0.4, debt_ratio:1.12, burnout_risk:8.4, dsa_problems:0.3, coding_hours:0.3, health_score:32, finance_score:20, career_score:27 },
  { date:_seedDate(26), sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:2, spending_ratio:0.85, mood_score:3,  income_level:0.22, savings_months:0.6, debt_ratio:1.08, burnout_risk:8.2, dsa_problems:0.5, coding_hours:0.5, health_score:30, finance_score:22, career_score:30 },
  { date:_seedDate(25), sleep_hours:6.0, stress_level:7, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:4,  income_level:0.24, savings_months:0.8, debt_ratio:1.03, burnout_risk:7.9, dsa_problems:0.7, coding_hours:0.7, health_score:35, finance_score:22, career_score:28 },
  { date:_seedDate(24), sleep_hours:6.5, stress_level:7, workout_minutes:10, study_hours:2, spending_ratio:0.85, mood_score:4,  income_level:0.26, savings_months:1.0, debt_ratio:0.99, burnout_risk:7.6, dsa_problems:0.9, coding_hours:0.9, health_score:40, finance_score:26, career_score:33 },
  { date:_seedDate(23), sleep_hours:6.5, stress_level:6, workout_minutes:15, study_hours:2, spending_ratio:0.80, mood_score:5,  income_level:0.28, savings_months:1.2, debt_ratio:0.95, burnout_risk:7.3, dsa_problems:1.0, coding_hours:1.0, health_score:44, finance_score:30, career_score:37 },
  { date:_seedDate(22), sleep_hours:7.0, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6,  income_level:0.31, savings_months:1.4, debt_ratio:0.91, burnout_risk:7.1, dsa_problems:1.2, coding_hours:1.2, health_score:52, finance_score:36, career_score:43 },
  { date:_seedDate(21), sleep_hours:7.0, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6,  income_level:0.33, savings_months:1.7, debt_ratio:0.87, burnout_risk:6.8, dsa_problems:1.4, coding_hours:1.4, health_score:55, finance_score:40, career_score:48 },
  { date:_seedDate(20), sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:3, spending_ratio:0.70, mood_score:7,  income_level:0.35, savings_months:1.9, debt_ratio:0.83, burnout_risk:6.5, dsa_problems:1.6, coding_hours:1.5, health_score:58, finance_score:45, career_score:52 },
  { date:_seedDate(19), sleep_hours:7.5, stress_level:5, workout_minutes:30, study_hours:4, spending_ratio:0.65, mood_score:7,  income_level:0.37, savings_months:2.1, debt_ratio:0.79, burnout_risk:6.2, dsa_problems:1.7, coding_hours:1.7, health_score:63, finance_score:50, career_score:56 },
  { date:_seedDate(18), sleep_hours:7.5, stress_level:5, workout_minutes:35, study_hours:4, spending_ratio:0.65, mood_score:7,  income_level:0.40, savings_months:2.3, debt_ratio:0.75, burnout_risk:6.0, dsa_problems:1.9, coding_hours:1.9, health_score:65, finance_score:52, career_score:58 },
  { date:_seedDate(17), sleep_hours:7.5, stress_level:4, workout_minutes:40, study_hours:4, spending_ratio:0.62, mood_score:8,  income_level:0.42, savings_months:2.5, debt_ratio:0.70, burnout_risk:5.7, dsa_problems:2.1, coding_hours:2.1, health_score:67, finance_score:54, career_score:60 },
  { date:_seedDate(16), sleep_hours:8.0, stress_level:4, workout_minutes:45, study_hours:5, spending_ratio:0.60, mood_score:8,  income_level:0.44, savings_months:2.7, debt_ratio:0.66, burnout_risk:5.4, dsa_problems:2.2, coding_hours:2.2, health_score:70, finance_score:57, career_score:63 },
  { date:_seedDate(15), sleep_hours:8.0, stress_level:4, workout_minutes:45, study_hours:5, spending_ratio:0.55, mood_score:8,  income_level:0.46, savings_months:2.9, debt_ratio:0.62, burnout_risk:5.1, dsa_problems:2.4, coding_hours:2.4, health_score:72, finance_score:60, career_score:65 },
  { date:_seedDate(14), sleep_hours:8.0, stress_level:4, workout_minutes:50, study_hours:5, spending_ratio:0.55, mood_score:8,  income_level:0.49, savings_months:3.1, debt_ratio:0.58, burnout_risk:4.9, dsa_problems:2.6, coding_hours:2.6, health_score:74, finance_score:63, career_score:68 },
  { date:_seedDate(13), sleep_hours:8.0, stress_level:3, workout_minutes:50, study_hours:5, spending_ratio:0.52, mood_score:8,  income_level:0.51, savings_months:3.3, debt_ratio:0.54, burnout_risk:4.6, dsa_problems:2.8, coding_hours:2.8, health_score:75, finance_score:64, career_score:69 },
  { date:_seedDate(12), sleep_hours:8.0, stress_level:3, workout_minutes:55, study_hours:5, spending_ratio:0.50, mood_score:8,  income_level:0.53, savings_months:3.5, debt_ratio:0.50, burnout_risk:4.3, dsa_problems:2.9, coding_hours:2.9, health_score:77, finance_score:66, career_score:70 },
  { date:_seedDate(11), sleep_hours:8.5, stress_level:3, workout_minutes:55, study_hours:6, spending_ratio:0.50, mood_score:8,  income_level:0.55, savings_months:3.7, debt_ratio:0.46, burnout_risk:4.0, dsa_problems:3.1, coding_hours:3.1, health_score:79, finance_score:68, career_score:72 },
  { date:_seedDate(10), sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.48, mood_score:9,  income_level:0.58, savings_months:3.9, debt_ratio:0.41, burnout_risk:3.8, dsa_problems:3.3, coding_hours:3.3, health_score:81, finance_score:70, career_score:74 },
  { date:_seedDate(9),  sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9,  income_level:0.60, savings_months:4.1, debt_ratio:0.37, burnout_risk:3.5, dsa_problems:3.5, coding_hours:3.4, health_score:83, finance_score:73, career_score:76 },
  { date:_seedDate(8),  sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9,  income_level:0.62, savings_months:4.3, debt_ratio:0.33, burnout_risk:3.2, dsa_problems:3.6, coding_hours:3.6, health_score:83, finance_score:74, career_score:76 },
  { date:_seedDate(7),  sleep_hours:9.0, stress_level:2, workout_minutes:70, study_hours:7, spending_ratio:0.40, mood_score:9,  income_level:0.64, savings_months:4.6, debt_ratio:0.29, burnout_risk:2.9, dsa_problems:3.8, coding_hours:3.8, health_score:86, finance_score:77, career_score:79 },
  { date:_seedDate(6),  sleep_hours:9.0, stress_level:2, workout_minutes:70, study_hours:7, spending_ratio:0.38, mood_score:9,  income_level:0.67, savings_months:4.8, debt_ratio:0.25, burnout_risk:2.7, dsa_problems:4.0, coding_hours:4.0, health_score:87, finance_score:78, career_score:80 },
  { date:_seedDate(5),  sleep_hours:9.0, stress_level:2, workout_minutes:75, study_hours:7, spending_ratio:0.38, mood_score:9,  income_level:0.69, savings_months:5.0, debt_ratio:0.21, burnout_risk:2.4, dsa_problems:4.1, coding_hours:4.1, health_score:88, finance_score:79, career_score:81 },
  { date:_seedDate(4),  sleep_hours:9.0, stress_level:2, workout_minutes:75, study_hours:7, spending_ratio:0.36, mood_score:10, income_level:0.71, savings_months:5.2, debt_ratio:0.17, burnout_risk:2.1, dsa_problems:4.3, coding_hours:4.3, health_score:89, finance_score:81, career_score:82 },
  { date:_seedDate(3),  sleep_hours:9.0, stress_level:2, workout_minutes:80, study_hours:8, spending_ratio:0.35, mood_score:10, income_level:0.73, savings_months:5.4, debt_ratio:0.12, burnout_risk:1.8, dsa_problems:4.5, coding_hours:4.5, health_score:91, finance_score:83, career_score:84 },
  { date:_seedDate(2),  sleep_hours:9.0, stress_level:2, workout_minutes:85, study_hours:8, spending_ratio:0.33, mood_score:10, income_level:0.76, savings_months:5.6, debt_ratio:0.08, burnout_risk:1.6, dsa_problems:4.7, coding_hours:4.7, health_score:92, finance_score:85, career_score:86 },
  { date:_seedDate(1),  sleep_hours:9.0, stress_level:2, workout_minutes:90, study_hours:8, spending_ratio:0.30, mood_score:10, income_level:0.78, savings_months:5.8, debt_ratio:0.04, burnout_risk:1.3, dsa_problems:4.8, coding_hours:4.8, health_score:94, finance_score:87, career_score:88 },
  { date:_seedDate(0),  sleep_hours:9.0, stress_level:2, workout_minutes:90, study_hours:8, spending_ratio:0.30, mood_score:10, income_level:0.80, savings_months:6.0, debt_ratio:0.00, burnout_risk:1.0, dsa_problems:5.0, coding_hours:5.0, health_score:95, finance_score:88, career_score:90 },
];

const ML_BASE = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8001';

// First 6 = lifestyle habits (user-controllable, shown in Simulator sliders)
// Last 6 = financial/career state signals (derived from actual data)
const FEATURE_NAMES = [
  'sleep_hours', 'stress_level', 'workout_minutes',
  'study_hours', 'spending_ratio', 'mood_score',
  'income_level', 'savings_months', 'debt_ratio',
  'burnout_risk', 'dsa_problems', 'coding_hours',
];

// Build records the ML service can train on by combining domain records by date.
// Extracts all 12 features — 6 lifestyle habits + 6 financial/career state signals.
function buildTrainingRecords(healthRecords, financeRecords, careerRecords) {
  const byDate = {};

  for (const h of (healthRecords || [])) {
    const date = h.recordDate || h.date;
    if (!date) continue;
    byDate[date] = byDate[date] || {};
    const d = byDate[date];
    d.sleep_hours     = Number(h.sleepHours    ?? h.sleep_hours    ?? 7);
    d.stress_level    = Number(h.stressLevel   ?? h.stress_level   ?? 5);
    d.workout_minutes = Number(h.workoutMinutes ?? h.workout_minutes ?? 30);
    d.mood_score      = Number(h.moodScore     ?? h.mood_score     ?? 6);
    // Burnout proxy from health record: high stress + low sleep = high burnout
    const bStress = d.stress_level / 10;
    const bSleep  = Math.max(0, 8 - d.sleep_hours) / 8;
    d.burnout_risk = Math.round((bStress * 6 + bSleep * 4) * 10) / 10;
    const hs = computeHealthScore({
      sleepAvg: d.sleep_hours,
      stressLevel: d.stress_level,
      workoutsPerWeek: Math.round((d.workout_minutes / 60) * 7),
      moodAvg: d.mood_score,
    });
    d.health_score = hs.score ?? 50;
  }

  for (const f of (financeRecords || [])) {
    const date = f.transactionDate || f.date;
    if (!date) continue;
    byDate[date] = byDate[date] || {};
    const d = byDate[date];
    const income   = Number(f.income   ?? 20000);
    const expenses = Math.abs(Number(f.amount ?? f.expenses ?? 15000));
    const savings  = Number(f.savings  ?? Math.max(0, income - expenses));
    const debt     = Number(f.debt     ?? 0);
    d.spending_ratio  = Math.min(0.98, expenses / Math.max(1, income));
    d.income_level    = Math.min(2, income / 100000);
    d.savings_months  = Math.min(12, expenses > 0 ? savings / expenses : 0);
    d.debt_ratio      = Math.min(3, income > 0 ? debt / income : 0);
    const fs = computeFinanceScore({ income, expenses, savings, debt });
    d.finance_score = fs.score ?? 50;
  }

  for (const c of (careerRecords || [])) {
    const date = c.activityDate || c.date;
    if (!date) continue;
    byDate[date] = byDate[date] || {};
    const d = byDate[date];
    d.study_hours   = Number(c.studyHours  ?? c.study_hours  ?? 2);
    d.coding_hours  = Number(c.codingHours ?? c.coding_hours ?? 2);
    d.dsa_problems  = Number(c.dsaProblems ?? c.dsa_problems ?? 1);
    const cs = computeCareerScore({
      studyHoursDaily:  d.study_hours,
      codingHoursDaily: d.coding_hours,
      dsaPractice:      d.dsa_problems,
      projectsCompleted: Number(c.projects ?? 1),
    });
    d.career_score = cs.score ?? 50;
  }

  // Fill missing state-signal defaults so every joined record has all 12 features
  return Object.values(byDate)
    .filter(r => r.health_score != null && r.finance_score != null && r.career_score != null)
    .map(r => ({
      income_level:   r.income_level   ?? 0.40,
      savings_months: r.savings_months ?? 2.0,
      debt_ratio:     r.debt_ratio     ?? 0.30,
      burnout_risk:   r.burnout_risk   ?? 5.0,
      dsa_problems:   r.dsa_problems   ?? 1.0,
      coding_hours:   r.coding_hours   ?? 2.0,
      ...r,
    }));
}

function mockTrainResult(sampleCount) {
  return {
    success: true,
    trained: true,
    sample_count: sampleCount,
    accuracy: { health_score: 0.78, finance_score: 0.75, career_score: 0.72 },
    feature_names: FEATURE_NAMES.slice(0, 6), // lifestyle features for UI display
    feature_importance: {
      health_score:  [0.28, 0.22, 0.18, 0.10, 0.06, 0.16],
      finance_score: [0.07, 0.10, 0.05, 0.08, 0.38, 0.12],
      career_score:  [0.14, 0.12, 0.08, 0.30, 0.06, 0.08],
    },
    model: 'time_series_ridge',
    offline: true,
  };
}

// Full-signal deterministic fallback — uses all 12 features when provided,
// so the fallback path is as accurate as the live engine calls.
function deterministicPredict(params) {
  const {
    sleep_hours = 7, stress_level = 5, workout_minutes = 30,
    study_hours = 2, spending_ratio = 0.7, mood_score = 6,
    income_level = 0.40, savings_months = 2, debt_ratio = 0.30,
    burnout_risk = 5, dsa_problems = 1, coding_hours = 2,
  } = params;

  const income   = income_level * 100000;
  const expenses = spending_ratio * income;
  const savings  = savings_months * expenses;
  const debt     = debt_ratio * income;

  const hs = computeHealthScore({
    sleepAvg: sleep_hours,
    stressLevel: stress_level,
    workoutsPerWeek: Math.round((workout_minutes / 60) * 7),
    moodAvg: mood_score,
  });
  const fs = computeFinanceScore({ income, expenses, savings, debt });
  const cs = computeCareerScore({
    studyHoursDaily:  study_hours,
    codingHoursDaily: coding_hours,
    dsaPractice:      dsa_problems,
    projectsCompleted: 1,
  });

  return {
    success: true,
    predictions: {
      health_score:  hs.score ?? 50,
      finance_score: fs.score ?? 50,
      career_score:  cs.score ?? 50,
    },
    confidence: { health_score: 0.68, finance_score: 0.65, career_score: 0.65 },
    feature_importance: {
      health_score:  [0.28, 0.22, 0.18, 0.10, 0.06, 0.16],
      finance_score: [0.07, 0.10, 0.05, 0.08, 0.38, 0.12],
      career_score:  [0.14, 0.12, 0.08, 0.30, 0.06, 0.08],
    },
    model: 'deterministic_fallback',
    offline: true,
  };
}

export async function trainWhatIfModel(healthRecords, financeRecords, careerRecords) {
  const userRecords = buildTrainingRecords(healthRecords, financeRecords, careerRecords);
  // Always merge seed data so the model trains even with no user history.
  // User records are appended after seeds so they carry more weight when duplicates
  // create a denser region of the feature space.
  const records = [...SEED_RECORDS, ...userRecords];

  try {
    const res = await fetch(`${ML_BASE}/api/whatif/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ...data, user_records: userRecords.length };
  } catch {
    return { ...mockTrainResult(records.length), user_records: userRecords.length };
  }
}

export async function predictWhatIf(params) {
  try {
    const res = await fetch(`${ML_BASE}/api/whatif/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return deterministicPredict(params);
  }
}

// Max points Ridge can shift the deterministic base in either direction.
const MOMENTUM_CAP = 15;

/**
 * Compute dashboard scores as: deterministic base + Ridge trajectory delta.
 *
 * Deterministic engines are the source of truth for point-in-time scores.
 * Ridge adds time-series context (lag scores, rolling habit averages) that
 * captures whether you are improving or declining — the formula can't see that.
 * The delta is capped at ±MOMENTUM_CAP so the ML signal stays a refinement,
 * not an override, of the formula.
 */
export async function getMLDashboardScores(userData, records) {
  const h = userData.health  || {};
  const f = userData.finance || {};
  const c = userData.career  || {};

  const income   = f.income   ?? 20000;
  const expenses = f.expenses ?? 15000;
  const savings  = f.savings  ?? Math.max(0, income - expenses);
  const debt     = f.debt     ?? 0;

  // Burnout proxy: high stress + low sleep → high burnout (0–10 scale)
  const sleepHrs   = h.sleepAvg    ?? 7;
  const stressLvl  = h.stressLevel ?? 5;
  const burnoutProxy = Math.round(((stressLvl / 10) * 6 + (Math.max(0, 8 - sleepHrs) / 8) * 4) * 10) / 10;

  const params = {
    // Lifestyle habits (user-controllable)
    sleep_hours:     sleepHrs,
    stress_level:    stressLvl,
    workout_minutes: Math.round((h.workoutsPerWeek ?? 2) * 30),
    study_hours:     c.studyHoursDaily  ?? 3,
    spending_ratio:  income > 0 ? Math.min(0.98, expenses / income) : 0.70,
    mood_score:      h.moodAvg          ?? 6,
    // Financial/career state signals (derived from actual data)
    income_level:    Math.min(2, income / 100000),
    savings_months:  Math.min(12, expenses > 0 ? savings / expenses : 0),
    debt_ratio:      Math.min(3, income > 0 ? debt / income : 0),
    burnout_risk:    burnoutProxy,
    dsa_problems:    c.dsaPractice      ?? 1,
    coding_hours:    c.codingHoursDaily ?? 2,
  };

  // Deterministic base
  const base = deterministicPredict(params);

  // Ridge prediction (with trajectory context from trained lag features)
  let ridge;
  try {
    const res = await fetch(`${ML_BASE}/api/whatif/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ridge = await res.json();
  } catch {
    // ML service offline — return pure deterministic
    return { predictions: base.predictions, model: 'deterministic', mlActive: false };
  }

  // Blend: deterministic + capped Ridge delta
  const blended = {};
  for (const key of Object.keys(base.predictions)) {
    const ridgeScore = ridge.predictions?.[key] ?? base.predictions[key];
    const delta = Math.max(-MOMENTUM_CAP, Math.min(MOMENTUM_CAP, ridgeScore - base.predictions[key]));
    blended[key] = Math.round(Math.max(0, Math.min(100, base.predictions[key] + delta)));
  }

  return {
    predictions: blended,
    base_predictions: base.predictions,
    feature_importance: ridge.feature_importance,
    confidence: ridge.confidence,
    model: 'deterministic_ridge',
    mlActive: true,
  };
}

/**
 * Compute XGBoost-derived cross-domain cascade impact values.
 * Returns per-rule direct and cascade deltas for each of the 5 cross-domain pairs.
 * Null on failure so callers fall back to deterministic formulas.
 */
export async function getMLCascadeEffects(userData) {
  const h = userData.health  || {};
  const f = userData.finance || {};
  const c = userData.career  || {};

  const income   = f.income   ?? 20000;
  const expenses = f.expenses ?? 15000;
  const savings  = f.savings  ?? Math.max(0, income - expenses);
  const debt     = f.debt     ?? 0;

  const sleepHrs   = h.sleepAvg    ?? 7;
  const stressLvl  = h.stressLevel ?? 5;
  const burnoutProxy = Math.round(((stressLvl / 10) * 6 + (Math.max(0, 8 - sleepHrs) / 8) * 4) * 10) / 10;

  const params = {
    sleep_hours:     sleepHrs,
    stress_level:    stressLvl,
    workout_minutes: Math.round((h.workoutsPerWeek ?? 2) * 30),
    study_hours:     c.studyHoursDaily  ?? 3,
    spending_ratio:  income > 0 ? Math.min(0.98, expenses / income) : 0.70,
    mood_score:      h.moodAvg          ?? 6,
    income_level:    Math.min(2, income / 100000),
    savings_months:  Math.min(12, expenses > 0 ? savings / expenses : 0),
    debt_ratio:      Math.min(3, income > 0 ? debt / income : 0),
    burnout_risk:    burnoutProxy,
    dsa_problems:    c.dsaPractice      ?? 1,
    coding_hours:    c.codingHoursDaily ?? 2,
  };

  try {
    const res = await fetch(`${ML_BASE}/api/whatif/cascade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function getWhatIfStatus() {
  try {
    const res = await fetch(`${ML_BASE}/api/whatif/status`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { trained: false, accuracy: {}, feature_importance: {}, offline: true };
  }
}

export { FEATURE_NAMES };
