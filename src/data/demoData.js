// Demo users with realistic cross-domain data
export const demoUsers = {
  stressed_student: {
    id: 'demo-1', name: 'Arjun Mehta', email: 'arjun@demo.com', password: 'demo123',
    avatar: '🧑‍💻', role: 'user', persona: 'Stressed Student',
    health: { sleepAvg: 5.2, stressLevel: 8, moodAvg: 4, workoutsPerWeek: 1, waterIntake: 4, calories: 2800, bmi: 24.5 },
    finance: { income: 15000, expenses: 13500, savings: 8000, investments: 0, subscriptions: 3200, debt: 0 },
    career: { studyHoursDaily: 6, codingHoursDaily: 4, dsaPractice: 2, coursesActive: 3, projectsCompleted: 2, skills: ['JavaScript','Python','React'], gpa: 7.8 },
    goals: [
      { id: 'g1', title: 'Crack FAANG Internship', domain: 'career', progress: 35, deadline: '2026-08-01', milestones: ['DSA 200 problems','System Design basics','3 Projects','Mock interviews'] },
      { id: 'g2', title: 'Fix Sleep Schedule', domain: 'health', progress: 20, deadline: '2026-06-15', milestones: ['Sleep by 11pm','No screens after 10pm','Morning routine'] }
    ],
    timeline: [
      { date: '2026-05-12', type: 'health', text: 'Slept only 4 hours', sentiment: 'negative' },
      { date: '2026-05-12', type: 'career', text: 'Solved 3 LeetCode problems', sentiment: 'positive' },
      { date: '2026-05-11', type: 'finance', text: 'Ordered food delivery ₹450', sentiment: 'negative' },
      { date: '2026-05-11', type: 'health', text: 'Skipped workout', sentiment: 'negative' },
      { date: '2026-05-10', type: 'career', text: 'Completed React module', sentiment: 'positive' },
    ]
  },
  fitness_learner: {
    id: 'demo-2', name: 'Priya Sharma', email: 'priya@demo.com', password: 'demo123',
    avatar: '💪', role: 'user', persona: 'Fitness-Focused Learner',
    health: { sleepAvg: 7.5, stressLevel: 4, moodAvg: 7.5, workoutsPerWeek: 5, waterIntake: 8, calories: 2200, bmi: 22.1 },
    finance: { income: 20000, expenses: 14000, savings: 45000, investments: 15000, subscriptions: 1500, debt: 0 },
    career: { studyHoursDaily: 4, codingHoursDaily: 3, dsaPractice: 1, coursesActive: 2, projectsCompleted: 5, skills: ['Python','ML','Data Science','SQL'], gpa: 8.5 },
    goals: [
      { id: 'g3', title: 'Run Half Marathon', domain: 'health', progress: 60, deadline: '2026-09-01', milestones: ['5K done','10K done','15K run','21K race'] },
      { id: 'g4', title: 'ML Engineer Role', domain: 'career', progress: 45, deadline: '2026-12-01', milestones: ['ML foundations','Deep learning','3 ML projects','Portfolio'] }
    ],
    timeline: [
      { date: '2026-05-12', type: 'health', text: '5K morning run completed', sentiment: 'positive' },
      { date: '2026-05-12', type: 'career', text: 'Kaggle competition submission', sentiment: 'positive' },
      { date: '2026-05-11', type: 'finance', text: 'Saved ₹3000 this week', sentiment: 'positive' },
    ]
  },
  overspender: {
    id: 'demo-3', name: 'Rahul Verma', email: 'rahul@demo.com', password: 'demo123',
    avatar: '💸', role: 'user', persona: 'Overspending User',
    health: { sleepAvg: 6.5, stressLevel: 6, moodAvg: 5.5, workoutsPerWeek: 2, waterIntake: 5, calories: 2600, bmi: 26.3 },
    finance: { income: 25000, expenses: 24000, savings: 5000, investments: 0, subscriptions: 5500, debt: 12000 },
    career: { studyHoursDaily: 3, codingHoursDaily: 2, dsaPractice: 0, coursesActive: 1, projectsCompleted: 1, skills: ['HTML','CSS','JavaScript'], gpa: 7.2 },
    goals: [
      { id: 'g5', title: 'Save ₹1 Lakh', domain: 'finance', progress: 5, deadline: '2026-12-31', milestones: ['Track expenses','Cut subscriptions','₹25K saved','₹50K saved','₹1L saved'] },
      { id: 'g6', title: 'Learn Full Stack', domain: 'career', progress: 25, deadline: '2026-10-01', milestones: ['React basics','Node.js','Database','Full project'] }
    ],
    timeline: [
      { date: '2026-05-12', type: 'finance', text: 'Impulse purchase ₹2500 on gadgets', sentiment: 'negative' },
      { date: '2026-05-11', type: 'finance', text: 'Dining out ₹1200', sentiment: 'negative' },
      { date: '2026-05-11', type: 'career', text: 'Watched 2 React tutorials', sentiment: 'positive' },
    ]
  },
  burnout_risk: {
    id: 'demo-4', name: 'Sneha Reddy', email: 'sneha@demo.com', password: 'demo123',
    avatar: '🔥', role: 'user', persona: 'Burnout-Risk Student',
    health: { sleepAvg: 4.8, stressLevel: 9, moodAvg: 3.5, workoutsPerWeek: 0, waterIntake: 3, calories: 3000, bmi: 23.8 },
    finance: { income: 12000, expenses: 11000, savings: 3000, investments: 0, subscriptions: 2000, debt: 5000 },
    career: { studyHoursDaily: 10, codingHoursDaily: 8, dsaPractice: 5, coursesActive: 5, projectsCompleted: 4, skills: ['Java','C++','Python','React','Node.js','SQL','AWS'], gpa: 9.1 },
    goals: [
      { id: 'g7', title: 'Crack Google Interview', domain: 'career', progress: 55, deadline: '2026-07-15', milestones: ['400 DSA problems','System Design','OS concepts','Mock interviews','Apply'] },
    ],
    timeline: [
      { date: '2026-05-12', type: 'career', text: 'Studied 12 hours straight', sentiment: 'neutral' },
      { date: '2026-05-12', type: 'health', text: 'Headache and fatigue', sentiment: 'negative' },
      { date: '2026-05-11', type: 'health', text: 'Skipped all meals until dinner', sentiment: 'negative' },
      { date: '2026-05-11', type: 'career', text: 'Solved 8 hard DSA problems', sentiment: 'positive' },
    ]
  },
  placement_coder: {
    id: 'demo-5', name: 'Karthik Nair', email: 'karthik@demo.com', password: 'demo123',
    avatar: '🎯', role: 'user', persona: 'Placement-Focused Coder',
    health: { sleepAvg: 6.5, stressLevel: 6, moodAvg: 6, workoutsPerWeek: 3, waterIntake: 6, calories: 2400, bmi: 23.0 },
    finance: { income: 18000, expenses: 12000, savings: 30000, investments: 10000, subscriptions: 1800, debt: 0 },
    career: { studyHoursDaily: 5, codingHoursDaily: 5, dsaPractice: 3, coursesActive: 2, projectsCompleted: 6, skills: ['Java','Python','React','Spring Boot','MongoDB','Docker'], gpa: 8.2 },
    goals: [
      { id: 'g8', title: 'Get ₹15LPA+ Package', domain: 'career', progress: 50, deadline: '2026-09-01', milestones: ['300 DSA','System Design','Projects portfolio','Resume ready','Mock interviews'] },
      { id: 'g9', title: 'Build Emergency Fund', domain: 'finance', progress: 40, deadline: '2026-12-01', milestones: ['₹10K saved','₹25K saved','₹50K saved'] }
    ],
    timeline: [
      { date: '2026-05-12', type: 'career', text: 'Completed Spring Boot microservice project', sentiment: 'positive' },
      { date: '2026-05-12', type: 'health', text: '30 min gym session', sentiment: 'positive' },
      { date: '2026-05-11', type: 'career', text: 'Mock interview - 7/10 score', sentiment: 'positive' },
    ]
  }
};

// 30-day trend data generator
export function generateTrendData(user, days = 30) {
  const data = [];
  const base = { ...user.health };
  for (let i = days; i >= 0; i--) {
    const date = new Date(); date.setDate(date.getDate() - i);
    const noise = () => (Math.random() - 0.5) * 2;
    data.push({
      date: date.toISOString().split('T')[0],
      sleep: Math.max(3, Math.min(10, base.sleepAvg + noise())),
      stress: Math.max(1, Math.min(10, base.stressLevel + noise())),
      mood: Math.max(1, Math.min(10, base.moodAvg + noise())),
      productivity: Math.max(1, Math.min(10, (10 - base.stressLevel) + noise() * 1.5)),
      spending: Math.max(100, user.finance.expenses / 30 + noise() * 200),
      studyHours: Math.max(0, user.career.studyHoursDaily + noise()),
      workoutDone: Math.random() > (1 - user.health.workoutsPerWeek / 7),
      water: Math.max(1, Math.min(12, base.waterIntake + noise())),
    });
  }
  return data;
}

// Score calculators
export function calcHealthScore(h) {
  const sleep = Math.min(100, (h.sleepAvg / 8) * 100);
  const stress = Math.max(0, (10 - h.stressLevel) / 10 * 100);
  const mood = (h.moodAvg / 10) * 100;
  const workout = Math.min(100, (h.workoutsPerWeek / 5) * 100);
  const water = Math.min(100, (h.waterIntake / 8) * 100);
  return Math.round((sleep * 0.25 + stress * 0.25 + mood * 0.2 + workout * 0.15 + water * 0.15));
}

export function calcFinanceScore(f) {
  const savingsRate = Math.min(100, ((f.income - f.expenses) / f.income) * 100 * 3);
  const debtRatio = Math.max(0, 100 - (f.debt / Math.max(1, f.income)) * 100);
  const investRate = Math.min(100, (f.investments / Math.max(1, f.income)) * 200);
  const subRatio = Math.max(0, 100 - (f.subscriptions / Math.max(1, f.income)) * 300);
  return Math.round(Math.max(0, Math.min(100, savingsRate * 0.35 + debtRatio * 0.25 + investRate * 0.2 + subRatio * 0.2)));
}

export function calcCareerScore(c) {
  const study = Math.min(100, (c.studyHoursDaily / 6) * 100);
  const coding = Math.min(100, (c.codingHoursDaily / 5) * 100);
  const projects = Math.min(100, (c.projectsCompleted / 5) * 100);
  const skills = Math.min(100, (c.skills.length / 6) * 100);
  const dsa = Math.min(100, (c.dsaPractice / 3) * 100);
  return Math.round(study * 0.2 + coding * 0.2 + projects * 0.2 + skills * 0.2 + dsa * 0.2);
}

export function calcLifeBalance(h, f, c) {
  const hs = calcHealthScore(h);
  const fs = calcFinanceScore(f);
  const cs = calcCareerScore(c);
  const burnoutPenalty = h.stressLevel > 7 ? 15 : h.stressLevel > 5 ? 8 : 0;
  const sleepPenalty = h.sleepAvg < 6 ? 10 : 0;
  return Math.round(Math.max(0, Math.min(100, (hs * 0.35 + fs * 0.3 + cs * 0.35) - burnoutPenalty - sleepPenalty)));
}

export function calcBurnoutRisk(h, c) {
  let risk = 0;
  if (h.sleepAvg < 5) risk += 25; else if (h.sleepAvg < 6) risk += 15;
  if (h.stressLevel > 8) risk += 25; else if (h.stressLevel > 6) risk += 15;
  if (c.studyHoursDaily + c.codingHoursDaily > 12) risk += 20; else if (c.studyHoursDaily + c.codingHoursDaily > 8) risk += 10;
  if (h.workoutsPerWeek < 1) risk += 10;
  if (h.moodAvg < 4) risk += 10;
  if (h.waterIntake < 4) risk += 5;
  return Math.min(100, risk);
}

// Generate AI insights based on cross-domain data
export function generateInsights(user) {
  const insights = [];
  const { health: h, finance: f, career: c } = user;

  if (h.sleepAvg < 6 && c.studyHoursDaily > 6) {
    insights.push({ type: 'warning', icon: '⚠️', title: 'Sleep-Productivity Link', text: `Your ${h.sleepAvg}hr average sleep is likely reducing study efficiency by ~30%. Sleeping 7+ hours could achieve more in fewer study hours.`, domains: ['health','career'], confidence: 87 });
  }
  if (h.stressLevel > 7 && f.expenses / f.income > 0.8) {
    insights.push({ type: 'alert', icon: '🔴', title: 'Stress-Spending Correlation', text: `High stress (${h.stressLevel}/10) correlates with emotional spending. Your expense ratio is ${Math.round(f.expenses/f.income*100)}% of income.`, domains: ['health','finance'], confidence: 82 });
  }
  if (h.workoutsPerWeek >= 4) {
    insights.push({ type: 'positive', icon: '✅', title: 'Exercise Boosting Focus', text: `Your ${h.workoutsPerWeek} workouts/week are likely improving concentration and coding productivity by ~20%.`, domains: ['health','career'], confidence: 79 });
  }
  if (h.stressLevel > 7 && h.sleepAvg < 5.5) {
    insights.push({ type: 'critical', icon: '🚨', title: 'Burnout Warning', text: `Critical: High stress + sleep deprivation pattern detected. This path leads to burnout within 2-3 weeks without intervention.`, domains: ['health'], confidence: 91 });
  }
  if (c.studyHoursDaily + c.codingHoursDaily > 10 && h.workoutsPerWeek < 2) {
    insights.push({ type: 'warning', icon: '💡', title: 'Sedentary Risk', text: `${c.studyHoursDaily + c.codingHoursDaily} hours of desk work with minimal exercise increases fatigue and reduces long-term productivity.`, domains: ['health','career'], confidence: 85 });
  }
  if (f.subscriptions > f.income * 0.15) {
    insights.push({ type: 'warning', icon: '💳', title: 'Subscription Overload', text: `Subscriptions (₹${f.subscriptions}) are ${Math.round(f.subscriptions/f.income*100)}% of income. Review and cut unused subscriptions.`, domains: ['finance'], confidence: 90 });
  }
  if (h.moodAvg < 4 && h.stressLevel > 7) {
    insights.push({ type: 'alert', icon: '💔', title: 'Emotional Wellness Alert', text: `Low mood (${h.moodAvg}/10) combined with high stress suggests emotional exhaustion. Consider taking a recovery day.`, domains: ['health'], confidence: 88 });
  }
  if (c.projectsCompleted >= 4 && c.skills.length >= 5) {
    insights.push({ type: 'positive', icon: '🚀', title: 'Strong Portfolio', text: `${c.projectsCompleted} projects + ${c.skills.length} skills put you in a strong position. Focus on depth over breadth now.`, domains: ['career'], confidence: 84 });
  }
  if (h.waterIntake < 5) {
    insights.push({ type: 'info', icon: '💧', title: 'Hydration Impact', text: `Low water intake (${h.waterIntake} glasses) reduces cognitive performance by up to 15%. Aim for 8+ glasses.`, domains: ['health','career'], confidence: 76 });
  }
  if (f.savings < f.expenses) {
    insights.push({ type: 'warning', icon: '🏦', title: 'Low Emergency Fund', text: `Savings (₹${f.savings}) is less than 1 month's expenses. Build a 3-month emergency fund for financial security.`, domains: ['finance'], confidence: 92 });
  }
  return insights;
}

// Habit correlations
export function generateCorrelations(trendData) {
  const correlations = [];
  let sleepSpendCorr = 0, workoutProdCorr = 0, stressSleepCorr = 0;
  const n = trendData.length;
  
  for (let i = 0; i < n; i++) {
    if (trendData[i].sleep < 6) sleepSpendCorr += trendData[i].spending;
    if (trendData[i].workoutDone) workoutProdCorr += trendData[i].productivity;
  }

  correlations.push(
    { pattern: 'On days with less sleep, your spending increases by ~25%', strength: 0.73, type: 'negative', domains: ['health', 'finance'] },
    { pattern: 'Your productivity improves by ~30% after workouts', strength: 0.81, type: 'positive', domains: ['health', 'career'] },
    { pattern: 'Stress spikes correlate with deadline proximity', strength: 0.68, type: 'neutral', domains: ['health', 'career'] },
    { pattern: 'Mood improves on days with 7+ hours of sleep', strength: 0.85, type: 'positive', domains: ['health'] },
    { pattern: 'Evening screen time correlates with poor sleep quality', strength: 0.72, type: 'negative', domains: ['health'] },
    { pattern: 'Study sessions after exercise are 40% more effective', strength: 0.77, type: 'positive', domains: ['health', 'career'] },
  );
  return correlations;
}

// Gamification data
export const badges = [
  { id: 'b1', name: 'Early Bird', icon: '🌅', desc: 'Slept before 11pm for 7 days', unlocked: false },
  { id: 'b2', name: 'Fitness Warrior', icon: '💪', desc: '5 workouts in a week', unlocked: false },
  { id: 'b3', name: 'Savings Streak', icon: '💰', desc: 'Stayed under budget for 30 days', unlocked: false },
  { id: 'b4', name: 'Code Machine', icon: '⚡', desc: '100 DSA problems solved', unlocked: false },
  { id: 'b5', name: 'Learning Machine', icon: '📚', desc: 'Studied 5+ hours daily for 14 days', unlocked: false },
  { id: 'b6', name: 'Zen Master', icon: '🧘', desc: 'Stress below 4 for 7 days', unlocked: false },
  { id: 'b7', name: 'Hydration Hero', icon: '💧', desc: '8+ glasses of water for 14 days', unlocked: false },
  { id: 'b8', name: 'Balance Keeper', icon: '⚖️', desc: 'Life Balance Score above 75 for 7 days', unlocked: false },
];

export const challenges = [
  { id: 'c1', title: 'Sleep Reset Challenge', duration: '7 days', desc: 'Sleep 7+ hours every night', reward: 100, icon: '🌙' },
  { id: 'c2', title: 'Zero Food Delivery Week', duration: '7 days', desc: 'No food delivery orders', reward: 150, icon: '🍳' },
  { id: 'c3', title: 'DSA Sprint', duration: '5 days', desc: 'Solve 5 problems daily', reward: 200, icon: '🧩' },
  { id: 'c4', title: 'Mindful Morning', duration: '14 days', desc: '10 min meditation + exercise', reward: 250, icon: '🧘' },
  { id: 'c5', title: 'Budget Warrior', duration: '30 days', desc: 'Track every expense daily', reward: 300, icon: '📊' },
];
