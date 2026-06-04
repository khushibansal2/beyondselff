import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateTrajectory, getActionCards } from '../engines/trajectoryEngine';

const DOMAIN_TABS = [
  { id: 'overall', label: 'Life Balance', color: '#8b5cf6', activeColor: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', text: '#8b5cf6' },
  { id: 'health',  label: 'Health',       color: '#10b981', activeColor: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', text: '#10b981' },
  { id: 'finance', label: 'Finance',      color: '#f59e0b', activeColor: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  { id: 'career',  label: 'Career',       color: '#3b82f6', activeColor: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
];

function CustomTooltip({ active, payload, label, domainColor }) {
  if (!active || !payload?.length) return null;
  const current   = payload.find(p => p.dataKey === 'current')?.value;
  const optimized = payload.find(p => p.dataKey === 'optimized')?.value;
  const gap = optimized - current;

  return (
    <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
      <p style={{ color: '#64748b', fontSize: 11, margin: 0, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: '#ef4444' }}>Current Path</span>
          <span style={{ color: '#f1f5f9' }}>{current}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: domainColor }}>Optimized</span>
          <span style={{ color: '#f1f5f9' }}>{optimized}</span>
        </div>
        {gap > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: '#10b981' }}>Gap</span>
            <span style={{ color: '#10b981' }}>+{gap} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function FutureYouPanel() {
  const { computed, health, finance, career } = useData();
  const [activeDomain, setActiveDomain] = useState('overall');

  const userData = useMemo(() => ({ health, finance, career }), [health, finance, career]);

  const balance   = computed?.balance   ?? 45;
  const hScore    = computed?.healthScore?.score  ?? 49;
  const fScore    = computed?.financeScore?.score ?? 52;
  const cScore    = computed?.careerScore?.score  ?? 36;
  const burnoutRisk = computed?.burnout?.risk ?? 30;

  const domainScores = { overall: balance, health: hScore, finance: fScore, career: cScore };
  const tab = DOMAIN_TABS.find(t => t.id === activeDomain);
  const startScore = domainScores[activeDomain];

  const chartData = useMemo(() => calculateTrajectory(activeDomain, startScore, userData), [startScore, activeDomain, userData]);

  const currentEnd  = chartData[12]?.current ?? startScore;
  const optimizedEnd = chartData[12]?.optimized ?? startScore;
  const gap12 = optimizedEnd - currentEnd;
  const currentDelta  = currentEnd  - startScore;
  const optimizedDelta = optimizedEnd - startScore;

  const actionCards = useMemo(() => getActionCards(activeDomain, userData, computed), [activeDomain, userData, computed]);

  // Compute month-12 values for all subdomains to drive comparison table
  const healthProj = useMemo(() => calculateTrajectory('health', hScore, userData), [hScore, userData]);
  const financeProj = useMemo(() => calculateTrajectory('finance', fScore, userData), [fScore, userData]);
  const careerProj = useMemo(() => calculateTrajectory('career', cScore, userData), [cScore, userData]);

  const currentHealth12 = healthProj[12]?.current ?? hScore;
  const optHealth12 = healthProj[12]?.optimized ?? hScore;

  const currentFinance12 = financeProj[12]?.current ?? fScore;
  const optFinance12 = financeProj[12]?.optimized ?? fScore;

  const currentCareer12 = careerProj[12]?.current ?? cScore;
  const optCareer12 = careerProj[12]?.optimized ?? cScore;

  return (
    <div style={{ fontFamily: 'var(--font-primary)', paddingBottom: 40 }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Future You</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>12-month life trajectory — current vs optimized</p>
          </div>
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer'
        }}>
          <span>📤 Export</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── Domain Selector Cards ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          {
            id: 'overall', label: 'LIFE BALANCE', val: balance, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )
          },
          {
            id: 'health', label: 'HEALTH', val: hScore, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )
          },
          {
            id: 'finance', label: 'FINANCE', val: fScore, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )
          },
          {
            id: 'career', label: 'CAREER', val: cScore, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            )
          }
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveDomain(t.id)}
            style={{
              display: 'flex', itemsCenter: 'center', gap: 14, padding: '16px 20px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
              background: activeDomain === t.id ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
              border: activeDomain === t.id ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: t.bg, border: `1px solid ${t.border}`
            }}>{t.icon}</div>
            <div>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>{t.label}</p>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: t.color, margin: '0 0 2px', lineHeight: 1 }}>{t.val}</h3>
              <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>now</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Trajectory Chart Card ───────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDomain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          style={{
            padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', marginBottom: 24
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
              <span style={{ width: 12, height: 2, background: tab.color, display: 'inline-block' }} /> Optimized You
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#ef4444' }}>
              <span style={{ width: 12, height: 2, background: '#ef4444', display: 'inline-block', borderTop: '1.5px dashed #ef4444' }} /> Current path
            </div>
          </div>

          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`futureGrad-${activeDomain}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tab.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={tab.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip domainColor={tab.color} />} />
                <Area type="monotone" dataKey="optimized" stroke={tab.color} strokeWidth={2} fill={`url(#futureGrad-${activeDomain})`} dot={false} />
                <Area type="monotone" dataKey="current" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Mid Metrics Row ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        
        {/* Optimized Gain */}
        <div style={{
          padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>OPTIMIZED GAIN</p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#c084fc', margin: '0 0 2px', lineHeight: 1 }}>+{Math.max(0, optimizedDelta)} pts</h3>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Score {Math.round(startScore)} → {optimizedEnd}</p>
          </div>
        </div>

        {/* Current Path */}
        <div style={{
          padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>CURRENT PATH</p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f87171', margin: '0 0 2px', lineHeight: 1 }}>{currentDelta >= 0 ? '+' : ''}{currentDelta} pts</h3>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Score {Math.round(startScore)} → {currentEnd}</p>
          </div>
        </div>

        {/* Divergence Gap */}
        <div style={{
          padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>DIVERGENCE GAP</p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', margin: '0 0 2px', lineHeight: 1 }}>+{Math.max(0, gap12)} pts</h3>
            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>by month 12 vs current habits</p>
          </div>
        </div>

      </div>

      {/* ── What the optimized path requires ────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', trackingWidth: '0.05em', marginBottom: 12 }}>What the optimized path requires</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {actionCards.map((card, i) => (
            <motion.div
              key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{
                padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 14
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{card.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px' }}>{card.title}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: card.color, margin: 0 }}>{card.impact}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Bottom Section (3 Columns) ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        
        {/* Column 1 */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', trackingWidth: '0.05em', marginBottom: 12 }}>You in 12 months — current vs optimized</p>
          <div style={{
            padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 18
          }}>
            {[
              { label: 'Health', base: hScore, drop: currentHealth12 },
              { label: 'Finance', base: fScore, drop: currentFinance12 },
              { label: 'Career', base: cScore, drop: currentCareer12 }
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{row.base}</span>
                  <span style={{ color: '#334155' }}>→</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>{row.drop}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#10b981', textTransform: 'uppercase', trackingWidth: '0.05em', marginBottom: 12 }}>Optimized You</p>
          <div style={{
            padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 18
          }}>
            {[
              { label: 'Health', base: hScore, opt: optHealth12, gain: `${optHealth12 - hScore >= 0 ? '+' : ''}${optHealth12 - hScore}` },
              { label: 'Finance', base: fScore, opt: optFinance12, gain: `${optFinance12 - fScore >= 0 ? '+' : ''}${optFinance12 - fScore}` },
              { label: 'Career', base: cScore, opt: optCareer12, gain: `${optCareer12 - cScore >= 0 ? '+' : ''}${optCareer12 - cScore}` }
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{row.base}</span>
                  <span style={{ color: '#334155' }}>→</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{row.opt}</span>
                  <span style={{ color: '#34d399', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{row.gain}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3 */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', trackingWidth: '0.05em', marginBottom: 12 }}>How BeyondSelf gets you there</p>
          <div style={{
            padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 18
          }}>
            {[
              { step: '01', title: 'Daily tracking', desc: 'Health, finance, career logged in one place. Patterns emerge automatically.' },
              { step: '02', title: 'Cross-domain cascades', desc: 'AI detects when sleep debt is causing your overspending — not you.' },
              { step: '03', title: 'Compounding habits', desc: 'Each week of consistency shifts the optimized line further from the current one.' }
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#818cf8', flexShrink: 0
                }}>{item.step}</div>
                <div>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px', lineHeight: 1 }}>{item.title}</h4>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

export default function FutureYou() {
  return (
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)' }}>
      <FutureYouPanel />
    </div>
  );
}
