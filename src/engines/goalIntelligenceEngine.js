/**
 * Advanced Goal Intelligence Engine
 * 
 * Deterministically analyzes goals against real-world behavioral trends, 
 * anomalies, and simulator projections to estimate completion probabilities,
 * detect risks, and adaptively recommend milestone pacing.
 * 
 * NO LLM INFERENCE. Pure deterministic math.
 */

// Calculate days between two ISO dates
function daysBetween(d1, d2) {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  return Math.max(0, Math.ceil((t2 - t1) / (1000 * 60 * 60 * 24)));
}

// Map domains to their core driving metrics from the trend engine
const DOMAIN_METRIC_MAP = {
  health: ['sleepAvg', 'workoutsPerWeek', 'stressLevel'],
  finance: ['savings', 'expenses'],
  career: ['studyHoursDaily', 'dsaPractice', 'codingHoursDaily']
};

export function analyzeGoalIntelligence(goals, trendReport, anomalies, burnoutRisk, simulatorState) {
  if (!goals || goals.length === 0) return { goals: [], summary: 'No active goals.', hasRisk: false };

  const today = new Date().toISOString();
  let hasRisk = false;
  const analyzedGoals = goals.map(goal => {
    // 1. Basic Progress Math
    const progress = Math.max(0, Math.min(100, goal.progress || 0));
    const isCompleted = progress >= 100;
    
    // Default fallback values
    let daysRemaining = null;
    let requiredPace = null;
    
    if (goal.deadline) {
      daysRemaining = daysBetween(today, goal.deadline);
      if (daysRemaining > 0 && !isCompleted) {
        requiredPace = (100 - progress) / daysRemaining; // % per day
      }
    }

    // 2. Trend & Momentum Analysis
    // We look at the trends for the metrics that drive this goal's domain
    let domainTrends = [];
    if (trendReport && trendReport.trends) {
      const coreMetrics = DOMAIN_METRIC_MAP[goal.domain] || [];
      domainTrends = trendReport.trends.filter(t => coreMetrics.includes(t.field));
    }

    // Calculate domain momentum (-1 to +1 scale)
    let domainMomentum = 0;
    let volatilityRisk = false;
    let decliningMetrics = [];
    
    if (domainTrends.length > 0) {
      const momentumScores = domainTrends.map(t => {
        if (t.trendType === 'accelerating_improvement') return 1;
        if (t.trendType === 'improving' || t.trendType === 'recovering') return 0.5;
        if (t.trendType === 'stable' || t.trendType === 'plateau') return 0;
        if (t.trendType === 'declining' || t.trendType === 'volatile') {
          decliningMetrics.push(t.label);
          if (t.trendType === 'volatile') volatilityRisk = true;
          return -0.5;
        }
        if (t.trendType === 'accelerating_decline') {
          decliningMetrics.push(t.label);
          return -1;
        }
        return 0;
      });
      domainMomentum = momentumScores.reduce((a, b) => a + b, 0) / momentumScores.length;
    }

    // 3. Risk Detection (Burnout, Anomalies, Conflicting Trends)
    const risks = [];
    let probabilityOfSuccess = 50; // base coin-flip

    // Adjust probability based on progress vs time
    if (daysRemaining !== null) {
      const idealProgress = 100 - (daysRemaining * (100 / Math.max(30, daysRemaining + (progress * 0.3)))); // Rough heuristic
      if (progress >= idealProgress) probabilityOfSuccess += 15;
      else probabilityOfSuccess -= 15;
    } else {
      if (progress > 50) probabilityOfSuccess += 10;
    }

    // Adjust based on momentum
    probabilityOfSuccess += (domainMomentum * 20);

    // Cross-Domain & Anomaly Risks
    if (burnoutRisk > 60) {
      risks.push({
        type: 'burnout',
        severity: 'critical',
        text: 'High burnout risk is severely threatening this goal. Progress may stall.'
      });
      probabilityOfSuccess -= 25;
    } else if (trendReport?.burnoutTrend?.trendType === 'burnout_escalation') {
      risks.push({
        type: 'burnout_trend',
        severity: 'warning',
        text: 'Rising burnout trajectory detected. Consider pacing yourself to avoid stalling.'
      });
      probabilityOfSuccess -= 15;
    }

    if (volatilityRisk) {
      risks.push({
        type: 'volatility',
        severity: 'warning',
        text: 'Your behavior in this domain is highly volatile, reducing completion certainty.'
      });
      probabilityOfSuccess -= 10;
    }

    if (decliningMetrics.length > 0) {
      risks.push({
        type: 'declining_metrics',
        severity: 'warning',
        text: `Declining trends in ${decliningMetrics.join(', ')} are slowing your momentum.`
      });
      probabilityOfSuccess -= (5 * decliningMetrics.length);
    }
    
    // Check for active anomalies in this domain
    const domainAnomalies = (anomalies || []).filter(a => a.affectedDomain === goal.domain);
    if (domainAnomalies.length > 0) {
      risks.push({
        type: 'anomaly',
        severity: 'warning',
        text: `Active anomaly detected: ${domainAnomalies[0].title}. This is disrupting goal progress.`
      });
      probabilityOfSuccess -= 15;
    }

    // 4. Simulator Projections Impact
    let simulatorImpact = null;
    let simProbability = probabilityOfSuccess;
    if (simulatorState && simulatorState.selected && simulatorState.selected.length > 0) {
      // Very basic heuristic: if simulator impacts this domain positively, boost probability
      const isDomainTargeted = simulatorState.selected.some(scId => {
        if (goal.domain === 'health' && (scId === 'sleep1' || scId === 'workout2')) return true;
        if (goal.domain === 'career' && (scId === 'study2' || scId === 'dsa3')) return true;
        if (goal.domain === 'finance' && (scId === 'cutExp' || scId === 'sidehustle')) return true;
        return false;
      });

      if (isDomainTargeted) {
        simProbability = Math.min(99, probabilityOfSuccess + 21);
        simulatorImpact = `Simulated changes boost success probability from ${Math.round(probabilityOfSuccess)}% → ${Math.round(simProbability)}%`;
      }
    }

    // Final Bounds
    probabilityOfSuccess = Math.max(5, Math.min(95, probabilityOfSuccess));
    if (isCompleted) probabilityOfSuccess = 100;

    // 5. ETA Forecasting
    let etaDays = null;
    let etaText = 'Unknown';
    if (!isCompleted && progress > 0) {
      // Estimate based on required pace vs momentum
      // If momentum is positive, we beat the required pace.
      let effectivePace = requiredPace || (progress / 30); // assume 30 days history if no deadline
      effectivePace = effectivePace * (1 + (domainMomentum * 0.3)); // Momentum adjusts pace by up to 30%
      
      if (effectivePace > 0) {
        etaDays = Math.ceil((100 - progress) / effectivePace);
        etaText = `~${etaDays} days at current pace`;
        if (daysRemaining !== null && etaDays > daysRemaining + 5) {
          risks.push({
            type: 'deadline',
            severity: 'alert',
            text: `Current trajectory indicates missing the deadline by ~${etaDays - daysRemaining} days.`
          });
        }
      } else {
        etaText = 'Stalled';
      }
    } else if (isCompleted) {
      etaText = 'Completed';
    } else {
      etaText = 'Awaiting progress data';
    }

    // 6. Adaptive Suggestions
    const suggestions = [];
    if (probabilityOfSuccess < 40 && !isCompleted) {
      suggestions.push('Split this goal into smaller, 1-week milestones.');
      if (burnoutRisk > 50) {
        suggestions.push('Prioritize recovery for 3 days before pushing harder.');
      }
    } else if (domainMomentum < 0) {
      suggestions.push('Momentum is fading. Focus on 15 minutes of consistent daily progress.');
    }

    if (risks.some(r => ['critical', 'alert'].includes(r.severity))) {
      hasRisk = true;
    }

    // Confidence Label
    let status = 'On Track';
    let statusColor = 'emerald';
    if (isCompleted) {
      status = 'Completed';
      statusColor = 'blue';
    } else if (probabilityOfSuccess < 30) {
      status = 'At Risk';
      statusColor = 'red';
    } else if (probabilityOfSuccess < 60) {
      status = 'Slowing';
      statusColor = 'amber';
    }

    return {
      ...goal,
      isCompleted,
      daysRemaining,
      probabilityOfSuccess: Math.round(probabilityOfSuccess),
      simProbability: Math.round(simProbability),
      simulatorImpact,
      etaDays,
      etaText,
      momentum: domainMomentum,
      status,
      statusColor,
      risks,
      suggestions
    };
  });

  // Global Goal Summary
  const activeCount = analyzedGoals.filter(g => !g.isCompleted).length;
  const atRiskCount = analyzedGoals.filter(g => g.status === 'At Risk').length;
  let summary = `${activeCount} active goals.`;
  if (atRiskCount > 0) summary += ` ${atRiskCount} at risk.`;

  return {
    goals: analyzedGoals,
    summary,
    hasRisk
  };
}
