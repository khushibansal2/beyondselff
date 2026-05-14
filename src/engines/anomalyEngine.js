/**
 * Anomaly Detection Engine
 * 
 * Deterministically analyzes live state and history windows to detect significant
 * deviations from user baselines (e.g., spending spikes, broken streaks, plateaus).
 */

export function evaluateAnomalies(currentState, domain, newData, activeAnomalies = [], metricHistory = []) {
  console.log(`[AnomalyEngine] Evaluating domain: ${domain}`);
  // Keep active and monitoring anomalies
  const newAnomalies = [...activeAnomalies.filter(a => a.status === 'active' || a.status === 'monitoring')];
  const now = new Date().toISOString();
  
  // Helper to update or add anomaly (Duplicate suppression)
  const addOrUpdate = (anomaly) => {
    const existingIdx = newAnomalies.findIndex(a => a.type === anomaly.type);
    if (existingIdx >= 0) {
      // Merge: Update values but keep the original detection time
      newAnomalies[existingIdx] = { 
        ...newAnomalies[existingIdx], 
        ...anomaly, 
        status: 'active', // Reactivate if it was monitoring
        updatedAt: now 
      };
    } else {
      newAnomalies.push({ ...anomaly, id: `ano-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, detectedAt: now, status: 'active' });
    }
  };

  // Helper to gently downgrade anomaly severity before fully resolving
  const downgradeOrResolve = (type) => {
    const existingIdx = newAnomalies.findIndex(a => a.type === type);
    if (existingIdx >= 0) {
      const existing = newAnomalies[existingIdx];
      if (existing.status === 'active') {
        existing.status = 'monitoring';
        existing.severity = 'watch';
        existing.title = existing.title.replace(' (Recovering)', '') + ' (Recovering)';
        existing.updatedAt = now;
      } else if (existing.status === 'monitoring') {
        existing.status = 'resolved'; // Will be filtered out next pass
        existing.updatedAt = now;
      }
    }
  };

  // 1. Finance: Spending Spike
  if (domain === 'finance' && newData.expenses !== undefined && currentState.finance.expenses !== undefined) {
    const newExpenseTotal = Number(newData.expenses);
    const oldExpenseTotal = Number(currentState.finance.expenses);
    const expenseDelta = newExpenseTotal - oldExpenseTotal;
    
    if (expenseDelta > 0) {
      const pastFinanceDeltas = metricHistory
        .filter(h => h.domain === 'finance' && h.newState.expenses !== undefined && h.oldState.expenses !== undefined)
        .map(h => Number(h.newState.expenses) - Number(h.oldState.expenses))
        .filter(d => d > 0 && d < 1000000); // Exclude massive bulk setup imports
        
      // Default to a fraction of the delta if no history, allowing the very first log to trigger if it's massive
      let avgExpense = pastFinanceDeltas.length > 0 
        ? pastFinanceDeltas.reduce((a, b) => a + b, 0) / pastFinanceDeltas.length 
        : Math.min(expenseDelta * 0.25, 2000); 
      
      // Sparse-history protection: Require higher relative jump if we have very few data points
      const isSparse = pastFinanceDeltas.length < 3;
      const adaptiveMultiplier = isSparse ? 2.5 : 1.5 + (1 / Math.max(pastFinanceDeltas.length, 1));
      const minThreshold = isSparse ? 1000 : 500;
      
      console.log(`[AnomalyEngine: Finance]
        oldTotal: ${oldExpenseTotal}
        newTotal: ${newExpenseTotal}
        expenseDelta (transaction): ${expenseDelta}
        pastDeltasCount: ${pastFinanceDeltas.length}
        avgExpense (baseline): ${avgExpense}
        adaptiveMultiplier: ${adaptiveMultiplier}
        minThreshold: ${minThreshold}
        thresholdToBeat: ${avgExpense * adaptiveMultiplier}
      `);
      
      if (expenseDelta > avgExpense * adaptiveMultiplier && expenseDelta > minThreshold) {
        console.log(`[AnomalyEngine: Finance] 🚨 SPENDING SPIKE DETECTED! Delta ${expenseDelta} > Threshold ${avgExpense * adaptiveMultiplier}`);
        addOrUpdate({
          type: 'spending_spike',
          severity: isSparse ? 'attention' : 'alert',
          title: 'Unusual Spending Spike',
          description: `Your logged expense of ₹${expenseDelta} is significantly higher than your rolling average of ₹${Math.round(avgExpense)}. This can disrupt your savings velocity.`,
          baseline: Math.round(avgExpense),
          current: expenseDelta,
          delta: expenseDelta - Math.round(avgExpense),
          trend: 'up',
          affectedDomain: 'finance',
          triggerReason: `Expense exceeds ${Math.round(adaptiveMultiplier * 100)}% of baseline.`,
          recommendedAction: 'Review this transaction and consider pausing non-essential purchases for a few days to rebalance.'
        });
      } else if (expenseDelta > 0 && expenseDelta <= avgExpense * 1.2) {
        downgradeOrResolve('spending_spike');
      }
    }
  }

  // 2. Health: Workout Drop
  if (domain === 'health' && newData.workoutsPerWeek !== undefined && currentState.health.workoutsPerWeek !== undefined) {
    const oldW = Number(currentState.health.workoutsPerWeek);
    const newW = Number(newData.workoutsPerWeek);
    if (newW < oldW) {
      addOrUpdate({
        type: 'workout_drop',
        severity: 'attention',
        title: 'Workout Streak Broken',
        description: `Your workout frequency dropped by ${oldW - newW} session(s) down to ${newW}/week. Consistency is key to long-term energy levels.`,
        baseline: oldW,
        current: newW,
        delta: newW - oldW,
        trend: 'down',
        affectedDomain: 'health',
        triggerReason: 'Workouts per week decreased compared to baseline.',
        recommendedAction: 'Schedule a light 15-minute mobility session today to gently regain your momentum.'
      });
    } else if (newW > oldW || newW >= 3) {
      downgradeOrResolve('workout_drop');
    }
  }

  // 3. Health: Sleep Deterioration
  if (domain === 'health' && newData.sleepAvg !== undefined && currentState.health.sleepAvg !== undefined) {
    const oldS = Number(currentState.health.sleepAvg);
    const newS = Number(newData.sleepAvg);
    if (newS < oldS - 0.5 || newS < 6) {
      addOrUpdate({
        type: 'sleep_deterioration',
        severity: newS < 5 ? 'urgent' : 'alert',
        title: 'Sleep Deterioration',
        description: `Your average sleep dropped by ${Math.abs(newS - oldS).toFixed(1)} hours down to ${newS}h. This directly impairs cognitive performance and burnout resilience.`,
        baseline: oldS,
        current: newS,
        delta: newS - oldS,
        trend: 'down',
        affectedDomain: 'health',
        triggerReason: 'Sleep average dropped rapidly or fell below the safe 6-hour threshold.',
        recommendedAction: 'Prioritize going to bed 30 minutes earlier tonight and avoid screens 1 hour before sleep.'
      });
    } else if (newS > oldS && newS >= 6) {
      downgradeOrResolve('sleep_deterioration');
    }
  }
  
  // 4. Health: Stress Surge
  if (domain === 'health' && newData.stressLevel !== undefined && currentState.health.stressLevel !== undefined) {
    const oldSt = Number(currentState.health.stressLevel);
    const newSt = Number(newData.stressLevel);
    if (newSt > oldSt && newSt >= 7) {
      addOrUpdate({
        type: 'stress_surge',
        severity: newSt >= 9 ? 'urgent' : 'alert',
        title: 'Stress Levels Surging',
        description: `Your stress level spiked from ${oldSt}/10 to ${newSt}/10. Prolonged high stress actively drains your productivity.`,
        baseline: oldSt,
        current: newSt,
        delta: newSt - oldSt,
        trend: 'up',
        affectedDomain: 'health',
        triggerReason: 'Stress level increased and crossed the high-risk threshold (>=7).',
        recommendedAction: 'Take a mandatory 15-minute break immediately. Practice a short breathing exercise to reset.'
      });
    } else if (newSt < oldSt && newSt <= 6) {
      downgradeOrResolve('stress_surge');
    }
  }

  // 5. Career: Learning Plateau
  if (domain === 'career' && newData.studyHoursDaily !== undefined && currentState.career.studyHoursDaily !== undefined) {
    const oldH = Number(currentState.career.studyHoursDaily);
    const newH = Number(newData.studyHoursDaily);
    if (newH < oldH) {
      addOrUpdate({
        type: 'learning_plateau',
        severity: 'attention',
        title: 'Learning Momentum Dropping',
        description: `Your daily study hours decreased by ${Math.abs(newH - oldH).toFixed(1)} hours down to ${newH}h. You may be entering a plateau.`,
        baseline: oldH,
        current: newH,
        delta: newH - oldH,
        trend: 'down',
        affectedDomain: 'career',
        triggerReason: 'Study hours dropped below recent historical baseline.',
        recommendedAction: 'Block out just 30 minutes of focused study time today to maintain consistency without overwhelming yourself.'
      });
    } else if (newH >= oldH) {
      downgradeOrResolve('learning_plateau');
    }
  }

  // 6. Cross-Domain: Burnout Escalation
  const combinedHealth = domain === 'health' ? { ...currentState.health, ...newData } : currentState.health;
  const combinedCareer = domain === 'career' ? { ...currentState.career, ...newData } : currentState.career;
  
  if (combinedHealth.stressLevel >= 8 && combinedHealth.sleepAvg < 6 && combinedCareer.studyHoursDaily >= 6) {
    addOrUpdate({
      type: 'burnout_escalation',
      severity: 'urgent',
      title: 'Critical Burnout Risk',
      description: `High study hours (${combinedCareer.studyHoursDaily}h) combined with low sleep (${combinedHealth.sleepAvg}h) and high stress (${combinedHealth.stressLevel}/10) is mathematically unsustainable.`,
      baseline: 0,
      current: 100,
      delta: 100,
      trend: 'up',
      affectedDomain: 'cross-domain',
      triggerReason: 'Concurrent state: Stress >= 8 AND Sleep < 6 AND Study >= 6',
      recommendedAction: 'Immediate intervention required. Reduce study hours significantly and prioritize sleep recovery to avoid a total crash.'
    });
  } else if (combinedHealth.stressLevel < 7 || combinedHealth.sleepAvg >= 6) {
    downgradeOrResolve('burnout_escalation');
  }

  // Return only active and monitoring anomalies
  const finalAnomalies = newAnomalies.filter(a => a.status === 'active' || a.status === 'monitoring');
  console.log(`[AnomalyEngine] Returning ${finalAnomalies.length} active/monitoring anomalies.`);
  return finalAnomalies;
}
