import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { GitBranch, AlertTriangle, CheckCircle, ArrowRight, Info, Zap } from 'lucide-react';

// ─── Layout constants ─────────────────────────────────────────────────────────
const W = 920, H = 520;
const CX = 460, CY = 245;

// ─── Domain palette ───────────────────────────────────────────────────────────
const DC = {
  health:  { p: '#10b981', bg: 'rgba(16,185,129,0.13)',  b: 'rgba(16,185,129,0.5)'  },
  finance: { p: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  b: 'rgba(245,158,11,0.5)'  },
  career:  { p: '#3b82f6', bg: 'rgba(59,130,246,0.13)',  b: 'rgba(59,130,246,0.5)'  },
  center:  { p: '#6366f1', bg: 'rgba(99,102,241,0.18)',  b: 'rgba(99,102,241,0.6)'  },
};

// ─── Nodes ────────────────────────────────────────────────────────────────────
const NODES = [
  // Health cluster — left
  { id: 'sleep',    label: 'Sleep',       domain: 'health',  x: 128, y: 138, emoji: '🌙', r: 28 },
  { id: 'exercise', label: 'Exercise',    domain: 'health',  x: 68,  y: 272, emoji: '🏃', r: 26 },
  { id: 'energy',   label: 'Energy',      domain: 'health',  x: 148, y: 398, emoji: '⚡', r: 26 },
  // Finance cluster — right
  { id: 'savings',  label: 'Savings',     domain: 'finance', x: 792, y: 138, emoji: '🏛️', r: 26 },
  { id: 'spending', label: 'Spending',    domain: 'finance', x: 852, y: 272, emoji: '🛒', r: 26 },
  { id: 'debt',     label: 'Debt Stress', domain: 'finance', x: 780, y: 398, emoji: '📉', r: 26 },
  // Career cluster — bottom
  { id: 'study',    label: 'Study Hrs',   domain: 'career',  x: 330, y: 458, emoji: '📚', r: 26 },
  { id: 'focus',    label: 'Focus',       domain: 'career',  x: 460, y: 488, emoji: '🎯', r: 26 },
  { id: 'skills',   label: 'Skills',      domain: 'career',  x: 590, y: 458, emoji: '🚀', r: 26 },
  // Center
  { id: 'life',     label: 'Life Balance',domain: 'center',  x: CX,  y: CY,  emoji: '⚖️', r: 40, isCenter: true },
];

// ─── Edge definitions ─────────────────────────────────────────────────────────
const EDGES = [
  // Within-domain (same-domain connections — correct directions)
  { id: 'sl-en',  from: 'sleep',    to: 'energy',   kind: 'within' },
  { id: 'ex-en',  from: 'exercise', to: 'energy',   kind: 'within' },
  { id: 'sp-de',  from: 'spending', to: 'debt',     kind: 'within' },  // overspending creates debt (was wrong: savings→spending)
  { id: 'st-fo',  from: 'study',    to: 'focus',    kind: 'within' },
  { id: 'fo-sk',  from: 'focus',    to: 'skills',   kind: 'within' },
  // Core (domain → life balance)
  { id: 'en-li',  from: 'energy',   to: 'life',     kind: 'core' },
  { id: 'sa-li',  from: 'savings',  to: 'life',     kind: 'core' },
  { id: 'sk-li',  from: 'skills',   to: 'life',     kind: 'core' },
  // Cross-domain cascades
  {
    id: 'sl-fo',  from: 'sleep',    to: 'focus',    kind: 'cross',
    label: 'Sleep → Focus Crash',
    labelGood: 'Sleep Fuels Focus',
    why: 'Every hour below 7h costs ~15% working memory. Sleep debt collapses cognitive performance silently.',
    whyGood: 'Good sleep consolidates memory and sharpens working memory — your focus is running at capacity.',
    cascadeId: 'sleep-productivity',
    negativeWhen: 'sleep', // active as negative when sleep score is low
  },
  {
    id: 'sl-sp',  from: 'sleep',    to: 'spending', kind: 'cross',
    label: 'Poor Sleep → Impulse Spending',
    labelGood: 'Rested = Disciplined Spending',
    why: 'Cortisol from sleep deprivation reduces prefrontal inhibition — brain defaults to reward-seeking and impulse purchases.',
    whyGood: 'Quality sleep keeps the prefrontal cortex in control, reducing impulsive financial decisions.',
    cascadeId: 'stress-spending',
    negativeWhen: 'sleep',
  },
  {
    id: 'de-sl',  from: 'debt',     to: 'sleep',    kind: 'cross',
    label: 'Debt Stress → Insomnia',
    labelGood: 'Low Debt, Clear Mind',
    why: 'Financial anxiety is the #1 cause of stress-related insomnia. High debt triggers chronic cortisol elevation at night.',
    whyGood: 'Manageable debt removes a key cortisol trigger — your nervous system can properly down-regulate at night.',
    cascadeId: 'financial-stress',
    negativeWhen: 'debt', // active as negative when debt is high (low score)
  },
  {
    id: 'en-st',  from: 'energy',   to: 'study',    kind: 'cross',
    label: 'Low Energy Limits Study',
    labelGood: 'Energy Amplifies Study',
    why: 'Physical energy directly caps effective study hours. Low energy = hours spent but little retained.',
    whyGood: 'High physical energy extends effective study duration and improves information retention.',
    cascadeId: 'exercise-focus',
    negativeWhen: 'energy',
  },
  {
    id: 'ex-fo',  from: 'exercise', to: 'focus',    kind: 'cross',
    label: 'No Exercise → Focus Loss',
    labelGood: 'Exercise Boosts Focus',
    why: 'Exercise releases BDNF (brain-derived neurotrophic factor), which directly improves memory consolidation and sustained attention.',
    whyGood: 'Regular exercise has been shown to increase BDNF by 200–300%, significantly boosting memory and focus.',
    negativeWhen: 'exercise',
  },
  {
    id: 'sa-fo',  from: 'savings',  to: 'focus',    kind: 'cross',
    label: 'Financial Worry → Brain Drain',
    labelGood: 'Financial Security → Focus',
    why: 'Cognitive Load Theory: financial worry consumes ~13 IQ points of working memory, leaving less for deep work.',
    whyGood: 'A healthy savings buffer eliminates background financial anxiety, freeing full cognitive capacity.',
    cascadeId: 'financial-stress',
    negativeWhen: 'savings', // negative when savings is low
  },
  {
    id: 'sk-sa',  from: 'skills',   to: 'savings',  kind: 'cross',
    label: 'Skill Gap → Income Gap',
    labelGood: 'Skills Compound Into Savings',
    why: 'Falling behind on skills reduces earning potential. Income stagnation makes savings targets impossible.',
    whyGood: 'Each verifiable skill increases expected salary 8–15%. More income directly feeds monthly savings capacity.',
    negativeWhen: 'skills',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nodeById = id => NODES.find(n => n.id === id);

function bezierPath(n1, n2, kind) {
  const { x: x1, y: y1 } = n1;
  const { x: x2, y: y2 } = n2;
  if (kind === 'core') return `M ${x1} ${y1} L ${x2} ${y2}`;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const pull = kind === 'cross' ? 0.32 : 0.06;
  const cpx = mx + (CX - mx) * pull;
  const cpy = my + (CY - my) * pull;
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
}

function isConnected(nodeId, edgeId) {
  const e = EDGES.find(e => e.id === edgeId);
  return e && (e.from === nodeId || e.to === nodeId);
}

function nodeEdges(nodeId) {
  return EDGES.filter(e => e.from === nodeId || e.to === nodeId);
}

// ─── Severity badge ───────────────────────────────────────────────────────────
const SEV_STYLE = {
  critical: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171', label: 'Critical'  },
  warning:  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24', label: 'Warning'   },
  positive: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34d399', label: 'Positive'  },
};

// ─── Animated Edge ────────────────────────────────────────────────────────────
function AnimEdge({ edge, active, highlighted, hovered }) {
  const n1 = nodeById(edge.from), n2 = nodeById(edge.to);
  const d = bezierPath(n1, n2, edge.kind);
  const isCross = edge.kind === 'cross';
  const isCore  = edge.kind === 'core';
  const fromColor = DC[n1.domain].p;
  const toColor   = DC[n2.domain].p;

  const baseOpacity = isCross ? 0.65 : isCore ? 0.4 : 0.3;
  const opacity = highlighted === null
    ? baseOpacity
    : highlighted === edge.id ? 1 : baseOpacity * 0.15;

  const strokeW = isCross ? 2.2 : isCore ? 1.8 : 1.4;
  const glowW   = isCross ? 8   : isCore ? 6   : 4;
  const speed   = isCross ? 1.4 : isCore ? 2.0 : 2.8;
  const dash    = isCross ? '8 5' : isCore ? '6 6' : '4 7';
  const gradId  = `g-${edge.id}`;

  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.3s' }}>
      {/* Glow underlay */}
      <path d={d} stroke={fromColor} strokeWidth={glowW} fill="none" opacity={0.07} />
      {/* Animated dashed line */}
      <motion.path
        d={d}
        stroke={isCross ? `url(#${gradId})` : isCore ? DC.center.p : fromColor}
        strokeWidth={strokeW}
        strokeDasharray={dash}
        fill="none"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -30 }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
        strokeLinecap="round"
      />
    </g>
  );
}

// ─── Compute per-node score from real data (0-100) ───────────────────────────
function computeNodeScores(health = {}, finance = {}, career = {}) {
  const sleepScore    = Math.min(100, Math.round(((health.sleepAvg    || 6) / 8)  * 100));
  const exerciseScore = Math.min(100, Math.round(((health.workoutsPerWeek || 0) / 5) * 100));
  const energyScore   = Math.round((sleepScore + exerciseScore) / 2);
  const savingsScore  = finance.savings > 0
    ? Math.min(100, Math.round((finance.savings / Math.max(finance.income || 50000, 10000)) * 100))
    : 0;
  const spendingScore = finance.income > 0
    ? Math.max(0, Math.round(100 - (finance.expenses / finance.income) * 100))
    : 50;
  const debtScore     = finance.debt > 0
    ? Math.max(0, Math.round(100 - Math.min(100, (finance.debt / Math.max(finance.income || 50000, 10000)) * 100)))
    : 100; // no debt = perfect score
  const studyScore    = Math.min(100, Math.round(((career.studyHoursDaily || 0) / 2) * 100));
  const focusScore    = Math.round((sleepScore + Math.min(100, 100 - (health.stressLevel || 5) * 8)) / 2);
  const skillsScore   = Math.min(100, Math.round(((career.skills?.length || 0) / 5) * 100));
  return { sleep: sleepScore, exercise: exerciseScore, energy: energyScore, savings: savingsScore, spending: spendingScore, debt: debtScore, study: studyScore, focus: focusScore, skills: skillsScore, life: 65 };
}

// Edge severity: is the cascade currently a problem for this user?
function edgeSeverity(edge, nodeScores) {
  if (!edge.negativeWhen) return 'positive';
  const score = nodeScores[edge.negativeWhen] ?? 50;
  if (score < 35) return 'critical';
  if (score < 55) return 'warning';
  return 'positive';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CascadeMap() {
  const { computed, health = {}, finance = {}, career = {} } = useData();

  const crossDomain  = computed?.crossDomain   ?? [];
  const healthScore  = computed?.healthScore?.score  ?? 65;
  const financeScore = computed?.financeScore?.score ?? 65;
  const careerScore  = computed?.careerScore?.score  ?? 68;
  const burnoutRisk  = computed?.burnout?.risk ?? 30;
  const balance      = computed?.balance ?? 66;

  const nodeScores = useMemo(() => computeNodeScores(health, finance, career), [health, finance, career]);

  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Which edges are highlighted (based on hovered node)
  const highlightedEdge = useMemo(() => {
    if (selectedEdge) return selectedEdge;
    return null;
  }, [selectedEdge]);

  // All edges connected to hovered node
  const dimmedEdges = useMemo(() => {
    if (!hoveredNode) return null;
    const connected = nodeEdges(hoveredNode).map(e => e.id);
    return connected;
  }, [hoveredNode]);

  const getEdgeOpacity = (edgeId) => {
    if (hoveredNode) {
      const connected = nodeEdges(hoveredNode).map(e => e.id);
      return connected.includes(edgeId) ? 1 : 0.1;
    }
    if (selectedEdge) return selectedEdge === edgeId ? 1 : 0.15;
    return null; // use default
  };

  // Real cascade data only — no mock fallback
  const activeCascades = crossDomain;
  const hasCascades = activeCascades.length > 0;

  const selectedEdgeData = EDGES.find(e => e.id === selectedEdge && e.kind === 'cross');
  // Augment with real computed cascade if one matches this edge's cascadeId
  const selectedRealCascade = selectedEdgeData?.cascadeId
    ? crossDomain.find(c => c.id === selectedEdgeData.cascadeId)
    : null;

  // Severity color per cross edge based on real node scores
  const SEVERITY_COLOR = { critical: '#ef4444', warning: '#f97316', positive: '#10b981' };

  // SVG gradient defs for cross-domain edges — colored by severity
  const gradientDefs = EDGES.filter(e => e.kind === 'cross').map(e => {
    const n1 = nodeById(e.from), n2 = nodeById(e.to);
    if (!n1 || !n2) return null;
    const sev = edgeSeverity(e, nodeScores);
    const col = SEVERITY_COLOR[sev];
    return (
      <linearGradient key={e.id} id={`g-${e.id}`}
        x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor={col} stopOpacity="0.9" />
        <stop offset="100%" stopColor={col} stopOpacity="0.5" />
      </linearGradient>
    );
  }).filter(Boolean);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f', padding:'20px 24px 0' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GitBranch size={17} style={{color:'#818cf8'}} />
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', margin:0, letterSpacing:'-0.02em' }}>Cascade Map</h1>
            <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>See how changes in one area ripple across your life.</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {[
            { label:'HEALTH',  score: Math.round(healthScore),  color:'#10b981' },
            { label:'FINANCE', score: Math.round(financeScore), color:'#f59e0b' },
            { label:'CAREER',  score: Math.round(careerScore),  color:'#3b82f6' },
            { label:'LIFE',    score: Math.round(balance),      color:'#6366f1' },
          ].map(d => (
            <div key={d.label} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${d.color}30`, background:`${d.color}10`, textAlign:'center' }}>
              <p style={{ fontSize:14, fontWeight:800, color:d.color, lineHeight:1, fontFamily:'monospace' }}>{d.score}</p>
              <p style={{ fontSize:9, color:d.color, opacity:0.7, letterSpacing:'0.1em', marginTop:2, fontWeight:700 }}>{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:'100%' }}>

        {/* ── Graph container with legend inside ── */}
        <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>

          {/* Legend bar */}
          <div style={{ display:'flex', alignItems:'center', gap:20, padding:'10px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexWrap:'wrap' }}>
            {[
              { color:'#10b981', dash:false, label:'Within-domain connection' },
              { color:'#3b82f6', dash:false, label:'Cross-domain cause-and-effect' },
              { color:'#f59e0b', dash:true,  label:'Cross-domain cascade (click to explore)' },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <svg width={28} height={6}><line x1={0} y1={3} x2={28} y2={3} stroke={l.color} strokeWidth={2} strokeDasharray={l.dash?'5 3':undefined}/></svg>
                <span style={{ fontSize:11, color:'#94a3b8' }}>{l.label}</span>
              </div>
            ))}
            <span style={{ marginLeft:'auto', fontSize:11, color:'#475569', fontStyle:'italic' }}>Hover nodes • Click cross-domain edges</span>
          </div>

        {/* ── SVG Graph ── */}
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', display: 'block' }}
            role="img"
            aria-label="Cross-domain cascade network graph"
          >
            <defs>
              {gradientDefs}
              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Domain cluster background halos */}
            <circle cx={140}  cy={268} r={185} fill="rgba(16,185,129,0.028)"  stroke="rgba(16,185,129,0.055)"  strokeWidth={1} />
            <circle cx={800}  cy={268} r={180} fill="rgba(245,158,11,0.028)"  stroke="rgba(245,158,11,0.055)"  strokeWidth={1} />
            <circle cx={CX}   cy={465} r={140} fill="rgba(59,130,246,0.028)"  stroke="rgba(59,130,246,0.055)"  strokeWidth={1} />

            {/* Domain labels */}
            {[
              { label: 'HEALTH',  x: 60,  y: 68,  color: '#10b981' },
              { label: 'FINANCE', x: 820, y: 68,  color: '#f59e0b' },
              { label: 'CAREER',  x: CX,  y: 348, color: '#3b82f6' },
            ].map(dl => (
              <text key={dl.label} x={dl.x} y={dl.y} fill={dl.color} fontSize={9}
                fontWeight="700" letterSpacing="3" opacity={0.5} textAnchor="middle">
                {dl.label}
              </text>
            ))}

            {/* Edges — render order: within → core → cross */}
            {EDGES.filter(e => e.kind === 'within').map(edge => {
              const n1 = nodeById(edge.from), n2 = nodeById(edge.to);
              const d  = bezierPath(n1, n2, 'within');
              const c  = DC[n1.domain].p;
              const op = hoveredNode
                ? nodeEdges(hoveredNode).map(e => e.id).includes(edge.id) ? 0.5 : 0.06
                : selectedEdge ? (selectedEdge === edge.id ? 0.5 : 0.06) : 0.28;
              return (
                <motion.path key={edge.id} d={d} stroke={c} strokeWidth={1.4}
                  strokeDasharray="4 6" fill="none" opacity={op}
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: -20 }}
                  transition={{ duration: 3, ease: 'linear', repeat: Infinity, repeatType: 'loop' }} />
              );
            })}

            {EDGES.filter(e => e.kind === 'core').map(edge => {
              const n1 = nodeById(edge.from), n2 = nodeById(edge.to);
              const d = bezierPath(n1, n2, 'core');
              const op = hoveredNode
                ? nodeEdges(hoveredNode).map(e => e.id).includes(edge.id) ? 0.7 : 0.08
                : selectedEdge ? 0.08 : 0.35;
              return (
                <g key={edge.id} opacity={op} style={{ transition: 'opacity 0.3s' }}>
                  <path d={d} stroke={DC.center.p} strokeWidth={6} fill="none" opacity={0.06} />
                  <motion.path d={d} stroke={DC.center.p} strokeWidth={1.8}
                    strokeDasharray="6 6" fill="none"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -24 }}
                    transition={{ duration: 2, ease: 'linear', repeat: Infinity, repeatType: 'loop' }} />
                </g>
              );
            })}

            {EDGES.filter(e => e.kind === 'cross').map(edge => {
              const n1 = nodeById(edge.from), n2 = nodeById(edge.to);
              const d = bezierPath(n1, n2, 'cross');
              const sev = edgeSeverity(edge, nodeScores);
              const isProblematic = sev === 'critical' || sev === 'warning';
              const isSelected = selectedEdge === edge.id;
              const sevCol = SEVERITY_COLOR[sev];
              const op = hoveredNode
                ? nodeEdges(hoveredNode).map(e => e.id).includes(edge.id) ? 1 : 0.08
                : selectedEdge ? (isSelected ? 1 : 0.1) : (isProblematic ? 0.85 : 0.45);

              return (
                <g key={edge.id} opacity={op} style={{ transition: 'opacity 0.3s', cursor: 'pointer' }}
                  onClick={() => setSelectedEdge(isSelected ? null : edge.id)}>
                  {/* Glow underlay */}
                  <path d={d} stroke={sevCol} strokeWidth={10} fill="none" opacity={0.08} />
                  {/* Animated main line */}
                  <motion.path d={d} stroke={`url(#g-${edge.id})`} strokeWidth={isProblematic ? 2.6 : 1.8}
                    strokeDasharray="8 5" fill="none" strokeLinecap="round"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -26 }}
                    transition={{ duration: isProblematic ? 1.1 : 2.2, ease: 'linear', repeat: Infinity, repeatType: 'loop' }} />
                  {/* Severity dot at midpoint — pulsing for critical/warning */}
                  {(() => {
                    const mx = (n1.x + n2.x) / 2 + (CX - (n1.x + n2.x) / 2) * 0.12;
                    const my = (n1.y + n2.y) / 2 + (CY - (n1.y + n2.y) / 2) * 0.12;
                    return (
                      <motion.circle cx={mx} cy={my} r={isProblematic ? 4.5 : 3} fill={sevCol}
                        animate={isProblematic
                          ? { scale: [1, 1.6, 1], opacity: [0.9, 0.35, 0.9] }
                          : { opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: isProblematic ? 1.4 : 2.5, repeat: Infinity, ease: 'easeInOut' }} />
                    );
                  })()}
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map((node) => {
              const colors = DC[node.domain];
              const isHovered  = hoveredNode === node.id;
              const isConnectedToHovered = hoveredNode && nodeEdges(hoveredNode).some(e => e.from === node.id || e.to === node.id) && !isHovered;
              const dim = hoveredNode && !isHovered && !isConnectedToHovered;
              const hasActiveCascade = activeCascades.some(c => c.from === node.domain || c.to === node.domain);

              return (
                <g key={node.id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.25s' }}
                  opacity={dim ? 0.25 : 1}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => { setSelectedEdge(null); setHoveredNode(node.id); }}
                >
                  {/* Pulsing halo for center node */}
                  {node.isCenter && (
                    <motion.circle cx={node.x} cy={node.y} r={node.r + 14} fill="none"
                      stroke={colors.p} strokeWidth={1.5}
                      animate={{ r: [node.r + 14, node.r + 26], opacity: [0.35, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }} />
                  )}
                  {/* Active cascade pulse ring */}
                  {hasActiveCascade && !node.isCenter && (
                    <motion.circle cx={node.x} cy={node.y} r={node.r + 5}
                      fill="none" stroke={colors.p} strokeWidth={1.2}
                      animate={{ opacity: [0.5, 0.1, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity }} />
                  )}
                  {/* Hover outer ring */}
                  {isHovered && (
                    <circle cx={node.x} cy={node.y} r={node.r + 8}
                      fill="none" stroke={colors.p} strokeWidth={1.5} opacity={0.4} />
                  )}
                  {/* Main filled circle */}
                  <circle cx={node.x} cy={node.y} r={node.r}
                    fill={node.isCenter ? 'rgba(99,102,241,0.25)' : colors.bg}
                    stroke={isHovered ? colors.p : colors.b}
                    strokeWidth={isHovered ? 2.5 : 2} />
                  {/* Emoji icon */}
                  <text x={node.x} y={node.isCenter ? node.y - 4 : node.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={node.isCenter ? 18 : 14}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {node.emoji}
                  </text>
                  {/* Center node: show score inside */}
                  {node.isCenter && (
                    <text x={CX} y={CY + 14} textAnchor="middle"
                      fontSize={11} fill="#a5b4fc" fontWeight="800"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {Math.round(balance)}
                    </text>
                  )}
                  {/* Score inside non-center nodes */}
                  {!node.isCenter && nodeScores[node.id] != null && (
                    <text x={node.x} y={node.y + 4} textAnchor="middle"
                      fontSize={8} fill={colors.p} fontWeight="800"
                      style={{ userSelect:'none', pointerEvents:'none' }}>
                      {nodeScores[node.id]}
                    </text>
                  )}
                  {/* Label below node */}
                  <text x={node.x} y={node.y + node.r + 14} textAnchor="middle"
                    fontSize={node.isCenter ? 10 : 9}
                    fill={isHovered ? colors.p : '#64748b'}
                    fontWeight={isHovered ? '700' : '500'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>{/* end graph container */}
        </div>{/* end graph+legend card */}

        {/* ── Edge detail panel ── */}
        <AnimatePresence>
          {selectedEdgeData && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
              style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:12, padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                {(() => {
                  const sev = edgeSeverity(selectedEdgeData, nodeScores);
                  const isGood = sev === 'positive';
                  const sevCol = SEVERITY_COLOR[sev];
                  const sevLabel = sev.charAt(0).toUpperCase() + sev.slice(1);
                  const displayLabel = isGood ? (selectedEdgeData.labelGood || selectedEdgeData.label) : selectedEdgeData.label;
                  const displayWhy   = isGood ? (selectedEdgeData.whyGood   || selectedEdgeData.why)   : selectedEdgeData.why;
                  return (
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color: DC[nodeById(selectedEdgeData.from).domain].p }}>
                          {nodeById(selectedEdgeData.from).label}
                        </span>
                        <ArrowRight size={12} style={{ color:'#64748b' }} />
                        <span style={{ fontSize:12, fontWeight:700, color: DC[nodeById(selectedEdgeData.to).domain].p }}>
                          {nodeById(selectedEdgeData.to).label}
                        </span>
                        <span style={{ marginLeft:6, padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:`${sevCol}20`, color:sevCol, border:`1px solid ${sevCol}40` }}>
                          {sevLabel}
                        </span>
                      </div>
                      <p style={{ fontSize:14, fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>
                        {selectedRealCascade?.trigger || displayLabel}
                      </p>
                      <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>
                        {selectedRealCascade?.effect || displayWhy}
                      </p>
                      {selectedRealCascade && (
                        <p style={{ fontSize:11, color:'#64748b', lineHeight:1.5, marginTop:4 }}>{selectedRealCascade.mechanism}</p>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => setSelectedEdge(null)}
                  style={{ color:'#475569', background:'none', border:'none', cursor:'pointer', fontSize:14, flexShrink:0, padding:'2px 6px' }}>✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live Detected Cascades ── */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <Zap size={14} style={{color:'#818cf8'}}/>
            <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Live detected cascades — your data right now
            </p>
            <span style={{ padding:'2px 10px', borderRadius:999, background:'rgba(99,102,241,0.2)', color:'#818cf8', fontSize:10, fontWeight:700 }}>
              {activeCascades.length} active
            </span>
          </div>

          {activeCascades.length === 0 ? (
            <div style={{ padding:'20px', borderRadius:12, textAlign:'center', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle size={20} style={{color:'#10b981', margin:'0 auto 8px'}}/>
              <p style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>No active cascades</p>
              <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>
                {(healthScore > 0 || financeScore > 0 || careerScore > 0)
                  ? 'Your domains are in balance. Keep it up.'
                  : 'Log health, finance & career data to detect cross-domain effects.'}
              </p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {activeCascades.map((c, i) => {
                const sev = SEV_STYLE[c.severity] || SEV_STYLE.warning;
                const fromColor = DC[c.from]?.p || '#94a3b8';
                const toColor   = DC[c.to]?.p   || '#94a3b8';
                return (
                  <motion.div key={c.id}
                    initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.08 }}
                    style={{ background:'rgba(15,20,35,0.98)', border:`1px solid rgba(255,255,255,0.07)`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:12, cursor:'default' }}>
                    <div style={{ width:32, height:32, borderRadius:8, background: sev.bg, border:`1px solid ${sev.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {c.type === 'positive'
                        ? <CheckCircle size={14} style={{ color: sev.text }}/>
                        : <AlertTriangle size={14} style={{ color: sev.text }}/>
                      }
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', padding:'2px 8px', borderRadius:4, background: fromColor+'20', color: fromColor }}>{c.from}</span>
                        <ArrowRight size={10} style={{ color: sev.text }}/>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', padding:'2px 8px', borderRadius:4, background: toColor+'20', color: toColor }}>{c.to}</span>
                        <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background: sev.bg, color: sev.text }}>{sev.label}</span>
                      </div>
                      <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:4 }}>{c.trigger}</p>
                      <p style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>{c.effect}</p>
                      <p style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{c.mechanism}</p>
                    </div>
                    <ArrowRight size={14} style={{ color:'#475569', flexShrink:0, marginTop:2 }}/>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── What is a cascade ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderRadius:10, background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.12)' }}>
          <Info size={14} style={{ color:'#818cf8', flexShrink:0, marginTop:2 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#a5b4fc', marginBottom:5 }}>What is a cross-domain cascade?</p>
            <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:3 }}>
              A cascade is when a problem in one life domain causes measurable damage in another — without you noticing the link.
            </p>
            <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>
              BeyondSelf's engine detects these chains from your real data and surfaces them before they compound.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
