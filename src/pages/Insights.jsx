import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateInsights, generateTrendData, generateCorrelations } from '../data/demoData';
import { GlassCard, InsightCard, ScoreRing, showToast, PageHeader } from '../components/ui/Components';
import AIExplainer from '../components/ui/AIExplainer';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';
import LifeStressHeatmap from '../components/ui/Heatmap';
import ReportCardModal from '../components/ui/ReportCardModal';

const severityConfig = {
  critical: { border: 'border-rose-500/30', bg: 'bg-rose-500/5', badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/20', pulse: 'bg-rose-400', label: '🚨 Critical Pattern' },
  warning:  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', pulse: 'bg-amber-400', label: '⚠️ Warning Pattern' },
  positive: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', pulse: 'bg-emerald-400', label: '✅ Positive Pattern' },
};

function PatternCard({ pattern, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = severityConfig[pattern.severity] || severityConfig.warning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className={`rounded-2xl border backdrop-blur-xl transition-all duration-300 ${cfg.border} ${cfg.bg} hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)} className="w-full p-5 md:p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0 mt-1">
              <span className="text-3xl filter drop-shadow-md">{pattern.icon || '⚡'}</span>
              {pattern.severity === 'critical' && (
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${cfg.pulse} shadow-[0_0_10px_currentColor] animate-pulse`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide uppercase ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <span className="text-[11px] text-[#9B9B9B] bg-white/5 px-2 py-0.5 rounded-md">🕐 {pattern.period || 'Recent Activity'}</span>
                <span className="text-[11px] text-[#9B9B9B] bg-white/5 px-2 py-0.5 rounded-md">{pattern.confidence || 100}% confident</span>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-[#EBEBEB] leading-tight tracking-tight">{pattern.title}</h3>
            </div>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 transition-transform">
            <span className={`text-[#9B9B9B] text-xs transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <div className="px-5 md:px-6 pb-6 space-y-5">
              {/* Description */}
              <div className="p-4 rounded-xl bg-[#09090b]/60 border border-white/[0.04] shadow-inner">
                <p className="text-[13px] text-[#EBEBEB] leading-relaxed mb-3">
                  <span className="font-semibold text-white block mb-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-violet-400 uppercase tracking-widest bg-violet-400/10 px-2 py-0.5 rounded">Trigger</span>
                    {pattern.trigger}
                  </span>
                  {pattern.description || pattern.effect}
                </p>
                <p className="text-[11px] text-[#9B9B9B] italic border-t border-white/[0.04] pt-3 flex items-start gap-2">
                  <span className="mt-0.5">⚙️</span> {pattern.mechanism}
                </p>
              </div>

              {/* Explainable AI */}
              <AIExplainer insightData={pattern} />

              {/* Domain Tags */}
              <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-white/[0.04]">
                <span className="text-[11px] text-[#52525b] uppercase tracking-wider font-medium">Affected Domains:</span>
                {pattern.domains?.map(d => (
                  <span key={d} className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-[#EBEBEB] capitalize border border-white/[0.04]">{d}</span>
                ))}
                <Link to="/coach" className="ml-auto text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                  Ask AI Coach <span className="text-[14px]">→</span>
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
  const { computed, health, finance, career } = useData();
  const [showReportModal, setShowReportModal] = useState(false);

  const h = health || {};
  const f = finance || {};
  const c = career || {};

  const healthScore = computed?.healthScore?.score || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore = computed?.careerScore?.score || 0;
  const balance = computed?.balance || 0;
  const burnout = computed?.burnout?.risk || 0;

  const patterns = useMemo(() => {
    return (computed?.crossDomain || []).map(cd => ({
      ...cd,
      title: cd.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Cascade',
      icon: cd.severity === 'positive' ? '✅' : cd.severity === 'critical' ? '🚨' : '⚡',
      description: cd.effect,
      domains: [cd.from, cd.to],
      confidence: 100
    }));
  }, [computed?.crossDomain]);

  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline: computed?.timeline || [] }), [user, h, f, c, computed?.timeline]);

  const insights = useMemo(() => generateInsights(currentState), [currentState]);
  const trendData = useMemo(() => generateTrendData(currentState, 14), [currentState]);
  const trendData30 = useMemo(() => generateTrendData(currentState, 30), [currentState]);
  const correlations = useMemo(() => generateCorrelations(trendData), [trendData]);

  const criticalCount = patterns.filter(p => p.severity === 'critical').length;
  const warningCount = patterns.filter(p => p.severity === 'warning').length;
  const positiveCount = patterns.filter(p => p.severity === 'positive').length;

  const happinessScore = Math.round(((h.moodAvg || 5) / 10 * 40) + ((10 - (h.stressLevel || 5)) / 10 * 30) + ((h.sleepAvg || 7) / 8 * 30));
  const successScore = Math.round(careerScore * 0.4 + financeScore * 0.3 + (healthScore > 60 ? 30 : 15));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#111116]/95 backdrop-blur-md border border-white/[0.08] p-3 rounded-xl text-xs shadow-xl">
          <p className="text-[#9B9B9B] mb-2 font-medium border-b border-white/[0.06] pb-1">{label}</p>
          <div className="space-y-1">
            {payload.map(p => (
              <div key={p.name} className="flex justify-between items-center gap-4">
                <span style={{ color: p.color }}>{p.name}</span>
                <span className="font-bold text-white">{p.value?.toFixed?.(1)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container min-h-screen pb-20">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader 
        title="Cross-Domain Intelligence" 
        subtitle="AI-explained patterns and correlations across your health, finances, and career." 
      />

      <div className="space-y-8 lg:space-y-10">

        {/* 14-Day Pattern Report Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.05)] relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.03) 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)] animate-pulse" />
                <span className="text-[10px] text-violet-300 font-semibold uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">Deterministic AI Analysis</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {patterns.length} Pattern{patterns.length !== 1 ? 's' : ''} Detected
              </h2>
            </div>
            
            <div className="flex gap-4 p-3 rounded-xl bg-black/20 border border-white/[0.04]">
              {criticalCount > 0 && <div className="text-center px-3"><p className="text-xl font-bold text-rose-400">{criticalCount}</p><p className="text-[9px] uppercase tracking-wider text-[#9B9B9B] mt-0.5">Critical</p></div>}
              {warningCount > 0 && <div className="text-center px-3 border-l border-white/[0.06]"><p className="text-xl font-bold text-amber-400">{warningCount}</p><p className="text-[9px] uppercase tracking-wider text-[#9B9B9B] mt-0.5">Warnings</p></div>}
              {positiveCount > 0 && <div className="text-center px-3 border-l border-white/[0.06]"><p className="text-xl font-bold text-emerald-400">{positiveCount}</p><p className="text-[9px] uppercase tracking-wider text-[#9B9B9B] mt-0.5">Positive</p></div>}
            </div>
          </div>

          {/* Mini Trend Chart */}
          <div className="h-32 bg-[#09090b]/40 rounded-xl p-3 border border-white/[0.04]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={7} stroke="#8b5cf6" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '7h Target', fill: '#a78bfa', fontSize: 9, position: 'insideTopLeft' }} />
                <Area type="monotone" dataKey="sleep" stroke="#8b5cf6" fill="url(#sleepG14)" strokeWidth={2.5} name="Sleep" />
                <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#stressG14)" strokeWidth={2} name="Stress" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#52525b] font-medium text-center mt-3 uppercase tracking-wider">Purple = Sleep Hours • Rose = Stress Level</p>
        </motion.div>

        {/* Pattern Cards (Explainable AI) */}
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <GlassCard className="text-center py-16 border-dashed border-white/10">
              <span className="text-5xl block mb-4">✨</span>
              <p className="text-lg font-semibold mb-2 text-[#EBEBEB]">No Cross-Domain Cascades Detected</p>
              <p className="text-sm text-[#9B9B9B]">Your data looks balanced across all domains. Keep it up!</p>
            </GlassCard>
          ) : (
            patterns.map((p, i) => <PatternCard key={p.id} pattern={p} index={i} />)
          )}
        </div>

        {/* Scores + Burnout Row */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          <GlassCard className="flex flex-col items-center gap-4 p-6" glow="glow-cyan">
            <h3 className="text-xs font-semibold text-[#EBEBEB] w-full text-center tracking-wide uppercase mb-2">Life Balance</h3>
            <ScoreRing score={balance} color="auto" label="Balance" size={110} strokeWidth={8} />
            <p className="text-[11px] text-[#9B9B9B] text-center max-w-[180px] leading-relaxed">
              {balance >= 75 ? 'Excellent equilibrium across domains' : balance >= 50 ? 'Needs attention in weaker areas' : 'Significant imbalance detected'}
            </p>
          </GlassCard>
          
          <GlassCard className={`flex flex-col items-center gap-4 p-6 ${burnout > 60 ? 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : ''}`}>
            <h3 className="text-xs font-semibold text-[#EBEBEB] w-full text-center tracking-wide uppercase mb-2">Burnout Risk</h3>
            <ScoreRing score={burnout} color={burnout > 60 ? '#f43f5e' : burnout > 30 ? '#fbbf24' : '#10b981'} label="Risk" size={110} strokeWidth={8} />
            <p className="text-[11px] text-[#9B9B9B] text-center max-w-[180px] leading-relaxed">
              {burnout > 60 ? '🚨 Immediate recovery action required' : burnout > 30 ? '⚠️ Monitor pace and prioritize rest' : '✅ Sustainable long-term pace'}
            </p>
          </GlassCard>

          <GlassCard className="flex flex-col items-center gap-4 p-6">
            <h3 className="text-xs font-semibold text-[#EBEBEB] w-full text-center tracking-wide uppercase mb-2">Alignment</h3>
            <div className="flex gap-6 items-center">
              <ScoreRing score={happinessScore} color="#fbbf24" label="Happiness" size={80} strokeWidth={6} />
              <ScoreRing score={successScore} color="#3b82f6" label="Success" size={80} strokeWidth={6} />
            </div>
            <p className="text-[11px] text-[#9B9B9B] text-center max-w-[180px] leading-relaxed mt-2">
              {successScore > happinessScore + 20 ? '⚠️ Success metrics are outpacing personal wellbeing' : '✅ Happiness and career success are well aligned'}
            </p>
          </GlassCard>
        </div>

        {/* Life Stress Heatmap */}
        <div>
          <LifeStressHeatmap trendData={trendData30} />
        </div>

        {/* AI Insights + Correlations */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2 text-white bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-violet-400">🔗</span> Cross-Domain Insights
            </h3>
            <div className="space-y-4">
              {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
              {insights.length === 0 && (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-[#9B9B9B]">
                  <span className="block text-2xl mb-2">✨</span>No critical insights generated for this period.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2 text-white bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-cyan-400">🔄</span> Habit Correlations
            </h3>
            <div className="space-y-3">
              {correlations.map((corr, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className={`p-4 rounded-xl text-xs border ${
                    corr.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 
                    corr.type === 'negative' ? 'border-rose-500/20 bg-rose-500/[0.04]' : 
                    'border-white/[0.06] bg-white/[0.02]'
                  }`}>
                  <p className="text-[#EBEBEB] mb-3 text-[13px] leading-snug">{corr.pattern}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1.5">
                      {corr.domains.map(d => <span key={d} className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.06] text-[#9B9B9B] capitalize border border-white/[0.04]">{d}</span>)}
                    </div>
                    <span className="text-[10px] text-[#9B9B9B] font-medium">Strength: <span className={corr.type === 'positive' ? 'text-emerald-400' : corr.type === 'negative' ? 'text-rose-400' : 'text-white'}>{Math.round(corr.strength * 100)}%</span></span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Reflection */}
        <GlassCard className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-white">
              📝 Today's AI Reflection
            </h3>
            
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {[
                { cond: (h.sleepAvg || 0) < 6, t: '😴 Sleep deficit detected — prioritize 7+ hours tonight', f: '✅ Sleep pattern is healthy and consistent' },
                { cond: (h.stressLevel || 0) > 7, t: '😰 Stress is critically high — take a 15-min break now', f: '✅ Stress levels remain in a manageable range' },
                { cond: f.income > 0 && f.expenses / f.income > 0.9, t: '💸 Spending near income limit — review today\'s expenses', f: '✅ Financial discipline and savings look stable' },
                { cond: (c.studyHoursDaily || 0) + (c.codingHoursDaily || 0) > 10, t: '⚡ Long work hours detected — schedule a recovery block', f: '✅ Work-life balance is successfully maintained' },
                { cond: (h.waterIntake || 0) < 6, t: '💧 Below daily hydration target — drink water now', f: '✅ Hydration goals are currently on track' },
                { cond: (h.sleepAvg || 0) < 6, t: '🧠 Study efficiency LOW — sleep deficit limits retention', f: '🧠 Study efficiency HIGH — good sleep supports learning' },
              ].map((item, i) => {
                const isWarning = item.cond;
                const text = isWarning ? item.t : item.f;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`text-[11px] md:text-xs font-medium p-3.5 rounded-xl border ${
                      isWarning ? 'bg-amber-500/5 border-amber-500/20 text-amber-100' : 'bg-white/[0.02] border-white/[0.04] text-[#9B9B9B]'
                    }`}>
                    {text}
                  </motion.div>
                );
              })}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-white/[0.06]">
              <p className="text-[10px] text-[#52525b] uppercase tracking-wider font-medium">Auto-generated based on real-time data</p>
              <button onClick={() => setShowReportModal(true)} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] flex items-center justify-center gap-2">
                <span>📄</span> View Comprehensive Weekly Report
              </button>
            </div>
          </div>
        </GlassCard>

        {showReportModal && (
          <ReportCardModal 
            onClose={() => setShowReportModal(false)}
            data={{
              healthScore, financeScore, careerScore, balance, burnout,
              sleepAvg: h.sleepAvg,
              stressLevel: h.stressLevel,
              coachNote: (h.sleepAvg || 0) < 6 
                ? "I noticed a significant drop in your sleep quality this week, which correlates tightly with the spike in your stress levels. Next week, let's prioritize a hard cutoff time for work."
                : "You've maintained excellent balance this week! Your sleep schedule is supporting strong coding productivity.",
              actionItems: [
                (h.sleepAvg || 0) < 6 ? "Set a hard 'devices off' alarm for 10:00 PM." : "Maintain your current 7+ hour sleep routine.",
                (h.stressLevel || 0) > 7 ? "Schedule two 15-minute screen-free breaks during study blocks." : "Attempt one new advanced DSA problem daily.",
                f.income > 0 && f.expenses / f.income > 0.9 ? "Review dining subscriptions to cut discretionary spending by 10%." : "Transfer surplus funds to your emergency savings goal."
              ],
              patterns
            }}
          />
        )}
      </div>
    </div>
  );
}
