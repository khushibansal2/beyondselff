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
    <div className="page-container bg-mesh min-h-screen">
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.name || 'User'}. Here's your AI-powered life overview.`} icon="🧬" />

      {/* Digital Twin Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 50%, rgba(6,182,212,0.03) 100%)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xl flex-shrink-0">🧬</div>
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold mb-1 text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin Analysis</h3>
              {narrativeLoading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                  <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  Generating AI narrative...
                </div>
              ) : aiNarrative ? (
                <p className="text-[12px] text-zinc-400 italic leading-relaxed">"{aiNarrative}"</p>
              ) : (
                <p className="text-[12px] text-zinc-500">
                  Life balance is <strong className={lifeBalance >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{lifeBalance}/100</strong>.
                  {' '}Weakest area: <strong className="text-amber-400 capitalize">{weakestDomain}</strong> at {computed?.[`${weakestDomain}Score`]?.score}/100.
                  {burnoutRisk > 50 ? ` Burnout risk at ${burnoutRisk}%.` : ''}
                </p>
              )}
            </div>
          </div>
          {urgentAlerts.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {urgentAlerts.map((u, i) => (
                <div key={i} className="text-[11px] text-red-300/80 p-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/10">{u.icon} {u.text}</div>
              ))}
            </div>
          )}
          {positiveSignals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {positiveSignals.map((p, i) => (
                <span key={i} className="text-[10px] text-emerald-300/80 px-2 py-1 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">{p.icon} {p.text}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 14-Day Pattern Alert (from Deterministic Cross-Domain) */}
      {sleepCascade && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-red-500/10 bg-red-500/[0.04]">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] text-red-300 font-semibold uppercase tracking-wider">🧠 AI Pattern Detected</span>
              <span className="ml-auto text-[10px] text-zinc-700">Deterministic • Cross-domain</span>
            </div>
            <div className="p-5">
              <h3 className="text-[13px] font-bold text-zinc-200 mb-2">Sleep–Productivity Cascade Active</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
                Poor sleep quality (<strong className="text-zinc-200">{h.sleepAvg}h avg</strong>) has reduced cognitive consistency, leading to lower coding productivity. {sleepCascade.mechanism}
              </p>
              <div className="space-y-2 mb-4">
                <p className="section-label mb-2">Recommended Recovery Path</p>
                {[
                  { icon: '😴', action: `Increase sleep by ${Math.max(1, (7 - h.sleepAvg)).toFixed(1)} hours`, impact: `Avoid ${sleepCascade.computedImpact?.productivityLoss || 0}% productivity loss` },
                  { icon: '📱', action: 'Reduce evening screen time', impact: 'Faster sleep onset' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-base flex-shrink-0">{r.icon}</span>
                    <p className="text-[12px] text-zinc-400 flex-1">• {r.action}</p>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex-shrink-0 whitespace-nowrap">{r.impact}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link to="/coach" className="text-[12px] px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all">
                  Ask AI Coach →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score Rings */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <GlassCard className="flex justify-center py-5" glow="glow-emerald">
          <ScoreRing score={healthScore} color="auto" label="Health" delay={0} size={110} />
        </GlassCard>
        <GlassCard className="flex justify-center py-5" glow="glow-amber">
          <ScoreRing score={financeScore} color="auto" label="Finance" delay={100} size={110} />
        </GlassCard>
        <GlassCard className="flex justify-center py-5" glow="glow-blue">
          <ScoreRing score={careerScore} color="auto" label="Career" delay={200} size={110} />
        </GlassCard>
        <GlassCard className="flex justify-center py-5" glow="glow-purple">
          <ScoreRing score={lifeBalance} color="auto" label="Balance" delay={300} size={110} />
        </GlassCard>
        <GlassCard className={`flex justify-center py-5 col-span-2 md:col-span-1 ${burnoutRisk > 60 ? 'glow-rose' : ''}`}>
          <ScoreRing score={burnoutRisk} color={burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f59e0b' : '#10b981'} label="Burnout" delay={400} size={110} />
        </GlassCard>
      </div>

      {/* Explainable AI Score Panels — always visible, shows defaults if no data logged */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
          <span className="text-base">🔍</span> Explainable AI — Score Breakdown
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 font-medium">Advanced</span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <ExplainableScorePanel
            title="Health Score"
            score={healthScore}
            factors={explainFactors.health}
            color="#10b981"
            icon="❤️"
          />
          <ExplainableScorePanel
            title="Finance Score"
            score={financeScore}
            factors={explainFactors.finance}
            color="#f59e0b"
            icon="💰"
          />
          <ExplainableScorePanel
            title="Career Score"
            score={careerScore}
            factors={explainFactors.career}
            color="#3b82f6"
            icon="🎯"
          />
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {/* Metrics + Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon="😴" label="Avg Sleep" value={`${h.sleepAvg || 0}h`} change={h.sleepAvg >= 7 ? 5 : -12} color="#8b5cf6" delay={0} />
            <MetricCard icon="😰" label="Stress" value={`${h.stressLevel || 0}/10`} change={h.stressLevel <= 5 ? 8 : -15} color="#f43f5e" delay={100} />
            <MetricCard icon="💵" label="Savings" value={`${computed?.financeScore?.summary?.savingsRate || 0}%`} change={f.income > f.expenses ? 5 : -10} color="#10b981" delay={200} />
            <MetricCard icon="📊" label="Study" value={`${c.studyHoursDaily || 0}h/day`} change={c.studyHoursDaily >= 4 ? 10 : -5} color="#6366f1" delay={300} />
          </div>

          {/* Trend Chart */}
          <GlassCard>
            <h3 className="text-[13px] font-semibold mb-4 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>14-Day Trends</h3>
            <div className="h-52">
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
          <h3 className="text-[13px] font-semibold flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-base">🧠</span> AI Insights
          </h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] text-center text-[12px] text-zinc-600">
                <span className="text-2xl block mb-2">✨</span>
                All clear! No critical insights right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        {/* Activity Timeline */}
        <GlassCard>
          <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
            <span>📅</span> Recent Activity
          </h3>
          <div className="space-y-3">
            {(timeline || []).slice(0, 6).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 text-[13px]">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${item.sentiment === 'positive' ? 'bg-emerald-400' : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-zinc-600'}`} />
                  {i < 5 && <div className="w-px h-6 bg-white/[0.06] mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-400">{item.text}</p>
                  <p className="text-[10px] text-zinc-700 mt-0.5">{item.date} • {item.type}</p>
                </div>
              </motion.div>
            ))}
            {(!timeline || timeline.length === 0) && (
              <p className="text-[12px] text-zinc-600 text-center py-4">No recent activity yet.</p>
            )}
          </div>
        </GlassCard>

        {/* Habit Correlations */}
        <GlassCard>
          <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
            <span>🔗</span> Habit Correlations
          </h3>
          <div className="space-y-2.5">
            {correlations.slice(0, 5).map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-xl text-[12px] border ${c.type === 'positive' ? 'border-emerald-500/15 bg-emerald-500/[0.03]' : c.type === 'negative' ? 'border-red-500/15 bg-red-500/[0.03]' : 'border-zinc-700/30 bg-zinc-800/20'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-zinc-400">{c.pattern}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-600 flex-shrink-0 ml-2 tabular-nums">{Math.round(c.strength * 100)}%</span>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {c.domains.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-600 capitalize">{d}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Today's Action Plan */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-base">📋</span> Today's Action Plan
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-medium">AI-generated</span>
            </h3>
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {Object.values(checkedTasks).filter(Boolean).length}/{actionPlan.length} done
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-white/[0.05] mb-4">
            <motion.div
              animate={{ width: `${(Object.values(checkedTasks).filter(Boolean).length / actionPlan.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            />
          </div>

          <div className="space-y-2">
            {actionPlan.map((task, i) => {
              const done = !!checkedTasks[task.id];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    done ? 'border-emerald-500/15 bg-emerald-500/[0.03] opacity-60' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                  onClick={() => setCheckedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                >
                  <div className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? 'border-emerald-400 bg-emerald-500/20' : 'border-zinc-700'
                  }`}>
                    {done && <span className="text-[10px] text-emerald-400">✓</span>}
                  </div>

                  <span className="text-base flex-shrink-0">{task.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium ${done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{task.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md capitalize"
                        style={{ color: task.color, background: task.color + '12' }}>{task.domain}</span>
                      <span className="text-[9px] text-zinc-700">⏱ {task.time}</span>
                    </div>
                  </div>

                  <Link to={task.link} onClick={e => e.stopPropagation()}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0">
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
                className="mt-4 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 text-center"
              >
                <p className="text-[13px] text-emerald-400 font-semibold">🎉 All tasks complete! +50 XP earned</p>
                <p className="text-[10px] text-emerald-500/60 mt-0.5">Come back tomorrow for a new plan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <GlassCard>
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2 text-zinc-300" style={{ fontFamily: 'var(--font-display)' }}>⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/health', icon: '❤️', label: 'Log Health', color: '#10b981' },
            { to: '/finance', icon: '💰', label: 'Log Expense', color: '#f59e0b' },
            { to: '/career', icon: '📚', label: 'Log Study', color: '#6366f1' },
            { to: '/coach', icon: '💬', label: 'Ask AI Coach', color: '#8b5cf6' },
          ].map(action => (
            <Link key={action.to} to={action.to}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform duration-200">{action.icon}</span>
              <p className="text-[12px] font-medium text-zinc-500 group-hover:text-zinc-200 transition-colors">{action.label}</p>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

