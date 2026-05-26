import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { GlassCard, PageHeader } from '../components/ui/Components';
import {
  TrendingUp, ShoppingBag, Clock, AlertTriangle, CheckCircle,
  XCircle, Plus, Minus, Lock, Zap, Trophy, Sparkles,
  BarChart3, ArrowRight, Shield, Flame,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'life_market_contracts_v2';
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';

const DOMAIN_META = {
  health:  { color: '#10b981', label: 'Health',  bg: 'rgba(16,185,129,0.1)'  },
  finance: { color: '#f59e0b', label: 'Finance', bg: 'rgba(245,158,11,0.1)'  },
  career:  { color: '#3b82f6', label: 'Career',  bg: 'rgba(59,130,246,0.1)'  },
};

const TEMPLATES = [
  {
    id: 'tmpl-headphones', emoji: '🎧', category: 'Tech',
    name: 'Premium Headphones', hint: 'WH-1000XM5 or similar', cost: 24999, days: 21,
    commitments: [
      { domain: 'career', label: '12h upskilling', target: 12, unit: 'hours', icon: '📚' },
      { domain: 'health', label: 'Skip 3 junk meals', target: 3, unit: 'meals', icon: '🥗' },
    ],
    penaltyLabel: 'Entertainment budget frozen for 2 weeks', color: '#3b82f6',
  },
  {
    id: 'tmpl-travel', emoji: '✈️', category: 'Travel',
    name: 'Weekend Getaway', hint: '2-night trip budget', cost: 8000, days: 30,
    commitments: [
      { domain: 'finance', label: 'Save ₹8K this month', target: 8000, unit: '₹', icon: '💰' },
      { domain: 'career',  label: '8h skill building',  target: 8,    unit: 'hours', icon: '🎯' },
    ],
    penaltyLabel: 'No dining out for 3 weeks', color: '#10b981',
  },
  {
    id: 'tmpl-chair', emoji: '🪑', category: 'Setup',
    name: 'Ergonomic Chair', hint: 'Herman Miller / DXRacer', cost: 35000, days: 28,
    commitments: [
      { domain: 'career', label: '20h deep work sessions', target: 20, unit: 'hours', icon: '💻' },
      { domain: 'health', label: '8 workout sessions',     target: 8,  unit: 'sessions', icon: '💪' },
    ],
    penaltyLabel: '₹5000 moved to mandatory savings', color: '#8b5cf6',
  },
  {
    id: 'tmpl-course', emoji: '🎓', category: 'Learning',
    name: 'Premium Course Bundle', hint: 'Udemy / Coursera annual', cost: 12000, days: 21,
    commitments: [
      { domain: 'career', label: 'Complete 1 certification',    target: 1,  unit: 'cert',   icon: '🏆' },
      { domain: 'health', label: 'Sleep 7h+ for 10 nights',     target: 10, unit: 'nights', icon: '😴' },
    ],
    penaltyLabel: 'No new subscriptions for 1 month', color: '#f59e0b',
  },
  {
    id: 'tmpl-dining', emoji: '🍽️', category: 'Food',
    name: 'Fine Dining Month', hint: '4 restaurant outings', cost: 6000, days: 30,
    commitments: [
      { domain: 'health',  label: '12 home-cooked meals',       target: 12, unit: 'meals', icon: '🥘' },
      { domain: 'finance', label: 'Zero impulse purchases (30d)', target: 30, unit: 'days', icon: '🚫' },
    ],
    penaltyLabel: 'Dining budget frozen for 2 weeks', color: '#f43f5e',
  },
  {
    id: 'tmpl-rest', emoji: '🌴', category: 'Wellness',
    name: 'Guilt-Free Rest Week', hint: 'Zero productivity pressure', cost: 0, days: 14,
    commitments: [
      { domain: 'career', label: '30h deep work first', target: 30, unit: 'hours',    icon: '⚡' },
      { domain: 'health', label: '6 workout sessions',  target: 6,  unit: 'sessions', icon: '🏃' },
    ],
    penaltyLabel: 'Rest revoked — back to grind mode', color: '#06b6d4',
  },
];

const EMOJI_OPTS = ['🎯','🎧','💻','📚','✈️','🏋️','🎮','🍱','🪑','🎓','🌴','🎸','📸','🏆','💎','🎨','🏠','🚗','⌚','📱'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function computeHLV(hs, fs, cs) {
  const h = Math.round(hs * 0.55);
  const f = Math.round(fs * 1.1);
  const c = Math.round(cs * 1.8);
  return { health: h, finance: f, career: c, total: h + f + c };
}

function loadContracts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveContracts(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function daysUntil(iso) {
  return Math.max(0, Math.floor((new Date(iso) - Date.now()) / 86_400_000));
}

function contractProgress(contract) {
  const total  = contract.commitments.reduce((s, c) => s + c.target, 0);
  const done   = contract.commitments.reduce((s, c) => s + (c.current || 0), 0);
  return total > 0 ? Math.min(100, (done / total) * 100) : 0;
}

async function groqFairTrade(form) {
  const key = localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '';
  if (!key) return { fair: true, reason: 'AI evaluation needs a Groq API key in Settings.', suggestion: '' };
  const prompt = `You are a life-balance AI. A user made this contract:
Goal: "${form.name}" worth ₹${form.cost || 0}
Commitments: ${form.commitments.map(c => `${c.label} (${c.domain})`).join(', ')}
Timeframe: ${form.days} days
Reply JSON only: {"fair":true/false,"reason":"verdict under 60 words","suggestion":"one tip under 40 words"}`;
  const res  = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0.3 }),
  });
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || '{}';
  try {
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    return JSON.parse(s >= 0 ? raw.slice(s, e + 1) : '{}');
  } catch { return { fair: true, reason: 'Trade looks reasonable.', suggestion: '' }; }
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedNum
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedNum({ value, color = 'white' }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now(), dur = 1300;
    function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(value * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={{ color }}>{disp.toLocaleString()}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HLV TICKER STRIP
// ─────────────────────────────────────────────────────────────────────────────
function HLVPanel({ hlv, healthScore, financeScore, careerScore }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <div className="glass-card p-5 rounded-2xl border border-white/[0.06]"
           style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.08) 0%,rgba(139,92,246,.05) 100%)' }}>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Your Hourly Life Value
              </p>
              <p className="text-[10px] text-slate-500">How much 1 hour of your life is worth across all domains</p>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-black font-mono text-indigo-300">
              ₹<AnimatedNum value={hlv.total} color="#a5b4fc" />
            </p>
            <p className="text-[10px] text-slate-500">per hour · combined</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Health HLV', v: hlv.health, score: healthScore, color: '#10b981', icon: '❤️', desc: 'Wellbeing capital' },
            { label: 'Finance HLV', v: hlv.finance, score: financeScore, color: '#f59e0b', icon: '💰', desc: 'Financial output' },
            { label: 'Career HLV', v: hlv.career, score: careerScore, color: '#3b82f6', icon: '🎯', desc: 'Productivity value' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <span className="text-xl block mb-1">{item.icon}</span>
              <p className="text-lg font-bold font-mono" style={{ color: item.color }}>
                ₹<AnimatedNum value={item.v} color={item.color} />
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{item.desc}</p>
              {/* mini score bar */}
              <div className="w-full h-0.5 bg-white/5 mt-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.score}%`, background: item.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
          <p className="text-xs text-slate-400">
            To buy ₹10,000 guilt-free:{' '}
            <span className="text-white font-bold font-mono">{Math.round(10000 / Math.max(1, hlv.career))} career hours</span>
            {' '}or{' '}
            <span className="text-white font-bold font-mono">{Math.round(10000 / Math.max(1, hlv.health))} health hours</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE CARD
// ─────────────────────────────────────────────────────────────────────────────
function TemplateCard({ tmpl, onAccept, alreadyActive }) {
  const [showPenalty, setShowPenalty] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={alreadyActive ? {} : { y: -4 }}
      className={`glass-card rounded-2xl border overflow-hidden flex flex-col ${alreadyActive ? 'opacity-50' : ''}`}
      style={{ borderColor: tmpl.color + '30' }}
    >
      <div className="h-1.5" style={{ background: `linear-gradient(to right, ${tmpl.color}, ${tmpl.color}66)` }} />

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{tmpl.emoji}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-white">{tmpl.name}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      style={{ background: tmpl.color + '22', color: tmpl.color }}>{tmpl.category}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{tmpl.hint}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-sm font-black font-mono" style={{ color: tmpl.color }}>
              {tmpl.cost > 0 ? `₹${tmpl.cost.toLocaleString()}` : 'FREE'}
            </p>
            <p className="text-[10px] text-slate-500">{tmpl.days}d deadline</p>
          </div>
        </div>

        {/* Commitments */}
        <div className="space-y-1.5 mb-3 flex-1">
          {tmpl.commitments.map((c, i) => {
            const dm = DOMAIN_META[c.domain];
            return (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span>{c.icon}</span>
                <span className="text-slate-300 flex-1">{c.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: dm.bg, color: dm.color }}>{c.domain}</span>
              </div>
            );
          })}
        </div>

        {/* Penalty toggle */}
        <button
          onClick={() => setShowPenalty(v => !v)}
          className="text-[10px] text-slate-500 hover:text-red-400 transition-colors text-left mb-3 flex items-center gap-1"
        >
          <Lock size={9} />{showPenalty ? 'Hide' : 'Show'} penalty if you fail
        </button>
        <AnimatePresence>
          {showPenalty && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/8 border border-red-500/15">
                <Lock size={11} className="text-red-400 flex-shrink-0" />
                <p className="text-[11px] text-red-300">{tmpl.penaltyLabel}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => !alreadyActive && onAccept(tmpl)}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-auto"
          style={{ background: alreadyActive ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${tmpl.color}, ${tmpl.color}aa)`, color: alreadyActive ? '#71717a' : 'white' }}
        >
          {alreadyActive ? '✓ Already Active' : '⚡ Sign Contract'}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE CONTRACT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ActiveContractCard({ contract, onProgress, onComplete, onForfeit }) {
  const progress  = contractProgress(contract);
  const daysLeft  = daysUntil(contract.deadline);
  const isActive  = contract.status === 'active';
  const isDone    = contract.status === 'completed';
  const isBreach  = contract.status === 'breached';
  const isAtRisk  = isActive && daysLeft < 5 && progress < 70;

  const ringColor = isBreach ? '#ef4444' : isDone ? '#10b981' : isAtRisk ? '#f59e0b' : (contract.color || '#6366f1');
  const circumference = 2 * Math.PI * 26;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`glass-card rounded-2xl border overflow-hidden ${
        isBreach ? 'border-red-500/30' : isDone ? 'border-emerald-500/30' : isAtRisk ? 'border-amber-500/30' : 'border-white/[0.06]'
      }`}
    >
      {/* Progress bar top */}
      <div className="h-1.5 bg-white/5 relative overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: ringColor }}
          animate={{ width: `${isBreach || isDone ? 100 : progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{contract.emoji}</span>
            <div>
              <p className="text-sm font-bold text-white">{contract.name}</p>
              <div className="mt-0.5">
                {isBreach  && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1"><XCircle size={9} /> BREACHED</span>}
                {isDone    && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle size={9} /> COMPLETED</span>}
                {isAtRisk  && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={9} /> AT RISK</span>}
                {isActive && !isAtRisk && <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">ON TRACK</span>}
              </div>
            </div>
          </div>

          {isActive && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold ${
              daysLeft < 3 ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : daysLeft < 7 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <Clock size={11} />
              {daysLeft}d left
            </div>
          )}
        </div>

        {/* Progress ring + stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="32" cy="32" r="26" fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold font-mono text-white">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {contract.cost > 0 && (
              <p className="text-xs text-slate-400">
                Goal: <span className="text-white font-mono font-bold">₹{contract.cost.toLocaleString()}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-500">
              {contract.commitments.reduce((s, c) => s + (c.current || 0), 0).toFixed(1)} /{' '}
              {contract.commitments.reduce((s, c) => s + c.target, 0)} units done
            </p>
            {contract.penaltyLabel && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400/70">
                <Lock size={9} />
                <span className="truncate">{contract.penaltyLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Commitment progress bars */}
        <div className="space-y-2.5 mb-4">
          {contract.commitments.map((comm, i) => {
            const curr = comm.current || 0;
            const pct  = Math.min(100, (curr / comm.target) * 100);
            const dm   = DOMAIN_META[comm.domain] || DOMAIN_META.career;
            return (
              <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{comm.icon || '📌'}</span>
                    <span className="text-xs text-slate-300">{comm.label}</span>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onProgress(contract.id, i, -1)}
                        disabled={curr <= 0}
                        className="w-5 h-5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-25"
                      ><Minus size={9} /></button>
                      <span className="text-[10px] font-mono text-white w-12 text-center tabular-nums">
                        {curr}/{comm.target}
                      </span>
                      <button
                        onClick={() => onProgress(contract.id, i, +1)}
                        disabled={curr >= comm.target}
                        className="w-5 h-5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all disabled:opacity-25"
                      ><Plus size={9} /></button>
                    </div>
                  )}
                  {!isActive && (
                    <span className="text-[10px] font-mono text-slate-400">{curr}/{comm.target}</span>
                  )}
                </div>
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: dm.color }}
                    animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {isActive && (
          <div className="flex gap-2">
            {progress >= 100 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onComplete(contract.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-all"
              >🎉 Claim Reward</motion.button>
            )}
            {progress < 100 && (
              <button
                onClick={() => onForfeit(contract.id)}
                className="ml-auto px-3 py-2 rounded-xl text-[10px] text-red-400/60 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 transition-all"
              >Forfeit</button>
            )}
          </div>
        )}

        {isBreach && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-xs text-red-400 font-semibold">🔒 PENALTY ACTIVE: {contract.penaltyLabel}</p>
          </div>
        )}
        {isDone && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-xs text-emerald-400 font-semibold">🏆 Contract fulfilled! Reward earned.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNING CEREMONY
// ─────────────────────────────────────────────────────────────────────────────
function SigningCeremony({ contract, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="text-8xl mb-6"
        >{contract.emoji}</motion.div>

        <motion.div
          initial={{ scale: 0, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: [-15, 5, 0], opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 350, damping: 18 }}
          className="inline-block px-8 py-4 rounded-3xl border-4 border-emerald-400 mb-4"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <p className="text-3xl font-black tracking-widest text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
            ✦ SIGNED ✦
          </p>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="text-sm text-slate-200 font-semibold">{contract.name}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
          className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-2">
          <Lock size={11} className="text-red-400" />
          Penalty locked: {contract.penaltyLabel || 'Contract enforced'}
        </motion.p>

        {/* Particle burst */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: ['#10b981','#3b82f6','#8b5cf6','#f59e0b'][i % 4],
              left: '50%', top: '50%',
            }}
            animate={{
              x: Math.cos(i * 45 * Math.PI / 180) * 120,
              y: Math.sin(i * 45 * Math.PI / 180) * 120,
              opacity: [1, 0],
              scale: [1, 0],
            }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT WIZARD
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  name: '', emoji: '🎯', cost: '', days: 14,
  commitments: [{ domain: 'career', label: '', target: '', unit: 'hours', icon: '📚' }],
  penaltyLabel: '',
};

function ContractWizard({ onSign, onClose }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);

  function setF(patch) { setForm(f => ({ ...f, ...patch })); }

  function setCommitment(i, patch) {
    setForm(f => {
      const c = [...f.commitments];
      c[i] = { ...c[i], ...patch };
      return { ...f, commitments: c };
    });
  }

  function addCommitment() {
    if (form.commitments.length >= 3) return;
    setF({ commitments: [...form.commitments, { domain: 'health', label: '', target: '', unit: 'sessions', icon: '💪' }] });
  }

  function removeCommitment(i) {
    setF({ commitments: form.commitments.filter((_, j) => j !== i) });
  }

  async function evaluate() {
    setLoading(true);
    try { setVerdict(await groqFairTrade(form)); } catch { setVerdict({ fair: true, reason: 'Could not reach AI.', suggestion: '' }); }
    setLoading(false);
  }

  function handleSign() {
    const contract = {
      id: uuidv4(),
      emoji: form.emoji,
      name: form.name,
      cost: Number(form.cost) || 0,
      status: 'active',
      color: '#6366f1',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + form.days * 86_400_000).toISOString(),
      commitments: form.commitments.map(c => ({ ...c, target: Number(c.target) || 1, current: 0 })),
      penaltyLabel: form.penaltyLabel,
    };
    onSign(contract);
  }

  const step1Valid = !!form.name;
  const step2Valid = form.commitments.every(c => c.label && Number(c.target) > 0);
  const step3Valid = step2Valid && !!form.penaltyLabel;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
        className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Wizard header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Custom Contract
            </h3>
            <p className="text-[10px] text-slate-500">Step {step} of 3 · {['Define Goal', 'Set Commitments', 'Penalty & Review'][step - 1]}</p>
          </div>
          <div className="flex gap-1.5">
            {[1,2,3].map(n => (
              <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${step >= n ? 'w-8 bg-indigo-500' : 'w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* ── STEP 1: Define goal ── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Pick an emoji</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {EMOJI_OPTS.map(e => (
                    <button key={e} onClick={() => setF({ emoji: e })}
                      className={`w-8 h-8 rounded-lg text-base transition-all ${form.emoji === e ? 'bg-indigo-500/25 ring-2 ring-indigo-500' : 'bg-white/5 hover:bg-white/10'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">What do you want?</label>
                <input className="input-premium" placeholder="e.g. Sony WH-1000XM5 Headphones" value={form.name} onChange={e => setF({ name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Value / Cost (₹)</label>
                  <input className="input-premium" placeholder="e.g. 24999" type="number" value={form.cost} onChange={e => setF({ cost: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Deadline (days)</label>
                  <input className="input-premium" type="number" min={3} max={90} value={form.days} onChange={e => setF({ days: Number(e.target.value) })} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Commitments ── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <p className="text-xs text-slate-400">What habits will you trade to earn this guilt-free?</p>
              {form.commitments.map((comm, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                  <div className="flex gap-2">
                    <select className="input-premium flex-1 text-xs" value={comm.domain}
                      onChange={e => setCommitment(i, { domain: e.target.value })}>
                      <option value="career">Career</option>
                      <option value="health">Health</option>
                      <option value="finance">Finance</option>
                    </select>
                    {form.commitments.length > 1 && (
                      <button onClick={() => removeCommitment(i)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">✕</button>
                    )}
                  </div>
                  <input className="input-premium text-xs" placeholder="e.g. Complete 3 LeetCode problems daily"
                    value={comm.label} onChange={e => setCommitment(i, { label: e.target.value })} />
                  <div className="flex gap-2">
                    <input className="input-premium flex-1 text-xs" placeholder="Target" type="number" min={1}
                      value={comm.target} onChange={e => setCommitment(i, { target: e.target.value })} />
                    <select className="input-premium flex-1 text-xs" value={comm.unit}
                      onChange={e => setCommitment(i, { unit: e.target.value })}>
                      <option value="hours">hours</option>
                      <option value="sessions">sessions</option>
                      <option value="meals">meals</option>
                      <option value="days">days</option>
                      <option value="problems">problems</option>
                      <option value="pages">pages</option>
                    </select>
                  </div>
                </div>
              ))}
              {form.commitments.length < 3 && (
                <button onClick={addCommitment}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-xs text-slate-400 hover:border-white/40 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Plus size={12} /> Add another commitment
                </button>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Penalty + Review ── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">
                  Penalty if you fail (make it real)
                </label>
                <input className="input-premium" placeholder="e.g. No gaming for 2 weeks"
                  value={form.penaltyLabel} onChange={e => setF({ penaltyLabel: e.target.value })} />
              </div>

              {/* Contract preview */}
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{form.emoji} Contract Preview</p>
                <p className="text-xs text-slate-300"><span className="text-slate-500">Goal:</span> {form.name} {form.cost ? `(₹${Number(form.cost).toLocaleString()})` : ''}</p>
                <p className="text-xs text-slate-300"><span className="text-slate-500">Deadline:</span> {form.days} days from today</p>
                {form.commitments.filter(c => c.label).map((c, i) => (
                  <p key={i} className="text-xs text-slate-300">
                    <span className="text-slate-500">Commit {i + 1}:</span> {c.label} ({c.target} {c.unit})
                  </p>
                ))}
                <p className="text-xs text-slate-300"><span className="text-slate-500">Penalty:</span> {form.penaltyLabel || '—'}</p>
              </div>

              {/* AI Fair-trade eval */}
              <button onClick={evaluate} disabled={loading}
                className="w-full py-2.5 rounded-xl border border-purple-500/30 text-xs font-semibold text-purple-300 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Evaluating...</>
                  : <><Sparkles size={13} /> AI Fair-Trade Analysis</>}
              </button>
              <AnimatePresence>
                {verdict && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl text-xs border ${verdict.fair ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
                    <p className={`font-bold mb-1 ${verdict.fair ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {verdict.fair ? '✅ FAIR TRADE' : '⚠️ REVIEW NEEDED'}
                    </p>
                    <p className="text-slate-400">{verdict.reason}</p>
                    {verdict.suggestion && <p className="text-slate-500 mt-1 italic">{verdict.suggestion}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white transition-all">← Back</button>
            )}
            {step < 3 ? (
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s + 1)}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white disabled:opacity-40 transition-all">
                Next →
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleSign}
                disabled={!step3Valid}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white disabled:opacity-40 transition-all">
                ✦ Sign Contract
              </motion.button>
            )}
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LifeMarket() {
  const { computed } = useData();
  const healthScore  = computed?.healthScore?.score  || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore  = computed?.careerScore?.score  || 0;
  const hlv = useMemo(() => computeHLV(healthScore, financeScore, careerScore), [healthScore, financeScore, careerScore]);

  const [tab, setTab]                   = useState('market');
  const [contracts, setContracts]       = useState(loadContracts);
  const [showWizard, setShowWizard]     = useState(false);
  const [signing, setSigning]           = useState(null);

  useEffect(() => { saveContracts(contracts); }, [contracts]);

  const active    = contracts.filter(c => c.status === 'active');
  const done      = contracts.filter(c => c.status === 'completed');
  const breached  = contracts.filter(c => c.status === 'breached');
  const activeIds = active.filter(c => c.templateId).map(c => c.templateId);

  const signTemplate = useCallback(tmpl => {
    const contract = {
      id: uuidv4(), templateId: tmpl.id,
      emoji: tmpl.emoji, name: tmpl.name, cost: tmpl.cost, color: tmpl.color,
      status: 'active',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + tmpl.days * 86_400_000).toISOString(),
      commitments: tmpl.commitments.map(c => ({ ...c, current: 0 })),
      penaltyLabel: tmpl.penaltyLabel,
    };
    setContracts(p => [...p, contract]);
    setSigning(contract);
    setTab('active');
  }, []);

  const signCustom = useCallback(contract => {
    setContracts(p => [...p, contract]);
    setShowWizard(false);
    setSigning(contract);
    setTab('active');
  }, []);

  const updateProgress = useCallback((id, idx, delta) => {
    setContracts(p => p.map(c => {
      if (c.id !== id) return c;
      const comms = c.commitments.map((cm, i) => i !== idx ? cm
        : { ...cm, current: Math.max(0, Math.min(cm.target, (cm.current || 0) + delta)) });
      return { ...c, commitments: comms };
    }));
  }, []);

  const completeContract = useCallback(id => {
    setContracts(p => p.map(c => c.id !== id ? c : { ...c, status: 'completed', completedAt: new Date().toISOString() }));
  }, []);

  const forfeitContract = useCallback(id => {
    setContracts(p => p.map(c => c.id !== id ? c : { ...c, status: 'breached', breachedAt: new Date().toISOString() }));
  }, []);

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader
        title="Life Economy Market"
        subtitle="Every reward has a price in life capital — trade habits, not guilt."
        icon="⚖️"
      />

      {/* HLV Panel */}
      <HLVPanel hlv={hlv} healthScore={healthScore} financeScore={financeScore} careerScore={careerScore} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {[
          { id: 'market',  label: '🏪 Market',               Icon: ShoppingBag },
          { id: 'active',  label: `⚡ Active (${active.length})`, Icon: Zap },
          { id: 'history', label: `🏆 History (${done.length + breached.length})`, Icon: Trophy },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MARKET TAB ── */}
      {tab === 'market' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Available Contracts
            </h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center gap-2"
            >
              <Plus size={13} /> Custom Contract
            </motion.button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl, i) => (
              <motion.div key={tmpl.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <TemplateCard tmpl={tmpl} onAccept={signTemplate} alreadyActive={activeIds.includes(tmpl.id)} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── ACTIVE TAB ── */}
      {tab === 'active' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {active.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-white font-semibold mb-2">No active contracts</p>
              <p className="text-xs text-slate-500 mb-6">Sign a contract from the Market to start trading habits for rewards</p>
              <button onClick={() => setTab('market')}
                className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 transition-all">
                Browse Market →
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <AnimatePresence>
                {active.map(c => (
                  <ActiveContractCard key={c.id} contract={c}
                    onProgress={updateProgress} onComplete={completeContract} onForfeit={forfeitContract} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {done.length === 0 && breached.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📜</div>
              <p className="text-slate-400 text-sm">No contract history yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {done.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <Trophy size={14} /> Completed ({done.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {done.map(c => <ActiveContractCard key={c.id} contract={c} onProgress={() => {}} onComplete={() => {}} onForfeit={() => {}} />)}
                  </div>
                </div>
              )}
              {breached.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <XCircle size={14} /> Breached ({breached.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {breached.map(c => <ActiveContractCard key={c.id} contract={c} onProgress={() => {}} onComplete={() => {}} onForfeit={() => {}} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Wizard */}
      <AnimatePresence>
        {showWizard && <ContractWizard onSign={signCustom} onClose={() => setShowWizard(false)} />}
      </AnimatePresence>

      {/* Signing ceremony */}
      <AnimatePresence>
        {signing && <SigningCeremony contract={signing} onDone={() => setSigning(null)} />}
      </AnimatePresence>
    </div>
  );
}
