/**
 * Life Balance Engine — Combines all domain scores deterministically.
 *
 * Also provides cross-domain impact detection, conflict resolution,
 * and 7-day momentum trends.
 * No randomness. Same input = same output.
 */

import { computeHealthScore, computeBurnoutRisk } from './healthScoreEngine.js';
import { computeFinanceScore } from './financeScoreEngine.js';
import { computeCareerScore } from './careerScoreEngine.js';

/**
 * Compute life balance score and cross-domain analysis.
 * Returns comprehensive analysis with all domain scores, balance, burnout, cross-domain relationships.
 */
export function computeLifeBalance(userData, records = {}, mlCascade = null) {
  const healthResult = computeHealthScore(userData.health, records.health || []);
  const financeResult = computeFinanceScore(userData.finance, records.finance || []);
  const careerResult = computeCareerScore(userData.career, records.career || []);
  const burnoutResult = computeBurnoutRisk(userData.health, userData.career, records.health || []);

  // Life balance is a weighted combination with penalties
  const rawBalance = healthResult.score * 0.35 + financeResult.score * 0.30 + careerResult.score * 0.35;

  // Apply burnout penalty
  const burnoutPenalty = burnoutResult.risk > 60 ? 15 : burnoutResult.risk > 30 ? 8 : 0;
  const sleepPenalty = (userData.health?.sleepAvg ?? 7) < 6 ? 10 : 0;
  const balance = Math.round(Math.max(0, Math.min(100, rawBalance - burnoutPenalty - sleepPenalty)));

  // Detect cross-domain relationships (pass ML cascade data for enriched impact values)
  const crossDomain = detectCrossDomainRelationships(userData, healthResult, financeResult, careerResult, mlCascade);
  const trends = computeDomainTrends(records);

  // Find weakest domain
  const domains = [
    { name: 'health', score: healthResult.score },
    { name: 'finance', score: financeResult.score },
    { name: 'career', score: careerResult.score },
  ].sort((a, b) => a.score - b.score);

  // Build urgent alerts
  const urgentAlerts = buildUrgentAlerts(userData, burnoutResult, healthResult, financeResult);

  // Build positive signals
  const positiveSignals = buildPositiveSignals(userData, healthResult, financeResult, careerResult);

  return {
    balance,
    healthScore: healthResult,
    financeScore: financeResult,
    careerScore: careerResult,
    burnout: burnoutResult,
    crossDomain,
    trends,
    weakestDomain: domains[0],
    strongestDomain: domains[domains.length - 1],
    urgentAlerts,
    positiveSignals,
    penalties: { burnoutPenalty, sleepPenalty },
    sources: [
      ...healthResult.sources,
      ...financeResult.sources,
      ...careerResult.sources,
    ],
  };
}

/**
 * Detect cross-domain causal relationships.
 * These are computed deterministically — not invented by AI.
 */
function detectCrossDomainRelationships(userData, healthR, financeR, careerR, mlCascade = null) {
  const h = userData.health || {};
  const f = userData.finance || {};
  const c = userData.career || {};

  const sleepAvg = Math.min(12, Math.max(3, h.sleepAvg ?? 7));
  const stressLevel = Math.min(10, Math.max(1, h.stressLevel ?? 5));
  const workoutsPerWeek = Math.min(14, Math.max(0, h.workoutsPerWeek ?? 2));
  const studyHoursDaily = c.studyHoursDaily ?? 3;
  const codingHoursDaily = c.codingHoursDaily ?? 2;
  const expenses = f.expenses ?? 15000;
  const income = f.income ?? 20000;
  const debt = f.debt ?? 0;
  const savings = f.savings ?? 10000;
  const totalWorkHours = studyHoursDaily + codingHoursDaily;

  const relationships = [];

  // Returns XGBoost-derived cascade deltas for a rule ID, or null if unavailable.
  const mlImpact = (ruleId) => {
    const pair = mlCascade?.pairs?.[ruleId];
    if (!pair) return null;
    return {
      mlDirectDelta:   pair.direct[pair.target],
      mlCascadeDelta:  pair.cascade[pair.target],
      mlModel:         mlCascade.model,
    };
  };

  // ── Sleep ↔ Career (always fires) ────────────────────────────────────────
  if (sleepAvg < 6) {
    const productivityLoss = Math.round((1 - sleepAvg / 8) * 40);
    const ml = mlImpact('sleep-productivity');
    relationships.push({
      id: 'sleep-productivity',
      type: 'negative',
      from: 'health',
      to: 'career',
      trigger: `Sleep at ${sleepAvg}h/night`,
      effect: ml && Math.abs(ml.mlCascadeDelta) > 0.5
        ? `${productivityLoss}% study efficiency loss — ML: ${Math.abs(ml.mlCascadeDelta).toFixed(1)}pt career impact (cascade)`
        : `Estimated ${productivityLoss}% reduction in study efficiency`,
      severity: sleepAvg < 5 ? 'critical' : 'warning',
      mechanism: 'Sleep deficit reduces cognitive consolidation and working memory, lowering effective study hours.',
      computedImpact: {
        productivityLoss, effectiveStudyHours: Math.round(studyHoursDaily * (sleepAvg / 8) * 10) / 10,
        ...(ml && { mlCareerDelta: ml.mlDirectDelta, mlCascadeCareerDelta: ml.mlCascadeDelta, mlModel: ml.mlModel }),
      },
    });
  } else {
    const perfBoost = Math.round((sleepAvg / 8) * 28);
    relationships.push({
      id: 'sleep-performance',
      type: 'positive',
      from: 'health',
      to: 'career',
      trigger: `Sleep at ${sleepAvg}h/night`,
      effect: `Estimated ${perfBoost}% boost in cognitive performance and retention`,
      severity: 'positive',
      mechanism: 'Adequate sleep supports memory consolidation, working memory, and problem-solving capacity.',
      computedImpact: { performanceBoost: perfBoost },
    });
  }

  // ── Stress ↔ Finance (always fires) ──────────────────────────────────────
  if (stressLevel > 6) {
    const excessSpending = Math.round(expenses * 0.15);
    const ml = mlImpact('stress-spending');
    relationships.push({
      id: 'stress-spending',
      type: 'negative',
      from: 'health',
      to: 'finance',
      trigger: `Stress level at ${stressLevel}/10`,
      effect: ml && Math.abs(ml.mlCascadeDelta) > 0.5
        ? `₹${excessSpending.toLocaleString()} impulse spending — ML: ${Math.abs(ml.mlCascadeDelta).toFixed(1)}pt finance impact (cascade)`
        : `Estimated ₹${excessSpending.toLocaleString()} in stress-related impulse spending per month`,
      severity: stressLevel > 8 ? 'critical' : 'warning',
      mechanism: 'High cortisol reduces impulse control, increasing likelihood of comfort spending.',
      computedImpact: {
        excessSpending, expenseRatio: Math.round((income > 0 ? expenses / income : 1) * 100),
        ...(ml && { mlFinanceDelta: ml.mlDirectDelta, mlCascadeFinanceDelta: ml.mlCascadeDelta, mlModel: ml.mlModel }),
      },
    });
  } else {
    relationships.push({
      id: 'stress-focus',
      type: 'positive',
      from: 'health',
      to: 'career',
      trigger: `Stress level at ${stressLevel}/10`,
      effect: `Manageable stress enabling focused work — estimated ${Math.round((5 - Math.min(stressLevel, 5)) * 4 + 10)}% focus advantage`,
      severity: 'positive',
      mechanism: 'Low-to-moderate cortisol supports alertness and motivation without impairing prefrontal function.',
      computedImpact: { focusGain: Math.round((5 - Math.min(stressLevel, 5)) * 4 + 10) },
    });
  }

  // ── Exercise ↔ Focus (fires at >= 2 workouts/week) ────────────────────────
  if (workoutsPerWeek >= 2) {
    const focusBoost = workoutsPerWeek >= 4 ? 22 : workoutsPerWeek >= 3 ? 16 : 10;
    relationships.push({
      id: 'exercise-focus',
      type: 'positive',
      from: 'health',
      to: 'career',
      trigger: `${workoutsPerWeek} workouts/week`,
      effect: `Estimated ${focusBoost}% improvement in sustained focus and memory`,
      severity: 'positive',
      mechanism: 'Regular exercise increases BDNF and cerebral blood flow, improving concentration and learning.',
      computedImpact: { focusBoost },
    });
  } else {
    const ml = mlImpact('exercise-deficit');
    relationships.push({
      id: 'exercise-deficit',
      type: 'negative',
      from: 'health',
      to: 'career',
      trigger: `Only ${workoutsPerWeek} workout(s)/week`,
      effect: ml && Math.abs(ml.mlCascadeDelta) > 0.5
        ? `Reduced BDNF limiting performance — ML: ${Math.abs(ml.mlCascadeDelta).toFixed(1)}pt career impact (cascade)`
        : 'Reduced BDNF production limiting cognitive performance and energy levels',
      severity: 'warning',
      mechanism: 'Sedentary lifestyle reduces cerebral blood flow and neuroplasticity, hindering learning.',
      computedImpact: {
        focusReduction: 15,
        ...(ml && { mlCareerDelta: ml.mlDirectDelta, mlCascadeCareerDelta: ml.mlCascadeDelta, mlModel: ml.mlModel }),
      },
    });
  }

  // ── Financial Stability ↔ Career Focus (fires when income > 0) ───────────
  if (income > 0) {
    const savingsMonths = expenses > 0 ? Math.round((savings / expenses) * 10) / 10 : 0;
    if (savings >= expenses && debt === 0) {
      relationships.push({
        id: 'financial-stability',
        type: 'positive',
        from: 'finance',
        to: 'health',
        trigger: `${savingsMonths}m expenses in savings, no debt`,
        effect: 'Reduced financial anxiety freeing cognitive bandwidth for career and wellbeing',
        severity: 'positive',
        mechanism: 'Financial security lowers background cortisol, improving sleep quality and focus capacity.',
        computedImpact: { stressReduction: 18 },
      });
    } else if (debt > 0 && savings < expenses) {
      const ml = mlImpact('financial-stress');
      relationships.push({
        id: 'financial-stress',
        type: 'negative',
        from: 'finance',
        to: 'health',
        trigger: `Debt ₹${debt.toLocaleString()} with savings below 1 month expenses`,
        effect: ml && Math.abs(ml.mlCascadeDelta) > 0.5
          ? `Financial anxiety disrupting health — ML: ${Math.abs(ml.mlCascadeDelta).toFixed(1)}pt health impact (cascade)`
          : 'Elevated anxiety levels, potential sleep disruption and focus loss',
        severity: 'warning',
        mechanism: 'Financial insecurity activates chronic stress response, impacting sleep quality and mood.',
        computedImpact: {
          stressIncrease: 1.5,
          ...(ml && { mlHealthDelta: ml.mlDirectDelta, mlCascadeHealthDelta: ml.mlCascadeDelta, mlModel: ml.mlModel }),
        },
      });
    }
  }

  // ── Overwork → Health (threshold lowered to > 8h) ─────────────────────────
  if (totalWorkHours > 8 && workoutsPerWeek < 2) {
    const ml = mlImpact('overwork-health');
    relationships.push({
      id: 'overwork-health',
      type: 'negative',
      from: 'career',
      to: 'health',
      trigger: `${totalWorkHours}h daily desk work with minimal exercise`,
      effect: ml && Math.abs(ml.mlCascadeDelta) > 0.5
        ? `Fatigue & declining alertness — ML: ${Math.abs(ml.mlCascadeDelta).toFixed(1)}pt health impact (cascade)`
        : 'Increased fatigue, reduced alertness, declining retention',
      severity: totalWorkHours > 12 ? 'critical' : 'warning',
      mechanism: 'Prolonged sedentary behavior reduces circulation and increases cognitive fatigue.',
      computedImpact: {
        alertnessReduction: 25,
        ...(ml && { mlHealthDelta: ml.mlDirectDelta, mlCascadeHealthDelta: ml.mlCascadeDelta, mlModel: ml.mlModel }),
      },
    });
  }

  return resolveCrossDomainConflicts(relationships);
}

// ── P1: Rule priority + conflict resolution ───────────────────────────────────
// For each (from→to) domain pair keep the single most severe negative,
// or the single best positive if no negatives exist.
// Final list is sorted critical → warning → positive.
const SEVERITY_RANK = { critical: 4, warning: 3, positive: 2, info: 1 };

function resolveCrossDomainConflicts(relationships) {
  const groups = {};
  for (const r of relationships) {
    const key = `${r.from}→${r.to}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const resolved = [];
  for (const group of Object.values(groups)) {
    if (group.length === 1) { resolved.push(group[0]); continue; }

    const negatives = group.filter(r => r.type === 'negative');
    const positives = group.filter(r => r.type === 'positive');

    if (negatives.length > 0) {
      // Negatives override positives for same pair; keep highest severity negative
      negatives.sort((a, b) => (SEVERITY_RANK[b.severity] || 1) - (SEVERITY_RANK[a.severity] || 1));
      resolved.push(negatives[0]);
    } else {
      // All positive — keep highest
      positives.sort((a, b) => (SEVERITY_RANK[b.severity] || 1) - (SEVERITY_RANK[a.severity] || 1));
      resolved.push(positives[0]);
    }
  }

  resolved.sort((a, b) => (SEVERITY_RANK[b.severity] || 1) - (SEVERITY_RANK[a.severity] || 1));
  return resolved;
}

// ── P1: 7-day momentum trends ─────────────────────────────────────────────────
// Splits the last 14 records in half (older vs newer) and computes direction +
// momentum score for each domain using lightweight proxy metrics.
function computeDomainTrends(records) {
  const trends = {};

  function trendFor(recs, proxy) {
    const sorted = [...recs]
      .filter(r => r.date || r.recordDate || r.transactionDate || r.activityDate)
      .sort((a, b) => new Date(a.date || a.recordDate || a.transactionDate || a.activityDate)
                    - new Date(b.date || b.recordDate || b.transactionDate || b.activityDate))
      .slice(-14);

    if (sorted.length < 4) return { direction: 'stable', momentum: 0, sampleCount: sorted.length };

    const half = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, half);
    const newer = sorted.slice(-half);

    const avg = arr => arr.reduce((s, r) => s + proxy(r), 0) / arr.length;
    const delta = avg(newer) - avg(older);

    // 7-day rolling for the label
    const last7 = sorted.slice(-7);
    const rolling7 = avg(last7);

    return {
      direction: delta > 2 ? 'improving' : delta < -2 ? 'declining' : 'stable',
      momentum: Math.round(delta * 10) / 10,
      rolling7: Math.round(rolling7 * 10) / 10,
      sampleCount: sorted.length,
    };
  }

  trends.health = trendFor(records.health || [], r => {
    const sleep  = Number(r.sleepHours   ?? r.sleep_hours   ?? r.sleep   ?? 7);
    const stress = Number(r.stressLevel  ?? r.stress_level  ?? r.stress  ?? 5);
    const mood   = Number(r.moodScore    ?? r.mood_score    ?? r.mood    ?? 6);
    return (sleep / 8) * 40 + ((10 - stress) / 10) * 35 + (mood / 10) * 25;
  });

  trends.finance = trendFor(records.finance || [], r => {
    const income   = Number(r.income ?? 20000);
    const expenses = Math.abs(Number(r.amount ?? r.expenses ?? 15000));
    return income > 0 ? Math.max(0, (income - expenses) / income * 100) : 50;
  });

  trends.career = trendFor(records.career || [], r => {
    const study  = Number(r.studyHours  ?? r.study_hours  ?? 3);
    const coding = Number(r.codingHours ?? r.coding_hours ?? 2);
    const dsa    = Number(r.dsaProblems ?? r.dsa_problems ?? 1);
    return Math.min(100, (study + coding) / 12 * 60 + Math.min(dsa, 5) / 5 * 40);
  });

  return trends;
}

function buildUrgentAlerts(userData, burnout, healthR, financeR) {
  const alerts = [];
  const h = userData.health || {};
  const f = userData.finance || {};

  if (burnout.risk > 60) alerts.push({ icon: '🚨', text: 'Burnout risk is critical — reduce work hours immediately', domain: 'health' });
  if (h.sleepAvg < 5.5) alerts.push({ icon: '😴', text: 'Severe sleep deprivation detected — prioritize rest tonight', domain: 'health' });
  if (f.income > 0 && f.expenses / f.income > 0.95) alerts.push({ icon: '💸', text: 'Expenses nearly exceed income — review spending today', domain: 'finance' });
  if (h.stressLevel > 8) alerts.push({ icon: '😰', text: 'Extreme stress levels — take a recovery break', domain: 'health' });

  return alerts;
}

function buildPositiveSignals(userData, healthR, financeR, careerR) {
  const signals = [];
  const h = userData.health || {};
  const f = userData.finance || {};
  const c = userData.career || {};

  if (h.workoutsPerWeek >= 4) signals.push({ icon: '💪', text: 'Consistent workout routine boosting productivity' });
  if (financeR.score > 70) signals.push({ icon: '💰', text: 'Strong financial discipline maintained' });
  if (c.dsaPractice >= 3) signals.push({ icon: '🧩', text: 'Excellent DSA practice habit' });
  if (h.sleepAvg >= 7) signals.push({ icon: '😴', text: 'Healthy sleep pattern supporting focus' });

  return signals.slice(0, 3);
}
