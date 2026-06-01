const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const rStr = 'const r = 42;';
const whyStr = '// ─── WHY-SCORE EXPLANATION BUILDER';
const ringStart = code.indexOf(rStr);
const ringEnd = code.indexOf(whyStr);

if (ringStart === -1 || ringEnd === -1) {
    console.error('Ring component bounds not found', ringStart, ringEnd);
    process.exit(1);
}

const newRingCode = `const r = 50; // Increased radius for ~120px diameter (including stroke)
const circ = 2 * Math.PI * r;

function DashboardScoreRing({ label, icon, score, display, color, change, up, isActive, onClick }) {
  const offset = circ - (score / 100) * circ;
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        flex: 1,
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: 'pointer', padding: '16px 12px', borderRadius: 16,
        background: isActive ? \`\${color}15\` : '#111827',
        border: \`1px solid \${isActive ? \`\${color}50\` : 'rgba(255,255,255,0.05)'}\`,
        transition: 'all 0.2s',
        position: 'relative',
        boxShadow: isActive ? \`0 0 20px \${color}20\` : 'none',
      }}
    >
      {/* Icon at top */}
      <span style={{ fontSize: 20, marginBottom: 4 }}>{icon}</span>

      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* Ambient glow when active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 10, borderRadius: '50%',
              background: \`radial-gradient(circle, \${color}40 0%, transparent 70%)\`,
              filter: 'blur(12px)',
              pointerEvents: 'none',
            }}
          />
        )}
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ filter: isActive ? \`drop-shadow(0 0 6px \${color}80)\` : 'none', transition: 'all 0.3s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, marginTop: 2 }}>/100</span>
        </div>
      </div>
      
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', transition: 'color 0.2s', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 11, color: up ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{change}</span>
      
      {/* "Why this score?" dropdown row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? color : '#6b7280', transition: 'color 0.2s' }}>
          Why this score?
        </span>
        <motion.span
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: 9, color: isActive ? color : '#6b7280', lineHeight: 1, display: 'inline-block' }}
        >
          ▼
        </motion.span>
      </div>
    </motion.div>
  );
}

`;

code = code.substring(0, ringStart) + newRingCode + code.substring(ringEnd);

const usageStartStr = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 12, alignItems: 'stretch', marginBottom: 12 }}>`;
const usageEndStr = `{(() => {`;
const usageStart = code.indexOf(usageStartStr);
let usageEnd = -1;
if (usageStart !== -1) {
    usageEnd = code.indexOf(usageEndStr, usageStart);
}

if (usageStart === -1 || usageEnd === -1) {
    console.error('Usage block bounds not found', usageStart, usageEnd);
    process.exit(1);
}

const newUsageCode = `<div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 16 }}>
              {[
                { label: 'Health', score: healthScore, trend: '▲ 7% this week', color: '#f43f5e', icon: '❤️', points: [45, 52, 49, 62, 58, 65, healthScore] },
                { label: 'Finance', score: financeScore, trend: '▼ 3% this week', color: '#fbbf24', icon: '💰', points: [72, 70, 68, 65, 67, 66, financeScore] },
                { label: 'Career', score: careerScore, trend: '▲ 11% this week', color: '#6366f1', icon: '🎯', points: [25, 30, 28, 35, 32, 40, careerScore] },
                { label: 'Mindset', score: mindScore, trend: '▲ 10% this week', color: '#d946ef', icon: '🧠', points: [55, 60, 58, 64, 62, 70, mindScore] },
                { label: 'Life Balance', score: lifeBalance, trend: '▲ 7% this week', color: '#06b6d4', icon: '⚖️', points: [50, 55, 52, 60, 58, 62, lifeBalance], ringKey: 'Balance' },
              ].map((card) => {
                const rk = card.ringKey || card.label;
                const isActive = !!openRings[rk];
                const up = card.trend.includes('▲');
                return (
                  <DashboardScoreRing
                    key={card.label}
                    label={card.label}
                    icon={card.icon}
                    score={card.score}
                    display={String(card.score)}
                    color={card.color}
                    change={card.trend}
                    up={up}
                    isActive={isActive}
                    onClick={() => toggleRing(rk)}
                  />
                );
              })}

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => window.location.href = '/goals'}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                    border: 'none', color: '#fff', fontSize: 24, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                    transition: 'transform 0.15s',
                    flexShrink: 0
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  +
                </button>
              </div>
            </div>

            `;

code = code.substring(0, usageStart) + newUsageCode + code.substring(usageEnd);
fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('done');
