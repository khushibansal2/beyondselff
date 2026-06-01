/**
 * Anomaly Detection Engine
 * 
 * Analyzes health, finance, and career records to detect:
 * - Spending spikes (large transactions or sudden spending surges)
 * - Missed workouts (drop in workout frequency compared to profile/history)
 * - Learning plateaus (drop in study hours or DSA practice)
 * 
 * Returns an array of anomaly objects:
 * { id, title, description, severity, recommendedAction, detectedAt, status }
 */

export function detectAnomalies(userData = {}, records = {}) {
  const anomalies = [];
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const healthRecords = records.health || [];
  const financeRecords = records.finance || [];
  const careerRecords = records.career || [];

  const hProfile = userData.health || {};
  const fProfile = userData.finance || {};
  const cProfile = userData.career || {};

  // Helper to parse dates
  const parseDate = (r) => {
    return new Date(r.date || r.activityDate || r.transactionDate || r.recordDate);
  };

  // Helper to filter records within a day range
  const getRecordsInRange = (list, startDays, endDays) => {
    return list.filter(r => {
      const d = parseDate(r);
      const diffDays = (now - d) / msPerDay;
      return diffDays >= startDays && diffDays <= endDays;
    });
  };

  // ─── 1. FINANCE ANOMALIES (Spending Spikes) ───────────────────────────────
  if (financeRecords.length > 0) {
    const debits = financeRecords.filter(r => {
      const type = (r.transactionType || r.type || '').toLowerCase();
      return type === 'debit' || type === 'expense';
    });

    if (debits.length > 0) {
      // Calculate historical average of transactions (older than 7 days)
      const historicalDebits = getRecordsInRange(debits, 7, 60);
      const baselineDebits = historicalDebits.length > 0 ? historicalDebits : debits;
      
      const sum = baselineDebits.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
      const averageAmount = sum / baselineDebits.length;

      // Check transactions in the last 7 days for spikes
      const recentDebits = getRecordsInRange(debits, 0, 7);
      
      for (const r of recentDebits) {
        const amount = parseFloat(r.amount || 0);
        // Flag if amount is > 3x the average transaction size AND > ₹2,500
        if (amount > averageAmount * 3 && amount > 2500) {
          const ratio = (amount / averageAmount).toFixed(1);
          const merchantName = r.merchant || r.description || 'unspecified category';
          anomalies.push({
            id: `finance-spike-${r.id || parseDate(r).getTime()}-${amount}`,
            title: 'Spending Spike Detected',
            description: `An unusually large expense of ₹${amount.toLocaleString()} was recorded at "${merchantName}" on ${parseDate(r).toLocaleDateString()}. This is ${ratio}x your typical transaction size.`,
            severity: amount > 10000 ? 'critical' : 'high',
            recommendedAction: 'Review this transaction in your Finance tab. Check if this was a planned major expense or an impulse spending decision that impacts your monthly budget.',
            detectedAt: parseDate(r).toISOString(),
            status: 'active',
          });
        }
      }

      // Check for sudden daily spending surge in last 3 days
      const last3DaysDebits = getRecordsInRange(debits, 0, 3);
      const prev30DaysDebits = getRecordsInRange(debits, 3, 33);
      
      if (last3DaysDebits.length > 0 && prev30DaysDebits.length > 0) {
        const dailyAvgPrev30 = prev30DaysDebits.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0) / 30;
        const dailyAvgLast3 = last3DaysDebits.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0) / 3;

        if (dailyAvgLast3 > dailyAvgPrev30 * 2.5 && dailyAvgLast3 > 1500) {
          const surgeRatio = (dailyAvgLast3 / Math.max(1, dailyAvgPrev30)).toFixed(1);
          anomalies.push({
            id: `finance-surge-${now.toDateString()}`,
            title: 'Daily Spending Surge',
            description: `Your average daily spending over the last 3 days (₹${Math.round(dailyAvgLast3).toLocaleString()}/day) is ${surgeRatio}x higher than your 30-day average baseline.`,
            severity: dailyAvgLast3 > 5000 ? 'critical' : 'high',
            recommendedAction: 'Your spending velocity is high. Consider pausing discretionary purchases for the next 48 hours to recalibrate your budget.',
            detectedAt: now.toISOString(),
            status: 'active',
          });
        }
      }
    }
  }

  // ─── 2. HEALTH ANOMALIES (Missed Workouts) ─────────────────────────────────
  const targetWorkouts = parseInt(hProfile.workoutsPerWeek || hProfile.targetWorkouts || 3);
  
  if (targetWorkouts >= 2) {
    const recentHealthLogs = getRecordsInRange(healthRecords, 0, 7);
    const recentWorkoutsCount = recentHealthLogs.filter(r => 
      parseFloat(r.workoutMinutes || r.workout || 0) > 0 || 
      (r.workoutMinutes != null && r.workoutMinutes > 0)
    ).length;

    if (recentWorkoutsCount === 0) {
      const pastWorkouts = healthRecords
        .filter(r => parseFloat(r.workoutMinutes || r.workout || 0) > 0)
        .sort((a, b) => parseDate(b) - parseDate(a));
      
      const lastWorkoutDate = pastWorkouts.length > 0 ? parseDate(pastWorkouts[0]) : null;
      let timeAgoText = 'in over a week';
      if (lastWorkoutDate) {
        const diffDays = Math.round((now - lastWorkoutDate) / msPerDay);
        timeAgoText = `${diffDays} days ago`;
      }

      anomalies.push({
        id: `health-missed-workouts-${now.toDateString()}`,
        title: 'Exercise Routine Interrupted',
        description: `You have not logged any workouts in the last 7 days. Your baseline target is ${targetWorkouts} workouts/week, and your last active session was ${timeAgoText}.`,
        severity: 'high',
        recommendedAction: 'Physical inactivity stalls metabolic growth and increases fatigue. Dedicate just 15–20 minutes today to a brisk walk or light stretching.',
        detectedAt: now.toISOString(),
        status: 'active',
      });
    }
  }

  // ─── 3. CAREER ANOMALIES (Learning Plateaus) ───────────────────────────────
  const targetStudyHours = parseFloat(cProfile.studyHoursDaily || 2);

  if (targetStudyHours >= 1) {
    const recentCareerLogs = getRecordsInRange(careerRecords, 0, 7);
    const totalStudyHoursRecent = recentCareerLogs.reduce((acc, r) => 
      acc + parseFloat(r.studyHours || r.studyHoursDaily || 0), 0
    );

    const weeklyTarget = targetStudyHours * 7;
    const studyRatio = totalStudyHoursRecent / weeklyTarget;

    if (studyRatio < 0.2) {
      const pastStudy = careerRecords
        .filter(r => parseFloat(r.studyHours || r.studyHoursDaily || 0) > 0)
        .sort((a, b) => parseDate(b) - parseDate(a));
        
      const lastStudyDate = pastStudy.length > 0 ? parseDate(pastStudy[0]) : null;
      let timeAgoText = 'for over a week';
      if (lastStudyDate) {
        const diffDays = Math.round((now - lastStudyDate) / msPerDay);
        timeAgoText = `${diffDays} days ago`;
      }

      anomalies.push({
        id: `career-learning-plateau-${now.toDateString()}`,
        title: 'Learning Plateau Detected',
        description: `Your study engagement in the last 7 days was only ${Math.round(totalStudyHoursRecent * 10) / 10}h (target: ${weeklyTarget}h/week). Your last learning activity was ${timeAgoText}.`,
        severity: 'high',
        recommendedAction: 'Consistency is critical for long-term memory retention. Open your current learning path and log a brief 15-minute review session today.',
        detectedAt: now.toISOString(),
        status: 'active',
      });
    }
  }

  return anomalies;
}
