import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, ReferenceLine, CartesianGrid } from 'recharts';

/* ─── Circular Progress for Carbon Indicator ─────────────────────── */
function CircularProgress({ value, target, size = 110, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, value / target);
  const offset = circ - pct * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={value > target ? '#f43f5e' : '#10b981'}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${value > target ? '#f43f5e' : '#10b981'}50)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: value > target ? '#f43f5e' : '#10b981', lineHeight: 1 }}>{Math.round(value)}</span>
        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, marginTop: 3 }}>KG CO₂e</span>
      </div>
    </div>
  );
}

/* ─── Chart Tooltip ───────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 12 }}>
        <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 4px', fontWeight: 600 }}>Day {label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color || p.stroke, fontSize: 12, fontWeight: 700, margin: 0 }}>
            {Math.round(p.value)} kg CO₂e
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Sustainability() {
  const { sustainability, updateDomain } = useData();
  const [tab, setTab] = useState('dashboard');

  // Use real data if any carbon has been tracked; fall back to demo values for new users
  const hasCarbonData = (sustainability?.carbonFootprint?.transport || 0) +
    (sustainability?.carbonFootprint?.energy || 0) +
    (sustainability?.carbonFootprint?.food || 0) > 0;
  const sustainData = {
    carbonFootprint: hasCarbonData
      ? sustainability.carbonFootprint
      : { transport: 112, energy: 98, food: 70 },
    ecoActions: sustainability?.ecoActions || [],
  };
  const totalCarbon = (sustainData.carbonFootprint?.transport || 0) + (sustainData.carbonFootprint?.energy || 0) + (sustainData.carbonFootprint?.food || 0);

  const targetCarbon = 238; 
  const overTarget = Math.max(0, totalCarbon - targetCarbon);

  const trendData = useMemo(() => {
    const curve = [320, 330, 290, 290, 310, 305, 290, 290, 275, 275, 250, 260, 235, 235, 245, 220, 225, 215, 215, 205, 210, 200, 200, 195, 190, 195, 195, 205, 210, 215];
    return curve.map((val, i) => ({
      date: String(i + 1).padStart(2, '0'),
      carbon: val
    }));
  }, []);

  const pieData = [
    { name: 'Transport', value: sustainData.carbonFootprint?.transport || 112, color: '#f43f5e' },
    { name: 'Energy', value: sustainData.carbonFootprint?.energy || 98, color: '#f59e0b' },
    { name: 'Food / Diet', value: sustainData.carbonFootprint?.food || 70, color: '#10b981' },
  ];

  const handleLogAction = (action, carbonSaved) => {
    const newEntry = { action, points: carbonSaved, date: new Date().toISOString() };
    updateDomain('sustainability', {
      ecoActions: [newEntry, ...(sustainability?.ecoActions || [])],
    });
    showToast(`Logged: "${action}". Saved ${carbonSaved}kg CO2!`, 'success');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🌿' },
    { id: 'actions', label: 'Eco-Actions', icon: '🏃' },
    { id: 'recommendations', label: 'AI Green Tips', icon: '💡' },
  ];

  const logableActions = [
    { title: 'Used Public Transport', saved: 12, icon: '🚌', desc: 'Commute via bus/metro instead of single car occupancy' },
    { title: 'Plant-Based Day', saved: 6, icon: '🥗', desc: 'Substituted all meat products with organic plant items' },
    { title: 'Smart Energy Off', saved: 4, icon: '🔌', desc: 'Unplugged all standby home electronics overnight' },
    { title: 'Zero Waste Meals', saved: 3, icon: '🍎', desc: 'Managed leftovers perfectly with zero food waste' },
  ];

  return (
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'var(--font-primary)' }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Sustainability Tracking</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Monitor your carbon footprint and log eco-friendly actions.</p>
          </div>
        </div>
      </div>

      {/* ── Tab Selectors ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', padding: '0 4px 10px', fontSize: 13.5, fontWeight: 600,
              color: tab === t.id ? '#10b981' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: 6, position: 'relative', transition: 'color 0.2s'
            }}
          >
            <span>{t.icon}</span> {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="activeEcoTab"
                style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#10b981', borderRadius: 99 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Top Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              
              {/* Monthly Summary */}
              <div style={{
                padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 20
              }}>
                <CircularProgress value={totalCarbon} target={targetCarbon} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Monthly Total</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>Target: {targetCarbon} kg</p>
                  <span style={{
                    fontSize: 9.5, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                    background: overTarget > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                    color: overTarget > 0 ? '#f43f5e' : '#10b981'
                  }}>{overTarget > 0 ? `+${overTarget} kg over` : 'On track'}</span>
                </div>
              </div>

              {/* Transport */}
              <div style={{
                padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 16
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: 'rgba(244,63,94,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                    <rect x="1" y="3" width="22" height="13" rx="2" ry="2" />
                    <line x1="12" y1="21" x2="12" y2="16" />
                    <line x1="5" y1="21" x2="19" y2="21" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>Transport</p>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    {sustainData.carbonFootprint?.transport || 112} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>kg</span>
                  </h3>
                </div>
              </div>

              {/* Home Energy */}
              <div style={{
                padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 16
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>Energy</p>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    {sustainData.carbonFootprint?.energy || 98} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>kg</span>
                  </h3>
                </div>
              </div>

              {/* Food & Diet */}
              <div style={{
                padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 16
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <span style={{ fontSize: 18 }}>🥗</span>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>Food / Diet</p>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    {sustainData.carbonFootprint?.food || 70} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>kg</span>
                  </h3>
                </div>
              </div>

            </div>

            {/* Graphs Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
              
              {/* Pie Breakdown */}
              <div style={{
                padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>Carbon Footprint Breakdown</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
                  <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{Math.round(totalCarbon)}</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Total kg</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, paddingLeft: 32 }}>
                    {pieData.map(p => {
                      const pct = Math.round((p.value / totalCarbon) * 100);
                      return (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{p.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 20, fontWeight: 700 }}>
                            <span style={{ color: '#64748b', width: 28, textAlign: 'right' }}>{pct}%</span>
                            <span style={{ color: '#f1f5f9', width: 44, textAlign: 'right' }}>{p.value}kg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 30-Day Trend */}
              <div style={{
                padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)', minHeight: 320
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>30-Day Carbon Trend</h3>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ecoTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 380]} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={targetCarbon} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4}
                        label={{ position: 'right', value: `Limit: ${targetCarbon}kg`, fill: '#ef4444', fontSize: 9 }} />
                      <Area type="monotone" dataKey="carbon" stroke="#10b981" fill="url(#ecoTrendGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* AI Recommendations */}
            <div style={{
              padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💡</span> AI Eco-Recommendations
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { title: 'Great Progress!', desc: 'Your footprint is 18% lower than last month. Keep up this momentum.', theme: '#10b981', bg: 'rgba(16,185,129,0.04)', icon: '🌿' },
                  { title: 'Smart Energy Off', desc: 'Switch to energy efficient bulbs. Unplug idle standby devices.', theme: '#f59e0b', bg: 'rgba(245,158,11,0.04)', icon: '🔌' },
                  { title: 'Plant-Based Meals', desc: 'Try substituting 3 meals this week to organic vegetarian diet.', theme: '#10b981', bg: 'rgba(16,185,129,0.04)', icon: '🥗' }
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: 16, borderRadius: 12, background: item.bg, border: `1px solid ${item.theme}20`,
                    display: 'flex', gap: 12, alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: item.theme, margin: '0 0 4px' }}>{item.title}</h4>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* ── ECO-ACTIONS TAB ───────────────────────────────────── */}
        {tab === 'actions' && (
          <motion.div key="actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
            
            {/* Quick Logging */}
            <div style={{
              padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Log Eco-friendly Actions</h3>
              <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 20px' }}>Log common daily green practices to immediately offset your telemetry baseline.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logableActions.map(action => (
                  <div key={action.title} style={{
                    padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{action.icon}</span>
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px' }}>{action.title}</h4>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{action.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLogAction(action.title, action.saved)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.12)',
                        color: '#34d399', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
                    >
                      +{action.saved}kg
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action History Log */}
            <div style={{
              padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>Eco-Action History Log</h3>
              {(!sustainData.ecoActions || sustainData.ecoActions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                  <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📝</span>
                  <p style={{ fontSize: 12, margin: 0 }}>No eco-actions logged yet. Try logging one on the left!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {sustainData.ecoActions.map((action, i) => (
                    <div key={i} style={{
                      padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', margin: '0 0 3px' }}>{action.action}</p>
                        <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{new Date(action.date).toLocaleDateString()} at {new Date(action.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>-{action.points}kg CO₂</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* ── RECOMMENDATIONS TAB ────────────────────────────────── */}
        {tab === 'recommendations' && (
          <motion.div key="recommendations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>AI Personalized Carbon Offsets</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    title: 'Option A: Digital Smart Timer integration',
                    impact: 'High', savings: '45kg / Month', icon: '🔋',
                    desc: 'Install automated smart plugs on household media systems to completely isolate power consumption during late hours (12AM - 6AM).'
                  },
                  {
                    title: 'Option B: Public Transit Hybrid Switch',
                    impact: 'Medium', savings: '32kg / Month', icon: '🚇',
                    desc: 'Shift Tuesday and Thursday commutes to rail lines. Bypasses core rush traffic while cleanly minimizing carbon emissions.'
                  },
                  {
                    title: 'Option C: Local Organic Sourcing',
                    impact: 'Low', savings: '15kg / Month', icon: '🍎',
                    desc: 'Procure seasonal produce from local agrarian co-operatives. Lowers long-distance freight distribution energy baseline.'
                  }
                ].map((rec, i) => (
                  <div key={i} style={{
                    padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', gap: 16, alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{rec.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{rec.title}</h4>
                        <span style={{
                          fontSize: 9.5, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                          background: rec.impact === 'High' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                          color: rec.impact === 'High' ? '#34d399' : '#818cf8'
                        }}>{rec.impact} Priority</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: 1.4 }}>{rec.desc}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#10b981', margin: 0 }}>Estimated: Saves {rec.savings}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Floating Action Button - Log Eco-Action */}
      {tab !== 'actions' && (
        <div style={{ position: 'fixed', bottom: 24, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 50 }}>
          <button
            onClick={() => setTab('actions')}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Log Action</span>
        </div>
      )}

    </div>
  );
}
