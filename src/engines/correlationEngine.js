/**
 * correlationEngine.js — Computes actual Pearson correlations from the user's
 * historical timestamped records across health, finance, and career domains.
 *
 * Unlike lifeBalanceEngine.js (hardcoded biology weights), this tells you
 * what YOUR data actually shows — personalized, not textbook.
 */

const MIN_PAIRS = 14;

function pearson(xs, ys) {
  const n = xs.length;
  if (n < MIN_PAIRS) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return null;
  return Math.round((num / denom) * 1000) / 1000;
}

export function strengthLabel(r) {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'negligible';
}

function parseDate(r) {
  return r.recordDate || r.transactionDate || r.activityDate || r.date || null;
}

function toDateKey(d) {
  if (!d) return null;
  return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildHealthByDay(records) {
  const m = {};
  for (const r of records) {
    const key = toDateKey(parseDate(r));
    if (!key) continue;
    m[key] = {
      sleep:   r.sleepHours   ?? r.sleep   ?? null,
      stress:  r.stressLevel  ?? r.stress  ?? null,
      mood:    r.moodScore    ?? r.mood    ?? null,
      workout: r.workoutMinutes != null
        ? r.workoutMinutes
        : (r.workoutsPerWeek != null ? r.workoutsPerWeek * 30 : null),
      steps:     r.steps     ?? null,
      heartRate: r.heartRate ?? null,
    };
  }
  return m;
}

function buildFinanceByDay(records) {
  const m = {};
  for (const r of records) {
    const key = toDateKey(parseDate(r));
    if (!key) continue;
    if (!m[key]) m[key] = { spending: 0, income: 0 };
    const amt = Number(r.amount) || 0;
    const type = (r.transactionType || r.type || 'debit').toLowerCase();
    const cat  = (r.category || '').toLowerCase();
    if (type === 'credit' || cat === 'income') {
      m[key].income += amt;
    } else {
      m[key].spending += amt;
    }
  }
  return m;
}

function buildCareerByDay(records) {
  const m = {};
  for (const r of records) {
    const key = toDateKey(parseDate(r));
    if (!key) continue;
    m[key] = {
      study:  r.studyHours   ?? null,
      coding: r.codingHours  ?? null,
      dsa:    r.dsaProblems  ?? null,
    };
  }
  return m;
}

// Cross-domain pairs to test. lag=1 means X[today] vs Y[tomorrow].
const PAIR_DEFS = [
  // Health → Career
  { id: 'sleep-study',     edgeId: 'sl-fo', fromDomain: 'health',  fromMetric: 'sleep',   fromLabel: 'Sleep',      toDomain: 'career',  toMetric: 'study',    toLabel: 'Study Hours',   lag: 0 },
  { id: 'sleep-study-lag', edgeId: 'sl-fo', fromDomain: 'health',  fromMetric: 'sleep',   fromLabel: 'Sleep',      toDomain: 'career',  toMetric: 'study',    toLabel: 'Study Hours',   lag: 1 },
  { id: 'stress-study',    edgeId: 'en-st', fromDomain: 'health',  fromMetric: 'stress',  fromLabel: 'Stress',     toDomain: 'career',  toMetric: 'study',    toLabel: 'Study Hours',   lag: 0 },
  { id: 'mood-coding',     edgeId: 'en-st', fromDomain: 'health',  fromMetric: 'mood',    fromLabel: 'Mood',       toDomain: 'career',  toMetric: 'coding',   toLabel: 'Coding Hours',  lag: 0 },
  { id: 'workout-coding',  edgeId: 'ex-fo', fromDomain: 'health',  fromMetric: 'workout', fromLabel: 'Workout',    toDomain: 'career',  toMetric: 'coding',   toLabel: 'Coding Hours',  lag: 1 },
  { id: 'sleep-dsa',       edgeId: 'sl-fo', fromDomain: 'health',  fromMetric: 'sleep',   fromLabel: 'Sleep',      toDomain: 'career',  toMetric: 'dsa',      toLabel: 'DSA Problems',  lag: 0 },

  // Health → Finance
  { id: 'sleep-spending',  edgeId: 'sl-sp', fromDomain: 'health',  fromMetric: 'sleep',   fromLabel: 'Sleep',      toDomain: 'finance', toMetric: 'spending', toLabel: 'Daily Spending', lag: 0 },
  { id: 'stress-spending', edgeId: 'sl-sp', fromDomain: 'health',  fromMetric: 'stress',  fromLabel: 'Stress',     toDomain: 'finance', toMetric: 'spending', toLabel: 'Daily Spending', lag: 0 },
  { id: 'mood-spending',   edgeId: 'sl-sp', fromDomain: 'health',  fromMetric: 'mood',    fromLabel: 'Mood',       toDomain: 'finance', toMetric: 'spending', toLabel: 'Daily Spending', lag: 1 },

  // Finance → Health
  { id: 'spending-sleep',  edgeId: 'de-sl', fromDomain: 'finance', fromMetric: 'spending',fromLabel: 'Spending',   toDomain: 'health',  toMetric: 'sleep',    toLabel: 'Sleep',          lag: 1 },
  { id: 'spending-stress', edgeId: 'de-sl', fromDomain: 'finance', fromMetric: 'spending',fromLabel: 'Spending',   toDomain: 'health',  toMetric: 'stress',   toLabel: 'Stress',         lag: 1 },

  // Career → Health
  { id: 'study-sleep',     edgeId: 'en-st', fromDomain: 'career',  fromMetric: 'study',   fromLabel: 'Study Hrs',  toDomain: 'health',  toMetric: 'sleep',    toLabel: 'Sleep',          lag: 0 },
  { id: 'coding-stress',   edgeId: 'en-st', fromDomain: 'career',  fromMetric: 'coding',  fromLabel: 'Coding Hrs', toDomain: 'health',  toMetric: 'stress',   toLabel: 'Stress',         lag: 0 },
];

function buildInsight(def, r) {
  const lagText = def.lag === 1 ? ' the next day' : '';
  const pct = Math.round(Math.abs(r) * 100);

  if (def.fromMetric === 'sleep' && def.toMetric === 'study') {
    return r > 0
      ? `On days you sleep more, you study ${pct}% more consistently${lagText}.`
      : `Interestingly, more sleep correlates with less study time${lagText} in your data.`;
  }
  if (def.fromMetric === 'sleep' && def.toMetric === 'dsa') {
    return r > 0
      ? `Better sleep correlates with solving ${pct}% more DSA problems${lagText}.`
      : `You solve more DSA problems on lower-sleep days — possibly compensating with intensity.`;
  }
  if (def.fromMetric === 'stress' && def.toMetric === 'study') {
    return r < 0
      ? `High-stress days cut your study hours by a meaningful margin${lagText}.`
      : `You actually study more when stressed${lagText} — possibly using work as a coping mechanism.`;
  }
  if (def.fromMetric === 'mood' && def.toMetric === 'coding') {
    return r > 0
      ? `Good mood days produce ${pct}% more coding output${lagText}.`
      : `You code more on low-mood days${lagText} — flow state as escape?`;
  }
  if (def.fromMetric === 'workout' && def.toMetric === 'coding') {
    return r > 0
      ? `Workout days lead to ${pct}% more coding productivity${lagText}.`
      : `Rest days seem to correlate with more coding time${lagText} for you.`;
  }
  if (def.fromMetric === 'sleep' && def.toMetric === 'spending') {
    return r < 0
      ? `Poor sleep days lead to ${pct}% higher spending${lagText} — consistent with impulse buying.`
      : `Better sleep correlates with more spending${lagText} — possibly reward or social spending.`;
  }
  if (def.fromMetric === 'stress' && def.toMetric === 'spending') {
    return r > 0
      ? `High-stress days see ${pct}% higher spending — comfort buying pattern detected.`
      : `You spend less when stressed — possibly avoiding social or impulse situations.`;
  }
  if (def.fromMetric === 'mood' && def.toMetric === 'spending') {
    return r > 0
      ? `Good mood days see higher spending${lagText} — possible reward or social spending.`
      : `Low mood days see higher spending${lagText} — possible emotional comfort buying.`;
  }
  if (def.fromMetric === 'spending' && def.toMetric === 'sleep') {
    return r < 0
      ? `High-spending days precede worse sleep${lagText} — financial anxiety pattern.`
      : `Higher spending is followed by slightly better sleep${lagText}.`;
  }
  if (def.fromMetric === 'spending' && def.toMetric === 'stress') {
    return r > 0
      ? `High-spending days are followed by elevated stress${lagText} — buyer's remorse pattern.`
      : `Spending does not seem to increase your stress${lagText}.`;
  }
  if (def.fromMetric === 'study' && def.toMetric === 'sleep') {
    return r < 0
      ? `Heavy study days are cutting into your sleep time.`
      : `Study hours and sleep are positively correlated — good routine consistency.`;
  }
  if (def.fromMetric === 'coding' && def.toMetric === 'stress') {
    return r > 0
      ? `Long coding days correlate with higher stress — watch for burnout.`
      : `Coding seems to reduce your stress — flow state at work.`;
  }

  const dir = r > 0 ? 'positively' : 'negatively';
  return `Your ${def.fromLabel} and ${def.toLabel} are ${dir} correlated${lagText} (r=${r.toFixed(2)}).`;
}

export function computeCorrelations(records = {}) {
  const healthByDay  = buildHealthByDay(records.health   || []);
  const financeByDay = buildFinanceByDay(records.finance || []);
  const careerByDay  = buildCareerByDay(records.career   || []);

  const domainMap = { health: healthByDay, finance: financeByDay, career: careerByDay };

  const results = [];

  for (const def of PAIR_DEFS) {
    const fromMap = domainMap[def.fromDomain];
    const toMap   = domainMap[def.toDomain];

    const xs = [], ys = [];
    for (const date of Object.keys(fromMap).sort()) {
      const fromRow    = fromMap[date];
      const lookupKey  = def.lag === 0 ? date : nextDay(date);
      const toRow      = toMap[lookupKey];
      if (!toRow) continue;

      const x = fromRow[def.fromMetric];
      const y = toRow[def.toMetric];
      if (x == null || y == null || isNaN(Number(x)) || isNaN(Number(y))) continue;
      xs.push(Number(x));
      ys.push(Number(y));
    }

    const r = pearson(xs, ys);
    if (r === null || Math.abs(r) < 0.15) continue;

    results.push({
      id:         def.id,
      edgeId:     def.edgeId,
      fromDomain: def.fromDomain,
      fromMetric: def.fromMetric,
      fromLabel:  def.fromLabel,
      toDomain:   def.toDomain,
      toMetric:   def.toMetric,
      toLabel:    def.toLabel,
      lag:        def.lag,
      r,
      n:          xs.length,
      direction:  r > 0 ? 'positive' : 'negative',
      strength:   strengthLabel(r),
      insight:    buildInsight(def, r),
    });
  }

  // Keep only strongest result per edgeId (avoid duplicates from lag variants)
  const bestByEdge = {};
  for (const c of results) {
    if (!bestByEdge[c.edgeId] || Math.abs(c.r) > Math.abs(bestByEdge[c.edgeId].r)) {
      bestByEdge[c.edgeId] = c;
    }
  }

  // Also keep non-edge results sorted by strength
  const byEdge = Object.values(bestByEdge);
  byEdge.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return byEdge;
}
