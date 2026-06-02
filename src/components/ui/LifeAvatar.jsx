import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Palettes ──────────────────────────────────────────────────────────────────
const SKIN_TONES = [
  '#fde8c8', '#f5d5b0', '#f5cfa0', '#e8c49a',
  '#d4956a', '#c07844', '#8d5524', '#6b3e26',
  '#4a2912', '#3a1a0a',
];
const HAIR_COLORS = [
  // Natural tones
  '#0f0f0f', '#2d1b00', '#4a2c00', '#8b5e3c',
  '#c4a35a', '#e8d5b0',
  // Fun / expressive
  '#c0392b', '#e91e8c', '#7b2fbe', '#2563eb', '#059669', '#f59e0b',
];
const HAIR_STYLES = ['boycut', 'short', 'medium', 'long', 'curly', 'bun'];
const FACE_SHAPES = ['slim', 'oval', 'round', 'square'];

const LS_KEY = 'avatar_persona';
function loadPersona() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
function savePersona(p) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /**/ }
}

// ── Face geometry ─────────────────────────────────────────────────────────────
const FACE = {
  slim:   { rx: 18, ry: 30, bw: 40 },
  oval:   { rx: 23, ry: 26, bw: 50 },
  round:  { rx: 27, ry: 23, bw: 56 },
  square: { rx: 26, ry: 24, bw: 54 },
};

const CX = 80;
const CY = 78;

function getFaceGeo(shape) {
  const { rx, ry, bw } = FACE[shape] || FACE.oval;
  const eyeSpX = rx * 0.58;
  const eyeRad = rx * 0.30;
  const eyeY   = CY - ry * 0.08;
  const torsoY = CY + ry + 10;
  const shY    = torsoY + 8;
  return {
    rx, ry, bw,
    eyeLX: CX - eyeSpX, eyeRX: CX + eyeSpX,
    eyeY, eyeRad,
    browY:   eyeY - eyeRad - 3,
    noseY:   CY + ry * 0.28,
    mouthY:  CY + ry * 0.55,
    mouthL:  CX - rx * 0.48,
    mouthR:  CX + rx * 0.48,
    earLX: CX - rx, earRX: CX + rx,
    earY:  CY - ry * 0.04,
    earRy: Math.min(ry * 0.25, 7),
    blushLX: CX - rx * 0.56, blushRX: CX + rx * 0.56,
    blushY:  eyeY + eyeRad * 2.2,
    blushRx: rx * 0.30, blushRy: rx * 0.17,
    neckX: CX - 7, neckY: CY + ry - 2, neckW: 14, neckH: 12,
    torsoX: CX - bw / 2, torsoY, torsoW: bw, torsoH: 34,
    legLX: CX - bw * 0.30, legRX: CX + bw * 0.04,
    legY: torsoY + 34, legW: 12, legH: 24,
    shLX: CX - bw / 2, shRX: CX + bw / 2, shY,
    armW: 18, armH: 10,
  };
}

// ── States ────────────────────────────────────────────────────────────────────
// armAngle: positive = arms raised up, negative = arms drooping down
const STATES = {
  thriving:   { label: 'THRIVING',   badge: '#10b981', shirt: '#3b82f6', slump: 0,  eye: 'happy', mouth: 'grin',  aura: true,  armAngle: 35  },
  normal:     { label: 'BALANCED',   badge: '#6366f1', shirt: '#4f46e5', slump: 0,  eye: 'open',  mouth: 'smile', aura: false, armAngle: 0   },
  tired:      { label: 'FATIGUED',   badge: '#8b5cf6', shirt: '#374151', slump: 7,  eye: 'half',  mouth: 'flat',  aura: false, armAngle: -20 },
  overworked: { label: 'OVERLOADED', badge: '#f59e0b', shirt: '#1f2937', slump: 11, eye: 'half',  mouth: 'flat',  aura: false, armAngle: -15 },
  broke:      { label: 'STRUGGLING', badge: '#f43f5e', shirt: '#4b5563', slump: 3,  eye: 'open',  mouth: 'frown', aura: false, armAngle: -10 },
  burnout:    { label: 'BURNED OUT', badge: '#ef4444', shirt: '#111827', slump: 22, eye: 'x',     mouth: 'sad',   aura: false, armAngle: -50 },
};

function computeState(h, f, c, burn) {
  const avg = (h + f + c) / 3;
  const min = Math.min(h, f, c);
  if (burn > 60 || avg < 22)  return 'burnout';
  if (min < 30 || avg < 38)   return 'broke';      // any domain critically low → STRUGGLING
  if (c > 65 && h < 44)       return 'overworked';
  if (h < 44 || avg < 50)     return 'tired';
  if (f < 40)                  return 'broke';
  if (avg > 72)                return 'thriving';
  return 'normal';
}

// ── Camera helpers ────────────────────────────────────────────────────────────
function sampleRegion(ctx, x, y, w, h) {
  const d = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30) continue;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
  }
  if (!count) return '#c8a882';
  const hex = v => Math.round(v / count).toString(16).padStart(2, '0');
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

// Estimates face shape from camera frame pixel data
function detectFaceShape(ctx, W, H) {
  function skinWidthAt(yFrac) {
    const y = Math.floor(H * yFrac);
    const row = ctx.getImageData(0, y, W, 1).data;
    let first = -1, last = -1;
    for (let x = 0; x < W; x++) {
      const i = x * 4;
      const r = row[i], g = row[i + 1], b = row[i + 2], a = row[i + 3];
      if (a < 128) continue;
      const isSkin = r > 80 && r > g + 15 && r > b + 20 && g > 40 && b < 210;
      if (isSkin) { if (first < 0) first = x; last = x; }
    }
    return first < 0 ? 0 : last - first;
  }
  const cheekW = skinWidthAt(0.45);
  const foreW  = skinWidthAt(0.25);
  if (cheekW < 10) return 'oval';
  const ratio    = cheekW / (H * 0.6);
  const symRatio = Math.abs(cheekW - foreW) / Math.max(cheekW, 1);
  if (ratio < 0.52) return 'slim';
  if (ratio > 0.72) return 'round';
  if (symRatio < 0.12) return 'square';
  return 'oval';
}

// ── Hair ──────────────────────────────────────────────────────────────────────
function Hair({ style, color, rx, ry, isBurnout }) {
  const c = isBurnout ? '#2a1010' : color;
  const T = CY - ry;  // top of head y
  const L = CX - rx;  // left x
  const R = CX + rx;  // right x

  switch (style) {
    case 'boycut':
      return (
        <g>
          <path d={`M${L - 2} ${CY} Q${L - 2} ${T - 5} ${CX} ${T - 6} Q${R + 2} ${T - 5} ${R + 2} ${CY} Q${R} ${T + 14} ${CX} ${T + 12} Q${L} ${T + 14} ${L - 2} ${CY} Z`}
            fill={c} />
          {/* Side fade texture */}
          <line x1={L} y1={CY - 4} x2={L + 5} y2={T + 10} stroke={c} strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
          <line x1={R} y1={CY - 4} x2={R - 5} y2={T + 10} stroke={c} strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
        </g>
      );
    case 'short':
      return (
        <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R - 1} ${T + 18} ${CX} ${T + 16} Q${L + 1} ${T + 18} ${L - 2} ${CY} Z`}
          fill={c} />
      );
    case 'medium':
      return (
        <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R + 5} ${CY + 28} ${R - 2} ${CY + 46} Q${CX + 8} ${CY + 38} ${CX} ${CY + 40} Q${CX - 8} ${CY + 38} ${L + 2} ${CY + 46} Q${L - 5} ${CY + 28} ${L - 2} ${CY} Z`}
          fill={c} />
      );
    case 'long':
      return (
        <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R + 7} ${CY + 50} ${R + 2} ${CY + 76} Q${CX + 10} ${CY + 62} ${CX} ${CY + 66} Q${CX - 10} ${CY + 62} ${L - 2} ${CY + 76} Q${L - 7} ${CY + 50} ${L - 2} ${CY} Z`}
          fill={c} />
      );
    case 'curly':
      return (
        <g>
          <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R} ${T + 16} ${CX} ${T + 14} Q${L} ${T + 16} ${L - 2} ${CY} Z`}
            fill={c} />
          {[L - 2, L + 6, CX - 11, CX, CX + 11, R - 6, R + 2].map((x, i) => (
            <circle key={i} cx={x} cy={i < 2 ? CY - 2 : i < 4 ? T + 8 : i < 6 ? CY - 4 : CY - 2} r={5} fill={c} />
          ))}
          <circle cx={L - 1} cy={CY + 8} r={4.5} fill={c} />
          <circle cx={R + 1} cy={CY + 8} r={4.5} fill={c} />
        </g>
      );
    case 'bun':
      return (
        <g>
          <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R} ${T + 14} ${CX} ${T + 12} Q${L} ${T + 14} ${L - 2} ${CY} Z`}
            fill={c} />
          <circle cx={CX} cy={T - 10} r={11} fill={c} />
          <circle cx={CX} cy={T - 10} r={6} fill={c} style={{ filter: 'brightness(1.2)' }} />
        </g>
      );
    default:
      return (
        <path d={`M${L - 2} ${CY} Q${L - 5} ${T - 5} ${CX} ${T - 6} Q${R + 5} ${T - 5} ${R + 2} ${CY} Q${R - 1} ${T + 18} ${CX} ${T + 16} Q${L + 1} ${T + 18} ${L - 2} ${CY} Z`}
          fill={c} />
      );
  }
}

// ── Eyes ──────────────────────────────────────────────────────────────────────
function Eyes({ type, geo, isTired }) {
  const { eyeLX, eyeRX, eyeY, eyeRad } = geo;
  const pupilR = eyeRad * 0.52;
  const glintR = eyeRad * 0.22;

  if (type === 'happy') {
    return (
      <g>
        <path d={`M${eyeLX - eyeRad} ${eyeY} Q${eyeLX} ${eyeY - eyeRad * 1.2} ${eyeLX + eyeRad} ${eyeY}`}
          stroke="#1a1a2e" strokeWidth="2.5" fill="rgba(255,180,200,0.15)" strokeLinecap="round" />
        <path d={`M${eyeRX - eyeRad} ${eyeY} Q${eyeRX} ${eyeY - eyeRad * 1.2} ${eyeRX + eyeRad} ${eyeY}`}
          stroke="#1a1a2e" strokeWidth="2.5" fill="rgba(255,180,200,0.15)" strokeLinecap="round" />
        <circle cx={eyeLX - eyeRad * 0.1} cy={eyeY - eyeRad * 0.5} r={eyeRad * 0.22} fill="#f59e0b" opacity="0.9" />
        <circle cx={eyeRX - eyeRad * 0.1} cy={eyeY - eyeRad * 0.5} r={eyeRad * 0.22} fill="#f59e0b" opacity="0.9" />
      </g>
    );
  }

  if (type === 'x') {
    const d = eyeRad * 0.8;
    return (
      <g>
        <line x1={eyeLX - d} y1={eyeY - d} x2={eyeLX + d} y2={eyeY + d} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1={eyeLX + d} y1={eyeY - d} x2={eyeLX - d} y2={eyeY + d} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1={eyeRX - d} y1={eyeY - d} x2={eyeRX + d} y2={eyeY + d} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1={eyeRX + d} y1={eyeY - d} x2={eyeRX - d} y2={eyeY + d} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  if (type === 'half') {
    return (
      <g>
        <ellipse cx={eyeLX} cy={eyeY} rx={eyeRad} ry={eyeRad * 1.1} fill="white" />
        <ellipse cx={eyeRX} cy={eyeY} rx={eyeRad} ry={eyeRad * 1.1} fill="white" />
        <rect x={eyeLX - eyeRad - 1} y={eyeY - eyeRad * 1.2} width={eyeRad * 2 + 2} height={eyeRad * 1.2}
          fill="rgba(20,30,50,0.93)" rx={eyeRad} />
        <rect x={eyeRX - eyeRad - 1} y={eyeY - eyeRad * 1.2} width={eyeRad * 2 + 2} height={eyeRad * 1.2}
          fill="rgba(20,30,50,0.93)" rx={eyeRad} />
        <ellipse cx={eyeLX} cy={eyeY + eyeRad * 0.2} rx={pupilR} ry={pupilR * 0.7} fill="#1a1a2e" />
        <ellipse cx={eyeRX} cy={eyeY + eyeRad * 0.2} rx={pupilR} ry={pupilR * 0.7} fill="#1a1a2e" />
        {isTired && (
          <>
            <ellipse cx={eyeLX} cy={eyeY + eyeRad * 1.6} rx={eyeRad * 0.9} ry={eyeRad * 0.32} fill="#4b3a6a" opacity="0.45" />
            <ellipse cx={eyeRX} cy={eyeY + eyeRad * 1.6} rx={eyeRad * 0.9} ry={eyeRad * 0.32} fill="#4b3a6a" opacity="0.45" />
          </>
        )}
      </g>
    );
  }

  // open — iris + pupil + specular highlight
  const irisR = pupilR * 1.18;
  return (
    <g className="avatar-eye-blink">
      {/* Sclera */}
      <ellipse cx={eyeLX} cy={eyeY} rx={eyeRad} ry={eyeRad * 1.15} fill="white" />
      <ellipse cx={eyeRX} cy={eyeY} rx={eyeRad} ry={eyeRad * 1.15} fill="white" />
      {/* Iris */}
      <circle cx={eyeLX} cy={eyeY} r={irisR} fill="#6b4c2a" />
      <circle cx={eyeRX} cy={eyeY} r={irisR} fill="#6b4c2a" />
      {/* Iris ring */}
      <circle cx={eyeLX} cy={eyeY} r={irisR} fill="none" stroke="#4a3018" strokeWidth="0.8" opacity="0.7" />
      <circle cx={eyeRX} cy={eyeY} r={irisR} fill="none" stroke="#4a3018" strokeWidth="0.8" opacity="0.7" />
      {/* Pupil */}
      <circle cx={eyeLX} cy={eyeY} r={pupilR * 0.58} fill="#0f0f1a" />
      <circle cx={eyeRX} cy={eyeY} r={pupilR * 0.58} fill="#0f0f1a" />
      {/* Specular highlights */}
      <circle cx={eyeLX + glintR * 0.8} cy={eyeY - glintR * 0.9} r={glintR} fill="white" opacity="0.95" />
      <circle cx={eyeRX + glintR * 0.8} cy={eyeY - glintR * 0.9} r={glintR} fill="white" opacity="0.95" />
      <circle cx={eyeLX - glintR * 0.6} cy={eyeY + glintR * 0.5} r={glintR * 0.55} fill="white" opacity="0.45" />
      <circle cx={eyeRX - glintR * 0.6} cy={eyeY + glintR * 0.5} r={glintR * 0.55} fill="white" opacity="0.45" />
      {/* Upper eyelid shadow */}
      <path d={`M${eyeLX - eyeRad} ${eyeY - eyeRad * 0.4} Q${eyeLX} ${eyeY - eyeRad * 1.5} ${eyeLX + eyeRad} ${eyeY - eyeRad * 0.4}`}
        fill="rgba(20,15,35,0.22)" />
      <path d={`M${eyeRX - eyeRad} ${eyeY - eyeRad * 0.4} Q${eyeRX} ${eyeY - eyeRad * 1.5} ${eyeRX + eyeRad} ${eyeY - eyeRad * 0.4}`}
        fill="rgba(20,15,35,0.22)" />
    </g>
  );
}

// ── Mouth ─────────────────────────────────────────────────────────────────────
function Mouth({ type, geo }) {
  const { mouthY, mouthL, mouthR } = geo;
  switch (type) {
    case 'grin':
      return <path d={`M${mouthL} ${mouthY} Q${CX} ${mouthY + 14} ${mouthR} ${mouthY}`}
        stroke="#c2185b" strokeWidth="2.5" fill="rgba(255,100,130,0.15)" strokeLinecap="round" />;
    case 'smile':
      return <path d={`M${mouthL + 4} ${mouthY} Q${CX} ${mouthY + 9} ${mouthR - 4} ${mouthY}`}
        stroke="#1a1a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    case 'flat':
      return <line x1={mouthL + 4} y1={mouthY} x2={mouthR - 4} y2={mouthY}
        stroke="#1a1a2e" strokeWidth="2.2" strokeLinecap="round" />;
    case 'frown':
      return <path d={`M${mouthL + 4} ${mouthY + 6} Q${CX} ${mouthY - 2} ${mouthR - 4} ${mouthY + 6}`}
        stroke="#1a1a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    case 'sad':
      return <path d={`M${mouthL} ${mouthY + 8} Q${CX} ${mouthY - 2} ${mouthR} ${mouthY + 8}`}
        stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    default:
      return null;
  }
}

// ── Domain particles ──────────────────────────────────────────────────────────
function DomainParticles({ stateKey, healthScore, financeScore, careerScore }) {
  const particles = useMemo(() => {
    const list = [];
    if (healthScore > 65) list.push(
      { emoji: '❤️', x: 16, y: 60, delay: 0,   dur: 2.8 },
      { emoji: '💊', x: 26, y: 36, delay: 1.2, dur: 3.2 },
    );
    if (financeScore > 65) list.push(
      { emoji: '💰', x: 132, y: 56, delay: 0.4, dur: 3.0 },
      { emoji: '📈', x: 140, y: 34, delay: 1.6, dur: 2.6 },
    );
    if (careerScore > 65) list.push(
      { emoji: '⭐', x: 20, y: 26, delay: 0.8, dur: 2.4 },
      { emoji: '💻', x: 134, y: 26, delay: 1.0, dur: 3.4 },
    );
    if (stateKey === 'broke') list.push(
      { emoji: '😰', x: 130, y: 46, delay: 0, dur: 2.2 },
    );
    if (stateKey === 'burnout') list.push(
      { emoji: '🔥', x: 18, y: 30, delay: 0, dur: 1.6 },
      { emoji: '😵', x: 132, y: 36, delay: 0.5, dur: 1.8 },
    );
    return list;
  }, [stateKey, healthScore, financeScore, careerScore]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.text key={i} x={p.x} y={p.y} fontSize="12" textAnchor="middle"
          animate={{ y: [p.y, p.y - 16, p.y], opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: `${p.x}px ${p.y}px` }}>
          {p.emoji}
        </motion.text>
      ))}
    </>
  );
}

// ── CameraSnap ────────────────────────────────────────────────────────────────
function CameraSnap({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 360 } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError('Camera access denied. Choose options below instead.'));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  function snap() {
    const v = videoRef.current, canvas = canvasRef.current;
    if (!v || !canvas) return;
    canvas.width = v.videoWidth || 320;
    canvas.height = v.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(v, -canvas.width, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    const W = canvas.width, H = canvas.height;
    const rawSkin = sampleRegion(ctx, W * 0.3, H * 0.25, W * 0.4, H * 0.35);
    const rawHair = sampleRegion(ctx, W * 0.25, H * 0.03, W * 0.5, H * 0.18);
    const shape   = detectFaceShape(ctx, W, H);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCapture({ skin: closestPalette(rawSkin, SKIN_TONES), hair: closestPalette(rawHair, HAIR_COLORS), shape });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
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
          <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-white/20">
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 192 224">
              <ellipse cx="96" cy="100" rx="56" ry="76"
                stroke="rgba(99,102,241,0.8)" strokeWidth="2" fill="none" strokeDasharray="8 4" />
              <text x="96" y="208" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Align face in oval</text>
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

// ── luminance helper — picks dark or light checkmark based on bg color ────────
function isLight(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 > 140;
}

// ── Swatch ────────────────────────────────────────────────────────────────────
function Swatch({ color, selected, onClick, size = 32 }) {
  const tick = isLight(color) ? '#1a1a2e' : '#ffffff';
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.14 }}
      whileTap={{ scale: 0.9 }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        border: selected ? `3px solid ${tick}` : '2px solid rgba(255,255,255,0.1)',
        boxShadow: selected ? `0 0 0 3px #6366f1, 0 0 14px ${color}99` : '0 1px 4px rgba(0,0,0,0.4)',
        cursor: 'pointer', outline: 'none', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.18s, border 0.15s, transform 0.15s',
        position: 'relative',
      }}
    >
      {selected && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={tick} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </motion.button>
  );
}

// ── StyleChip ─────────────────────────────────────────────────────────────────
function StyleChip({ label, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick} whileTap={{ scale: 0.93 }}
      style={{
        padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', border: selected ? 'none' : '1px solid rgba(255,255,255,0.1)',
        outline: 'none', textTransform: 'capitalize',
        background: selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
        color: selected ? '#fff' : '#9ca3af',
        boxShadow: selected ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
        transition: 'all 0.15s',
      }}
    >{label}</motion.button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SLabel({ children, preview }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{children}</div>
      {preview && (
        <div style={{ width:20, height:20, borderRadius:'50%', background: preview, border:'2px solid rgba(255,255,255,0.15)', boxShadow:`0 0 8px ${preview}80` }}/>
      )}
    </div>
  );
}

// ── PersonaEditor — uses local state so selections don't stale-spread ─────────
function PersonaEditor({ persona, onChange, onClose }) {
  // Local draft — edits are applied immediately to the avatar via onChange,
  // but we keep a local copy so we never spread a stale prop.
  const [draft, setDraft] = useState({ ...persona });

  const set = (key, val) => {
    const next = { ...draft, [key]: val };
    setDraft(next);
    onChange(next); // live preview on avatar as user picks
  };

  const save = () => { onChange(draft); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg,#0f1220 0%,#0a0d18 100%)',
          border: '1px solid rgba(99,102,241,0.28)',
          borderRadius: 20, padding: '20px 20px 18px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column', gap: 18,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>Personalise Avatar</div>
            <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>Pick once — changes preview live ✦</div>
          </div>
          <motion.button onClick={onClose} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#9ca3af', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </motion.button>
        </div>

        {/* Face shape */}
        <div>
          <SLabel>Face Shape</SLabel>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {FACE_SHAPES.map(sh => (
              <StyleChip key={sh} label={sh} selected={draft.shape === sh} onClick={() => set('shape', sh)} />
            ))}
          </div>
        </div>

        {/* Skin tone — preview swatch shows current selection */}
        <div>
          <SLabel preview={draft.skin}>Skin Tone</SLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {SKIN_TONES.map(c => (
              <Swatch key={c} color={c} selected={draft.skin === c} onClick={() => set('skin', c)} size={38} />
            ))}
          </div>
        </div>

        {/* Hair color — ALL colors in ONE flat grid, no confusing groups */}
        <div>
          <SLabel preview={draft.hair}>Hair Color</SLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
            {HAIR_COLORS.map(c => (
              <Swatch key={c} color={c} selected={draft.hair === c} onClick={() => set('hair', c)} size={34} />
            ))}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <span style={{ fontSize:9, color:'#374151' }}>⬆ natural</span>
            <span style={{ fontSize:9, color:'#374151' }}>· expressive →</span>
          </div>
        </div>

        {/* Hair style */}
        <div>
          <SLabel>Hair Style</SLabel>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {HAIR_STYLES.map(s => (
              <StyleChip key={s} label={s} selected={draft.style === s} onClick={() => set('style', s)} />
            ))}
          </div>
        </div>

        {/* Save */}
        <motion.button
          onClick={save} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
          style={{
            width:'100%', padding:'11px 0', borderRadius:12, border:'none',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
            boxShadow:'0 4px 16px rgba(99,102,241,0.35)', marginTop:2,
          }}
        >✓ Save Avatar</motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Main LifeAvatar ───────────────────────────────────────────────────────────
export function LifeAvatar({
  healthScore = 50, financeScore = 50, careerScore = 50,
  burnoutRisk = 20, doomMode = false, hideLabel = false,
}) {
  const [persona, setPersona] = useState(() => loadPersona() || {
    skin: '#d4956a', hair: '#2d1b00', style: 'short', shape: 'oval',
  });
  const [showCamera, setShowCamera] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [snapFlash,  setSnapFlash]  = useState(false);

  const updatePersona = useCallback(p => { setPersona(p); savePersona(p); }, []);

  const handleCapture = useCallback(({ skin, hair, shape }) => {
    setShowCamera(false);
    setSnapFlash(true);
    setTimeout(() => setSnapFlash(false), 600);
    updatePersona({ ...persona, skin, hair, shape });
  }, [persona, updatePersona]);

  const stateKey   = useMemo(() => computeState(healthScore, financeScore, careerScore, burnoutRisk), [healthScore, financeScore, careerScore, burnoutRisk]);
  const s          = STATES[stateKey];
  const geo        = useMemo(() => getFaceGeo(persona.shape || 'oval'), [persona.shape]);
  const isBurnout  = stateKey === 'burnout';
  const isOver     = stateKey === 'overworked' || stateKey === 'burnout';
  const isBroke    = stateKey === 'broke';
  const isThriving = stateKey === 'thriving';
  const isTired    = ['tired', 'overworked', 'burnout'].includes(stateKey);
  const showBlush  = ['thriving', 'normal'].includes(stateKey);

  const roomBg1 = isBurnout ? '#1a0808' : isBroke ? '#11101a' : '#0d1628';
  const roomBg2 = isBurnout ? '#0d0208' : '#09090f';

  return (
    <div className="flex flex-col items-center select-none relative">
      {/* PersonaEditor modal — fixed overlay, outside avatar box */}
      <AnimatePresence>
        {showEditor && (
          <PersonaEditor
            persona={persona}
            onChange={p => { setPersona(p); savePersona(p); }}
            onClose={() => setShowEditor(false)}
          />
        )}
      </AnimatePresence>

      {/* Status badge — hidden when parent already shows balance status */}
      {!hideLabel && (
        <motion.div key={stateKey}
          initial={{ scale: 0.7, opacity: 0, y: -6 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="mb-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest"
          style={{ background: s.badge + '20', color: s.badge, border: `1px solid ${s.badge}50` }}
        >
          {s.label}
        </motion.div>
      )}

      {/* Avatar canvas */}
      <div className="w-44 h-56 relative">
        <AnimatePresence>
          {showCamera && <CameraSnap onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {snapFlash && (
            <motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="absolute inset-0 z-50 rounded-2xl bg-white pointer-events-none" />
          )}
        </AnimatePresence>

        <motion.svg viewBox="0 0 160 200" className="w-full h-full drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
          key={stateKey}
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <defs>
            <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={roomBg1} />
              <stop offset="100%" stopColor={roomBg2} />
            </linearGradient>
            <radialGradient id="auraGrad" cx="50%" cy="65%" r="50%">
              <stop offset="0%" stopColor={s.badge} stopOpacity="0.3" />
              <stop offset="100%" stopColor={s.badge} stopOpacity="0" />
            </radialGradient>
            {/* Face lighting — top-left highlight, bottom-right shadow for 3D depth */}
            <radialGradient id="faceShade" cx="34%" cy="28%" r="72%" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="white" stopOpacity="0.16" />
              <stop offset="50%"  stopColor="white" stopOpacity="0"    />
              <stop offset="100%" stopColor="black" stopOpacity="0.20" />
            </radialGradient>
            {/* Neck shadow */}
            <linearGradient id="neckShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="black" stopOpacity="0.12" />
              <stop offset="100%" stopColor="black" stopOpacity="0"    />
            </linearGradient>
          </defs>

          {/* Room */}
          <rect x="0" y="0" width="160" height="200" rx="16" fill="url(#roomGrad)" />
          <line x1="0" y1="150" x2="160" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <rect x="0" y="150" width="160" height="50" fill="rgba(255,255,255,0.012)" />

          <DomainParticles stateKey={stateKey} healthScore={healthScore} financeScore={financeScore} careerScore={careerScore} />

          {/* Aura (thriving) */}
          {s.aura && (
            <motion.ellipse cx={CX} cy={geo.torsoY + geo.torsoH + 20}
              animate={{ rx: [58, 70, 58], ry: [16, 24, 16], opacity: [0.2, 0.08, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              fill="url(#auraGrad)" />
          )}

          {/* Plant */}
          <g transform="translate(134, 138)">
            <rect x="-6" y="10" width="12" height="8" rx="3" fill={healthScore > 55 ? '#92400e' : '#5c3a1e'} />
            {healthScore > 55 ? (
              <>
                <line x1="0" y1="10" x2="0" y2="0" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="-7" cy="4" rx="6" ry="4" fill="#16a34a" transform="rotate(-25,-7,4)" />
                <ellipse cx="7" cy="6" rx="6" ry="4" fill="#15803d" transform="rotate(25,7,6)" />
                <ellipse cx="0" cy="0" rx="4" ry="3" fill="#22c55e" />
              </>
            ) : (
              <>
                <line x1="0" y1="10" x2="-3" y2="4" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="-7" cy="4" rx="3" ry="2" fill="#78350f" opacity="0.5" />
              </>
            )}
          </g>

          {/* Desk */}
          {careerScore > 25 && (
            <>
              <rect x="14" y="149" width="132" height="5" rx="2"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.3)' : 'rgba(80,80,80,0.2)'} />
              <rect x="18" y="154" width="6" height="16" rx="2"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.2)' : 'rgba(70,70,70,0.18)'} />
              <rect x="136" y="154" width="6" height="16" rx="2"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.2)' : 'rgba(70,70,70,0.18)'} />
            </>
          )}

          {/* Laptop */}
          {careerScore > 50 && isOver && (
            <g transform="translate(46, 132)">
              <rect x="0" y="0" width="34" height="18" rx="3" fill="#1e293b" />
              <rect x="1" y="1" width="32" height="16" rx="2" fill="#0d1a3a" />
              <rect x="-2" y="18" width="38" height="3" rx="1.5" fill="#374151" />
              <rect x="3" y="3" width="14" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.8" />
              <rect x="3" y="7" width="22" height="1.5" rx="0.5" fill="#8b5cf6" opacity="0.7" />
              <rect x="3" y="11" width="11" height="1.5" rx="0.5" fill="#10b981" opacity="0.8" />
              <rect x="3" y="15" width="17" height="1.5" rx="0.5" fill="#f59e0b" opacity="0.5" />
            </g>
          )}

          {/* Coin stack */}
          {financeScore > 62 && !isBroke && (
            <g transform="translate(110, 142)">
              <ellipse cx="0" cy="5" rx="9" ry="4" fill="#d97706" />
              <ellipse cx="0" cy="3" rx="9" ry="4" fill="#f59e0b" />
              <ellipse cx="0" cy="1" rx="9" ry="4" fill="#fbbf24" />
            </g>
          )}

          {/* ── BODY (slump group) ── */}
          <motion.g
            key={stateKey + '-body'}
            animate={{ rotate: s.slump > 6 ? s.slump : 0, y: s.slump > 10 ? 8 : 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ transformOrigin: `${CX}px ${geo.torsoY + geo.torsoH}px`, transformBox: 'fill-box' }}
          >
            {/* Legs */}
            <rect x={geo.legLX} y={geo.legY} width={geo.legW} height={geo.legH} rx={geo.legW / 2} fill={persona.skin} />
            <rect x={geo.legRX} y={geo.legY} width={geo.legW} height={geo.legH} rx={geo.legW / 2} fill={persona.skin} />
            {/* Shoes */}
            <ellipse cx={geo.legLX + geo.legW / 2} cy={geo.legY + geo.legH + 3}
              rx={geo.legW * 0.8} ry={4} fill={isBurnout ? '#1c1c1c' : '#1e293b'} />
            <ellipse cx={geo.legRX + geo.legW / 2} cy={geo.legY + geo.legH + 3}
              rx={geo.legW * 0.8} ry={4} fill={isBurnout ? '#1c1c1c' : '#1e293b'} />

            {/* Torso */}
            <motion.rect x={geo.torsoX} y={geo.torsoY} width={geo.torsoW} height={geo.torsoH} rx={geo.torsoW * 0.22}
              fill={s.shirt} className="avatar-breathe" />
            <path d={`M${CX - 4} ${geo.torsoY} L${CX} ${geo.torsoY + 7} L${CX + 4} ${geo.torsoY}`}
              fill="rgba(255,255,255,0.12)" />
            <rect x={CX - 3} y={geo.torsoY + 8} width={8} height={3} rx={1.5} fill="rgba(255,255,255,0.1)" />

            {/* Left arm — positive armAngle = tip goes UP */}
            <motion.g
              animate={{ rotate: s.armAngle }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ transformOrigin: `${geo.shLX}px ${geo.shY}px`, transformBox: 'fill-box' }}
            >
              <rect x={geo.shLX - geo.armW} y={geo.shY - geo.armH / 2}
                width={geo.armW} height={geo.armH} rx={geo.armH / 2} fill={persona.skin} />
              <circle cx={geo.shLX - geo.armW} cy={geo.shY} r={geo.armH * 0.5} fill={persona.skin} />
            </motion.g>

            {/* Right arm — mirror of left */}
            <motion.g
              animate={{ rotate: -s.armAngle }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ transformOrigin: `${geo.shRX}px ${geo.shY}px`, transformBox: 'fill-box' }}
            >
              <rect x={geo.shRX} y={geo.shY - geo.armH / 2}
                width={geo.armW} height={geo.armH} rx={geo.armH / 2} fill={persona.skin} />
              <circle cx={geo.shRX + geo.armW} cy={geo.shY} r={geo.armH * 0.5} fill={persona.skin} />
            </motion.g>

            {/* Neck */}
            <rect x={geo.neckX} y={geo.neckY} width={geo.neckW} height={geo.neckH} rx={geo.neckW / 2} fill={persona.skin} />

            {/* Head */}
            <motion.ellipse cx={CX} cy={CY} rx={geo.rx} ry={geo.ry} fill={persona.skin} className="avatar-breathe" />

            {/* Ears */}
            <ellipse cx={geo.earLX} cy={geo.earY} rx={4} ry={geo.earRy} fill={persona.skin} />
            <ellipse cx={geo.earRX} cy={geo.earY} rx={4} ry={geo.earRy} fill={persona.skin} />
            <ellipse cx={geo.earLX} cy={geo.earY} rx={2.5} ry={Math.max(geo.earRy - 2, 2)} fill={persona.skin}
              style={{ filter: 'brightness(0.88)' }} />
            <ellipse cx={geo.earRX} cy={geo.earY} rx={2.5} ry={Math.max(geo.earRy - 2, 2)} fill={persona.skin}
              style={{ filter: 'brightness(0.88)' }} />

            {/* Hair (on top of head) */}
            <Hair style={persona.style} color={persona.hair} rx={geo.rx} ry={geo.ry} isBurnout={isBurnout} />
            {/* Hair specular highlight */}
            <ellipse cx={CX - geo.rx * 0.12} cy={CY - geo.ry * 0.94} rx={geo.rx * 0.38} ry={geo.ry * 0.16}
              fill="white" opacity="0.09" style={{ filter: 'blur(1.5px)' }} />

            {/* Face depth shading overlay */}
            <ellipse cx={CX} cy={CY} rx={geo.rx} ry={geo.ry} fill="url(#faceShade)" />

            {/* Jawline / chin shadow */}
            <ellipse cx={CX} cy={CY + geo.ry * 0.72} rx={geo.rx * 0.62} ry={geo.ry * 0.18}
              fill="black" opacity="0.09" />

            {/* Eyebrows */}
            {s.eye !== 'x' && (
              <>
                <path d={`M${geo.eyeLX - geo.eyeRad * 0.9} ${geo.browY} Q${geo.eyeLX} ${geo.browY - 3} ${geo.eyeLX + geo.eyeRad * 0.9} ${geo.browY}`}
                  stroke={persona.hair} strokeWidth="2" fill="none" strokeLinecap="round" opacity={isTired ? 0.4 : 0.85} />
                <path d={`M${geo.eyeRX - geo.eyeRad * 0.9} ${geo.browY} Q${geo.eyeRX} ${geo.browY - 3} ${geo.eyeRX + geo.eyeRad * 0.9} ${geo.browY}`}
                  stroke={persona.hair} strokeWidth="2" fill="none" strokeLinecap="round" opacity={isTired ? 0.4 : 0.85} />
              </>
            )}

            {/* Eyes */}
            <Eyes type={s.eye} geo={geo} isTired={isTired} />

            {/* Blush */}
            {showBlush && (
              <>
                <ellipse cx={geo.blushLX} cy={geo.blushY} rx={geo.blushRx} ry={geo.blushRy} fill="#f87171" opacity="0.2" />
                <ellipse cx={geo.blushRX} cy={geo.blushY} rx={geo.blushRx} ry={geo.blushRy} fill="#f87171" opacity="0.2" />
              </>
            )}

            {/* Nose */}
            <ellipse cx={CX} cy={geo.noseY} rx={2} ry={1.5} fill={persona.skin} style={{ filter: 'brightness(0.82)' }} />

            {/* Mouth */}
            <Mouth type={s.mouth} geo={geo} />

            {/* Sweat drop (overworked) */}
            {isOver && !isBurnout && (
              <motion.g animate={{ y: [0, 16], opacity: [0.9, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.7 }}>
                <ellipse cx={CX + geo.rx + 2} cy={CY - geo.ry * 0.3} rx={2.5} ry={4} fill="#60a5fa" opacity="0.8" />
                <ellipse cx={CX + geo.rx + 2} cy={CY - geo.ry * 0.3 - 4} rx={1.5} ry={1.5} fill="#93c5fd" opacity="0.6" />
              </motion.g>
            )}
          </motion.g>

          {/* Coffee cups (overworked) */}
          {isOver && (
            <>
              <g className="coffee-float-1">
                <rect x="18" y="120" width="14" height="10" rx="3" fill="#7c3a28" />
                <rect x="20" y="118" width="10" height="3" rx="1" fill="#9a4535" />
                <path d="M32 123 Q37 123 37 128 Q37 133 32 133" stroke="#7c3a28" strokeWidth="2" fill="none" />
                <path d="M25 117 Q26 113 25 109" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
              </g>
              <g className="coffee-float-2">
                <rect x="118" y="114" width="14" height="10" rx="3" fill="#7c3a28" />
                <rect x="120" y="112" width="10" height="3" rx="1" fill="#9a4535" />
              </g>
            </>
          )}

          {/* Coins falling (broke) */}
          {isBroke && [
            { x: 64, y: 118, cls: 'coin-fall-1' },
            { x: 80, y: 112, cls: 'coin-fall-2' },
            { x: 96, y: 120, cls: 'coin-fall-3' },
          ].map((c, i) => (
            <g key={i} className={c.cls} style={{ transformBox: 'fill-box', transformOrigin: `${c.x}px ${c.y}px` }}>
              <ellipse cx={c.x} cy={c.y} rx="7" ry="7" fill="#f59e0b" />
              <ellipse cx={c.x} cy={c.y} rx="5" ry="5" fill="#fbbf24" />
              <text x={c.x} y={c.y + 2} textAnchor="middle" fontSize="5.5" fill="#92400e" fontWeight="bold">₹</text>
            </g>
          ))}

          {/* Stars (thriving) */}
          {isThriving && [
            { x: 20, y: 48, d: 0 },   { x: 142, y: 42, d: 0.5 },
            { x: 12, y: 96, d: 1.1 }, { x: 150, y: 84, d: 0.8 },
            { x: 30, y: 20, d: 0.3 }, { x: 136, y: 20, d: 1.4 },
          ].map((p, i) => (
            <motion.text key={i} x={p.x} y={p.y} fontSize="11" textAnchor="middle" fill={s.badge}
              animate={{ y: [p.y, p.y - 8, p.y], opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: p.d }}
              style={{ transformBox: 'fill-box', transformOrigin: `${p.x}px ${p.y}px` }}>
              ✦
            </motion.text>
          ))}

          {/* Burnout flames */}
          {isBurnout && (
            <motion.g animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 0.7, repeat: Infinity }}>
              <path d="M8 180 Q14 152 20 166 Q26 138 32 158 Q22 142 16 180 Z" fill="#ef4444" opacity="0.55" />
              <path d="M8 180 Q13 156 18 168 Q22 140 26 162 Z" fill="#f97316" opacity="0.35" />
              <path d="M128 180 Q134 152 140 166 Q146 138 152 158 Q142 142 136 180 Z" fill="#ef4444" opacity="0.55" />
              <path d="M128 180 Q133 156 138 168 Q142 140 146 162 Z" fill="#f97316" opacity="0.35" />
            </motion.g>
          )}

          {doomMode && (
            <rect x="0" y="0" width="160" height="200" rx="16" fill="rgba(180,0,0,0.05)" style={{ mixBlendMode: 'overlay' }} />
          )}

          </motion.svg>

        {/* Camera button — top-right */}
        <button
          onClick={e => { e.stopPropagation(); setShowEditor(false); setShowCamera(v => !v); }}
          className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 z-30"
          style={{ background: showCamera ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.25)', border: `1px solid ${showCamera ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.4)'}` }}
          title="Camera — snap to auto-set skin, hair & face"
        >
          {showCamera ? '✕' : '📷'}
        </button>

        {/* Personalize button — top-left */}
        <button
          onClick={e => { e.stopPropagation(); setShowCamera(false); setShowEditor(v => !v); }}
          className="absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 z-30"
          style={{ background: showEditor ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.25)', border: `1px solid ${showEditor ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.4)'}` }}
          title="Personalise — choose skin tone, hair colour & style"
        >
          {showEditor ? '✕' : '🎨'}
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
