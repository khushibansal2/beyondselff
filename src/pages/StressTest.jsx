import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';

// ─── Scenario Definitions ────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'jobLoss',
    label: 'Job Loss / Layoff',
    tagline: 'Sudden income gone. What breaks first?',
    color: '#eab308',
    impacts: { health: -20, finance: -55, career: -30 },
    cascades: [
      { from: 'Finance', to: 'Health', why: 'Financial stress spikes cortisol → anxiety, poor sleep, comfort eating' },
      { from: 'Finance', to: 'Career', why: 'Desperation narrows job search, confidence collapses in interviews' },
      { from: 'Career', to: 'Health', why: 'Loss of purpose and identity raises chronic stress baseline' },
    ],
    resilience: 'Finance runway is your #1 buffer. Every month of emergency fund = 1 week of stability.',
    recovery: { mild: 8, moderate: 16, severe: 28, catastrophic: 52 },
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    )
  },
  {
    id: 'medical',
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
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    )
  },
  {
    id: 'financialCrash',
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
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    )
  },
  {
    id: 'burnout',
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
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    )
  },
  {
    id: 'relationship',
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
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    id: 'academic',
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
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </svg>
    )
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

/* ─── Animated Score Ring (Results screen) ─────────────────────── */
function ScoreRing({ original, drop, color, domain, size = 96, animate: doAnimate = false, delay = 0 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const after = Math.max(0, Math.round(original + drop));
  const origOffset = circ - (original / 100) * circ;
  const dropOffset = circ - (after / 100) * circ;
  const meta = DOMAIN_META[domain];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: origOffset, stroke: color }}
            animate={doAnimate
              ? { strokeDashoffset: dropOffset, stroke: drop < -20 ? '#ef4444' : drop < -10 ? '#f59e0b' : color }
              : { strokeDashoffset: origOffset, stroke: color }
            }
            transition={{ duration: 1.8, ease: 'easeInOut', delay }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: doAnimate && drop < -10 ? '#ef4444' : color }}>
            {doAnimate ? after : Math.round(original)}
          </span>
          {doAnimate && drop !== 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#f87171', marginTop: 2 }}>{Math.round(drop)}</span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, uppercase: true, trackingWidth: '0.05em', color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
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
    totalImpact < 30 ? { label: 'High', color: '#10b981' }
    : totalImpact < 60 ? { label: 'Medium', color: '#f59e0b' }
    : totalImpact < 90 ? { label: 'Low', color: '#ef4444' }
    : { label: 'Critical', color: '#7c3aed' };

  // Simulation loading progress
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
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Stress Test Your Life</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>See how a crisis cascades across every domain</p>
          </div>
        </div>

        {/* History / Reset button */}
        {phase === 'select' ? (
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer'
          }}>
            <span>🕐 History</span>
            <span style={{
              background: '#4f46e5', color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700
            }}>0</span>
          </button>
        ) : (
          <button onClick={reset} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer'
          }}>
            <span>🔄 Reset</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ── PHASE: SELECT SCENARIO ─────────────────────────── */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            
            {/* Overview / Life Balance Card */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 24,
              padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', trackingWidth: '0.05em', margin: '0 0 6px' }}>Your current Life Balance Score</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{Math.round(lifeScore)}</span>
                  <span style={{ fontSize: 14, color: '#475569' }}>/ 100</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                  Choose a crisis to simulate. BeyondSelf will calculate the cascading damage across your health, finance, and career — and show you how long recovery takes.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 12 }}>
                {/* Health Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{Math.round(healthScore)}</span>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>HEALTH</span>
                </div>

                <div style={{ height: 40, width: 1, background: 'rgba(255,255,255,0.05)' }} />

                {/* Finance Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12" y2="18" />
                  </svg>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{Math.round(financeScore)}</span>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>FINANCE</span>
                </div>

                <div style={{ height: 40, width: 1, background: 'rgba(255,255,255,0.05)' }} />

                {/* Career Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{Math.round(careerScore)}</span>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>CAREER</span>
                </div>
              </div>
            </div>

            {/* Scenarios Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {SCENARIOS.map((s, i) => (
                <motion.button
                  key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => { setScenario(s); setPhase('configure'); }}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16, padding: 18, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', transition: 'transform 0.2s, box-shadow 0.2s', minHeight: 180
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: `${s.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {s.iconSvg}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px', lineHeight: 1.3 }}>{s.label}</h4>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{s.tagline}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>{s.impacts.health}</p>
                      <p style={{ fontSize: 8, color: '#475569', margin: '1px 0 0', textTransform: 'uppercase' }}>HEALTH</p>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>{s.impacts.finance}</p>
                      <p style={{ fontSize: 8, color: '#475569', margin: '1px 0 0', textTransform: 'uppercase' }}>FINANCE</p>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 4px', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', margin: 0 }}>{s.impacts.career}</p>
                      <p style={{ fontSize: 8, color: '#475569', margin: '1px 0 0', textTransform: 'uppercase' }}>CAREER</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>Recovery: {s.recovery.moderate}w avg</span>
                    <span style={{ fontSize: 14, color: s.color, fontWeight: 700 }}>→</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Bottom Floating Voice Log Badge */}
            <div style={{ position: 'fixed', bottom: 24, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Voice Log</span>
            </div>

          </motion.div>
        )}

        {/* ── PHASE: CONFIGURE SCENARIO ──────────────────────── */}
        {phase === 'configure' && scenario && (
          <motion.div key="configure" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div style={{
              marginBottom: 20, padding: 24, borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${scenario.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{scenario.iconSvg}</div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{scenario.label}</h2>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{scenario.tagline}</p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>How severe is the crisis?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {INTENSITIES.map(inten => (
                  <button
                    key={inten.id} onClick={() => setIntensity(inten)}
                    style={{
                      padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      background: intensity.id === inten.id ? `${inten.color}15` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${intensity.id === inten.id ? inten.color : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px', color: intensity.id === inten.id ? inten.color : '#94a3b8' }}>{inten.label}</p>
                    <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{inten.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Projection Preview */}
            <div style={{
              marginBottom: 24, padding: 20, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', trackingWidth: '0.05em', marginBottom: 14 }}>Projected Domain Impact</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {Object.entries(computedDrops).map(([domain, drop]) => (
                  <div key={domain} style={{
                    padding: 16, borderRadius: 12, textAlign: 'center',
                    background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)'
                  }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f87171', margin: 0 }}>{drop}</p>
                    <p style={{ fontSize: 10, color: DOMAIN_META[domain].color, fontWeight: 600, margin: '2px 0 4px', textTransform: 'uppercase' }}>{DOMAIN_META[domain].label}</p>
                    <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                      {Math.round(baseScores[domain])} → {Math.max(0, Math.round(baseScores[domain] + drop))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPhase('simulating')}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#fff',
                fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(239,68,68,0.2)'
              }}
            >
              ☢️ Run Life Stress Test
            </button>
          </motion.div>
        )}

        {/* ── PHASE: SIMULATING ──────────────────────────────── */}
        {phase === 'simulating' && (
          <motion.div key="simulating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', animation: 'pulse 1.5s infinite'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Simulating Life Crisis</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Running cascade models across all domains...</p>
            </div>

            <div style={{ width: '100%', maxWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 6 }}>
                <span>Processing cascades</span>
                <span>{Math.round(simulProgress)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #f97316)', width: `${simulProgress}%` }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PHASE: RESULT ──────────────────────────────────── */}
        {phase === 'result' && scenario && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            
            {/* Outcome Banner */}
            <div style={{
              marginBottom: 20, padding: 20, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
              border: '1px solid rgba(239,68,68,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${intensity.color}20`, color: intensity.color, fontWeight: 600 }}>
                  {intensity.label} Impact
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '8px 0 2px' }}>{scenario.label} simulated</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Stability and recovery timelines projected</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', margin: '0 0 2px' }}>Post-Crisis Score</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{postLifeScore}</span>
                  <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{lifeScoreDrop}</span>
                </div>
              </div>
            </div>

            {/* Score Rings */}
            <div style={{
              marginBottom: 20, padding: 24, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 20 }}>Drained Twin Baselines</p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {Object.entries(DOMAIN_META).map(([key, meta], i) => (
                  <ScoreRing
                    key={key} original={baseScores[key]} drop={computedDrops[key]}
                    color={meta.color} domain={key} size={96} animate delay={i * 0.25}
                  />
                ))}
              </div>
            </div>

            {/* Cascade analysis */}
            <div style={{
              marginBottom: 20, padding: 20, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 14 }}>Cascade Chain Analysis</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scenario.cascades.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: DOMAIN_META[c.from.toLowerCase()]?.color }}>{c.from}</span>
                      <span style={{ color: '#ef4444' }}>→</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: DOMAIN_META[c.to.toLowerCase()]?.color }}>{c.to}</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{c.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recovery & Resilience */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              
              {/* Recovery */}
              <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Recovery Timeline</p>
                <h3 style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>{recoveryWeeks} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>weeks</span></h3>
                <p style={{ fontSize: 11, color: '#475569', margin: '0 0 12px' }}>Estimated return to baseline</p>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg, ${intensity.color}, #ef4444)`, width: `${Math.min(100, (recoveryWeeks / 72) * 100)}%` }} />
                </div>
              </div>

              {/* Resilience */}
              <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Life Resilience Rating</p>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: resilience.color, margin: '0 0 4px' }}>{resilience.label}</h3>
                <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{scenario.resilience}</p>
              </div>

            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                }}
              >
                🔄 Test Another Scenario
              </button>
              <button
                onClick={() => setPhase('configure')}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                }}
              >
                ⚙️ Adjust Intensity
              </button>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
