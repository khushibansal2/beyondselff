import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader } from '../components/ui/Components';
import { AdaptiveRecommendations } from '../components/ui/AdaptiveRecommendations';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { generateTrendData, generateCorrelations, generateInsights } from '../data/demoData';

export default function Dashboard() {
  const { user } = useAuth();
  const { health, finance, career, timeline, computed, aiCache, updateAICache, anomalies = [] } = useData();
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };

  const healthScore = computed?.healthScore?.score || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore = computed?.careerScore?.score || 0;
  const lifeBalance = computed?.balance || 0;
  const burnoutRisk = computed?.burnout?.risk || 0;
  const weakestDomain = computed?.weakestDomain?.name || 'health';
  
  // Use deterministic alerts from lifeBalanceEngine via DataContext
  const urgentAlerts = [
    ...(computed?.urgentAlerts || []),
    ...anomalies.map(a => ({
      icon: a.severity === 'urgent' ? '🚨' : a.severity === 'alert' ? '⚠️' : a.severity === 'attention' ? '🟡' : '👁️',
      text: `${a.status === 'monitoring' ? '[Monitoring] ' : ''}${a.title}: ${a.description} (${a.trend === 'up' ? '📈' : '📉'})`
    }))
  ];
  const positiveSignals = computed?.positiveSignals || [];
  const crossDomain = computed?.crossDomain || [];

  // Create a merged state object for fallback generators
  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline }), [user, h, f, c, timeline]);

  // Generate fallback data for charts/insights if records are missing
  const trendData = useMemo(() => generateTrendData(currentState, 14), [currentState]);
  const correlations = useMemo(() => generateCorrelations(trendData), [trendData]);
  
  // Convert crossDomain deterministic relationships into insights
  const insights = useMemo(() => {
    // Generate basic insights from demoData for UI population
    const baseInsights = generateInsights(currentState);
    
    // Prepend deterministic cross-domain relationships
    const crossInsights = crossDomain.map(cd => ({
      type: cd.severity === 'critical' ? 'critical' : cd.severity === 'warning' ? 'alert' : 'positive',
      icon: cd.severity === 'positive' ? '✅' : '⚡',
      title: 'Deterministic Pattern',
      text: `${cd.effect}. Triggered by: ${cd.trigger}. ${cd.mechanism}`,
      domains: [cd.from, cd.to],
      confidence: 100 // deterministic
    }));
    
    return [...crossInsights, ...baseInsights].slice(0, 5);
  }, [user, crossDomain]);

  // Fetch AI Narrative
  useEffect(() => {
    async function fetchNarrative() {
      // Create a hash to avoid refetching for the same state
      const hash = `${lifeBalance}-${healthScore}-${financeScore}-${careerScore}-${burnoutRisk}`;
      
      if (aiCache.dashboardNarrative && aiCache.dashboardNarrativeHash === hash) {
        setAiNarrative(aiCache.dashboardNarrative);
        return;
      }
      
      if (!computed?.hasData) return;
      
      setNarrativeLoading(true);
      const res = await generateNarrative(computed, 'dashboard');
      setAiNarrative(res.narrative);
      updateAICache({ dashboardNarrative: res.narrative, dashboardNarrativeHash: hash });
      setNarrativeLoading(false);
    }
    
    fetchNarrative();
  }, [computed, aiCache.dashboardNarrative, aiCache.dashboardNarrativeHash, updateAICache, lifeBalance, healthScore, financeScore, careerScore, burnoutRisk]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="glass-strong p-3 rounded-xl text-xs">
          <p className="text-slate-400 mb-1">{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>)}
        </div>
      );
    }
    return null;
  };

  const sleepCascade = crossDomain.find(cd => cd.id === 'sleep-productivity');

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Your Digital Twin Today" subtitle={`Welcome back, ${user?.name || 'User'}. Here's your AI-powered life overview.`} icon="🧬" />

      {/* Digital Twin Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="glass-card p-5 rounded-2xl border border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 50%, rgba(6,182,212,0.05) 100%)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">🧬</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Your Digital Twin Analysis</h3>
              {narrativeLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Generating AI narrative from your data...
                </div>
              ) : aiNarrative ? (
                <p className="text-xs text-slate-300 italic mb-2 leading-relaxed">"{aiNarrative}"</p>
              ) : (
                <p className="text-xs text-slate-400">
                  Your life balance is <strong className={lifeBalance >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{lifeBalance}/100</strong>.
                  {' '}Your weakest area is <strong className="text-amber-400 capitalize">{weakestDomain}</strong> at {computed?.[`${weakestDomain}Score`]?.score}/100.
                  {burnoutRisk > 50 ? ` Burnout risk is ${burnoutRisk}% — this needs attention.` : ' Keep up the good work!'}
                </p>
              )}
            </div>
          </div>
          {urgentAlerts.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {urgentAlerts.map((u, i) => (
                <div key={i} className="text-xs text-red-300/80 p-2 rounded-lg bg-red-500/5 border border-red-500/10">{u.icon} {u.text}</div>
              ))}
            </div>
          )}
          {positiveSignals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {positiveSignals.map((p, i) => (
                <span key={i} className="text-[10px] text-emerald-300/80 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">{p.icon} {p.text}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 14-Day Pattern Alert (from Deterministic Cross-Domain) */}
      {sleepCascade && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-red-500/15 bg-red-500/5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] text-red-300 font-semibold uppercase tracking-wider">🧠 AI Pattern Detected</span>
              <span className="ml-auto text-[10px] text-slate-600">Deterministic • Cross-domain</span>
            </div>
            <div className="p-5">
              <h3 className="text-sm font-bold text-white mb-2">Sleep–Productivity Cascade Active</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Your Digital Twin detected a recurring pattern: poor sleep quality (<strong className="text-white">{h.sleepAvg}h avg</strong>) has reduced cognitive consistency, leading to lower coding productivity. {sleepCascade.mechanism}
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Recommended Recovery Path</p>
                {[
                  { icon: '😴', action: `Increase sleep by ${Math.max(1, (7 - h.sleepAvg)).toFixed(1)} hours`, impact: `Avoid ${sleepCascade.computedImpact?.productivityLoss || 0}% productivity loss` },
                  { icon: '📱', action: 'Reduce evening screen time', impact: 'Faster sleep onset' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-base flex-shrink-0">{r.icon}</span>
                    <p className="text-xs text-slate-300 flex-1">• {r.action}</p>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{r.impact}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link to="/coach" className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                  Ask AI Coach
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score Rings */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <GlassCard className="flex justify-center" glow="glow-emerald">
          <ScoreRing score={healthScore} color="auto" label="Health" delay={0} />
        </GlassCard>
        <GlassCard className="flex justify-center" glow="glow-amber">
          <ScoreRing score={financeScore} color="auto" label="Finance" delay={100} />
        </GlassCard>
        <GlassCard className="flex justify-center" glow="glow-blue">
          <ScoreRing score={careerScore} color="auto" label="Career" delay={200} />
        </GlassCard>
        <GlassCard className="flex justify-center" glow="glow-purple">
          <ScoreRing score={lifeBalance} color="auto" label="Life Balance" delay={300} />
        </GlassCard>
        <GlassCard className={`flex justify-center col-span-2 md:col-span-1 ${burnoutRisk > 60 ? 'glow-rose' : ''}`}>
          <ScoreRing score={burnoutRisk} color={burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f59e0b' : '#10b981'} label="Burnout Risk" delay={400} />
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Metrics + Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon="😴" label="Avg Sleep" value={`${h.sleepAvg || 0}h`} change={h.sleepAvg >= 7 ? 5 : -12} color="#8b5cf6" delay={0} />
            <MetricCard icon="😰" label="Stress" value={`${h.stressLevel || 0}/10`} change={h.stressLevel <= 5 ? 8 : -15} color="#f43f5e" delay={100} />
            <MetricCard icon="💵" label="Savings Rate" value={`${computed?.financeScore?.summary?.savingsRate || 0}%`} change={f.income > f.expenses ? 5 : -10} color="#10b981" delay={200} />
            <MetricCard icon="📊" label="Study Hours" value={`${c.studyHoursDaily || 0}h/day`} change={c.studyHoursDaily >= 4 ? 10 : -5} color="#3b82f6" delay={300} />
          </div>

          {/* Trend Chart */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>14-Day Trends</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="sleepG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="stressG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sleep" stroke="#8b5cf6" fill="url(#sleepG)" strokeWidth={2} name="Sleep" />
                  <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#stressG)" strokeWidth={2} name="Stress" />
                  <Area type="monotone" dataKey="productivity" stroke="#3b82f6" fill="url(#prodG)" strokeWidth={2} name="Productivity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-lg">🧠</span> Deterministic Insights
          </h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] text-center text-xs text-slate-500">
                <span className="text-2xl block mb-2">✨</span>
                All clear! No critical insights right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Timeline */}
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span>📅</span> Recent Activity
          </h3>
          <div className="space-y-3">
            {(timeline || []).slice(0, 6).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.sentiment === 'positive' ? 'bg-emerald-400' : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300">{item.text}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{item.date} • {item.type}</p>
                </div>
              </motion.div>
            ))}
            {(!timeline || timeline.length === 0) && (
              <p className="text-xs text-slate-500 text-center py-4">No recent activity yet.</p>
            )}
          </div>
        </GlassCard>

        {/* Habit Correlations */}
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span>🔗</span> Habit Correlations
          </h3>
          <div className="space-y-3">
            {correlations.slice(0, 5).map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-xl text-xs border ${c.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : c.type === 'negative' ? 'border-red-500/20 bg-red-500/5' : 'border-slate-500/20 bg-slate-500/5'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-slate-300">{c.pattern}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 flex-shrink-0 ml-2">{Math.round(c.strength * 100)}%</span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {c.domains.map(d => <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize">{d}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/health', icon: '❤️', label: 'Log Health', color: '#10b981' },
            { to: '/finance', icon: '💰', label: 'Log Expense', color: '#f59e0b' },
            { to: '/career', icon: '📚', label: 'Log Study', color: '#3b82f6' },
            { to: '/coach', icon: '💬', label: 'Ask AI Coach', color: '#8b5cf6' },
          ].map(action => (
            <Link key={action.to} to={action.to}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center hover:bg-white/[0.04] transition-all group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{action.icon}</span>
              <p className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{action.label}</p>
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* Adaptive Recommendations Feed */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          🧠 Your Top Recommendations
          <span className="text-[10px] text-indigo-300 font-normal bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Adaptive · Learns from you</span>
        </h3>
        <AdaptiveRecommendations />
      </div>
    </div>
  );
}
