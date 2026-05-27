import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import {
  Briefcase, Heart, TrendingDown, Flame, Users, GraduationCap,
  AlertTriangle, ChevronRight, RotateCcw, Shield, Clock,
  ArrowRight, Zap, Activity, CheckCircle, XCircle
} from 'lucide-react';

// ─── Scenario Definitions ────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'jobLoss',
    Icon: Briefcase,
    emoji: '💼',
    label: 'Job Loss / Layoff',
    tagline: 'Sudden income gone. What breaks first?',
    color: '#f59e0b',
    impacts: { health: -20, finance: -55, career: -30 },
    cascades: [
      { from: 'Finance', to: 'Health', why: 'Financial stress spikes cortisol → anxiety, poor sleep, comfort eating' },
      { from: 'Finance', to: 'Career', why: 'Desperation narrows job search, confidence collapses in interviews' },
      { from: 'Career', to: 'Health', why: 'Loss of purpose and identity raises chronic stress baseline' },
    ],
    resilience: 'Finance runway is your #1 buffer. Every month of emergency fund = 1 week of stability.',
    recovery: { mild: 8, moderate: 16, severe: 28, catastrophic: 52 },
  },
  {
    id: 'medical',
    Icon: Heart,
    emoji: '🏥',
    label: 'Medical Emergency',
    tagline: 'Your body fails. Everything else follows.',
    color: '#ef4444',
    impacts: { health: -60, finance: -35, career: -20 },
    cascades: [
      { from: 'Health', to: 'Finance', why: 'Medical bills drain savings. Inability to work cuts monthly income.' },
      { from: 'Health', to: 'Career', why: 'Recovery time = missed deadlines, skill atrophy, professional gap' },
      { from: 'Finance', to: 'Health', why: 'Reduced funds delay proper care. Nutrition and medication suffer.' },
    ],
    resilience: 'Health score buffers recovery speed. Higher fitness = faster bounce-back post-treatment.',
    recovery: { mild: 6, moderate: 14, severe: 32, catastrophic: 78 },
  },
  {
    id: 'financialCrash',
    Icon: TrendingDown,
    emoji: '📉',
    label: 'Financial Crash',
    tagline: 'Savings wiped. Debt spiral initiated.',
    color: '#f43f5e',
    impacts: { health: -20, finance: -60, career: -15 },
    cascades: [
      { from: 'Finance', to: 'Health', why: 'Money anxiety triggers chronic stress → immune suppression, sleep loss' },
      { from: 'Finance', to: 'Career', why: 'Panic forces poor career decisions: wrong job for wrong pay' },
      { from: 'Health', to: 'Career', why: 'Stress-impaired cognition reduces work quality and output' },
    ],
    resilience: 'Investment diversification and debt-to-income ratio are your shock absorbers.',
    recovery: { mild: 12, moderate: 24, severe: 48, catastrophic: 104 },
  },
  {
    id: 'burnout',
    Icon: Flame,
    emoji: '🔥',
    label: 'Burnout & Mental Collapse',
    tagline: 'Running on empty. System shutdown imminent.',
    color: '#8b5cf6',
    impacts: { health: -55, finance: -15, career: -40 },
    cascades: [
      { from: 'Health', to: 'Career', why: 'Cognitive fog and emotional exhaustion destroy output quality' },
      { from: 'Career', to: 'Finance', why: 'Income at risk. Impaired judgment creates costly financial errors.' },
      { from: 'Career', to: 'Health', why: 'Losing professional identity deepens depression and withdrawal' },
    ],
    resilience: 'Sleep consistency and recovery habits are your early warning system against this crash.',
    recovery: { mild: 10, moderate: 20, severe: 40, catastrophic: 72 },
  },
  {
    id: 'relationship',
    Icon: Users,
    emoji: '💔',
    label: 'Relationship Breakdown',
    tagline: 'Emotional foundation gone. Everything wavers.',
    color: '#ec4899',
    impacts: { health: -35, finance: -20, career: -25 },
    cascades: [
      { from: 'Health', to: 'Career', why: 'Emotional distress and grief reduce focus, attendance, output' },
      { from: 'Health', to: 'Finance', why: 'Grief spending, changed living costs, impulsive decisions' },
      { from: 'Career', to: 'Finance', why: 'Reduced performance risks bonuses, promotions, income' },
    ],
    resilience: 'Social resilience and independent routines (sleep, exercise) are your anchors.',
    recovery: { mild: 8, moderate: 18, severe: 36, catastrophic: 60 },
  },
  {
    id: 'academic',
    Icon: GraduationCap,
    emoji: '📚',
    label: 'Academic / Career Failure',
    tagline: 'The path you built collapses underfoot.',
    color: '#06b6d4',
    impacts: { health: -25, finance: -15, career: -50 },
    cascades: [
      { from: 'Career', to: 'Health', why: 'Shame, identity crisis, and lost direction damage mental health' },
      { from: 'Career', to: 'Finance', why: 'Reduced earning potential. Wasted investment in time and money.' },
      { from: 'Health', to: 'Career', why: 'Depression makes rebuilding motivation and direction harder' },
    ],
    resilience: 'Skill breadth and portfolio depth are your alternatives when the primary path closes.',
    recovery: { mild: 16, moderate: 30, severe: 52, catastrophic: 78 },
  },
];

const INTENSITIES = [
  { id: 'mild',         label: 'Mild',          mult: 0.4,  color: '#10b981', desc: 'Manageable setback'     },
  { id: 'moderate',     label: 'Moderate',      mult: 0.7,  color: '#f59e0b', desc: 'Significant disruption' },
  { id: 'severe',       label: 'Severe',        mult: 1.0,  color: '#ef4444', desc: 'Life-altering event'    },
  { id: 'catastrophic', label: 'Catastrophic',  mult: 1.4,  color: '#7c3aed', desc: 'Complete collapse'      },
];

const DOMAIN_META = {
  health:  { label: 'Health',  color: '#10b981' },
  finance: { label: 'Finance', color: '#f59e0b' },
  career:  { label: 'Career',  color: '#3b82f6' },
};

// ─── Animated Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ original, drop, color, domain, size = 96, animate: doAnimate = false, delay = 0 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const after = Math.max(0, Math.round(original + drop));
  const origOffset = circ - (original / 100) * circ;
  const dropOffset = circ - (after / 100) * circ;
  const meta = DOMAIN_META[domain];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
          {/* Ghost original ring */}
          {doAnimate && (
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={color + '25'} strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={origOffset}
              strokeLinecap="round" />
          )}
          {/* Animated draining ring */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: origOffset, stroke: color }}
            animate={doAnimate
              ? { strokeDashoffset: dropOffset, stroke: drop < -20 ? '#ef4444' : drop < -10 ? '#f59e0b' : color }
              : { strokeDashoffset: origOffset, stroke: color }
            }
            transition={{ duration: 1.8, ease: 'easeInOut', delay }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <motion.span
            className="text-[22px] font-black tabular-nums leading-none"
            style={{ color: doAnimate && drop < -10 ? '#ef4444' : color }}
          >
            {doAnimate ? after : Math.round(original)}
          </motion.span>
          {doAnimate && drop !== 0 && (
            <motion.span
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 1.2 }}
              className="text-[10px] font-bold text-red-400 tabular-nums"
            >
              {Math.round(drop)}
            </motion.span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}

// ─── Cascade Arrow Row ────────────────────────────────────────────────────────
function CascadeRow({ from, to, why, index, visible }) {
  const fromColor = Object.values(DOMAIN_META).find(m => m.label === from)?.color || '#94a3b8';
  const toColor   = Object.values(DOMAIN_META).find(m => m.label === to)?.color   || '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
      transition={{ delay: index * 0.25 + 0.5, duration: 0.4 }}
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: fromColor + '20', color: fromColor }}>
          {from}
        </span>
        <ArrowRight size={12} className="text-red-400 flex-shrink-0" />
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: toColor + '20', color: toColor }}>
          {to}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{why}</p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StressTest() {
  const { lifeScore = 72, healthScore = 70, financeScore = 65, careerScore = 68 } = useData();

  const [phase, setPhase] = useState('select'); // select | configure | simulating | result
  const [scenario, setScenario] = useState(null);
  const [intensity, setIntensity] = useState(INTENSITIES[1]);
  const [simulProgress, setSimulProgress] = useState(0);
  const timerRef = useRef(null);

  const baseScores = { health: healthScore, finance: financeScore, career: careerScore };

  const computedDrops = scenario
    ? {
        health:  Math.round(scenario.impacts.health  * intensity.mult),
        finance: Math.round(scenario.impacts.finance * intensity.mult),
        career:  Math.round(scenario.impacts.career  * intensity.mult),
      }
    : { health: 0, finance: 0, career: 0 };

  const postScores = {
    health:  Math.max(0, baseScores.health  + computedDrops.health),
    finance: Math.max(0, baseScores.finance + computedDrops.finance),
    career:  Math.max(0, baseScores.career  + computedDrops.career),
  };

  const postLifeScore = Math.round((postScores.health + postScores.finance + postScores.career) / 3);
  const lifeScoreDrop = postLifeScore - lifeScore;

  const recoveryWeeks = scenario ? scenario.recovery[intensity.id] : 0;
  const totalImpact = Math.abs(computedDrops.health) + Math.abs(computedDrops.finance) + Math.abs(computedDrops.career);
  const resilience =
    totalImpact < 30 ? { label: 'High', color: '#10b981', icon: Shield }
    : totalImpact < 60 ? { label: 'Medium', color: '#f59e0b', icon: Activity }
    : totalImpact < 90 ? { label: 'Low', color: '#ef4444', icon: AlertTriangle }
    : { label: 'Critical', color: '#7c3aed', icon: Zap };

  // Simulate loading progress
  useEffect(() => {
    if (phase !== 'simulating') return;
    setSimulProgress(0);
    let p = 0;
    timerRef.current = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(timerRef.current);
        setTimeout(() => setPhase('result'), 300);
      }
      setSimulProgress(Math.min(p, 100));
    }, 180);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const reset = () => {
    setPhase('select');
    setScenario(null);
    setIntensity(INTENSITIES[1]);
    setSimulProgress(0);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={17} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Stress Test Your Life</h1>
              <p className="text-[11px] text-slate-500">See how a crisis cascades across every domain</p>
            </div>
          </div>
          {phase !== 'select' && (
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">

        {/* ── PHASE: SELECT SCENARIO ─────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === 'select' && (
            <motion.div key="select"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

              {/* Current life baseline */}
              <div className="mb-6 p-4 rounded-2xl flex items-center gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Your current Life Balance Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tabular-nums">{Math.round(lifeScore)}</span>
                    <span className="text-sm text-slate-400">/ 100</span>
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  {Object.entries(DOMAIN_META).map(([key, meta]) => (
                    <div key={key}>
                      <p className="text-lg font-black tabular-nums" style={{ color: meta.color }}>{Math.round(baseScores[key])}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{meta.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-4">
                Choose a crisis to simulate. BeyondSelf will calculate the cascading damage across your health, finance, and career — and show you how long recovery takes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SCENARIOS.map((s, i) => {
                  const Icon = s.Icon;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => { setScenario(s); setPhase('configure'); }}
                      className="text-left p-4 rounded-2xl transition-all group hover:scale-[1.02] active:scale-[0.99]"
                      style={{
                        background: s.bg || 'rgba(255,255,255,0.03)',
                        border: `1px solid ${s.border || 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: s.color + '20' }}>
                          <Icon size={19} style={{ color: s.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white leading-snug">{s.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{s.tagline}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {Object.entries(s.impacts).map(([domain, val]) => (
                          <div key={domain} className="flex-1 text-center py-1.5 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <p className="text-[10px] font-bold text-red-400">{val}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{domain}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Recovery: {s.recovery.moderate}w avg</span>
                        <ChevronRight size={13} style={{ color: s.color }} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PHASE: CONFIGURE INTENSITY ─────────────────────── */}
          {phase === 'configure' && scenario && (
            <motion.div key="configure"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

              <div className="mb-6 p-5 rounded-2xl"
                style={{ background: scenario.bg, border: `1px solid ${scenario.border}` }}>
                <div className="flex items-center gap-3 mb-1">
                  <scenario.Icon size={22} style={{ color: scenario.color }} />
                  <h2 className="text-xl font-black text-white">{scenario.label}</h2>
                </div>
                <p className="text-sm text-slate-300 ml-9">{scenario.tagline}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-200 mb-3">How severe is the event?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {INTENSITIES.map(inten => (
                    <button key={inten.id}
                      onClick={() => setIntensity(inten)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: intensity.id === inten.id ? inten.color + '18' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${intensity.id === inten.id ? inten.color + '60' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <p className="text-sm font-bold mb-0.5" style={{ color: intensity.id === inten.id ? inten.color : '#94a3b8' }}>
                        {inten.label}
                      </p>
                      <p className="text-[10px] text-slate-500">{inten.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of impact */}
              <div className="mb-6 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Projected Domain Impact</p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(computedDrops).map(([domain, drop]) => (
                    <div key={domain} className="text-center p-3 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <p className="text-2xl font-black text-red-400 tabular-nums">{drop}</p>
                      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: DOMAIN_META[domain].color }}>
                        {DOMAIN_META[domain].label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                        {Math.round(baseScores[domain])} → {Math.max(0, Math.round(baseScores[domain] + drop))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setPhase('simulating')}
                className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ background: `linear-gradient(135deg, #ef4444, #dc2626)` }}>
                <AlertTriangle size={18} />
                Run Life Stress Test
              </motion.button>
            </motion.div>
          )}

          {/* ── PHASE: SIMULATING ──────────────────────────────── */}
          {phase === 'simulating' && (
            <motion.div key="simulating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-8">

              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle size={32} className="text-red-400" />
                </motion.div>
                <h2 className="text-xl font-black text-white mb-2">Simulating Life Crisis</h2>
                <p className="text-sm text-slate-400">Running cascade models across all domains...</p>
              </div>

              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Processing cross-domain cascades</span>
                  <span className="tabular-nums">{Math.round(simulProgress)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                    style={{ width: `${simulProgress}%` }}
                    transition={{ duration: 0.15 }} />
                </div>
                <div className="mt-4 space-y-1.5">
                  {[
                    { label: 'Calculating primary domain shock', done: simulProgress > 25 },
                    { label: 'Propagating cascade effects',       done: simulProgress > 50 },
                    { label: 'Computing recovery trajectory',     done: simulProgress > 75 },
                    { label: 'Generating resilience assessment',  done: simulProgress > 90 },
                  ].map(step => (
                    <div key={step.label} className="flex items-center gap-2">
                      {step.done
                        ? <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }} />
                      }
                      <span className={`text-xs transition-colors ${step.done ? 'text-slate-300' : 'text-slate-600'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PHASE: RESULT ──────────────────────────────────── */}
          {phase === 'result' && scenario && (
            <motion.div key="result"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

              {/* Impact Banner */}
              <div className="mb-6 p-5 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <scenario.Icon size={20} style={{ color: scenario.color }} />
                  <div>
                    <h2 className="text-base font-black text-white">{scenario.label}</h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: intensity.color + '20', color: intensity.color }}>
                      {intensity.label} Impact
                    </span>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Life Score</p>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="text-3xl font-black tabular-nums" style={{ color: lifeScoreDrop < -15 ? '#ef4444' : '#f59e0b' }}>
                        {postLifeScore}
                      </span>
                      <span className="text-sm font-bold text-red-400 tabular-nums">{lifeScoreDrop}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Rings */}
              <div className="mb-6 p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Domain Impact — Post-Crisis Scores</p>
                <div className="flex justify-around items-start gap-4">
                  {Object.entries(DOMAIN_META).map(([key, meta], i) => (
                    <ScoreRing key={key}
                      original={baseScores[key]}
                      drop={computedDrops[key]}
                      color={meta.color}
                      domain={key}
                      size={108}
                      animate
                      delay={i * 0.3}
                    />
                  ))}
                </div>
              </div>

              {/* Cascade Analysis */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cascade Chain Analysis</p>
                <div className="space-y-2">
                  {scenario.cascades.map((c, i) => (
                    <CascadeRow key={i} from={c.from} to={c.to} why={c.why} index={i} visible />
                  ))}
                </div>
              </div>

              {/* Recovery & Resilience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Recovery Timeline */}
                <div className="p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Recovery Timeline</p>
                  </div>
                  <p className="text-4xl font-black text-white tabular-nums mb-1">{recoveryWeeks}<span className="text-lg font-normal text-slate-400 ml-1">wks</span></p>
                  <p className="text-xs text-slate-500 mb-3">Estimated to return to baseline</p>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (recoveryWeeks / 104) * 100)}%` }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${intensity.color}, #ef4444)` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-600">Fast recovery</span>
                    <span className="text-[9px] text-slate-600">2 years+</span>
                  </div>
                </div>

                {/* Resilience */}
                <div className="p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Life Resilience Rating</p>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: resilience.color + '18', border: `1px solid ${resilience.color}40` }}>
                      <resilience.icon size={22} style={{ color: resilience.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-black" style={{ color: resilience.color }}>{resilience.label}</p>
                      <p className="text-[10px] text-slate-500">Resilience level</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{scenario.resilience}</p>
                </div>
              </div>

              {/* What Would Help */}
              <div className="mb-6 p-4 rounded-2xl"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield size={12} />
                  How to Improve Your Resilience Against This Scenario
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      domain: 'Health',
                      color: '#10b981',
                      tip: `${Math.round(baseScores.health) < 60 ? 'Build sleep consistency — it\'s your fastest health lever' : 'Maintain your current sleep and exercise baseline'}`,
                    },
                    {
                      domain: 'Finance',
                      color: '#f59e0b',
                      tip: `${Math.round(baseScores.finance) < 60 ? '3-month emergency fund cuts recovery time by ~40%' : 'Your financial buffer is strong. Diversify further.'}`,
                    },
                    {
                      domain: 'Career',
                      color: '#3b82f6',
                      tip: `${Math.round(baseScores.career) < 60 ? 'Skill breadth is your safety net when paths close' : 'Portfolio depth and network ties reduce career shock'}`,
                    },
                  ].map(item => (
                    <div key={item.domain} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: item.color }}>
                        {item.domain}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA row */}
              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <RotateCcw size={14} />
                  Test Another Scenario
                </button>
                <button
                  onClick={() => setPhase('configure')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Zap size={14} />
                  Change Intensity
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
