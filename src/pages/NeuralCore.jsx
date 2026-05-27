import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeuralEngine } from '../engines/NeuralEngine';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, ScoreRing, showToast } from '../components/ui/Components';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong p-3 rounded-xl text-xs space-y-1 min-w-[160px]">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold flex justify-between gap-4">
          <span>{p.name}</span><span>{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

function Slider({ label, value, min, max, step = 1, onChange, color, unit, desc }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="font-bold tabular-nums px-2 py-0.5 rounded-lg text-[11px]" style={{ color, background: `${color}18` }}>
          {value > 0 && min >= 0 && value !== min ? '+' : ''}{value}{unit}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 leading-tight">{desc}</p>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full transition-all duration-150" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[9px] text-slate-600">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function NeuralCore() {
  const state = useData();
  const [timeline, setTimeline] = useState([]);
  const [whatIfTimeline, setWhatIfTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const hasData = (state?.computed?.healthScore?.score ?? 0) > 0 || (state?.computed?.financeScore?.score ?? 0) > 0;
  const [adjustments, setAdjustments] = useState({
    extraSleep: 0,      // 0–3 extra hours
    extraStudy: 0,      // 0–6 extra hours
    extraSavings: 0,    // 0–20 extra % savings rate
    stressReduction: 0, // 0–5 stress points reduced
  });

  const hs = state?.computed?.healthScore?.score  ?? 0;
  const fs = state?.computed?.financeScore?.score ?? 0;
  const cs = state?.computed?.careerScore?.score  ?? 0;
  const burnout = state?.computed?.burnout?.risk  ?? 0;
  const income = state?.finance?.income || 0;
  const study  = parseFloat(state?.career?.studyHoursDaily  || 0);
  const coding = parseFloat(state?.career?.codingHoursDaily || 0);

  const endStability    = timeline.length > 0 ? timeline[timeline.length - 1].stability : null;
  const endRisk         = timeline.length > 0 ? timeline[timeline.length - 1].risk      : null;
  const wiEndStability  = whatIfTimeline.length > 0 ? whatIfTimeline[whatIfTimeline.length - 1].stability : null;
  const trajectory      = endStability !== null ? (endStability > 65 ? 'positive' : endStability > 40 ? 'neutral' : 'critical') : null;
  const stabilityDelta  = (wiEndStability !== null && endStability !== null) ? wiEndStability - endStability : null;

  // Merge current + what-if timelines for the chart
  const chartData = useMemo(() => {
    if (!timeline.length) return [];
    return timeline.map((t, i) => ({
      year: t.year,
      stability: t.stability,
      risk: t.risk,
      ...(whatIfTimeline[i] ? {
        wiStability: whatIfTimeline[i].stability,
        wiRisk: whatIfTimeline[i].risk,
      } : {}),
    }));
  }, [timeline, whatIfTimeline]);

  const handleInference = useCallback(async () => {
    setLoading(true);
    try {
      const engine = new NeuralEngine();
      const result = await engine.runInference(state || {});
      setTimeline(result);
      setWhatIfTimeline([]);
    } catch {
      showToast('Computation failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Auto-run on first load when user has data
  useEffect(() => {
    if (hasData && timeline.length === 0) {
      handleInference();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await engine.runInference(modifiedState);
      setWhatIfTimeline(result);
    } catch {
      showToast('What-If computation failed', 'error');
    }
  }, [adjustments, timeline, state, hs, fs, cs, burnout, study, coding]);

  const updateAdj = (key, val) => {
    const next = { ...adjustments, [key]: val };
    setAdjustments(next);
    if (timeline.length) runWhatIf(next);
  };

  const inputs = [
    { label: 'Health Score',    value: `${hs}/100`,             color: '#10b981' },
    { label: 'Finance Score',   value: `${fs}/100`,             color: '#f59e0b' },
    { label: 'Career Score',    value: `${cs}/100`,             color: '#6366f1' },
    { label: 'Burnout Risk',    value: `${burnout}%`,           color: burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981' },
    { label: 'Monthly Income',  value: `₹${income.toLocaleString()}`, color: '#06b6d4' },
    { label: 'Daily Effort',    value: `${study + coding}h`,    color: '#8b5cf6' },
  ];

  const sliders = [
    { key: 'extraSleep',      label: '+ Sleep Hours',    color: '#8b5cf6', min: 0, max: 3, step: 0.5, unit: 'h', desc: `Each +1h sleep → +3.5 health score pts` },
    { key: 'extraStudy',      label: '+ Study Hours',    color: '#3b82f6', min: 0, max: 6, step: 0.5, unit: 'h', desc: `Each +1h study → +2.2 career score pts` },
    { key: 'extraSavings',    label: '+ Savings Rate',   color: '#10b981', min: 0, max: 20, step: 1,  unit: '%', desc: `Each +1% savings → +1.5 finance score pts` },
    { key: 'stressReduction', label: '− Stress Level',   color: '#f59e0b', min: 0, max: 5, step: 1,  unit: 'pts', desc: `Each −1 stress → −6 burnout risk` },
  ];

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader
        title="Neural Core"
        subtitle="Deterministic 20-year life trajectory + What-If scenario lab."
        icon="🧬"
      />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar — inputs */}
        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Input Tensors</h3>
            <div className="space-y-3">
              {inputs.map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <button
            onClick={handleInference}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Computing…</>
            ) : (
              <>🧬 Generate Trajectory</>
            )}
          </button>

          {trajectory && (
            <GlassCard className={trajectory === 'positive' ? 'glow-emerald' : trajectory === 'critical' ? 'glow-rose' : ''}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">2045 Outlook</p>
              <p className="text-2xl font-bold mb-1" style={{ color: trajectory === 'positive' ? '#10b981' : trajectory === 'critical' ? '#ef4444' : '#f59e0b' }}>
                {endStability}%
              </p>
              <p className="text-xs text-slate-400">Stability score</p>
              <p className="text-xs mt-2" style={{ color: trajectory === 'positive' ? '#10b981' : trajectory === 'critical' ? '#ef4444' : '#f59e0b' }}>
                {trajectory === 'positive' ? '✅ Sustainable trajectory' : trajectory === 'critical' ? '🚨 Intervention needed' : '⚠️ Monitor closely'}
              </p>
            </GlassCard>
          )}

          {/* What-If delta result */}
          <AnimatePresence>
            {stabilityDelta !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className={stabilityDelta > 0 ? 'border-purple-500/30' : 'border-slate-700'}>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">What-If 2045</p>
                  <p className="text-2xl font-bold mb-1" style={{ color: stabilityDelta > 10 ? '#8b5cf6' : stabilityDelta > 0 ? '#06b6d4' : '#f59e0b' }}>
                    {wiEndStability}%
                  </p>
                  <p className="text-xs font-semibold mt-1" style={{ color: stabilityDelta > 0 ? '#8b5cf6' : '#f59e0b' }}>
                    {stabilityDelta > 0 ? `▲ +${stabilityDelta} pts gain` : `▼ ${stabilityDelta} pts`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">vs. current trajectory</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main chart */}
        <GlassCard className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              20-Year Life Trajectory
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              {timeline.length > 0 && (
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Stability</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" style={{ borderTop: '2px dashed #f87171' }} /> Risk</span>
                  {whatIfTimeline.length > 0 && (
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-400 inline-block" style={{ borderTop: '2px dashed #a78bfa' }} /> What-If</span>
                  )}
                </div>
              )}
              {timeline.length > 0 && (
                <button
                  onClick={() => setShowWhatIf(p => !p)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border font-medium transition-all ${showWhatIf ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/[0.08] text-slate-400 hover:text-white'}`}
                >
                  🧪 What-If Lab
                </button>
              )}
            </div>
          </div>

          <div className="h-[340px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stabG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="riskG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="wiG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="year" stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="stability" stroke="#06b6d4" strokeWidth={2.5} fill="url(#stabG)" name="Stability" />
                  <Area type="monotone" dataKey="risk"      stroke="#ef4444" strokeWidth={1.5} fill="url(#riskG)" strokeDasharray="5 3" name="Risk" />
                  {whatIfTimeline.length > 0 && (
                    <Area type="monotone" dataKey="wiStability" stroke="#8b5cf6" strokeWidth={2} fill="url(#wiG)" strokeDasharray="6 3" name="What-If Stability" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center gap-4 text-center"
              >
                <span className="text-5xl opacity-20">🧬</span>
                <p className="text-slate-500 text-sm">Click "Generate Trajectory" to project<br />your next 20 years based on current data.</p>
                <p className="text-[10px] text-slate-600">Uses health, finance, career scores + burnout risk<br />for deterministic simulation — no black-box ML.</p>
              </motion.div>
            )}
          </div>

          {/* What-If Lab Panel */}
          <AnimatePresence>
            {showWhatIf && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">🧪 What-If Lab</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Adjust habits below — trajectory updates live</p>
                    </div>
                    {stabilityDelta !== null && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">2045 impact</p>
                        <p className="text-xl font-bold" style={{ color: stabilityDelta > 0 ? '#8b5cf6' : '#f59e0b' }}>
                          {stabilityDelta > 0 ? '+' : ''}{stabilityDelta}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                    {sliders.map(s => (
                      <Slider
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
                  <div className="mt-4 p-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/20 text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-purple-300 font-semibold">How it works: </span>
                    Each slider projects a realistic habit improvement and recomputes the full 20-year trajectory. The purple dashed line shows your adjusted future.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {timeline.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { label: '5-Year Stability',  idx: 4,  color: '#06b6d4', desc: 'Near-term trajectory' },
            { label: '10-Year Stability', idx: 9,  color: '#8b5cf6', desc: 'Mid-term projection'  },
            { label: '20-Year Stability', idx: 19, color: '#10b981', desc: 'Long-term outlook'    },
          ].map(({ label, idx, color, desc }) => {
            const current = timeline[idx]?.stability;
            const wi = whatIfTimeline[idx]?.stability;
            const delta = wi != null ? wi - current : null;
            return (
              <GlassCard key={label} className="text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                <p className="text-3xl font-bold mb-1" style={{ color, fontFamily: 'var(--font-display)' }}>{current}%</p>
                {delta !== null && (
                  <p className="text-[11px] font-semibold mt-1" style={{ color: delta > 0 ? '#8b5cf6' : '#f59e0b' }}>
                    What-If: {wi}% ({delta > 0 ? '+' : ''}{delta})
                  </p>
                )}
                <p className="text-xs text-slate-500">{desc}</p>
              </GlassCard>
            );
          })}
        </div>
      )}

      <GlassCard className="mt-6" glow="glow-purple">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          🧠 How This Works
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="font-semibold text-white mb-1">Deterministic Model</p>
            <p>No black-box ML — every output is traceable back to your health, finance, and career scores combined with your burnout risk.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="font-semibold text-white mb-1">Compounding Effects</p>
            <p>Career effort drives financial growth. Burnout degrades health. Health enables career performance. All three domains influence each other over time.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="font-semibold text-white mb-1">What-If Lab</p>
            <p>Use the sliders to simulate habit changes. The purple trajectory shows your adjusted 20-year outcome — identify the highest-leverage interventions.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
