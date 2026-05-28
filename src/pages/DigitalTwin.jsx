import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { LifeAvatar } from '../components/ui/LifeAvatar';
import {
  Cpu, Heart, Wallet, Target, GitBranch, TrendingUp,
  Zap, ChevronRight, RefreshCw, Eye, Layers
} from 'lucide-react';

// ─── Birth sequence (plays once per session) ──────────────────────────────────
const BIRTH_KEY = 'dt_twin_born';

function BirthSequence({ onDone }) {
  const [phase, setPhase] = useState(0);
  // phase 0 = scan rings, 1 = text, 2 = fade out
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }} animate={{ opacity: phase === 2 ? 0 : 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: '#03030a' }}
    >
      {/* Scan rings */}
      {[1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 4 + i * 1.5, opacity: 0 }}
          transition={{ duration: 2, delay: i * 0.18, ease: 'easeOut' }}
          className="absolute w-32 h-32 rounded-full border"
          style={{ borderColor: `rgba(99,102,241,${0.6 - i * 0.15})` }}
        />
      ))}

      {/* Center glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.1) 70%)' }}
      >
        <Cpu size={32} className="text-indigo-400" />
      </motion.div>

      <AnimatePresence>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="text-xs font-mono text-indigo-400 tracking-[0.3em] uppercase mb-2">
              Initializing Digital Twin
            </p>
            <motion.div className="flex gap-1 justify-center">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip */}
      <button onClick={onDone}
        className="absolute bottom-8 right-8 text-xs text-slate-600 hover:text-slate-400 transition-colors">
        Skip →
      </button>
    </motion.div>
  );
}

// ─── Ambient particle field ───────────────────────────────────────────────────
function ParticleField({ stateColor }) {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      dur: 4 + Math.random() * 5,
      delay: Math.random() * 4,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: stateColor, opacity: 0.3 }}
          animate={{ y: [0, -24, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Score orbit ring ─────────────────────────────────────────────────────────
function OrbitRing({ score, label, color, icon: Icon, radius, angleOffset }) {
  const pct = score / 100;
  const size = radius * 2 + 48;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Icon position on ring
  const angle = (angleOffset - 90) * (Math.PI / 180);
  const iconX = cx + radius * Math.cos(angle);
  const iconY = cy + radius * Math.sin(angle);

  return (
    <div className="absolute" style={{ width: size, height: size, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
      <svg width={size} height={size}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        {/* Progress */}
        <motion.circle cx={cx} cy={cy} r={radius} fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
        />
        {/* Icon bubble */}
        <foreignObject x={iconX - 14} y={iconY - 14} width={28} height={28}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: color + '22', border: `1px solid ${color}55` }}>
            <Icon size={13} style={{ color }} />
          </div>
        </foreignObject>
        {/* Score label */}
        <text x={iconX} y={iconY + 22} textAnchor="middle" fontSize="8" fill={color} fontWeight="bold">
          {Math.round(score)}
        </text>
        <text x={iconX} y={iconY + 31} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── State color/label map ────────────────────────────────────────────────────
const STATE_META = {
  thriving:   { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'THRIVING',   glow: '0 0 60px rgba(16,185,129,0.25)' },
  normal:     { color: '#6366f1', bg: 'rgba(99,102,241,0.06)',  label: 'BALANCED',   glow: '0 0 50px rgba(99,102,241,0.2)'  },
  tired:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)',  label: 'FATIGUED',   glow: 'none' },
  overworked: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  label: 'OVERLOADED', glow: 'none' },
  broke:      { color: '#f43f5e', bg: 'rgba(244,63,94,0.06)',   label: 'STRUGGLING', glow: 'none' },
  burnout:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'BURNED OUT', glow: '0 0 80px rgba(239,68,68,0.2)'  },
};

function computeStateName(h, f, c, burn) {
  const avg = (h + f + c) / 3;
  if (burn > 60 || avg < 28) return 'burnout';
  if (c > 65 && h < 44)      return 'overworked';
  if (h < 44)                 return 'tired';
  if (f < 33)                 return 'broke';
  if (avg > 72)               return 'thriving';
  return 'normal';
}

// ─── What-If Lab slider ───────────────────────────────────────────────────────
function DomainSlider({ label, color, value, onChange }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
          layout transition={{ duration: 0.15 }}
        />
        <input ref={inputRef} type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  );
}

// ─── Evolution states gallery ─────────────────────────────────────────────────
const GALLERY_STATES = [
  { key: 'thriving',   h: 85, f: 80, c: 82, burn: 10 },
  { key: 'normal',     h: 65, f: 62, c: 68, burn: 25 },
  { key: 'tired',      h: 38, f: 60, c: 65, burn: 30 },
  { key: 'overworked', h: 40, f: 62, c: 78, burn: 40 },
  { key: 'broke',      h: 60, f: 25, c: 55, burn: 20 },
  { key: 'burnout',    h: 30, f: 28, c: 30, burn: 75 },
];

function GalleryCard({ entry, index }) {
  const meta = STATE_META[entry.key];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ y: -4, boxShadow: `0 12px 32px ${meta.color}22` }}
      className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-shadow"
      style={{ background: meta.bg, border: `1px solid ${meta.color}25` }}
    >
      <div className="scale-75 origin-top" style={{ height: 170 }}>
        <LifeAvatar healthScore={entry.h} financeScore={entry.f} careerScore={entry.c} burnoutRisk={entry.burn} />
      </div>
      <span className="text-[10px] font-bold tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
      <div className="flex gap-2 text-[9px] text-slate-500">
        <span>H:{entry.h}</span>
        <span>F:{entry.f}</span>
        <span>C:{entry.c}</span>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DigitalTwin() {
  const { computed } = useData();

  const [born, setBorn] = useState(() => !!sessionStorage.getItem(BIRTH_KEY));
  const [whatIfH, setWhatIfH] = useState(65);
  const [whatIfF, setWhatIfF] = useState(60);
  const [whatIfC, setWhatIfC] = useState(68);

  const handleBorn = useCallback(() => {
    sessionStorage.setItem(BIRTH_KEY, '1');
    setBorn(true);
  }, []);

  const hScore    = computed?.healthScore?.score  ?? 62;
  const fScore    = computed?.financeScore?.score ?? 60;
  const cScore    = computed?.careerScore?.score  ?? 68;
  const burnout   = computed?.burnout?.risk       ?? 25;
  const balance   = computed?.balance             ?? 63;

  const stateName = useMemo(() => computeStateName(hScore, fScore, cScore, burnout), [hScore, fScore, cScore, burnout]);
  const meta      = STATE_META[stateName];

  const whatIfState = useMemo(() => computeStateName(whatIfH, whatIfF, whatIfC, 20), [whatIfH, whatIfF, whatIfC]);
  const whatIfMeta  = STATE_META[whatIfState];

  // Spring for life score display
  const springScore = useMotionValue(balance);
  const displayScore = useSpring(springScore, { stiffness: 80, damping: 18 });
  useEffect(() => { springScore.set(balance); }, [balance, springScore]);

  return (
    <>
      <AnimatePresence>
        {!born && <BirthSequence key="birth" onDone={handleBorn} />}
      </AnimatePresence>

      <AnimatePresence>
        {born && (
          <motion.div key="content"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            className="min-h-screen pb-24" style={{ background: '#080810' }}
          >
            {/* ── Header ── */}
            <div className="px-6 pt-8 pb-6 max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40` }}>
                  <Cpu size={18} style={{ color: meta.color }} />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white tracking-tight">Digital Twin</h1>
                  <p className="text-xs text-slate-500">Your living life model — evolves with every data point</p>
                </div>
                <motion.div className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest"
                  key={stateName}
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}40` }}>
                  {meta.label}
                </motion.div>
              </motion.div>
            </div>

            {/* ── Twin Chamber ── */}
            <div className="max-w-5xl mx-auto px-6 mb-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${meta.color}12 0%, #0a0a14 65%)`,
                  border: `1px solid ${meta.color}25`,
                  boxShadow: meta.glow,
                  minHeight: 420,
                }}
              >
                <ParticleField stateColor={meta.color} />

                {/* Scan grid overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }} />

                <div className="relative flex flex-col lg:flex-row items-center gap-8 p-8">
                  {/* Avatar + orbit rings */}
                  <div className="relative flex-shrink-0" style={{ width: 320, height: 320 }}>
                    {/* Orbit rings */}
                    <OrbitRing score={hScore} label="Health"  color="#10b981" icon={Heart}  radius={110} angleOffset={210} />
                    <OrbitRing score={fScore} label="Finance" color="#f59e0b" icon={Wallet} radius={130} angleOffset={330} />
                    <OrbitRing score={cScore} label="Career"  color="#3b82f6" icon={Target} radius={150} angleOffset={90}  />

                    {/* Avatar centered */}
                    <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1.15)', transformOrigin: 'center' }}>
                      <LifeAvatar healthScore={hScore} financeScore={fScore} careerScore={cScore} burnoutRisk={burnout} />
                    </div>
                  </div>

                  {/* Stats panel */}
                  <div className="flex-1 space-y-6">
                    {/* Life score */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Life Balance Score</p>
                      <div className="flex items-end gap-2">
                        <motion.span className="text-6xl font-black tabular-nums" style={{ color: meta.color }}>
                          {Math.round(balance)}
                        </motion.span>
                        <span className="text-slate-600 text-sm mb-2">/ 100</span>
                      </div>
                      {/* Score bar */}
                      <div className="h-2 rounded-full mt-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${balance}%` }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                          style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                        />
                      </div>
                    </div>

                    {/* Domain bars */}
                    <div className="space-y-3">
                      {[
                        { label: 'Health',  score: hScore, color: '#10b981' },
                        { label: 'Finance', score: fScore, color: '#f59e0b' },
                        { label: 'Career',  score: cScore, color: '#3b82f6' },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-slate-400">{d.label}</span>
                            <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>{Math.round(d.score)}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${d.score}%` }}
                              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                              style={{ background: d.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick links */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {[
                        { to: '/future-you', icon: TrendingUp, label: 'Projection',  color: '#6366f1' },
                        { to: '/cascade-map',icon: GitBranch,  label: 'Cascade Map', color: '#10b981' },
                        { to: '/insights',   icon: Eye,        label: 'Insights',    color: '#8b5cf6' },
                      ].map(l => (
                        <Link key={l.to} to={l.to}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:scale-105"
                          style={{ background: l.color + '15', color: l.color, border: `1px solid ${l.color}30` }}>
                          <l.icon size={12} />
                          {l.label}
                          <ChevronRight size={10} />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── What-If Lab ── */}
            <div className="max-w-5xl mx-auto px-6 mb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={15} className="text-amber-400" />
                  <h2 className="text-sm font-bold text-white">What-If Lab</h2>
                  <span className="text-xs text-slate-500 ml-1">— drag sliders to preview your twin's evolution</span>
                  <button
                    onClick={() => { setWhatIfH(hScore); setWhatIfF(fScore); setWhatIfC(cScore); }}
                    className="ml-auto text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Sliders */}
                  <div className="space-y-5">
                    <DomainSlider label="Health Score"  color="#10b981" value={whatIfH} onChange={setWhatIfH} />
                    <DomainSlider label="Finance Score" color="#f59e0b" value={whatIfF} onChange={setWhatIfF} />
                    <DomainSlider label="Career Score"  color="#3b82f6" value={whatIfC} onChange={setWhatIfC} />

                    {/* Cascade prediction */}
                    <div className="pt-3 border-t border-white/[0.05]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Cascade Effect</p>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        {whatIfH < 45 && (
                          <div className="flex items-center gap-2">
                            <span className="text-red-400">↓</span>
                            Poor sleep → emotional spending risk +{Math.round((50 - whatIfH) * 0.4)}%
                          </div>
                        )}
                        {whatIfF < 40 && (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400">↓</span>
                            Financial stress → career focus −{Math.round((45 - whatIfF) * 0.3)} pts
                          </div>
                        )}
                        {whatIfH > 70 && whatIfC > 70 && (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">↑</span>
                            High vitality × strong career → compounding momentum
                          </div>
                        )}
                        {whatIfH >= 45 && whatIfF >= 40 && !(whatIfH > 70 && whatIfC > 70) && (
                          <div className="text-slate-600">No critical cascades at these levels</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Twin Preview</p>
                    <div className="relative">
                      {/* Glow */}
                      <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
                        style={{ background: whatIfMeta.color, transform: 'scale(0.7) translateY(20%)' }} />
                      <LifeAvatar healthScore={whatIfH} financeScore={whatIfF} careerScore={whatIfC} burnoutRisk={20} />
                    </div>
                    <motion.div key={whatIfState}
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest"
                      style={{ background: whatIfMeta.color + '18', color: whatIfMeta.color, border: `1px solid ${whatIfMeta.color}40` }}>
                      {whatIfMeta.label}
                    </motion.div>
                    {/* Avg score */}
                    <p className="text-xs text-slate-600">
                      Avg: <span className="font-bold tabular-nums" style={{ color: whatIfMeta.color }}>
                        {Math.round((whatIfH + whatIfF + whatIfC) / 3)}
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Evolution Gallery ── */}
            <div className="max-w-5xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={14} className="text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Evolution States</h2>
                  <span className="text-xs text-slate-500 ml-1">— all possible forms your twin can take</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {GALLERY_STATES.map((entry, i) => (
                    <GalleryCard key={entry.key} entry={entry} index={i} />
                  ))}
                </div>

                {/* Current state callout */}
                <motion.div
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 p-4 rounded-xl flex items-center gap-3"
                  style={{ background: meta.color + '10', border: `1px solid ${meta.color}25` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.color + '20' }}>
                    <Cpu size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: meta.color }}>
                      Your twin is currently in <span className="font-black">{meta.label}</span> state
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Based on H:{Math.round(hScore)} · F:{Math.round(fScore)} · C:{Math.round(cScore)} · Burnout:{Math.round(burnout)}%
                    </p>
                  </div>
                  <Link to="/future-you"
                    className="text-xs font-semibold flex items-center gap-1 flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: meta.color }}>
                    See trajectory <ChevronRight size={12} />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
