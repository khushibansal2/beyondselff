import { motion } from 'framer-motion';

const COLOR_MAP = {
  emerald: { badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-400' },
  rose:    { badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',          dot: 'bg-rose-400'    },
  red:     { badge: 'bg-red-500/10 text-red-300 border-red-500/20',             dot: 'bg-red-400'     },
  amber:   { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',       dot: 'bg-amber-400'   },
  blue:    { badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',          dot: 'bg-blue-400'    },
  slate:   { badge: 'bg-slate-500/10 text-slate-300 border-slate-500/20',       dot: 'bg-slate-400'   },
};

function getColors(color) {
  return COLOR_MAP[color] || COLOR_MAP.slate;
}

// ── Mini trend badge for Domain Score cards on Dashboard ─────────────────────
export function TrendBadge({ trendType, icon, label, color }) {
  if (!trendType || trendType === 'insufficient_data') return null;
  const { badge } = getColors(color);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
      {icon} {label}
    </span>
  );
}

// ── Trend arrow indicator (inline, very compact) ──────────────────────────────
export function TrendArrow({ trendType }) {
  const map = {
    improving:                { arrow: '↑', cls: 'text-emerald-400' },
    accelerating_improvement: { arrow: '↑↑', cls: 'text-emerald-300' },
    declining:                { arrow: '↓', cls: 'text-rose-400' },
    accelerating_decline:     { arrow: '↓↓', cls: 'text-red-400' },
    volatile:                 { arrow: '↕', cls: 'text-amber-400' },
    stable:                   { arrow: '→', cls: 'text-slate-400' },
    plateau:                  { arrow: '⊟', cls: 'text-blue-400' },
    recovering:               { arrow: '↗', cls: 'text-emerald-400' },
    burnout_escalation:       { arrow: '🔥', cls: 'text-red-400' },
    burnout_recovery:         { arrow: '🌱', cls: 'text-emerald-400' },
  };
  const m = map[trendType];
  if (!m) return null;
  return <span className={`text-sm font-bold ${m.cls}`} title={trendType?.replace(/_/g, ' ')}>{m.arrow}</span>;
}

// ── Full trend card for Insights page ────────────────────────────────────────
export function TrendCard({ trend, index = 0 }) {
  const { badge, dot } = getColors(trend.color);
  const isPulse = ['accelerating_decline', 'burnout_escalation', 'volatile'].includes(trend.trendType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`p-4 rounded-2xl border ${badge.replace('bg-', 'border-').replace('/10', '/20').replace('text-', '')} bg-black/20 relative overflow-hidden`}
    >
      {/* Pulse dot for urgent trends */}
      {isPulse && (
        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${dot} animate-pulse`} />
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl">{trend.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge}`}>
              {trend.label}
            </span>
            <span className="text-[10px] text-slate-500">{trend.domain} · {trend.windowLabel}</span>
            <span className="text-[10px] text-slate-600">{trend.confidence}% confidence</span>
          </div>
          <p className="text-sm font-semibold text-white mb-1">{trend.label} Trend</p>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">{trend.summary}</p>

          {/* Math transparency */}
          <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 border-t border-white/5 pt-2 mt-1">
            {trend.slope !== null && (
              <span>Slope: <span className={trend.slope > 0 ? 'text-emerald-400' : 'text-rose-400'}>{trend.slope > 0 ? '+' : ''}{trend.slope}/log</span></span>
            )}
            {trend.avg !== null && <span>Avg: <span className="text-slate-300">{trend.avg}</span></span>}
            {trend.volatilityPct !== null && <span>Volatility: <span className="text-amber-300">{trend.volatilityPct}%</span></span>}
            {trend.momentum !== null && <span>Momentum: <span className={trend.momentum > 0 ? 'text-emerald-400' : 'text-rose-400'}>{trend.momentum > 0 ? '+' : ''}{trend.momentum}</span></span>}
            <span>Based on {trend.seriesLen} logs</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Forecast summary row ──────────────────────────────────────────────────────
export function ForecastRow({ forecast, index = 0 }) {
  const sevColor = {
    urgent:    'text-red-300 border-red-500/20 bg-red-500/5',
    alert:     'text-orange-300 border-orange-500/20 bg-orange-500/5',
    attention: 'text-amber-300 border-amber-500/20 bg-amber-500/5',
    watch:     'text-blue-300 border-blue-500/20 bg-blue-500/5',
    positive:  'text-emerald-300 border-emerald-500/20 bg-emerald-500/5',
  }[forecast.severity] || 'text-slate-300 border-white/5 bg-white/2';

  const icon = {
    urgent: '🚨', alert: '⚠️', attention: '🟡', watch: '👁', positive: '✅',
  }[forecast.severity] || '•';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${sevColor}`}
    >
      <span>{icon}</span>
      <span>{forecast.text}</span>
    </motion.div>
  );
}
