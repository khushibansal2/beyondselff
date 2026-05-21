import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { runSimulation } from '../engines/simulatorEngine';
import { generateNarrative } from '../services/aiService';
import { GlassCard, ScoreRing, PageHeader } from '../components/ui/Components';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

const scenarios = [
  { id: 'sleep1',     label: '+1.5 Hours',    sub: 'Sleep/night',       icon: '😴', impact: '+1.5h Sleep',     changes: { sleepAdd: 1.5 } },
  { id: 'workout2',   label: '+2',             sub: 'Workouts/week',     icon: '💪', impact: '+2 Workouts',      changes: { workoutAdd: 2 } },
  { id: 'cutExp',     label: 'Cut Expenses',   sub: '₹2000',             icon: '💰', impact: '-₹2000 Expenses',  changes: { expenseChange: -2000 } },
  { id: 'sidehustle', label: 'Side Hustle',    sub: '+₹5000',            icon: '💼', impact: '+₹5k Income',      changes: { incomeChange: 5000, studyAdd: -1 } },
  { id: 'study2',     label: '+2 Hours',       sub: 'Study/day',         icon: '📚', impact: '+2h Study',        changes: { studyAdd: 2, sleepAdd: -0.5 } },
  { id: 'dsa3',       label: '+3 DSA',         sub: 'Problems/day',      icon: '🧩', impact: '+3 DSA Problems',  changes: { dsaAdd: 3 } },
];

export default function Simulator() {
  const { user } = useAuth();
  const { health, finance, career, computed, updateAICache, simulatorState, updateSimulatorState, aiCache } = useData();
  const [selected, setSelected] = useState(simulatorState?.selected || []);
  const [months, setMonths]     = useState(simulatorState?.months   || 3);
  const [aiNarrative, setAiNarrative] = useState(aiCache?.lastSimulation?.narrative || null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => { updateSimulatorState({ selected, months }); }, [selected, months, updateSimulatorState]);

  const modifications = useMemo(() =>
    selected.reduce((acc, id) => {
      const sc = scenarios.find(s => s.id === id);
      if (!sc) return acc;
      Object.entries(sc.changes).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      return acc;
    }, {}),
  [selected]);

  const simulate = useMemo(() =>
    runSimulation({ health, finance, career }, modifications, months),
  [health, finance, career, modifications, months]);

  useEffect(() => {
    if (selected.length === 0) { setAiNarrative(null); return; }
    if (aiCache?.lastSimulation?.narrative &&
        JSON.stringify(aiCache.lastSimulation.selected)  === JSON.stringify(selected) &&
        aiCache.lastSimulation.months === months &&
        JSON.stringify(aiCache.lastSimulation.simulated) === JSON.stringify(simulate.simulated)) return;

    async function fetchNarrative() {
      setLoading(true);
      const simData = { baseline: simulate.baseline, simulated: simulate.simulated, deltas: simulate.deltas,
        impacts: simulate.impacts, cascades: simulate.cascades, confidence: simulate.confidence, months, selected };
      const res = await generateNarrative(simData, 'simulator');
      setAiNarrative(res.narrative);
      updateAICache({ lastSimulation: { ...simData, narrative: res.narrative } });
      setLoading(false);
    }
    const t = setTimeout(fetchNarrative, 600);
    return () => clearTimeout(t);
  }, [simulate, selected, months, aiCache, updateAICache]);

  const toggleScenario = id =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const confidenceBadge =
    simulate.confidence >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    simulate.confidence >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                'bg-rose-500/15 text-rose-400 border-rose-500/30';

  const trendBadge = {
    improving: 'bg-emerald-500/15 text-emerald-400',
    recovery:  'bg-cyan-500/15 text-cyan-400',
    volatile:  'bg-orange-500/15 text-orange-400',
    declining: 'bg-rose-500/15 text-rose-400',
  }[simulate.stabilityTrend] || 'bg-slate-500/15 text-slate-400';

  return (
    <div className="page-container min-h-screen pb-16">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader 
        title="What-If Future Simulator" 
        subtitle="Explore how different life choices affect your estimated future trajectory." 
      />

      {/* ── Guard ───────────────────────────────────────────────── */}
      {!computed?.hasData ? (
        <GlassCard className="text-center py-20">
          <span className="text-5xl block mb-5">📭</span>
          <h3 className="text-lg font-semibold mb-2">No Baseline Data</h3>
          <p className="text-[#9B9B9B] text-sm max-w-md mx-auto">
            The simulator needs your current baseline to project the future.
            Please log some data in the Health, Finance, or Career tabs first.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* ── Scenario Selection + Timeline ──────────────────── */}
          <div className="mb-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#EBEBEB]">Select Scenarios to Simulate</span>
                <span className="text-[#52525b] text-xs cursor-help" title="Select one or more scenarios to simulate their combined impact">ⓘ</span>
              </div>
              {/* Timeline selector */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9B9B9B]">Projection Timeline:</span>
                <div className="flex items-center gap-1 bg-[#0d0d1a]/80 border border-white/[0.06] rounded-lg p-1">
                  {[1, 3, 6, 12].map(m => (
                    <button
                      key={m}
                      onClick={() => setMonths(m)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                        months === m
                          ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                          : 'text-[#9B9B9B] hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenario Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {scenarios.map(s => {
                const isActive = selected.includes(s.id);
                return (
                  <motion.button
                    key={s.id}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleScenario(s.id)}
                    className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-250 cursor-pointer ${
                      isActive
                        ? 'border-violet-500/50 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                        : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
                    )}
                    <span className="text-2xl mb-2">{s.icon}</span>
                    <p className={`text-[12px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-[#EBEBEB]'}`}>{s.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-violet-300' : 'text-[#9B9B9B]'}`}>{s.sub}</p>
                    <p className={`text-[9px] mt-1.5 font-medium ${isActive ? 'text-violet-200/70' : 'text-[#52525b]'}`}>{s.impact}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Baseline vs Projected ──────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* Baseline */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <h3 className="text-[13px] font-semibold text-[#EBEBEB]">Baseline State (Now)</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <ScoreRing score={simulate.baseline.health}  color="#10b981" label="Health"      size={80} />
                <ScoreRing score={simulate.baseline.finance} color="#f59e0b" label="Finance"     size={80} />
                <ScoreRing score={simulate.baseline.career}  color="#3b82f6" label="Career"      size={80} />
                <ScoreRing score={simulate.baseline.burnout} color={simulate.baseline.burnout > 60 ? '#ef4444' : '#10b981'} label="Burnout Risk" size={80} />
              </div>
            </GlassCard>

            {/* Projected */}
            <GlassCard className={`p-6 ${selected.length > 0 ? 'border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.1)]' : ''}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
                  <h3 className="text-[13px] font-semibold text-[#EBEBEB]">Projected Future ({months} Month{months > 1 ? 's' : ''})</h3>
                </div>
                {selected.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {simulate.stabilityTrend && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full capitalize border border-transparent ${trendBadge}`}>
                        {simulate.stabilityTrend}
                      </span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${confidenceBadge}`}>
                      {simulate.confidence}% Confident
                    </span>
                  </div>
                )}
              </div>

              {selected.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-[#52525b]">
                  <span className="text-2xl mb-2">🔮</span>
                  <p className="text-xs">Select scenarios above to simulate</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <ScoreRing score={simulate.simulated.health}  color="#10b981" label="Health"      size={80} />
                    <ScoreRing score={simulate.simulated.finance} color="#f59e0b" label="Finance"     size={80} />
                    <ScoreRing score={simulate.simulated.career}  color="#3b82f6" label="Career"      size={80} />
                    <ScoreRing score={simulate.simulated.burnout} color={simulate.simulated.burnout > 60 ? '#ef4444' : '#10b981'} label="Burnout Risk" size={80} />
                  </div>
                  {/* Delta row */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.06]">
                    {[
                      { label: 'Health',  delta: simulate.deltas.health },
                      { label: 'Finance', delta: simulate.deltas.finance },
                      { label: 'Career',  delta: simulate.deltas.career },
                      { label: 'Burnout', delta: simulate.deltas.burnout, invert: true },
                    ].map(item => {
                      const positive = item.invert ? item.delta < 0 : item.delta > 0;
                      const sign = item.delta > 0 ? '+' : '';
                      return (
                        <div key={item.label} className="text-center">
                          <p className={`text-sm font-bold ${positive ? 'text-emerald-400' : item.delta < 0 ? 'text-rose-400' : 'text-[#9B9B9B]'}`}>
                            {sign}{item.delta}
                          </p>
                          <p className="text-[9px] text-[#52525b] mt-0.5">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* ── Analytics Row (chart + AI narrative + key insights) */}
          {selected.length > 0 && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                {/* Three-column row */}
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Trajectory Chart */}
                  <div className="lg:col-span-1">
                    <GlassCard className="p-5 h-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[12px] font-semibold text-[#EBEBEB] flex items-center gap-1.5">
                          <span>📊</span> Projected Trajectory ({months} Month{months > 1 ? 's' : ''})
                        </h3>
                        <span className="text-[9px] text-[#9B9B9B] bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 rounded-md">All Metrics</span>
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={simulate.timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <XAxis dataKey="month" tickFormatter={v => `Month ${v}`} tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{ background: 'rgba(10,10,25,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '11px', padding: '8px 12px' }}
                              labelStyle={{ color: '#9B9B9B', fontSize: '10px' }}
                            />
                            <Legend formatter={v => <span style={{ fontSize: '9px', color: '#9B9B9B' }}>{v}</span>} />
                            <Line type="monotone" dataKey="simulated.h" name="Health"  stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="simulated.f" name="Finance" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="simulated.c" name="Career"  stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="simulated.b" name="Burnout" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {simulate.confidence < 70 && (
                        <p className="text-[9px] text-amber-400/60 mt-2 text-center italic">
                          ⚠️ {months}M projection — treat as directional estimate ({simulate.confidence}% confidence)
                        </p>
                      )}
                    </GlassCard>
                  </div>

                  {/* AI Narrative */}
                  <div className="lg:col-span-1">
                    <GlassCard className="p-5 h-full border-violet-500/10">
                      <h3 className="text-[12px] font-semibold text-[#EBEBEB] flex items-center gap-1.5 mb-4">
                        <span className="text-violet-400">🟣</span> AI Narrative Projection
                      </h3>
                      {loading ? (
                        <div className="flex items-center gap-2 text-[11px] text-[#9B9B9B] animate-pulse">
                          <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          Simulating cross-domain impacts...
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[11px] text-[#EBEBEB] leading-relaxed italic">
                            "{aiNarrative || 'Select scenarios to see your projected future.'}"
                          </p>
                          {simulate.impacts.length > 0 && (
                            <div className="pt-3 border-t border-white/[0.06]">
                              <p className="text-[9px] text-[#9B9B9B] uppercase tracking-widest mb-2 font-semibold">Deterministic Impacts:</p>
                              <div className="space-y-1.5">
                                {simulate.impacts.slice(0, 4).map((imp, i) => (
                                  <div key={i} className="flex items-start gap-2 text-[10px] text-[#9B9B9B]">
                                    <span className="flex-shrink-0">
                                      {imp.type === 'positive' ? '✅' : imp.type === 'negative' ? '📉' : '🚨'}
                                    </span>
                                    <span className="leading-snug">{imp.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </GlassCard>
                  </div>

                  {/* Key Insights */}
                  <div className="lg:col-span-1">
                    <GlassCard className="p-5 h-full">
                      <h3 className="text-[12px] font-semibold text-[#EBEBEB] mb-4">Key Insights</h3>
                      <div className="space-y-3">
                        {/* Growth potential — from dominantDriver */}
                        {simulate.dominantDriver && (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">📈</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-400 mb-0.5">Growth Potential</p>
                              <p className="text-[10px] text-[#9B9B9B] leading-snug">{simulate.dominantDriver.text}</p>
                            </div>
                          </div>
                        )}

                        {/* Risk alert — burnout */}
                        {simulate.simulated.burnout > 55 && (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">⚠️</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-rose-400 mb-0.5">Risk Alert</p>
                              <p className="text-[10px] text-[#9B9B9B] leading-snug">Burnout risk increasing, take action</p>
                            </div>
                          </div>
                        )}

                        {/* Recovery momentum */}
                        {simulate.recoveryMomentum?.active && (
                          <div className={`flex items-start gap-3 p-3 rounded-xl border ${
                            simulate.recoveryMomentum.strength === 'strong'
                              ? 'bg-cyan-500/5 border-cyan-500/15'
                              : 'bg-blue-500/5 border-blue-500/15'
                          }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              simulate.recoveryMomentum.strength === 'strong' ? 'bg-cyan-500/15' : 'bg-blue-500/15'
                            }`}>
                              <span className="text-sm">🎯</span>
                            </div>
                            <div>
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                simulate.recoveryMomentum.strength === 'strong' ? 'text-cyan-400' : 'text-blue-400'
                              }`}>Best Focus Area</p>
                              <p className="text-[10px] text-[#9B9B9B] leading-snug">{simulate.recoveryMomentum.description}</p>
                            </div>
                          </div>
                        )}

                        {/* Fallback when no special signals */}
                        {!simulate.dominantDriver && !simulate.recoveryMomentum?.active && simulate.simulated.burnout <= 55 && (
                          <div className="flex items-center justify-center h-20 text-[#52525b] text-xs">
                            Insights will appear once simulated
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* ── Active Cross-Domain Cascades ─────────────── */}
                {simulate.cascades?.length > 0 && (
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-400">🔵</span>
                      <h3 className="text-[12px] font-semibold text-[#EBEBEB]">Active Cross-Domain Cascades</h3>
                    </div>
                    <p className="text-[10px] text-[#9B9B9B] mb-4 ml-5">Deterministic chain reactions triggered by your selected scenarios</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {simulate.cascades.map((c, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border ${
                            c.direction === 'positive'
                              ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                              : 'border-amber-500/20 bg-amber-500/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{c.direction === 'positive' ? '⭐' : '⚡'}</span>
                            <p className={`text-[11px] font-semibold ${c.direction === 'positive' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {c.name}
                            </p>
                          </div>
                          <p className="text-[10px] text-[#9B9B9B] mb-1">📌 {c.trigger}</p>
                          <p className={`text-[10px] font-medium mb-1 ${c.direction === 'positive' ? 'text-emerald-300' : 'text-rose-300'}`}>
                            → {c.impact}
                          </p>
                          <p className="text-[9px] text-[#52525b] italic leading-snug">{c.reason}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Disclaimer */}
                {simulate.confidence < 70 && (
                  <p className="text-[9px] text-slate-600 text-center italic">
                    📋 {simulate.exportMeta?.disclaimer}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
