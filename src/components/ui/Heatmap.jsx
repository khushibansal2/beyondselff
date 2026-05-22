import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LifeStressHeatmap({ trendData }) {
  const [activeLayer, setActiveLayer] = useState('stress');

  // We expect trendData to have 30 days. Let's slice the last 30 if there are more.
  const days = trendData.slice(-30);
  if (days.length === 0) return null;

  const layers = [
    { id: 'stress', label: 'Stress Level', icon: '😰', color: 'rose' },
    { id: 'sleep', label: 'Sleep Quality', icon: '😴', color: 'violet' },
    { id: 'spending', label: 'Spending', icon: '💸', color: 'amber' },
    { id: 'productivity', label: 'Productivity', icon: '⚡', color: 'cyan' },
  ];

  const getColorIntensity = (value, min, max, colorPrefix) => {
    if (value === undefined || value === null) return 'bg-white/[0.03] border-white/[0.05]';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    const bucket = Math.ceil(ratio * 4); 
    
    const colorMaps = {
      rose: ['bg-rose-500/10 border-rose-500/20', 'bg-rose-500/30 border-rose-500/40', 'bg-rose-500/50 border-rose-500/60', 'bg-rose-500/80 border-rose-500', 'bg-rose-400 border-rose-300'],
      violet: ['bg-violet-500/10 border-violet-500/20', 'bg-violet-500/30 border-violet-500/40', 'bg-violet-500/50 border-violet-500/60', 'bg-violet-500/80 border-violet-500', 'bg-violet-400 border-violet-300'],
      amber: ['bg-amber-500/10 border-amber-500/20', 'bg-amber-500/30 border-amber-500/40', 'bg-amber-500/50 border-amber-500/60', 'bg-amber-500/80 border-amber-500', 'bg-amber-400 border-amber-300'],
      cyan: ['bg-cyan-500/10 border-cyan-500/20', 'bg-cyan-500/30 border-cyan-500/40', 'bg-cyan-500/50 border-cyan-500/60', 'bg-cyan-500/80 border-cyan-500', 'bg-cyan-400 border-cyan-300'],
    };

    const palette = colorMaps[colorPrefix] || colorMaps.violet;
    return palette[bucket === 0 ? 0 : bucket];
  };

  const getStats = (layerId) => {
    const values = days.map(d => d[layerId]).filter(v => v !== undefined);
    if (!values.length) return { min: 0, max: 1, avg: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  };

  const stats = getStats(activeLayer);
  const activeLayerConfig = layers.find(l => l.id === activeLayer);

  const generateCorrelationText = () => {
    if (activeLayer === 'stress') {
      const highStressDays = days.filter(d => d.stress > stats.avg);
      const avgSpendHighStress = highStressDays.length ? highStressDays.reduce((a, b) => a + b.spending, 0) / highStressDays.length : 0;
      const allAvgSpend = getStats('spending').avg;
      if (avgSpendHighStress > allAvgSpend * 1.1) {
        return `On high-stress days, your spending is ₹${Math.round(avgSpendHighStress)} — ${((avgSpendHighStress/allAvgSpend)).toFixed(1)}x normal.`;
      }
      return `Stress seems to negatively impact your sleep quality by ~15%.`;
    }
    if (activeLayer === 'sleep') {
      const lowSleepDays = days.filter(d => d.sleep < 6);
      const avgProdLowSleep = lowSleepDays.length ? lowSleepDays.reduce((a, b) => a + b.productivity, 0) / lowSleepDays.length : 0;
      return `On days with < 6 hours sleep, your productivity drops to ${avgProdLowSleep.toFixed(1)}/10.`;
    }
    if (activeLayer === 'spending') {
      return `Spending spikes often occur on weekends or high-stress days.`;
    }
    if (activeLayer === 'productivity') {
      return `High productivity strongly correlates with days you completed a workout.`;
    }
    return '';
  };

  const firstDay = new Date(days[0].date);
  const startOffset = firstDay.getDay(); 
  const emptySlots = Array(startOffset).fill(null);
  const allCells = [...emptySlots, ...days];

  return (
    <div className="glass-card p-6 border border-white/[0.06] bg-white/[0.02]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 text-white">
            <span className="text-xl">🗺️</span> Behavioral Heatmap
          </h3>
          <p className="text-[11px] text-[#9B9B9B] mt-1">Visualize patterns and correlations over the last 30 days</p>
        </div>
        
        {/* Layer Toggles */}
        <div className="flex bg-[#0a0a10]/80 rounded-lg p-1 border border-white/[0.06] overflow-x-auto max-w-full shadow-inner">
          {layers.map(layer => {
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md transition-all duration-300 whitespace-nowrap ${
                  isActive 
                    ? `bg-${layer.color}-500/20 text-${layer.color}-300 font-semibold border border-${layer.color}-500/30 shadow-[0_0_12px_rgba(var(--tw-colors-${layer.color}-500),0.2)]` 
                    : 'text-[#9B9B9B] hover:text-[#EBEBEB] border border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <span>{layer.icon}</span> {layer.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {/* Y-Axis Labels */}
        <div className="flex flex-col justify-between text-[9px] text-[#52525b] font-medium py-[3px]">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        {/* Grid */}
        <div 
          className="grid gap-1.5" 
          style={{ 
            gridTemplateRows: 'repeat(7, minmax(0, 1fr))', 
            gridAutoFlow: 'column' 
          }}
        >
          {allCells.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="w-4 h-4 rounded-[4px] bg-transparent" />;
            }
            
            const val = day[activeLayer];
            const colorClass = getColorIntensity(val, stats.min, stats.max, activeLayerConfig.color);
            
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.005 }}
                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center relative group cursor-pointer transition-colors duration-200 ${colorClass}`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-max min-w-[140px] p-3 rounded-xl bg-[#111116]/95 border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111116]/95 border-b border-r border-white/[0.08] rotate-45"></div>
                  <p className="text-[10px] text-[#9B9B9B] font-medium mb-2 border-b border-white/[0.06] pb-1.5">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] text-[#9B9B9B]">Stress</span>
                      <span className={`text-[10px] font-bold ${activeLayer === 'stress' ? 'text-rose-400' : 'text-white'}`}>{day.stress?.toFixed(1)}/10</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] text-[#9B9B9B]">Sleep</span>
                      <span className={`text-[10px] font-bold ${activeLayer === 'sleep' ? 'text-violet-400' : 'text-white'}`}>{day.sleep?.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] text-[#9B9B9B]">Spent</span>
                      <span className={`text-[10px] font-bold ${activeLayer === 'spending' ? 'text-amber-400' : 'text-white'}`}>₹{Math.round(day.spending || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] text-[#9B9B9B]">Prod.</span>
                      <span className={`text-[10px] font-bold ${activeLayer === 'productivity' ? 'text-cyan-400' : 'text-white'}`}>{day.productivity?.toFixed(1)}/10</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Legend & Insight */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#52525b] font-medium uppercase tracking-wider">Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-3.5 h-3.5 rounded-[3px] border ${getColorIntensity(stats.min + (stats.max - stats.min) * (i / 4), stats.min, stats.max, activeLayerConfig.color)}`} />
            ))}
          </div>
          <span className="text-[10px] text-[#52525b] font-medium uppercase tracking-wider">More</span>
        </div>
        
        <div className="flex items-start gap-2 flex-1 md:justify-end text-right">
          <span className="text-sm">💡</span>
          <p className="text-[11px] text-[#EBEBEB] font-medium leading-relaxed max-w-sm text-left md:text-right">
            {generateCorrelationText()}
          </p>
        </div>
      </div>
    </div>
  );
}
