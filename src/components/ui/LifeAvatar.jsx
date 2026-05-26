import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Skin & hair palette presets ───────────────────────────────────────────────
const SKIN_TONES = [
  '#fde8c8', '#f5cfa0', '#e8b887', '#d4956a',
  '#b8724e', '#8d5524', '#6b3e26', '#4a2912',
];
const HAIR_COLORS = [
  '#1a1a2e', '#2d1b00', '#4a2c00', '#8b5e3c',
  '#c4a35a', '#f0c040', '#c0392b', '#7b2fbe',
];
const HAIR_STYLES = ['short', 'medium', 'curly', 'long', 'buzz'];

const LS_KEY = 'avatar_persona';

function loadPersona() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
function savePersona(p) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /**/ }
}

// ── Color extraction from camera frame ───────────────────────────────────────
function sampleRegion(ctx, x, y, w, h) {
  const d = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < d.length; i += 4) {
    const alpha = d[i + 3];
    if (alpha < 128) continue;
    // skip near-black pixels (background / shadow)
    if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30) continue;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
  }
  if (!count) return '#c8a882';
  const hex = c => Math.round(c / count).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function closestPalette(hex, palette) {
  const r1 = parseInt(hex.slice(1, 3), 16);
  const g1 = parseInt(hex.slice(3, 5), 16);
  const b1 = parseInt(hex.slice(5, 7), 16);
  let best = palette[0], bestDist = Infinity;
  for (const c of palette) {
    const r2 = parseInt(c.slice(1, 3), 16);
    const g2 = parseInt(c.slice(3, 5), 16);
    const b2 = parseInt(c.slice(5, 7), 16);
    const dist = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

// ── Avatar state logic ────────────────────────────────────────────────────────
const STATES = {
  thriving:   { label: 'THRIVING',   badge: '#10b981', shirt: '#3b82f6',  slump: 0,  eye: 'happy', mouth: 'grin',  aura: true  },
  normal:     { label: 'BALANCED',   badge: '#6366f1', shirt: '#4f46e5',  slump: 0,  eye: 'open',  mouth: 'smile', aura: false },
  tired:      { label: 'FATIGUED',   badge: '#8b5cf6', shirt: '#374151',  slump: 7,  eye: 'half',  mouth: 'flat',  aura: false },
  overworked: { label: 'OVERLOADED', badge: '#f59e0b', shirt: '#1f2937',  slump: 11, eye: 'half',  mouth: 'flat',  aura: false },
  broke:      { label: 'STRUGGLING', badge: '#f43f5e', shirt: '#4b5563',  slump: 3,  eye: 'open',  mouth: 'frown', aura: false },
  burnout:    { label: 'BURNED OUT', badge: '#ef4444', shirt: '#111827',  slump: 22, eye: 'x',     mouth: 'sad',   aura: false },
};

function computeState(h, f, c, burn) {
  const avg = (h + f + c) / 3;
  if (burn > 60 || avg < 28) return 'burnout';
  if (c > 65 && h < 44)      return 'overworked';
  if (h < 44)                 return 'tired';
  if (f < 33)                 return 'broke';
  if (avg > 72)               return 'thriving';
  return 'normal';
}

// ── Camera snap component ─────────────────────────────────────────────────────
function CameraSnap({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 280, height: 320 } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError('Camera access denied. Choose colors below instead.'));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  function snap() {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;
    canvas.width = v.videoWidth || 280;
    canvas.height = v.videoHeight || 320;
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1); // mirror
    ctx.drawImage(v, -canvas.width, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);

    const w = canvas.width, h = canvas.height;
    // Face center = skin sample (middle strip of frame)
    const rawSkin = sampleRegion(ctx, w * 0.3, h * 0.25, w * 0.4, h * 0.35);
    // Top of head = hair
    const rawHair = sampleRegion(ctx, w * 0.25, h * 0.03, w * 0.5, h * 0.18);

    streamRef.current?.getTracks().forEach(t => t.stop());
    onCapture({
      skin: closestPalette(rawSkin, SKIN_TONES),
      hair: closestPalette(rawHair, HAIR_COLORS),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <div className="text-center px-4">
          <p className="text-xs text-rose-400 mb-3">{error}</p>
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20">
            Choose manually →
          </button>
        </div>
      ) : (
        <>
          {/* Viewfinder */}
          <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-white/20">
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} />
            {/* Face oval guide */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 192 224">
              <ellipse cx="96" cy="100" rx="56" ry="72"
                stroke="rgba(99,102,241,0.8)" strokeWidth="2" fill="none"
                strokeDasharray="8 4" />
              <text x="96" y="196" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
                Align face in oval
              </text>
            </svg>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={onClose}
              className="text-xs px-4 py-2 rounded-xl bg-white/[0.07] text-slate-400 hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button onClick={snap} disabled={!ready}
              className="text-xs px-5 py-2 rounded-xl font-semibold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
              {ready ? '📸 Snap' : 'Loading…'}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Persona customizer panel ──────────────────────────────────────────────────
function PersonaEditor({ persona, onChange, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute inset-x-0 bottom-0 z-40 rounded-b-2xl p-4 space-y-3"
      style={{ background: 'rgba(10,10,18,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-white">Personalise Avatar</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xs">✕</button>
      </div>

      {/* Skin tone */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1.5">Skin tone</p>
        <div className="flex gap-2 flex-wrap">
          {SKIN_TONES.map(c => (
            <button key={c} onClick={() => onChange({ ...persona, skin: c })}
              className="w-6 h-6 rounded-full transition-all hover:scale-110"
              style={{ background: c, outline: persona.skin === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>

      {/* Hair color */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1.5">Hair color</p>
        <div className="flex gap-2 flex-wrap">
          {HAIR_COLORS.map(c => (
            <button key={c} onClick={() => onChange({ ...persona, hair: c })}
              className="w-6 h-6 rounded-full transition-all hover:scale-110"
              style={{ background: c, outline: persona.hair === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>

      {/* Hair style */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1.5">Hair style</p>
        <div className="flex gap-2">
          {HAIR_STYLES.map(s => (
            <button key={s} onClick={() => onChange({ ...persona, style: s })}
              className="text-[10px] px-2.5 py-1 rounded-lg capitalize transition-all"
              style={{
                background: persona.style === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                color: persona.style === s ? '#a5b4fc' : '#6b7280',
                border: persona.style === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Hair path by style ────────────────────────────────────────────────────────
function HairPath({ style, skin, hair, isBurnout }) {
  const color = isBurnout ? '#2a1010' : hair;
  switch (style) {
    case 'buzz':
      return <ellipse cx="70" cy="44" rx="22" ry="8" fill={color} opacity="0.9" />;
    case 'curly':
      return (
        <g>
          <path d="M48 62 Q44 44 52 38 Q58 30 70 28 Q82 30 88 38 Q96 44 92 62" fill={color} />
          {[48,52,56,84,88,92].map((x, i) => (
            <circle key={i} cx={x} cy={i < 3 ? 62 - i * 2 : 62 - (i - 3) * 2} r="5"
              fill={color} opacity="0.9" />
          ))}
        </g>
      );
    case 'long':
      return (
        <path d="M48 62 Q44 42 52 36 Q58 28 70 26 Q82 28 88 36 Q96 42 92 62 Q90 90 88 110 Q82 98 70 100 Q58 98 52 110 Q50 90 48 62"
          fill={color} />
      );
    case 'medium':
      return (
        <path d="M48 62 Q44 42 52 36 Q58 28 70 26 Q82 28 88 36 Q96 42 92 62 Q90 75 88 85 Q80 78 70 80 Q60 78 52 85 Q50 75 48 62"
          fill={color} />
      );
    default: // short
      return (
        <path d="M48 62 Q44 42 52 36 Q58 28 70 26 Q82 28 88 36 Q96 42 92 62 Q85 46 70 44 Q55 46 48 62"
          fill={color} />
      );
  }
}

// ── Domain floating particles ─────────────────────────────────────────────────
function DomainParticles({ stateKey, healthScore, financeScore, careerScore }) {
  const isHealthy = healthScore > 65;
  const isRich    = financeScore > 65;
  const isCareer  = careerScore > 65;
  const isBroke   = stateKey === 'broke';
  const isBurnout = stateKey === 'burnout';

  const particles = useMemo(() => {
    const list = [];
    if (isHealthy) list.push(
      { emoji: '❤️', x: 14, y: 52, delay: 0,   dur: 2.8 },
      { emoji: '💊', x: 22, y: 30, delay: 1.2, dur: 3.2 },
    );
    if (isRich) list.push(
      { emoji: '💰', x: 112, y: 48, delay: 0.4, dur: 3.0 },
      { emoji: '📈', x: 118, y: 28, delay: 1.6, dur: 2.6 },
    );
    if (isCareer) list.push(
      { emoji: '⭐', x: 18, y: 22, delay: 0.8, dur: 2.4 },
      { emoji: '💻', x: 110, y: 22, delay: 1.0, dur: 3.4 },
    );
    if (isBroke) list.push(
      { emoji: '😰', x: 108, y: 38, delay: 0, dur: 2.2 },
    );
    if (isBurnout) list.push(
      { emoji: '🔥', x: 16, y: 26, delay: 0, dur: 1.6 },
      { emoji: '😵', x: 108, y: 30, delay: 0.5, dur: 1.8 },
    );
    return list;
  }, [isHealthy, isRich, isCareer, isBroke, isBurnout]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.text key={i} x={p.x} y={p.y} fontSize="11" textAnchor="middle"
          animate={{ y: [p.y, p.y - 14, p.y], opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: `${p.x}px ${p.y}px` }}
        >
          {p.emoji}
        </motion.text>
      ))}
    </>
  );
}

// ── Main LifeAvatar ───────────────────────────────────────────────────────────
export function LifeAvatar({
  healthScore = 50, financeScore = 50, careerScore = 50,
  burnoutRisk = 20, doomMode = false,
}) {
  const [persona, setPersona] = useState(() => loadPersona() || {
    skin: '#f5cfa0', hair: '#1a1a2e', style: 'short',
  });
  const [showCamera, setShowCamera]   = useState(false);
  const [showEditor, setShowEditor]   = useState(false);
  const [snapFlash, setSnapFlash]     = useState(false);

  const updatePersona = useCallback(p => {
    setPersona(p);
    savePersona(p);
  }, []);

  const handleCapture = useCallback(({ skin, hair }) => {
    setShowCamera(false);
    setSnapFlash(true);
    setTimeout(() => setSnapFlash(false), 600);
    updatePersona({ ...persona, skin, hair });
  }, [persona, updatePersona]);

  const stateKey  = useMemo(() => computeState(healthScore, financeScore, careerScore, burnoutRisk), [healthScore, financeScore, careerScore, burnoutRisk]);
  const s         = STATES[stateKey];
  const isOver    = stateKey === 'overworked' || stateKey === 'burnout';
  const isBroke   = stateKey === 'broke';
  const isThriving = stateKey === 'thriving';
  const isBurnout = stateKey === 'burnout';
  const isTired   = ['tired', 'overworked', 'burnout'].includes(stateKey);

  const roomBg1 = isBurnout ? '#1a0808' : isBroke ? '#11101a' : '#0d1628';
  const roomBg2 = isBurnout ? '#0d0208' : '#09090f';

  // Blush cheeks only when thriving or normal
  const showBlush = ['thriving', 'normal'].includes(stateKey);

  return (
    <div className="flex flex-col items-center select-none relative">
      {/* Status badge */}
      <motion.div key={stateKey}
        initial={{ scale: 0.7, opacity: 0, y: -6 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="mb-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest"
        style={{ background: s.badge + '20', color: s.badge, border: `1px solid ${s.badge}50` }}
      >
        {s.label}
      </motion.div>

      {/* Avatar canvas */}
      <div className="w-44 h-52 relative">

        {/* Camera snap overlay */}
        <AnimatePresence>
          {showCamera && (
            <CameraSnap onCapture={handleCapture} onClose={() => setShowCamera(false)} />
          )}
        </AnimatePresence>

        {/* Personalise editor */}
        <AnimatePresence>
          {showEditor && (
            <PersonaEditor
              persona={persona}
              onChange={p => { setPersona(p); savePersona(p); }}
              onClose={() => setShowEditor(false)}
            />
          )}
        </AnimatePresence>

        {/* Snap flash */}
        <AnimatePresence>
          {snapFlash && (
            <motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="absolute inset-0 z-50 rounded-2xl bg-white pointer-events-none" />
          )}
        </AnimatePresence>

        <motion.svg
          viewBox="0 0 140 160"
          className="w-full h-full drop-shadow-2xl cursor-pointer"
          xmlns="http://www.w3.org/2000/svg"
          key={stateKey}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          onClick={() => !showCamera && !showEditor && setShowEditor(v => !v)}
        >
          <defs>
            <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={roomBg1} />
              <stop offset="100%" stopColor={roomBg2} />
            </linearGradient>
            <radialGradient id="auraGrad" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor={s.badge} stopOpacity="0.3" />
              <stop offset="100%" stopColor={s.badge} stopOpacity="0" />
            </radialGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
            <clipPath id="faceClip"><ellipse cx="70" cy="56" rx="22" ry="24" /></clipPath>
          </defs>

          {/* Room */}
          <rect x="0" y="0" width="140" height="160" rx="14" fill="url(#roomGrad)" />
          <line x1="0" y1="113" x2="140" y2="113" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <rect x="0" y="113" width="140" height="47" fill="rgba(255,255,255,0.012)" />

          {/* Domain particles */}
          <DomainParticles stateKey={stateKey} healthScore={healthScore} financeScore={financeScore} careerScore={careerScore} />

          {/* Aura (thriving) */}
          {s.aura && (
            <motion.ellipse cx="70" cy="106"
              animate={{ rx: [52, 62, 52], ry: [14, 20, 14], opacity: [0.2, 0.08, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              fill="url(#auraGrad)" />
          )}

          {/* Plant (health indicator) */}
          <g transform="translate(114, 99)">
            <rect x="-6" y="13" width="12" height="8" rx="3" fill={healthScore > 55 ? '#92400e' : '#5c3a1e'} />
            {healthScore > 55 ? (
              <>
                <line x1="0" y1="13" x2="0" y2="3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="-6" cy="6" rx="6" ry="4" fill="#16a34a" transform="rotate(-25,-6,6)" />
                <ellipse cx="6" cy="8" rx="6" ry="4" fill="#15803d" transform="rotate(25,6,8)" />
                <ellipse cx="0" cy="3" rx="4" ry="3" fill="#22c55e" />
              </>
            ) : (
              <>
                <line x1="0" y1="13" x2="-3" y2="6" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="-7" cy="6" rx="3.5" ry="2" fill="#78350f" opacity="0.5" />
              </>
            )}
          </g>

          {/* Desk */}
          {careerScore > 25 && (
            <>
              <rect x="12" y="110" width="116" height="5" rx="2"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.3)' : 'rgba(80,80,80,0.2)'} />
              <rect x="16" y="115" width="5" height="14" rx="1.5"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.2)' : 'rgba(70,70,70,0.18)'} />
              <rect x="119" y="115" width="5" height="14" rx="1.5"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.2)' : 'rgba(70,70,70,0.18)'} />
            </>
          )}

          {/* Laptop */}
          {careerScore > 50 && isOver && (
            <g transform="translate(42, 96)">
              <rect x="0" y="0" width="30" height="17" rx="3" fill="#1e293b" />
              <rect x="1" y="1" width="28" height="15" rx="2" fill="#0d1a3a" />
              <rect x="-2" y="17" width="34" height="3" rx="1.5" fill="#374151" />
              <rect x="3" y="3" width="13" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.8" />
              <rect x="3" y="6.5" width="19" height="1.5" rx="0.5" fill="#8b5cf6" opacity="0.7" />
              <rect x="3" y="10" width="10" height="1.5" rx="0.5" fill="#10b981" opacity="0.8" />
              <rect x="3" y="13.5" width="15" height="1.5" rx="0.5" fill="#f59e0b" opacity="0.5" />
            </g>
          )}

          {/* Coin stack */}
          {financeScore > 62 && careerScore > 30 && !isBroke && (
            <g transform="translate(94, 104)">
              <ellipse cx="0" cy="5" rx="8" ry="3.5" fill="#d97706" />
              <ellipse cx="0" cy="3" rx="8" ry="3.5" fill="#f59e0b" />
              <ellipse cx="0" cy="1" rx="8" ry="3.5" fill="#fbbf24" />
            </g>
          )}

          {/* ── BODY GROUP ── */}
          <motion.g key={stateKey + '-b'}
            animate={{ rotate: s.slump > 6 ? s.slump : 0, y: s.slump > 10 ? 6 : 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ transformOrigin: '70px 128px', transformBox: 'fill-box' }}
          >
            {/* Legs */}
            <rect x="59" y="104" width="9" height="20" rx="4.5" fill={persona.skin} />
            <rect x="72" y="104" width="9" height="20" rx="4.5" fill={persona.skin} />
            {/* Shoes */}
            <ellipse cx="63" cy="124" rx="8" ry="4" fill={isBurnout ? '#1c1c1c' : '#1e293b'} />
            <ellipse cx="77" cy="124" rx="8" ry="4" fill={isBurnout ? '#1c1c1c' : '#1e293b'} />

            {/* Torso */}
            <motion.rect x="54" y="76" width="32" height="30" rx="11"
              fill={s.shirt} className="avatar-breathe" />
            {/* Collar */}
            <path d="M68 76 L70 82 L72 76" fill="rgba(255,255,255,0.12)" />
            {/* Shirt pocket */}
            <rect x="64" y="80" width="7" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />

            {/* Left arm */}
            <motion.rect x="40" y="80" width="15" height="8" rx="4" fill={persona.skin}
              animate={{ rotate: isOver ? [0, -6, 0] : 0 }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{ transformOrigin: '54px 84px', transformBox: 'fill-box' }} />
            {/* Right arm */}
            <motion.rect x="85" y="80" width="15" height="8" rx="4" fill={persona.skin}
              animate={{ rotate: isOver ? [0, 6, 0] : 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
              style={{ transformOrigin: '86px 84px', transformBox: 'fill-box' }} />

            {/* Neck */}
            <rect x="64" y="71" width="12" height="7" rx="3" fill={persona.skin} />

            {/* ── HEAD ── */}
            {/* Head shape */}
            <motion.ellipse cx="70" cy="55" rx="22" ry="23"
              fill={persona.skin} className="avatar-breathe" />

            {/* Hair */}
            <HairPath style={persona.style} skin={persona.skin} hair={persona.hair} isBurnout={isBurnout} />

            {/* Ears */}
            <ellipse cx="48" cy="55" rx="4" ry="5" fill={persona.skin} />
            <ellipse cx="92" cy="55" rx="4" ry="5" fill={persona.skin} />
            <ellipse cx="48" cy="55" rx="2.5" ry="3" fill={persona.skin}
              style={{ filter: 'brightness(0.88)' }} />
            <ellipse cx="92" cy="55" rx="2.5" ry="3" fill={persona.skin}
              style={{ filter: 'brightness(0.88)' }} />

            {/* Eyebrows */}
            {s.eye !== 'x' && (
              <>
                <path d={s.eye === 'half' || s.eye === 'open'
                  ? "M57 46 Q62 44 67 46"
                  : "M57 44 Q62 43 67 45"}
                  stroke={persona.hair} strokeWidth="2" fill="none" strokeLinecap="round"
                  opacity={isTired ? 0.4 : 0.85} />
                <path d={s.eye === 'half' || s.eye === 'open'
                  ? "M73 46 Q78 44 83 46"
                  : "M73 44 Q78 43 83 45"}
                  stroke={persona.hair} strokeWidth="2" fill="none" strokeLinecap="round"
                  opacity={isTired ? 0.4 : 0.85} />
              </>
            )}

            {/* ── EYES ── */}
            {s.eye === 'open' && (
              <g className="avatar-eye-blink" style={{ transformOrigin: '70px 55px', transformBox: 'fill-box' }}>
                <ellipse cx="62" cy="54" rx="5.5" ry="6" fill="white" />
                <ellipse cx="78" cy="54" rx="5.5" ry="6" fill="white" />
                <ellipse cx="63" cy="55" rx="3" ry="3.3" fill="#1a1a2e" />
                <ellipse cx="79" cy="55" rx="3" ry="3.3" fill="#1a1a2e" />
                {/* iris glint */}
                <ellipse cx="63.8" cy="53.5" rx="1.1" ry="1.1" fill="white" opacity="0.9" />
                <ellipse cx="79.8" cy="53.5" rx="1.1" ry="1.1" fill="white" opacity="0.9" />
              </g>
            )}
            {s.eye === 'happy' && (
              <g>
                <path d="M57 54 Q62 48 67 54" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M73 54 Q78 48 83 54" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                {/* happy eye sparkle */}
                <circle cx="64" cy="52" r="1.2" fill="#f59e0b" opacity="0.9" />
                <circle cx="80" cy="52" r="1.2" fill="#f59e0b" opacity="0.9" />
              </g>
            )}
            {s.eye === 'half' && (
              <>
                <ellipse cx="62" cy="54" rx="5.5" ry="6" fill="white" />
                <ellipse cx="78" cy="54" rx="5.5" ry="6" fill="white" />
                <rect x="57" y="49" width="11" height="6.5" rx="1" fill={persona.skin} opacity="0.95" />
                <rect x="73" y="49" width="11" height="6.5" rx="1" fill={persona.skin} opacity="0.95" />
                <ellipse cx="62" cy="56" rx="3" ry="2.2" fill="#1a1a2e" />
                <ellipse cx="78" cy="56" rx="3" ry="2.2" fill="#1a1a2e" />
              </>
            )}
            {s.eye === 'x' && (
              <g>
                <line x1="57" y1="50" x2="67" y2="60" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <line x1="67" y1="50" x2="57" y2="60" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <line x1="73" y1="50" x2="83" y2="60" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <line x1="83" y1="50" x2="73" y2="60" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Dark circles */}
            {isTired && (
              <>
                <ellipse cx="62" cy="62" rx="6.5" ry="2.5" fill="#4b3a6a" opacity="0.4" />
                <ellipse cx="78" cy="62" rx="6.5" ry="2.5" fill="#4b3a6a" opacity="0.4" />
              </>
            )}

            {/* Blush cheeks */}
            {showBlush && (
              <>
                <ellipse cx="54" cy="60" rx="7" ry="4" fill="#f87171" opacity="0.18" />
                <ellipse cx="86" cy="60" rx="7" ry="4" fill="#f87171" opacity="0.18" />
              </>
            )}

            {/* Nose */}
            <ellipse cx="70" cy="63" rx="2" ry="1.3" fill={persona.skin}
              style={{ filter: 'brightness(0.8)' }} />

            {/* Mouth */}
            {s.mouth === 'grin'  && <path d="M60 70 Q70 82 80 70" stroke="#c2185b" strokeWidth="2.5" fill="rgba(255,100,130,0.12)" strokeLinecap="round" />}
            {s.mouth === 'smile' && <path d="M63 69 Q70 76 77 69" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />}
            {s.mouth === 'flat'  && <line x1="64" y1="70" x2="76" y2="70" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />}
            {s.mouth === 'frown' && <path d="M63 73 Q70 67 77 73" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />}
            {s.mouth === 'sad'   && <path d="M61 75 Q70 67 79 75" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />}

            {/* Sweat drop */}
            {isOver && !isBurnout && (
              <motion.g animate={{ y: [0, 14], opacity: [0.9, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.7 }}>
                <ellipse cx="88" cy="50" rx="2.5" ry="4" fill="#60a5fa" opacity="0.8" />
                <ellipse cx="88" cy="47" rx="1.5" ry="1.5" fill="#93c5fd" opacity="0.6" />
              </motion.g>
            )}
          </motion.g>

          {/* Coffee cups (overworked) */}
          {isOver && (
            <>
              <g className="coffee-float-1">
                <rect x="16" y="88" width="12" height="9" rx="2.5" fill="#7c3a28" />
                <rect x="18" y="86" width="8" height="3" rx="1" fill="#9a4535" />
                <path d="M28 91 Q32 91 32 95 Q32 99 28 99" stroke="#7c3a28" strokeWidth="2" fill="none" />
                <path d="M20 85 Q21 81 20 77" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
              </g>
              <g className="coffee-float-2">
                <rect x="100" y="82" width="12" height="9" rx="2.5" fill="#7c3a28" />
                <rect x="102" y="80" width="8" height="3" rx="1" fill="#9a4535" />
              </g>
            </>
          )}

          {/* Coins falling (broke) */}
          {isBroke && [
            { x: 56, y: 88, cls: 'coin-fall-1' },
            { x: 70, y: 82, cls: 'coin-fall-2' },
            { x: 84, y: 90, cls: 'coin-fall-3' },
          ].map((c, i) => (
            <g key={i} className={c.cls} style={{ transformBox: 'fill-box', transformOrigin: `${c.x}px ${c.y}px` }}>
              <ellipse cx={c.x} cy={c.y} rx="6" ry="6" fill="#f59e0b" />
              <ellipse cx={c.x} cy={c.y} rx="4" ry="4" fill="#fbbf24" />
              <text x={c.x} y={c.y + 2} textAnchor="middle" fontSize="5" fill="#92400e" fontWeight="bold">₹</text>
            </g>
          ))}

          {/* Stars (thriving) */}
          {isThriving && [
            { x: 18, y: 40, d: 0 }, { x: 124, y: 34, d: 0.5 },
            { x: 10, y: 76, d: 1.1 }, { x: 132, y: 68, d: 0.8 },
            { x: 26, y: 16, d: 0.3 }, { x: 116, y: 16, d: 1.4 },
          ].map((p, i) => (
            <motion.text key={i} x={p.x} y={p.y} fontSize="10" textAnchor="middle" fill={s.badge}
              animate={{ y: [p.y, p.y - 7, p.y], opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: p.d }}
              style={{ transformBox: 'fill-box', transformOrigin: `${p.x}px ${p.y}px` }}
            >✦</motion.text>
          ))}

          {/* Burnout flames */}
          {isBurnout && (
            <motion.g animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 0.7, repeat: Infinity }}>
              <path d="M8 140 Q13 118 18 130 Q23 108 28 126 Q18 112 13 140 Z" fill="#ef4444" opacity="0.55" />
              <path d="M8 140 Q12 122 16 132 Q19 112 22 128 Z" fill="#f97316" opacity="0.35" />
              <path d="M112 140 Q117 118 122 130 Q127 108 132 126 Q122 112 117 140 Z" fill="#ef4444" opacity="0.55" />
              <path d="M112 140 Q116 122 120 132 Q123 112 126 128 Z" fill="#f97316" opacity="0.35" />
              <path d="M44 117 L55 128 L49 145" stroke="#ef4444" strokeWidth="1" opacity="0.25" fill="none" />
              <path d="M78 119 L90 130 L84 148" stroke="#ef4444" strokeWidth="1" opacity="0.25" fill="none" />
            </motion.g>
          )}

          {/* Doom overlay */}
          {doomMode && (
            <rect x="0" y="0" width="140" height="160" rx="14"
              fill="rgba(180,0,0,0.05)" style={{ mixBlendMode: 'overlay' }} />
          )}

          {/* Tap hint */}
          <motion.text x="70" y="153" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.2)"
            animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 3, repeat: Infinity }}>
            tap to personalise
          </motion.text>
        </motion.svg>

        {/* Camera button */}
        <button
          onClick={e => { e.stopPropagation(); setShowEditor(false); setShowCamera(true); }}
          className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 z-30"
          style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}
          title="Snap your face to personalise"
        >
          📷
        </button>
      </div>

      {/* Domain dots */}
      <div className="flex gap-3 mt-2">
        {[
          { label: 'Health',  score: healthScore  },
          { label: 'Finance', score: financeScore },
          { label: 'Career',  score: careerScore  },
        ].map(({ label, score }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-colors duration-500"
              style={{ background: score > 65 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444' }} />
            <span className="text-[10px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
