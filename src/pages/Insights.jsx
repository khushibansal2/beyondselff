import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateInsights, generateTrendData, generateCorrelations } from '../data/demoData';
import { GlassCard, PageHeader, InsightCard, ScoreRing, showToast } from '../components/ui/Components';
import AIExplainer from '../components/ui/AIExplainer';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';
import LifeStressHeatmap from '../components/ui/Heatmap';
import ReportCardModal from '../components/ui/ReportCardModal';

const severityConfig = {
  critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', badge: 'bg-red-500/15 text-red-300', pulse: 'bg-red-400', label: '🚨 Critical Pattern' },
  warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-300', pulse: 'bg-amber-400', label: '⚠️ Warning Pattern' },
  positive: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-300', pulse: 'bg-emerald-400', label: '✅ Positive Pattern' },
};

function PatternCard({ pattern, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = severityConfig[pattern.severity] || severityConfig.warning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }}
      className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}
    >
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0 mt-0.5">
              <span className="text-2xl">{pattern.icon || '⚡'}</span>
              {pattern.severity === 'critical' && (
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
          <span className="text-[#9B9B9B] text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="px-5 pb-5 space-y-4">
              {/* Description */}
              <div className="p-4 rounded-xl bg-black/20 border border-[rgba(255,255,255,0.04)]">
                <p className="text-xs text-[#EBEBEB] leading-relaxed mb-2">
                  <span className="font-semibold text-white block mb-1">Trigger: {pattern.trigger}</span>
                  {pattern.description || pattern.effect}
                </p>
                <p className="text-xs text-[#9B9B9B] italic border-t border-[rgba(255,255,255,0.04)] pt-2 mt-2">
                  Mechanism: {pattern.mechanism}
                </p>
              </div>

              {/* Explainable AI (Step 2.2 Integration) */}
              <AIExplainer insightData={pattern} />

              {/* Domain Tags */}
              <div className="flex items-center gap-2 pt-2 mt-1">
                <span className="text-[10px] text-slate-600">Domains affected:</span>
                {pattern.domains?.map(d => (
                  <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9B9B9B] capitalize">{d}</span>
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

  // Use deterministic cross-domain engine patterns directly (Step 2.3 & 2.5)
  const patterns = useMemo(() => {
    return (computed?.crossDomain || []).map(cd => ({
      ...cd,
      title: cd.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Cascade',
      icon: cd.severity === 'positive' ? '✅' : cd.severity === 'critical' ? '🚨' : '⚡',
      description: cd.effect,
      domains: [cd.from, cd.to],
      confidence: 100 // Deterministically computed
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
        <div className="bg-[#252525] border border-[rgba(255,255,255,0.06)] p-3 rounded-xl text-xs">
          <p className="text-[#9B9B9B] mb-1">{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed?.(1)}</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container min-h-screen">
      <PageHeader title="Cross-Domain Intelligence" subtitle="AI-explained patterns across your health, finances, and career." icon="🧠" />

      {/* 14-Day Pattern Report Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-5 rounded-lg border border-[rgba(255,255,255,0.055)]"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.05) 100%)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wider">Deterministic AI Analysis</span>
            </div>
            <h2 className="text-base font-bold">
              {patterns.length} Pattern{patterns.length !== 1 ? 's' : ''} Detected in Your Data
            </h2>
          </div>
          <div className="flex gap-3">
            {criticalCount > 0 && <div className="text-center"><p className="text-lg font-bold text-[#E03E3E]">{criticalCount}</p><p className="text-[9px] text-[#9B9B9B]">Critical</p></div>}
            {warningCount > 0 && <div className="text-center"><p className="text-lg font-bold text-[#D9730D]">{warningCount}</p><p className="text-[9px] text-[#9B9B9B]">Warnings</p></div>}
            {positiveCount > 0 && <div className="text-center"><p className="text-lg font-bold text-[#2E9E6B]">{positiveCount}</p><p className="text-[9px] text-[#9B9B9B]">Positive</p></div>}
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
            <p className="text-xs text-[#9B9B9B]">Your data looks balanced across all domains. Keep it up!</p>
          </GlassCard>
        ) : (
          patterns.map((p, i) => <PatternCard key={p.id} pattern={p} index={i} />)
        )}
      </div>

      {/* Scores + Burnout */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="flex flex-col items-center gap-3" glow="glow-purple">
          <ScoreRing score={balance} color="auto" label="Life Balance" size={100} strokeWidth={7} />
          <p className="text-xs text-[#9B9B9B] text-center">{balance >= 75 ? 'Excellent balance' : balance >= 50 ? 'Needs attention in weak areas' : 'Significant imbalance detected'}</p>
        </GlassCard>
        <GlassCard className={`flex flex-col items-center gap-3 ${burnout > 60 ? 'glow-rose' : ''}`}>
          <ScoreRing score={burnout} color={burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981'} label="Burnout Risk" size={100} strokeWidth={7} />
          <p className="text-xs text-[#9B9B9B] text-center">{burnout > 60 ? '🚨 Immediate action required' : burnout > 30 ? '⚠️ Monitor and prevent' : '✅ Sustainable pace'}</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            <ScoreRing score={happinessScore} color="#f59e0b" label="Happiness" size={80} strokeWidth={6} />
            <ScoreRing score={successScore} color="#3b82f6" label="Success" size={80} strokeWidth={6} />
          </div>
          <p className="text-xs text-[#9B9B9B] text-center">{successScore > happinessScore + 20 ? '⚠️ Success outpacing happiness' : '✅ Happiness and success aligned'}</p>
        </GlassCard>
      </div>

      {/* AI Insights + Correlations */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            🔗 Cross-Domain Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-4 rounded-xl bg-[#252525] text-center text-xs text-[#9B9B9B]">
                <span className="block text-2xl mb-2">✨</span>No critical insights right now.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            🔄 Habit Correlations
          </h3>
          <div className="space-y-3">
            {correlations.map((corr, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-xl text-xs border ${corr.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : corr.type === 'negative' ? 'border-red-500/20 bg-red-500/5' : 'border-slate-500/20 bg-slate-500/5'}`}>
                <p className="text-[#EBEBEB] mb-2">{corr.pattern}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">{corr.domains.map(d => <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#9B9B9B] capitalize">{d}</span>)}</div>
                  <span className="text-[10px] text-[#9B9B9B]">Strength: {Math.round(corr.strength * 100)}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Life Stress Heatmap */}
      <div className="mb-6">
        <LifeStressHeatmap trendData={trendData30} />
      </div>

      {/* Daily Reflection */}
      <GlassCard glow="glow-cyan">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">📝 Today's AI Reflection</h3>
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
              className="text-xs text-[#9B9B9B] p-3 rounded-xl bg-[#252525] border border-white/[0.04]">{r}</motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">Analysis based on your data patterns</p>
          <button onClick={() => setShowReportModal(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20 flex items-center gap-2">
            <span>📄</span> View Weekly Report Card
          </button>
        </div>
      </GlassCard>

      {showReportModal && (
        <ReportCardModal 
          onClose={() => setShowReportModal(false)}
          data={{
            healthScore,
            financeScore,
            careerScore,
            balance,
            burnout,
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
  );
}
