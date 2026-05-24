import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// Build 12 monthly data points: 6 past + current + 5 future
function buildChartData(lifeBalance, healthScore, financeScore, careerScore) {
  const now = new Date(2026, 4, 1); // May 2026 = index 6
  const data = [];

  for (let m = -6; m <= 5; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    const isPast = m < 0;
    const isNow  = m === 0;

    if (isPast) {
      // Historical: simulate a slight upward trend with noise
      const seed = Math.sin(m * 2.3) * 7 + Math.cos(m * 1.1) * 5;
      const hist = Math.max(22, Math.min(92, lifeBalance + m * 1.8 + seed));
      data.push({ label, actual: Math.round(hist), ghost: null, trajectory: null, isNow: false });
    } else if (isNow) {
      data.push({ label: 'NOW', actual: lifeBalance, ghost: lifeBalance, trajectory: lifeBalance, isNow: true });
    } else {
      // Ghost path: smooth ramp toward 90
      const ghost = Math.min(93, lifeBalance + (90 - lifeBalance) * (m / 6));
      // Trajectory: slight decline if habits don't change
      const slope = careerScore < 50 || healthScore < 50 ? -1.8 : 0.4;
      const traj = Math.max(12, lifeBalance + slope * m + Math.sin(m * 1.7) * 3);
      data.push({ label, actual: null, ghost: Math.round(ghost), trajectory: Math.round(traj), isNow: false });
    }
  }
  return data;
}

function buildMilestones(lifeBalance, healthScore, financeScore, careerScore, studyHours, savingsRate, burnoutRisk) {
  const ghostGap = Math.round(90 - lifeBalance);
  return [
    {
      month: 1,
      label: 'Jun 2026',
      ghost: `Ghost Twin will be ${ghostGap > 0 ? ghostGap + ' points ahead' : 'on track'} if you start today.`,
      you: `Your study pace: ${studyHours || 0}h/day vs Ghost's 4h/day target.`,
    },
    {
      month: 2,
      label: 'Jul 2026',
      ghost: `Burnout risk drops to ~${Math.max(10, burnoutRisk - 18)}% on Ghost path.`,
      you: `At current trend, burnout probability: ${Math.min(95, burnoutRisk + 12)}%.`,
    },
    {
      month: 3,
      label: 'Aug 2026',
      ghost: `Ghost Twin savings rate: 25%.`,
      you: `Your current savings rate: ${savingsRate}%. Gap: ${Math.max(0, 25 - savingsRate)}%.`,
    },
    {
      month: 4,
      label: 'Sep 2026',
      ghost: `Ghost Twin Health score: 85+, full sleep optimized.`,
      you: `Your health trajectory: ${healthScore < 55 ? 'declining without intervention.' : 'stable.'}`,
    },
    {
      month: 5,
      label: 'Oct 2026',
      ghost: `Ghost Twin is fully placement-ready. Finance secured.`,
      you: `You are ${Math.max(0, Math.round((4 - (studyHours || 0)) * 5))} weeks behind at current pace.`,
    },
  ];
}

const CustomTooltip = ({ active, payload, label, doomMode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-3 rounded-xl text-xs border backdrop-blur-xl ${doomMode ? 'bg-[#1a0808]/95 border-red-900/40' : 'bg-[#09090f]/95 border-white/10'}`}>
      <p className={`font-semibold mb-2 ${doomMode ? 'text-red-400' : 'text-white'}`}>{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-mono font-semibold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function GhostTimeline({ lifeBalance = 55, healthScore = 50, financeScore = 50, careerScore = 50, studyHours = 0, savingsRate = 0, burnoutRisk = 30, doomMode = false }) {
  const [sliderIdx, setSliderIdx] = useState(0);
  const data = useMemo(
    () => buildChartData(lifeBalance, healthScore, financeScore, careerScore),
    [lifeBalance, healthScore, financeScore, careerScore]
  );
  const milestones = useMemo(
    () => buildMilestones(lifeBalance, healthScore, financeScore, careerScore, studyHours, savingsRate, burnoutRisk),
    [lifeBalance, healthScore, financeScore, careerScore, studyHours, savingsRate, burnoutRisk]
  );
  const activeMilestone = milestones[sliderIdx];

  const gridColor = doomMode ? 'rgba(180,30,30,0.08)' : 'rgba(255,255,255,0.04)';
  const axisColor = doomMode ? '#7f1d1d' : '#334155';

  return (
    <div className={`glass-card p-5 rounded-2xl border ${doomMode ? 'border-red-900/20' : 'border-white/[0.06]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`}
              style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-base">👻</span>
            {doomMode ? 'TRAJECTORY FORECAST — DOOM VIEW' : 'Ghost Mode Timeline'}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Past 6 months · Today · Next 5 months projected</p>
        </div>
        <div className="flex gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full bg-blue-400" />
            <span className="text-slate-500">Ghost Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full bg-orange-400" style={{ borderTop: '2px dashed' }} />
            <span className="text-slate-500">Your Trajectory</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={doomMode ? '#7f1d1d' : '#6366f1'} stopOpacity={0.35} />
                <stop offset="95%" stopColor={doomMode ? '#7f1d1d' : '#6366f1'} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ghostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <CartesianGrid stroke={gridColor} strokeDasharray="3 0" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 9, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: axisColor, fontSize: 9 }}
              axisLine={false} tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />

            <Tooltip content={<CustomTooltip doomMode={doomMode} />} />

            {/* TODAY reference line */}
            <ReferenceLine
              x="NOW"
              stroke={doomMode ? '#ef4444' : '#6366f1'}
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: 'TODAY', position: 'top', fill: doomMode ? '#ef4444' : '#6366f1', fontSize: 8, fontFamily: 'var(--font-mono)' }}
            />

            {/* Actual historical area */}
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={doomMode ? '#9f1919' : '#6366f1'}
              fill="url(#actualGrad)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              filter="url(#glowLine)"
            />

            {/* Ghost path (ideal future) */}
            <Line
              type="monotone"
              dataKey="ghost"
              name="Ghost Path"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              filter="url(#glowLine)"
            />

            {/* Trajectory (current habits) */}
            <Line
              type="monotone"
              dataKey="trajectory"
              name="Your Trajectory"
              stroke={doomMode ? '#ef4444' : '#f97316'}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive slider */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 w-16 text-right">NOW</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min={0}
              max={milestones.length - 1}
              value={sliderIdx}
              onChange={e => setSliderIdx(Number(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${doomMode ? '#ef4444' : '#6366f1'} ${(sliderIdx / (milestones.length - 1)) * 100}%, rgba(255,255,255,0.08) ${(sliderIdx / (milestones.length - 1)) * 100}%)`,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-500 w-16">Oct 2026</span>
        </div>

        {/* Milestone text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={sliderIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`p-3 rounded-xl border text-xs ${doomMode ? 'bg-red-950/30 border-red-900/30' : 'bg-white/[0.02] border-white/[0.06]'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold ${doomMode ? 'bg-red-900/30 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {activeMilestone.label}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono text-[10px] flex-shrink-0 mt-0.5">👻 GHOST</span>
                  <span className="text-slate-300">{activeMilestone.ghost}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className={`font-mono text-[10px] flex-shrink-0 mt-0.5 ${doomMode ? 'text-red-400' : 'text-orange-400'}`}>⚡ YOU</span>
                  <span className="text-slate-400">{activeMilestone.you}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
