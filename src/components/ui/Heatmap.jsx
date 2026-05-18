import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LifeStressHeatmap({ trendData }) {
  const [activeLayer, setActiveLayer] = useState('stress');

  // We expect trendData to have 30 days. Let's slice the last 30 if there are more.
  const days = trendData.slice(-30);

  const layers = [
    { id: 'stress', label: 'Stress Level', icon: '😰', color: 'red' },
    { id: 'sleep', label: 'Sleep Quality', icon: '😴', color: 'purple' },
    { id: 'spending', label: 'Spending', icon: '💸', color: 'amber' },
    { id: 'productivity', label: 'Productivity', icon: '⚡', color: 'blue' },
  ];

  // Helper to get color intensity based on value relative to min/max
  const getColorIntensity = (value, min, max, colorPrefix) => {
    if (value === undefined || value === null) return 'bg-white/5';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    
    // 5 buckets of intensity
    const bucket = Math.ceil(ratio * 4); // 0 to 4
    
    if (bucket === 0) return `bg-${colorPrefix}-500/10 border-${colorPrefix}-500/20`;
    if (bucket === 1) return `bg-${colorPrefix}-500/30 border-${colorPrefix}-500/40`;
    if (bucket === 2) return `bg-${colorPrefix}-500/50 border-${colorPrefix}-500/60`;
    if (bucket === 3) return `bg-${colorPrefix}-500/70 border-${colorPrefix}-500/80`;
    return `bg-${colorPrefix}-500 border-${colorPrefix}-400`;
  };

  const getStats = (layerId) => {
    const values = days.map(d => d[layerId]).filter(v => v !== undefined);
    if (!values.length) return { min: 0, max: 1 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  };

  const stats = getStats(activeLayer);
  const activeLayerConfig = layers.find(l => l.id === activeLayer);

  // Generate the correlation insight text
  const generateCorrelationText = () => {
    // Simple mock behavioral correlation logic
    if (activeLayer === 'stress') {
      const highStressDays = days.filter(d => d.stress > stats.avg);
      const avgSpendHighStress = highStressDays.length ? highStressDays.reduce((a, b) => a + b.spending, 0) / highStressDays.length : 0;
      const allAvgSpend = getStats('spending').avg;
      if (avgSpendHighStress > allAvgSpend * 1.1) {
        return `On high-stress days, your spending is ₹${Math.round(avgSpendHighStress)} — ${((avgSpendHighStress/allAvgSpend)).toFixed(1)}x your normal average.`;
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

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-lg">🗺️</span> Life Stress Heatmap
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Visualize behavioral correlations over 30 days</p>
        </div>
        
        {/* Layer Toggles */}
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 overflow-x-auto max-w-full">
          {layers.map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                activeLayer === layer.id 
                  ? `bg-${layer.color}-500/20 text-${layer.color}-300 font-bold border border-${layer.color}-500/30` 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span>{layer.icon}</span> {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 md:grid-cols-10 gap-2 mb-4">
        {days.map((day, i) => {
          const val = day[activeLayer];
          const colorClass = getColorIntensity(val, stats.min, stats.max, activeLayerConfig.color);
          
          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`aspect-square rounded-md border flex items-center justify-center relative group cursor-pointer transition-colors ${colorClass}`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 rounded-lg bg-slate-900 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
                <p className="text-[9px] text-slate-400 mb-1">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</p>
                <div className="space-y-1">
                  <p className={`text-[10px] font-bold ${activeLayer === 'stress' ? 'text-red-400' : 'text-slate-300'}`}>Stress: {day.stress?.toFixed(1)}/10</p>
                  <p className={`text-[10px] font-bold ${activeLayer === 'sleep' ? 'text-purple-400' : 'text-slate-300'}`}>Sleep: {day.sleep?.toFixed(1)}h</p>
                  <p className={`text-[10px] font-bold ${activeLayer === 'spending' ? 'text-amber-400' : 'text-slate-300'}`}>Spent: ₹{Math.round(day.spending || 0)}</p>
                  <p className={`text-[10px] font-bold ${activeLayer === 'productivity' ? 'text-blue-400' : 'text-slate-300'}`}>Productivity: {day.productivity?.toFixed(1)}/10</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend & Insight */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-3 h-3 rounded-sm border ${getColorIntensity(stats.min + (stats.max - stats.min) * (i / 4), stats.min, stats.max, activeLayerConfig.color)}`} />
            ))}
          </div>
          <span className="text-[10px] text-slate-500">More</span>
        </div>
        
        <div className="flex items-start gap-2 flex-1 md:justify-end text-right">
          <span className="text-sm">💡</span>
          <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-sm text-left md:text-right">
            {generateCorrelationText()}
          </p>
        </div>
      </div>
    </div>
  );
}
