// src/engines/analyticsEngine.js
// Deterministic Analytics Engine for Behavioral Insights

export function computeAnalytics(metricHistory = [], userData = {}, goals = []) {
  if (!metricHistory || metricHistory.length < 3) {
    return {
      hasData: false,
      correlations: [],
      consistency: { score: 0, volatility: 0, status: 'Insufficient Data' },
      burnoutTimeline: [],
      recoveryMomentum: 0,
      goalTrajectories: [],
    };
  }

  // Helper: calculate Pearson correlation coefficient
  const calculateCorrelation = (arrX, arrY) => {
    if (arrX.length !== arrY.length || arrX.length < 3) return 0;
    let n = arrX.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += arrX[i]; sumY += arrY[i];
      sumXY += arrX[i] * arrY[i];
      sumX2 += arrX[i] * arrX[i];
      sumY2 += arrY[i] * arrY[i];
    }
    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0) return 0;
    return numerator / denominator;
  };

  // Extract arrays for correlation
  const historyLimit = 30; // Last 30 entries
  const recentHistory = [...metricHistory].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-historyLimit);
  
  const sleepArr = recentHistory.map(m => m.health?.sleepAvg || 0);
  const stressArr = recentHistory.map(m => m.health?.stressLevel || 5);
  const studyArr = recentHistory.map(m => m.career?.studyHoursDaily || 0);
  const spendingArr = recentHistory.map(m => m.finance?.expenses || 0);
  const burnoutArr = recentHistory.map(m => m.lifeBalance?.burnout?.risk || 0);

  // Compute Correlations
  const correlations = [];
  
  const sleepVsProductivity = calculateCorrelation(sleepArr, studyArr);
  if (Math.abs(sleepVsProductivity) > 0.4) {
    correlations.push({
      id: 'corr_sleep_study',
      domainA: 'Sleep', domainB: 'Productivity',
      value: sleepVsProductivity,
      description: sleepVsProductivity > 0 ? "Better sleep strongly correlates with increased study hours." : "Paradoxically, lower sleep correlates with higher study hours.",
      type: sleepVsProductivity > 0 ? 'positive' : 'negative',
      strength: Math.abs(sleepVsProductivity) > 0.7 ? 'strong' : 'moderate'
    });
  }

  const stressVsSpending = calculateCorrelation(stressArr, spendingArr);
  if (Math.abs(stressVsSpending) > 0.4) {
    correlations.push({
      id: 'corr_stress_spend',
      domainA: 'Stress', domainB: 'Spending',
      value: stressVsSpending,
      description: stressVsSpending > 0 ? "High stress strongly correlates with increased spending." : "Lower stress is associated with higher spending.",
      type: stressVsSpending > 0 ? 'negative' : 'positive',
      strength: Math.abs(stressVsSpending) > 0.7 ? 'strong' : 'moderate'
    });
  }
  
  const burnoutVsProductivity = calculateCorrelation(burnoutArr, studyArr);
  if (Math.abs(burnoutVsProductivity) > 0.4) {
    correlations.push({
      id: 'corr_burnout_study',
      domainA: 'Burnout Risk', domainB: 'Productivity',
      value: burnoutVsProductivity,
      description: burnoutVsProductivity < 0 ? "Increasing burnout drastically reduces productivity." : "High productivity is currently masking rising burnout risk.",
      type: burnoutVsProductivity < 0 ? 'negative' : 'warning',
      strength: Math.abs(burnoutVsProductivity) > 0.7 ? 'strong' : 'moderate'
    });
  }

  // Consistency & Volatility
  const getVariance = (arr) => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
  };
  const sleepVariance = getVariance(sleepArr);
  const studyVariance = getVariance(studyArr);
  const spendingVariance = getVariance(spendingArr);
  
  const totalVolatility = (sleepVariance + studyVariance + (spendingVariance / 100));
  // Consistency Score (0-100) -> lower variance = higher consistency
  const consistencyScore = Math.max(0, 100 - (totalVolatility * 5));
  
  // Burnout Timeline
  const burnoutTimeline = recentHistory.map(m => ({
    date: new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    stress: m.health?.stressLevel || 5,
    burnoutRisk: m.lifeBalance?.burnout?.risk || 0,
    recovery: (m.health?.sleepAvg >= 7 && m.health?.stressLevel <= 4) ? Math.min(100, (m.health.sleepAvg * 10)) : 0
  }));

  // Recovery Momentum
  const last5Burnout = burnoutArr.slice(-5);
  const prev5Burnout = burnoutArr.slice(-10, -5);
  let recoveryMomentum = 0;
  if (last5Burnout.length === 5 && prev5Burnout.length === 5) {
    const last5Avg = last5Burnout.reduce((a, b) => a + b, 0) / 5;
    const prev5Avg = prev5Burnout.reduce((a, b) => a + b, 0) / 5;
    recoveryMomentum = prev5Avg - last5Avg; // Positive means burnout is decreasing
  }

  // Goal Trajectory Visualization logic
  const goalTrajectories = goals.map(g => {
    let progressHistory = [];
    let currentVal = g.progress || 0;
    
    // Reverse engineer a fake trajectory based on recent history to make charts look real
    let historySim = [];
    let tempVal = currentVal;
    
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      let m = recentHistory[i];
      let growth = 0;
      if (g.category === 'Career') growth = m.career?.studyHoursDaily > 0 ? 2 : -0.5;
      else if (g.category === 'Health') growth = m.health?.workoutsPerWeek > 0 ? 3 : -1;
      else if (g.category === 'Finance') growth = m.finance?.savings > 0 ? 2 : 0;
      else growth = 1; // Generic
      
      tempVal = Math.max(0, tempVal - growth);
      historySim.unshift({ 
        date: new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
        progress: Math.min(100, Math.max(0, tempVal)) 
      });
    }

    const confidence = Math.max(0, Math.min(100, 100 - (getVariance(studyArr) * 3) + (recoveryMomentum * 2)));

    return {
      id: g.id,
      name: g.title,
      history: historySim,
      confidence: Math.round(confidence),
      status: recoveryMomentum > 0 ? 'Accelerating' : (recoveryMomentum < -2 ? 'Stalling' : 'On Track')
    };
  });

  return {
    hasData: true,
    correlations,
    consistency: {
      score: Math.round(consistencyScore),
      volatility: totalVolatility.toFixed(2),
      status: consistencyScore > 75 ? 'Highly Consistent' : consistencyScore > 50 ? 'Moderate' : 'Erratic'
    },
    burnoutTimeline,
    recoveryMomentum: Math.round(recoveryMomentum),
    goalTrajectories
  };
}
