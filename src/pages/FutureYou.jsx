import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Zap, AlertTriangle,
  ChevronDown, Download, Scale, Heart, Wallet, Briefcase
} from 'lucide-react';

const DOMAIN_TABS = [
  { id: 'overall', label: 'Life Balance', color: '#6366f1', icon: Scale,     bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
  { id: 'health',  label: 'Health',       color: '#10b981', icon: Heart,     bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { id: 'finance', label: 'Finance',      color: '#f59e0b', icon: Wallet,    bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  { id: 'career',  label: 'Career',       color: '#3b82f6', icon: Briefcase, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
];

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

function generateProjection(startScore, domainId, burnoutRisk = 0) {
  const drift = startScore < 45 ? -2.2 : startScore < 60 ? -0.9 : startScore < 72 ? +0.1 : +0.4;
  const maxGain = domainId === 'health' ? 4.8 : domainId === 'finance' ? 4.0 : domainId === 'career' ? 4.5 : 4.3;

  return MONTH_LABELS.map((month, i) => {
    const noise = Math.sin(i * 1.9 + domainId.length * 0.7) * 1.4;
    const currentRaw  = startScore + drift * i + noise;
    const burnoutPull = burnoutRisk > 60 && i >= 2 && i <= 6 ? -(burnoutRisk / 100) * 3 * (i - 1) : 0;
    const current = Math.max(8, Math.min(96, Math.round(currentRaw + burnoutPull)));
    
    const optimizedGain = maxGain * Math.log(1 + i * 0.85);
    const optimized = Math.max(8, Math.min(94, Math.round(startScore + optimizedGain)));
    
    return { month, current, optimized, i };
  });
}

function getBurnoutZone(burnoutRisk) {
  if (burnoutRisk >= 70) return { start: 1, end: 5, color: 'rgba(239,68,68,0.08)', label: 'Critical crash window' };
  if (burnoutRisk >= 45) return { start: 3, end: 7, color: 'rgba(245,158,11,0.07)', label: 'Burnout risk window' };
  return null;
}

function CustomTooltip({ active, payload, label, domainColor }) {
  if (!active || !payload?.length) return null;
  const current   = payload.find(p => p.dataKey === 'current')?.value;
  const optimized = payload.find(p => p.dataKey === 'optimized')?.value;
  const gap = optimized - current;

  return (
    <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-[13px] shadow-xl min-w-[160px]">
      <p className="font-bold text-[#f0f0f3] mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#8b949e] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Current path
          </span>
          <span className="font-bold text-red-400 tabular-nums">{current}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#8b949e] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: domainColor }} /> Optimized
          </span>
          <span className="font-bold tabular-nums" style={{ color: domainColor }}>{optimized}</span>
        </div>
        {gap > 0 && (
          <div className="pt-2 mt-2 border-t border-[#30363d] flex items-center justify-between">
            <span className="text-[#8b949e]">Gap</span>
            <span className="font-bold text-emerald-400 tabular-nums">+{gap} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FutureYou() {
  const { computed } = useData();
  const [activeDomain, setActiveDomain] = useState('overall');

  const balance   = computed?.balance   ?? 65;
  const hScore    = computed?.healthScore?.score  ?? 62;
  const fScore    = computed?.financeScore?.score ?? 60;
  const cScore    = computed?.careerScore?.score  ?? 68;
  const burnoutRisk = computed?.burnout?.risk ?? 30;

  const domainScores = { overall: balance, health: hScore, finance: fScore, career: cScore };
  const tab = DOMAIN_TABS.find(t => t.id === activeDomain);
  const startScore = domainScores[activeDomain];

  const chartData = useMemo(() => generateProjection(startScore, activeDomain, burnoutRisk), [startScore, activeDomain, burnoutRisk]);
  const burnoutZone = useMemo(() => getBurnoutZone(burnoutRisk), [burnoutRisk]);

  const currentEnd  = chartData[12].current;
  const optimizedEnd = chartData[12].optimized;
  const gap12 = optimizedEnd - currentEnd;
  const currentDelta  = currentEnd  - startScore;
  const optimizedDelta = optimizedEnd - startScore;

  const actionCards = useMemo(() => {
    const actions = {
      overall: [
        { icon: '😴', title: 'Sleep 7–8 hrs consistently', impact: '+8 pts Health', color: '#10b981' },
        { icon: '🪙', title: 'Cut one impulse spend/week', impact: '+5 pts Finance', color: '#f59e0b' },
        { icon: '📚', title: '1 deep-work session daily', impact: '+7 pts Career', color: '#3b82f6' },
      ],
      health: [
        { icon: '😴', title: 'Fix sleep schedule — same bedtime', impact: 'Fastest single lever', color: '#10b981' },
        { icon: '🏃', title: '20-min walk 4x/week minimum', impact: 'Mental + physical uplift', color: '#10b981' },
        { icon: '💧', title: 'Track water + nutrition daily', impact: 'Energy + cognition boost', color: '#10b981' },
      ],
      finance: [
        { icon: '🎯', title: 'Automate ₹500/month savings', impact: 'Compounds to ₹6k+ savings', color: '#f59e0b' },
        { icon: '📊', title: 'Log every spend for 30 days', impact: 'Exposes hidden leaks', color: '#f59e0b' },
        { icon: '📈', title: 'Start one SIP regardless of size', impact: 'Habit > amount early on', color: '#f59e0b' },
      ],
      career: [
        { icon: '🧠', title: '3 DSA problems per day', impact: 'Interview-ready in 90 days', color: '#3b82f6' },
        { icon: '🤝', title: 'One LinkedIn post per week', impact: 'Build visibility compound', color: '#3b82f6' },
        { icon: '🚀', title: 'Ship one project this month', impact: 'Portfolio differentiator', color: '#3b82f6' },
      ],
    };
    return actions[activeDomain] || actions.overall;
  }, [activeDomain]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-6 py-6 md:px-10 md:py-8 pb-24 lg:pb-10 space-y-6">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#f0f0f3] tracking-tight">Future You</h1>
            <p className="text-[13px] text-[#8b949e] mt-0.5">12-month life trajectory — current vs optimized</p>
          </div>
        </div>
        <div className="flex gap-3">
          {burnoutRisk >= 45 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle size={14} /> Burnout risk {Math.round(burnoutRisk)}%
            </motion.div>
          )}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#30363d] bg-[#161b22] text-[#f0f0f3] text-[12px] font-semibold hover:bg-[#21262d] transition-colors">
            <Download size={14} /> Export <ChevronDown size={14} className="text-[#8b949e]" />
          </button>
        </div>
      </div>

      {/* ── Domain Selector Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {DOMAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveDomain(t.id)}
            className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all ${
              activeDomain === t.id 
                ? 'bg-[#161b22] border-[#444c56]' 
                : 'bg-[#0d1117] border-[#30363d] hover:border-[#444c56]'
            }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${t.bg} ${t.border}`}>
              <t.icon size={20} className={t.text} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-0.5">{t.label}</p>
              <p className={`text-[22px] font-black ${t.text} leading-none mb-1 tabular-nums`}>{Math.round(domainScores[t.id])}</p>
              <p className="text-[11px] text-[#8b949e]">now</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Main Chart ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeDomain}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6">
          
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-[3px] rounded-full" style={{ background: tab.color }} />
              <span className="text-[12px] font-semibold text-[#f0f0f3]">Optimized You</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-[3px] rounded-full" style={{ background: 'transparent', borderTop: '2px dashed #ef4444' }} />
              <span className="text-[12px] font-semibold text-[#ef4444]">Current path</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-opt-${activeDomain}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={tab.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={tab.color} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#30363d" strokeDasharray="3 3" vertical={false} />
              
              {burnoutZone && (
                <ReferenceArea x1={MONTH_LABELS[burnoutZone.start]} x2={MONTH_LABELS[burnoutZone.end]} fill={burnoutZone.color} />
              )}
              
              <ReferenceLine x="Now" stroke="#30363d" strokeDasharray="4 4" />
              
              <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip domainColor={tab.color} />} />
              
              <Area type="monotone" dataKey="optimized" stroke={tab.color} strokeWidth={2.5} fill={`url(#grad-opt-${activeDomain})`} dot={false} animationDuration={1000} />
              <Area type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={1.8} strokeDasharray="5 3" fill="transparent" dot={false} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>

      {/* ── Mid 3 Cards (Divergence) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">Optimized Gain</p>
            <p className="text-[22px] font-black text-indigo-400 mb-1 tabular-nums">+{Math.max(0, optimizedDelta)} pts</p>
            <p className="text-[12px] text-[#8b949e]">Score {Math.round(startScore)} → {optimizedEnd}</p>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">Current Path</p>
            <p className="text-[22px] font-black text-red-400 mb-1 tabular-nums">{currentDelta >= 0 ? '+' : ''}{currentDelta} pts</p>
            <p className="text-[12px] text-[#8b949e]">Score {Math.round(startScore)} → {currentEnd}</p>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Zap size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">Divergence Gap</p>
            <p className="text-[22px] font-black text-amber-400 mb-1 tabular-nums">+{Math.max(0, gap12)} pts</p>
            <p className="text-[12px] text-[#8b949e]">by month 12 vs current habits</p>
          </div>
        </div>
      </div>

      {/* ── What the optimized path requires ── */}
      <div>
        <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-3">What the optimized path requires</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actionCards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 flex items-center gap-4">
              <span className="text-[28px] flex-shrink-0 leading-none">{card.icon}</span>
              <div>
                <p className="text-[13px] font-bold text-[#f0f0f3] mb-1">{card.title}</p>
                <p className="text-[11px] font-semibold" style={{ color: card.color }}>{card.impact}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Bottom Section (3 Columns) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left Block */}
        <div>
          <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-3">You in 12 months — current vs optimized</p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 space-y-6">
            {DOMAIN_TABS.filter(t => t.id !== 'overall').map(t => {
              const s = domainScores[t.id];
              const proj = generateProjection(s, t.id, burnoutRisk)[12].current;
              return (
                <div key={t.id} className="flex justify-between items-center">
                  <span className="text-[13px] text-[#8b949e] font-medium">{t.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#8b949e]">{Math.round(s)}</span>
                    <span className="text-[13px] text-[#8b949e]">→</span>
                    <span className={`text-[13px] font-medium tabular-nums ${proj < s ? 'text-red-400' : 'text-[#f0f0f3]'}`}>{proj}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Block */}
        <div>
          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-3">Optimized You</p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 space-y-6">
            {DOMAIN_TABS.filter(t => t.id !== 'overall').map(t => {
              const s = domainScores[t.id];
              const proj = generateProjection(s, t.id, burnoutRisk)[12].optimized;
              const gain = proj - Math.round(s);
              return (
                <div key={t.id} className="flex justify-between items-center">
                  <span className="text-[13px] text-[#8b949e] font-medium">{t.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#8b949e]">{Math.round(s)}</span>
                    <span className="text-[13px] text-[#8b949e]">→</span>
                    <span className="text-[13px] font-medium text-emerald-400 tabular-nums">{proj}</span>
                    <span className="text-[13px] font-medium text-emerald-400 tabular-nums min-w-[28px] text-right">+{gain}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Block */}
        <div>
          <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-3">How BeyondSelf gets you there</p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 space-y-6">
            {[
              { step: '01', title: 'Daily tracking', desc: 'Health, finance, career logged in one place. Patterns emerge automatically.' },
              { step: '02', title: 'Cross-domain cascades', desc: 'AI detects when sleep debt is causing your overspending — not you.' },
              { step: '03', title: 'Compounding habits', desc: 'Each week of consistency shifts the optimized line further from the current one.' },
            ].map(item => (
              <div key={item.step} className="flex gap-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">{item.step}</div>
                <div>
                  <p className="text-[13px] font-medium text-[#f0f0f3] mb-1 leading-none">{item.title}</p>
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
