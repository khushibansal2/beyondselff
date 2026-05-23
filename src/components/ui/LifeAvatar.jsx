import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AVATAR_STATES = {
  thriving:   { label: 'THRIVING',   badge: '#10b981', skin: '#fcd9a0', shirt: '#3b82f6',  slump: 0,  eyeType: 'happy', mouth: 'grin',  aura: true },
  normal:     { label: 'BALANCED',   badge: '#6366f1', skin: '#fcd9a0', shirt: '#4f46e5',  slump: 0,  eyeType: 'open',  mouth: 'smile', aura: false },
  tired:      { label: 'FATIGUED',   badge: '#8b5cf6', skin: '#e8c99e', shirt: '#374151',  slump: 7,  eyeType: 'half',  mouth: 'flat',  aura: false },
  overworked: { label: 'OVERLOADED', badge: '#f59e0b', skin: '#d4b896', shirt: '#1f2937',  slump: 11, eyeType: 'half',  mouth: 'flat',  aura: false },
  broke:      { label: 'STRUGGLING', badge: '#f43f5e', skin: '#f0d9bd', shirt: '#4b5563',  slump: 3,  eyeType: 'open',  mouth: 'frown', aura: false },
  burnout:    { label: 'BURNED OUT', badge: '#ef4444', skin: '#b8a58c', shirt: '#111827',  slump: 22, eyeType: 'x',     mouth: 'sad',   aura: false },
};

function computeState(healthScore, financeScore, careerScore, burnoutRisk) {
  const avg = (healthScore + financeScore + careerScore) / 3;
  if (burnoutRisk > 60 || avg < 28) return 'burnout';
  if (careerScore > 65 && healthScore < 44) return 'overworked';
  if (healthScore < 44) return 'tired';
  if (financeScore < 33) return 'broke';
  if (avg > 72) return 'thriving';
  return 'normal';
}

export function LifeAvatar({ healthScore = 50, financeScore = 50, careerScore = 50, burnoutRisk = 20, doomMode = false }) {
  const stateKey = useMemo(
    () => computeState(healthScore, financeScore, careerScore, burnoutRisk),
    [healthScore, financeScore, careerScore, burnoutRisk]
  );
  const s = AVATAR_STATES[stateKey];
  const isOverworked = stateKey === 'overworked' || stateKey === 'burnout';
  const isBroke      = stateKey === 'broke';
  const isThriving   = stateKey === 'thriving';
  const isBurnout    = stateKey === 'burnout';
  const isTired      = stateKey === 'tired' || stateKey === 'overworked' || stateKey === 'burnout';
  const hasLaptop    = (careerScore > 50 && isOverworked);
  const hasPlant     = healthScore > 55;

  const roomBg1 = isBurnout ? '#1a0808' : stateKey === 'broke' ? '#11101a' : '#0d1628';
  const roomBg2 = isBurnout ? '#0d0208' : '#09090f';

  return (
    <div className="flex flex-col items-center select-none">
      {/* Status badge */}
      <motion.div
        key={stateKey}
        initial={{ scale: 0.7, opacity: 0, y: -6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="mb-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest"
        style={{ background: s.badge + '20', color: s.badge, border: `1px solid ${s.badge}50` }}
      >
        {s.label}
      </motion.div>

      {/* SVG Avatar */}
      <div className="w-36 h-44 relative">
        <motion.svg
          viewBox="0 0 140 160"
          className="w-full h-full drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
          key={stateKey}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <defs>
            <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={roomBg1} />
              <stop offset="100%" stopColor={roomBg2} />
            </linearGradient>
            <radialGradient id="auraGrad" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor={s.badge} stopOpacity="0.25" />
              <stop offset="100%" stopColor={s.badge} stopOpacity="0" />
            </radialGradient>
            <filter id="avatarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Room background */}
          <rect x="0" y="0" width="140" height="160" rx="14" fill="url(#roomGrad)" />

          {/* Wall texture line */}
          <line x1="0" y1="115" x2="140" y2="115" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* Floor */}
          <rect x="0" y="115" width="140" height="45" rx="0" fill="rgba(255,255,255,0.015)" />

          {/* Aura (thriving) */}
          {s.aura && (
            <motion.ellipse
              cx="70" cy="108"
              animate={{ rx: [52, 60, 52], ry: [14, 18, 14], opacity: [0.18, 0.08, 0.18] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              fill="url(#auraGrad)"
            />
          )}

          {/* ── PLANT (health) ── */}
          <g transform="translate(116, 100)">
            <rect x="-6" y="13" width="12" height="8" rx="3" fill={hasPlant ? '#92400e' : '#5c3a1e'} />
            {hasPlant ? (
              <>
                <line x1="0" y1="13" x2="0" y2="4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="-6" cy="7" rx="6" ry="4" fill="#16a34a" transform="rotate(-25,-6,7)" />
                <ellipse cx="6" cy="9" rx="6" ry="4" fill="#15803d" transform="rotate(25,6,9)" />
                <ellipse cx="0" cy="4" rx="4" ry="3" fill="#22c55e" transform="rotate(-5,0,4)" />
              </>
            ) : (
              <>
                <line x1="0" y1="13" x2="-4" y2="6" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="-8" cy="6" rx="4" ry="2.5" fill="#78350f" transform="rotate(35,-8,6)" opacity="0.6" />
              </>
            )}
          </g>

          {/* ── DESK ── */}
          {careerScore > 25 && (
            <>
              <rect x="12" y="112" width="116" height="5" rx="2"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.25)' : 'rgba(80,80,80,0.2)'} />
              <rect x="16" y="117" width="5" height="14" rx="1.5"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.18)' : 'rgba(70,70,70,0.18)'} />
              <rect x="119" y="117" width="5" height="14" rx="1.5"
                fill={careerScore > 60 ? 'rgba(99,102,241,0.18)' : 'rgba(70,70,70,0.18)'} />
            </>
          )}

          {/* ── LAPTOP (overworked/career) ── */}
          {hasLaptop && (
            <g transform="translate(44, 98)">
              <rect x="0" y="0" width="28" height="16" rx="3" fill="#1e293b" />
              <rect x="1" y="1" width="26" height="14" rx="2" fill="#0d1a3a" />
              <rect x="1" y="1" width="26" height="14" rx="2" fill="#3b82f6" opacity="0.12" />
              <rect x="-2" y="16" width="32" height="3" rx="1.5" fill="#374151" />
              {/* screen code lines */}
              <rect x="3" y="3" width="12" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.7" />
              <rect x="3" y="6" width="18" height="1.5" rx="0.5" fill="#8b5cf6" opacity="0.6" />
              <rect x="3" y="9" width="9" height="1.5" rx="0.5" fill="#10b981" opacity="0.7" />
              <rect x="3" y="12" width="14" height="1.5" rx="0.5" fill="#f59e0b" opacity="0.4" />
            </g>
          )}

          {/* Coin stack (good finance) */}
          {financeScore > 62 && careerScore > 30 && !isBroke && (
            <g transform="translate(96, 106)">
              <ellipse cx="0" cy="5" rx="8" ry="3.5" fill="#d97706" />
              <ellipse cx="0" cy="3" rx="8" ry="3.5" fill="#f59e0b" />
              <ellipse cx="0" cy="1" rx="8" ry="3.5" fill="#fbbf24" />
            </g>
          )}

          {/* ── AVATAR BODY (slumped group) ── */}
          <motion.g
            key={stateKey + '-body'}
            animate={{
              rotate: s.slump > 6 ? s.slump : 0,
              y: s.slump > 10 ? 6 : 0,
            }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ transformOrigin: '70px 130px', transformBox: 'fill-box' }}
          >
            {/* Legs */}
            <rect x="58" y="105" width="9" height="20" rx="4" fill={s.skin} />
            <rect x="73" y="105" width="9" height="20" rx="4" fill={s.skin} />
            {/* Shoes */}
            <ellipse cx="63" cy="125" rx="8" ry="4" fill={isBurnout ? '#1c1c1c' : '#1e293b'} />
            <ellipse cx="77" cy="125" rx="8" ry="4" fill={isBurnout ? '#1c1c1c' : '#1e293b'} />

            {/* Body */}
            <motion.rect
              x="54" y="78" width="32" height="28" rx="10"
              fill={s.shirt}
              className="avatar-breathe"
            />
            {/* Shirt pocket detail */}
            <rect x="65" y="82" width="7" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />

            {/* Left arm */}
            <motion.rect
              x="40" y="82" width="15" height="8" rx="4" fill={s.skin}
              animate={{ rotate: isOverworked ? [0, -6, 0] : 0 }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{ transformOrigin: '54px 86px', transformBox: 'fill-box' }}
            />
            {/* Right arm */}
            <motion.rect
              x="85" y="82" width="15" height="8" rx="4" fill={s.skin}
              animate={{ rotate: isOverworked ? [0, 6, 0] : 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
              style={{ transformOrigin: '86px 86px', transformBox: 'fill-box' }}
            />

            {/* Neck */}
            <rect x="64" y="73" width="12" height="7" rx="3" fill={s.skin} />

            {/* ── HEAD ── */}
            <motion.ellipse
              cx="70" cy="58" rx="20" ry="21"
              fill={s.skin}
              className="avatar-breathe"
            />

            {/* Hair */}
            <motion.path
              d={isBurnout
                ? "M50 58 Q51 38 70 36 Q89 38 90 58 Q84 42 70 40 Q56 42 50 58"
                : "M50 60 Q51 38 70 36 Q89 38 90 60 Q85 45 70 43 Q55 45 50 60"}
              fill={isBurnout ? '#2a1818' : isTired ? '#1a1a2e' : '#1a1a3e'}
              className="avatar-breathe"
            />

            {/* ── EYES ── */}
            {s.eyeType === 'open' && (
              <g className="avatar-eye-blink" style={{ transformOrigin: '70px 58px', transformBox: 'fill-box' }}>
                <ellipse cx="61" cy="56" rx="5" ry="5.5" fill="white" />
                <ellipse cx="79" cy="56" rx="5" ry="5.5" fill="white" />
                <ellipse cx="62" cy="57" rx="3" ry="3.3" fill="#1a1a2e" />
                <ellipse cx="80" cy="57" rx="3" ry="3.3" fill="#1a1a2e" />
                <ellipse cx="63" cy="55.5" rx="1" ry="1" fill="white" opacity="0.8" />
                <ellipse cx="81" cy="55.5" rx="1" ry="1" fill="white" opacity="0.8" />
              </g>
            )}

            {s.eyeType === 'happy' && (
              <g>
                <path d="M56 57 Q61 51 66 57" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M74 57 Q79 51 84 57" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </g>
            )}

            {s.eyeType === 'half' && (
              <>
                <ellipse cx="61" cy="56" rx="5" ry="5.5" fill="white" />
                <ellipse cx="79" cy="56" rx="5" ry="5.5" fill="white" />
                {/* heavy eyelid */}
                <rect x="56" y="51" width="10" height="6" rx="1" fill={s.skin} opacity="0.95" />
                <rect x="74" y="51" width="10" height="6" rx="1" fill={s.skin} opacity="0.95" />
                <ellipse cx="61" cy="58" rx="3" ry="2.2" fill="#1a1a2e" />
                <ellipse cx="79" cy="58" rx="3" ry="2.2" fill="#1a1a2e" />
              </>
            )}

            {s.eyeType === 'x' && (
              <g>
                <line x1="57" y1="52" x2="65" y2="60" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="65" y1="52" x2="57" y2="60" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="75" y1="52" x2="83" y2="60" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="83" y1="52" x2="75" y2="60" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* Dark circles */}
            {isTired && (
              <>
                <ellipse cx="61" cy="63" rx="6" ry="2.5" fill="#4b3a6a" opacity="0.45" />
                <ellipse cx="79" cy="63" rx="6" ry="2.5" fill="#4b3a6a" opacity="0.45" />
              </>
            )}

            {/* ── MOUTH ── */}
            {s.mouth === 'grin'  && <path d="M61 70 Q70 80 79 70" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
            {s.mouth === 'smile' && <path d="M63 70 Q70 76 77 70" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />}
            {s.mouth === 'flat'  && <line x1="64" y1="71" x2="76" y2="71" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />}
            {s.mouth === 'frown' && <path d="M63 73 Q70 67 77 73" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />}
            {s.mouth === 'sad'   && <path d="M61 75 Q70 67 79 75" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />}

            {/* Sweat drop (overworked) */}
            {isOverworked && !isBurnout && (
              <motion.g
                animate={{ y: [0, 12], opacity: [0.9, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.7 }}
              >
                <ellipse cx="87" cy="52" rx="2.5" ry="4" fill="#60a5fa" opacity="0.8" />
                <ellipse cx="87" cy="49" rx="1.5" ry="1.5" fill="#93c5fd" opacity="0.6" />
              </motion.g>
            )}
          </motion.g>

          {/* ── FLOATING COFFEE CUPS (overworked) ── */}
          {isOverworked && (
            <>
              <g className="coffee-float-1">
                <rect x="18" y="88" width="12" height="9" rx="2.5" fill="#7c3a28" />
                <rect x="20" y="86" width="8" height="3" rx="1" fill="#9a4535" />
                <path d="M30 91 Q34 91 34 95 Q34 99 30 99" stroke="#7c3a28" strokeWidth="2" fill="none" />
                <path d="M22 85 Q23 81 22 77" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
                <path d="M25 85 Q26 80 25 76" stroke="#94a3b8" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round" />
              </g>
              <g className="coffee-float-2" style={{ transform: 'translate(18px, 0)' }}>
                <rect x="96" y="82" width="12" height="9" rx="2.5" fill="#7c3a28" />
                <rect x="98" y="80" width="8" height="3" rx="1" fill="#9a4535" />
              </g>
            </>
          )}

          {/* ── COINS FALLING (broke) ── */}
          {isBroke && (
            <>
              {[
                { x: 55, y: 90, cls: 'coin-fall-1' },
                { x: 70, y: 85, cls: 'coin-fall-2' },
                { x: 85, y: 92, cls: 'coin-fall-3' },
              ].map((c, i) => (
                <g key={i} className={c.cls} style={{ transformBox: 'fill-box', transformOrigin: `${c.x}px ${c.y}px` }}>
                  <ellipse cx={c.x} cy={c.y} rx="6" ry="6" fill="#f59e0b" />
                  <ellipse cx={c.x} cy={c.y} rx="4" ry="4" fill="#fbbf24" />
                  <text x={c.x} y={c.y + 1.5} textAnchor="middle" fontSize="5" fill="#92400e" fontWeight="bold">₹</text>
                </g>
              ))}
            </>
          )}

          {/* ── STARS (thriving) ── */}
          {isThriving && (
            <>
              {[
                { x: 20, y: 44, delay: 0 },
                { x: 122, y: 38, delay: 0.5 },
                { x: 12, y: 80, delay: 1.1 },
                { x: 130, y: 70, delay: 0.8 },
                { x: 28, y: 20, delay: 0.3 },
                { x: 118, y: 20, delay: 1.4 },
              ].map((p, i) => (
                <motion.text
                  key={i}
                  x={p.x} y={p.y}
                  fontSize="10" textAnchor="middle"
                  fill={s.badge}
                  animate={{ y: [p.y, p.y - 7, p.y], opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: p.delay }}
                  style={{ transformBox: 'fill-box', transformOrigin: `${p.x}px ${p.y}px` }}
                >✦</motion.text>
              ))}
            </>
          )}

          {/* ── BURNOUT FLAMES ── */}
          {isBurnout && (
            <motion.g animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 0.7, repeat: Infinity }}>
              <path d="M8 140 Q13 118 18 130 Q23 108 28 126 Q18 112 13 140 Z" fill="#ef4444" opacity="0.55" />
              <path d="M8 140 Q12 122 16 132 Q19 112 22 128 Z" fill="#f97316" opacity="0.35" />
              <path d="M114 140 Q119 118 124 130 Q129 108 134 126 Q124 112 119 140 Z" fill="#ef4444" opacity="0.55" />
              <path d="M114 140 Q118 122 122 132 Q125 112 128 128 Z" fill="#f97316" opacity="0.35" />
              {/* floor cracks */}
              <path d="M45 118 L56 128 L50 145" stroke="#ef4444" strokeWidth="1" opacity="0.25" fill="none" />
              <path d="M78 120 L90 130 L84 148" stroke="#ef4444" strokeWidth="1" opacity="0.25" fill="none" />
            </motion.g>
          )}

          {/* Doom mode overlay - static noise */}
          {doomMode && (
            <rect x="0" y="0" width="140" height="160" rx="14"
              fill="rgba(180,0,0,0.04)"
              style={{ mixBlendMode: 'overlay' }}
            />
          )}
        </motion.svg>
      </div>

      {/* Domain health dots */}
      <div className="flex gap-3 mt-2">
        {[
          { label: 'Health', score: healthScore },
          { label: 'Finance', score: financeScore },
          { label: 'Career', score: careerScore },
        ].map(({ label, score }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-colors duration-500"
              style={{ background: score > 65 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444' }}
            />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
