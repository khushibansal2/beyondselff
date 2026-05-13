import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

export function ScoreRing({ score, size = 120, strokeWidth = 8, color = '#3b82f6', label, delay = 0 }) {
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
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={getColor(animatedScore)} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${getColor(animatedScore)}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: getColor(animatedScore) }}>{animatedScore}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow = '', onClick, animate = true }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.5 }}
      whileHover={onClick ? { scale: 1.01 } : {}}
      onClick={onClick}
      className={`glass-card p-5 ${glow} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function MetricCard({ icon, label, value, change, color = '#3b82f6', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000, duration: 0.4 }} className="glass-card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${color}15` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      </div>
      {change !== undefined && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${change >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      )}
    </motion.div>
  );
}

export function InsightCard({ insight, index = 0 }) {
  const bgMap = { critical: 'border-red-500/30 bg-red-500/5', alert: 'border-orange-500/30 bg-orange-500/5', warning: 'border-amber-500/30 bg-amber-500/5', positive: 'border-emerald-500/30 bg-emerald-500/5', info: 'border-blue-500/30 bg-blue-500/5' };
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className={`p-4 rounded-xl border ${bgMap[insight.type] || bgMap.info}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h4 className="font-semibold text-sm truncate">{insight.title}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 flex-shrink-0">{insight.confidence}% confidence</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{insight.text}</p>
          <div className="flex gap-1 mt-2">
            {insight.domains.map(d => <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 capitalize">{d}</span>)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {icon && <span className="text-3xl">{icon}</span>}
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
      </div>
      {subtitle && <p className="text-slate-400 text-sm ml-12">{subtitle}</p>}
    </motion.div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          {t.icon && <span className="mr-1.5">{t.icon}</span>}{t.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading your Digital Twin...</p>
      </div>
    </div>
  );
}

export function Badge({ badge, size = 'md' }) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-20 h-20 text-4xl' };
  return (
    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`${sizes[size]} rounded-2xl flex items-center justify-center ${badge.unlocked ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10 opacity-40 grayscale'}`}>
      {badge.icon}
    </motion.div>
  );
}

export function AchievementPopup({ badge, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="glass-strong p-8 rounded-3xl text-center max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-6xl mb-4">{badge.icon}</div>
        <h3 className="text-xl font-bold mb-2 gradient-text" style={{ fontFamily: 'var(--font-display)' }}>Achievement Unlocked!</h3>
        <p className="text-lg font-semibold mb-1">{badge.name}</p>
        <p className="text-sm text-slate-400">{badge.desc}</p>
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
    <GlassCard className="text-center py-12">
      <span className="text-5xl mb-4 block">{icon}</span>
      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{subtitle}</p>
      {action && action}
    </GlassCard>
  );
}

// Loading skeleton
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-white/5" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// Secure data badge
export function SecurityBadge({ compact = false }) {
  if (compact) return (
    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-500/70 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
      🔒 Encrypted
    </span>
  );
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400/80">
      <span>🔒</span>
      <div>
        <p className="font-medium">Your data is secure</p>
        <p className="text-emerald-500/50 text-[10px]">End-to-end encrypted • Private to you only • GDPR compliant</p>
      </div>
    </div>
  );
}

// Progress bar
export function ProgressBar({ value, max = 100, color = '#3b82f6', label, showPercent = true, height = 'h-2' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-white/5`}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          className={`${height} rounded-full`} style={{ background: color }} />
      </div>
    </div>
  );
}
