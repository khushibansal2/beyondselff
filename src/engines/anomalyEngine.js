/**
 * Anomaly Detection Engine
 * 
 * Deterministically analyzes live state and history windows to detect significant
 * deviations from user baselines (e.g., spending spikes, broken streaks, plateaus).
 */

export function evaluateAnomalies(currentState, domain, newData, activeAnomalies = [], metricHistory = []) {
  const newAnomalies = [...activeAnomalies.filter(a => a.status !== 'resolved')];
  const now = new Date().toISOString();
  
  // Helper to update or add anomaly
  const addOrUpdate = (anomaly) => {
    const existingIdx = newAnomalies.findIndex(a => a.type === anomaly.type);
    if (existingIdx >= 0) {
      newAnomalies[existingIdx] = { ...newAnomalies[existingIdx], ...anomaly, updatedAt: now };
    } else {
      newAnomalies.push({ ...anomaly, id: `ano-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, detectedAt: now, status: 'active' });
    }
  };

  const resolve = (type) => {
    const existingIdx = newAnomalies.findIndex(a => a.type === type);
    if (existingIdx >= 0) {
      newAnomalies[existingIdx].status = 'resolved';
      newAnomalies[existingIdx].updatedAt = now;
    }
  };

  // 1. Finance: Spending Spike
  if (domain === 'finance' && newData.expenses !== undefined && currentState.finance.expenses !== undefined) {
    const newExpenseTotal = Number(newData.expenses);
    const oldExpenseTotal = Number(currentState.finance.expenses);
    const expenseDelta = newExpenseTotal - oldExpenseTotal;
    
    if (expenseDelta > 0) {
      // Find average of past expenses
      const pastFinanceDeltas = metricHistory
        .filter(h => h.domain === 'finance' && h.newState.expenses !== undefined && h.oldState.expenses !== undefined)
        .map(h => Number(h.newState.expenses) - Number(h.oldState.expenses))
        .filter(d => d > 0);
        
      let avgExpense = expenseDelta; // default to current if no history
      if (pastFinanceDeltas.length > 0) {
        avgExpense = pastFinanceDeltas.reduce((a, b) => a + b, 0) / pastFinanceDeltas.length;
      }
      
      // Anomaly condition: expense is > 1.5x average AND > 500
      if (expenseDelta > avgExpense * 1.5 && expenseDelta > 500 && pastFinanceDeltas.length > 0) {
        addOrUpdate({
          type: 'spending_spike',
          severity: 'high',
          title: 'Unusual Spending Spike',
          description: `You just logged an expense of ₹${expenseDelta}, which is significantly higher than your average expense of ₹${Math.round(avgExpense)}.`,
          baseline: Math.round(avgExpense),
          current: expenseDelta,
          delta: expenseDelta - Math.round(avgExpense),
          trend: 'up',
          affectedDomain: 'finance',
          triggerReason: 'Expense logged exceeds 150% of historical rolling average.',
          recommendedAction: 'Review this transaction. Consider reducing non-essential purchases this week to stay on budget.'
        });
      } else if (expenseDelta > 0 && expenseDelta <= avgExpense * 1.2) {
        // If they log a normal expense, consider it recovered
        resolve('spending_spike');
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
        severity: 'medium',
        title: 'Workout Streak Broken',
        description: `Your workout frequency dropped from ${oldW} to ${newW} sessions/week.`,
        baseline: oldW,
        current: newW,
        delta: newW - oldW,
        trend: 'down',
        affectedDomain: 'health',
        triggerReason: 'Workouts per week decreased compared to previous log.',
        recommendedAction: 'Try to schedule a light 15-minute session today to regain momentum.'
      });
    } else if (newW > oldW) {
      resolve('workout_drop');
    }
  }

  // 3. Health: Sleep Deterioration
  if (domain === 'health' && newData.sleepAvg !== undefined && currentState.health.sleepAvg !== undefined) {
    const oldS = Number(currentState.health.sleepAvg);
    const newS = Number(newData.sleepAvg);
    if (newS < oldS - 0.5 || newS < 6) {
      addOrUpdate({
        type: 'sleep_deterioration',
        severity: newS < 5 ? 'critical' : 'high',
        title: 'Sleep Deterioration',
        description: `Your sleep average dropped to ${newS} hours. This severely impacts recovery and focus.`,
        baseline: oldS,
        current: newS,
        delta: newS - oldS,
        trend: 'down',
        affectedDomain: 'health',
        triggerReason: 'Sleep average dropped by >0.5 hours or fell below 6 hours.',
        recommendedAction: 'Prioritize going to bed 30 minutes earlier tonight. Avoid screens 1 hour before bed.'
      });
    } else if (newS > oldS && newS >= 6) {
      resolve('sleep_deterioration');
    }
  }
  
  // 4. Health: Stress Surge
  if (domain === 'health' && newData.stressLevel !== undefined && currentState.health.stressLevel !== undefined) {
    const oldSt = Number(currentState.health.stressLevel);
    const newSt = Number(newData.stressLevel);
    if (newSt > oldSt && newSt >= 7) {
      addOrUpdate({
        type: 'stress_surge',
        severity: 'high',
        title: 'Stress Levels Surging',
        description: `Your stress level rose to ${newSt}/10. Continuous high stress leads to burnout.`,
        baseline: oldSt,
        current: newSt,
        delta: newSt - oldSt,
        trend: 'up',
        affectedDomain: 'health',
        triggerReason: 'Stress level increased and crossed the high threshold (>=7).',
        recommendedAction: 'Take a mandatory 15-minute break. Try a brief meditation or walk.'
      });
    } else if (newSt < oldSt && newSt <= 6) {
      resolve('stress_surge');
    }
  }

  // 5. Career: Learning Plateau
  if (domain === 'career' && newData.studyHoursDaily !== undefined && currentState.career.studyHoursDaily !== undefined) {
    const oldH = Number(currentState.career.studyHoursDaily);
    const newH = Number(newData.studyHoursDaily);
    if (newH < oldH) {
      addOrUpdate({
        type: 'learning_plateau',
        severity: 'medium',
        title: 'Learning Momentum Dropping',
        description: `Your daily study hours decreased from ${oldH} to ${newH}. You might be hitting a plateau.`,
        baseline: oldH,
        current: newH,
        delta: newH - oldH,
        trend: 'down',
        affectedDomain: 'career',
        triggerReason: 'Study hours daily decreased compared to previous state.',
        recommendedAction: 'Block out 30 minutes of focused study time today to maintain consistency.'
      });
    } else if (newH >= oldH) {
      resolve('learning_plateau');
    }
  }

  // 6. Cross-Domain: Burnout Escalation
  const combinedHealth = domain === 'health' ? { ...currentState.health, ...newData } : currentState.health;
  const combinedCareer = domain === 'career' ? { ...currentState.career, ...newData } : currentState.career;
  
  if (combinedHealth.stressLevel >= 8 && combinedHealth.sleepAvg < 6 && combinedCareer.studyHoursDaily >= 6) {
    addOrUpdate({
      type: 'burnout_escalation',
      severity: 'critical',
      title: 'Critical Burnout Risk',
      description: 'High study hours combined with low sleep and high stress are unsustainable.',
      baseline: 0,
      current: 100,
      delta: 100,
      trend: 'up',
      affectedDomain: 'cross-domain',
      triggerReason: 'Stress >= 8 AND Sleep < 6 AND Study >= 6',
      recommendedAction: 'Immediate rest required. Reduce study hours and prioritize sleep recovery immediately.'
    });
  } else if (combinedHealth.stressLevel < 7 || combinedHealth.sleepAvg >= 6) {
    resolve('burnout_escalation');
  }

  // Filter out resolved anomalies so they don't clutter state
  return newAnomalies.filter(a => a.status === 'active');
}
