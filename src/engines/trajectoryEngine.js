/**
 * Trajectory Engine - Dynamic Life Path Projections
 * 
 * Computes 12-month projections (current vs optimized paths)
 * and generates actionable habit recommendations based on actual user profile and logs.
 */

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function getMonthLabels() {
  const labels = ['Now'];
  const today = new Date();
  const startMonth = today.getMonth();
  
  for (let i = 1; i <= 12; i++) {
    const idx = (startMonth + i) % 12;
    const label = MONTH_NAMES[idx];
    const yearSuffix = today.getFullYear() + Math.floor((startMonth + i) / 12);
    labels.push(`${label} '${String(yearSuffix).slice(-2)}`);
  }
  return labels;
}

// Helper to calculate drift for subdomains
function calculateDomainDrift(domainId, userData) {
  const h = userData.health || {};
  const f = userData.finance || {};
  const c = userData.career || {};
  
  if (domainId === 'health') {
    const sleepAvg = h.sleepAvg ?? 7;
    const stressLevel = h.stressLevel ?? 5;
    const workouts = h.workoutsPerWeek ?? 2;
    return (sleepAvg < 6 ? -0.8 : sleepAvg >= 7.5 ? 0.2 : 0) + 
           (stressLevel > 7 ? -0.6 : stressLevel <= 3 ? 0.1 : 0) + 
           (workouts < 2 ? -0.5 : workouts >= 4 ? 0.3 : 0);
  }
  if (domainId === 'finance') {
    const income = f.income ?? 0;
    const expenses = f.expenses ?? 0;
    const savings = f.savings ?? 0;
    const debt = f.debt ?? 0;
    const savingsRate = income > 0 ? (income - expenses) / income : 0;
    return (savingsRate < 0 ? -1.2 : savingsRate > 0.25 ? 0.4 : 0.1) + 
           (debt > 0 && savings < expenses ? -0.4 : 0);
  }
  if (domainId === 'career') {
    const study = c.studyHoursDaily ?? 2;
    const dsa = c.dsaPractice ?? 1;
    const skillsCount = (c.skills || []).length;
    return (study < 1 ? -1.0 : study >= 3.5 ? 0.4 : 0) + 
           (dsa < 2 ? -0.4 : dsa >= 3 ? 0.2 : 0) + 
           (skillsCount < 3 ? -0.2 : skillsCount >= 6 ? 0.1 : 0);
  }
  return -0.4;
}

/**
 * Calculates current and optimized projections for a specific domain.
 * Returns array of { month, current, optimized, i }
 */
export function calculateTrajectory(domainId, startScore, userData = {}, records = {}) {
  const monthLabels = getMonthLabels();

  // 1. Calculate current drift based on real behavioral metrics
  let drift = -0.4; // default
  
  if (domainId === 'health' || domainId === 'finance' || domainId === 'career') {
    drift = calculateDomainDrift(domainId, userData);
  } else {
    // Overall - average of the domains
    const healthDrift = calculateDomainDrift('health', userData);
    const financeDrift = calculateDomainDrift('finance', userData);
    const careerDrift = calculateDomainDrift('career', userData);
    drift = healthDrift * 0.35 + financeDrift * 0.30 + careerDrift * 0.35;
  }

  // Ensure drift doesn't exceed realistic bounds
  drift = Math.max(-2.5, Math.min(1.0, drift));

  // 2. Calculate optimized growth parameters based on gaps
  const addressableGap = 100 - startScore;
  const growthFactor = Math.max(2.0, addressableGap * 0.15);

  return monthLabels.map((month, i) => {
    // Current Path projection (with slight deterministic seasonal wave)
    const wave = Math.sin(i * 1.5 + (domainId === 'overall' ? 0 : domainId.length)) * 0.4;
    const currentRaw = startScore + drift * i + wave;
    const current = Math.max(5, Math.min(100, Math.round(currentRaw)));

    // Optimized Path projection (compounding habit adoption)
    const optimizedRaw = startScore + growthFactor * (1.0 - Math.exp(-i * 0.3)) * 10;
    const optimized = Math.max(5, Math.min(98, Math.round(Math.max(currentRaw, optimizedRaw))));

    return { month, current, optimized, i };
  });
}

/**
 * Generates high-impact action recommendations based on user scores/gaps.
 */
export function getActionCards(domainId, userData = {}, computed = {}) {
  const h = userData.health || {};
  const f = userData.finance || {};
  const c = userData.career || {};

  const actions = {
    health: [],
    finance: [],
    career: [],
  };

  // 1. Health Actions
  if ((h.sleepAvg ?? 7) < 7) {
    actions.health.push({ icon: '😴', title: 'Target 7.5h sleep schedule', impact: 'Fastest cognitive boost (+10 pts)', color: '#10b981' });
  } else {
    actions.health.push({ icon: '😴', title: 'Maintain sleep consistency', impact: 'Sustains peak brain performance', color: '#10b981' });
  }

  if ((h.workoutsPerWeek ?? 2) < 3) {
    actions.health.push({ icon: '🏃', title: 'Work out 3x a week minimum', impact: 'Reduces burnout risk by 20%', color: '#10b981' });
  } else {
    actions.health.push({ icon: '💪', title: 'Level up workout intensity', impact: 'Optimizes daily energy reserve', color: '#10b981' });
  }

  if ((h.stressLevel ?? 5) > 6) {
    actions.health.push({ icon: '🧘', title: 'Incorporate daily 10m rest', impact: 'Lowers cortisol / overspending risk', color: '#10b981' });
  } else {
    actions.health.push({ icon: '💧', title: 'Track daily hydration + steps', impact: 'Improves circulatory stamina', color: '#10b981' });
  }

  // 2. Finance Actions
  const savingsRate = f.income > 0 ? (f.income - f.expenses) / f.income : 0;
  if (savingsRate < 0.15) {
    actions.finance.push({ icon: '🪙', title: 'Trim discretionary purchases', impact: 'Boosts savings rate immediately (+6 pts)', color: '#f59e0b' });
  } else {
    actions.finance.push({ icon: '📈', title: 'Automate a weekly savings transfer', impact: 'Builds compound wealth frictionlessly', color: '#f59e0b' });
  }

  if ((f.savings ?? 0) < (f.expenses ?? 0) * 3) {
    actions.finance.push({ icon: '🛡️', title: 'Build 3-month emergency fund', impact: 'Removes background budget anxiety', color: '#f59e0b' });
  } else {
    actions.finance.push({ icon: '📊', title: 'Audit subscriptions & leaks', impact: 'Plugs minor savings outflows', color: '#f59e0b' });
  }

  if ((f.debt ?? 0) > 0) {
    actions.finance.push({ icon: '💳', title: 'Execute high-interest debt paydown', impact: 'Stops interest compounding leak', color: '#f59e0b' });
  } else {
    actions.finance.push({ icon: '🚀', title: 'Diversify index fund investments', impact: 'Maximizes long-term passive yield', color: '#f59e0b' });
  }

  // 3. Career Actions
  if ((c.studyHoursDaily ?? 2) < 2) {
    actions.career.push({ icon: '📚', title: 'Commit to 2h deep-work sprint', impact: 'Accelerates placement readiness (+8 pts)', color: '#3b82f6' });
  } else {
    actions.career.push({ icon: '🧠', title: 'Optimize study environment focus', impact: 'Minimizes distraction recovery time', color: '#3b82f6' });
  }

  if ((c.dsaPractice ?? 1) < 3) {
    actions.career.push({ icon: '🧩', title: 'Solve 2 DSA problems daily', impact: 'Closes interview technical gap (+7 pts)', color: '#3b82f6' });
  } else {
    actions.career.push({ icon: '🏆', title: 'Join weekly timed coding contests', impact: 'Simulates technical interview pressure', color: '#3b82f6' });
  }

  if ((c.skills || []).length < 5) {
    actions.career.push({ icon: '💻', title: 'Log 1 target skill (e.g. Docker)', impact: 'Closes match gap on live listings', color: '#3b82f6' });
  } else {
    actions.career.push({ icon: '🚀', title: 'Build 1 full-stack portfolio demo', impact: 'Signals shipping capacity to recruiters', color: '#3b82f6' });
  }

  if (domainId === 'overall') {
    return [
      actions.health[0],
      actions.finance[0],
      actions.career[0]
    ];
  }

  return actions[domainId] || [];
}
