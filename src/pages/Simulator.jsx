import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { runSimulation } from '../engines/simulatorEngine';
import { generateNarrative } from '../services/aiService';
import { GlassCard, PageHeader, ScoreRing } from '../components/ui/Components';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

const scenarios = [
  { id: 'sleep1',    label: '+1.5 Hours Sleep/night', icon: '😴', changes: { sleepAdd: 1.5 } },
  { id: 'workout2',  label: '+2 Workouts/week',        icon: '💪', changes: { workoutAdd: 2 } },
  { id: 'cutExp',    label: 'Cut Expenses ₹2000',      icon: '💰', changes: { expenseChange: -2000 } },
  { id: 'sidehustle',label: 'Side Hustle +₹5000',      icon: '💼', changes: { incomeChange: 5000, studyAdd: -1 } },
  { id: 'study2',    label: '+2 Hours Study/day',      icon: '📚', changes: { studyAdd: 2, sleepAdd: -0.5 } },
  { id: 'dsa3',      label: '+3 DSA Problems/day',     icon: '🧩', changes: { dsaAdd: 3 } },
];

export default function Simulator() {
  const { user } = useAuth();
  const { health, finance, career, computed, updateAICache, simulatorState, updateSimulatorState, aiCache } = useData();
  const [selected, setSelected] = useState(simulatorState?.selected || []);
  const [months, setMonths] = useState(simulatorState?.months || 3);
  const [aiNarrative, setAiNarrative] = useState(aiCache?.lastSimulation?.narrative || null);
  const [loading, setLoading] = useState(false);

  // Persist selections to DataContext so they survive unmount
  useEffect(() => {
    updateSimulatorState({ selected, months });
  }, [selected, months, updateSimulatorState]);

  // Compute combined modifications from all selected scenarios
  const modifications = useMemo(() => {
    return selected.reduce((acc, id) => {
      const sc = scenarios.find(s => s.id === id);
      if (!sc) return acc;
      Object.entries(sc.changes).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      return acc;
    }, {});
  }, [selected]);

  // Run deterministic simulation — always from live DataContext state
  const simulate = useMemo(() => {
    const currentState = { health, finance, career };
    return runSimulation(currentState, modifications, months);
  }, [health, finance, career, modifications, months]);

  // AI Narrative: only explains deterministic outputs — never invents numbers
  useEffect(() => {
    if (selected.length === 0) { setAiNarrative(null); return; }

    // If returning to page and the outputs match the cached narrative, skip fetching
    if (aiCache?.lastSimulation?.narrative && 
        JSON.stringify(aiCache.lastSimulation.selected) === JSON.stringify(selected) && 
        aiCache.lastSimulation.months === months &&
        JSON.stringify(aiCache.lastSimulation.simulated) === JSON.stringify(simulate.simulated)) {
      return; 
    }

    async function fetchNarrative() {
      setLoading(true);
      const simData = {
        baseline: simulate.baseline,
        simulated: simulate.simulated,
        deltas: simulate.deltas,
        impacts: simulate.impacts,
        cascades: simulate.cascades,
        confidence: simulate.confidence,
        months,
        selected // Saved to check cache hit later
      };
      const res = await generateNarrative(simData, 'simulator');
      setAiNarrative(res.narrative);
      updateAICache({ lastSimulation: { ...simData, narrative: res.narrative } });
      setLoading(false);
    }
    const timer = setTimeout(fetchNarrative, 600);
    return () => clearTimeout(timer);
  }, [simulate, selected, months, aiCache, updateAICache]);

  const toggleScenario = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const resetSimulator = () => {
    setSelected([]);
    setMonths(3);
    setAiNarrative(null);
    updateSimulatorState({ selected: [], months: 3 });
    updateAICache({ lastSimulation: null });
  };

  const confidenceColor = simulate.confidence >= 80
    ? 'bg-[rgba(46,158,107,0.1)] text-[#2E9E6B]'
    : simulate.confidence >= 60
      ? 'bg-[rgba(217,115,13,0.1)] text-[#D9730D]'
      : 'bg-orange-500/10 text-orange-400';

  return (
    <div className="page-container min-h-screen">
      <PageHeader title="What-If Future Simulator" subtitle="Explore how different life choices affect your estimated future trajectory." icon="🔮" />

      {/* Guard: require baseline data */}
      {!computed?.hasData ? (
        <GlassCard className="text-center py-16">
          <span className="text-4xl block mb-4">📭</span>
          <h3 className="text-lg font-semibold mb-2">No Baseline Data</h3>
          <p className="text-[#9B9B9B] text-sm max-w-md mx-auto mb-6">The simulator needs your current baseline to project the future. Please log some data in the Health, Finance, or Career tabs first.</p>
        </GlassCard>
      ) : (
        <>
          {/* Scenario Selection */}
          <GlassCard className="mb-8 lg:mb-10">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-6">
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-semibold text-[#f0f0f3]">Select Scenarios to Simulate</h3>
                {selected.length > 0 && (
                  <button onClick={resetSimulator} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-[#EBEBEB] px-2.5 py-1.5 rounded transition-colors">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9B9B9B]">Projection Timeline:</span>
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                  {[1, 3, 6, 12].map(m => (
                    <button key={m} onClick={() => setMonths(m)}
                      className={`text-xs px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${months === m ? 'bg-blue-500 text-white' : 'text-[#9B9B9B] hover:text-slate-200'}`}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
              {scenarios.map(s => (
                <motion.button key={s.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => toggleScenario(s.id)}
                  className={`p-4 rounded-xl border text-left text-xs transition-all cursor-pointer ${selected.includes(s.id) ? 'border-blue-500/40 bg-blue-500/10' : 'border-[rgba(255,255,255,0.055)] bg-[#252525] hover:bg-[#2b2b2b]'}`}>
                  <span className="text-xl block mb-2">{s.icon}</span>
                  <span className={selected.includes(s.id) ? 'text-blue-300 font-medium' : 'text-[#9B9B9B]'}>{s.label}</span>
                </motion.button>
              ))}
            </div>
          </GlassCard>

          {/* Side-by-Side Comparison */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 mb-8 lg:mb-10">
            <GlassCard>
              <h3 className="dash-section-title mb-6 justify-center">📍 Baseline State (Now)</h3>
              <div className="flex justify-around">
                <ScoreRing score={simulate.baseline.health}  color="#10b981" label="Health"  size={90} />
                <ScoreRing score={simulate.baseline.finance} color="#f59e0b" label="Finance" size={90} />
                <ScoreRing score={simulate.baseline.career}  color="#3b82f6" label="Career"  size={90} />
              </div>
              <div className="flex justify-center mt-6">
                <ScoreRing score={simulate.baseline.burnout} color={simulate.baseline.burnout > 60 ? '#ef4444' : '#10b981'} label="Burnout Risk" size={80} />
              </div>
            </GlassCard>

            <GlassCard className={selected.length > 0 ? 'glow-blue' : ''}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="dash-section-title mb-0 flex-1 justify-center">🔮 Projected Future ({months} Months)</h3>
                {selected.length > 0 && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {simulate.stabilityTrend && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${
                        simulate.stabilityTrend === 'improving' ? 'bg-[rgba(46,158,107,0.1)] text-[#2E9E6B]' :
                        simulate.stabilityTrend === 'recovery'  ? 'bg-cyan-500/10 text-cyan-400' :
                        simulate.stabilityTrend === 'volatile'  ? 'bg-orange-500/10 text-orange-400' :
                        simulate.stabilityTrend === 'declining' ? 'bg-[rgba(224,62,62,0.1)] text-[#E03E3E]' :
                        'bg-slate-500/10 text-[#9B9B9B]'
                      }`}>{simulate.stabilityTrend}</span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap ${confidenceColor}`}
                      title="Confidence decays over longer projection windows">
                      {simulate.confidence}% confident
                    </span>
                  </div>
                )}
              </div>
              {selected.length === 0 ? (
                <div className="text-center py-10 text-[#9B9B9B] text-sm h-32 flex items-center justify-center">Select scenarios above to simulate</div>
              ) : (
                <>
                  <div className="flex justify-around">
                    <ScoreRing score={simulate.simulated.health}  color="#10b981" label="Health"  size={90} />
                    <ScoreRing score={simulate.simulated.finance} color="#f59e0b" label="Finance" size={90} />
                    <ScoreRing score={simulate.simulated.career}  color="#3b82f6" label="Career"  size={90} />
                  </div>
                  <div className="flex justify-center mt-6">
                    <ScoreRing score={simulate.simulated.burnout} color={simulate.simulated.burnout > 60 ? '#ef4444' : '#10b981'} label="Burnout Risk" size={80} />
                  </div>
                  {/* Delta summary row */}
                  <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-[rgba(255,255,255,0.055)]">
                    {[
                      { label: 'Health',  delta: simulate.deltas.health,  color: '#10b981' },
                      { label: 'Finance', delta: simulate.deltas.finance, color: '#f59e0b' },
                      { label: 'Career',  delta: simulate.deltas.career,  color: '#3b82f6' },
                      { label: 'Burnout', delta: simulate.deltas.burnout, color: '#ef4444', invert: true },
                    ].map(item => {
                      const positive = item.invert ? item.delta < 0 : item.delta > 0;
                      const sign = item.delta > 0 ? '+' : '';
                      return (
                        <div key={item.label} className="text-center">
                          <p className={`text-xs font-bold ${positive ? 'text-[#2E9E6B]' : item.delta < 0 ? 'text-[#E03E3E]' : 'text-[#9B9B9B]'}`}>{sign}{item.delta}</p>
                          <p className="text-[9px] text-[#52525b] font-medium">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* AI Analysis, Timeline, Cascades */}
          {selected.length > 0 && (
            <div className="space-y-8 mb-10">
              <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
                <div className="lg:col-span-2">
                  <GlassCard className="h-full">
                    <h3 className="dash-section-title mb-6">Projected Trajectory</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulate.timeline}>
                          <XAxis dataKey="month" tickFormatter={v => `Month ${v}`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                          <Legend formatter={v => <span className="text-xs text-[#9B9B9B] capitalize">{v}</span>} />
                          <Line type="monotone" dataKey="simulated.h" name="health"  stroke="#10b981" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="simulated.f" name="finance" stroke="#f59e0b" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="simulated.c" name="career"  stroke="#3b82f6" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="simulated.b" name="burnout" stroke="#ef4444" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {simulate.confidence < 70 && (
                      <p className="text-[10px] text-orange-400/70 mt-2 text-center italic">
                        ⚠️ {months}-month projection — treat as directional estimate, not a precise prediction ({simulate.confidence}% confidence).
                      </p>
                    )}
                  </GlassCard>
                </div>

                <div>
                  <GlassCard className="h-full" glow="glow-purple">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🧠 AI Narrative Projection</h3>
                    <div className="space-y-4">
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs text-[#9B9B9B] animate-pulse">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Simulating cross-domain impacts...
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-[#EBEBEB] leading-relaxed italic">"{aiNarrative || 'Select scenarios to see your projected future.'}"</p>
                          <div className="border-t border-[rgba(255,255,255,0.055)] pt-3">
                            <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-2 font-semibold">Deterministic Impacts:</p>
                            <div className="space-y-1.5">
                              {simulate.impacts.map((imp, i) => (
                                <div key={i} className="flex items-start gap-2 text-[11px] text-[#9B9B9B]">
                                  <span className="flex-shrink-0 mt-0.5">{imp.type === 'positive' ? '✅' : imp.type === 'negative' ? '📉' : '🚨'}</span>
                                  <span>{imp.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>

              {/* Dominant Driver + Recovery Momentum */}
              {(simulate.dominantDriver || simulate.recoveryMomentum?.active) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {simulate.dominantDriver && (
                    <GlassCard className="border border-blue-500/15 bg-blue-500/5">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">🎯</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-300 mb-1">Dominant Driver</p>
                          <p className="text-xs text-[#EBEBEB]">{simulate.dominantDriver.text}</p>
                        </div>
                      </div>
                    </GlassCard>
                  )}
                  {simulate.recoveryMomentum?.active && (
                    <GlassCard className={`border ${
                      simulate.recoveryMomentum.strength === 'strong' ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-emerald-500/15 bg-emerald-500/5'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">📈</span>
                        <div>
                          <p className={`text-xs font-semibold mb-1 ${
                            simulate.recoveryMomentum.strength === 'strong' ? 'text-cyan-300' : 'text-emerald-300'
                          }`}>{simulate.recoveryMomentum.label}</p>
                          <p className="text-xs text-[#EBEBEB]">{simulate.recoveryMomentum.description}</p>
                        </div>
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* Active Cross-Domain Cascades */}
              {simulate.cascades?.length > 0 && (
                <GlassCard>
                  <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">🔗 Active Cross-Domain Cascades</h3>
                  <p className="text-[10px] text-[#9B9B9B] mb-4">Deterministic chain reactions triggered by your selected scenarios:</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {simulate.cascades.map((c, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-xs ${c.direction === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span>{c.direction === 'positive' ? '✅' : '⚠️'}</span>
                          <span className="font-semibold text-slate-200">{c.name}</span>
                        </div>
                        <p className="text-[#9B9B9B] text-[11px] mb-1">📌 {c.trigger}</p>
                        <p className={`text-[11px] font-medium mb-1 ${c.direction === 'positive' ? 'text-[#2E9E6B]' : 'text-[#E03E3E]'}`}>→ {c.impact}</p>
                        <p className="text-[#9B9B9B] text-[10px] italic">{c.reason}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Export disclaimer for long-term projections */}
              {simulate.confidence < 70 && (
                <p className="text-[10px] text-slate-600 text-center italic px-4">
                  📋 {simulate.exportMeta?.disclaimer}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
