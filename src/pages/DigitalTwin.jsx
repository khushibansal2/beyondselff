import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { LifeAvatar } from '../components/ui/LifeAvatar';

// ─── Birth sequence (plays once per session) ──────────────────────────────────
const BIRTH_KEY = 'dt_twin_born';

function BirthSequence({ onDone }) {
  const [phase, setPhase] = useState(0);

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
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#090d16'
      }}
    >
      {[1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 4 + i * 1.5, opacity: 0 }}
          transition={{ duration: 2, delay: i * 0.18, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 128, height: 128, borderRadius: '50%',
            border: '1px solid', borderColor: `rgba(99,102,241,${0.6 - i * 0.15})`
          }}
        />
      ))}

      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.1) 70%)', marginBottom: 32
        }}
      >
        <span style={{ fontSize: 32 }}>🧬</span>
      </motion.div>

      <AnimatePresence>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#818cf8', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Initializing Digital Twin
            </p>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onDone} style={{
        position: 'absolute', bottom: 32, right: 32, fontSize: 12, color: '#475569',
        background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s'
      }}>
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div key={p.id}
          style={{
            position: 'absolute', borderRadius: '50%', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, background: stateColor, opacity: 0.3
          }}
          animate={{ y: [0, -24, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Score orbit ring ─────────────────────────────────────────────────────────
function OrbitRing({ score, label, color, iconEmoji, radius, angleOffset }) {
  const pct = score / 100;
  const size = radius * 2 + 48;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const angle = (angleOffset - 90) * (Math.PI / 180);
  const iconX = cx + radius * Math.cos(angle);
  const iconY = cy + radius * Math.sin(angle);

  return (
    <div style={{ position: 'absolute', width: size, height: size, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
        <motion.circle cx={cx} cy={cy} r={radius} fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
        />
        <foreignObject x={iconX - 14} y={iconY - 14} width={28} height={28}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: color + '15', border: `1px solid ${color}35`, fontSize: 13
          }}>
            {iconEmoji}
          </div>
        </foreignObject>
        <text x={iconX} y={iconY + 22} textAnchor="middle" fontSize="9" fill={color} fontWeight="700" fontFamily="Inter, sans-serif">
          {Math.round(score)}
        </text>
        <text x={iconX} y={iconY + 31} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif">
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── State color/label map ────────────────────────────────────────────────────
const STATE_META = {
  thriving:   { color: '#10b981', bg: 'rgba(16,185,129,0.04)',  label: 'THRIVING',   glow: '0 0 60px rgba(16,185,129,0.15)' },
  normal:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.04)',  label: 'BALANCED',   glow: '0 0 50px rgba(59,130,246,0.12)'  },
  tired:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.04)',  label: 'FATIGUED',   glow: 'none' },
  overworked: { color: '#f59e0b', bg: 'rgba(245,158,11,0.04)',  label: 'OVERLOADED', glow: 'none' },
  broke:      { color: '#f43f5e', bg: 'rgba(244,63,94,0.04)',   label: 'STRUGGLING', glow: 'none' },
  burnout:    { color: '#ef4444', bg: 'rgba(239,68,68,0.04)',   label: 'BURNED OUT', glow: '0 0 80px rgba(239,68,68,0.15)'  },
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', itemsCenter: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          style={{ position: 'absolute', insetY: 0, left: 0, height: '100%', borderRadius: 99, width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
          layout transition={{ duration: 0.15 }}
        />
        <input type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
          }} />
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
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      style={{
        borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.01)', border: `1px solid ${meta.color}25`, transition: 'all 0.2s',
        boxShadow: `0 4px 12px rgba(0,0,0,0.1)`
      }}
    >
      <div style={{ height: 130, transform: 'scale(0.72)', transformOrigin: 'top' }}>
        <LifeAvatar healthScore={entry.h} financeScore={entry.f} careerScore={entry.c} burnoutRisk={entry.burn} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, trackingWidth: '0.05em', color: meta.color }}>{meta.label}</span>
      <div style={{ display: 'flex', gap: 6, fontSize: 9, color: '#475569' }}>
        <span>H:{entry.h}</span>
        <span>F:{entry.f}</span>
        <span>C:{entry.c}</span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────── */
export default function DigitalTwin() {
  const { computed } = useData();

  const [born, setBorn] = useState(() => !!sessionStorage.getItem(BIRTH_KEY));
  const [whatIfH, setWhatIfH] = useState(65);
  const [whatIfF, setWhatIfF] = useState(60);
  const [whatIfC, setWhatIfC] = useState(68);
  const [whatIfInited, setWhatIfInited] = useState(false);

  const handleBorn = useCallback(() => {
    sessionStorage.setItem(BIRTH_KEY, '1');
    setBorn(true);
  }, []);

  const hScore    = computed?.healthScore?.score  ?? 62;
  const fScore    = computed?.financeScore?.score ?? 60;
  const cScore    = computed?.careerScore?.score  ?? 68;
  const burnout   = computed?.burnout?.risk       ?? 25;
  const balance   = computed?.balance             ?? 63;

  // Initialise What-If Lab from real scores once computed is ready
  useEffect(() => {
    if (!whatIfInited && (hScore !== 62 || fScore !== 60 || cScore !== 68)) {
      setWhatIfH(hScore);
      setWhatIfF(fScore);
      setWhatIfC(cScore);
      setWhatIfInited(true);
    }
  }, [hScore, fScore, cScore, whatIfInited]);

  const stateName = useMemo(() => computeStateName(hScore, fScore, cScore, burnout), [hScore, fScore, cScore, burnout]);
  const meta      = STATE_META[stateName];

  // What-If burnout defaults to user's real burnout as baseline
  const whatIfState = useMemo(() => computeStateName(whatIfH, whatIfF, whatIfC, Math.max(10, burnout - 10)), [whatIfH, whatIfF, whatIfC, burnout]);
  const whatIfMeta  = STATE_META[whatIfState];

  // Spring display for life score
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
          <motion.div
            key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'var(--font-primary)' }}
          >
            
            {/* ── Page Header ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <line x1="9" y1="1" x2="9" y2="4" />
                    <line x1="15" y1="1" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="23" />
                    <line x1="15" y1="20" x2="15" y2="23" />
                  </svg>
                </div>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Digital Twin</h1>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Your living life model — evolves with every data point</p>
                </div>
              </div>

              <div style={{
                fontSize: 10, padding: '4px 12px', borderRadius: 99, fontWeight: 700, letterSpacing: '0.05em',
                background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35`
              }}>
                {meta.label}
              </div>
            </div>

            {/* ── Main Twin Chamber ──────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
              style={{
                borderRadius: 24, overflow: 'hidden', padding: '24px 32px', marginBottom: 24,
                background: `radial-gradient(ellipse at 50% 30%, ${meta.color}0c 0%, rgba(15,23,42,0.95) 75%)`,
                border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                position: 'relative', minHeight: 400
              }}
            >
              <ParticleField stateColor={meta.color} />
              
              {/* Mesh scanner lines */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.02, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
              }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                
                {/* Left Side: Interactive Avatar Orbit Chamber */}
                <div style={{ position: 'relative', width: 340, height: 340, margin: '0 auto' }}>
                  <OrbitRing score={hScore} label="Health"  color="#10b981" iconEmoji="💚" radius={100} angleOffset={210} />
                  <OrbitRing score={fScore} label="Finance" color="#f59e0b" iconEmoji="🪙" radius={120} angleOffset={330} />
                  <OrbitRing score={cScore} label="Career"  color="#3b82f6" iconEmoji="💼" radius={140} angleOffset={90}  />

                  {/* Centered Avatar */}
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1.1)' }}>
                    <LifeAvatar healthScore={hScore} financeScore={fScore} careerScore={cScore} burnoutRisk={burnout} />
                  </div>
                </div>

                {/* Right Side: Core Stats Overview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Overall Balance Display */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px' }}>Life Balance Score</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 44, fontWeight: 800, color: meta.color, lineHeight: 1 }}>{Math.round(balance)}</span>
                      <span style={{ fontSize: 13, color: '#475569' }}>/ 100</span>
                    </div>
                    {/* Balanced Score Progress Bar */}
                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginTop: 8 }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                        initial={{ width: 0 }} animate={{ width: `${balance}%` }} transition={{ duration: 1 }}
                      />
                    </div>
                  </div>

                  {/* Individual Domain Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Health Domain', score: hScore, color: '#10b981' },
                      { label: 'Finance Domain', score: fScore, color: '#f59e0b' },
                      { label: 'Career Domain', score: cScore, color: '#3b82f6' }
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: item.color }}>{Math.round(item.score)}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div
                            style={{ height: '100%', borderRadius: 99, background: item.color }}
                            initial={{ width: 0 }} animate={{ width: `${item.score}%` }} transition={{ duration: 1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chamber Links / Shortcuts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {[
                      { to: '/future-you', label: '12m Projection', color: '#818cf8' },
                      { to: '/cascade-map', label: 'Cascade Map', color: '#34d399' },
                      { to: '/insights', label: 'Domain Insights', color: '#c084fc' }
                    ].map(link => (
                      <Link
                        key={link.to} to={link.to}
                        style={{
                          fontSize: 11, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', fontWeight: 600,
                          background: `${link.color}15`, border: `1px solid ${link.color}25`, color: link.color,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${link.color}25`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${link.color}15`; }}
                      >
                        {link.label} →
                      </Link>
                    ))}
                  </div>

                </div>

              </div>
            </motion.div>

            {/* ── What-If Simulator Lab ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              style={{
                borderRadius: 20, padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 24
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>What-If Simulation Lab</h2>
                  <span style={{ fontSize: 11, color: '#475569' }}>— drag sliders to preview your twin's evolution</span>
                </div>
                <button
                  onClick={() => { setWhatIfH(hScore); setWhatIfF(fScore); setWhatIfC(cScore); }}
                  style={{
                    background: 'none', border: 'none', fontSize: 11, color: '#475569', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  🔄 Reset Lab
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center' }}>
                
                {/* Interactive Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <DomainSlider label="Health Score"  color="#10b981" value={whatIfH} onChange={setWhatIfH} />
                  <DomainSlider label="Finance Score" color="#f59e0b" value={whatIfF} onChange={setWhatIfF} />
                  <DomainSlider label="Career Score"  color="#3b82f6" value={whatIfC} onChange={setWhatIfC} />

                  {/* Live Cascade Warning messages */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8, paddingTop: 12 }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '0 0 6px' }}>Projected Cascade Effect</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#94a3b8' }}>
                      {whatIfH < 45 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#f87171' }}>↓</span>
                          Poor sleep → emotional spending risk +{Math.round((50 - whatIfH) * 0.4)}%
                        </div>
                      )}
                      {whatIfF < 40 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#fbbf24' }}>↓</span>
                          Financial stress → career focus −{Math.round((45 - whatIfF) * 0.3)} pts
                        </div>
                      )}
                      {whatIfH > 70 && whatIfC > 70 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#34d399' }}>↑</span>
                          High vitality × strong career → compounding momentum
                        </div>
                      )}
                      {whatIfH >= 45 && whatIfF >= 40 && !(whatIfH > 70 && whatIfC > 70) && (
                        <div style={{ color: '#334155' }}>No critical cascades simulated at these levels</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview Avatar Chamber */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: 0 }}>Twin Preview</p>
                  <div style={{ position: 'relative', width: 220, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      position: 'absolute', width: 140, height: 140, borderRadius: '50%', filter: 'blur(20px)', opacity: 0.15,
                      background: whatIfMeta.color, transform: 'scale(1.2)'
                    }} />
                    <div style={{ transform: 'scale(0.85)' }}>
                      <LifeAvatar healthScore={whatIfH} financeScore={whatIfF} careerScore={whatIfC} burnoutRisk={20} />
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
                    background: `${whatIfMeta.color}15`, color: whatIfMeta.color, border: `1px solid ${whatIfMeta.color}35`
                  }}>{whatIfMeta.label}</div>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                    Avg: <span style={{ fontWeight: 700, color: whatIfMeta.color }}>{Math.round((whatIfH + whatIfF + whatIfC) / 3)}</span>
                  </p>
                </div>

              </div>
            </motion.div>

            {/* ── Evolution States Gallery ──────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <span style={{ fontSize: 15 }}>🎴</span>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Evolution States</h2>
                <span style={{ fontSize: 11, color: '#475569' }}>— all possible forms your twin can take</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
                {GALLERY_STATES.map((entry, i) => (
                  <GalleryCard key={entry.key} entry={entry} index={i} />
                ))}
              </div>

              {/* Current state highlight banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
                background: `${meta.color}08`, border: `1px solid ${meta.color}25`
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${meta.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <span style={{ fontSize: 14 }}>🤖</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: meta.color, margin: 0 }}>
                    Your twin is currently in the <span style={{ fontWeight: 800 }}>{meta.label}</span> state
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                    Based on baseline metrics H:{Math.round(hScore)} · F:{Math.round(fScore)} · C:{Math.round(cScore)} · Burnout:{Math.round(burnout)}%
                  </p>
                </div>
                <Link
                  to="/future-you"
                  style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, textDecoration: 'none' }}
                >
                  See trajectory →
                </Link>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
