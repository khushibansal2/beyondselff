import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, Zap, Activity,
  AlertTriangle, Flame, Shield, ArrowRight, Clock
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOMAIN_TABS = [
  { id: 'overall',  label: 'Life Balance', color: '#6366f1', emoji: '⚡' },
  { id: 'health',   label: 'Health',       color: '#10b981', emoji: '💚' },
  { id: 'finance',  label: 'Finance',      color: '#f59e0b', emoji: '💰' },
  { id: 'career',   label: 'Career',       color: '#3b82f6', emoji: '🚀' },
];

// Generate month labels starting from current month (May 2026)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LABELS = (() => {
  const labels = ['Now'];
  const startMonth = 4; // May = index 4
  for (let i = 1; i <= 12; i++) {
    const idx = (startMonth + i) % 12;
    const label = MONTH_NAMES[idx];
    labels.push(idx === 0 ? `${label} '27` : label);
  }
  return labels;
})();

// ─── Projection Engine ────────────────────────────────────────────────────────
function generateProjection(startScore, domainId, burnoutRisk = 0) {
  // Current path drift rate per month
  const drift =
    startScore < 45 ? -2.2 :
    startScore < 60 ? -0.9 :
    startScore < 72 ? +0.1 :
                      +0.4;

  // Optimized path max gain (diminishing returns via log curve)
  const maxGain =
    domainId === 'health'   ? 4.8 :
    domainId === 'finance'  ? 4.0 :
    domainId === 'career'   ? 4.5 :
                              4.3; // overall

  const data = MONTH_LABELS.map((month, i) => {
    // Deterministic micro-noise using sine (looks realistic, never random)
    const noise = Math.sin(i * 1.9 + domainId.length * 0.7) * 1.4;

    const currentRaw  = startScore + drift * i + noise;
    // Burnout applies a multiplied decline on the current path for high-risk users
    const burnoutPull = burnoutRisk > 60 && i >= 2 && i <= 6 ? -(burnoutRisk / 100) * 3 * (i - 1) : 0;
    const current = Math.max(8, Math.min(96, Math.round(currentRaw + burnoutPull)));

    // Log growth: fast early, tapering later
    const optimizedGain = maxGain * Math.log(1 + i * 0.85);
    const optimized = Math.max(8, Math.min(94, Math.round(startScore + optimizedGain)));

    return { month, current, optimized, i };
  });

  return data;
}

// ─── Burnout Zone Config ─────────────────────────────────────────────────────
function getBurnoutZone(burnoutRisk) {
  if (burnoutRisk >= 70) return { start: 1, end: 5, color: 'rgba(239,68,68,0.08)', label: 'Critical crash window' };
  if (burnoutRisk >= 45) return { start: 3, end: 7, color: 'rgba(245,158,11,0.07)', label: 'Burnout risk window' };
  return null;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, domainColor }) {
  if (!active || !payload?.length) return null;
  const current   = payload.find(p => p.dataKey === 'current')?.value;
  const optimized = payload.find(p => p.dataKey === 'optimized')?.value;
  const gap = optimized - current;

  return (
    <div className="p-3 rounded-xl text-xs"
      style={{ background: '#161925', border: '1px solid rgba(255,255,255,0.1)', minWidth: 140 }}>
      <p className="font-bold text-white mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Current path
          </span>
          <span className="font-bold text-red-300 tabular-nums">{current}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: domainColor }} />
            Optimized
          </span>
          <span className="font-bold tabular-nums" style={{ color: domainColor }}>{optimized}</span>
        </div>
        {gap > 0 && (
          <div className="pt-1 mt-1 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-slate-500">Gap</span>
            <span className="font-bold text-green-400 tabular-nums">+{gap} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconColor, value, label, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="p-4 rounded-2xl flex flex-col gap-1"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconColor + '18' }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black tabular-nums" style={{ color: iconColor }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FutureYou() {
  const { computed } = useData();
  const [activeDomain, setActiveDomain] = useState('overall');

  const hasData   = computed?.hasData;
  const balance   = computed?.balance   ?? 65;
  const hScore    = computed?.healthScore?.score  ?? 62;
  const fScore    = computed?.financeScore?.score ?? 60;
  const cScore    = computed?.careerScore?.score  ?? 68;
  const burnoutRisk = computed?.burnout?.risk ?? 30;

  const domainScores = { overall: balance, health: hScore, finance: fScore, career: cScore };

  const tab = DOMAIN_TABS.find(t => t.id === activeDomain);
  const startScore = domainScores[activeDomain];

  const chartData = useMemo(
    () => generateProjection(startScore, activeDomain, burnoutRisk),
    [startScore, activeDomain, burnoutRisk]
  );

  const burnoutZone = useMemo(() => getBurnoutZone(burnoutRisk), [burnoutRisk]);

  const currentEnd  = chartData[12].current;
  const optimizedEnd = chartData[12].optimized;
  const gap12 = optimizedEnd - currentEnd;
  const currentDelta  = currentEnd  - startScore;
  const optimizedDelta = optimizedEnd - startScore;

  // Domain-specific action cards
  const actionCards = useMemo(() => {
    const actions = {
      overall: [
        { icon: '😴', title: 'Sleep 7–8 hrs consistently', impact: '+8 pts Health', domain: 'health', color: '#10b981' },
        { icon: '💸', title: 'Cut one impulse spend/week', impact: '+5 pts Finance', domain: 'finance', color: '#f59e0b' },
        { icon: '📚', title: '1 deep-work session daily', impact: '+7 pts Career', domain: 'career', color: '#3b82f6' },
      ],
      health: [
        { icon: '😴', title: 'Fix sleep schedule — same bedtime', impact: 'Fastest single lever', domain: 'health', color: '#10b981' },
        { icon: '🏃', title: '20-min walk 4x/week minimum', impact: 'Mental + physical uplift', domain: 'health', color: '#10b981' },
        { icon: '💧', title: 'Track water + nutrition daily', impact: 'Energy + cognition boost', domain: 'health', color: '#10b981' },
      ],
      finance: [
        { icon: '🎯', title: 'Automate ₹500/month savings', impact: 'Compounds to ₹6k+ savings', domain: 'finance', color: '#f59e0b' },
        { icon: '📊', title: 'Log every spend for 30 days', impact: 'Exposes hidden leaks', domain: 'finance', color: '#f59e0b' },
        { icon: '📈', title: 'Start one SIP regardless of size', impact: 'Habit > amount early on', domain: 'finance', color: '#f59e0b' },
      ],
      career: [
        { icon: '🧠', title: '3 DSA problems per day', impact: 'Interview-ready in 90 days', domain: 'career', color: '#3b82f6' },
        { icon: '🤝', title: 'One LinkedIn post per week', impact: 'Build visibility compound', domain: 'career', color: '#3b82f6' },
        { icon: '🚀', title: 'Ship one project this month', impact: 'Portfolio differentiator', domain: 'career', color: '#3b82f6' },
      ],
    };
    return actions[activeDomain] || actions.overall;
  }, [activeDomain]);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <TrendingUp size={17} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Future You</h1>
              <p className="text-[11px] text-slate-500">12-month life trajectory — current vs optimized</p>
            </div>
          </div>
          {burnoutRisk >= 45 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <AlertTriangle size={12} />
              Burnout risk {Math.round(burnoutRisk)}%
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6">

        {/* ── Baseline strip ── */}
        <div className="grid grid-cols-4 gap-3">
          {DOMAIN_TABS.map(t => (
            <div key={t.id} className="text-center p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${t.id === activeDomain ? t.color + '40' : 'rgba(255,255,255,0.06)'}` }}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{t.label}</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: t.color }}>
                {Math.round(domainScores[t.id])}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">now</p>
            </div>
          ))}
        </div>

        {/* ── Domain Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {DOMAIN_TABS.map(t => (
            <button key={t.id}
              onClick={() => setActiveDomain(t.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeDomain === t.id ? t.color + '20' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeDomain === t.id ? t.color + '50' : 'rgba(255,255,255,0.08)'}`,
                color: activeDomain === t.id ? t.color : '#94a3b8',
              }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ── Main Chart ── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeDomain}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Legend */}
            <div className="flex items-center gap-5 mb-5">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-0.5 rounded-full" style={{ background: tab.color }} />
                <span className="text-[11px] font-semibold" style={{ color: tab.color }}>Optimized You</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-0.5 rounded-full bg-red-400 opacity-60" style={{ borderStyle: 'dashed' }} />
                <span className="text-[11px] font-semibold text-red-400">Current path</span>
              </div>
              {burnoutZone && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(245,158,11,0.4)' }} />
                  <span className="text-[11px] text-amber-400/80">{burnoutZone.label}</span>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-opt-${activeDomain}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={tab.color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={tab.color} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="grad-current" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />

                {/* Burnout risk window */}
                {burnoutZone && (
                  <ReferenceArea
                    x1={MONTH_LABELS[burnoutZone.start]}
                    x2={MONTH_LABELS[burnoutZone.end]}
                    fill={burnoutZone.color}
                    label={{ value: '⚠', position: 'insideTopLeft', style: { fontSize: 11 } }}
                  />
                )}

                {/* Today marker */}
                <ReferenceLine x="Now" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />

                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false} tickLine={false} />

                <Tooltip content={<CustomTooltip domainColor={tab.color} />} />

                {/* Optimized path — on top */}
                <Area type="monotone" dataKey="optimized" stroke={tab.color} strokeWidth={2.5}
                  fill={`url(#grad-opt-${activeDomain})`} dot={false}
                  animationDuration={1600} animationEasing="ease-out" />

                {/* Current path — dashed */}
                <Area type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={1.8}
                  strokeDasharray="5 3" fill="url(#grad-current)" strokeOpacity={0.75}
                  dot={false} animationDuration={1800} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* ── Month-12 Divergence ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} iconColor={tab.color}
            value={`+${Math.max(0, optimizedDelta)} pts`}
            label="Optimized gain" sub={`Score ${Math.round(startScore)} → ${optimizedEnd}`}
            delay={0.1} />
          <StatCard
            icon={currentDelta >= 0 ? TrendingUp : TrendingDown}
            iconColor={currentDelta >= 0 ? '#94a3b8' : '#ef4444'}
            value={`${currentDelta >= 0 ? '+' : ''}${currentDelta} pts`}
            label="Current path" sub={`Score ${Math.round(startScore)} → ${currentEnd}`}
            delay={0.2} />
          <StatCard icon={Zap} iconColor="#f59e0b"
            value={`+${Math.max(0, gap12)} pts`}
            label="Divergence gap" sub="by month 12 vs current habits"
            delay={0.3} />
        </div>

        {/* ── Burnout callout ── */}
        {burnoutRisk >= 45 && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl flex items-start gap-4"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Flame size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-300 mb-1">Burnout crash zone detected in your current path</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                At your current pace, months {burnoutZone?.start}–{burnoutZone?.end} carry a {Math.round(burnoutRisk)}% burnout probability.
                The optimized trajectory routes around this window entirely by improving sleep baseline first.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── What the optimized path requires ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            What the optimized path requires
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionCards.map((card, i) => (
              <motion.div key={card.title}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}20` }}>
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="text-sm font-bold text-white mb-1 leading-snug">{card.title}</p>
                <p className="text-[11px] font-semibold px-2 py-0.5 rounded-md inline-block"
                  style={{ background: card.color + '15', color: card.color }}>
                  {card.impact}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Month 12 You — side-by-side ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            You in 12 months — current vs optimized
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Current You */}
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingDown size={11} /> Current You (no change)
              </p>
              <div className="space-y-2.5">
                {DOMAIN_TABS.filter(t => t.id !== 'overall').map(t => {
                  const s = domainScores[t.id];
                  const proj = generateProjection(s, t.id, burnoutRisk)[12].current;
                  return (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{t.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 tabular-nums">{Math.round(s)}</span>
                        <ArrowRight size={10} className="text-slate-600" />
                        <span className="text-sm font-bold tabular-nums"
                          style={{ color: proj < s ? '#ef4444' : '#94a3b8' }}>{proj}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optimized You */}
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield size={11} /> Optimized You
              </p>
              <div className="space-y-2.5">
                {DOMAIN_TABS.filter(t => t.id !== 'overall').map(t => {
                  const s = domainScores[t.id];
                  const proj = generateProjection(s, t.id, burnoutRisk)[12].optimized;
                  const gain = proj - Math.round(s);
                  return (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{t.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 tabular-nums">{Math.round(s)}</span>
                        <ArrowRight size={10} style={{ color: t.color }} />
                        <span className="text-sm font-bold tabular-nums" style={{ color: t.color }}>{proj}</span>
                        {gain > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 tabular-nums">+{gain}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── How BeyondSelf gets you there ── */}
        <div className="p-5 rounded-2xl"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap size={11} /> How BeyondSelf gets you there
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            {[
              { step: '01', title: 'Daily tracking', desc: 'Health, finance, career logged in one place. Patterns emerge automatically.' },
              { step: '02', title: 'Cross-domain cascades', desc: 'AI detects when sleep debt is causing your overspending — not you.' },
              { step: '03', title: 'Compounding habits', desc: 'Each week of consistency shifts the optimized line further from the current one.' },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <span className="text-[10px] font-black text-indigo-500 tabular-nums flex-shrink-0 mt-0.5">{item.step}</span>
                <div>
                  <p className="font-semibold text-white mb-0.5">{item.title}</p>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
