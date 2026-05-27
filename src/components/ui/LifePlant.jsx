import { motion, AnimatePresence } from 'framer-motion';

// ─── Stage definitions ────────────────────────────────────────────────────────
export const PLANT_STAGES = [
  { stage: 0, name: 'Seed',    minPct: 0,  emoji: '🌰', desc: 'Set a goal to start growing',   tip: 'Add your first goal' },
  { stage: 1, name: 'Sprout',  minPct: 20, emoji: '🌱', desc: 'Early progress — keep going',    tip: 'Reach 40% to grow a Plant' },
  { stage: 2, name: 'Plant',   minPct: 40, emoji: '🌿', desc: 'Real momentum building',         tip: 'Reach 60% to Bloom' },
  { stage: 3, name: 'Bloom',   minPct: 60, emoji: '🌸', desc: 'Flourishing — goals in sight',   tip: 'Reach 80% to become a Tree' },
  { stage: 4, name: 'Tree',    minPct: 80, emoji: '🌳', desc: 'Mastery achieved — goals met!',  tip: 'All goals complete' },
];

export function getStage(progress) {
  if (progress >= 80) return PLANT_STAGES[4];
  if (progress >= 60) return PLANT_STAGES[3];
  if (progress >= 40) return PLANT_STAGES[2];
  if (progress >= 20) return PLANT_STAGES[1];
  return PLANT_STAGES[0];
}

// ─── Color helper ─────────────────────────────────────────────────────────────
function getPlantColor(healthScore, burnout) {
  if (burnout > 70) return { leaf: '#f97316', leafDark: '#c2410c', stem: '#92400e' };
  if (healthScore > 70) return { leaf: '#22c55e', leafDark: '#16a34a', stem: '#166534' };
  if (healthScore > 45) return { leaf: '#84cc16', leafDark: '#65a30d', stem: '#3f6212' };
  return { leaf: '#eab308', leafDark: '#ca8a04', stem: '#92400e' };
}

// ─── SVG Stage Components ─────────────────────────────────────────────────────
function Soil({ y = 148, wide = false }) {
  return (
    <>
      <ellipse cx="60" cy={y} rx={wide ? 52 : 44} ry="11" fill="#6b3f1e" opacity="0.85" />
      <ellipse cx="60" cy={y - 3} rx={wide ? 48 : 40} ry="8" fill="#8B5e3c" opacity="0.6" />
    </>
  );
}

function SeedStage() {
  return (
    <>
      <Soil />
      <ellipse cx="60" cy="132" rx="11" ry="15" fill="#a0855b" />
      <ellipse cx="60" cy="132" rx="7" ry="10" fill="#c4a26a" opacity="0.5" />
      <line x1="60" y1="117" x2="60" y2="112" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function SproutStage({ c }) {
  return (
    <>
      <Soil />
      {/* Stem */}
      <path d="M60 148 Q58 130 60 108" stroke={c.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Left leaf */}
      <motion.path
        initial={{ scale: 0, originX: '60px', originY: '120px' }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        d="M60 122 Q44 112 38 120 Q44 128 60 122Z"
        fill={c.leaf}
      />
      {/* Right leaf */}
      <motion.path
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        d="M60 118 Q76 108 82 116 Q76 124 60 118Z"
        fill={c.leafDark}
      />
      {/* Tiny bud */}
      <circle cx="60" cy="108" r="4" fill={c.leaf} />
    </>
  );
}

function PlantStage({ c }) {
  return (
    <>
      <Soil wide />
      {/* Main stem */}
      <path d="M60 148 Q54 120 60 82" stroke={c.stem} strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Branch left */}
      <path d="M58 118 Q42 108 30 102" stroke={c.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Branch right */}
      <path d="M60 110 Q76 100 90 96" stroke={c.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Left branch leaves */}
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}
        d="M30 102 Q22 88 28 80 Q38 90 30 102Z" fill={c.leaf} />
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.08 }}
        d="M36 105 Q28 92 34 84 Q44 93 36 105Z" fill={c.leafDark} opacity="0.85" />

      {/* Right branch leaves */}
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.12 }}
        d="M90 96 Q100 82 94 74 Q84 83 90 96Z" fill={c.leaf} />
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.18 }}
        d="M84 100 Q94 86 88 78 Q78 87 84 100Z" fill={c.leafDark} opacity="0.85" />

      {/* Mid leaves */}
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.22 }}
        d="M60 100 Q44 88 40 78 Q52 80 60 100Z" fill={c.leaf} opacity="0.9" />
      <motion.path initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.28 }}
        d="M60 96 Q76 84 80 74 Q68 76 60 96Z" fill={c.leafDark} opacity="0.85" />

      {/* Top bud */}
      <circle cx="60" cy="82" r="5" fill={c.leaf} />
    </>
  );
}

function BloomStage({ c }) {
  const petalColor = '#f472b6';
  const petalDark  = '#ec4899';
  return (
    <>
      <Soil wide />
      {/* Trunk */}
      <path d="M60 148 Q52 115 58 72" stroke={c.stem} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Lower branches */}
      <path d="M57 130 Q38 118 24 114" stroke={c.stem} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M59 124 Q80 112 96 110" stroke={c.stem} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Mid branches */}
      <path d="M58 108 Q40 96 28 88" stroke={c.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M59 104 Q78 92 92 86" stroke={c.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Lower leaves */}
      {[
        { d: "M24 114 Q12 100 18 90 Q30 100 24 114Z", delay: 0 },
        { d: "M96 110 Q108 96 102 86 Q90 96 96 110Z", delay: 0.06 },
        { d: "M28 88 Q16 74 22 64 Q34 74 28 88Z", delay: 0.1 },
        { d: "M92 86 Q104 72 98 62 Q86 72 92 86Z", delay: 0.14 },
        { d: "M58 116 Q40 104 36 92 Q50 94 58 116Z", delay: 0.18 },
        { d: "M60 112 Q78 100 82 88 Q68 90 60 112Z", delay: 0.22 },
        { d: "M58 96 Q40 84 36 72 Q50 76 58 96Z", delay: 0.26 },
        { d: "M60 92 Q78 80 80 68 Q66 72 60 92Z", delay: 0.3 },
      ].map((lf, i) => (
        <motion.path key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: lf.delay }}
          d={lf.d} fill={i % 2 === 0 ? c.leaf : c.leafDark} opacity="0.92" />
      ))}

      {/* Flower petals */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const px = 58 + Math.cos(rad) * 11;
        const py = 66 + Math.sin(rad) * 11;
        return (
          <motion.ellipse key={i} cx={px} cy={py} rx="7" ry="5"
            transform={`rotate(${angle} ${px} ${py})`}
            fill={i % 2 === 0 ? petalColor : petalDark} opacity="0.95"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ duration: 0.35, delay: 0.35 + i * 0.05 }} />
        );
      })}
      {/* Flower center */}
      <motion.circle cx="58" cy="66" r="6" fill="#fbbf24"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 0.65 }} />
    </>
  );
}

function TreeStage({ c }) {
  return (
    <>
      <Soil wide />
      {/* Thick trunk */}
      <path d="M50 150 Q48 118 52 88" stroke={c.stem} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M70 150 Q72 118 68 88" stroke={c.stem} strokeWidth="10" fill="none" strokeLinecap="round" />

      {/* Branches */}
      <path d="M52 110 Q32 94 20 84" stroke={c.stem} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M68 108 Q88 92 100 82" stroke={c.stem} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M54 90 Q42 76 36 64" stroke={c.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M66 88 Q78 74 84 62" stroke={c.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M60 88 Q60 70 60 58" stroke={c.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Canopy — overlapping circles for lush look */}
      {[
        { cx: 60, cy: 52, r: 32 },
        { cx: 36, cy: 68, r: 24 },
        { cx: 84, cy: 68, r: 24 },
        { cx: 22, cy: 84, r: 18 },
        { cx: 98, cy: 82, r: 18 },
        { cx: 50, cy: 38, r: 20 },
        { cx: 72, cy: 38, r: 20 },
      ].map((circ, i) => (
        <motion.circle key={i} cx={circ.cx} cy={circ.cy} r={circ.r}
          fill={i % 2 === 0 ? c.leaf : c.leafDark} opacity="0.92"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }} />
      ))}

      {/* Fruit dots */}
      {[{x:44,y:55},{x:68,y:48},{x:36,y:72},{x:82,y:65},{x:56,y:38}].map((d, i) => (
        <motion.circle key={i} cx={d.x} cy={d.y} r="4" fill="#f87171" opacity="0.9"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55 + i * 0.07 }} />
      ))}
    </>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function LifePlant({ progress = 0, healthScore = 70, burnout = 0, size = 140 }) {
  const stageInfo = getStage(progress);
  const c = getPlantColor(healthScore, burnout);
  const glowColor = c.leaf;

  const stageComponents = {
    0: <SeedStage />,
    1: <SproutStage c={c} />,
    2: <PlantStage c={c} />,
    3: <BloomStage c={c} />,
    4: <TreeStage c={c} />,
  };

  return (
    <div className="flex flex-col items-center">
      {/* Glow ring behind plant */}
      <div className="relative" style={{ width: size, height: size * 1.2 }}>
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 80%, ${glowColor}18 0%, transparent 70%)` }} />
        <AnimatePresence mode="wait">
          <motion.div
            key={stageInfo.stage}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', height: '100%' }}
          >
            <svg width="100%" height="100%" viewBox="0 0 120 168">
              {stageComponents[stageInfo.stage]}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stage label */}
      <motion.div
        key={stageInfo.name}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-1"
      >
        <p className="text-sm font-bold text-white flex items-center gap-1.5 justify-center">
          <span>{stageInfo.emoji}</span> {stageInfo.name}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{stageInfo.desc}</p>
      </motion.div>
    </div>
  );
}
