/**
 * Goal Progress Engine
 *
 * Computes real-time goal progress from live health/finance/career domain data.
 * Falls back to stored manual progress when no metric can be derived.
 */

// Metric registry — maps metric key → how to read current value + human label
const METRICS = {
  // Health
  sleepAvg:        { domain: 'health',   read: h => h.sleepAvg,        label: 'Sleep avg',      unit: 'h',    higher: true  },
  workoutsPerWeek: { domain: 'health',   read: h => h.workoutsPerWeek, label: 'Workouts/week',  unit: '/wk',  higher: true  },
  stressLevel:     { domain: 'health',   read: h => h.stressLevel,     label: 'Stress level',   unit: '/10',  higher: false },
  waterIntake:     { domain: 'health',   read: h => h.waterIntake,     label: 'Water glasses',  unit: ' gl',  higher: true  },
  bmi:             { domain: 'health',   read: h => h.bmi,             label: 'BMI',            unit: '',     higher: false },
  steps:           { domain: 'health',   read: h => h.steps,           label: 'Steps/day',      unit: ' steps', higher: true },
  calories:        { domain: 'health',   read: h => h.calories,        label: 'Calories/day',   unit: ' kcal', higher: true  },
  moodAvg:         { domain: 'health',   read: h => h.moodAvg,         label: 'Mood avg',       unit: '/10',  higher: true  },
  weight:          { domain: 'health',   read: h => h.weight,          label: 'Weight',         unit: ' kg',  higher: false },
  protein:         { domain: 'health',   read: h => h.protein,         label: 'Protein/day',    unit: 'g',    higher: true  },
  carbs:           { domain: 'health',   read: h => h.carbs,           label: 'Carbs/day',      unit: 'g',    higher: true  },
  fat:             { domain: 'health',   read: h => h.fat,             label: 'Fat/day',        unit: 'g',    higher: true  },
  // Finance
  savings:         { domain: 'finance',  read: f => f.savings,         label: 'Savings',        unit: '₹',    higher: true  },
  investments:     { domain: 'finance',  read: f => f.investments,     label: 'Investments',    unit: '₹',    higher: true  },
  expenses:        { domain: 'finance',  read: f => f.expenses,        label: 'Monthly expenses', unit: '₹',  higher: false },
  income:          { domain: 'finance',  read: f => f.income,          label: 'Monthly income', unit: '₹',    higher: true  },
  // Career
  studyHoursDaily: { domain: 'career',   read: c => c.studyHoursDaily, label: 'Study hrs/day',  unit: 'h',    higher: true  },
  codingHoursDaily:{ domain: 'career',   read: c => c.codingHoursDaily,label: 'Coding hrs/day', unit: 'h',    higher: true  },
  dsaPractice:     { domain: 'career',   read: c => c.dsaPractice,     label: 'DSA problems',   unit: '/day', higher: true  },
  projectsCompleted:{ domain: 'career',  read: c => c.projectsCompleted, label: 'Projects',     unit: '',     higher: true  },
  coursesActive:   { domain: 'career',   read: c => c.coursesActive,   label: 'Active courses', unit: '',     higher: true  },
};

export const METRIC_OPTIONS = Object.entries(METRICS).map(([key, m]) => ({
  key,
  label: `${m.label} (${m.domain})`,
  domain: m.domain,
}));

// Keyword patterns → metric auto-detection from goal title
const KEYWORD_MAP = [
  { words: ['sleep','rest','insomnia'],             metric: 'sleepAvg',         defaultTarget: 7.5  },
  { words: ['workout','exercise','gym','fitness','run','jog','cardio'], metric: 'workoutsPerWeek', defaultTarget: 5 },
  { words: ['stress','anxiety','calm','meditat'],   metric: 'stressLevel',      defaultTarget: 3    },
  { words: ['water','hydrat','drink'],              metric: 'waterIntake',      defaultTarget: 8    },
  { words: ['steps','walk','10k','10,000'],         metric: 'steps',            defaultTarget: 10000},
  { words: ['calori','calorie','cal','kcal','eat','nutrition'], metric: 'calories', defaultTarget: 2000 },
  { words: ['mood','happy','happiness','feeling','positive','mental'], metric: 'moodAvg',  defaultTarget: 8   },
  { words: ['weight','kg','pound','lb','lose weight','gain weight'],  metric: 'weight',   defaultTarget: null },
  { words: ['protein'],                                               metric: 'protein',  defaultTarget: 150 },
  { words: ['carb','carbohydrate'],                                   metric: 'carbs',    defaultTarget: 250 },
  { words: ['fat','macro'],                                           metric: 'fat',      defaultTarget: 65  },
  { words: ['bmi','weight','lose','diet'],          metric: 'bmi',              defaultTarget: 22   },
  { words: ['save','saving','fund','emergency','lakh','lacs','₹'], metric: 'savings', defaultTarget: null },
  { words: ['invest','sip','portfolio','mutual'],   metric: 'investments',      defaultTarget: null },
  { words: ['expense','spending','budget','cut subscription'], metric: 'expenses', defaultTarget: null },
  { words: ['income','salary','earn','freelanc'],   metric: 'income',           defaultTarget: null },
  { words: ['study','learn','course','certif'],     metric: 'studyHoursDaily',  defaultTarget: 6    },
  { words: ['cod','program','develop'],             metric: 'codingHoursDaily', defaultTarget: 4    },
  { words: ['dsa','leetcode','algorithm','problem']  , metric: 'dsaPractice',   defaultTarget: 5    },
  { words: ['project','portfolio','build','app'],   metric: 'projectsCompleted',defaultTarget: 5    },
];

// Extract a number from a goal title (handles ₹1L, ₹50K, 7h, 5x, 10K steps, etc.)
function extractTargetFromTitle(title) {
  const t = title.toLowerCase();
  // Lakh / lacs
  const lakh = t.match(/₹?\s*([\d.]+)\s*(l\b|lakh|lac)/i);
  if (lakh) return parseFloat(lakh[1]) * 100000;
  // K suffix (thousands)
  const k = t.match(/₹?\s*([\d.]+)\s*k\b/i);
  if (k) return parseFloat(k[1]) * 1000;
  // Crore
  const cr = t.match(/₹?\s*([\d.]+)\s*(cr\b|crore)/i);
  if (cr) return parseFloat(cr[1]) * 10000000;
  // Plain rupee amount ₹XX,XXX
  const rupee = t.match(/₹\s*([\d,]+)/);
  if (rupee) return parseFloat(rupee[1].replace(/,/g, ''));
  // Hours (Xh or X hours)
  const hours = t.match(/(\d+\.?\d*)\s*h(ours?)?/i);
  if (hours) return parseFloat(hours[1]);
  // Times per week (Xx/week or X times)
  const times = t.match(/(\d+)\s*(x\/week|times?\s*(?:a\s*)?week|\/week)/i);
  if (times) return parseFloat(times[1]);
  // Plain number (as last resort)
  const plain = t.match(/\b(\d{2,})\b/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

/**
 * Main export — computes progress % for a goal using live domain data.
 * Returns { progress, auto, metric, currentValue, targetValue, label }
 */
export function computeGoalProgress(goal, health = {}, finance = {}, career = {}) {
  const title = (goal.title || '').toLowerCase();

  // 1. Use explicit metric + target if user set them
  let metricKey  = goal.targetMetric || null;
  let targetValue = goal.targetValue  ? Number(goal.targetValue) : null;

  // 2. Auto-detect metric from title keywords
  if (!metricKey) {
    for (const { words, metric, defaultTarget } of KEYWORD_MAP) {
      if (words.some(w => title.includes(w))) {
        metricKey = metric;
        if (targetValue === null) targetValue = defaultTarget;
        break;
      }
    }
  }

  // 3. Try to extract numeric target from title if still missing
  if (metricKey && targetValue === null) {
    targetValue = extractTargetFromTitle(goal.title || '');
  }

  if (!metricKey || targetValue === null) {
    return { progress: goal.progress || 0, auto: false, metric: null, currentValue: null, targetValue: null, label: null };
  }

  const def = METRICS[metricKey];
  if (!def) {
    return { progress: goal.progress || 0, auto: false, metric: null, currentValue: null, targetValue: null, label: null };
  }

  // 4. Read current value from live data
  const domainData = def.domain === 'health' ? health : def.domain === 'finance' ? finance : career;
  const currentValue = def.read(domainData);
  if (currentValue == null || isNaN(Number(currentValue))) {
    return { progress: goal.progress || 0, auto: false, metric: null, currentValue: null, targetValue, label: def.label };
  }

  const cur = Number(currentValue);
  const tgt = Number(targetValue);

  // 5. Compute progress — for "lower is better" metrics (stress, expenses, BMI) invert
  let pct;
  if (!def.higher) {
    // Goal is to REDUCE to target. Start value unknown, use 2× target as worst case.
    const worst = tgt * 2;
    pct = Math.round(((worst - cur) / (worst - tgt)) * 100);
  } else {
    pct = Math.round((cur / tgt) * 100);
  }
  pct = Math.max(0, Math.min(100, pct));

  return {
    progress: pct,
    auto: true,
    metric: metricKey,
    currentValue: cur,
    targetValue: tgt,
    label: def.label,
    unit: def.unit,
    higher: def.higher,
  };
}
