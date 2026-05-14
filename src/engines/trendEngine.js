/**
 * Trend Intelligence Engine
 *
 * Deterministically analyzes metricHistory to detect behavioral trends,
 * momentum, volatility, recovery patterns, and forecast trajectories.
 *
 * All calculations are pure math — no randomness, no LLM inference.
 * Safe against NaN, division by zero, sparse data, and missing fields.
 */

// ── Safe Math Helpers ────────────────────────────────────────────────────────

function safe(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function mean(arr) {
  const valid = arr.map(safe).filter(v => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function stdDev(arr) {
  const m = mean(arr);
  if (m === null || arr.length < 2) return null;
  const valid = arr.map(safe).filter(v => v !== null);
  const variance = valid.reduce((acc, v) => acc + (v - m) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

/**
 * Compute linear regression slope over an array of values.
 * Returns slope per step (positive = rising, negative = falling).
 */
function slope(arr) {
  const valid = arr.map(safe).filter(v => v !== null);
  const n = valid.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += valid[i];
    sumXY += i * valid[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Volatility: coefficient of variation (stdDev / |mean|).
 * Higher = more erratic.
 */
function volatility(arr) {
  const m = mean(arr);
  const sd = stdDev(arr);
  if (m === null || sd === null || m === 0) return null;
  return (sd / Math.abs(m)) * 100; // percent
}

/**
 * Momentum: difference between mean of last half vs first half of window.
 * Positive = accelerating, Negative = decelerating.
 */
function momentum(arr) {
  const valid = arr.map(safe).filter(v => v !== null);
  if (valid.length < 4) return null;
  const half = Math.floor(valid.length / 2);
  const early = mean(valid.slice(0, half));
  const recent = mean(valid.slice(half));
  if (early === null || recent === null) return null;
  return recent - early;
}

/**
 * Acceleration: slope of the last 3 items minus slope of the full window.
 * Positive acceleration = trend is speeding up.
 */
function acceleration(arr) {
  const valid = arr.map(safe).filter(v => v !== null);
  if (valid.length < 4) return null;
  const fullSlope = slope(valid);
  const recentSlope = slope(valid.slice(-3));
  if (fullSlope === null || recentSlope === null) return null;
  return recentSlope - fullSlope;
}

// ── Extract metric series from metricHistory ─────────────────────────────────

function extractSeries(metricHistory, domain, field, windowSize = 10) {
  const entries = metricHistory
    .filter(h => h.domain === domain && h.newState?.[field] !== undefined)
    .slice(-windowSize)
    .map(h => safe(h.newState[field]))
    .filter(v => v !== null);
  return entries;
}

// ── Classify trend direction ──────────────────────────────────────────────────

function classifyTrend(s, volPct, mom, accel, seriesLen) {
  if (s === null || seriesLen < 2) return 'insufficient_data';
  const absSlope = Math.abs(s);

  // Very flat
  if (absSlope < 0.03) {
    if (volPct !== null && volPct > 25) return 'volatile';
    return 'stable';
  }

  // Directional trends
  if (s > 0) {
    if (accel !== null && accel > 0.2) return 'accelerating_improvement';
    if (mom !== null && mom > 0.5) return 'improving';
    return 'improving';
  } else {
    if (accel !== null && accel < -0.2) return 'accelerating_decline';
    if (mom !== null && mom < -0.5) return 'declining';
    return 'declining';
  }
}

// ── Human-readable description ────────────────────────────────────────────────

const TREND_META = {
  improving:                { label: 'Improving',              icon: '⬆', color: 'emerald', severity: 'positive' },
  declining:                { label: 'Declining',              icon: '⬇', color: 'rose',    severity: 'warning'  },
  stable:                   { label: 'Stable',                 icon: '➡', color: 'slate',   severity: 'watch'    },
  volatile:                 { label: 'Volatile',               icon: '↕', color: 'amber',   severity: 'attention'},
  recovering:               { label: 'Recovering',             icon: '🔄', color: 'emerald', severity: 'positive' },
  plateau:                  { label: 'Plateau',                icon: '⊟', color: 'blue',    severity: 'watch'    },
  accelerating_decline:     { label: 'Rapid Decline ⚠',        icon: '⬇⬇', color: 'red',   severity: 'alert'    },
  accelerating_improvement: { label: 'Rapid Improvement',      icon: '⬆⬆', color: 'emerald',severity: 'positive' },
  burnout_escalation:       { label: 'Burnout Escalation',     icon: '🔥', color: 'red',    severity: 'urgent'   },
  burnout_recovery:         { label: 'Burnout Recovering',     icon: '🌱', color: 'emerald', severity: 'positive' },
  insufficient_data:        { label: 'Monitoring',             icon: '👁', color: 'slate',   severity: 'watch'    },
};

function formatTrendSummary(metric, trend, s, volPct, seriesLen, windowLabel) {
  const meta = TREND_META[trend] || TREND_META.stable;
  const slopeStr = s !== null ? ` (slope: ${s > 0 ? '+' : ''}${s.toFixed(2)}/log)` : '';
  const volStr = volPct !== null ? `, volatility: ${Math.round(volPct)}%` : '';
  const base = `${metric} ${meta.label.toLowerCase()}${slopeStr}${volStr} over ${windowLabel}.`;

  if (trend === 'insufficient_data') {
    return `Too few ${metric} entries to detect a reliable trend (${seriesLen} logs so far). Keep logging for better insights.`;
  }
  return base;
}

// ── Main Engine Entry Point ───────────────────────────────────────────────────

/**
 * Analyze metricHistory and produce a structured trend intelligence report.
 *
 * @param {Array} metricHistory - from DataContext state
 * @param {Object} currentState - { health, finance, career }
 * @returns {Object} trendReport
 */
export function analyzeTrends(metricHistory = [], currentState = {}) {
  if (!Array.isArray(metricHistory) || metricHistory.length === 0) {
    return {
      hasTrends: false,
      sparseData: true,
      trends: [],
      burnoutTrend: null,
      forecastSummary: [],
      domainSummary: {}
    };
  }

  const trends = [];

  // ── Helper ──────────────────────────────────────────────────────────────────
  function analyzeSingleMetric({ domain, field, label, windowSize, higherIsBetter }) {
    const series = extractSeries(metricHistory, domain, field, windowSize);
    if (series.length < 2) return null;

    const s = slope(series);
    const vol = volatility(series);
    const mom = momentum(series);
    const accel = acceleration(series);
    const avg = mean(series);
    const latest = series[series.length - 1];
    const earliest = series[0];

    let trendType = classifyTrend(s, vol, mom, accel, series.length);

    // Invert decline/improvement for metrics where lower is better (stress, expenses)
    if (!higherIsBetter && trendType === 'improving') trendType = 'declining';
    if (!higherIsBetter && trendType === 'declining') trendType = 'improving';
    if (!higherIsBetter && trendType === 'accelerating_improvement') trendType = 'accelerating_decline';
    if (!higherIsBetter && trendType === 'accelerating_decline') trendType = 'accelerating_improvement';

    // Special plateau detection: stable + long window + no momentum
    if (trendType === 'stable' && series.length >= 5 && Math.abs(mom || 0) < 0.1) {
      trendType = 'plateau';
    }

    const windowLabel = series.length <= 3 ? 'recent 3 logs' : series.length <= 7 ? 'last 7 logs' : 'last 10 logs';
    const meta = TREND_META[trendType] || TREND_META.stable;
    const confidence = Math.min(95, Math.round(50 + series.length * 5));

    return {
      id: `${domain}_${field}`,
      domain,
      field,
      label,
      trendType,
      slope: s !== null ? parseFloat(s.toFixed(3)) : null,
      volatilityPct: vol !== null ? parseFloat(vol.toFixed(1)) : null,
      momentum: mom !== null ? parseFloat(mom.toFixed(2)) : null,
      acceleration: accel !== null ? parseFloat(accel.toFixed(3)) : null,
      avg: avg !== null ? parseFloat(avg.toFixed(2)) : null,
      latest,
      earliest,
      seriesLen: series.length,
      windowLabel,
      confidence,
      ...meta,
      summary: formatTrendSummary(label, trendType, s, vol, series.length, windowLabel),
    };
  }

  // ── Health Metrics ──────────────────────────────────────────────────────────
  const healthMetrics = [
    { domain: 'health', field: 'sleepAvg',       label: 'Sleep',        windowSize: 10, higherIsBetter: true  },
    { domain: 'health', field: 'stressLevel',     label: 'Stress',       windowSize: 10, higherIsBetter: false },
    { domain: 'health', field: 'workoutsPerWeek', label: 'Workouts',     windowSize: 10, higherIsBetter: true  },
    { domain: 'health', field: 'waterIntake',     label: 'Hydration',    windowSize: 10, higherIsBetter: true  },
  ];

  // ── Finance Metrics ─────────────────────────────────────────────────────────
  const financeMetrics = [
    { domain: 'finance', field: 'expenses', label: 'Spending',  windowSize: 10, higherIsBetter: false },
    { domain: 'finance', field: 'savings',  label: 'Savings',   windowSize: 10, higherIsBetter: true  },
  ];

  // ── Career Metrics ──────────────────────────────────────────────────────────
  const careerMetrics = [
    { domain: 'career', field: 'studyHoursDaily',  label: 'Study Hours',    windowSize: 10, higherIsBetter: true },
    { domain: 'career', field: 'dsaPractice',      label: 'DSA Practice',   windowSize: 10, higherIsBetter: true },
    { domain: 'career', field: 'codingHoursDaily', label: 'Coding Hours',   windowSize: 10, higherIsBetter: true },
  ];

  [...healthMetrics, ...financeMetrics, ...careerMetrics].forEach(m => {
    const result = analyzeSingleMetric(m);
    if (result) trends.push(result);
  });

  // ── Burnout Cross-Domain Trend ───────────────────────────────────────────────
  const stressTrend = trends.find(t => t.field === 'stressLevel');
  const sleepTrend  = trends.find(t => t.field === 'sleepAvg');

  let burnoutTrend = null;
  if (stressTrend && sleepTrend) {
    const stressRising  = ['declining', 'accelerating_decline'].includes(stressTrend.trendType); // lower stress is better → declining means rising stress
    const sleepFalling  = ['declining', 'accelerating_decline'].includes(sleepTrend.trendType);
    const stressFalling = ['improving', 'accelerating_improvement'].includes(stressTrend.trendType);
    const sleepRising   = ['improving', 'accelerating_improvement'].includes(sleepTrend.trendType);

    if (stressRising && sleepFalling) {
      burnoutTrend = {
        ...TREND_META.burnout_escalation,
        trendType: 'burnout_escalation',
        id: 'cross_burnout',
        domain: 'cross-domain',
        label: 'Burnout Trajectory',
        confidence: Math.min(stressTrend.confidence, sleepTrend.confidence),
        summary: `Stress is trending upward while sleep is declining across your last ${stressTrend.seriesLen} logs — a compounding burnout risk pattern.`,
        recommendation: 'Break this loop now: prioritize sleep over study hours for 3–4 days to reset recovery capacity.',
      };
    } else if (stressFalling && sleepRising) {
      burnoutTrend = {
        ...TREND_META.burnout_recovery,
        trendType: 'burnout_recovery',
        id: 'cross_burnout',
        domain: 'cross-domain',
        label: 'Burnout Recovery',
        confidence: Math.min(stressTrend.confidence, sleepTrend.confidence),
        summary: `Stress is easing and sleep is improving across your last ${stressTrend.seriesLen} logs. Your recovery trajectory looks healthy.`,
        recommendation: 'Maintain this momentum. Avoid introducing new high-pressure habits right now.',
      };
    }
  }

  // ── Forecast Summary (human-readable top-level insights) ────────────────────
  const forecastSummary = [];

  const urgentTrends = trends.filter(t => ['accelerating_decline', 'burnout_escalation'].includes(t.trendType));
  const recoveringTrends = trends.filter(t => ['improving', 'accelerating_improvement', 'recovering'].includes(t.trendType));
  const plateaus = trends.filter(t => t.trendType === 'plateau');
  const volatiles = trends.filter(t => t.trendType === 'volatile');

  if (burnoutTrend?.trendType === 'burnout_escalation') {
    forecastSummary.push({ severity: 'urgent', text: burnoutTrend.summary });
  }
  urgentTrends.forEach(t => {
    forecastSummary.push({ severity: 'alert', text: `${t.label} is in rapid ${t.higherIsBetter === false ? 'increase' : 'decline'} over ${t.windowLabel}.` });
  });
  volatiles.forEach(t => {
    forecastSummary.push({ severity: 'attention', text: `${t.label} volatility is at ${Math.round(t.volatilityPct || 0)}% — inconsistent patterns detected.` });
  });
  plateaus.forEach(t => {
    forecastSummary.push({ severity: 'watch', text: `${t.label} has plateaued. Consider changing your approach or setting a new target.` });
  });
  if (burnoutTrend?.trendType === 'burnout_recovery') {
    forecastSummary.push({ severity: 'positive', text: burnoutTrend.summary });
  }
  recoveringTrends.slice(0, 2).forEach(t => {
    forecastSummary.push({ severity: 'positive', text: `${t.label} is improving steadily over ${t.windowLabel}.` });
  });

  // ── Domain Summary (used by Dashboard mini-badges) ──────────────────────────
  const domainSummary = {};
  ['health', 'finance', 'career'].forEach(d => {
    const domainTrends = trends.filter(t => t.domain === d);
    if (domainTrends.length === 0) {
      domainSummary[d] = { trendType: 'insufficient_data', icon: '👁', label: 'Monitoring', color: 'slate' };
      return;
    }
    // Priority: accelerating_decline > volatile > declining > plateau > stable > improving > accelerating_improvement
    const priority = ['accelerating_decline','volatile','declining','burnout_escalation','plateau','stable','recovering','improving','accelerating_improvement','insufficient_data'];
    const worst = domainTrends.sort((a, b) => priority.indexOf(a.trendType) - priority.indexOf(b.trendType))[0];
    domainSummary[d] = {
      trendType: worst.trendType,
      icon: worst.icon,
      label: worst.label,
      color: worst.color,
    };
  });

  const hasTrends = trends.length > 0;
  const sparseData = trends.every(t => t.seriesLen < 3);

  return {
    hasTrends,
    sparseData,
    trends,
    burnoutTrend,
    forecastSummary,
    domainSummary,
  };
}
