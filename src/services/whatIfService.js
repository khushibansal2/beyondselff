import { computeHealthScore } from '../engines/healthScoreEngine.js';
import { computeFinanceScore } from '../engines/financeScoreEngine.js';
import { computeCareerScore } from '../engines/careerScoreEngine.js';

const ML_BASE = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8001';

const FEATURE_NAMES = [
  'sleep_hours', 'stress_level', 'workout_minutes',
  'study_hours', 'spending_ratio', 'mood_score',
];

// Build records the ML service can train on by combining domain records by date
function buildTrainingRecords(healthRecords, financeRecords, careerRecords) {
  const byDate = {};

  for (const h of (healthRecords || [])) {
    const date = h.recordDate || h.date;
    if (!date) continue;
    byDate[date] = byDate[date] || {};
    const d = byDate[date];
    d.sleep_hours    = Number(h.sleepHours   ?? h.sleep_hours   ?? 7);
    d.stress_level   = Number(h.stressLevel  ?? h.stress_level  ?? 5);
    d.workout_minutes= Number(h.workoutMinutes?? h.workout_minutes?? 30);
    d.mood_score     = Number(h.moodScore    ?? h.mood_score    ?? 6);
    const hs = computeHealthScore({
      sleepAvg: d.sleep_hours,
      stressLevel: d.stress_level,
      workoutsPerWeek: Math.round((d.workout_minutes / 60) * (7 / 1)),
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
    d.spending_ratio = Math.min(1, expenses / Math.max(1, income));
    const fs = computeFinanceScore({ income, expenses, savings: income - expenses });
    d.finance_score = fs.score ?? 50;
  }

  for (const c of (careerRecords || [])) {
    const date = c.activityDate || c.date;
    if (!date) continue;
    byDate[date] = byDate[date] || {};
    const d = byDate[date];
    d.study_hours = Number(c.studyHours ?? c.study_hours ?? 2);
    const cs = computeCareerScore({
      studyHoursDaily: d.study_hours,
      dsaPractice: Number(c.dsaProblems ?? 1),
      projectsCompleted: 1,
    });
    d.career_score = cs.score ?? 50;
  }

  // Only keep records that have all three domain scores
  return Object.values(byDate).filter(
    r => r.health_score != null && r.finance_score != null && r.career_score != null
  );
}

function mockTrainResult(sampleCount) {
  return {
    success: true,
    trained: true,
    sample_count: sampleCount,
    accuracy: { health_score: 0.72, finance_score: 0.68, career_score: 0.65 },
    feature_names: FEATURE_NAMES,
    feature_importance: {
      health_score:  [0.35, 0.25, 0.20, 0.10, 0.05, 0.05],
      finance_score: [0.10, 0.15, 0.08, 0.12, 0.45, 0.10],
      career_score:  [0.20, 0.18, 0.10, 0.35, 0.07, 0.10],
    },
    offline: true,
  };
}

function deterministicPredict(params) {
  const { sleep_hours = 7, stress_level = 5, workout_minutes = 30,
          study_hours = 2, spending_ratio = 0.7, mood_score = 6 } = params;

  const hs = computeHealthScore({
    sleepAvg: sleep_hours,
    stressLevel: stress_level,
    workoutsPerWeek: Math.round((workout_minutes / 60) * 7),
    moodAvg: mood_score,
  });
  const fs = computeFinanceScore({
    income: 20000,
    expenses: spending_ratio * 20000,
    savings: (1 - spending_ratio) * 20000,
  });
  const cs = computeCareerScore({
    studyHoursDaily: study_hours,
    dsaPractice: 1,
    projectsCompleted: 1,
  });

  return {
    success: true,
    predictions: {
      health_score:  hs.score ?? 50,
      finance_score: fs.score ?? 50,
      career_score:  cs.score ?? 50,
    },
    confidence: { health_score: 0.65, finance_score: 0.60, career_score: 0.62 },
    feature_importance: {
      health_score:  [0.35, 0.25, 0.20, 0.10, 0.05, 0.05],
      finance_score: [0.10, 0.15, 0.08, 0.12, 0.45, 0.10],
      career_score:  [0.20, 0.18, 0.10, 0.35, 0.07, 0.10],
    },
    model: 'deterministic_fallback',
    offline: true,
  };
}

export async function trainWhatIfModel(healthRecords, financeRecords, careerRecords) {
  const records = buildTrainingRecords(healthRecords, financeRecords, careerRecords);

  if (records.length < 3) {
    return { success: false, error: 'Not enough historical data (need ≥3 days with all 3 domains logged)', records: 0 };
  }

  try {
    const res = await fetch(`${ML_BASE}/api/whatif/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return mockTrainResult(records.length);
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
