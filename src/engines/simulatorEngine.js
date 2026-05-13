/**
 * Simulator Engine — Deterministic 6-Step Projection Pipeline
 *
 * Rules:
 * - No Math.random() — strictly mathematical projections
 * - All outputs are clamped to valid ranges (0-100 scores, 0-100 burnout)
 * - NaN is never allowed to propagate — all values have safe defaults
 * - Confidence decays over longer projection windows
 * - Cross-domain cascades are structured with explanation objects
 * - Projections are directional estimates, not guarantees
 */

import { computeHealthScore, computeBurnoutRisk } from './healthScoreEngine.js';
import { computeFinanceScore } from './financeScoreEngine.js';
import { computeCareerScore } from './careerScoreEngine.js';

/** Clamp a value to [min, max] and guarantee it's a finite number */
function clamp(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!isFinite(n) || isNaN(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)));
}

/** Safe add: returns fallback if result is NaN/Infinity */
function safeAdd(a, b, fallback = 0) {
  const result = Number(a) + Number(b);
  return isFinite(result) ? result : fallback;
}

/**
 * Run a multi-domain simulation.
 *
 * @param {object} baseUserData - The user's current actual data (from DataContext)
 * @param {object} modifications - Proposed changes (e.g., +1 hr sleep, -₹1000 expenses)
 * @param {number} months - Projection timeline (1, 3, 6, 12)
 * @returns {object} Simulation results including timeline, impacts, confidence, and relationships
 */
export function runSimulation(baseUserData, modifications, months = 3) {
  // Step 1: Extract baseline from DataContext with safe defaults
  const hBase = { sleepAvg: 7, stressLevel: 5, workoutsPerWeek: 2, moodAvg: 6, waterIntake: 6, calories: 2000, bmi: 22, ...(baseUserData.health || {}) };
  const fBase = { income: 20000, expenses: 15000, savings: 10000, debt: 0, investments: 0, subscriptions: 2000, ...(baseUserData.finance || {}) };
  const cBase = { studyHoursDaily: 3, codingHoursDaily: 2, dsaPractice: 1, projectsCompleted: 1, skills: [], gpa: 7, coursesActive: 1, ...(baseUserData.career || {}) };

  // Step 2: Apply user scenario modifications with clamped guard rails
  const hSim = { ...hBase };
  if (modifications.sleepAdd) hSim.sleepAvg = clamp(safeAdd(hSim.sleepAvg, modifications.sleepAdd), 3, 10, 7);
  if (modifications.workoutAdd) hSim.workoutsPerWeek = clamp(safeAdd(hSim.workoutsPerWeek, modifications.workoutAdd), 0, 7, 2);

  const fSim = { ...fBase };
  if (modifications.expenseChange) fSim.expenses = Math.max(0, safeAdd(fSim.expenses, modifications.expenseChange, fSim.expenses));
  if (modifications.incomeChange) fSim.income = Math.max(0, safeAdd(fSim.income, modifications.incomeChange, fSim.income));

  const cSim = { ...cBase };
  if (modifications.studyAdd) cSim.studyHoursDaily = clamp(safeAdd(cSim.studyHoursDaily, modifications.studyAdd), 0, 16, 3);
  if (modifications.dsaAdd) cSim.dsaPractice = clamp(safeAdd(cSim.dsaPractice, modifications.dsaAdd), 0, 10, 1);

  // Step 3: Cross-domain cascade propagation with explanation objects
  const cascades = applyCrossDomainCascades(hSim, fSim, cSim);

  // Step 4: Deterministic score recalculation
  const baseHealth  = computeHealthScore(hBase);
  const baseFinance = computeFinanceScore(fBase);
  const baseCareer  = computeCareerScore(cBase);
  const baseBurnout = computeBurnoutRisk(hBase, cBase);

  const simHealth   = computeHealthScore(hSim);
  const simFinance  = computeFinanceScore(fSim);
  const simCareer   = computeCareerScore(cSim);
  const simBurnout  = computeBurnoutRisk(hSim, cSim);

  // Guard rail: ensure all scores are in valid range
  const safeScore   = (v, fallback = 0) => clamp(v, 0, 100, fallback);
  const safeRisk    = (v, fallback = 0) => clamp(v, 0, 100, fallback);

  // Step 5: Timeline projection
  const timeline = generateProjectionTimeline(
    {
      h: safeScore(baseHealth.score),
      f: safeScore(baseFinance.score),
      c: safeScore(baseCareer.score),
      b: safeRisk(baseBurnout.risk),
      savings: fBase.savings || 0,
    },
    {
      h: safeScore(simHealth.score),
      f: safeScore(simFinance.score),
      c: safeScore(simCareer.score),
      b: safeRisk(simBurnout.risk),
      savingsRate: isFinite(fSim.income - fSim.expenses) ? fSim.income - fSim.expenses : 0,
    },
    months
  );

  // Step 6: Projection confidence decay (short-term is more certain)
  const confidence = months <= 1 ? 92 : months <= 3 ? 85 : months <= 6 ? 70 : 45;

  const bBase = safeRisk(baseBurnout.risk);
  const bSim  = safeRisk(simBurnout.risk);
  const hB    = safeScore(baseHealth.score);
  const hS    = safeScore(simHealth.score);
  const cB    = safeScore(baseCareer.score);
  const cS    = safeScore(simCareer.score);
  const fB    = safeScore(baseFinance.score);
  const fS    = safeScore(simFinance.score);

  // Step 7: Stability trend classification
  const stabilityTrend = classifyStabilityTrend({ hB, hS, fB, fS, cB, cS, bBase, bSim, months });

  // Step 8: Dominant driver — strongest factor behind the outcome
  const dominantDriver = detectDominantDriver(cascades, { hB, hS, fB, fS, cB, cS, bBase, bSim });

  // Step 9: Recovery momentum detection
  const recoveryMomentum = detectRecoveryMomentum(hSim, bSim, bBase, hS, hB, months);

  const allImpacts = detectSimulationImpacts(baseHealth, simHealth, baseFinance, simFinance, baseCareer, simCareer, baseBurnout, simBurnout);

  return {
    baseline: {
      health:  hB,
      finance: fB,
      career:  cB,
      burnout: bBase,
      savings: fBase.savings || 0,
    },
    simulated: {
      health:  hS,
      finance: fS,
      career:  cS,
      burnout: bSim,
      savings: timeline[timeline.length - 1]?.simulated?.savings ?? (fBase.savings || 0),
    },
    deltas: {
      health:  hS - hB,
      finance: fS - fB,
      career:  cS - cB,
      burnout: bSim - bBase,
      savings: (timeline[timeline.length - 1]?.simulated?.savings ?? 0) - (fBase.savings || 0),
    },
    timeline,
    impacts: allImpacts,
    cascades,
    months,
    confidence,
    stabilityTrend,   // stable / improving / declining / volatile / recovery
    dominantDriver,   // strongest factor behind outcome
    recoveryMomentum, // recovery momentum detection
    // Export metadata
    exportMeta: {
      generatedAt: new Date().toISOString(),
      confidence,
      disclaimer: confidence < 70
        ? `${months}-month projection. Treat as a directional estimate only. Confidence: ${confidence}%.`
        : `${months}-month projection. Confidence: ${confidence}%.`,
      isPartial: false,
    },
  };
}

/**
 * Classify the overall trajectory of the simulation deterministically.
 */
function classifyStabilityTrend({ hB, hS, fB, fS, cB, cS, bBase, bSim, months }) {
  const avgDelta = ((hS - hB) + (fS - fB) + (cS - cB)) / 3;
  const burnoutChange = bSim - bBase;

  // Recovery: burnout dropping AND scores improving
  if (burnoutChange < -15 && avgDelta > 3) return 'recovery';
  // Volatile: burnout rising but scores also rising (unsustainable grind)
  if (burnoutChange > 15 && avgDelta > 5) return 'volatile';
  // Declining: scores falling or burnout critical
  if (avgDelta < -5 || bSim > 70) return 'declining';
  // Improving: scores rising, burnout stable or falling
  if (avgDelta > 5 && burnoutChange <= 5) return 'improving';
  // Stable: nothing dramatic in either direction
  return 'stable';
}

/**
 * Identify the dominant driver behind the simulation outcome.
 * Returns a human-readable explanation string.
 */
function detectDominantDriver(cascades, deltas) {
  if (!cascades || cascades.length === 0) {
    // Fall back to score deltas
    const entries = [
      { label: 'health improvement',        value: deltas.hS - deltas.hB },
      { label: 'financial improvement',     value: deltas.fS - deltas.fB },
      { label: 'career readiness boost',    value: deltas.cS - deltas.cB },
      { label: 'burnout reduction',         value: -(deltas.bSim - deltas.bBase) },
    ].filter(e => isFinite(e.value));
    entries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const top = entries[0];
    if (!top || Math.abs(top.value) < 2) return null;
    return { text: `${top.label.charAt(0).toUpperCase() + top.label.slice(1)} is the dominant projected outcome.`, source: 'delta' };
  }

  // Use the cascade with the largest magnitude impact
  const negative = cascades.filter(c => c.direction === 'negative');
  const positive = cascades.filter(c => c.direction === 'positive');

  if (negative.length > 0) {
    const top = negative[0];
    return { text: `${top.name} is the dominant driver of projected decline.`, source: top.id };
  }
  if (positive.length > 0) {
    const top = positive[0];
    return { text: `${top.name} is the dominant driver of projected improvement.`, source: top.id };
  }
  return null;
}

/**
 * Detect recovery momentum — when habits consistently improve over the projection window.
 */
function detectRecoveryMomentum(hSim, bSim, bBase, hS, hB, months) {
  const burnoutImproving = bSim < bBase - 10;
  const healthImproving  = hS > hB + 3;
  const sleepHealthy     = (hSim.sleepAvg ?? 0) >= 7;
  const exerciseGood     = (hSim.workoutsPerWeek ?? 0) >= 3;

  if (burnoutImproving && healthImproving && months >= 3) {
    return {
      active: true,
      label: 'Recovery Momentum Detected',
      description: `Your habits are creating compounding recovery. Burnout risk drops ${Math.round(bBase - bSim)}% and health improves over ${months} months. Sustain these changes for full recovery.`,
      strength: sleepHealthy && exerciseGood ? 'strong' : 'moderate',
    };
  }
  if (burnoutImproving && months >= 1) {
    return {
      active: true,
      label: 'Early Recovery Signs',
      description: `Burnout risk is reducing. Continue these habits consistently for stronger recovery momentum.`,
      strength: 'early',
    };
  }
  return { active: false };
}

/**
 * Propagate cross-domain impacts deterministically.
 * Returns structured explanation objects for each active cascade.
 */
function applyCrossDomainCascades(hSim, fSim, cSim) {
  const active = [];

  // Sleep → Productivity Cascade
  if (hSim.sleepAvg < 6) {
    const penalty = clamp((6 - hSim.sleepAvg) * 0.15, 0, 0.6, 0);
    const before = cSim.studyHoursDaily;
    cSim.studyHoursDaily = clamp(cSim.studyHoursDaily * (1 - penalty), 0, 16, 2);
    active.push({
      id: 'sleep-productivity-penalty',
      name: 'Sleep Deficit → Productivity Loss',
      direction: 'negative',
      from: 'health',
      to: 'career',
      trigger: `Sleep ${hSim.sleepAvg.toFixed(1)}h/night (below 6h threshold)`,
      impact: `Study efficiency reduced by ${Math.round(penalty * 100)}%`,
      before: `${before.toFixed(1)}h study/day`,
      after: `${cSim.studyHoursDaily.toFixed(1)}h effective study/day`,
      reason: 'Sleep deficit impairs cognitive consolidation and working memory, lowering effective study output.',
    });
  } else if (hSim.sleepAvg >= 7) {
    const before = cSim.studyHoursDaily;
    cSim.studyHoursDaily = clamp(cSim.studyHoursDaily * 1.1, 0, 16, before);
    active.push({
      id: 'sleep-productivity-boost',
      name: 'Optimal Sleep → Focus Boost',
      direction: 'positive',
      from: 'health',
      to: 'career',
      trigger: `Sleep ${hSim.sleepAvg.toFixed(1)}h/night (optimal 7h+)`,
      impact: '+10% effective study efficiency',
      before: `${before.toFixed(1)}h study/day`,
      after: `${cSim.studyHoursDaily.toFixed(1)}h effective study/day`,
      reason: 'Quality sleep strengthens memory consolidation and improves sustained focus.',
    });
  }

  // Workload → Stress Cascade (evaluated after study adjustment)
  const totalWork = safeAdd(cSim.studyHoursDaily, cSim.codingHoursDaily || 0);
  if (totalWork > 10) {
    const stressBefore = hSim.stressLevel;
    hSim.stressLevel = clamp(safeAdd(hSim.stressLevel, (totalWork - 10) * 0.5), 1, 10, hSim.stressLevel);
    active.push({
      id: 'overwork-stress',
      name: 'Overwork → Stress Increase',
      direction: 'negative',
      from: 'career',
      to: 'health',
      trigger: `${totalWork.toFixed(1)}h total daily desk work (above 10h threshold)`,
      impact: `Stress +${(hSim.stressLevel - stressBefore).toFixed(1)} points`,
      before: `Stress ${stressBefore.toFixed(1)}/10`,
      after: `Stress ${hSim.stressLevel.toFixed(1)}/10`,
      reason: 'Prolonged cognitive load without recovery increases cortisol and reduces resilience.',
    });
  }

  // Exercise → Stress Reduction Cascade
  if (hSim.workoutsPerWeek >= 3) {
    const stressBefore = hSim.stressLevel;
    const reduction = (hSim.workoutsPerWeek - 2) * 0.5;
    hSim.stressLevel = clamp(hSim.stressLevel - reduction, 1, 10, hSim.stressLevel);
    active.push({
      id: 'exercise-stress-reduction',
      name: 'Exercise → Stress Relief',
      direction: 'positive',
      from: 'health',
      to: 'health',
      trigger: `${hSim.workoutsPerWeek} workouts/week (above 3/week threshold)`,
      impact: `Stress reduced by ${reduction.toFixed(1)} points`,
      before: `Stress ${stressBefore.toFixed(1)}/10`,
      after: `Stress ${hSim.stressLevel.toFixed(1)}/10`,
      reason: 'Exercise releases endorphins and lowers cortisol, directly reducing perceived stress.',
    });
  }

  // Stress → Emotional Spending Cascade
  if (hSim.stressLevel > 7) {
    const emotionalSpend = clamp((hSim.stressLevel - 7) * 500, 0, 5000, 0);
    fSim.expenses = safeAdd(fSim.expenses, emotionalSpend, fSim.expenses);
    active.push({
      id: 'stress-emotional-spending',
      name: 'High Stress → Emotional Spending',
      direction: 'negative',
      from: 'health',
      to: 'finance',
      trigger: `Stress level ${hSim.stressLevel.toFixed(1)}/10 (above 7 threshold)`,
      impact: `+₹${emotionalSpend.toLocaleString()} estimated monthly emotional spending`,
      before: `Expenses before cascade`,
      after: `+₹${emotionalSpend.toLocaleString()} added`,
      reason: 'Elevated cortisol reduces impulse control, increasing likelihood of comfort purchases.',
    });
  }

  return active;
}

/**
 * Generate month-by-month projection with clamped values.
 */
function generateProjectionTimeline(base, sim, months) {
  const timeline = [];

  // Month 0 = current baseline (starting point)
  timeline.push({
    month: 0,
    baseline:  { h: base.h, f: base.f, c: base.c, b: base.b, savings: base.savings },
    simulated: { h: base.h, f: base.f, c: base.c, b: base.b, savings: base.savings },
  });

  for (let m = 1; m <= months; m++) {
    // Gradual progression — habits need time to compound (full effect at month 3)
    const factor = Math.min(1, m / 3);

    timeline.push({
      month: m,
      baseline: {
        h: base.h,
        f: base.f,
        c: base.c,
        b: base.b,
        savings: base.savings,
      },
      simulated: {
        h: clamp(base.h + (sim.h - base.h) * factor, 0, 100, base.h),
        f: clamp(base.f + (sim.f - base.f) * factor, 0, 100, base.f),
        c: clamp(base.c + (sim.c - base.c) * factor, 0, 100, base.c),
        b: clamp(base.b + (sim.b - base.b) * factor, 0, 100, base.b),
        savings: isFinite(base.savings + sim.savingsRate * m)
          ? base.savings + sim.savingsRate * m
          : base.savings,
      },
    });
  }

  return timeline;
}

/**
 * Detect narrative impact summaries to anchor Gemini explanations.
 * AI must only explain these computed deltas — not invent new numbers.
 */
function detectSimulationImpacts(baseH, simH, baseF, simF, baseC, simC, baseB, simB) {
  const impacts = [];

  const hDelta = simH.score - baseH.score;
  const fDelta = simF.score - baseF.score;
  const cDelta = simC.score - baseC.score;
  const bDelta = simB.risk - baseB.risk;

  if (hDelta > 5)   impacts.push({ domain: 'health',  type: 'positive',  text: `Projected +${hDelta} point improvement in health score (${baseH.score} → ${simH.score}).` });
  if (hDelta < -5)  impacts.push({ domain: 'health',  type: 'negative',  text: `Projected ${Math.abs(hDelta)} point decline in health score (${baseH.score} → ${simH.score}).` });

  if (fDelta > 5)   impacts.push({ domain: 'finance', type: 'positive',  text: `Projected +${fDelta} point improvement in financial health (${baseF.score} → ${simF.score}).` });
  if (fDelta < -5)  impacts.push({ domain: 'finance', type: 'negative',  text: `Projected ${Math.abs(fDelta)} point decline in financial health (${baseF.score} → ${simF.score}).` });

  if (cDelta > 5)   impacts.push({ domain: 'career',  type: 'positive',  text: `Estimated +${cDelta} point boost in career placement readiness (${baseC.score} → ${simC.score}).` });
  if (cDelta < -5)  impacts.push({ domain: 'career',  type: 'negative',  text: `Estimated ${Math.abs(cDelta)} point drop in career placement readiness (${baseC.score} → ${simC.score}).` });

  if (bDelta < -10) impacts.push({ domain: 'burnout', type: 'positive',  text: `Burnout risk drops significantly from ${baseB.risk}% to ${simB.risk}%.` });
  if (bDelta > 10)  impacts.push({ domain: 'burnout', type: 'critical',  text: `⚠️ Burnout risk climbs from ${baseB.risk}% to ${simB.risk}% — caution advised.` });

  return impacts;
}
