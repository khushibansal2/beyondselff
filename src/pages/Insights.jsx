import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateInsights, generateTrendData, generateCorrelations } from '../data/demoData';
import { GlassCard, PageHeader, InsightCard, ScoreRing, showToast } from '../components/ui/Components';
import AIExplainer from '../components/ui/AIExplainer';
import { TrendCard, ForecastRow } from '../components/ui/TrendComponents';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine, LineChart, Line, YAxis, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { PROVIDERS } from '../services/integrationService';

// Simple Calendar Heatmap Component
function ActivityHeatmap({ data, colorMap, title }) {
  // data: array of { date, value }
  return (
    <div className="p-3 rounded-xl border border-white/5 bg-black/10">
      <h4 className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">{title}</h4>
      <div className="flex flex-wrap gap-1">
        {data.slice(-30).map((d, i) => {
          let opacity = Math.min(1, Math.max(0.1, d.value / (colorMap.max || 10)));
          return (
            <div 
              key={i} 
              title={`${d.date}: ${d.value}`}
              className="w-3 h-3 rounded-[2px]" 
              style={{ backgroundColor: colorMap.color, opacity: d.value > 0 ? opacity : 0.05 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-[8px] text-slate-600">30 Days Ago</span>
        <span className="text-[8px] text-slate-600">Today</span>
      </div>
    </div>
  );
}

const severityConfig = {
  urgent: { border: 'border-red-500/30', bg: 'bg-red-500/5', badge: 'bg-red-500/15 text-red-300', pulse: 'bg-red-400', label: '🚨 Urgent Pattern' },
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', badge: 'bg-red-500/15 text-red-300', pulse: 'bg-red-400', label: '🚨 Critical Pattern' },
  alert: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', badge: 'bg-orange-500/15 text-orange-300', pulse: 'bg-orange-400', label: '⚠️ Alert' },
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-300', pulse: 'bg-amber-400', label: '⚠️ Warning Pattern' },
  attention: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', badge: 'bg-yellow-500/15 text-yellow-300', pulse: 'bg-yellow-400', label: '🟡 Attention Needed' },
  watch: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', badge: 'bg-blue-500/15 text-blue-300', pulse: 'bg-blue-400', label: '👁️ Monitoring' },
  positive: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-300', pulse: 'bg-emerald-400', label: '✅ Positive Pattern' },
};

function PatternCard({ pattern, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = severityConfig[pattern.severity] || severityConfig.warning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}
    >
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0 mt-0.5">
              <span className="text-2xl">{pattern.icon || '⚡'}</span>
              {['critical', 'urgent', 'alert'].includes(pattern.severity) && (
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${cfg.pulse} animate-pulse`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                <span className="text-[10px] text-slate-600">🕐 {pattern.period || 'Recent Activity'}</span>
                <span className="text-[10px] text-slate-600">{pattern.confidence || 100}% confidence</span>
              </div>
              <h3 className="text-sm font-semibold text-white">{pattern.title}</h3>
            </div>
          </div>
          <span className="text-slate-500 text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="px-5 pb-5 space-y-4">
              {/* Description */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  <span className="font-semibold text-white block mb-1">Trigger: {pattern.trigger}</span>
                  {pattern.description || pattern.effect}
                </p>
                <p className="text-xs text-slate-500 italic border-t border-white/[0.05] pt-2 mt-2">
                  Mechanism: {pattern.mechanism}
                </p>
              </div>

              {/* Explainable AI (Step 2.2 Integration) */}
              <AIExplainer insightData={pattern} />

              {/* Domain Tags */}
              <div className="flex items-center gap-2 pt-2 mt-1">
                <span className="text-[10px] text-slate-600">Domains affected:</span>
                {pattern.domains?.map(d => (
                  <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 capitalize">{d}</span>
                ))}
                <Link to="/coach" className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                  Ask AI Coach →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Insights() {
  const { user } = useAuth();
  const { computed, health, finance, career, anomalies = [], integrations } = useData();

  const h = health || {};
  const f = finance || {};
  const c = career || {};

  const healthScore = computed?.healthScore?.score || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore = computed?.careerScore?.score || 0;
  const balance = computed?.balance || 0;
  const burnout = computed?.burnout?.risk || 0;
  const trendReport = computed?.trendReport || null;
  const goalIntelligence = computed?.goalIntelligence || null;

  // Use deterministic cross-domain engine patterns directly (Step 2.3 & 2.5)
  const patterns = useMemo(() => {
    const cdPatterns = (computed?.crossDomain || []).map(cd => ({
      ...cd,
      title: cd.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Cascade',
      icon: cd.severity === 'positive' ? '✅' : cd.severity === 'critical' ? '🚨' : '⚡',
      description: cd.effect,
      domains: [cd.from, cd.to],
      confidence: 100 // Deterministically computed
    }));

    const anomalyPatterns = anomalies.map(a => ({
      id: a.id,
      severity: a.severity,
      title: `${a.status === 'monitoring' ? '[Monitoring] ' : ''}Anomaly: ${a.title}`,
      icon: a.trend === 'up' ? '📈' : '📉',
      description: a.description,
      trigger: a.triggerReason,
      mechanism: `Baseline was ${a.baseline}, now ${a.current}. ${a.recommendedAction}`,
      domains: [a.affectedDomain],
      confidence: 100
    }));

    return [...anomalyPatterns, ...cdPatterns];
  }, [computed?.crossDomain, anomalies]);

  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline: computed?.timeline || [] }), [user, h, f, c, computed?.timeline]);

  const insights = useMemo(() => generateInsights(currentState), [currentState]);
  const trendData = useMemo(() => generateTrendData(currentState, 14), [currentState]);
  const behavioralAnalytics = computed?.behavioralAnalytics;
  const correlations = behavioralAnalytics?.correlations || [];

  const criticalCount = patterns.filter(p => p.severity === 'critical').length;
  const warningCount = patterns.filter(p => p.severity === 'warning').length;
  const positiveCount = patterns.filter(p => p.severity === 'positive').length;

  const happinessScore = Math.round(((h.moodAvg || 5) / 10 * 40) + ((10 - (h.stressLevel || 5)) / 10 * 30) + ((h.sleepAvg || 7) / 8 * 30));
  const successScore = Math.round(careerScore * 0.4 + financeScore * 0.3 + (healthScore > 60 ? 30 : 15));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="glass-strong p-3 rounded-xl text-xs">
          <p className="text-slate-400 mb-1">{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed?.(1)}</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Cross-Domain Intelligence" subtitle="AI-explained patterns across your health, finances, and career." icon="🧠" />

      {/* ── NEW: Connected Intelligence Section ── */}
      {integrations && Object.keys(integrations).some(k => integrations[k].connected) && (
        <div className="mb-6">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            🌐 Connected Intelligence
            <span className="text-[10px] font-normal text-slate-500">Real-World Ingestion</span>
          </h2>
          <div className="grid lg:grid-cols-3 gap-4">
            {Object.keys(integrations).filter(k => integrations[k].connected).map(k => {
              const p = PROVIDERS[Object.keys(PROVIDERS).find(pk => PROVIDERS[pk].id === k)];
              const status = integrations[k];
              const isStale = Date.now() - status.lastSync > 86400000;
              return (
                <GlassCard key={k} className="flex flex-col gap-3 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[4rem] transition-all duration-500 opacity-20 ${isStale ? 'bg-amber-500 group-hover:opacity-40' : 'bg-emerald-500 group-hover:opacity-40'}`}></div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{p?.icon}</span>
                    <div>
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">{p?.name}</h3>
                      <p className="text-[10px] text-slate-500 capitalize">{p?.category} Sync</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Sync Status:</span>
                      {status.syncing ? (
                        <span className="text-blue-400 animate-pulse">Syncing...</span>
                      ) : status.error ? (
                        <span className="text-red-400" title={status.error}>Error</span>
                      ) : (
                        <span className={isStale ? 'text-amber-400' : 'text-emerald-400'}>{isStale ? 'Stale' : 'Live'}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Last Synced:</span>
                      <span className="text-slate-300">{status.lastSync ? new Date(status.lastSync).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {p?.category === 'health' ? 'Powering burnout timelines & recovery momentum.' : p?.category === 'finance' ? 'Feeding volatility analysis & behavioral heatmaps.' : 'Driving career velocity & goal trajectories.'}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* 14-Day Pattern Report Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-5 rounded-2xl border border-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.05) 100%)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wider">Deterministic AI Analysis</span>
            </div>
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {patterns.length} Pattern{patterns.length !== 1 ? 's' : ''} Detected in Your Data
            </h2>
          </div>
          <div className="flex gap-3">
            {criticalCount > 0 && <div className="text-center"><p className="text-lg font-bold text-red-400">{criticalCount}</p><p className="text-[9px] text-slate-500">Critical</p></div>}
            {warningCount > 0 && <div className="text-center"><p className="text-lg font-bold text-amber-400">{warningCount}</p><p className="text-[9px] text-slate-500">Warnings</p></div>}
            {positiveCount > 0 && <div className="text-center"><p className="text-lg font-bold text-emerald-400">{positiveCount}</p><p className="text-[9px] text-slate-500">Positive</p></div>}
          </div>
        </div>

        {/* Mini Trend Chart */}
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="sleepG14" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stressG14" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={7} stroke="#8b5cf6" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: 'Target sleep', fill: '#8b5cf6', fontSize: 9 }} />
              <Area type="monotone" dataKey="sleep" stroke="#8b5cf6" fill="url(#sleepG14)" strokeWidth={2} name="Sleep" />
              <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#stressG14)" strokeWidth={1.5} name="Stress" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-1">Purple = sleep hours • Red = stress level • Dashed = 7h target</p>
      </motion.div>

      {/* Pattern Cards (Explainable AI) */}
      <div className="space-y-4 mb-8">
        {patterns.length === 0 ? (
          <GlassCard className="text-center py-10">
            <span className="text-4xl block mb-3">✨</span>
            <p className="font-semibold mb-1">No Cross-Domain Cascades Detected</p>
            <p className="text-xs text-slate-500">Your data looks balanced across all domains. Keep it up!</p>
          </GlassCard>
        ) : (
          patterns.map((p, i) => <PatternCard key={p.id} pattern={p} index={i} />)
        )}
      </div>

      {/* ── Goal Intelligence Section ── */}
      {goalIntelligence && goalIntelligence.goals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              🎯 Goal Intelligence
              <span className="text-[10px] font-normal text-slate-500">Predictive analysis based on real trends</span>
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-4">
            {goalIntelligence.goals.map(g => (
              <GlassCard key={g.id} className={`border-t-2 ${g.statusColor === 'emerald' ? 'border-t-emerald-500' : g.statusColor === 'red' ? 'border-t-red-500' : g.statusColor === 'blue' ? 'border-t-blue-500' : 'border-t-amber-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{g.title}</h3>
                    <p className="text-[10px] text-slate-400 capitalize">{g.domain} Domain</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${g.statusColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : g.statusColor === 'red' ? 'bg-red-500/10 text-red-400' : g.statusColor === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {g.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-medium">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${g.statusColor === 'emerald' ? 'bg-emerald-400' : g.statusColor === 'red' ? 'bg-red-400' : g.statusColor === 'blue' ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${g.progress}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-slate-500 mb-1">Success Probability</p>
                    <p className={`text-lg font-bold ${g.probabilityOfSuccess >= 70 ? 'text-emerald-400' : g.probabilityOfSuccess < 40 ? 'text-red-400' : 'text-amber-400'}`}>
                      {g.probabilityOfSuccess}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] text-slate-500 mb-1">Estimated Completion</p>
                    <p className="text-sm font-bold text-slate-200">
                      {g.etaText}
                    </p>
                  </div>
                </div>

                {g.risks && g.risks.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Risks</p>
                    {g.risks.map((r, i) => (
                      <div key={i} className="flex gap-2 text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                        <span className="flex-shrink-0">⚠️</span>
                        <span>{r.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {g.suggestions && g.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Adaptive Recommendations</p>
                    {g.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-2 text-xs p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        <span className="flex-shrink-0">💡</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {g.simulatorImpact && (
                   <div className="mt-3 flex gap-2 text-xs p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      <span className="flex-shrink-0">🔮</span>
                      <span>{g.simulatorImpact}</span>
                   </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Behavioral Trend Intelligence Section ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            📈 Behavioral Trend Intelligence
            <span className="text-[10px] font-normal text-slate-500">Deterministic · Based on your log history</span>
          </h2>
        </div>

        {!trendReport || !trendReport.hasTrends ? (
          <GlassCard className="text-center py-8">
            <span className="text-3xl block mb-2">📊</span>
            <p className="font-semibold mb-1">Building Your Trend Baseline</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {trendReport?.sparseData
                ? 'Keep logging your health, finance, and career data. Trends become reliable after 3+ entries per domain.'
                : 'Log data across domains to start seeing behavioral trends.'}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {/* Burnout cross-domain trend — highlighted at top */}
            {trendReport.burnoutTrend && (
              <TrendCard trend={trendReport.burnoutTrend} index={0} />
            )}

            {/* Forecast summary signals */}
            {trendReport.forecastSummary?.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">🔮 Forecast Signals</h3>
                <div className="space-y-2">
                  {trendReport.forecastSummary.map((f, i) => <ForecastRow key={i} forecast={f} index={i} />)}
                </div>
              </div>
            )}

            {/* Individual metric trend cards */}
            <div className="grid md:grid-cols-2 gap-3">
              {trendReport.trends
                .filter(t => t.trendType !== 'stable' && t.trendType !== 'insufficient_data')
                .map((t, i) => <TrendCard key={t.id} trend={t} index={i} />)}
            </div>

            {/* Stable/monitoring metrics — collapsed table */}
            {trendReport.trends.filter(t => t.trendType === 'stable' || t.trendType === 'plateau').length > 0 && (
              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                <h3 className="text-xs font-semibold text-slate-500 mb-2">Stable Metrics</h3>
                <div className="flex flex-wrap gap-2">
                  {trendReport.trends
                    .filter(t => t.trendType === 'stable' || t.trendType === 'plateau')
                    .map(t => (
                      <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400 border border-white/5">
                        {t.icon} {t.label} ({t.trendType})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scores + Burnout */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="flex flex-col items-center gap-3" glow="glow-purple">
          <ScoreRing score={balance} color="auto" label="Life Balance" size={100} strokeWidth={7} />
          <p className="text-xs text-slate-400 text-center">{balance >= 75 ? 'Excellent balance' : balance >= 50 ? 'Needs attention in weak areas' : 'Significant imbalance detected'}</p>
        </GlassCard>
        <GlassCard className={`flex flex-col items-center gap-3 ${burnout > 60 ? 'glow-rose' : ''}`}>
          <ScoreRing score={burnout} color={burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981'} label="Burnout Risk" size={100} strokeWidth={7} />
          <p className="text-xs text-slate-400 text-center">{burnout > 60 ? '🚨 Immediate action required' : burnout > 30 ? '⚠️ Monitor and prevent' : '✅ Sustainable pace'}</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            <ScoreRing score={happinessScore} color="#f59e0b" label="Happiness" size={80} strokeWidth={6} />
            <ScoreRing score={successScore} color="#3b82f6" label="Success" size={80} strokeWidth={6} />
          </div>
          <p className="text-xs text-slate-400 text-center">{successScore > happinessScore + 20 ? '⚠️ Success outpacing happiness' : '✅ Happiness and success aligned'}</p>
        </GlassCard>
      </div>

      {/* AI Insights + Correlations */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            🔗 Cross-Domain Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] text-center text-xs text-slate-500">
                <span className="block text-2xl mb-2">✨</span>No critical insights right now.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            🔄 Real Behavioral Correlations
          </h3>
          <div className="space-y-3">
            {correlations.length === 0 ? (
               <div className="p-4 rounded-xl bg-white/[0.02] text-center text-xs text-slate-500">
                 <span className="block text-2xl mb-2">📊</span>Need more data to detect correlations.
               </div>
            ) : correlations.map((corr, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-xl text-xs border ${corr.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : corr.type === 'negative' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <p className="text-slate-300 mb-2">{corr.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize">{corr.domainA}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize">{corr.domainB}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Strength: {corr.strength}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NEW: Behavioral Analytics Intelligence ── */}
      {behavioralAnalytics && behavioralAnalytics.hasData && (
        <div className="mb-8">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            🧬 Behavioral Analytics Intelligence
            <span className="text-[10px] font-normal text-slate-500">Consistency, Volatility, Momentum</span>
          </h2>
          
          <div className="grid lg:grid-cols-3 gap-4">
            <GlassCard className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consistency</h3>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${behavioralAnalytics.consistency.score > 75 ? 'text-emerald-400' : behavioralAnalytics.consistency.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>{behavioralAnalytics.consistency.score}</span>
                <span className="text-xs text-slate-500 mb-1">/100</span>
              </div>
              <p className="text-xs text-slate-400">{behavioralAnalytics.consistency.status}</p>
              <div className="mt-2 text-[10px] text-slate-500 p-2 rounded-lg bg-black/20 border border-white/5">
                Volatility Index: <span className="text-white">{behavioralAnalytics.consistency.volatility}</span>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovery Momentum</h3>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${behavioralAnalytics.recoveryMomentum > 0 ? 'text-emerald-400' : behavioralAnalytics.recoveryMomentum < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {behavioralAnalytics.recoveryMomentum > 0 ? '+' : ''}{behavioralAnalytics.recoveryMomentum}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {behavioralAnalytics.recoveryMomentum > 0 ? 'Burnout risk is decreasing over the last 5 days.' : behavioralAnalytics.recoveryMomentum < 0 ? 'Burnout risk is accelerating.' : 'Stable burnout risk velocity.'}
              </p>
            </GlassCard>
            
            <GlassCard className="flex flex-col gap-3 col-span-1 lg:col-span-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Burnout Timeline</h3>
              {behavioralAnalytics.burnoutTimeline.length > 0 ? (
                <div className="h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={behavioralAnalytics.burnoutTimeline.slice(-14)}>
                      <defs>
                        <linearGradient id="boGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="burnoutRisk" stroke="#f59e0b" fill="url(#boGradient)" strokeWidth={2} name="Burnout Risk" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">Not enough data</div>
              )}
            </GlassCard>
            
            {/* Heatmaps Row */}
            <GlassCard className="col-span-1 lg:col-span-3">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Behavioral Consistency Heatmaps</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityHeatmap 
                    title="Sleep Regularity" 
                    data={behavioralAnalytics.burnoutTimeline.map(b => ({ date: b.date, value: b.recovery > 0 ? 8 : 4 }))}
                    colorMap={{ color: '#8b5cf6', max: 10 }}
                  />
                  <ActivityHeatmap 
                    title="Stress Intensity" 
                    data={behavioralAnalytics.burnoutTimeline.map(b => ({ date: b.date, value: b.stress }))}
                    colorMap={{ color: '#f43f5e', max: 10 }}
                  />
                  <ActivityHeatmap 
                    title="Study Behavior" 
                    data={(computed?.metricHistory || []).map(m => ({ date: m.date, value: m.career?.studyHoursDaily || 0 }))}
                    colorMap={{ color: '#3b82f6', max: 8 }}
                  />
                  <ActivityHeatmap 
                    title="Workout Streaks" 
                    data={(computed?.metricHistory || []).map(m => ({ date: m.date, value: m.health?.workoutsPerWeek > 0 ? 1 : 0 }))}
                    colorMap={{ color: '#10b981', max: 1 }}
                  />
               </div>
            </GlassCard>

            {/* Goal Trajectories Chart */}
            {behavioralAnalytics.goalTrajectories.length > 0 && (
              <GlassCard className="col-span-1 lg:col-span-3">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Goal Trajectories & Velocity</h3>
                 <div className="h-40 w-full p-2 border border-white/5 rounded-xl bg-black/10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={behavioralAnalytics.goalTrajectories[0].history.slice(-14)}>
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {behavioralAnalytics.goalTrajectories.map((g, i) => (
                           <Line key={g.id} type="monotone" dataKey="progress" data={g.history.slice(-14)} name={g.name} stroke={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][i%4]} strokeWidth={2} dot={{ r: 2 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Daily Reflection */}
      <GlassCard glow="glow-cyan">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>📝 Today's AI Reflection</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            (h.sleepAvg || 0) < 6 ? '😴 Sleep deficit detected — tonight aim for 7+ hours' : '✅ Sleep pattern is healthy',
            (h.stressLevel || 0) > 7 ? '😰 Stress is critically high — take a 15-min break now' : '✅ Stress levels are manageable',
            f.income > 0 && f.expenses / f.income > 0.9 ? '💸 Spending close to income — review today\'s expenses' : '✅ Financial discipline looks good',
            (c.studyHoursDaily || 0) + (c.codingHoursDaily || 0) > 10 ? '⚡ Long hours detected — schedule a break block' : '✅ Work-life balance looks healthy',
            (h.waterIntake || 0) < 6 ? '💧 Below hydration target — drink water now' : '✅ Hydration is on track',
            (h.sleepAvg || 0) < 6 ? '🧠 Study efficiency LOW — sleep deficit cuts retention by ~30%' : '🧠 Study efficiency HIGH — good sleep supporting learning',
          ].map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
              className="text-xs text-slate-400 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">{r}</motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">Analysis based on your data patterns</p>
          <button onClick={() => {
            const reportLines = [
              `BeyondSelf Insights Report — ${new Date().toLocaleDateString()}`,
              `==============================================`,
              `Life Balance: ${balance}/100`,
              `Health: ${healthScore}/100  |  Finance: ${financeScore}/100  |  Career: ${careerScore}/100`,
              `Burnout Risk: ${burnout}%`,
              '',
              'Cross-Domain Patterns:',
              ...patterns.map(p => `  [${p.severity.toUpperCase()}] ${p.title}: ${p.effect}`),
              '',
              'Today\'s Reflections:',
              ...[(h.sleepAvg||0)<6?'Sleep deficit detected':'Sleep healthy', (h.stressLevel||0)>7?'Stress critically high':'Stress manageable'],
            ];
            const blob = new Blob([reportLines.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `beyondself_report_${new Date().toISOString().slice(0,10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Full report exported', 'success');
          }} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Export Report →</button>
        </div>
      </GlassCard>
    </div>
  );
}
