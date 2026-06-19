/**
 * Health Score Engine — Deterministic scoring for health domain.
 * 
 * Rules:
 * - No Math.random() — same input always produces same output
 * - Exposes contributing factors for explainability
 * - Applies data freshness weighting
 * - All outputs are deterministic and testable
 */

import { safeNum } from '../utils/safeMath.js';

/**
 * Compute freshness weight based on record age.
 * Last 7 days: 1.0, 8-14: 0.8, 15-30: 0.5, 30+: 0.2
 */
export function freshnessWeight(dateStr) {
  if (!dateStr) return 0.5;
  const now = new Date();
  const date = new Date(dateStr);
  const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) return 1.0;
  if (daysDiff <= 14) return 0.8;
  if (daysDiff <= 30) return 0.5;
  return 0.2;
}

/**
 * Compute weighted average from records, prioritizing recent data.
 */
export function weightedAverage(records, field, dateFn) {
  if (!records || records.length === 0) return null;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of records) {
    const val = typeof field === 'function' ? field(r) : r[field];
    if (val == null || isNaN(val)) continue;
    const w = freshnessWeight(dateFn ? dateFn(r) : r.date || r.recordDate);
    weightedSum += val * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Calculate health score from health data.
 * Returns: { score, factors[], trends[] }
 * 
 * Score is 0-100. Each factor has name, value, weight, contribution, status.
 */
export function computeHealthScore(healthData, healthRecords = []) {
  const h = healthData || {};

  // Use record-derived averages if records exist, else fall back to summary
  const clampSleep  = v => v != null ? Math.min(12, Math.max(3,  v)) : null;
  const clampScale  = v => v != null ? Math.min(10, Math.max(1,  v)) : null;
  const sleepAvg    = safeNum(weightedAverage(healthRecords, r => clampSleep(r.sleepHours  ?? r.sleep),  r => r.recordDate) ?? clampSleep(h.sleepAvg),  7);
  const stressLevel = safeNum(weightedAverage(healthRecords, r => clampScale(r.stressLevel ?? r.stress), r => r.recordDate) ?? clampScale(h.stressLevel), 5);
  const moodAvg     = safeNum(weightedAverage(healthRecords, r => clampScale(r.mood        ?? r.moodScore), r => r.recordDate) ?? clampScale(h.moodAvg), 6);
  const workoutsPerWeek = safeNum(h.workoutsPerWeek, 2);
  const waterIntake = safeNum(weightedAverage(healthRecords, 'waterGlasses', r => r.recordDate) ?? h.waterIntake, 6);
  const calories = safeNum(h.calories, 2200);
  const bmi = safeNum(h.bmi, 23);

  // Factor calculations — each is 0-100
  // Sleep: inverted-U peaking at 7-8h. Oversleeping (>9h) penalised like undersleeping.
  const sleepScore = (() => {
    if (sleepAvg <= 4) return Math.max(0, (sleepAvg / 4) * 40);           // 0-4h: 0-40
    if (sleepAvg <= 8) return 40 + ((sleepAvg - 4) / 4) * 60;             // 4-8h: 40-100
    if (sleepAvg <= 9) return 100 - ((sleepAvg - 8) / 1) * 20;            // 8-9h: 100-80
    return Math.max(0, 80 - ((sleepAvg - 9) / 3) * 80);                   // 9-12h: 80→0
  })();
  const stressScore = Math.min(100, Math.max(0, ((10 - stressLevel) / 10) * 100));
  const moodScore = Math.min(100, Math.max(0, (moodAvg / 10) * 100));
  const workoutScore = Math.min(100, Math.max(0, (workoutsPerWeek / 5) * 100));
  const waterScore = Math.min(100, Math.max(0, (waterIntake / 8) * 100));
  const bmiScore = bmi >= 18.5 && bmi <= 24.9 ? 90 : bmi >= 17 && bmi <= 29.9 ? 60 : 30;
  const calorieScore = calories >= 1800 && calories <= 2400 ? 85 : calories > 2800 || calories < 1200 ? 40 : 60;

  const factors = [
    { name: 'Sleep Quality', value: sleepAvg, unit: 'h/night', weight: 0.25, rawScore: sleepScore, status: sleepAvg >= 7 && sleepAvg <= 9 ? 'good' : sleepAvg >= 5.5 && sleepAvg <= 10 ? 'warning' : 'critical' },
    { name: 'Stress Level', value: stressLevel, unit: '/10', weight: 0.20, rawScore: stressScore, status: stressLevel <= 4 ? 'good' : stressLevel <= 7 ? 'warning' : 'critical' },
    { name: 'Mood', value: moodAvg, unit: '/10', weight: 0.15, rawScore: moodScore, status: moodAvg >= 7 ? 'good' : moodAvg >= 4 ? 'warning' : 'critical' },
    { name: 'Physical Activity', value: workoutsPerWeek, unit: 'workouts/wk', weight: 0.15, rawScore: workoutScore, status: workoutsPerWeek >= 4 ? 'good' : workoutsPerWeek >= 2 ? 'warning' : 'critical' },
    { name: 'Hydration', value: waterIntake, unit: 'glasses/day', weight: 0.10, rawScore: waterScore, status: waterIntake >= 7 ? 'good' : waterIntake >= 5 ? 'warning' : 'critical' },
    { name: 'BMI', value: bmi, unit: '', weight: 0.10, rawScore: bmiScore, status: bmi >= 18.5 && bmi <= 24.9 ? 'good' : 'warning' },
    { name: 'Nutrition', value: calories, unit: 'cal/day', weight: 0.05, rawScore: calorieScore, status: calories >= 1800 && calories <= 2400 ? 'good' : 'warning' },
  ];

  // Compute weighted score
  const score = Math.round(factors.reduce((sum, f) => sum + f.rawScore * f.weight, 0));

  // Compute contribution of each factor
  factors.forEach(f => {
    f.contribution = Math.round(f.rawScore * f.weight);
  });

  // Compute trends from records (if available)
  const trends = computeHealthTrends(healthRecords);

  const contributors = factors
    .map(f => ({ factor: f.name, weight: Math.round(f.weight * 100), rawScore: f.rawScore, status: f.status }))
    .sort((a, b) => (b.weight * (100 - b.rawScore)) - (a.weight * (100 - a.rawScore)))
    .slice(0, 3)
    .map(({ factor, weight, rawScore, status }) => ({ factor, weight, rawScore, status }));

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
    contributors,
    trends,
    sources: buildHealthSources(healthRecords, h),
  };
}

/**
 * Compute burnout risk from health + career data.
 * Returns: { risk (0-100), factors[], sources[] }
 */
export function computeBurnoutRisk(healthData, careerData, healthRecords = []) {
  const h = healthData || {};
  const c = careerData || {};

  const sleepAvg = h.sleepAvg ?? 7;
  const stressLevel = h.stressLevel ?? 5;
  const workoutsPerWeek = h.workoutsPerWeek ?? 2;
  const moodAvg = h.moodAvg ?? 6;
  const waterIntake = h.waterIntake ?? 6;
  const totalWorkHours = (c.studyHoursDaily || 0) + (c.codingHoursDaily || 0);

  let risk = 0;
  const riskFactors = [];

  if (sleepAvg < 5) { risk += 25; riskFactors.push({ name: 'Severe sleep deficit', impact: 25, value: `${sleepAvg}h avg` }); }
  else if (sleepAvg < 6) { risk += 15; riskFactors.push({ name: 'Sleep deficit', impact: 15, value: `${sleepAvg}h avg` }); }

  if (stressLevel > 8) { risk += 25; riskFactors.push({ name: 'Critical stress', impact: 25, value: `${stressLevel}/10` }); }
  else if (stressLevel > 6) { risk += 15; riskFactors.push({ name: 'Elevated stress', impact: 15, value: `${stressLevel}/10` }); }

  if (totalWorkHours > 12) { risk += 20; riskFactors.push({ name: 'Excessive work hours', impact: 20, value: `${totalWorkHours}h/day` }); }
  else if (totalWorkHours > 8) { risk += 10; riskFactors.push({ name: 'High work hours', impact: 10, value: `${totalWorkHours}h/day` }); }

  if (workoutsPerWeek < 1) { risk += 10; riskFactors.push({ name: 'No exercise', impact: 10, value: `${workoutsPerWeek}/wk` }); }
  if (moodAvg < 4) { risk += 10; riskFactors.push({ name: 'Low mood', impact: 10, value: `${moodAvg}/10` }); }
  if (waterIntake < 4) { risk += 5; riskFactors.push({ name: 'Dehydration', impact: 5, value: `${waterIntake} glasses` }); }

  const contributors = riskFactors
    .slice()
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map(f => ({ factor: f.name, weight: f.impact, value: f.value }));

  return {
    risk: Math.min(100, risk),
    factors: riskFactors,
    contributors,
    level: risk > 60 ? 'critical' : risk > 30 ? 'moderate' : 'low',
  };
}

/**
 * Compute health trends from historical records.
 */
function computeHealthTrends(records) {
  if (!records || records.length < 3) return [];

  const trends = [];
  const recent = records.slice(-7);
  const older = records.slice(-14, -7);

  if (recent.length > 0 && older.length > 0) {
    const recentSleep = avg(recent.map(r => r.sleepHours).filter(Boolean));
    const olderSleep = avg(older.map(r => r.sleepHours).filter(Boolean));
    if (recentSleep != null && olderSleep != null) {
      const delta = recentSleep - olderSleep;
      trends.push({
        metric: 'Sleep',
        direction: delta > 0.3 ? 'improving' : delta < -0.3 ? 'declining' : 'stable',
        delta: Math.round(delta * 10) / 10,
        recentAvg: Math.round(recentSleep * 10) / 10,
      });
    }

    const recentStress = avg(recent.map(r => r.stressLevel).filter(Boolean));
    const olderStress = avg(older.map(r => r.stressLevel).filter(Boolean));
    if (recentStress != null && olderStress != null) {
      const delta = recentStress - olderStress;
      trends.push({
        metric: 'Stress',
        direction: delta > 0.5 ? 'worsening' : delta < -0.5 ? 'improving' : 'stable',
        delta: Math.round(delta * 10) / 10,
        recentAvg: Math.round(recentStress * 10) / 10,
      });
    }
  }

  return trends;
}

function buildHealthSources(records, summaryData) {
  const sources = [];
  if (records && records.length > 0) {
    sources.push(`${records.length} health records (last ${daySpan(records)} days)`);
  }
  if (summaryData && Object.keys(summaryData).length > 0) {
    sources.push('User profile health summary');
  }
  return sources;
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function daySpan(records) {
  if (records.length < 2) return 1;
  const dates = records.map(r => new Date(r.recordDate || r.date)).filter(d => !isNaN(d));
  if (dates.length < 2) return 1;
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)));
}
