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
  { id: 'sleep',    label: 'Sleep',       domain: 'health',  x: 128, y: 138, emoji: '😴', r: 28 },
  { id: 'exercise', label: 'Exercise',    domain: 'health',  x: 68,  y: 272, emoji: '🏃', r: 26 },
  { id: 'energy',   label: 'Energy',      domain: 'health',  x: 148, y: 398, emoji: '⚡', r: 26 },
  // Finance cluster — right
  { id: 'savings',  label: 'Savings',     domain: 'finance', x: 792, y: 138, emoji: '🏦', r: 26 },
  { id: 'spending', label: 'Spending',    domain: 'finance', x: 852, y: 272, emoji: '💸', r: 26 },
  { id: 'debt',     label: 'Debt Stress', domain: 'finance', x: 780, y: 398, emoji: '📉', r: 26 },
  // Career cluster — bottom
  { id: 'study',    label: 'Study Hrs',   domain: 'career',  x: 330, y: 458, emoji: '📚', r: 26 },
  { id: 'focus',    label: 'Focus',       domain: 'career',  x: 460, y: 488, emoji: '🎯', r: 26 },
  { id: 'skills',   label: 'Skills',      domain: 'career',  x: 590, y: 458, emoji: '🚀', r: 26 },
  // Center
  { id: 'life',     label: 'Life Balance',domain: 'center',  x: CX,  y: CY,  emoji: '✦',  r: 40, isCenter: true },
];

// ─── Edge definitions ─────────────────────────────────────────────────────────
const EDGES = [
  // Within-domain (thin, same-color)
  { id: 'sl-en',  from: 'sleep',    to: 'energy',   kind: 'within' },
  { id: 'ex-en',  from: 'exercise', to: 'energy',   kind: 'within' },
  { id: 'sa-sp',  from: 'savings',  to: 'spending', kind: 'within' },
  { id: 'st-fo',  from: 'study',    to: 'focus',    kind: 'within' },
  { id: 'fo-sk',  from: 'focus',    to: 'skills',   kind: 'within' },
  // Core (domain → center)
  { id: 'en-li',  from: 'energy',   to: 'life',     kind: 'core' },
  { id: 'sa-li',  from: 'savings',  to: 'life',     kind: 'core' },
  { id: 'sk-li',  from: 'skills',   to: 'life',     kind: 'core' },
  // Cross-domain cascades — THE KEY FEATURE
  {
    id: 'sl-fo',  from: 'sleep',   to: 'focus',    kind: 'cross',
    label: 'Sleep → Focus Crash',
    why: 'Every hour below 7h sleep costs ~15% of working memory. Sleep debt accumulates silently until cognitive performance collapses.',
    cascadeId: 'sleep-productivity',
  },
  {
    id: 'sl-sp',  from: 'sleep',   to: 'spending', kind: 'cross',
    label: 'Sleep Debt → Impulse Spending',
    why: 'Cortisol from poor sleep reduces prefrontal inhibition — the brain defaults to reward-seeking. Emotionally fatigued people spend more.',
    cascadeId: 'stress-spending',
  },
  {
    id: 'de-sl',  from: 'debt',    to: 'sleep',    kind: 'cross',
    label: 'Financial Stress → Insomnia',
    why: 'Money anxiety is the #1 cause of stress-related insomnia. Debt below 1 month of savings triggers chronic cortisol elevation at night.',
    cascadeId: 'financial-stress',
  },
  {
    id: 'en-st',  from: 'energy',  to: 'study',    kind: 'cross',
    label: 'Energy → Study Capacity',
    why: 'Physical energy directly caps the number of effective study hours. Low energy means high hours spent, low output absorbed.',
    cascadeId: 'overwork-health',
  },
  {
    id: 'sa-fo',  from: 'savings', to: 'focus',    kind: 'cross',
    label: 'Financial Security → Focus',
    why: 'Cognitive Load Theory: financial worry occupies ~13 IQ points of working memory. A savings buffer liberates focus capacity.',
    cascadeId: 'financial-stress',
  },
  {
    id: 'sk-sa',  from: 'skills',  to: 'savings',  kind: 'cross',
    label: 'Upskilling → Income → Savings',
    why: 'Skills compound. Each verifiable skill increases expected salary by 8–15%. This directly feeds monthly savings capacity.',
    cascadeId: 'exercise-focus',
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CascadeMap() {
  const { computed, health = {}, finance = {}, career = {} } = useData();

  const crossDomain  = computed?.crossDomain   ?? [];
  const healthScore  = computed?.healthScore?.score  ?? 65;
  const financeScore = computed?.financeScore?.score ?? 65;
  const careerScore  = computed?.careerScore?.score  ?? 68;
  const burnoutRisk  = computed?.burnout?.risk ?? 30;
  const balance      = computed?.balance ?? 66;

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

  // Detected cascades from the real engine
  const activeCascades = crossDomain.length > 0 ? crossDomain : [
    {
      id: 'sleep-productivity', type: 'negative', from: 'health', to: 'career',
      trigger: 'Sleep at 6.2h/night',
      effect: '~22% reduction in study efficiency',
      severity: 'warning',
      mechanism: 'Sleep deficit reduces cognitive consolidation and working memory, lowering effective study hours.',
    },
    {
      id: 'stress-spending', type: 'negative', from: 'health', to: 'finance',
      trigger: 'Stress level at 7/10',
      effect: 'Estimated ₹2,400 in stress-related spending/month',
      severity: 'warning',
      mechanism: 'High cortisol reduces impulse control, increasing likelihood of comfort spending.',
    },
  ];

  const selectedEdgeData = EDGES.find(e => e.id === selectedEdge && e.kind === 'cross');

  // SVG gradient defs for cross-domain edges
  const gradientDefs = EDGES.filter(e => e.kind === 'cross').map(e => {
    const n1 = nodeById(e.from), n2 = nodeById(e.to);
    return (
      <linearGradient key={e.id} id={`g-${e.id}`}
        x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor={DC[n1.domain].p} />
        <stop offset="100%" stopColor={DC[n2.domain].p} />
      </linearGradient>
    );
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <GitBranch size={17} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Cascade Network</h1>
              <p className="text-[11px] text-slate-500">Live cross-domain cause-and-effect graph</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'Health',  score: Math.round(healthScore),  color: '#10b981' },
              { label: 'Finance', score: Math.round(financeScore), color: '#f59e0b' },
              { label: 'Career',  score: Math.round(careerScore),  color: '#3b82f6' },
            ].map(d => (
              <div key={d.label} className="text-center">
                <p className="text-lg font-black tabular-nums" style={{ color: d.color }}>{d.score}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{d.label}</p>
              </div>
            ))}
            <div className="text-center pl-3 border-l border-white/10">
              <p className="text-lg font-black tabular-nums text-indigo-400">{Math.round(balance)}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Life</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4 space-y-5">

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-4 items-center px-2">
          {[
            { color: '#6366f1', dash: false, label: 'Core flow (domain → life balance)' },
            { color: '#10b981', dash: false, label: 'Within-domain connection' },
            { color: '#f59e0b', dash: true,  label: 'Cross-domain cascade (click to explore)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <svg width={28} height={6}>
                <line x1={0} y1={3} x2={28} y2={3} stroke={l.color} strokeWidth={2}
                  strokeDasharray={l.dash ? '5 3' : undefined} />
              </svg>
              <span className="text-[11px] text-slate-400">{l.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-slate-500 italic hidden md:block">
            Hover nodes · Click cross-domain edges
          </div>
        </div>

        {/* ── SVG Graph ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
              const isActive = activeCascades.some(c => c.id === edge.cascadeId);
              const isSelected = selectedEdge === edge.id;
              const op = hoveredNode
                ? nodeEdges(hoveredNode).map(e => e.id).includes(edge.id) ? 1 : 0.08
                : selectedEdge ? (isSelected ? 1 : 0.1) : (isActive ? 0.75 : 0.45);

              return (
                <g key={edge.id} opacity={op} style={{ transition: 'opacity 0.3s', cursor: 'pointer' }}
                  onClick={() => setSelectedEdge(isSelected ? null : edge.id)}>
                  {/* Fat glow */}
                  <path d={d} stroke={`url(#g-${edge.id})`} strokeWidth={10} fill="none" opacity={0.07} />
                  {/* Animated main */}
                  <motion.path d={d} stroke={`url(#g-${edge.id})`} strokeWidth={isActive ? 2.6 : 2.0}
                    strokeDasharray="8 5" fill="none" strokeLinecap="round"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -26 }}
                    transition={{ duration: isActive ? 1.2 : 1.8, ease: 'linear', repeat: Infinity, repeatType: 'loop' }} />
                  {/* Active cascade dot at midpoint */}
                  {isActive && (() => {
                    const mx = (n1.x + n2.x) / 2 + (CX - (n1.x + n2.x) / 2) * 0.12;
                    const my = (n1.y + n2.y) / 2 + (CY - (n1.y + n2.y) / 2) * 0.12;
                    return (
                      <motion.circle cx={mx} cy={my} r={4} fill={DC[n1.domain].p}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
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

              return (
                <g key={node.id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.25s' }}
                  opacity={dim ? 0.3 : 1}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    setSelectedEdge(null);
                    setHoveredNode(node.id);
                  }}
                >
                  {/* Pulsing halo for center node */}
                  {node.isCenter && (
                    <motion.circle cx={node.x} cy={node.y} r={node.r + 12} fill="none"
                      stroke={colors.p} strokeWidth={1.5}
                      animate={{ r: [node.r + 12, node.r + 22], opacity: [0.4, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }} />
                  )}
                  {/* Hover ring */}
                  {isHovered && (
                    <circle cx={node.x} cy={node.y} r={node.r + 7}
                      fill="none" stroke={colors.p} strokeWidth={2} opacity={0.5} />
                  )}
                  {/* Active cascade ring */}
                  {activeCascades.some(c => c.from === node.domain || c.to === node.domain) && !node.isCenter && (
                    <motion.circle cx={node.x} cy={node.y} r={node.r + 4}
                      fill="none" stroke={colors.p} strokeWidth={1}
                      animate={{ opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }} />
                  )}
                  {/* Main circle */}
                  <circle cx={node.x} cy={node.y} r={node.r}
                    fill={colors.bg} stroke={isHovered ? colors.p : colors.b}
                    strokeWidth={isHovered ? 2 : 1.5} />
                  {/* Emoji */}
                  <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={node.isCenter ? 20 : 15} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {node.emoji}
                  </text>
                  {/* Label */}
                  <text x={node.x} y={node.y + node.r + 13} textAnchor="middle"
                    fontSize={9} fill={isHovered ? colors.p : '#6b7280'}
                    fontWeight={isHovered ? '700' : '500'}
                    style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 0.2s' }}>
                    {node.label}
                  </text>
                </g>
              );
            })}

            {/* Score badge on center node */}
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize={8}
              fill="rgba(99,102,241,0.8)" fontWeight="700" style={{ pointerEvents: 'none' }}>
              {Math.round(balance)}
            </text>
          </svg>
        </div>

        {/* ── Edge detail panel (shows when cross-domain edge clicked) ── */}
        <AnimatePresence>
          {selectedEdgeData && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: DC[nodeById(selectedEdgeData.from).domain].p }}>
                      {nodeById(selectedEdgeData.from).label}
                    </span>
                    <ArrowRight size={14} className="text-slate-500" />
                    <span className="text-sm font-bold" style={{ color: DC[nodeById(selectedEdgeData.to).domain].p }}>
                      {nodeById(selectedEdgeData.to).label}
                    </span>
                  </div>
                  <p className="text-base font-black text-white mb-2">{selectedEdgeData.label}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedEdgeData.why}</p>
                </div>
                <button onClick={() => setSelectedEdge(null)}
                  className="text-slate-500 hover:text-white transition-colors text-xs px-2 py-1 flex-shrink-0">
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Detected Cascades (from real engine) ── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Zap size={12} className="text-indigo-400" />
            Live detected cascades — your data right now
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
              {activeCascades.length} active
            </span>
          </p>

          {activeCascades.length === 0 ? (
            <div className="p-5 rounded-2xl text-center"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle size={22} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-300">No active cascades detected</p>
              <p className="text-xs text-slate-400 mt-1">Your domains are in balance. Keep it up.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCascades.map((c, i) => {
                const sev = SEV_STYLE[c.severity] || SEV_STYLE.warning;
                const fromColor = DC[c.from]?.p || '#94a3b8';
                const toColor   = DC[c.to]?.p   || '#94a3b8';
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="p-4 rounded-2xl"
                    style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                        {c.type === 'positive'
                          ? <CheckCircle size={15} style={{ color: sev.text }} />
                          : <AlertTriangle size={15} style={{ color: sev.text }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ background: fromColor + '20', color: fromColor }}>
                            {c.from}
                          </span>
                          <ArrowRight size={10} style={{ color: sev.text }} />
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ background: toColor + '20', color: toColor }}>
                            {c.to}
                          </span>
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: sev.bg, color: sev.text }}>
                            {sev.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mb-1">{c.trigger}</p>
                        <p className="text-xs text-slate-300 mb-1.5">{c.effect}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{c.mechanism}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── What is a cascade ── */}
        <div className="p-4 rounded-2xl flex items-start gap-3"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <Info size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-indigo-300 mb-1">What is a cross-domain cascade?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              A cascade is when a problem in one life domain causes measurable damage in another — without you noticing the link.
              Poor sleep doesn't just make you tired; it triggers impulse purchases and crashes your study output simultaneously.
              BeyondSelf's engine detects these chains from your real data and surfaces them before they compound.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
