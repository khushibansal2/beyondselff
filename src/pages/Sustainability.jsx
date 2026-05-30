import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, showToast } from '../components/ui/Components';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, ReferenceLine, CartesianGrid } from 'recharts';
import { Info, Leaf, ChevronRight, Car, Zap, Utensils, Plus, ChevronDown } from 'lucide-react';

export default function Sustainability() {
  const { user } = useAuth();
  const { updateDomain } = useData();
  const [tab, setTab] = useState('dashboard');
  
  const sustainData = user?.sustainability || { carbonFootprint: { transport: 112, energy: 98, food: 70 }, ecoActions: [] };
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
    const updated = { ...sustainData };
    if (!updated.ecoActions) updated.ecoActions = [];
    updated.ecoActions.unshift({ action, points: carbonSaved, date: new Date().toISOString() });
    updateDomain('sustainability', updated);
    showToast(`Logged: "${action}". Saved ${carbonSaved}kg CO2!`, 'success');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Leaf size={16} /> },
    { id: 'actions', label: 'Eco-Actions', icon: <span className="text-[16px]">👤</span> },
    { id: 'recommendations', label: 'AI Green Tips', icon: <span className="text-[16px]">💡</span> },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#1e1e1e] border border-white/[0.08] p-3 rounded-xl text-xs shadow-xl">
          <p className="text-[#94a3b8] mb-1 font-medium">Day {label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color || p.stroke }} className="font-bold">{Math.round(p.value)} kg CO₂e</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container min-h-screen pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#f0f0f3] flex items-center gap-2 mb-1">
          🌿 Sustainability Tracking
        </h1>
        <p className="text-[14px] text-[#94a3b8]">
          Monitor your carbon footprint and log eco-friendly actions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-white/[0.05] mb-8 relative">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 pb-3 text-[14px] font-semibold transition-colors relative ${
              tab === t.id ? 'text-[#10b981]' : 'text-[#94a3b8] hover:text-[#f0f0f3]'
            }`}
          >
            {t.icon} {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10b981] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          
          {/* Top Cards Row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Monthly Footprint */}
            <GlassCard className="col-span-1 p-5 relative border-white/[0.05] !bg-[#161b22]">
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-[12px] text-[#94a3b8] flex items-center gap-1.5 font-medium">
                  Monthly Footprint <Info size={13} className="opacity-70" />
                </h3>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Leaf size={12} strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex items-center gap-5 mt-1">
                <div className="relative w-[86px] h-[86px] flex-shrink-0">
                  <svg width="86" height="86" viewBox="0 0 86 86" className="transform -rotate-90">
                    <circle cx="43" cy="43" r="37" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="43" cy="43" r="37" fill="none" stroke="#f43f5e" strokeWidth="8" strokeDasharray={2 * Math.PI * 37} strokeDashoffset={0} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
                    <span className="text-[26px] font-bold text-[#f43f5e] leading-none mb-1">{Math.round(totalCarbon)}</span>
                    <span className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-wider">KG CO₂e</span>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-[#94a3b8] mb-1">Target: {targetCarbon} kg</p>
                  <p className="text-[12px] font-bold text-[#f43f5e]">{overTarget > 0 ? `+${overTarget} kg` : '-'} over target</p>
                </div>
              </div>
            </GlassCard>

            {/* Transport */}
            <GlassCard className="col-span-1 p-5 flex items-center justify-between border-white/[0.05] cursor-pointer group !bg-[#161b22]">
              <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-rose-500 bg-rose-500/10 border border-rose-500/10">
                  <Car size={22} />
                </div>
                <div>
                  <h3 className="text-[12px] text-[#94a3b8] mb-1 font-medium">Transport</h3>
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[24px] font-bold text-[#f0f0f3] leading-none">100</span>
                    <span className="text-[13px] font-bold text-[#f0f0f3]">kg</span>
                  </div>
                  <div className="text-[11px] text-[#64748b] font-medium mt-0.5">CO₂e</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
            </GlassCard>

            {/* Home Energy */}
            <GlassCard className="col-span-1 p-5 flex items-center justify-between border-white/[0.05] cursor-pointer group !bg-[#161b22]">
              <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-amber-500 bg-amber-500/10 border border-amber-500/10">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="text-[12px] text-[#94a3b8] mb-1 font-medium">Home Energy</h3>
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[24px] font-bold text-[#f0f0f3] leading-none">100</span>
                    <span className="text-[13px] font-bold text-[#f0f0f3]">kg</span>
                  </div>
                  <div className="text-[11px] text-[#64748b] font-medium mt-0.5">CO₂e</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
            </GlassCard>

            {/* Food / Diet */}
            <GlassCard className="col-span-1 p-5 flex items-center justify-between border-white/[0.05] cursor-pointer group !bg-[#161b22]">
              <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center bg-emerald-500/10 border border-emerald-500/10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">
                    🥗
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] text-[#94a3b8] mb-1 font-medium">Food / Diet</h3>
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[24px] font-bold text-[#f0f0f3] leading-none">80</span>
                    <span className="text-[13px] font-bold text-[#f0f0f3]">kg</span>
                  </div>
                  <div className="text-[11px] text-[#64748b] font-medium mt-0.5">CO₂e</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
            </GlassCard>
          </div>

          {/* Middle Charts Row - Taller Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Breakdown Pie Chart */}
            <GlassCard className="p-7 border-white/[0.05] !bg-[#161b22] flex flex-col justify-between min-h-[380px]">
              <h3 className="text-[14px] font-semibold text-[#f0f0f3] mb-6">Carbon Footprint Breakdown</h3>
              <div className="flex items-center justify-between px-2 flex-1">
                <div className="relative w-56 h-56 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                     <span className="text-[32px] font-bold text-[#f0f0f3] leading-none mb-1">{Math.round(totalCarbon)}</span>
                     <span className="text-[12px] text-[#94a3b8] font-medium">Total</span>
                  </div>
                </div>
                
                <div className="flex-1 ml-10 space-y-6">
                  {pieData.map((p, i) => {
                    const pct = Math.round((p.value/totalCarbon)*100);
                    return (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ background: p.color }}></span>
                          <span className="text-[14px] text-[#94a3b8] font-medium">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-[14px] text-[#94a3b8] w-8 text-right font-medium">{pct}%</span>
                          <span className="text-[14px] text-[#f0f0f3] w-12 text-right font-medium">{Math.round(p.value)} kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[14px] text-[#94a3b8] font-medium">Total Carbon Footprint</span>
                <span className="text-[14px] font-bold text-[#f0f0f3]">{Math.round(totalCarbon)} kg CO₂e</span>
              </div>
            </GlassCard>

            {/* Trend Line Chart */}
            <GlassCard className="p-7 flex flex-col border-white/[0.05] !bg-[#161b22] min-h-[380px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[14px] font-semibold text-[#f0f0f3]">30-Day Carbon Trend</h3>
                <div className="bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/[0.08]">
                  <span className="text-[11px] font-medium text-[#94a3b8]">kg CO₂e</span>
                  <ChevronDown size={14} className="text-[#94a3b8]" />
                </div>
              </div>
              <div className="flex-1 min-h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 400]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={targetCarbon} stroke="#64748b" strokeDasharray="4 4" 
                      label={{ position: 'right', value: `Target: ${targetCarbon} kg`, fill: '#64748b', fontSize: 10, offset: -80 }} />
                    <Area type="monotone" dataKey="carbon" stroke="#10b981" fill="url(#trendGradient)" strokeWidth={2} activeDot={{ r: 4 }} dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Insights Section - Separated GlassCards instead of one big wrapper */}
          <div className="mt-6">
            <h3 className="text-[15px] font-semibold text-[#f0f0f3] flex items-center gap-2 mb-4">
              <span className="text-emerald-500"><Leaf size={18} /></span> Insights & Recommendations
            </h3>
            <div className="grid grid-cols-3 gap-4">
              
              <GlassCard className="p-6 border-white/[0.04] !bg-[#141b18] flex items-center justify-between cursor-pointer group hover:bg-[#18211d] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Leaf size={22} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-emerald-400 mb-1">Great! You're making progress.</h4>
                    <p className="text-[11px] text-[#94a3b8] leading-tight">Your footprint is 18% lower<br/>than last month.</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
              </GlassCard>

              <GlassCard className="p-6 border-white/[0.04] !bg-[#1a1811] flex items-center justify-between cursor-pointer group hover:bg-[#201d14] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Zap size={22} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-amber-400 mb-1">Reduce energy usage</h4>
                    <p className="text-[11px] text-[#94a3b8] leading-tight">Switch to LED lights and<br/>unplug idle devices.</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
              </GlassCard>

              <GlassCard className="p-6 border-white/[0.04] !bg-[#141b18] flex items-center justify-between cursor-pointer group hover:bg-[#18211d] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Utensils size={22} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-emerald-400 mb-1">Eat more plant-based</h4>
                    <p className="text-[11px] text-[#94a3b8] leading-tight">Try 3 more plant-based meals<br/>this week.</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#64748b] group-hover:text-[#f0f0f3] transition-colors" />
              </GlassCard>

            </div>
          </div>

        </motion.div>
      )}
      
      {/* FAB - Log Eco-Action */}
      <div className="fixed bottom-8 right-8 flex flex-col items-center z-50">
        <button className="w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white transition-all transform hover:scale-105">
          <Plus size={28} />
        </button>
        <span className="text-[11px] font-medium text-[#94a3b8] mt-2 tracking-wide">Log Eco-Action</span>
      </div>
      
    </div>
  );
}
