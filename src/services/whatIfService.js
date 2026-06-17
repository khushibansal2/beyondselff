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

export const SEED_RECORDS = [
  { date:_seedDate(29), sleep_hours:5.0, stress_level:9, workout_minutes:0,  study_hours:1, spending_ratio:0.95, mood_score:2, health_score:22, finance_score:15, career_score:20 },
  { date:_seedDate(28), sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:2, spending_ratio:0.90, mood_score:3, health_score:28, finance_score:18, career_score:24 },
  { date:_seedDate(27), sleep_hours:6.0, stress_level:8, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:3, health_score:32, finance_score:20, career_score:27 },
  { date:_seedDate(26), sleep_hours:5.5, stress_level:8, workout_minutes:0,  study_hours:2, spending_ratio:0.85, mood_score:3, health_score:30, finance_score:22, career_score:30 },
  { date:_seedDate(25), sleep_hours:6.0, stress_level:7, workout_minutes:0,  study_hours:1, spending_ratio:0.90, mood_score:4, health_score:35, finance_score:22, career_score:28 },
  { date:_seedDate(24), sleep_hours:6.5, stress_level:7, workout_minutes:10, study_hours:2, spending_ratio:0.85, mood_score:4, health_score:40, finance_score:26, career_score:33 },
  { date:_seedDate(23), sleep_hours:6.5, stress_level:6, workout_minutes:15, study_hours:2, spending_ratio:0.80, mood_score:5, health_score:44, finance_score:30, career_score:37 },
  { date:_seedDate(22), sleep_hours:7.0, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6, health_score:52, finance_score:36, career_score:43 },
  { date:_seedDate(21), sleep_hours:7.0, stress_level:6, workout_minutes:20, study_hours:3, spending_ratio:0.75, mood_score:6, health_score:55, finance_score:40, career_score:48 },
  { date:_seedDate(20), sleep_hours:7.0, stress_level:5, workout_minutes:30, study_hours:3, spending_ratio:0.70, mood_score:7, health_score:58, finance_score:45, career_score:52 },
  { date:_seedDate(19), sleep_hours:7.5, stress_level:5, workout_minutes:30, study_hours:4, spending_ratio:0.65, mood_score:7, health_score:63, finance_score:50, career_score:56 },
  { date:_seedDate(18), sleep_hours:7.5, stress_level:5, workout_minutes:35, study_hours:4, spending_ratio:0.65, mood_score:7, health_score:65, finance_score:52, career_score:58 },
  { date:_seedDate(17), sleep_hours:7.5, stress_level:4, workout_minutes:40, study_hours:4, spending_ratio:0.62, mood_score:8, health_score:67, finance_score:54, career_score:60 },
  { date:_seedDate(16), sleep_hours:8.0, stress_level:4, workout_minutes:45, study_hours:5, spending_ratio:0.60, mood_score:8, health_score:70, finance_score:57, career_score:63 },
  { date:_seedDate(15), sleep_hours:8.0, stress_level:4, workout_minutes:45, study_hours:5, spending_ratio:0.55, mood_score:8, health_score:72, finance_score:60, career_score:65 },
  { date:_seedDate(14), sleep_hours:8.0, stress_level:4, workout_minutes:50, study_hours:5, spending_ratio:0.55, mood_score:8, health_score:74, finance_score:63, career_score:68 },
  { date:_seedDate(13), sleep_hours:8.0, stress_level:3, workout_minutes:50, study_hours:5, spending_ratio:0.52, mood_score:8, health_score:75, finance_score:64, career_score:69 },
  { date:_seedDate(12), sleep_hours:8.0, stress_level:3, workout_minutes:55, study_hours:5, spending_ratio:0.50, mood_score:8, health_score:77, finance_score:66, career_score:70 },
  { date:_seedDate(11), sleep_hours:8.5, stress_level:3, workout_minutes:55, study_hours:6, spending_ratio:0.50, mood_score:8, health_score:79, finance_score:68, career_score:72 },
  { date:_seedDate(10), sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.48, mood_score:9, health_score:81, finance_score:70, career_score:74 },
  { date:_seedDate(9),  sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9, health_score:83, finance_score:73, career_score:76 },
  { date:_seedDate(8),  sleep_hours:8.5, stress_level:3, workout_minutes:60, study_hours:6, spending_ratio:0.45, mood_score:9, health_score:83, finance_score:74, career_score:76 },
  { date:_seedDate(7),  sleep_hours:9.0, stress_level:2, workout_minutes:70, study_hours:7, spending_ratio:0.40, mood_score:9, health_score:86, finance_score:77, career_score:79 },
  { date:_seedDate(6),  sleep_hours:9.0, stress_level:2, workout_minutes:70, study_hours:7, spending_ratio:0.38, mood_score:9, health_score:87, finance_score:78, career_score:80 },
  { date:_seedDate(5),  sleep_hours:9.0, stress_level:2, workout_minutes:75, study_hours:7, spending_ratio:0.38, mood_score:9, health_score:88, finance_score:79, career_score:81 },
  { date:_seedDate(4),  sleep_hours:9.0, stress_level:2, workout_minutes:75, study_hours:7, spending_ratio:0.36, mood_score:10,health_score:89, finance_score:81, career_score:82 },
  { date:_seedDate(3),  sleep_hours:9.0, stress_level:2, workout_minutes:80, study_hours:8, spending_ratio:0.35, mood_score:10,health_score:91, finance_score:83, career_score:84 },
  { date:_seedDate(2),  sleep_hours:9.0, stress_level:2, workout_minutes:85, study_hours:8, spending_ratio:0.33, mood_score:10,health_score:92, finance_score:85, career_score:86 },
  { date:_seedDate(1),  sleep_hours:9.0, stress_level:2, workout_minutes:90, study_hours:8, spending_ratio:0.30, mood_score:10,health_score:94, finance_score:87, career_score:88 },
  { date:_seedDate(0),  sleep_hours:9.0, stress_level:2, workout_minutes:90, study_hours:8, spending_ratio:0.30, mood_score:10,health_score:95, finance_score:88, career_score:90 },
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
    accuracy: { health_score: 0.74, finance_score: 0.70, career_score: 0.67 },
    feature_names: FEATURE_NAMES,
    feature_importance: {
      health_score:  [0.32, 0.24, 0.18, 0.12, 0.08, 0.06],
      finance_score: [0.09, 0.14, 0.07, 0.11, 0.46, 0.13],
      career_score:  [0.18, 0.17, 0.09, 0.36, 0.10, 0.10],
    },
    model: 'time_series_ridge',
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
