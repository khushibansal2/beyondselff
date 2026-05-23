import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { runAISimulation, computeBaselineScores } from '../services/simulatorService';
import { GlassCard, PageHeader, ScoreRing } from '../components/ui/Components';
import {
  Brain, Sparkles, ChevronRight, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, RotateCcw, Clock, Zap, Info,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ReferenceLine, Dot,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  'What if I leave my job due to health reasons?',
  'What if I start investing ₹10k monthly?',
  'What if I work overtime for 6 months to get promoted?',
  'What if I sleep 8 hours every night?',
  'What if I prepare for UPSC for 1 year?',
  'What if I switch careers to AI engineering?',
  'What if I stop going to the gym to save money?',
  'What if I take a 3-month unpaid sabbatical?',
];

const DOMAIN_STYLE = {
  health:    { color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  finance:   { color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'   },
  career:    { color: '#6366f1', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400'  },
  wellbeing: { color: '#8b5cf6', bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400'  },
};

const MAGNITUDE_COLOR = {
  low:      'text-[#71717a]',
  medium:   'text-amber-400',
  high:     'text-orange-400',
  critical: 'text-red-400',
};

const LOADING_STEPS = [
  'Interpreting scenario context…',
  'Analyzing cross-domain dependencies…',
  'Projecting timeline outcomes…',
  'Evaluating trade-offs and risks…',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function DeltaBadge({ delta }) {
  if (delta > 0)  return <span className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-bold"><TrendingUp size={11} />+{delta}</span>;
  if (delta < 0)  return <span className="flex items-center gap-0.5 text-red-400 text-[11px] font-bold"><TrendingDown size={11} />{delta}</span>;
  return               <span className="flex items-center gap-0.5 text-[#71717a] text-[11px]"><Minus size={11} />0</span>;
}

function ConfidenceMeter({ value }) {
  const high   = value >= 75;
  const medium = value >= 55;
  const color  = high ? '#10b981' : medium ? '#f59e0b' : '#ef4444';
  const label  = high ? 'High confidence' : medium ? 'Medium confidence' : 'Low confidence';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-[#52525b] uppercase tracking-wider">Prediction Confidence</span>
        <span className="text-[12px] font-bold" style={{ color }}>{value}% — {label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}60, ${color})` }}
        />
      </div>
    </div>
  );
}

function ImpactCard({ impact, delay }) {
  const ds = DOMAIN_STYLE[impact.domain] ?? DOMAIN_STYLE.wellbeing;
  const DirIcon = impact.direction === 'positive' ? TrendingUp : impact.direction === 'negative' ? TrendingDown : Minus;
  const dirColor = impact.direction === 'positive' ? 'text-emerald-400' : impact.direction === 'negative' ? 'text-red-400' : 'text-[#71717a]';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-3.5 rounded-2xl border ${ds.bg} ${ds.border}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${ds.text}`}>{impact.domain}</span>
          <span className="text-[#3f3f46]">·</span>
          <span className="text-[11px] text-[#a1a1aa] font-medium">{impact.metric}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium capitalize ${MAGNITUDE_COLOR[impact.magnitude] ?? 'text-[#71717a]'}`}>{impact.magnitude}</span>
          <DirIcon size={13} className={dirColor} />
        </div>
      </div>
      <p className="text-[11px] text-[#71717a] leading-relaxed">{impact.detail}</p>
    </motion.div>
  );
}


// ── Timeline Chart ────────────────────────────────────────────────────────────

const CHART_LINES = [
  { key: 'health',    color: '#10b981', label: 'Health'    },
  { key: 'finance',   color: '#f59e0b', label: 'Finance'   },
  { key: 'career',    color: '#6366f1', label: 'Career'    },
  { key: 'wellbeing', color: '#8b5cf6', label: 'Wellbeing' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0f]/90 backdrop-blur-xl px-4 py-3 shadow-xl">
      <p className="text-[11px] font-semibold text-[#a1a1aa] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[11px] mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#71717a] capitalize w-16">{p.dataKey}</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ result }) {
  const [activePeriod, setActivePeriod] = useState(0);

  // Build chart data — use AI scoreTimeline if present, else interpolate
  const chartData = (() => {
    if (result.scoreTimeline?.length >= 2) return result.scoreTimeline;
    // Fallback: linear interpolation from baseline → projected over 6 points
    const b = result.scores.baseline;
    const p = result.scores.projected;
    const periods = ['Now', '1 month', '3 months', '6 months', '1 year', '2 years', '5 years'];
    const labels  = ['Now', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
    const weights = [0, 0.1, 0.25, 0.5, 1, 1.3, 1.6];
    return periods.map((period, i) => ({
      period, label: labels[i],
      health:    Math.round(b.health    + (p.health    - b.health)    * weights[i]),
      finance:   Math.round(b.finance   + (p.finance   - b.finance)   * weights[i]),
      career:    Math.round(b.career    + (p.career    - b.career)    * weights[i]),
      wellbeing: Math.round(b.wellbeing + (p.wellbeing - b.wellbeing) * weights[i]),
    }));
  })();

  const selected  = chartData[activePeriod] ?? chartData[0];
  // match timeline events to selected period (skip index 0 = baseline)
  const eventIdx  = activePeriod > 0 ? activePeriod - 1 : null;
  const events    = eventIdx !== null ? result.timeline?.[eventIdx]?.events ?? [] : null;
  const baseline  = chartData[0];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-5">
        <Clock size={14} className="text-[#71717a]" />
        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Future Score Projection</h3>
      </div>

      {/* Period selector tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {chartData.map((d, i) => (
          <button
            key={i}
            onClick={() => setActivePeriod(i)}
            className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
              activePeriod === i
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'border-white/[0.06] bg-white/[0.02] text-[#52525b] hover:text-[#a1a1aa] hover:border-white/[0.10]'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Score badges for selected period */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {CHART_LINES.map(({ key, color, label }) => {
          const val   = selected[key] ?? 0;
          const delta = val - (baseline[key] ?? 0);
          return (
            <div key={key} className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] text-center">
              <p className="text-[11px] text-[#52525b] mb-1">{label}</p>
              <p className="text-[20px] font-bold leading-none" style={{ color }}>{val}</p>
              {activePeriod > 0 && (
                <p className={`text-[10px] font-semibold mt-1 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-[#71717a]'}`}>
                  {delta > 0 ? '+' : ''}{delta}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Line chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#52525b', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#52525b', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={selected.label}
              stroke="rgba(99,102,241,0.3)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            {CHART_LINES.map(({ key, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2.5}
                dot={(props) => {
                  const isActive = props.payload?.label === selected.label;
                  return isActive
                    ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill={color} stroke={color} strokeWidth={2} />
                    : <circle key={props.key} cx={props.cx} cy={props.cy} r={2.5} fill={color} opacity={0.6} />;
                }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Events for selected period */}
      {events && events.length > 0 && (
        <motion.div
          key={activePeriod}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-white/[0.05]"
        >
          <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-2.5">
            What happens at {selected.period}:
          </p>
          <ul className="space-y-1.5">
            {events.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#71717a] leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/50 flex-shrink-0" />
                {ev}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </GlassCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Simulator() {
  const { health, finance, career } = useData();

  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const textareaRef = useRef(null);
  const resultsRef  = useRef(null);

  const baseline = computeBaselineScores(health, finance, career);

  async function handleSimulate() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedStep(null);

    try {
      const res = await runAISimulation(input.trim(), { health, finance, career });
      setResult(res);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (err) {
      const msg = err.message ?? 'Unknown error';
      if (msg === 'NO_KEY')              setError('No API key found. Add VITE_GROQ_API_KEY to your .env file.');
      else if (msg.includes('429'))      setError('Rate limit reached. Wait a minute and try again.');
      else if (msg.includes('401'))      setError('Invalid API key. Check your VITE_GROQ_API_KEY.');
      else                               setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput('');
    setResult(null);
    setError(null);
    setExpandedStep(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-container min-h-screen pb-20">
      <PageHeader
        title="AI Life Simulator"
        subtitle="Describe any life decision in plain language. The AI simulates its effects across health, finance, and career."
        icon="🔮"
      />

      {/* ── Scenario Input ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Brain size={15} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#f0f0f3]">What decision do you want to simulate?</p>
              <p className="text-[11px] text-[#52525b]">Type any life scenario in natural language</p>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSimulate(); }}
            placeholder="e.g. What if I quit my job to prepare for UPSC for 1 year?"
            rows={3}
            className="input-premium w-full resize-none text-[14px] leading-relaxed mb-4"
            style={{ minHeight: '88px' }}
          />

          {/* Example chips */}
          <div className="mb-5">
            <p className="text-[11px] text-[#3f3f46] font-medium mb-2">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                  className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#52525b] hover:text-[#a1a1aa] hover:border-white/[0.10] hover:bg-white/[0.04] transition-all"
                >
                  {ex.length > 45 ? ex.slice(0, 45) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#3f3f46]">Ctrl + Enter to simulate</p>
            <div className="flex gap-2.5">
              {(result || input) && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-[12px] px-3.5 py-2 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] hover:border-white/[0.10] transition-all"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              <button
                onClick={handleSimulate}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 text-[13px] px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: input.trim() && !loading ? '0 0 24px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Simulating…</>
                  : <><Sparkles size={14} />Simulate</>}
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Loading ── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.03]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-400/60 border-t-indigo-400 animate-spin" />
                <p className="text-[13px] font-semibold text-[#f0f0f3]">AI reasoning through your scenario…</p>
              </div>
              <div className="space-y-2.5">
                {LOADING_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.45 }}
                    className="flex items-center gap-2.5 text-[12px] text-[#52525b]"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 flex-shrink-0" />
                    {step}
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            <GlassCard className="border border-red-500/20 bg-red-500/[0.04]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-red-300 mb-1">Simulation failed</p>
                  <p className="text-[12px] text-[#71717a] font-mono break-all">{error}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ── */}
      <AnimatePresence>
        {result && (
          <motion.div ref={resultsRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* 1. Summary + Confidence */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
              <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] px-2.5 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 font-semibold uppercase tracking-wider">
                    {result.scenarioType}
                  </span>
                </div>
                <h2 className="text-[17px] font-bold text-[#f0f0f3] mb-2 leading-snug">{result.scenarioTitle}</h2>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-4">{result.summary}</p>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Info size={11} className="text-[#52525b]" />
                    <p className="text-[11px] text-[#52525b] font-medium uppercase tracking-wider">AI Interpretation</p>
                  </div>
                  <p className="text-[12px] text-[#71717a] leading-relaxed">{result.interpretation}</p>
                </div>

                <ConfidenceMeter value={result.confidence} />
              </GlassCard>
            </motion.div>

            {/* 2. Score Comparison */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <div className="grid grid-cols-2 gap-4">
                {/* Baseline */}
                <GlassCard>
                  <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider text-center mb-5">Baseline (Now)</p>
                  <div className="flex justify-around flex-wrap gap-y-3">
                    {Object.entries(result.scores.baseline).map(([d, s]) => (
                      <ScoreRing key={d} score={s} color={DOMAIN_STYLE[d]?.color ?? '#6366f1'}
                        label={d.charAt(0).toUpperCase() + d.slice(1)} size={70} />
                    ))}
                  </div>
                </GlassCard>

                {/* Projected */}
                <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                  <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider text-center mb-5">Projected (1 year)</p>
                  <div className="flex justify-around flex-wrap gap-y-3">
                    {Object.entries(result.scores.projected).map(([d, s]) => {
                      const delta = s - result.scores.baseline[d];
                      return (
                        <div key={d} className="flex flex-col items-center gap-1">
                          <ScoreRing score={s} color={DOMAIN_STYLE[d]?.color ?? '#6366f1'}
                            label={d.charAt(0).toUpperCase() + d.slice(1)} size={70} />
                          <DeltaBadge delta={delta} />
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>
            </motion.div>

            {/* 3. Impact Matrix */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
              <GlassCard>
                <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Cross-Domain Impact Analysis</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(result.impacts ?? []).map((impact, i) => (
                    <ImpactCard key={i} impact={impact} delay={0.13 + i * 0.05} />
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* 4. Timeline Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <TimelineChart result={result} />
            </motion.div>

            {/* 5. Trade-offs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <GlassCard className="border border-emerald-500/15 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <h3 className="text-[13px] font-semibold text-emerald-300">Advantages</h3>
                  </div>
                  <ul className="space-y-2">
                    {(result.tradeoffs?.pros ?? []).map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#a1a1aa] leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                <GlassCard className="border border-red-500/15 bg-red-500/[0.02]">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-red-400" />
                    <h3 className="text-[13px] font-semibold text-red-300">Risks & Trade-offs</h3>
                  </div>
                  <ul className="space-y-2">
                    {(result.tradeoffs?.cons ?? []).map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#a1a1aa] leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            </motion.div>

            {/* 6. Reasoning Chain */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={14} className="text-purple-400" />
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI Reasoning Chain</h3>
                  <span className="text-[11px] text-[#52525b]">— click any step to expand</span>
                </div>
                <div className="space-y-2">
                  {(result.reasoning ?? []).map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 + i * 0.07 }}>
                      <button
                        onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left"
                      >
                        <span className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {step.step}
                        </span>
                        <span className="flex-1 text-[12px] font-medium text-[#a1a1aa]">{step.title}</span>
                        <ChevronRight size={12} className={`text-[#52525b] transition-transform duration-200 ${expandedStep === i ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {expandedStep === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pt-2.5 pb-3 text-[12px] text-[#71717a] leading-relaxed border-l-2 border-purple-500/20 ml-3 mt-1">
                              {step.detail}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* 7. Warnings */}
            {result.warnings?.length > 0 && result.warnings[0] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
                <GlassCard className="border border-amber-500/20 bg-amber-500/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <h3 className="text-[13px] font-semibold text-amber-300">Important Warnings</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#a1a1aa] leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            )}

            {/* 8. Recommendations */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
              <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-indigo-400" />
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI Recommendations</h3>
                </div>
                <div className="space-y-2.5">
                  {(result.recommendations ?? []).map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.38 + i * 0.07 }}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/[0.08]"
                    >
                      <span className="text-[11px] font-bold text-indigo-400/70 mt-0.5 flex-shrink-0 font-mono">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{rec}</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-[#3f3f46] pb-4">
              AI predictions are probabilistic estimates, not guarantees. Results depend on many real-world factors.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!result && !loading && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="text-center py-14">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">🔮</span>
            </div>
            <h3 className="text-[15px] font-semibold text-[#f0f0f3] mb-2">Your AI Digital Twin</h3>
            <p className="text-[13px] text-[#71717a] max-w-sm mx-auto leading-relaxed mb-8">
              Type any life decision above. The AI reads your real profile data and simulates how that choice would unfold across health, finances, and career.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              {[
                { icon: '🧠', title: 'AI Reasoning',    desc: 'Step-by-step causal chain' },
                { icon: '📅', title: 'Timeline View',   desc: '1 month → 5 year projection' },
                { icon: '⚖️', title: 'Trade-off Matrix', desc: 'Pros, cons & warnings' },
              ].map(f => (
                <div key={f.title} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <span className="text-xl block mb-1.5">{f.icon}</span>
                  <p className="text-[12px] font-semibold text-[#a1a1aa]">{f.title}</p>
                  <p className="text-[11px] text-[#52525b] mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Current baseline display */}
            <div className="mt-8 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] max-w-sm mx-auto">
              <p className="text-[11px] text-[#52525b] font-medium uppercase tracking-wider mb-4">Your Current Baseline</p>
              <div className="flex justify-around">
                {Object.entries(baseline).map(([d, s]) => (
                  <ScoreRing key={d} score={s} color={DOMAIN_STYLE[d]?.color ?? '#6366f1'}
                    label={d.charAt(0).toUpperCase() + d.slice(1)} size={60} />
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
