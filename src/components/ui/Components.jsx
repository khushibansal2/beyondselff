import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

export function ScoreRing({ score, size = 120, strokeWidth = 8, color = '#6366f1', label, delay = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const interval = setInterval(() => {
        start += 1;
        if (start >= score) { setAnimatedScore(score); clearInterval(interval); }
        else setAnimatedScore(start);
      }, 15);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const getColor = (s) => {
    if (color !== 'auto') return color;
    if (s >= 75) return '#10b981';
    if (s >= 50) return '#f59e0b';
    if (s >= 25) return '#f97316';
    return '#ef4444';
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay / 1000, duration: 0.5 }} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="score-ring" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={getColor(animatedScore)} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${getColor(animatedScore)}30)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: getColor(animatedScore) }}>{animatedScore}</span>
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">/ 100</span>
        </div>
      </div>
      {label && <span className="text-[11px] text-zinc-500 font-medium">{label}</span>}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow = '', onClick, animate = true }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 16 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={onClick ? { scale: 1.01, y: -2 } : {}}
      onClick={onClick}
      className={`glass-card p-6 ${glow} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function MetricCard({ icon, label, value, change, color = '#6366f1', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000, duration: 0.35 }}
      className="glass-card p-4 flex items-center gap-4 group hover:translate-y-[-1px] transition-transform duration-200"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ background: `${color}12`, boxShadow: `0 0 16px ${color}08` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-0.5">{label}</p>
        <p className="text-lg font-bold truncate tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      </div>
      {change !== undefined && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${change >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </motion.div>
  );
}

export function InsightCard({ insight, index = 0 }) {
  const bgMap = { critical: 'border-red-500/20 bg-red-500/[0.04]', alert: 'border-orange-500/20 bg-orange-500/[0.04]', warning: 'border-amber-500/20 bg-amber-500/[0.04]', positive: 'border-emerald-500/20 bg-emerald-500/[0.04]', info: 'border-indigo-500/20 bg-indigo-500/[0.04]' };
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className={`p-4 rounded-xl border ${bgMap[insight.type] || bgMap.info}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h4 className="font-semibold text-[13px] truncate text-zinc-200">{insight.title}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-500 flex-shrink-0 tabular-nums">{insight.confidence}%</span>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed">{insight.text}</p>
          <div className="flex gap-1.5 mt-2">
            {insight.domains.map(d => <span key={d} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-600 capitalize">{d}</span>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="flex items-center gap-3 mb-1.5">
        {icon && <span className="text-2xl">{icon}</span>}
        <h1 className="text-2xl md:text-3xl heading-page text-zinc-100">{title}</h1>
      </div>
      {subtitle && <p className="text-zinc-500 text-[13px] ml-0 md:ml-11 leading-relaxed">{subtitle}</p>}
    </motion.div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0.5 p-1 rounded-xl bg-white/[0.025] border border-white/[0.06] mb-6 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`relative px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${active === t.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          {active === t.id && (
            <motion.div
              layoutId="tab-active"
              className="absolute inset-0 bg-white/[0.08] rounded-lg border border-white/[0.06]"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            {t.icon && <span className="mr-1.5">{t.icon}</span>}{t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#09090b] flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-transparent border-t-indigo-500 border-r-purple-500 mx-auto mb-4"
        />
        <p className="text-[13px] text-zinc-600 font-medium">Loading BeyondSelf...</p>
      </div>
    </div>
  );
}

export function Badge({ badge, size = 'md' }) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-20 h-20 text-4xl' };
  return (
    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`${sizes[size]} rounded-2xl flex items-center justify-center transition-all ${badge.unlocked ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/25 shadow-lg shadow-amber-500/5' : 'bg-white/[0.03] border border-white/[0.06] opacity-40 grayscale'}`}>
      {badge.icon}
    </motion.div>
  );
}

export function AchievementPopup({ badge, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="glass-strong p-8 rounded-3xl text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-6xl mb-4">{badge.icon}</div>
        <h3 className="text-xl font-bold mb-2 gradient-text" style={{ fontFamily: 'var(--font-display)' }}>Achievement Unlocked!</h3>
        <p className="text-lg font-semibold mb-1 text-zinc-200">{badge.name}</p>
        <p className="text-sm text-zinc-500">{badge.desc}</p>
        <button onClick={onClose} className="btn-primary mt-6 w-full">Awesome! 🎉</button>
      </motion.div>
    </motion.div>
  );
}

// Toast notification system
let toastId = 0;
const toastListeners = new Set();
const toasts = [];

export function showToast(message, type = 'success') {
  const id = ++toastId;
  toasts.push({ id, message, type });
  toastListeners.forEach(fn => fn([...toasts]));
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
    toastListeners.forEach(fn => fn([...toasts]));
  }, 3000);
}

export function ToastContainer() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    toastListeners.add(setItems);
    return () => toastListeners.delete(setItems);
  }, []);

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-[100] space-y-2">
      <AnimatePresence>
        {items.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 50, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50 }} className={`toast toast-${t.type}`}>
            {t.type === 'success' && '✅ '}{t.type === 'error' && '❌ '}{t.type === 'info' && 'ℹ️ '}{t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Empty state
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <GlassCard className="text-center py-16">
      <span className="text-5xl mb-4 block">{icon}</span>
      <h3 className="text-lg font-semibold mb-2 text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      <p className="text-[13px] text-zinc-500 mb-5 max-w-sm mx-auto">{subtitle}</p>
      {action && action}
    </GlassCard>
  );
}

// Loading skeleton
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-white/[0.04]" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// Secure data badge
export function SecurityBadge({ compact = false }) {
  if (compact) return (
    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-500/70 px-2 py-0.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/10">
      🔒 Encrypted
    </span>
  );
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 text-xs text-emerald-400/80">
      <span>🔒</span>
      <div>
        <p className="font-medium">Your data is secure</p>
        <p className="text-emerald-500/50 text-[10px]">End-to-end encrypted • Private to you only • GDPR compliant</p>
      </div>
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, max = 100, color = '#6366f1', label, showPercent = true, height = 'h-2' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
          {label && <span className="font-medium">{label}</span>}
          {showPercent && <span className="tabular-nums">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-white/[0.05]`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          className={`${height} rounded-full`} style={{ background: color }} />
      </div>
    </div>
  );
}

// ---- Explainable Score Panel ----
// Shows the factor breakdown for any domain score with bars + status badges.
export function ExplainableScorePanel({ title, score, factors = [], color = '#6366f1', icon }) {
  const [open, setOpen] = useState(false);

  const statusColor = (s) => {
    if (s === 'good') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: '#10b981' };
    if (s === 'warning') return { text: 'text-amber-400', bg: 'bg-amber-500/10', bar: '#f59e0b' };
    return { text: 'text-red-400', bg: 'bg-red-500/10', bar: '#ef4444' };
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <div className="text-left">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">{title}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color }}>{score}<span className="text-sm text-zinc-600 font-normal">/100</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 font-medium">🔍 Why?</span>
          <span className={`text-zinc-500 text-xs transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {/* Factor Breakdown — animated open/close */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
              <p className="text-[10px] text-zinc-600 pt-3 uppercase tracking-wider font-semibold">Factor Breakdown</p>
              {factors.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-2">Log data to see factor breakdown.</p>
              )}
              {factors.map((f, i) => {
                const sc = statusColor(f.status);
                const barWidth = Math.round(f.rawScore ?? 0);
                return (
                  <motion.div key={f.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-zinc-300 font-medium">{f.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${sc.bg} ${sc.text} capitalize font-medium`}>{f.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600 tabular-nums">{f.value}{f.unit ? ` ${f.unit}` : ''}</span>
                        <span className="text-[10px] text-zinc-700 tabular-nums">• {Math.round((f.weight ?? 0) * 100)}%</span>
                        <span className={`text-[10px] font-bold tabular-nums ${sc.text}`}>+{f.contribution ?? 0}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: sc.bar }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              <p className="text-[9px] text-zinc-700 italic pt-1">Scores computed deterministically from your logged data.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Anomaly Notification Bell ----
export function AnomalyBell({ anomalies = [], collapsed = false }) {
  const [open, setOpen] = useState(false);
  const active = anomalies.filter(a => a.status !== 'resolved');
  const count = active.length;

  const severityStyle = (s) => {
    if (s === 'critical') return 'border-red-500/20 bg-red-500/[0.04] text-red-300';
    if (s === 'high') return 'border-orange-500/20 bg-orange-500/[0.04] text-orange-300';
    return 'border-amber-500/20 bg-amber-500/[0.04] text-amber-300';
  };
  const severityIcon = (s) => s === 'critical' ? '🚨' : s === 'high' ? '⚠️' : '📌';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Anomaly Alerts"
        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] w-full ${
          open ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
        }`}
      >
        <span className="text-base relative flex-shrink-0">
          🔔
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="font-medium flex-1 text-left">
            Alerts
            {count > 0 && <span className="ml-2 text-[10px] text-red-400 tabular-nums">({count})</span>}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-1 z-50 bg-[#111113] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            style={{ minWidth: '300px', maxWidth: '360px' }}
          >
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">🔍 Anomaly Alerts</span>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white text-xs p-1 rounded hover:bg-white/5 transition-colors">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-2">
              {active.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">✅ No anomalies detected.</p>
              ) : active.map((a, i) => (
                <div key={a.id || i} className={`p-3 rounded-xl border text-xs ${severityStyle(a.severity)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{severityIcon(a.severity)}</span>
                    <span className="font-semibold">{a.title}</span>
                    <span className="ml-auto capitalize text-[9px] opacity-70 px-1.5 py-0.5 rounded-md bg-white/[0.04]">{a.severity}</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] mb-1.5 leading-relaxed">{a.description}</p>
                  {a.recommendedAction && (
                    <p className="text-[10px] opacity-80 italic">💡 {a.recommendedAction}</p>
                  )}
                  <p className="text-[9px] text-zinc-700 mt-1">{a.detectedAt ? new Date(a.detectedAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
