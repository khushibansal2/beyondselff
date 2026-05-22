import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateTrendData } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast } from '../components/ui/Components';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, PieChart, Pie, Cell } from 'recharts';

export default function Sustainability() {
  const { user } = useAuth();
  const { updateDomain, computed } = useData();
  const [tab, setTab] = useState('dashboard');
  
  const sustainData = user?.sustainability || { carbonFootprint: { transport: 100, energy: 100, food: 80 }, ecoActions: [] };
  const trendData = useMemo(() => generateTrendData(user, 30), [user]);
  
  const totalCarbon = (sustainData.carbonFootprint?.transport || 0) + (sustainData.carbonFootprint?.energy || 0) + (sustainData.carbonFootprint?.food || 0);
  const targetCarbon = Math.round(((user?.sustainability?.carbonFootprint?.transport || 100) + (user?.sustainability?.carbonFootprint?.energy || 100) + (user?.sustainability?.carbonFootprint?.food || 80)) * 0.85); // Dynamic target: 15% reduction from baseline
  const footprintScore = Math.max(0, 100 - (totalCarbon / targetCarbon) * 100);

  const pieData = [
    { name: 'Transport', value: sustainData.carbonFootprint?.transport || 100, color: '#f43f5e' },
    { name: 'Energy', value: sustainData.carbonFootprint?.energy || 100, color: '#f59e0b' },
    { name: 'Food', value: sustainData.carbonFootprint?.food || 80, color: '#10b981' },
  ];

  const handleLogAction = (action, carbonSaved) => {
    const updated = { ...sustainData };
    if (!updated.ecoActions) updated.ecoActions = [];
    
    updated.ecoActions.unshift({ action, points: carbonSaved, date: new Date().toISOString() });
    
    // Reduce footprint proportionally to simulate impact
    if (updated.carbonFootprint) {
      if (action.includes('transit') || action.includes('bike')) updated.carbonFootprint.transport = Math.max(0, updated.carbonFootprint.transport - carbonSaved);
      else if (action.includes('plant') || action.includes('meat')) updated.carbonFootprint.food = Math.max(0, updated.carbonFootprint.food - carbonSaved);
      else updated.carbonFootprint.energy = Math.max(0, updated.carbonFootprint.energy - carbonSaved);
    }

    updateDomain('sustainability', updated);
    showToast(`Logged: "${action}". Saved ${carbonSaved}kg CO2!`, 'success');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'actions', label: 'Eco-Actions', icon: '🌱' },
    { id: 'recommendations', label: 'AI Green Tips', icon: '💡' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="glass-strong p-3 rounded-xl text-xs">
          <p className="text-slate-400 mb-1">{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color || p.payload?.fill }}>{p.name}: {Math.round(p.value)} kg CO₂</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Sustainability Tracking" subtitle="Monitor your carbon footprint and log eco-friendly actions." icon="🌿" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="flex flex-col items-center justify-center col-span-2 md:col-span-1" glow={footprintScore > 50 ? 'glow-emerald' : 'glow-rose'}>
              <h3 className="text-xs text-slate-400 mb-2 font-medium">Monthly Footprint</h3>
              <div className="relative flex items-center justify-center">
                <ScoreRing score={footprintScore} color={footprintScore > 50 ? '#10b981' : '#f43f5e'} size={110} strokeWidth={8} label="" />
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: footprintScore > 50 ? '#10b981' : '#f43f5e' }}>{Math.round(totalCarbon)}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">kg CO₂</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center px-4">
                Target: {targetCarbon} kg
              </p>
            </GlassCard>
            
            <MetricCard icon="🚗" label="Transport" value={`${Math.round(pieData[0].value)}kg`} color="#f43f5e" />
            <MetricCard icon="⚡" label="Home Energy" value={`${Math.round(pieData[1].value)}kg`} color="#f59e0b" />
            <MetricCard icon="🥗" label="Food/Diet" value={`${Math.round(pieData[2].value)}kg`} color="#10b981" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Carbon Footprint Breakdown</h3>
              <div className="h-64 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for pie chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-2xl font-bold">{Math.round(totalCarbon)}</span>
                   <span className="text-xs text-slate-500">Total</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }}></span>
                    <span className="text-xs text-slate-400">{p.name}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">30-Day Carbon Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="carbon" stroke="#10b981" fill="url(#carbonGradient)" strokeWidth={2} name="Daily CO2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Log Eco-Action</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Log daily activities to reduce your simulated carbon footprint. Every action helps you stay under your monthly target!
            </p>
            <div className="space-y-3">
              {[
                { label: '🚆 Took public transit instead of driving', icon: '🚆', carbon: 5, bg: 'bg-rose-500/10 hover:bg-rose-500/20', text: 'text-rose-400' },
                { label: '🚲 Cycled to work/school', icon: '🚲', carbon: 8, bg: 'bg-rose-500/10 hover:bg-rose-500/20', text: 'text-rose-400' },
                { label: '🥗 Ate a fully plant-based meal', icon: '🥗', carbon: 3, bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-400' },
                { label: '🥩 Skipped red meat for the day', icon: '🥩', carbon: 4, bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-400' },
                { label: '💡 Used cold water for laundry', icon: '💡', carbon: 2, bg: 'bg-amber-500/10 hover:bg-amber-500/20', text: 'text-amber-400' },
                { label: '🔌 Unplugged unused devices', icon: '🔌', carbon: 1, bg: 'bg-amber-500/10 hover:bg-amber-500/20', text: 'text-amber-400' },
              ].map(act => (
                <button 
                  key={act.label} 
                  onClick={() => handleLogAction(act.label, act.carbon)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border border-white/5 transition-all text-left ${act.bg}`}
                >
                  <span className="text-sm font-medium text-slate-200">{act.label}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md bg-white/5 ${act.text}`}>-{act.carbon} kg CO₂</span>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Recent Actions Log</h3>
            {sustainData.ecoActions && sustainData.ecoActions.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {sustainData.ecoActions.map((act, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm text-slate-200">{act.action}</p>
                      <p className="text-[10px] text-slate-500">{new Date(act.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">-{act.points} kg</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-slate-500 border border-dashed border-white/10 rounded-xl">
                No actions logged yet. Start reducing!
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-4">
          <GlassCard glow="glow-emerald">
            <h3 className="text-sm font-semibold mb-4">ESG & Green Investment Recommendations</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Based on your finance data, your Digital Twin suggests allocating a portion of your portfolio to sustainable, ESG-focused (Environmental, Social, and Governance) mutual funds.
            </p>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-emerald-300">SBI Magnum Equity ESG Fund</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">High Conviction</span>
                </div>
                <p className="text-xs text-slate-400">Invests in companies with strong ESG practices. Reduces portfolio carbon intensity while maintaining market-level returns.</p>
              </div>
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-blue-300">Quantum India ESG Equity</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Value Focused</span>
                </div>
                <p className="text-xs text-slate-400">Strict negative screening of fossil fuels, tobacco, and weapons. Good for pure sustainable exposure.</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">🤖 AI Analysis: Footprint Reduction</h3>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-slate-300 leading-relaxed space-y-4">
              <p>
                <strong className="text-rose-400">Transport:</strong> Currently your highest emission source at {Math.round(pieData[0].value)}kg CO2. Shifting just 2 commutes per week to public transit or cycling would reduce this by ~25% monthly.
              </p>
              <p>
                <strong className="text-amber-400">Energy:</strong> Your home energy footprint ({Math.round(pieData[1].value)}kg) suggests inefficient AC usage or appliances left on standby. Unplugging devices can save ~15kg CO2 and ₹400/month.
              </p>
              <p>
                <strong className="text-emerald-400">Food:</strong> Your diet accounts for {Math.round(pieData[2].value)}kg CO2. Substituting beef/mutton with poultry or plant-based proteins just twice a week makes a massive environmental impact.
              </p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
