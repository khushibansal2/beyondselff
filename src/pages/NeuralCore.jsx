import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { NeuralEngine } from '../engines/NeuralEngine';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, ScoreRing, showToast } from '../components/ui/Components';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong p-3 rounded-xl text-xs space-y-1">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

export default function NeuralCore() {
  const state = useData();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const hs = state?.computed?.healthScore?.score  ?? 0;
  const fs = state?.computed?.financeScore?.score ?? 0;
  const cs = state?.computed?.careerScore?.score  ?? 0;
  const burnout = state?.computed?.burnout?.risk  ?? 0;
  const income = state?.finance?.income || 0;
  const study  = parseFloat(state?.career?.studyHoursDaily  || 0);
  const coding = parseFloat(state?.career?.codingHoursDaily || 0);

  const endStability = timeline.length > 0 ? timeline[timeline.length - 1].stability : null;
  const endRisk      = timeline.length > 0 ? timeline[timeline.length - 1].risk      : null;
  const trajectory   = endStability !== null ? (endStability > 65 ? 'positive' : endStability > 40 ? 'neutral' : 'critical') : null;

  const handleInference = async () => {
    setLoading(true);
    try {
      const engine = new NeuralEngine();
      const result = await engine.runInference(state || {});
      setTimeline(result);
      showToast('20-year trajectory computed', 'success');
    } catch (err) {
      console.error('Trajectory error:', err);
      showToast('Computation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputs = [
    { label: 'Health Score',    value: `${hs}/100`,             color: '#10b981' },
    { label: 'Finance Score',   value: `${fs}/100`,             color: '#f59e0b' },
    { label: 'Career Score',    value: `${cs}/100`,             color: '#6366f1' },
    { label: 'Burnout Risk',    value: `${burnout}%`,           color: burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981' },
    { label: 'Monthly Income',  value: `₹${income.toLocaleString()}`, color: '#06b6d4' },
    { label: 'Daily Effort',    value: `${study + coding}h`,    color: '#8b5cf6' },
  ];

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader
        title="Neural Core"
        subtitle="Deterministic 20-year life trajectory projection based on your current data."
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
        </div>

        {/* Main chart */}
        <GlassCard className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              20-Year Life Trajectory
            </h3>
            {timeline.length > 0 && (
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Stability</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block border-dashed" /> Risk</span>
              </div>
            )}
          </div>

          <div className="h-[420px]">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stabG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="riskG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="year" stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="stability" stroke="#06b6d4" strokeWidth={2.5} fill="url(#stabG)" name="Stability" />
                  <Area type="monotone" dataKey="risk"      stroke="#ef4444" strokeWidth={1.5} fill="url(#riskG)" strokeDasharray="5 3" name="Risk" />
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
        </GlassCard>
      </div>

      {timeline.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { label: '5-Year Stability',  value: `${timeline[4]?.stability}%`,  color: '#06b6d4', desc: 'Near-term trajectory' },
            { label: '10-Year Stability', value: `${timeline[9]?.stability}%`,  color: '#8b5cf6', desc: 'Mid-term projection'  },
            { label: '20-Year Stability', value: `${timeline[19]?.stability}%`, color: '#10b981', desc: 'Long-term outlook'    },
          ].map(({ label, value, color, desc }) => (
            <GlassCard key={label} className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{label}</p>
              <p className="text-3xl font-bold mb-1" style={{ color, fontFamily: 'var(--font-display)' }}>{value}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </GlassCard>
          ))}
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
            <p className="font-semibold text-white mb-1">What To Do</p>
            <p>Use the Simulator to test "what if" scenarios. Improve your weakest domain first — the cross-domain cascade effects amplify improvements across all scores.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
