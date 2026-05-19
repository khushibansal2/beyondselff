import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader, ExplainableScorePanel } from '../components/ui/Components';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { generateTrendData, generateCorrelations, generateInsights } from '../data/demoData';
import { computeHealthScore } from '../engines/healthScoreEngine';
import { computeFinanceScore } from '../engines/financeScoreEngine';
import { computeCareerScore } from '../engines/careerScoreEngine';

export default function Dashboard() {
  const { user } = useAuth();
  const { health, finance, career, timeline, computed, aiCache, updateAICache, anomalies = [] } = useData();
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});

  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };

  const healthScore = computed?.healthScore?.score || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore = computed?.careerScore?.score || 0;
  const lifeBalance = computed?.balance || 0;
  const burnoutRisk = computed?.burnout?.risk || 0;
  const weakestDomain = computed?.weakestDomain?.name || 'health';

  // Always compute explainable factors directly from raw data — independent of computed.hasData
  const explainFactors = useMemo(() => ({
    health: computeHealthScore(health || {}, []).factors,
    finance: computeFinanceScore(finance || {}, []).factors,
    career: computeCareerScore(career || {}, []).factors,
  }), [health, finance, career]);

  // Deterministic Today's Action Plan — generated from real domain data
  const actionPlan = useMemo(() => {
    const tasks = [];
    const savingsRate = f.income > 0 ? Math.round(((f.income - f.expenses) / f.income) * 100) : 0;
    // Health tasks
    if (h.sleepAvg > 0 && h.sleepAvg < 7)
      tasks.push({ id: 'sleep', icon: '😴', text: `Go to bed ${Math.max(0.5, 7 - h.sleepAvg).toFixed(1)}h earlier tonight`, domain: 'health', color: '#8b5cf6', time: '0 min effort', link: '/health' });
    if (h.workoutsPerWeek >= 0 && h.workoutsPerWeek < 3)
      tasks.push({ id: 'workout', icon: '💪', text: 'Do a 20-min home workout session', domain: 'health', color: '#10b981', time: '20 min', link: '/health' });
    if (h.waterIntake > 0 && h.waterIntake < 7)
      tasks.push({ id: 'water', icon: '💧', text: `Drink ${8 - Math.round(h.waterIntake)} more glasses of water today`, domain: 'health', color: '#06b6d4', time: 'All day', link: '/health' });
    if (h.stressLevel > 6)
      tasks.push({ id: 'stress', icon: '🧘', text: 'Take a 15-min meditation or walk break', domain: 'health', color: '#f43f5e', time: '15 min', link: '/health' });
    // Finance tasks
    if (savingsRate < 20 && f.income > 0)
      tasks.push({ id: 'savings', icon: '💰', text: `Review subscriptions (₹${f.subscriptions}) — cancel one unused service`, domain: 'finance', color: '#f59e0b', time: '10 min', link: '/finance' });
    if (f.debt > 0)
      tasks.push({ id: 'debt', icon: '🏦', text: 'Make a debt repayment transfer today', domain: 'finance', color: '#ef4444', time: '5 min', link: '/finance' });
    // Career tasks
    if (c.dsaPractice < 3)
      tasks.push({ id: 'dsa', icon: '🧩', text: `Solve ${Math.max(1, 3 - c.dsaPractice)} DSA problems on LeetCode`, domain: 'career', color: '#3b82f6', time: '45 min', link: '/career' });
    if (c.studyHoursDaily < 4)
      tasks.push({ id: 'study', icon: '📚', text: 'Block a 2-hour focused study session', domain: 'career', color: '#8b5cf6', time: '2 hours', link: '/career' });
    if (c.skills.length < 5)
      tasks.push({ id: 'skill', icon: '🎯', text: 'Add one new skill to your profile today', domain: 'career', color: '#06b6d4', time: '5 min', link: '/career' });
    // Default if no data
    if (tasks.length === 0) {
      tasks.push(
        { id: 'log-health', icon: '❤️', text: 'Log your health data to unlock insights', domain: 'health', color: '#10b981', time: '2 min', link: '/health' },
        { id: 'log-finance', icon: '💰', text: 'Log your income and expenses', domain: 'finance', color: '#f59e0b', time: '2 min', link: '/finance' },
        { id: 'log-career', icon: '📚', text: 'Log your study hours and skills', domain: 'career', color: '#3b82f6', time: '2 min', link: '/career' },
      );
    }
    // Return top 3 highest priority tasks
    return tasks.slice(0, 3);
  }, [h, f, c]);

  // Use deterministic alerts from lifeBalanceEngine via DataContext
  const urgentAlerts = [
    ...(computed?.urgentAlerts || []),
    ...anomalies.map(a => ({
      icon: a.severity === 'critical' ? '🚨' : '⚠️',
      text: `${a.title}: ${a.description} (${a.trend === 'up' ? '📈' : '📉'})`
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
        <div className="bg-[#141416] border border-white/[0.08] p-4 rounded-xl text-xs shadow-2xl">
          <p className="text-[#71717a] mb-2 font-medium">{label}</p>
          {payload.map(p => <p key={p.name} className="py-0.5" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>)}
        </div>
      );
    }
    return null;
  };

  const sleepCascade = crossDomain.find(cd => cd.id === 'sleep-productivity');

  return (
    <div className="page-container min-h-screen">
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.name || 'User'}. Here's your AI-powered life overview.`} />

      {/* Digital Twin Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="dash-hero">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[rgba(59,130,246,0.08)] flex items-center justify-center text-xl flex-shrink-0">🧬</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[15px] font-semibold text-[#f0f0f3]">Digital Twin Analysis</h3>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(59,130,246,0.08)] text-[#3b82f6] font-semibold">Live</span>
              </div>
              {narrativeLoading ? (
                <div className="flex items-center gap-3 text-[13px] text-[#71717a] mt-3">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Generating AI narrative...
                </div>
              ) : aiNarrative ? (
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed mt-1">"{aiNarrative}"</p>
              ) : (
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed mt-1">
                  Life balance is <strong className={lifeBalance >= 60 ? 'text-[#22c55e]' : 'text-[#f59e0b]'}>{lifeBalance}/100</strong>.
                  {' '}Weakest area: <strong className="text-[#f59e0b] capitalize">{weakestDomain}</strong> at {computed?.[`${weakestDomain}Score`]?.score}/100.
                  {burnoutRisk > 50 ? ` Burnout risk at ${burnoutRisk}%.` : ''}
                </p>
              )}
            </div>
          </div>
          {urgentAlerts.length > 0 && (
            <div className="space-y-2.5 mb-5">
              {urgentAlerts.map((u, i) => (
                <div key={i} className="text-[12px] text-[#ef4444] p-4 rounded-xl bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.08)]">{u.icon} {u.text}</div>
              ))}
            </div>
          )}
          {positiveSignals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {positiveSignals.map((p, i) => (
                <span key={i} className="text-[11px] text-[#22c55e] px-3 py-1.5 rounded-lg bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.08)] font-medium">{p.icon} {p.text}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 14-Day Pattern Alert */}
      {sleepCascade && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-3 border-b border-red-500/8 bg-red-500/[0.03]">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-red-300 font-semibold uppercase tracking-wider">🧠 AI Pattern Detected</span>
              <span className="ml-auto text-[10px] text-[#52525b] font-medium">Deterministic • Cross-domain</span>
            </div>
            <div className="p-7">
              <h3 className="text-[15px] font-bold text-[#f0f0f3] mb-3">Sleep–Productivity Cascade Active</h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-6">
                Poor sleep quality (<strong className="text-[#f0f0f3]">{h.sleepAvg}h avg</strong>) has reduced cognitive consistency, leading to lower coding productivity. {sleepCascade.mechanism}
              </p>
              <div className="space-y-3 mb-6">
                <p className="section-label mb-3">Recommended Recovery Path</p>
                {[
                  { icon: '😴', action: `Increase sleep by ${Math.max(1, (7 - h.sleepAvg)).toFixed(1)} hours`, impact: `Avoid ${sleepCascade.computedImpact?.productivityLoss || 0}% productivity loss` },
                  { icon: '📱', action: 'Reduce evening screen time', impact: 'Faster sleep onset' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#141416] border border-white/[0.04]">
                    <span className="text-lg flex-shrink-0">{r.icon}</span>
                    <p className="text-[13px] text-[#a1a1aa] flex-1">• {r.action}</p>
                    <span className="text-[10px] text-[#22c55e] bg-[rgba(34,197,94,0.06)] px-3 py-1 rounded-lg flex-shrink-0 whitespace-nowrap font-medium">{r.impact}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link to="/coach" className="text-[12px] px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#a1a1aa] hover:text-white hover:bg-white/[0.06] transition-all font-medium">
                  Ask AI Coach →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score Rings */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-12">
        <GlassCard className="flex justify-center py-8">
          <ScoreRing score={healthScore} color="auto" label="Health" delay={0} size={130} />
        </GlassCard>
        <GlassCard className="flex justify-center py-8">
          <ScoreRing score={financeScore} color="auto" label="Finance" delay={100} size={130} />
        </GlassCard>
        <GlassCard className="flex justify-center py-8">
          <ScoreRing score={careerScore} color="auto" label="Career" delay={200} size={130} />
        </GlassCard>
        <GlassCard className="flex justify-center py-8">
          <ScoreRing score={lifeBalance} color="auto" label="Balance" delay={300} size={130} />
        </GlassCard>
        <GlassCard className="flex justify-center py-8 col-span-2 md:col-span-1">
          <ScoreRing score={burnoutRisk} color={burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f59e0b' : '#22c55e'} label="Burnout" delay={400} size={130} />
        </GlassCard>
      </div>

      {/* Explainable AI Score Panels */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-12">
        <h3 className="dash-section-title mb-6">
          🔍 Explainable AI — Score Breakdown
          <span className="dash-badge bg-[rgba(59,130,246,0.08)] text-[#3b82f6]">Advanced</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-5">
          <ExplainableScorePanel title="Health Score" score={healthScore} factors={explainFactors.health} color="#22c55e" icon="❤️" />
          <ExplainableScorePanel title="Finance Score" score={financeScore} factors={explainFactors.finance} color="#f59e0b" icon="💰" />
          <ExplainableScorePanel title="Career Score" score={careerScore} factors={explainFactors.career} color="#3b82f6" icon="🎯" />
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 mb-12">
        {/* Metrics + Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon="😴" label="Avg Sleep" value={`${h.sleepAvg || 0}h`} change={h.sleepAvg >= 7 ? 5 : -12} color="#a78bfa" delay={0} />
            <MetricCard icon="😰" label="Stress" value={`${h.stressLevel || 0}/10`} change={h.stressLevel <= 5 ? 8 : -15} color="#f43f5e" delay={100} />
            <MetricCard icon="💵" label="Savings" value={`${computed?.financeScore?.summary?.savingsRate || 0}%`} change={f.income > f.expenses ? 5 : -10} color="#22c55e" delay={200} />
            <MetricCard icon="📊" label="Study" value={`${c.studyHoursDaily || 0}h/day`} change={c.studyHoursDaily >= 4 ? 10 : -5} color="#818cf8" delay={300} />
          </div>

          {/* Trend Chart */}
          <GlassCard>
            <h3 className="dash-section-title mb-6">14-Day Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="sleepG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} /><stop offset="95%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient>
                    <linearGradient id="stressG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                    <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#3f3f46', fontSize: 11 }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sleep" stroke="#a78bfa" fill="url(#sleepG)" strokeWidth={2} name="Sleep" />
                  <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#stressG)" strokeWidth={2} name="Stress" />
                  <Area type="monotone" dataKey="productivity" stroke="#3b82f6" fill="url(#prodG)" strokeWidth={2} name="Productivity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* AI Insights */}
        <div className="space-y-4">
          <h3 className="dash-section-title">
            🧠 AI Insights
          </h3>
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-8 rounded-xl bg-[#141416] text-center text-[13px] text-[#52525b] border border-white/[0.06]">
                <span className="text-3xl block mb-3">✨</span>
                All clear! No critical insights right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-12">
        {/* Activity Timeline */}
        <GlassCard>
          <h3 className="dash-section-title mb-6">
            📅 Recent Activity
          </h3>
          <div className="space-y-4">
            {(timeline || []).slice(0, 6).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 text-[13px]">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${item.sentiment === 'positive' ? 'bg-emerald-400' : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-zinc-700'}`} />
                  {i < 5 && <div className="w-px h-8 bg-white/[0.04] mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#a1a1aa] leading-relaxed">{item.text}</p>
                  <p className="text-[10px] text-[#52525b] mt-1">{item.date} • {item.type}</p>
                </div>
              </motion.div>
            ))}
            {(!timeline || timeline.length === 0) && (
              <p className="text-[13px] text-[#52525b] text-center py-8">No recent activity yet.</p>
            )}
          </div>
        </GlassCard>

        {/* Habit Correlations */}
        <GlassCard>
          <h3 className="dash-section-title mb-6">
            🔗 Habit Correlations
          </h3>
          <div className="space-y-3">
            {correlations.slice(0, 5).map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-4 rounded-xl text-[12px] border ${c.type === 'positive' ? 'border-emerald-500/10 bg-emerald-500/[0.02]' : c.type === 'negative' ? 'border-red-500/10 bg-red-500/[0.02]' : 'border-white/[0.06] bg-white/[0.01]'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-[#a1a1aa]">{c.pattern}</p>
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#52525b] flex-shrink-0 ml-3 tabular-nums font-medium">{Math.round(c.strength * 100)}%</span>
                </div>
                <div className="flex gap-2 mt-2.5">
                  {c.domains.map(d => <span key={d} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.04] text-[#52525b] capitalize font-medium">{d}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Today's Action Plan */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-10">
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="dash-section-title mb-0">
              📋 Today's Action Plan
              <span className="dash-badge bg-[rgba(34,197,94,0.06)] text-[#22c55e]">AI-generated</span>
            </h3>
            <span className="text-[12px] text-[#52525b] tabular-nums font-medium">
              {Object.values(checkedTasks).filter(Boolean).length}/{actionPlan.length} done
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-white/[0.04] mb-6">
            <motion.div
              animate={{ width: `${(Object.values(checkedTasks).filter(Boolean).length / actionPlan.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            />
          </div>

          <div className="space-y-3">
            {actionPlan.map((task, i) => {
              const done = !!checkedTasks[task.id];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${done ? 'border-emerald-500/10 bg-emerald-500/[0.02] opacity-60' : 'border-white/[0.06] bg-[#141416] hover:bg-[#1a1a1e] hover:border-white/[0.10]'
                    }`}
                  onClick={() => setCheckedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'border-emerald-400 bg-emerald-500/20' : 'border-zinc-700'
                    }`}>
                    {done && <span className="text-[10px] text-[#22c55e]">✓</span>}
                  </div>

                  <span className="text-lg flex-shrink-0">{task.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium ${done ? 'line-through text-[#52525b]' : 'text-[#f0f0f3]'}`}>{task.text}</p>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-lg capitalize font-medium"
                        style={{ color: task.color, background: task.color + '10' }}>{task.domain}</span>
                      <span className="text-[10px] text-[#52525b] font-medium">⏱ {task.time}</span>
                    </div>
                  </div>

                  <Link to={task.link} onClick={e => e.stopPropagation()}
                    className="text-[11px] px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-[#52525b] hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0 font-medium">
                    Go →
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {Object.values(checkedTasks).filter(Boolean).length === actionPlan.length && actionPlan.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 text-center"
              >
                <p className="text-[14px] text-[#22c55e] font-semibold">🎉 All tasks complete! +50 XP earned</p>
                <p className="text-[11px] text-emerald-500/50 mt-1">Come back tomorrow for a new plan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <GlassCard>
        <h3 className="dash-section-title mb-6">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/health', icon: '❤️', label: 'Log Health', color: '#22c55e' },
            { to: '/finance', icon: '💰', label: 'Log Expense', color: '#f59e0b' },
            { to: '/career', icon: '📚', label: 'Log Study', color: '#818cf8' },
            { to: '/coach', icon: '💬', label: 'Ask AI Coach', color: '#a78bfa' },
          ].map(action => (
            <Link key={action.to} to={action.to}
              className="p-6 rounded-xl bg-[#141416] border border-white/[0.06] text-center hover:bg-[#1a1a1e] hover:border-white/[0.10] transition-all group hover:scale-[1.02] active:scale-[0.98]">
              <span className="text-2xl block mb-3 group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
              <p className="text-[12px] font-medium text-[#71717a] group-hover:text-[#f0f0f3] transition-colors">{action.label}</p>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

