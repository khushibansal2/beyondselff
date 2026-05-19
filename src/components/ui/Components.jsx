import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

export function ScoreRing({ score, size = 120, strokeWidth = 8, color = '#2383E2', label, delay = 0 }) {
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
    if (s >= 75) return '#2E9E6B';
    if (s >= 50) return '#D9730D';
    if (s >= 25) return '#CB912F';
    return '#E03E3E';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay / 1000, duration: 0.3 }} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="score-ring" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={getColor(animatedScore)} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color: getColor(animatedScore) }}>{animatedScore}</span>
          <span className="text-[9px] text-[#5C5C5C] uppercase tracking-wider font-medium">/ 100</span>
        </div>
      </div>
      {label && <span className="text-[11px] text-[#9B9B9B] font-medium">{label}</span>}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow = '', onClick, animate = true }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onClick}
      className={`glass-card p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function MetricCard({ icon, label, value, change, color = '#2383E2', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000, duration: 0.25 }}
      className="glass-card p-4 flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center text-base flex-shrink-0" style={{ background: `${color}14` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#5C5C5C] uppercase tracking-wider font-medium mb-0.5">{label}</p>
        <p className="text-base font-semibold truncate">{value}</p>
      </div>
      {change !== undefined && (
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${change >= 0 ? 'text-[#2E9E6B] bg-[rgba(46,158,107,0.1)]' : 'text-[#E03E3E] bg-[rgba(224,62,62,0.1)]'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </motion.div>
  );
}

export function InsightCard({ insight, index = 0 }) {
  const borderMap = { critical: 'border-l-[#E03E3E]', alert: 'border-l-[#D9730D]', warning: 'border-l-[#CB912F]', positive: 'border-l-[#2E9E6B]', info: 'border-l-[#2383E2]' };
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
      className={`p-4 rounded-lg bg-[#252525] border border-[rgba(255,255,255,0.055)] border-l-[3px] ${borderMap[insight.type] || borderMap.info}`}>
      <div className="flex items-start gap-3">
        <span className="text-base flex-shrink-0 mt-0.5">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h4 className="font-medium text-[13px] truncate text-[#EBEBEB]">{insight.title}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#2b2b2b] text-[#9B9B9B] flex-shrink-0 tabular-nums">{insight.confidence}%</span>
          </div>
          <p className="text-[12px] text-[#9B9B9B] leading-relaxed">{insight.text}</p>
          <div className="flex gap-1.5 mt-2">
            {insight.domains.map(d => <span key={d} className="text-[10px] px-2 py-0.5 rounded bg-[#2b2b2b] text-[#5C5C5C] capitalize">{d}</span>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, icon }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
      <h1 className="text-[28px] md:text-[32px] font-bold text-[#EBEBEB] tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="text-[#9B9B9B] text-[14px] mt-1.5 leading-relaxed">{subtitle}</p>}
    </motion.div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0 border-b border-[rgba(255,255,255,0.055)] mb-6 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${active === t.id ? 'text-[#EBEBEB]' : 'text-[#5C5C5C] hover:text-[#9B9B9B]'}`}>
          {t.icon && <span className="mr-1.5">{t.icon}</span>}{t.label}
          {active === t.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2383E2]"
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
    <div className="fixed inset-0 bg-[#191919] flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#2383E2] mx-auto mb-4"
        />
        <p className="text-[13px] text-[#5C5C5C] font-medium">Loading...</p>
      </div>
    </div>
  );
}

export function Badge({ badge, size = 'md' }) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-12 h-12 text-2xl', lg: 'w-16 h-16 text-3xl' };
  return (
    <div className={`${sizes[size]} rounded-lg flex items-center justify-center transition-all ${badge.unlocked ? 'bg-[#2b2b2b] border border-[rgba(255,255,255,0.08)]' : 'bg-[#252525] border border-[rgba(255,255,255,0.04)] opacity-30 grayscale'}`}>
      {badge.icon}
    </div>
  );
}

export function AchievementPopup({ badge, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} className="bg-[#252525] border border-[rgba(255,255,255,0.08)] p-8 rounded-xl text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4">{badge.icon}</div>
        <h3 className="text-lg font-bold mb-2 text-[#2383E2]">Achievement Unlocked!</h3>
        <p className="text-base font-semibold mb-1 text-[#EBEBEB]">{badge.name}</p>
        <p className="text-sm text-[#9B9B9B]">{badge.desc}</p>
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
          <motion.div key={t.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className={`toast toast-${t.type}`}>
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
    <GlassCard className="text-center py-14">
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="text-base font-semibold mb-2 text-[#EBEBEB]">{title}</h3>
      <p className="text-[13px] text-[#9B9B9B] mb-5 max-w-sm mx-auto">{subtitle}</p>
      {action && action}
    </GlassCard>
  );
}

// Loading skeleton
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-[#2b2b2b]" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// Secure data badge
export function SecurityBadge({ compact = false }) {
  if (compact) return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#2E9E6B] px-2 py-0.5 rounded bg-[rgba(46,158,107,0.08)] border border-[rgba(46,158,107,0.1)]">
      🔒 Encrypted
    </span>
  );
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(46,158,107,0.05)] border border-[rgba(46,158,107,0.1)] text-xs text-[#2E9E6B]">
      <span>🔒</span>
      <div>
        <p className="font-medium">Your data is secure</p>
        <p className="text-[#5C5C5C] text-[10px]">End-to-end encrypted • Private to you only • GDPR compliant</p>
      </div>
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, max = 100, color = '#2383E2', label, showPercent = true, height = 'h-1.5' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-[11px] text-[#9B9B9B] mb-1.5">
          {label && <span className="font-medium">{label}</span>}
          {showPercent && <span className="tabular-nums">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-[rgba(255,255,255,0.06)]`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`${height} rounded-full`} style={{ background: color }} />
      </div>
    </div>
  );
}

// ---- Explainable Score Panel ----
export function ExplainableScorePanel({ title, score, factors = [], color = '#2383E2', icon }) {
  const [open, setOpen] = useState(false);

  const statusColor = (s) => {
    if (s === 'good') return { text: 'text-[#2E9E6B]', bg: 'bg-[rgba(46,158,107,0.1)]', bar: '#2E9E6B' };
    if (s === 'warning') return { text: 'text-[#D9730D]', bg: 'bg-[rgba(217,115,13,0.1)]', bar: '#D9730D' };
    return { text: 'text-[#E03E3E]', bg: 'bg-[rgba(224,62,62,0.1)]', bar: '#E03E3E' };
  };

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.055)] bg-[#252525] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#2b2b2b] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg">{icon}</span>}
          <div className="text-left">
            <p className="text-[10px] text-[#5C5C5C] uppercase tracking-wider font-medium">{title}</p>
            <p className="text-xl font-bold" style={{ color }}>{score}<span className="text-sm text-[#5C5C5C] font-normal">/100</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded bg-[rgba(35,131,226,0.1)] text-[#2383E2] font-medium">Why?</span>
          <span className={`text-[#5C5C5C] text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[rgba(255,255,255,0.04)]">
              <p className="text-[10px] text-[#5C5C5C] pt-3 uppercase tracking-wider font-medium">Factor Breakdown</p>
              {factors.length === 0 && (
                <p className="text-xs text-[#5C5C5C] text-center py-2">Log data to see factor breakdown.</p>
              )}
              {factors.map((f, i) => {
                const sc = statusColor(f.status);
                const barWidth = Math.round(f.rawScore ?? 0);
                return (
                  <motion.div key={f.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#EBEBEB] font-medium">{f.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${sc.bg} ${sc.text} capitalize font-medium`}>{f.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#5C5C5C] tabular-nums">{f.value}{f.unit ? ` ${f.unit}` : ''}</span>
                        <span className="text-[10px] text-[#5C5C5C] tabular-nums">• {Math.round((f.weight ?? 0) * 100)}%</span>
                        <span className={`text-[10px] font-bold tabular-nums ${sc.text}`}>+{f.contribution ?? 0}</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[rgba(255,255,255,0.04)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: sc.bar }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              <p className="text-[9px] text-[#5C5C5C] italic pt-1">Scores computed deterministically from your logged data.</p>
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
    if (s === 'critical') return 'border-l-[#E03E3E] bg-[rgba(224,62,62,0.04)]';
    if (s === 'high') return 'border-l-[#D9730D] bg-[rgba(217,115,13,0.04)]';
    return 'border-l-[#CB912F] bg-[rgba(203,145,47,0.04)]';
  };
  const severityIcon = (s) => s === 'critical' ? '🚨' : s === 'high' ? '⚠️' : '📌';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Anomaly Alerts"
        className={`relative flex items-center gap-2.5 px-2 py-[6px] rounded-md transition-all text-[13px] w-full ${
          open ? 'bg-[#2f2f2f] text-white' : 'text-[#9B9B9B] hover:text-[#EBEBEB] hover:bg-[#2b2b2b]'
        }`}
      >
        <span className="text-sm relative flex-shrink-0">
          🔔
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E03E3E] text-white text-[7px] font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="font-medium flex-1 text-left">
            Alerts
            {count > 0 && <span className="ml-2 text-[10px] text-[#E03E3E] tabular-nums">({count})</span>}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1 z-50 bg-[#252525] rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden"
            style={{ minWidth: '280px', maxWidth: '340px' }}
          >
            <div className="p-3 border-b border-[rgba(255,255,255,0.055)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#EBEBEB]">Anomaly Alerts</span>
              <button onClick={() => setOpen(false)} className="text-[#5C5C5C] hover:text-white text-xs p-1 rounded hover:bg-[#2f2f2f] transition-colors">✕</button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
              {active.length === 0 ? (
                <p className="text-xs text-[#5C5C5C] text-center py-4">✓ No anomalies detected.</p>
              ) : active.map((a, i) => (
                <div key={a.id || i} className={`p-3 rounded-md border border-[rgba(255,255,255,0.04)] border-l-[3px] text-xs ${severityStyle(a.severity)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{severityIcon(a.severity)}</span>
                    <span className="font-medium text-[#EBEBEB]">{a.title}</span>
                    <span className="ml-auto capitalize text-[9px] text-[#5C5C5C] px-1.5 py-0.5 rounded bg-[#2b2b2b]">{a.severity}</span>
                  </div>
                  <p className="text-[#9B9B9B] text-[11px] mb-1 leading-relaxed">{a.description}</p>
                  {a.recommendedAction && (
                    <p className="text-[10px] text-[#9B9B9B] italic">💡 {a.recommendedAction}</p>
                  )}
                  <p className="text-[9px] text-[#5C5C5C] mt-1">{a.detectedAt ? new Date(a.detectedAt).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
