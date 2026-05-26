import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader, ExplainableScorePanel } from '../components/ui/Components';
import { LifeAvatar } from '../components/ui/LifeAvatar';
import { GhostTimeline } from '../components/ui/GhostTimeline';
import { Link } from 'react-router-dom';
import { generateTrendData, generateCorrelations, generateInsights } from '../data/demoData';
import { computeHealthScore } from '../engines/healthScoreEngine';
import { computeFinanceScore } from '../engines/financeScoreEngine';
import { computeCareerScore } from '../engines/careerScoreEngine';

// ─────────────────────────────────────────────────────────────────────────────
// DOOM SWITCH
// ─────────────────────────────────────────────────────────────────────────────
function DoomSwitch({ active, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-400 select-none ${
        active
          ? 'bg-red-950/40 border-red-600/40 doom-toggle-active'
          : 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.14]'
      }`}
    >
      <motion.span
        className="text-sm"
        animate={{ rotate: active ? [0, -10, 10, 0] : 0 }}
        transition={{ duration: 0.5 }}
      >
        {active ? '☠️' : '🌑'}
      </motion.span>
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${active ? 'bg-red-600' : 'bg-white/10'}`}>
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full shadow-md"
          animate={{ left: active ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          style={{ background: active ? '#fca5a5' : '#475569' }}
        />
      </div>
      <span className={`text-[11px] font-bold tracking-widest transition-colors duration-300 ${active ? 'text-red-400' : 'text-slate-500'}`}>
        {active ? 'DOOM MODE' : 'DOOM MODE'}
      </span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOOM REALITY PANEL (replaces AI narrative in doom mode)
// ─────────────────────────────────────────────────────────────────────────────
function DoomRealityPanel({ stats, burnoutRisk, lifeBalance }) {
  const items = [
    { label: 'Projected Retirement Age', value: `${stats.retirementAge} yrs`, icon: '📅', bad: stats.retirementAge > 68 },
    { label: 'Burnout ETA (current trajectory)', value: `~${stats.burnoutETA} days`, icon: '🔥', bad: stats.burnoutETA < 25 },
    { label: 'Monthly Sleep Debt', value: `${stats.sleepDebt}h/mo`, icon: '😴', bad: stats.sleepDebt > 10 },
    { label: 'Career Lag vs Peers', value: `${stats.careerGap} weeks`, icon: '📉', bad: stats.careerGap > 4 },
    { label: 'Life System Score', value: `${lifeBalance}/100`, icon: '⚠️', bad: lifeBalance < 60 },
    ...(stats.debtFreeYears > 0 ? [{ label: 'Debt-Free Projection', value: `${stats.debtFreeYears} yrs`, icon: '💳', bad: stats.debtFreeYears > 3 }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950/30 to-[#0d0208]/80 doom-flicker"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl flex-shrink-0 border border-red-500/20">
          ☠️
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-300 uppercase tracking-widest">REALITY REPORT</h3>
          <p className="text-[10px] text-red-900">No filter. Cold hard data.</p>
        </div>
        <span className="ml-auto text-[10px] text-red-900 font-mono">DOOM MODE ACTIVE</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className={`p-3 rounded-xl border ${item.bad ? 'border-red-700/30 bg-red-950/20' : 'border-amber-800/20 bg-amber-950/10'}`}
          >
            <div className="text-base mb-1">{item.icon}</div>
            <div className={`text-sm font-bold font-mono ${item.bad ? 'text-red-400' : 'text-amber-400'}`}>{item.value}</div>
            <div className="text-[9px] text-red-900/70 mt-0.5 leading-tight">{item.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 p-2 rounded-lg bg-red-900/10 border border-red-900/20">
        <p className="text-[10px] text-red-700/80 text-center">
          ⚡ These projections are based on your <strong className="text-red-600">current habits unchanged</strong>.
          Switch off Doom Mode to see how to fix this.
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIPPLE CONNECTOR (SVG overlay on score rings)
// ─────────────────────────────────────────────────────────────────────────────
// Static fallback — shown only when no real cascade is active for a domain
const FALLBACK_CASCADES = {
  health:  [
    { to: 'career',  type: 'positive', label: 'Boosts Focus',     color: '#10b981' },
    { to: 'finance', type: 'positive', label: 'Discipline',       color: '#10b981' },
  ],
  finance: [
    { to: 'health',  type: 'negative', label: 'Stress Risk',      color: '#ef4444' },
    { to: 'career',  type: 'positive', label: 'Drives Ambition',  color: '#10b981' },
  ],
  career:  [
    { to: 'health',  type: 'negative', label: 'Recovery Cost',    color: '#ef4444' },
    { to: 'finance', type: 'positive', label: 'Income Boost',     color: '#10b981' },
  ],
};

function buildDomainCascades(crossDomain = []) {
  if (!crossDomain.length) return FALLBACK_CASCADES;
  const result = { health: [], finance: [], career: [] };
  crossDomain.forEach(c => {
    const isNeg = c.type === 'negative';
    const color = c.severity === 'critical' ? '#ef4444' : isNeg ? '#f97316' : '#10b981';
    let label = c.effect?.split('.')[0] || (isNeg ? 'Negative impact' : 'Positive impact');
    // Derive concise labels from computedImpact
    if (c.computedImpact?.productivityLoss)  label = `-${c.computedImpact.productivityLoss}% Productivity`;
    if (c.computedImpact?.excessSpending)    label = `-₹${(c.computedImpact.excessSpending / 1000).toFixed(0)}K Spending`;
    if (c.computedImpact?.focusBoost)        label = `+${c.computedImpact.focusBoost}% Focus`;
    if (c.computedImpact?.alertnessReduction) label = `-${c.computedImpact.alertnessReduction}% Alertness`;
    if (result[c.from]) result[c.from].push({ to: c.to, type: c.type, label, color });
  });
  // Fill any domain with no real cascades using fallback
  ['health', 'finance', 'career'].forEach(d => {
    if (!result[d].length) result[d] = FALLBACK_CASCADES[d];
  });
  return result;
}

// Column indices in the 5-card desktop grid
const DOMAIN_COL = { health: 0, finance: 1, career: 2, life: 3, burnout: 4 };

function RippleConnector({ hoveredDomain, containerRef, cascades }) {
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setSvgSize({ w: r.width, h: r.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!hoveredDomain || !cascades?.[hoveredDomain] || svgSize.w === 0) return null;

  const { w, h } = svgSize;
  const colW = w / 5;
  const centerY = h / 2;

  const fromX = DOMAIN_COL[hoveredDomain] * colW + colW / 2;

  const conns = cascades[hoveredDomain];

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={w} height={h}
      style={{ zIndex: 20, overflow: 'visible' }}
    >
      <defs>
        <filter id="connGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <AnimatePresence>
        {conns.map((conn, i) => {
          const toX = DOMAIN_COL[conn.to] * colW + colW / 2;
          const midX = (fromX + toX) / 2;
          const midY = centerY * 0.2; // arc above center
          const d = `M ${fromX} ${centerY} Q ${midX} ${midY} ${toX} ${centerY}`;
          const pathId = `rp-${conn.to}-${i}`;

          return (
            <motion.g key={conn.to}>
              {/* Arc path */}
              <motion.path
                d={d}
                stroke={conn.color}
                strokeWidth="2"
                fill="none"
                filter="url(#connGlow)"
                strokeOpacity="0.75"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              />
              {/* Invisible path for animateMotion reference */}
              <path id={pathId} d={d} fill="none" stroke="none" />
              {/* Traveling dot */}
              <motion.circle
                r="4.5"
                fill={conn.color}
                filter="url(#connGlow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: i * 0.12 + 0.2, repeat: Infinity, repeatDelay: 0.3 }}
              >
                <animateMotion dur="0.7s" repeatCount="indefinite" begin={`${i * 0.12 + 0.2}s`}>
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </motion.circle>
              {/* Label at destination */}
              <motion.text
                x={toX}
                y={centerY - 18}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                fill={conn.color}
                filter="url(#connGlow)"
                initial={{ opacity: 0, y: centerY - 10 }}
                animate={{ opacity: 1, y: centerY - 18 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.12 + 0.4 }}
              >
                {conn.label}
              </motion.text>
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { health, finance, career, timeline, records, computed, aiCache, updateAICache, anomalies = [] } = useData();
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [doomMode, setDoomMode] = useState(false);
  const [doomShake, setDoomShake] = useState(false);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const scoreRingsRef = useRef(null);

  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };

  const healthScore  = computed?.healthScore?.score  || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore  = computed?.careerScore?.score  || 0;
  const lifeBalance  = computed?.balance             || 0;
  const burnoutRisk  = computed?.burnout?.risk       || 0;
  const weakestDomain = computed?.weakestDomain?.name || 'health';
  const savingsRate  = f.income > 0 ? Math.max(0, Math.round(((f.income - f.expenses) / f.income) * 100)) : 0;

  // Doom mode reality check stats
  const doomStats = useMemo(() => {
    const retirementAge = Math.min(85, Math.round(65 + Math.max(0, (0.2 - savingsRate / 100) * 50)));
    const burnoutETA    = Math.max(1, Math.round(30 * (100 - burnoutRisk) / 100));
    const sleepDebt     = Math.max(0, Math.round((7 - h.sleepAvg) * 30));
    const careerGap     = Math.max(0, Math.round((4 - (c.studyHoursDaily || 0)) * 5));
    const debtFreeYears = f.debt > 0 && (f.income - f.expenses) > 0
      ? Math.round(f.debt / ((f.income - f.expenses) * 12))
      : 0;
    return { retirementAge, burnoutETA, sleepDebt, careerGap, debtFreeYears, savingsRate };
  }, [h, f, c, burnoutRisk, savingsRate]);

  const toggleDoom = useCallback(() => {
    setDoomMode(d => !d);
    setDoomShake(true);
    setTimeout(() => setDoomShake(false), 600);
  }, []);

  // Real-time cross-domain cascade map derived from scoring engine
  const domainCascades = useMemo(() => buildDomainCascades(computed?.crossDomain || []), [computed?.crossDomain]);

  // Explainable factors
  const explainFactors = useMemo(() => ({
    health:  computeHealthScore(health  || {}, []).factors,
    finance: computeFinanceScore(finance || {}, []).factors,
    career:  computeCareerScore(career  || {}, []).factors,
  }), [health, finance, career]);

  // Action plan — only show items based on data the user has actually logged
  const hasHealthData  = h.sleepAvg > 0 || h.stressLevel > 0 || h.workoutsPerWeek > 0 || h.waterIntake > 0;
  const hasFinanceData = f.income > 0 || f.expenses > 0;
  const hasCareerData  = c.studyHoursDaily > 0 || c.dsaPractice > 0 || c.skills.length > 0;

  const actionPlan = useMemo(() => {
    const tasks = [];
    if (h.sleepAvg > 0 && h.sleepAvg < 7)
      tasks.push({ id: 'sleep',   icon: '😴', text: `Go to bed ${Math.max(0.5, 7 - h.sleepAvg).toFixed(1)}h earlier tonight`,            domain: 'health',  color: '#8b5cf6', time: '0 min',   link: '/health' });
    if (h.workoutsPerWeek > 0 && h.workoutsPerWeek < 3)
      tasks.push({ id: 'workout', icon: '💪', text: `Add ${3 - h.workoutsPerWeek} more workout day${3 - h.workoutsPerWeek > 1 ? 's' : ''} this week`, domain: 'health',  color: '#10b981', time: '20 min',  link: '/health' });
    if (h.waterIntake > 0 && h.waterIntake < 7)
      tasks.push({ id: 'water',   icon: '💧', text: `Drink ${8 - Math.round(h.waterIntake)} more glasses of water today`,                 domain: 'health',  color: '#06b6d4', time: 'All day',  link: '/health' });
    if (h.stressLevel > 6)
      tasks.push({ id: 'stress',  icon: '🧘', text: 'Take a 15-min meditation or walk break',                                             domain: 'health',  color: '#f43f5e', time: '15 min',  link: '/health' });
    if (savingsRate < 20 && f.income > 0)
      tasks.push({ id: 'savings', icon: '💰', text: `Review subscriptions (₹${f.subscriptions}) — cancel one unused service`,            domain: 'finance', color: '#f59e0b', time: '10 min',  link: '/finance' });
    if (f.debt > 0)
      tasks.push({ id: 'debt',    icon: '🏦', text: 'Make a debt repayment transfer today',                                               domain: 'finance', color: '#ef4444', time: '5 min',   link: '/finance' });
    if (hasCareerData && c.dsaPractice < 3)
      tasks.push({ id: 'dsa',     icon: '🧩', text: `Solve ${Math.max(1, 3 - c.dsaPractice)} DSA problem${3 - c.dsaPractice > 1 ? 's' : ''} on LeetCode`, domain: 'career',  color: '#3b82f6', time: '45 min',  link: '/career' });
    if (hasCareerData && c.studyHoursDaily > 0 && c.studyHoursDaily < 4)
      tasks.push({ id: 'study',   icon: '📚', text: 'Block a 2-hour focused study session',                                               domain: 'career',  color: '#8b5cf6', time: '2 hours', link: '/career' });
    if (hasCareerData && c.skills.length < 5)
      tasks.push({ id: 'skill',   icon: '🎯', text: 'Add one new skill to your profile today',                                            domain: 'career',  color: '#06b6d4', time: '5 min',   link: '/career' });

    if (tasks.length === 0) {
      const empties = [];
      if (!hasHealthData)  empties.push({ id: 'log-health',  icon: '❤️',  text: 'Log your health data to unlock insights',  domain: 'health',  color: '#10b981', time: '2 min', link: '/health' });
      if (!hasFinanceData) empties.push({ id: 'log-finance', icon: '💰', text: 'Log your income and expenses',               domain: 'finance', color: '#f59e0b', time: '2 min', link: '/finance' });
      if (!hasCareerData)  empties.push({ id: 'log-career',  icon: '📚', text: 'Log your study hours and skills',            domain: 'career',  color: '#3b82f6', time: '2 min', link: '/career' });
      if (empties.length === 0) {
        empties.push({ id: 'all-good', icon: '🏆', text: 'All targets met — you\'re crushing it today!', domain: 'health', color: '#22c55e', time: '—', link: '/health' });
      }
      return empties.slice(0, 3);
    }
    return tasks.slice(0, 3);
  }, [h, f, c, savingsRate, hasHealthData, hasFinanceData, hasCareerData]);

  const urgentAlerts   = [...(computed?.urgentAlerts || []), ...anomalies.map(a => ({ icon: a.severity === 'critical' ? '🚨' : '⚠️', text: `${a.title}: ${a.description}` }))];
  const positiveSignals = computed?.positiveSignals || [];
  const crossDomain    = computed?.crossDomain || [];

  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline }), [user, h, f, c, timeline]);

  // Use real health records for trend/correlations when available; synthetic only as fallback
  const trendData = useMemo(() => {
    const healthRecs = records?.health || [];
    if (healthRecs.length >= 3) {
      return [...healthRecs]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-14)
        .map(r => ({
          date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
          sleep: r.sleep ?? null,
          stress: r.stress ?? null,
          mood: r.mood ?? null,
          productivity: r.mood != null ? Math.max(1, 10 - (r.stress ?? 5)) : null,
          spending: null,
          studyHours: null,
          water: r.water ?? null,
        }));
    }
    return generateTrendData(currentState, 14);
  }, [records?.health, currentState]);

  const correlations = useMemo(() => generateCorrelations(trendData), [trendData]);

  const insights = useMemo(() => {
    const base = generateInsights(currentState);
    const cross = crossDomain.map(cd => ({
      type: cd.severity === 'critical' ? 'critical' : cd.severity === 'warning' ? 'alert' : 'positive',
      icon: cd.severity === 'positive' ? '✅' : '⚡',
      title: 'Deterministic Pattern',
      text: `${cd.effect}. ${cd.mechanism}`,
      domains: [cd.from, cd.to],
      confidence: 100,
    }));
    return [...cross, ...base].slice(0, 5);
  }, [currentState, crossDomain]);

  const sleepCascade = crossDomain.find(cd => cd.id === 'sleep-productivity');

  useEffect(() => {
    async function fetchNarrative() {
      const hash = `${lifeBalance}-${healthScore}-${financeScore}-${careerScore}-${burnoutRisk}`;
      if (aiCache.dashboardNarrative && aiCache.dashboardNarrativeHash === hash) {
        setAiNarrative(aiCache.dashboardNarrative);
        return;
      }
      if (!computed?.hasData) return;
      setNarrativeLoading(true);
      const res = await generateNarrative(computed, 'dashboard');
      setAiNarrative(res.narrative);
      updateAICache({ dashboardNarrative: res.narrative, dashboardNarrativeHash: hash });
      setNarrativeLoading(false);
    }
    fetchNarrative();
  }, [computed, aiCache.dashboardNarrative, aiCache.dashboardNarrativeHash, updateAICache, lifeBalance, healthScore, financeScore, careerScore, burnoutRisk]);

  // Score ring config — changes labels in doom mode
  const scoreRings = [
    { key: 'health',  score: healthScore,  label: doomMode ? 'Decay Rate' : 'Health',       glow: 'glow-emerald', doom: 'glow-rose' },
    { key: 'finance', score: financeScore, label: doomMode ? 'Fragility' : 'Finance',       glow: 'glow-amber',   doom: 'glow-rose' },
    { key: 'career',  score: careerScore,  label: doomMode ? 'Obsolescence' : 'Career',     glow: 'glow-blue',    doom: 'glow-rose' },
    { key: 'life',    score: lifeBalance,  label: doomMode ? 'Failure Index' : 'Life Balance', glow: 'glow-purple', doom: 'glow-rose' },
    { key: 'burnout', score: burnoutRisk,  label: doomMode ? 'Collapse Risk' : 'Burnout Risk',
      glow: burnoutRisk > 60 ? 'glow-rose' : '',
      color: burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f59e0b' : '#10b981',
      col2: true },
  ];

  // Cascade effect indicator for each score ring
  function getCascadeEffect(cardKey) {
    if (!hoveredDomain || hoveredDomain === cardKey) return null;
    const effects = domainCascades[hoveredDomain] || [];
    return effects.find(e => e.to === cardKey) || null;
  }

  return (
    <div
      className={`p-4 md:p-8 pb-24 lg:pb-8 min-h-screen transition-colors duration-700 relative ${
        doomMode ? 'doom-active' : 'bg-mesh'
      } ${doomShake ? 'doom-shake' : ''}`}
    >
      {/* Doom scanline overlay */}
      <AnimatePresence>
        {doomMode && (
          <motion.div
            key="scanline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 999 }}
          >
            <div
              className="w-full h-[2px] animate-scanline"
              style={{ background: 'linear-gradient(to right, transparent, rgba(239,68,68,0.15), transparent)' }}
            />
            {/* Vignette */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse at center, transparent 60%, rgba(139,0,0,0.15) 100%)',
              pointerEvents: 'none',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER + DOOM SWITCH ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className={`text-xl font-bold transition-colors duration-500 ${doomMode ? 'text-red-300' : 'text-white'}`}
                style={{ fontFamily: 'var(--font-display)' }}>
              {doomMode ? '☠️ SYSTEM FAILURE DASHBOARD' : '🧬 Your Digital Twin Today'}
            </h1>
            <p className={`text-xs mt-0.5 transition-colors duration-500 ${doomMode ? 'text-red-900' : 'text-slate-500'}`}>
              {doomMode
                ? `Reality check for ${user?.name || 'User'}. No filter applied.`
                : `Welcome back, ${user?.name || 'User'}. Here's your AI-powered life overview.`}
            </p>
          </motion.div>
        </div>
        <DoomSwitch active={doomMode} onToggle={toggleDoom} />
      </div>

      {/* ── AVATAR + AI NARRATIVE / DOOM PANEL ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-3 gap-6 mb-8"
      >
        {/* Avatar column */}
        <div className="flex justify-center items-center">
          <LifeAvatar
            healthScore={healthScore}
            financeScore={financeScore}
            careerScore={careerScore}
            burnoutRisk={burnoutRisk}
            doomMode={doomMode}
          />
        </div>

        {/* Narrative / Doom panel */}
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {doomMode ? (
              <motion.div key="doom" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <DoomRealityPanel stats={doomStats} burnoutRisk={burnoutRisk} lifeBalance={lifeBalance} />
              </motion.div>
            ) : (
              <motion.div key="normal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="glass-card p-5 rounded-2xl border border-white/[0.06] h-full"
                     style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 50%, rgba(6,182,212,0.05) 100%)' }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">🧬</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Your Digital Twin Analysis</h3>
                      {narrativeLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Generating AI narrative from your data...
                        </div>
                      ) : aiNarrative ? (
                        <p className="text-xs text-slate-300 italic mb-2 leading-relaxed">"{aiNarrative}"</p>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Your life balance is <strong className={lifeBalance >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{lifeBalance}/100</strong>.{' '}
                          Your weakest area is <strong className="text-amber-400 capitalize">{weakestDomain}</strong> at {computed?.[`${weakestDomain}Score`]?.score}/100.
                          {burnoutRisk > 50 ? ` Burnout risk is ${burnoutRisk}% — this needs attention.` : ' Keep up the good work!'}
                        </p>
                      )}
                    </div>
                  </div>
                  {urgentAlerts.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {urgentAlerts.map((u, i) => (
                        <div key={i} className="text-xs text-red-300/80 p-2 rounded-lg bg-red-500/5 border border-red-500/10">{u.icon} {u.text}</div>
                      ))}
                    </div>
                  )}
                  {positiveSignals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {positiveSignals.map((p, i) => (
                        <span key={i} className="text-[10px] text-emerald-300/80 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">{p.icon} {p.text}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── SCORE RINGS + RIPPLE EFFECT ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 transition-colors ${doomMode ? 'text-red-900' : 'text-slate-600'}`}>
          {doomMode ? '▶ CRITICAL SYSTEM METRICS' : 'Hover a domain to see cascade effects'}
        </p>
        <div className="relative" ref={scoreRingsRef}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {scoreRings.map((ring, idx) => {
              const effect = getCascadeEffect(ring.key);
              const isHovered = hoveredDomain === ring.key;
              const isAffected = !!effect;
              return (
                <motion.div
                  key={ring.key}
                  className={`relative ${ring.col2 ? 'col-span-2 md:col-span-1' : ''}`}
                  onMouseEnter={() => setHoveredDomain(ring.key)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  animate={{
                    boxShadow: isHovered
                      ? `0 0 30px ${doomMode ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)'}`
                      : isAffected
                        ? `0 0 20px ${effect.color}40`
                        : 'none',
                  }}
                  transition={{ duration: 0.25 }}
                  style={{ borderRadius: 16 }}
                >
                  <GlassCard
                    className="flex justify-center"
                    glow={doomMode ? 'glow-rose' : ring.glow}
                  >
                    <ScoreRing
                      score={ring.score}
                      color={ring.color || 'auto'}
                      label={ring.label}
                      delay={idx * 100}
                    />
                  </GlassCard>

                  {/* Cascade indicator badge */}
                  <AnimatePresence>
                    {isAffected && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.85 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                        style={{ background: effect.color + '22', color: effect.color, border: `1px solid ${effect.color}55`, zIndex: 30 }}
                      >
                        {effect.type === 'positive' ? '↑' : '↓'} {effect.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* SVG Ripple Connector — desktop only */}
          <div className="hidden md:block absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            <AnimatePresence>
              {hoveredDomain && (
                <motion.div key={hoveredDomain} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                  <RippleConnector hoveredDomain={hoveredDomain} containerRef={scoreRingsRef} cascades={domainCascades} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── SLEEP CASCADE ALERT ───────────────────────────────────────────────── */}
      {sleepCascade && !doomMode && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-red-500/15 bg-red-500/5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] text-red-300 font-semibold uppercase tracking-wider">🧠 AI Pattern Detected</span>
              <span className="ml-auto text-[10px] text-slate-600">Deterministic · Cross-domain</span>
            </div>
            <div className="p-5">
              <h3 className="text-sm font-bold text-white mb-2">Sleep–Productivity Cascade Active</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Your Digital Twin detected a recurring pattern: poor sleep quality (<strong className="text-white">{h.sleepAvg}h avg</strong>) has reduced cognitive consistency. {sleepCascade.mechanism}
              </p>
              <div className="flex gap-3">
                <Link to="/coach" className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                  Ask AI Coach
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── EXPLAINABLE AI PANELS ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
            style={{ fontFamily: 'var(--font-display)' }}>
          <span className="text-lg">🔍</span>
          {doomMode ? 'SYSTEM DIAGNOSTICS — WHY YOU\'RE FAILING' : 'Explainable AI — Why Your Scores'}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Advanced</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <ExplainableScorePanel title={doomMode ? 'Physical Decay' : 'Health Score'}    score={healthScore}  factors={explainFactors.health}  color={doomMode ? '#ef4444' : '#10b981'} icon={doomMode ? '💀' : '❤️'} />
          <ExplainableScorePanel title={doomMode ? 'Financial Fragility' : 'Finance Score'} score={financeScore} factors={explainFactors.finance} color={doomMode ? '#ef4444' : '#f59e0b'} icon={doomMode ? '📉' : '💰'} />
          <ExplainableScorePanel title={doomMode ? 'Obsolescence Risk' : 'Career Score'}  score={careerScore}  factors={explainFactors.career}  color={doomMode ? '#ef4444' : '#3b82f6'} icon={doomMode ? '⏳' : '🎯'} />
        </div>
      </motion.div>

      {/* ── GHOST TIMELINE + INSIGHTS ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={doomMode ? '💀' : '😴'} label={doomMode ? 'Sleep Debt'  : 'Avg Sleep'}    value={doomMode ? `${doomStats.sleepDebt}h debt` : `${h.sleepAvg || 0}h`}          change={h.sleepAvg >= 7 ? 5 : -12}               color={doomMode ? '#ef4444' : '#8b5cf6'} delay={0} />
            <MetricCard icon={doomMode ? '🔥' : '😰'} label={doomMode ? 'Burnout ETA' : 'Stress'}       value={doomMode ? `${doomStats.burnoutETA}d`       : `${h.stressLevel || 0}/10`}     change={h.stressLevel <= 5 ? 8 : -15}             color={doomMode ? '#ef4444' : '#f43f5e'} delay={100} />
            <MetricCard icon={doomMode ? '📉' : '💵'} label={doomMode ? 'Retire Age'  : 'Savings Rate'} value={doomMode ? `Age ${doomStats.retirementAge}`  : `${savingsRate}%`}              change={f.income > f.expenses ? 5 : -10}          color={doomMode ? '#ef4444' : '#10b981'} delay={200} />
            <MetricCard icon={doomMode ? '⏳' : '📊'} label={doomMode ? 'Career Gap'  : 'Study Hours'}  value={doomMode ? `${doomStats.careerGap}wk behind` : `${c.studyHoursDaily || 0}h/day`} change={c.studyHoursDaily >= 4 ? 10 : -5}        color={doomMode ? '#ef4444' : '#3b82f6'} delay={300} />
          </div>

          {/* Ghost Timeline Chart */}
          <GhostTimeline
            lifeBalance={lifeBalance}
            healthScore={healthScore}
            financeScore={financeScore}
            careerScore={careerScore}
            studyHours={c.studyHoursDaily}
            savingsRate={savingsRate}
            burnoutRisk={burnoutRisk}
            doomMode={doomMode}
            healthRecords={records?.health || []}
          />
        </div>

        {/* Insights column */}
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
              style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-lg">🧠</span>
            {doomMode ? 'FAILURE PATTERNS' : 'Deterministic Insights'}
          </h3>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] text-center text-xs text-slate-500">
                <span className="text-2xl block mb-2">✨</span>
                All clear! No critical insights right now.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTIVITY + CORRELATIONS ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
              style={{ fontFamily: 'var(--font-display)' }}>
            <span>{doomMode ? '📛' : '📅'}</span>
            {doomMode ? 'Incident Log' : 'Recent Activity'}
          </h3>
          <div className="space-y-3">
            {(timeline || []).slice(0, 6).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  item.sentiment === 'positive' ? (doomMode ? 'bg-amber-400' : 'bg-emerald-400')
                  : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300">{item.text}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{item.date} · {item.type}</p>
                </div>
              </motion.div>
            ))}
            {(!timeline || timeline.length === 0) && (
              <p className="text-xs text-slate-500 text-center py-4">No recent activity yet.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
              style={{ fontFamily: 'var(--font-display)' }}>
            <span>🔗</span>
            {doomMode ? 'Cascade Failures' : 'Habit Correlations'}
          </h3>
          <div className="space-y-3">
            {correlations.slice(0, 5).map((corr, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-xl text-xs border ${
                  corr.type === 'positive' ? (doomMode ? 'border-amber-900/30 bg-amber-950/10' : 'border-emerald-500/20 bg-emerald-500/5')
                  : corr.type === 'negative' ? 'border-red-500/20 bg-red-500/5'
                  : 'border-slate-500/20 bg-slate-500/5'
                }`}>
                <div className="flex justify-between items-center">
                  <p className="text-slate-300">{corr.pattern}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 flex-shrink-0 ml-2">{Math.round(corr.strength * 100)}%</span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {corr.domains.map(d => <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize">{d}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── ACTION PLAN ───────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
                style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-lg">{doomMode ? '🚨' : '📋'}</span>
              {doomMode ? "DAMAGE CONTROL PROTOCOL" : "Today's Action Plan"}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${doomMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                AI-generated
              </span>
            </h3>
            <span className="text-[10px] text-slate-500">
              {Object.values(checkedTasks).filter(Boolean).length}/{actionPlan.length} done
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/5 mb-4">
            <motion.div
              animate={{ width: `${(Object.values(checkedTasks).filter(Boolean).length / actionPlan.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${doomMode ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'}`}
            />
          </div>

          <div className="space-y-3">
            {actionPlan.map((task, i) => {
              const done = !!checkedTasks[task.id];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    done
                      ? (doomMode ? 'border-red-900/20 bg-red-950/10 opacity-60' : 'border-emerald-500/20 bg-emerald-500/5 opacity-60')
                      : (doomMode ? 'border-red-900/20 bg-red-950/5 hover:bg-red-950/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]')
                  }`}
                  onClick={() => setCheckedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    done
                      ? (doomMode ? 'border-red-400 bg-red-500/20' : 'border-emerald-400 bg-emerald-500/20')
                      : 'border-white/20'
                  }`}>
                    {done && <span className={`text-[10px] ${doomMode ? 'text-red-400' : 'text-emerald-400'}`}>✓</span>}
                  </div>
                  <span className="text-lg flex-shrink-0">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${done ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
                            style={{ color: doomMode ? '#ef4444' : task.color, background: (doomMode ? '#ef4444' : task.color) + '15' }}>
                        {task.domain}
                      </span>
                      <span className="text-[9px] text-slate-600">⏱ {task.time}</span>
                    </div>
                  </div>
                  <Link to={task.link} onClick={e => e.stopPropagation()}
                    className="btn-chip flex-shrink-0">
                    Go →
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {Object.values(checkedTasks).filter(Boolean).length === actionPlan.length && actionPlan.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-xl border text-center ${doomMode ? 'bg-red-950/20 border-red-900/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <p className={`text-sm font-semibold ${doomMode ? 'text-red-300' : 'text-emerald-400'}`}>
                  {doomMode ? '⚠️ Damage mitigated — but system still failing' : '🎉 All tasks complete! +50 XP earned'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {doomMode ? 'Turn off Doom Mode to see the recovery plan.' : 'Come back tomorrow for a new plan'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────────── */}
      <GlassCard>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
            style={{ fontFamily: 'var(--font-display)' }}>
          {doomMode ? '🚑 Emergency Actions' : '⚡ Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/health',  icon: doomMode ? '🏥' : '❤️', label: doomMode ? 'Fix Health'   : 'Log Health',   color: '#10b981' },
            { to: '/finance', icon: doomMode ? '💸' : '💰', label: doomMode ? 'Stop Bleeding' : 'Log Expense',  color: '#f59e0b' },
            { to: '/career',  icon: doomMode ? '📚' : '📚', label: doomMode ? 'Catch Up Now'  : 'Log Study',    color: '#3b82f6' },
            { to: '/coach',   icon: doomMode ? '🆘' : '💬', label: doomMode ? 'Emergency Help': 'Ask AI Coach', color: '#8b5cf6' },
          ].map(action => (
            <Link key={action.to} to={action.to}
              className={`p-4 rounded-xl border text-center hover:bg-white/[0.04] transition-all group ${doomMode ? 'border-red-900/20 bg-red-950/10' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{action.icon}</span>
              <p className={`text-xs font-medium transition-colors ${doomMode ? 'text-red-400 group-hover:text-red-200' : 'text-slate-400 group-hover:text-white'}`}>
                {action.label}
              </p>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
