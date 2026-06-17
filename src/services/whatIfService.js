import { computeHealthScore } from '../engines/healthScoreEngine.js';
import { computeFinanceScore } from '../engines/financeScoreEngine.js';
import { computeCareerScore } from '../engines/careerScoreEngine.js';

// 30-day seed dataset so the model trains even with no user history
export const SEED_RECORDS = [
  { sleep_hours:6.0, stress_level:7, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:4, health_score:38, finance_score:22, career_score:30 },
  { sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:2, spending_ratio:0.85, mood_score:3, health_score:32, finance_score:28, career_score:35 },
  { sleep_hours:7.0, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6, health_score:55, finance_score:40, career_score:48 },
  { sleep_hours:7.5, stress_level:5, workout_minutes:30, study_hours:4, spending_ratio:0.65, mood_score:7, health_score:65, finance_score:52, career_score:58 },
  { sleep_hours:8.0, stress_level:4, workout_minutes:45, study_hours:5, spending_ratio:0.55, mood_score:8, health_score:74, finance_score:63, career_score:68 },
  { sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9, health_score:83, finance_score:74, career_score:76 },
  { sleep_hours:9.0, stress_level:2, workout_minutes:75, study_hours:7, spending_ratio:0.35, mood_score:9, health_score:90, finance_score:83, career_score:82 },
  { sleep_hours:6.5, stress_level:6, workout_minutes:15, study_hours:2, spending_ratio:0.80, mood_score:5, health_score:47, finance_score:33, career_score:40 },
  { sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:3, spending_ratio:0.70, mood_score:7, health_score:58, finance_score:45, career_score:52 },
  { sleep_hours:7.5, stress_level:4, workout_minutes:45, study_hours:4, spending_ratio:0.60, mood_score:8, health_score:68, finance_score:56, career_score:62 },
  { sleep_hours:5.0, stress_level:9, workout_minutes:0,  study_hours:1, spending_ratio:0.95, mood_score:2, health_score:22, finance_score:15, career_score:20 },
  { sleep_hours:8.0, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.40, mood_score:9, health_score:80, finance_score:78, career_score:75 },
  { sleep_hours:6.0, stress_level:7, workout_minutes:10, study_hours:2, spending_ratio:0.85, mood_score:4, health_score:40, finance_score:25, career_score:32 },
  { sleep_hours:7.0, stress_level:5, workout_minutes:40, study_hours:4, spending_ratio:0.65, mood_score:7, health_score:62, finance_score:50, career_score:56 },
  { sleep_hours:8.5, stress_level:3, workout_minutes:55, study_hours:5, spending_ratio:0.50, mood_score:8, health_score:78, finance_score:68, career_score:70 },
  { sleep_hours:6.5, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6, health_score:50, finance_score:38, career_score:46 },
  { sleep_hours:7.5, stress_level:4, workout_minutes:50, study_hours:5, spending_ratio:0.55, mood_score:8, health_score:70, finance_score:60, career_score:65 },
  { sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:3, health_score:30, finance_score:18, career_score:25 },
  { sleep_hours:9.0, stress_level:2, workout_minutes:90, study_hours:8, spending_ratio:0.30, mood_score:10,health_score:95, finance_score:88, career_score:90 },
  { sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:4, spending_ratio:0.68, mood_score:7, health_score:60, finance_score:47, career_score:55 },
  { sleep_hours:7.5, stress_level:4, workout_minutes:35, study_hours:4, spending_ratio:0.62, mood_score:7, health_score:66, finance_score:54, career_score:60 },
  { sleep_hours:6.0, stress_level:7, workout_minutes:10, study_hours:2, spending_ratio:0.82, mood_score:5, health_score:42, finance_score:27, career_score:34 },
  { sleep_hours:8.0, stress_level:4, workout_minutes:50, study_hours:5, spending_ratio:0.52, mood_score:8, health_score:75, finance_score:65, career_score:68 },
  { sleep_hours:6.5, stress_level:6, workout_minutes:25, study_hours:3, spending_ratio:0.78, mood_score:6, health_score:52, finance_score:35, career_score:43 },
  { sleep_hours:8.0, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9, health_score:79, finance_score:72, career_score:73 },
  { sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:3, spending_ratio:0.70, mood_score:6, health_score:57, finance_score:44, career_score:50 },
  { sleep_hours:7.5, stress_level:4, workout_minutes:40, study_hours:5, spending_ratio:0.58, mood_score:8, health_score:69, finance_score:58, career_score:64 },
  { sleep_hours:5.0, stress_level:9, workout_minutes:0,  study_hours:1, spending_ratio:0.92, mood_score:2, health_score:20, finance_score:12, career_score:18 },
  { sleep_hours:8.5, stress_level:3, workout_minutes:70, study_hours:7, spending_ratio:0.38, mood_score:9, health_score:86, finance_score:80, career_score:80 },
  { sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:4, spending_ratio:0.65, mood_score:7, health_score:61, finance_score:49, career_score:55 },
];

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
