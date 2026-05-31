import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeuralEngine } from '../engines/NeuralEngine';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Custom Slider for What-If Lab ───────────────────────────────── */
function CustomSlider({ label, value, min, max, step = 1, onChange, color, unit, desc }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, color, background: `${color}15` }}>
          {value > 0 && min >= 0 && value !== min ? '+' : ''}{value}{unit}
        </span>
      </div>
      <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.3 }}>{desc}</p>
      <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
}

/* ─── Chart Tooltip ───────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
      <p style={{ color: '#64748b', fontSize: 11, margin: 0, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: '#f1f5f9' }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function NeuralCore() {
  const state = useData();
  const [timeline, setTimeline] = useState([]);
  const [whatIfTimeline, setWhatIfTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const hasData = (state?.computed?.healthScore?.score ?? 0) > 0 || (state?.computed?.financeScore?.score ?? 0) > 0;
  
  const [years, setYears] = useState(5);
  const [adjustments, setAdjustments] = useState({
    extraSleep: 0,
    extraStudy: 0,
    extraSavings: 0,
    stressReduction: 0,
  });

  const hs = state?.computed?.healthScore?.score  ?? 0;
  const fs = state?.computed?.financeScore?.score ?? 0;
  const cs = state?.computed?.careerScore?.score  ?? 0;
  const burnout = state?.computed?.burnout?.risk  ?? 0;
  const income = state?.finance?.income || 0;
  const study  = parseFloat(state?.career?.studyHoursDaily  || 0);
  const coding = parseFloat(state?.career?.codingHoursDaily || 0);

  const endStability    = timeline.length > 0 ? timeline[timeline.length - 1].stability : null;
  const wiEndStability  = whatIfTimeline.length > 0 ? whatIfTimeline[whatIfTimeline.length - 1].stability : null;
  const trajectory      = endStability !== null ? (endStability > 65 ? 'positive' : endStability > 40 ? 'neutral' : 'critical') : null;
  const stabilityDelta  = (wiEndStability !== null && endStability !== null) ? wiEndStability - endStability : null;

  // Merge timelines
  const chartData = useMemo(() => {
    if (!timeline.length) return [];
    return timeline.map((t, i) => ({
      year: t.year,
      stability: t.stability,
      risk: t.risk,
      ...(whatIfTimeline[i] ? {
        wiStability: whatIfTimeline[i].stability,
      } : {}),
    }));
  }, [timeline, whatIfTimeline]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const handleInference = useCallback(async (y) => {
    const yearsToRun = typeof y === 'number' ? y : years;
    setLoading(true);
    try {
      const engine = new NeuralEngine();
      const result = await engine.runInference(stateRef.current || {}, yearsToRun);
      setTimeline(result);
      setWhatIfTimeline([]);
    } catch {
      showToast('Computation failed', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years]);

  const runWhatIf = useCallback(async (adj = adjustments) => {
    if (!timeline.length) { showToast('Generate base trajectory first', 'info'); return; }
    const modifiedState = {
      ...state,
      computed: {
        ...state?.computed,
        healthScore:  { score: Math.min(100, hs + adj.extraSleep * 3.5) },
        financeScore: { score: Math.min(100, fs + adj.extraSavings * 1.5) },
        careerScore:  { score: Math.min(100, cs + adj.extraStudy  * 2.2) },
        burnout:      { risk:  Math.max(0, burnout - adj.stressReduction * 6) },
      },
      career: {
        ...state?.career,
        studyHoursDaily:  (study + adj.extraStudy).toString(),
        codingHoursDaily: coding.toString(),
      },

    };
    try {
      const engine = new NeuralEngine();
      const result = await engine.runInference(modifiedState, years);
      setWhatIfTimeline(result);
    } catch {
      showToast('What-If computation failed', 'error');
    }
  }, [adjustments, timeline, state, hs, fs, cs, burnout, study, coding, years]);

  const updateAdj = (key, val) => {
    const next = { ...adjustments, [key]: val };
    setAdjustments(next);
    if (timeline.length) runWhatIf(next);
  };

  const inputs = [
    { label: 'Health Score',   value: `${hs}/100`, color: '#10b981' },
    { label: 'Finance Score',  value: `${fs}/100`, color: '#f59e0b' },
    { label: 'Career Score',   value: `${cs}/100`, color: '#3b82f6' },
    { label: 'Burnout Risk',   value: `${burnout}%`, color: '#10b981' },
    { label: 'Monthly Income', value: `₹${income.toLocaleString()}`, color: '#f1f5f9' },
    { label: 'Daily Effort',   value: `${study + coding}h`, color: '#f1f5f9' },
  ];

  const sliders = [
    { key: 'extraSleep',      label: '+ Sleep Hours',    color: '#8b5cf6', min: 0, max: 3, step: 0.5, unit: 'h', desc: `Each +1h sleep → +3.5 health score pts` },
    { key: 'extraStudy',      label: '+ Study Hours',    color: '#3b82f6', min: 0, max: 6, step: 0.5, unit: 'h', desc: `Each +1h study → +2.2 career score pts` },
    { key: 'extraSavings',    label: '+ Savings Rate',   color: '#10b981', min: 0, max: 20, step: 1,  unit: '%', desc: `Each +1% savings → +1.5 finance score pts` },
    { key: 'stressReduction', label: '− Stress Level',   color: '#f59e0b', min: 0, max: 5, step: 1,  unit: 'pts', desc: `Each −1 stress → −6 burnout risk` },
  ];

  return (
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24, color: '#a855f7' }}>✨</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Neural Core</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Deterministic {years}-year life trajectory + What-if scenario lab.</p>
      </motion.div>

      {/* ── Grid Layout ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Sidebar Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Input Tensors Card */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            style={{
              padding: 20,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Input Tensors</span>
              <span style={{
                width: 13, height: 13, borderRadius: '50%', border: '1px solid #475569',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#64748b', cursor: 'help'
              }} title="Current states from your profile">i</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {inputs.map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Year Selector — drag slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>Projection Horizon</p>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#c084fc', background: 'rgba(139,92,246,0.12)', padding: '2px 10px', borderRadius: 7 }}>{years} yr</span>
              </div>
              <CustomSlider
                label=""
                value={years}
                min={1}
                max={30}
                step={1}
                unit=" yr"
                color="#c084fc"
                desc="Drag to select any year from 1 to 30"
                onChange={y => {
                  setYears(y);
                  if (timeline.length) handleInference(y);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#334155', marginTop: 4 }}>
                <span>1 yr</span><span>10 yr</span><span>20 yr</span><span>30 yr</span>
              </div>
            </div>

            <button
              onClick={() => handleInference(years)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#c084fc',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(192,132,252,0.3)', borderTopColor: '#c084fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Computing...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 14 }}>✨</span>
                  Generate Trajectory
                </>
              )}
            </button>
            <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', margin: '10px 0 0' }}>Model: Deterministic v2.1</p>
          </motion.div>

          {/* End-year Outlook Card */}
          {trajectory && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: 20,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 0 10px' }}>{2026 + years - 1} Outlook</p>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: '#10b981', margin: '0 0 2px', lineHeight: 1 }}>
                {endStability}%
              </h2>
              <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>Stability Score</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                <span>⚠️</span> Monitor closely
              </div>
            </motion.div>
          )}

        </div>

        {/* Right Column: Life Trajectory Chart & Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Trajectory Chart Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 24,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{years}-Year Life Trajectory</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                    <span style={{ width: 10, height: 1.5, background: '#3b82f6', display: 'inline-block' }} /> Stability
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                    <span style={{ width: 10, height: 1.5, background: '#ef4444', display: 'inline-block', borderTop: '1px dashed #ef4444' }} /> Risk
                  </span>
                  {whatIfTimeline.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                      <span style={{ width: 10, height: 1.5, background: '#10b981', display: 'inline-block', borderTop: '2.5px dotted #10b981' }} /> What-if Lab
                    </span>
                  )}
                </div>
                
                {timeline.length > 0 && (
                  <button
                    onClick={() => setShowWhatIf(w => !w)}
                    style={{
                      fontSize: 11,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: showWhatIf ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      background: showWhatIf ? 'rgba(139,92,246,0.12)' : 'transparent',
                      color: showWhatIf ? '#c084fc' : '#94a3b8',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    🧪 What-If Lab
                  </button>
                )}
              </div>
            </div>

            <div style={{ height: 280 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="stabilGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" stroke="#334155" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#334155" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="stability" stroke="#3b82f6" strokeWidth={2} fill="url(#stabilGrad)" name="Stability" dot={false} />
                    <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#riskGrad)" name="Risk" dot={false} />
                    {whatIfTimeline.length > 0 && (
                      <Area type="monotone" dataKey="wiStability" stroke="#10b981" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" fill="none" name="What-If Stability" dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
                  <span style={{ fontSize: 44, opacity: 0.15 }}>🧬</span>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Click "Generate Trajectory" to project your next 20 years based on current data.</p>
                  <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>Uses health, finance, career scores + burnout risk for deterministic simulation.</p>
                </div>
              )}
            </div>

            {/* Slider Lab Expansion */}
            <AnimatePresence>
              {showWhatIf && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 20, paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>🧪 What-If Lab</h4>
                        <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0' }}>Adjust habits below — trajectory updates live</p>
                      </div>
                      {stabilityDelta !== null && (
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{2026 + years - 1} impact</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#10b981', margin: 0 }}>
                            {stabilityDelta > 0 ? '+' : ''}{stabilityDelta}%
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 14 }}>
                      {sliders.map(s => (
                        <CustomSlider
                          key={s.key}
                          label={s.label}
                          value={adjustments[s.key]}
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          unit={s.unit}
                          desc={s.desc}
                          color={s.color}
                          onChange={val => updateAdj(s.key, val)}
                        />
                      ))}
                    </div>

                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>How it works: </span>
                      Each slider projects a realistic habit improvement and recomputes the full 20-year trajectory. The green dotted line shows your adjusted future.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Stability Milestones cards */}
          {timeline.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  label: '5-Year Stability',
                  desc: 'Near-term trajectory',
                  current: timeline[4]?.stability,
                  wi: whatIfTimeline[4]?.stability,
                  color: '#c084fc',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  )
                },
                {
                  label: '10-Year Stability',
                  desc: 'Mid-term projection',
                  current: timeline[9]?.stability,
                  wi: whatIfTimeline[9]?.stability,
                  color: '#c084fc',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  )
                },
                {
                  label: `${years}-Year Stability`,
                  desc: 'Long-term outlook',
                  current: timeline[19]?.stability,
                  wi: whatIfTimeline[19]?.stability,
                  color: '#10b981',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  )
                }
              ].map(({ label, desc, current, wi, color, icon }) => {
                const delta = wi != null ? wi - current : null;
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>{label}</p>
                      <h3 style={{ fontSize: 24, fontWeight: 800, color, margin: '0 0 4px', lineHeight: 1 }}>{current}%</h3>
                      {delta !== null && (
                        <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600, margin: '0 0 4px' }}>
                          What-If: {wi}% ({delta > 0 ? '+' : ''}{delta})
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{desc}</p>
                    </div>

                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {icon}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ── How This Works ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>How This Works</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          
          {/* Section 1 */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Deterministic Model</h4>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                No black-box ML — every output is traceable back to your health, finance, and career scores combined with your burnout risk.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Compounding Effects</h4>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Career effort drives financial growth. Burnout degrades health. All three domains influence each other over time.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v7.31a6 6 0 0 0 1.76 4.24l4.48 4.48a2 2 0 0 1-1.42 3.41H9.18a2 2 0 0 1-1.42-3.41l4.48-4.48A6 6 0 0 0 14 9.31V2" />
                <line x1="8" y1="2" x2="16" y2="2" />
              </svg>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>What-if Lab</h4>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Use the sliders to simulate habit changes. The green trajectory shows your adjusted 20-year outcome — identify the highest-leverage interventions.
              </p>
            </div>
          </div>

        </div>
      </motion.div>

    </div>
  );
}
