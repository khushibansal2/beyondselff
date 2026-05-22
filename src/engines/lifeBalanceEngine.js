/**
 * Life Balance Engine — Combines all domain scores deterministically.
 * 
 * Also provides cross-domain impact detection.
 * No randomness. Same input = same output.
 */

import { computeHealthScore, computeBurnoutRisk } from './healthScoreEngine.js';
import { computeFinanceScore } from './financeScoreEngine.js';
import { computeCareerScore } from './careerScoreEngine.js';

/**
 * Compute life balance score and cross-domain analysis.
 * Returns comprehensive analysis with all domain scores, balance, burnout, cross-domain relationships.
 */
export function computeLifeBalance(userData, records = {}) {
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

  // Detect cross-domain relationships
  const crossDomain = detectCrossDomainRelationships(userData, healthResult, financeResult, careerResult);

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
function detectCrossDomainRelationships(userData, healthR, financeR, careerR) {
  const h = userData.health || {};
  const f = userData.finance || {};
  const c = userData.career || {};

  const sleepAvg = h.sleepAvg ?? 7;
  const stressLevel = h.stressLevel ?? 5;
  const workoutsPerWeek = h.workoutsPerWeek ?? 2;
  const studyHoursDaily = c.studyHoursDaily ?? 3;
  const codingHoursDaily = c.codingHoursDaily ?? 2;
  const expenses = f.expenses ?? 15000;
  const income = f.income ?? 20000;
  const debt = f.debt ?? 0;
  const savings = f.savings ?? 10000;

  const relationships = [];

  // Sleep → Productivity cascade
  if (sleepAvg < 6.5 && (studyHoursDaily + codingHoursDaily) > 7) {
    const productivityLoss = Math.round((1 - sleepAvg / 8) * 40); // estimated % loss
    relationships.push({
      id: 'sleep-productivity',
      type: 'negative',
      from: 'health',
      to: 'career',
      trigger: `Sleep at ${sleepAvg}h/night`,
      effect: `Estimated ${productivityLoss}% reduction in study efficiency`,
      severity: sleepAvg < 5.5 ? 'critical' : 'warning',
      mechanism: 'Sleep deficit reduces cognitive consolidation and working memory, lowering effective study hours.',
      computedImpact: { productivityLoss, effectiveStudyHours: Math.round(studyHoursDaily * (sleepAvg / 8) * 10) / 10 },
    });
  }

  // Stress → Spending cascade
  if (stressLevel > 6 && (income > 0 ? expenses / income : 1) > 0.78) {
    const excessSpending = Math.round(expenses * 0.15);
    relationships.push({
      id: 'stress-spending',
      type: 'negative',
      from: 'health',
      to: 'finance',
      trigger: `Stress level at ${stressLevel}/10`,
      effect: `Estimated ₹${excessSpending.toLocaleString()} in stress-related spending per month`,
      severity: stressLevel > 8 ? 'critical' : 'warning',
      mechanism: 'High cortisol levels reduce impulse control, increasing likelihood of comfort spending.',
      computedImpact: { excessSpending, expenseRatio: Math.round((income > 0 ? expenses / income : 1) * 100) },
    });
  }

  // Exercise → Focus boost
  if (workoutsPerWeek >= 4) {
    relationships.push({
      id: 'exercise-focus',
      type: 'positive',
      from: 'health',
      to: 'career',
      trigger: `${workoutsPerWeek} workouts/week`,
      effect: 'Estimated 20-25% improvement in sustained focus',
      severity: 'positive',
      mechanism: 'Regular exercise increases BDNF and cerebral blood flow, improving concentration and memory consolidation.',
      computedImpact: { focusBoost: 22 },
    });
  }

  // Overwork → Health deterioration
  if ((studyHoursDaily + codingHoursDaily) > 10 && workoutsPerWeek < 2) {
    relationships.push({
      id: 'overwork-health',
      type: 'negative',
      from: 'career',
      to: 'health',
      trigger: `${studyHoursDaily + codingHoursDaily}h daily desk work with minimal exercise`,
      effect: 'Increased fatigue, reduced alertness, declining retention',
      severity: 'warning',
      mechanism: 'Prolonged sedentary behavior reduces circulation and increases cognitive fatigue.',
      computedImpact: { alertnessReduction: 25 },
    });
  }

  // Financial stress → Mental health
  if (debt > 0 && savings < expenses) {
    relationships.push({
      id: 'financial-stress',
      type: 'negative',
      from: 'finance',
      to: 'health',
      trigger: `Debt ₹${debt.toLocaleString()} with savings below 1 month expenses`,
      effect: 'Elevated anxiety levels, potential sleep disruption',
      severity: 'warning',
      mechanism: 'Financial insecurity activates chronic stress response, impacting sleep quality and mood.',
      computedImpact: { stressIncrease: 1.5 },
    });
  }

  return relationships;
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
