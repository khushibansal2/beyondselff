import React, { useState } from 'react';
import { NeuralEngine } from '../engines/NeuralEngine';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader } from '../components/ui/Components';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const NeuralCore = () => {
  const state = useData();

  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const income = state?.finance?.income || 0;
  const healthScore = state?.computed?.healthScore?.score || 0;

  const careerHours =
    Number(state?.career?.studyHoursDaily || 0) +
    Number(state?.career?.codingHoursDaily || 0);

  const handleInference = async () => {
    setLoading(true);

    try {
      const engine = new NeuralEngine();
      const result = await engine.runInference(state || {});
      setTimeline(result);
    } catch (err) {
      console.error('AI Sync Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="p-8 text-cyan-900">
        INITIALIZING_CONTEXT...
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-cyan-400 font-mono">
      <PageHeader
        title="NEURAL CORE"
        subtitle="Synchronized Digital Twin"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <GlassCard className="p-6 border-cyan-500/20 bg-cyan-950/5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] mb-6 text-slate-500">
            Global State Tensors
          </h3>

          <div className="space-y-4 mb-10">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">FINANCE:</span>
              <span className="text-white">
                ₹{parseFloat(income).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">HEALTH:</span>
              <span className="text-white">{healthScore}%</span>
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">CAREER EFFORT:</span>
              <span className="text-white">{careerHours} hrs/day</span>
            </div>
          </div>

          <button
            onClick={handleInference}
            className="w-full bg-cyan-500 text-black py-4 font-black hover:brightness-125 transition-all"
          >
            {loading ? 'INFERENCING...' : 'GENERATE FUTURE PATH'}
          </button>
        </GlassCard>

        <GlassCard className="lg:col-span-3 h-[500px] p-6 bg-slate-900/20">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis dataKey="year" stroke="#475569" fontSize={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #164e63',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="stability"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fill="#06b6d4"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#ef4444"
                  fill="transparent"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-cyan-900 animate-pulse uppercase text-xs">
              [AWAITING GLOBAL STATE SYNC]
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default NeuralCore;