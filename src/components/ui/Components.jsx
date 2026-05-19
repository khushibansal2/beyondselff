import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

export function ScoreRing({ score, size = 130, strokeWidth = 7, color = '#6366f1', label, delay = 0 }) {
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
    if (s >= 75) return '#22c55e';
    if (s >= 50) return '#f59e0b';
    if (s >= 25) return '#f97316';
    return '#ef4444';
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay / 1000, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="score-ring" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={getColor(animatedScore)} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${getColor(animatedScore)}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: getColor(animatedScore) }}>{animatedScore}</span>
          <span className="text-[10px] text-[#3f3f46] font-medium mt-0.5">/ 100</span>
        </div>
      </div>
      {label && <span className="text-[12px] text-[#a1a1aa] font-medium tracking-wide">{label}</span>}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow = '', onClick, animate = true }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`glass-card p-7 lg:p-8 ${glow} ${onClick ? 'cursor-pointer dash-card-interactive' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function MetricCard({ icon, label, value, change, color = '#6366f1', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-7 lg:p-8 flex items-center gap-5 group transition-all duration-300 hover:translate-y-[-2px]"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-all duration-300 group-hover:scale-110 border border-white/[0.06]"
        style={{ background: `${color}12`, boxShadow: `0 0 20px ${color}15` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-2">{label}</p>
        <p className="text-[20px] font-bold tracking-tight truncate">{value}</p>
      </div>
      {change !== undefined && (
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${change >= 0 ? 'text-[#22c55e] bg-[rgba(34,197,94,0.10)]' : 'text-[#ef4444] bg-[rgba(239,68,68,0.10)]'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </motion.div>
  );
}

export function InsightCard({ insight, index = 0 }) {
  const borderMap = { critical: 'border-l-[#ef4444]', alert: 'border-l-[#f59e0b]', warning: 'border-l-[#f97316]', positive: 'border-l-[#22c55e]', info: 'border-l-[#6366f1]' };
  const glowMap = { critical: 'rgba(239,68,68,0.06)', alert: 'rgba(245,158,11,0.06)', warning: 'rgba(249,115,22,0.06)', positive: 'rgba(34,197,94,0.06)', info: 'rgba(99,102,241,0.06)' };
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={`p-6 lg:p-7 rounded-2xl border border-white/[0.06] border-l-[3px] ${borderMap[insight.type] || borderMap.info} hover:border-white/[0.10] transition-all duration-300 hover:translate-y-[-1px]`}
      style={{ background: `linear-gradient(135deg, ${glowMap[insight.type] || glowMap.info}, rgba(255,255,255,0.02))`, backdropFilter: 'blur(20px)' }}>
      <div className="flex items-start gap-5">
        <span className="text-lg flex-shrink-0 mt-0.5">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h4 className="font-semibold text-[13px] truncate text-[#f0f0f3]">{insight.title}</h4>
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#71717a] flex-shrink-0 tabular-nums font-medium">{insight.confidence}%</span>
          </div>
          <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{insight.text}</p>
          <div className="flex gap-2 mt-3">
            {insight.domains.map(d => <span key={d} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.04] text-[#52525b] capitalize font-medium">{d}</span>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-14">
      <h1 className="text-[34px] md:text-[40px] font-bold gradient-text tracking-[-0.03em] leading-none">{title}</h1>
      {subtitle && <p className="text-[#71717a] text-[15px] mt-4 leading-relaxed max-w-2xl">{subtitle}</p>}
    </motion.div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-white/[0.06] mb-12 overflow-x-auto -mt-4">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`relative px-5 py-3.5 text-[14px] font-medium transition-colors whitespace-nowrap ${active === t.id ? 'text-[#f0f0f3]' : 'text-[#52525b] hover:text-[#a1a1aa]'}`}>
          {t.icon && <span className="mr-2 text-[13px]">{t.icon}</span>}{t.label}
          {active === t.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
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
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-indigo-500 mx-auto mb-4"
        />
        <p className="text-[13px] text-[#52525b] font-medium">Loading...</p>
      </div>
    </div>
  );
}

export function Badge({ badge, size = 'md' }) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-12 h-12 text-2xl', lg: 'w-16 h-16 text-3xl' };
  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center transition-all ${badge.unlocked ? 'bg-white/[0.04] border border-white/[0.08] shadow-lg' : 'bg-white/[0.02] border border-white/[0.04] opacity-30 grayscale'}`}>
      {badge.icon}
    </div>
  );
}

export function AchievementPopup({ badge, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        className="glass-card p-10 text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-5">{badge.icon}</div>
        <h3 className="text-lg font-bold mb-2 gradient-text">Achievement Unlocked!</h3>
        <p className="text-base font-semibold mb-1 text-[#f0f0f3]">{badge.name}</p>
        <p className="text-sm text-[#a1a1aa]">{badge.desc}</p>
        <button onClick={onClose} className="btn-primary mt-8 w-full">Awesome! 🎉</button>
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
          <motion.div key={t.id} initial={{ opacity: 0, x: 30, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: 0.95 }} className={`toast toast-${t.type}`}>
            {t.type === 'success' && '✓ '}{t.type === 'error' && '✕ '}{t.type === 'info' && 'ℹ '}{t.message}
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
      <span className="text-4xl mb-5 block">{icon}</span>
      <h3 className="text-base font-semibold mb-2 text-[#f0f0f3]">{title}</h3>
      <p className="text-[13px] text-[#a1a1aa] mb-6 max-w-sm mx-auto">{subtitle}</p>
      {action && action}
    </GlassCard>
  );
}

// Loading skeleton
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-white/[0.04]" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// Secure data badge
export function SecurityBadge({ compact = false }) {
  if (compact) return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-[#22c55e] px-3 py-1 rounded-lg bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.1)]">
      🔒 Encrypted
    </span>
  );
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(34,197,94,0.04)] border border-[rgba(34,197,94,0.08)] text-xs text-[#22c55e]">
      <span>🔒</span>
      <div>
        <p className="font-medium">Your data is secure</p>
        <p className="text-[#52525b] text-[10px]">End-to-end encrypted • Private to you only • GDPR compliant</p>
      </div>
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, max = 100, color = '#6366f1', label, showPercent = true, height = 'h-1.5' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-[11px] text-[#a1a1aa] mb-2">
          {label && <span className="font-medium">{label}</span>}
          {showPercent && <span className="tabular-nums">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-white/[0.04]`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`${height} rounded-full`} style={{ background: color, boxShadow: `0 0 10px ${color}30` }} />
      </div>
    </div>
  );
}

// ---- Explainable Score Panel ----
export function ExplainableScorePanel({ title, score, factors = [], color = '#6366f1', icon }) {
  const [open, setOpen] = useState(false);

  const statusColor = (s) => {
    if (s === 'good') return { text: 'text-[#22c55e]', bg: 'bg-[rgba(34,197,94,0.10)]', bar: '#22c55e' };
    if (s === 'warning') return { text: 'text-[#f59e0b]', bg: 'bg-[rgba(245,158,11,0.10)]', bar: '#f59e0b' };
    return { text: 'text-[#ef4444]', bg: 'bg-[rgba(239,68,68,0.10)]', bar: '#ef4444' };
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.10] transition-all duration-300"
      style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 lg:p-8 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-5">
          {icon && <span className="text-xl">{icon}</span>}
          <div className="text-left">
            <p className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold">{title}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{score}<span className="text-sm text-[#3f3f46] font-normal ml-0.5">/100</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#71717a] font-medium hover:text-[#a1a1aa] transition-colors">Why?</span>
          <span className={`text-[#52525b] text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 lg:px-8 pb-6 lg:pb-8 space-y-4 border-t border-white/[0.04]">
              <p className="text-[10px] text-[#52525b] pt-5 uppercase tracking-[0.06em] font-semibold">Factor Breakdown</p>
              {factors.length === 0 && (
                <p className="text-xs text-[#52525b] text-center py-3">Log data to see factor breakdown.</p>
              )}
              {factors.map((f, i) => {
                const sc = statusColor(f.status);
                const barWidth = Math.round(f.rawScore ?? 0);
                return (
                  <motion.div key={f.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] text-[#f0f0f3] font-medium">{f.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md ${sc.bg} ${sc.text} capitalize font-semibold`}>{f.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#52525b] tabular-nums">{f.value}{f.unit ? ` ${f.unit}` : ''}</span>
                        <span className="text-[10px] text-[#52525b] tabular-nums">• {Math.round((f.weight ?? 0) * 100)}%</span>
                        <span className={`text-[10px] font-bold tabular-nums ${sc.text}`}>+{f.contribution ?? 0}</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: sc.bar, boxShadow: `0 0 8px ${sc.bar}30` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              <p className="text-[9px] text-[#3f3f46] italic pt-2">Scores computed deterministically from your logged data.</p>
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
    if (s === 'critical') return 'border-l-[#ef4444] bg-[rgba(239,68,68,0.04)]';
    if (s === 'high') return 'border-l-[#f59e0b] bg-[rgba(245,158,11,0.04)]';
    return 'border-l-[#f97316] bg-[rgba(249,115,22,0.04)]';
  };
  const severityIcon = (s) => s === 'critical' ? '🚨' : s === 'high' ? '⚠️' : '📌';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Anomaly Alerts"
        className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[13px] w-full ${
          open ? 'bg-white/[0.06] text-white' : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.03]'
        }`}
      >
        <span className="text-sm relative flex-shrink-0">
          🔔
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ef4444] text-white text-[7px] font-bold flex items-center justify-center animate-pulse">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="font-medium flex-1 text-left">
            Alerts
            {count > 0 && <span className="ml-2 text-[10px] text-[#ef4444] tabular-nums font-semibold">({count})</span>}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 mt-1 z-50 rounded-2xl border border-white/[0.08] overflow-hidden"
            style={{ minWidth: '300px', maxWidth: '360px', background: 'rgba(20,20,22,0.95)', backdropFilter: 'blur(24px)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
          >
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f0f0f3]">Anomaly Alerts</span>
              <button onClick={() => setOpen(false)} className="text-[#52525b] hover:text-white text-xs p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto p-3 space-y-2">
              {active.length === 0 ? (
                <p className="text-xs text-[#52525b] text-center py-6">✓ No anomalies detected.</p>
              ) : active.map((a, i) => (
                <div key={a.id || i} className={`p-4 rounded-xl border border-white/[0.04] border-l-[3px] text-xs ${severityStyle(a.severity)}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{severityIcon(a.severity)}</span>
                    <span className="font-medium text-[#f0f0f3]">{a.title}</span>
                    <span className="ml-auto capitalize text-[9px] text-[#52525b] px-2 py-0.5 rounded-lg bg-white/[0.04]">{a.severity}</span>
                  </div>
                  <p className="text-[#a1a1aa] text-[11px] mb-1.5 leading-relaxed">{a.description}</p>
                  {a.recommendedAction && (
                    <p className="text-[10px] text-[#a1a1aa] italic">💡 {a.recommendedAction}</p>
                  )}
                  <p className="text-[9px] text-[#3f3f46] mt-1.5">{a.detectedAt ? new Date(a.detectedAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
