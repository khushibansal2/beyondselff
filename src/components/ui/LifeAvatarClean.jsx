import { motion } from 'framer-motion';

export function LifeAvatarClean({
  healthScore = 50,
  financeScore = 50,
  careerScore = 50,
  burnoutRisk = 20,
  doomMode = false,
}) {
  const avg = (healthScore + financeScore + careerScore) / 3;
  const mood =
    burnoutRisk > 60 || avg < 28 ? 'struggling' : avg > 72 ? 'thriving' : 'ok';

  const skin = 'oklch(0.85 0.06 60)';
  const hair = doomMode ? 'oklch(0.12 0.08 260)' : 'oklch(0.25 0.02 270)';
  const shirt =
    mood === 'thriving'
      ? 'oklch(0.7 0.16 165)'
      : mood === 'ok'
      ? 'oklch(0.7 0.16 70)'
      : 'oklch(0.55 0.05 270)';
  const mouthD =
    mood === 'thriving'
      ? 'M70 110 Q90 125 110 110'
      : mood === 'ok'
      ? 'M72 115 L108 115'
      : 'M72 118 Q90 108 108 118';
  const mouthStroke = mood === 'struggling' ? '#dc2626' : '#1f2937';

  return (
    <div style={{ position: 'relative', width: 110, height: 130, flexShrink: 0 }}>
      <motion.svg
        viewBox="0 0 180 200"
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))' }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* shadow */}
        <ellipse cx="90" cy="190" rx="48" ry="5" fill="rgba(0,0,0,0.35)" />
        {/* bench */}
        <rect x="30" y="175" width="120" height="6" rx="2" fill="oklch(0.35 0.04 270)" />
        {/* body */}
        <rect x="55" y="115" width="70" height="55" rx="14" fill={shirt} />
        {/* arms */}
        <rect x="38" y="118" width="18" height="42" rx="9" fill={shirt} />
        <rect x="124" y="118" width="18" height="42" rx="9" fill={shirt} />
        {/* hands */}
        <circle cx="47" cy="162" r="9" fill={skin} />
        <circle cx="133" cy="162" r="9" fill={skin} />
        {/* legs */}
        <rect x="65" y="168" width="18" height="14" rx="4" fill={skin} />
        <rect x="97" y="168" width="18" height="14" rx="4" fill={skin} />
        {/* head */}
        <circle cx="90" cy="80" r="38" fill={skin} />
        {/* hair */}
        <path
          d="M55 65 Q60 38 90 36 Q120 38 125 65 Q120 56 90 56 Q60 56 55 65 Z"
          fill={hair}
        />
        {/* eyes */}
        <circle cx="76" cy="82" r="4" fill="oklch(0.15 0.02 270)" />
        <circle cx="104" cy="82" r="4" fill="oklch(0.15 0.02 270)" />
        <circle cx="77.5" cy="80.5" r="1.2" fill="white" />
        <circle cx="105.5" cy="80.5" r="1.2" fill="white" />
        {/* mouth */}
        <path d={mouthD} stroke={mouthStroke} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* coin */}
        <circle cx="90" cy="138" r="9" fill="oklch(0.78 0.16 70)" stroke="oklch(0.5 0.12 60)" strokeWidth="1.5" />
        <text x="90" y="142" textAnchor="middle" fontSize="10" fontWeight="700" fill="oklch(0.3 0.05 60)">₹</text>

        {/* doom overlay */}
        {doomMode && (
          <rect x="0" y="0" width="180" height="200" rx="0" fill="rgba(180,0,0,0.08)" style={{ mixBlendMode: 'overlay' }} />
        )}
      </motion.svg>
    </div>
  );
}
