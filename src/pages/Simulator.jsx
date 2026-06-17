import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { runAISimulation, computeBaselineScores } from '../services/simulatorService';
import { trainWhatIfModel, predictWhatIf } from '../services/whatIfService';
import { GlassCard, PageHeader, ScoreRing } from '../components/ui/Components';
import {
  Brain, Sparkles, ChevronRight, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, RotateCcw, Clock, Zap, Info,
  GitCompare, FlaskConical, Sliders, RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ReferenceLine, Dot,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
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
        <span className="text-[11px] font-medium text-[#71717a] uppercase tracking-wider">Prediction Confidence</span>
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
          <span className="text-[#6b7280]">·</span>
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

// ── Side-by-Side Comparison Panel ────────────────────────────────────────────

function ScoreDeltaCell({ domain, scoreA, scoreB, baseline }) {
  const ds     = DOMAIN_STYLE[domain] ?? DOMAIN_STYLE.wellbeing;
  const deltaA = scoreA - (baseline[domain] ?? 0);
  const deltaB = scoreB - (baseline[domain] ?? 0);
  const winner = deltaA > deltaB ? 'A' : deltaB > deltaA ? 'B' : null;
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2.5 border-b border-white/[0.04]">
      <div className="text-center">
        <p className="text-[18px] font-black" style={{ color: ds.color }}>{scoreA}</p>
        <p className={`text-[10px] font-bold ${deltaA > 0 ? 'text-emerald-400' : deltaA < 0 ? 'text-red-400' : 'text-[#71717a]'}`}>
          {deltaA > 0 ? '+' : ''}{deltaA}
        </p>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-semibold capitalize ${ds.text}`}>{domain}</p>
        {winner && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${winner === 'A' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
            {winner} wins
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-[18px] font-black" style={{ color: ds.color }}>{scoreB}</p>
        <p className={`text-[10px] font-bold ${deltaB > 0 ? 'text-emerald-400' : deltaB < 0 ? 'text-red-400' : 'text-[#71717a]'}`}>
          {deltaB > 0 ? '+' : ''}{deltaB}
        </p>
      </div>
    </div>
  );
}

function SideBySidePanel({ resultA, resultB, inputA, inputB, baseline }) {
  const domains = Object.keys(resultA.scores.projected);

  // Overall score = sum of projected scores
  const totalA = domains.reduce((s, d) => s + (resultA.scores.projected[d] ?? 0), 0);
  const totalB = domains.reduce((s, d) => s + (resultB.scores.projected[d] ?? 0), 0);
  const overallWinner = totalA > totalB ? 'A' : totalB > totalA ? 'B' : null;

  return (
    <GlassCard className="border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <GitCompare size={15} className="text-indigo-400" />
        <h3 className="text-[14px] font-bold text-[#f0f0f3]">Side-by-Side Comparison</h3>
        {overallWinner && (
          <span className={`ml-auto text-[11px] px-3 py-1 rounded-full font-bold border ${
            overallWinner === 'A'
              ? 'bg-blue-500/15 border-blue-500/25 text-blue-300'
              : 'bg-purple-500/15 border-purple-500/25 text-purple-300'
          }`}>
            Scenario {overallWinner} recommended
          </span>
        )}
      </div>

      {/* Scenario labels */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-center">
          <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Scenario A</p>
          <p className="text-[11px] text-[#a1a1aa] leading-snug line-clamp-2">{inputA}</p>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-[11px] text-[#71717a] font-bold">VS</span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/15 text-center">
          <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">Scenario B</p>
          <p className="text-[11px] text-[#a1a1aa] leading-snug line-clamp-2">{inputB}</p>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        <p className="text-[10px] text-blue-400 font-semibold text-center">A — Projected</p>
        <p className="text-[10px] text-[#71717a] font-semibold text-center">Domain</p>
        <p className="text-[10px] text-purple-400 font-semibold text-center">B — Projected</p>
      </div>

      {/* Score rows */}
      <div className="mb-4">
        {domains.map(d => (
          <ScoreDeltaCell
            key={d}
            domain={d}
            scoreA={resultA.scores.projected[d] ?? 0}
            scoreB={resultB.scores.projected[d] ?? 0}
            baseline={baseline}
          />
        ))}
        {/* Total row */}
        <div className="grid grid-cols-3 items-center gap-2 pt-3">
          <p className="text-center text-[16px] font-black text-[#f0f0f3]">{totalA}</p>
          <p className="text-center text-[10px] text-[#71717a] font-semibold uppercase tracking-wider">Total Score</p>
          <p className="text-center text-[16px] font-black text-[#f0f0f3]">{totalB}</p>
        </div>
      </div>

      {/* Trade-offs A vs B */}
      <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/[0.05] pt-4">
        <div>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">Scenario A — Risks</p>
          <ul className="space-y-1.5">
            {(resultA.tradeoffs?.cons ?? []).slice(0, 3).map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#71717a]">
                <span className="mt-1 w-1 h-1 rounded-full bg-red-500/50 flex-shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-2">Scenario B — Risks</p>
          <ul className="space-y-1.5">
            {(resultB.tradeoffs?.cons ?? []).slice(0, 3).map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#71717a]">
                <span className="mt-1 w-1 h-1 rounded-full bg-red-500/50 flex-shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Confidence */}
      <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/[0.05] pt-4">
        <div className="text-center">
          <p className="text-[11px] text-[#71717a] mb-1">Confidence A</p>
          <p className="text-[18px] font-bold" style={{ color: resultA.confidence >= 75 ? '#10b981' : resultA.confidence >= 55 ? '#f59e0b' : '#ef4444' }}>
            {resultA.confidence}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-[#71717a] mb-1">Confidence B</p>
          <p className="text-[18px] font-bold" style={{ color: resultB.confidence >= 75 ? '#10b981' : resultB.confidence >= 55 ? '#f59e0b' : '#ef4444' }}>
            {resultB.confidence}%
          </p>
        </div>
      </div>
    </GlassCard>
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
                : 'border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:text-[#a1a1aa] hover:border-white/[0.10]'
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
              <p className="text-[11px] text-[#71717a] mb-1">{label}</p>
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
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#71717a', fontSize: 10 }}
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
          <p className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider mb-2.5">
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

// ── ML What-If constants ──────────────────────────────────────────────────────

const ML_SLIDERS = [
  { key: 'sleep_hours',     label: 'Sleep',          unit: 'hrs',  min: 3,    max: 10,  step: 0.5, color: '#6366f1', icon: '😴' },
  { key: 'stress_level',    label: 'Stress',         unit: '/10',  min: 1,    max: 10,  step: 0.5, color: '#ef4444', icon: '😤' },
  { key: 'workout_minutes', label: 'Workout',         unit: 'min',  min: 0,    max: 120, step: 5,   color: '#10b981', icon: '🏃' },
  { key: 'study_hours',     label: 'Study',          unit: 'hrs',  min: 0,    max: 12,  step: 0.5, color: '#3b82f6', icon: '📚' },
  { key: 'spending_ratio',  label: 'Spending',       unit: '%',    min: 0.1,  max: 1,   step: 0.05,color: '#f59e0b', icon: '💸' },
  { key: 'mood_score',      label: 'Mood',           unit: '/10',  min: 1,    max: 10,  step: 0.5, color: '#8b5cf6', icon: '😊' },
];

const ML_DEFAULT = { sleep_hours:7, stress_level:5, workout_minutes:30, study_hours:3, spending_ratio:0.7, mood_score:6 };

const ML_DOMAINS = [
  { key: 'health_score',  label: 'Health',  color: '#10b981', icon: '❤️' },
  { key: 'finance_score', label: 'Finance', color: '#f59e0b', icon: '💰' },
  { key: 'career_score',  label: 'Career',  color: '#6366f1', icon: '🚀' },
];

// ── ML What-If panel ──────────────────────────────────────────────────────────

function MLWhatIfPanel({ health, finance, career, baseline }) {
  const [params, setParams]         = useState(ML_DEFAULT);
  const [trainResult, setTrainResult] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [training, setTraining]     = useState(false);
  const [predicting, setPredicting] = useState(false);
  const debounceRef                 = useRef(null);

  // Auto-train on first mount
  useEffect(() => {
    let cancelled = false;
    async function autoTrain() {
      setTraining(true);
      const res = await trainWhatIfModel(health || [], finance || [], career || []);
      if (!cancelled) {
        setTrainResult(res);
        setTraining(false);
        // Immediately predict with defaults
        const pred = await predictWhatIf(ML_DEFAULT);
        if (!cancelled) setPrediction(pred);
      }
    }
    autoTrain();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runPredict = useCallback(async (p) => {
    setPredicting(true);
    const res = await predictWhatIf(p);
    setPrediction(res);
    setPredicting(false);
  }, []);

  const updateParam = (key, val) => {
    const next = { ...params, [key]: val };
    setParams(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPredict(next), 280);
  };

  // Radar: baseline vs prediction
  const radarData = ML_DOMAINS.map(d => ({
    domain: d.label,
    Baseline: baseline[d.key.replace('_score', '')] ?? 50,
    'ML Prediction': prediction?.predictions?.[d.key] ?? (baseline[d.key.replace('_score', '')] ?? 50),
  }));

  const sCard = { background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Status pill */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', ...sCard }}>
        {training ? (
          <>
            <div style={{ width:12, height:12, border:'2px solid rgba(168,85,247,0.4)', borderTopColor:'#a855f7', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
            <span style={{ fontSize:12, color:'#94a3b8' }}>Training Ridge Regression model on your data…</span>
          </>
        ) : trainResult?.trained ? (
          <>
            <span style={{ fontSize:14 }}>✅</span>
            <span style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>Model ready</span>
            <span style={{ fontSize:11, color:'#475569' }}>·</span>
            <span style={{ fontSize:11, color:'#475569' }}>{trainResult.sample_count} samples</span>
            {trainResult.user_records > 0 && (
              <><span style={{ fontSize:11, color:'#475569' }}>·</span>
              <span style={{ fontSize:11, color:'#6366f1' }}>{trainResult.user_records} from your history</span></>
            )}
            {trainResult.offline && (
              <><span style={{ fontSize:11, color:'#475569' }}>·</span>
              <span style={{ fontSize:11, color:'#f59e0b' }}>offline mode</span></>
            )}
            <div style={{ marginLeft:'auto', display:'flex', gap:12 }}>
              {ML_DOMAINS.map(d => {
                const acc = trainResult?.accuracy?.[d.key] ?? 0;
                const pct = Math.round(acc * 100);
                const c = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <span key={d.key} style={{ fontSize:11, color:c, fontWeight:700 }}>
                    {d.label} R²{pct}%
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <span style={{ fontSize:12, color:'#64748b' }}>Initializing model…</span>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        {/* Left: Sliders */}
        <div style={{ ...sCard, padding:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>Adjust Scenario</p>
            <button
              onClick={() => { setParams(ML_DEFAULT); runPredict(ML_DEFAULT); }}
              style={{ fontSize:11, color:'#475569', background:'none', border:'none', cursor:'pointer' }}
            >
              Reset
            </button>
          </div>
          {ML_SLIDERS.map(({ key, label, unit, min, max, step, color, icon }) => {
            const val = params[key];
            const pct = ((val - min) / (max - min)) * 100;
            const display = key === 'spending_ratio' ? `${Math.round(val * 100)}%` : val;
            return (
              <div key={key} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color }}>{display}{key !== 'spending_ratio' ? ` ${unit}` : ''}</span>
                </div>
                <div style={{ position:'relative', height:6, borderRadius:3, background:'rgba(255,255,255,0.07)' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, borderRadius:3, background:color, boxShadow:`0 0 8px ${color}50`, transition:'width 0.1s' }} />
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => updateParam(key, parseFloat(e.target.value))}
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', zIndex:1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Predictions + Radar */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Score cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {ML_DOMAINS.map(d => {
              const baseKey = d.key.replace('_score', '');
              const base = baseline[baseKey] ?? 50;
              const pred = prediction?.predictions?.[d.key];
              const delta = pred != null ? Math.round(pred - base) : 0;
              return (
                <div key={d.key} style={{ ...sCard, padding:'14px', textAlign:'center' }}>
                  <span style={{ fontSize:16 }}>{d.icon}</span>
                  <p style={{ fontSize:10, color:'#475569', margin:'4px 0 2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{d.label}</p>
                  <AnimatePresence mode="wait">
                    <motion.p key={pred ?? base}
                      initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
                      transition={{ duration:0.15 }}
                      style={{ fontSize:26, fontWeight:900, color:d.color, margin:0 }}>
                      {predicting ? '…' : Math.round(pred ?? base)}
                    </motion.p>
                  </AnimatePresence>
                  {pred != null && (
                    <p style={{ fontSize:11, fontWeight:700, color: delta>0?'#10b981':delta<0?'#ef4444':'#64748b' }}>
                      {delta>0?'+':''}{delta} vs now
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Radar */}
          <div style={{ ...sCard, padding:'14px', flex:1 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>Baseline vs Prediction</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} outerRadius={72}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill:'#94a3b8', fontSize:11, fontWeight:600 }} />
                <Radar name="Baseline" dataKey="Baseline" stroke="#475569" fill="#47556920" strokeWidth={1.5} />
                <Radar name="ML Prediction" dataKey="ML Prediction" stroke="#8b5cf6" fill="#8b5cf615" strokeWidth={2} dot={{ r:3, fill:'#8b5cf6' }} />
                <Tooltip contentStyle={{ background:'#0f1224', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      {prediction && (
        <div style={{ ...sCard, padding:'12px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Model Confidence
            </span>
            {ML_DOMAINS.map(d => {
              const conf = prediction.confidence?.[d.key] ?? 0;
              const pct = Math.round(conf * 100);
              const c = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <div key={d.key} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11, color:'#64748b' }}>{d.label}</span>
                  <div style={{ width:60, height:4, borderRadius:2, background:'rgba(255,255,255,0.07)' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6 }}
                      style={{ height:'100%', borderRadius:2, background:c }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:c }}>{pct}%</span>
                </div>
              );
            })}
            <span style={{ marginLeft:'auto', fontSize:10, color:'#334155' }}>
              {prediction.model === 'ridge_regression' ? '🤖 Ridge Regression' : prediction.offline ? '⚡ Offline engine' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Simulator() {
  const { health, finance, career, records, simulatorState, updateSimulatorState } = useData();

  const [input,        setInput]        = useState(simulatorState?.input || '');
  const [inputB,       setInputB]       = useState(simulatorState?.inputB || '');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(simulatorState?.result || null);
  const [resultB,      setResultB]      = useState(simulatorState?.resultB || null);
  const [error,        setError]        = useState(null);
  const [expandedStep, setExpandedStep] = useState(simulatorState?.expandedStep || null);
  const [compareMode,  setCompareMode]  = useState(simulatorState?.compareMode || false);

  // Sync back to global context when state changes
  useEffect(() => {
    updateSimulatorState({ input, inputB, result, resultB, compareMode, expandedStep });
  }, [input, inputB, result, resultB, compareMode, expandedStep, updateSimulatorState]);

  const textareaRef = useRef(null);
  const resultsRef  = useRef(null);

  const baseline = computeBaselineScores(health, finance, career);

  function parseError(err) {
    const msg = err.message ?? 'Unknown error';
    if (msg === 'NO_KEY')         return 'No API key found. Add VITE_GROQ_API_KEY to your .env file.';
    if (msg.includes('429'))      return 'Rate limit reached. Wait a minute and try again.';
    if (msg.includes('401'))      return 'Invalid API key. Check your VITE_GROQ_API_KEY.';
    return msg;
  }

  async function handleSimulate() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResultB(null);
    setExpandedStep(null);

    try {
      if (compareMode && inputB.trim()) {
        // Run both in parallel
        const [resA, resB] = await Promise.all([
          runAISimulation(input.trim(),  { health, finance, career }),
          runAISimulation(inputB.trim(), { health, finance, career }),
        ]);
        setResult(resA);
        setResultB(resB);
      } else {
        const res = await runAISimulation(input.trim(), { health, finance, career });
        setResult(res);
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput('');
    setInputB('');
    setResult(null);
    setResultB(null);
    setError(null);
    setExpandedStep(null);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const QUICK_TAGS = [
    { label: 'Popular Ideas', scenario: '' },
    { label: 'UPSC',          scenario: 'What if I quit my job for UPSC preparation?' },
    { label: 'Career Switch', scenario: 'What if I switch careers to AI engineering?' },
    { label: 'Move Abroad',   scenario: 'What if I move abroad for better opportunities?' },
    { label: 'Start Startup', scenario: 'What if I start my own startup?' },
    { label: 'Masters Degree',scenario: 'What if I pursue a Masters degree abroad?' },
    { label: 'Remote Job',    scenario: 'What if I take a fully remote job?' },
  ];

  const SIM_DOMAINS = [
    { key: 'health',    icon: '❤️',  label: 'Health',    color: '#10b981' },
    { key: 'finance',   icon: '💰',  label: 'Finance',   color: '#f59e0b' },
    { key: 'career',    icon: '💼',  label: 'Career',    color: '#6366f1' },
    { key: 'wellbeing', icon: '🌿',  label: 'Wellbeing', color: '#8b5cf6' },
  ];

  const getTrend = delta => {
    if (delta >= 12) return { arrows: '↑↑', label: 'Improves',  color: '#10b981' };
    if (delta >  0)  return { arrows: '↑',  label: 'Improves',  color: '#10b981' };
    if (delta === 0) return { arrows: '↔',  label: 'Stable',    color: '#64748b' };
    if (delta > -12) return { arrows: '↓',  label: 'Declines',  color: '#f43f5e' };
    return               { arrows: '↓↓', label: 'Declines',  color: '#f43f5e' };
  };

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'ml'

  // ── Render ──────────────────────────────────────────────────────────────────

  const sCard = { background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 };

  return (
    <div style={{padding:'18px 24px 32px', minHeight:'100vh'}}>
      {/* Header */}
      <div style={{marginBottom:14}}>
        <h1 style={{fontSize:22, fontWeight:800, color:'#f0f0f3', margin:0}}>🔮 AI Life Simulator</h1>
        <p style={{fontSize:12, color:'#71717a', marginTop:3}}>Test a life decision before making it. See how it affects your future across Health, Finance, Career and Wellbeing.</p>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display:'flex', gap:4, padding:4, borderRadius:12, width:'fit-content', marginBottom:16, background:'rgba(255,255,255,0.04)' }}>
        {[
          { id:'ai', label:'🔮 AI Scenario' },
          { id:'ml', label:'🧪 ML What-If' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding:'7px 18px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.15s',
              background: activeTab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: activeTab === t.id ? '#fff' : '#64748b',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ML What-If tab ── */}
      {activeTab === 'ml' && (
        <MLWhatIfPanel
          health={records?.health}
          finance={records?.finance}
          career={records?.career}
          baseline={{ health: baseline.health ?? 50, finance: baseline.finance ?? 50, career: baseline.career ?? 50 }}
        />
      )}

      {/* ── AI Scenario tab ── */}
      {activeTab === 'ai' && (<>

      {/* ── Search bar ── */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12, background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px 12px 18px'}}>
        <input
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSimulate(); }}
          placeholder="What if I quit my job for UPSC preparation?"
          style={{flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:'#f1f5f9', fontFamily:'inherit'}}
        />
        {result && (
          <button onClick={handleReset} style={{padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#64748b', fontSize:12, cursor:'pointer', flexShrink:0}}>
            Reset
          </button>
        )}
        <button
          onClick={handleSimulate}
          disabled={!input.trim() || loading}
          style={{padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:7, opacity:(!input.trim()||loading)?0.5:1}}>
          {loading ? <><div style={{width:12,height:12,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> Simulating…</> : <><Sparkles size={13}/>Simulate Future</>}
        </button>
      </div>

      {/* ── Quick tags ── */}
      <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:16}}>
        {QUICK_TAGS.map(t => (
          <button key={t.label} onClick={() => t.scenario && setInput(t.scenario)}
            style={{padding:'5px 14px', borderRadius:999, border:'1px solid rgba(255,255,255,0.09)', background:'rgba(255,255,255,0.03)', color:'#94a3b8', fontSize:12, cursor:t.scenario?'pointer':'default', fontWeight:500}}>
            {t.label}
          </button>
        ))}
      </div>

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
                    className="flex items-center gap-2.5 text-[12px] text-[#71717a]"
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
          <motion.div ref={resultsRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{display:'flex', flexDirection:'column', gap:10}}>

            {/* Row 1: Impact table + AI Verdict */}
            <div style={{display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:10}}>

              {/* Impact table */}
              <div style={{...sCard, padding:'20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>Current vs Future Impact</p>
                  <span style={{fontSize:13, color:'#475569', cursor:'help'}} title="Scores projected 12 months out">ⓘ</span>
                </div>
                {/* Header row */}
                <div style={{display:'grid', gridTemplateColumns:'120px 1fr 24px 1fr 60px', alignItems:'center', gap:8, marginBottom:10, paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  {['Area','Current','','Future','Change'].map(h => (
                    <span key={h} style={{fontSize:11, color:'#475569', fontWeight:600}}>{h}</span>
                  ))}
                </div>
                {/* Domain rows */}
                {SIM_DOMAINS.map(d => {
                  const cur = result.scores?.baseline?.[d.key] ?? 0;
                  const fut = result.scores?.projected?.[d.key] ?? 0;
                  const delta = fut - cur;
                  return (
                    <div key={d.key} style={{display:'grid', gridTemplateColumns:'120px 1fr 24px 1fr 60px', alignItems:'center', gap:8, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:14}}>{d.icon}</span>
                        <span style={{fontSize:13, fontWeight:600, color:'#e2e8f0'}}>{d.label}</span>
                      </div>
                      <div>
                        <div style={{display:'flex', alignItems:'baseline', gap:4, marginBottom:4}}>
                          <span style={{fontSize:18, fontWeight:800, color:'#f1f5f9'}}>{cur}</span>
                          <span style={{fontSize:10, color:'#475569'}}>/ 100</span>
                        </div>
                        <div style={{height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden'}}>
                          <div style={{width:`${cur}%`, height:'100%', background:d.color, borderRadius:2}}/>
                        </div>
                      </div>
                      <span style={{fontSize:14, color:'#475569', textAlign:'center'}}>→</span>
                      <div>
                        <div style={{display:'flex', alignItems:'baseline', gap:4, marginBottom:4}}>
                          <span style={{fontSize:18, fontWeight:800, color:'#f1f5f9'}}>{fut}</span>
                          <span style={{fontSize:10, color:'#475569'}}>/ 100</span>
                        </div>
                        <div style={{height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden'}}>
                          <div style={{width:`${fut}%`, height:'100%', background:d.color, borderRadius:2}}/>
                        </div>
                      </div>
                      <span style={{fontSize:13, fontWeight:700, color:delta>0?'#10b981':delta<0?'#f43f5e':'#64748b'}}>
                        {delta>0?'+':''}{delta}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* AI Verdict */}
              <div style={{...sCard, padding:'20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
                  <span style={{fontSize:14, color:'#8b5cf6'}}>✦</span>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>AI Verdict</p>
                </div>
                {[
                  {icon:'📈', iconBg:'rgba(16,185,129,0.15)', label:'Best Outcome',   color:'#10b981', text: result.tradeoffs?.pros?.[0] || result.summary},
                  {icon:'⚠️', iconBg:'rgba(249,115,22,0.15)',  label:'Biggest Risk',   color:'#f97316', text: result.tradeoffs?.cons?.[0]},
                  {icon:'💡', iconBg:'rgba(234,179,8,0.15)',   label:'Recommendation', color:'#eab308', text: result.recommendations?.[0] || result.interpretation},
                ].map(item => item.text && (
                  <div key={item.label} style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:14}}>
                    <div style={{width:36, height:36, borderRadius:10, background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16}}>{item.icon}</div>
                    <div>
                      <p style={{fontSize:11, fontWeight:700, color:item.color, marginBottom:3}}>{item.label}</p>
                      <p style={{fontSize:12, color:'#94a3b8', lineHeight:1.5}}>{item.text}</p>
                    </div>
                  </div>
                ))}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12, marginTop:4}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                    <span style={{fontSize:12, color:'#64748b'}}>Confidence Score</span>
                    <span style={{fontSize:16, fontWeight:800, color:'#8b5cf6'}}>{result.confidence}%</span>
                  </div>
                  <div style={{height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden'}}>
                    <motion.div initial={{width:0}} animate={{width:`${result.confidence}%`}} transition={{duration:1, ease:'easeOut'}}
                      style={{height:'100%', borderRadius:3, background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Why + Timeline + Tradeoffs */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>

              {/* Why */}
              <div style={{...sCard, padding:'20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                  <span style={{fontSize:18}}>🧠</span>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>Why?</p>
                </div>
                <p style={{fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:8}}>AI Reasoning</p>
                <p style={{fontSize:12, color:'#64748b', lineHeight:1.7}}>{result.summary}</p>
              </div>

              {/* Timeline */}
              <div style={{...sCard, padding:'20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
                  <span style={{fontSize:18}}>📅</span>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>Timeline</p>
                </div>
                {[
                  {months:'Months 1–3',  phase:'Adjustment Phase'},
                  {months:'Months 4–8',  phase:'Peak Preparation'},
                  {months:'Months 9–12', phase:'Long-term Outcome'},
                ].map((t,i) => (
                  <div key={i} style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:i<2?16:0}}>
                    <span style={{width:10, height:10, borderRadius:'50%', background:'#6366f1', flexShrink:0, marginTop:3}}/>
                    <div>
                      <p style={{fontSize:13, fontWeight:600, color:'#f1f5f9', marginBottom:2}}>{t.months}</p>
                      <p style={{fontSize:11, color:'#64748b'}}>{t.phase}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tradeoffs */}
              <div style={{...sCard, padding:'20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
                  <span style={{fontSize:18}}>⚖️</span>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>Tradeoffs</p>
                </div>
                <p style={{fontSize:12, fontWeight:700, color:'#10b981', marginBottom:8}}>Pros</p>
                {(result.tradeoffs?.pros ?? []).slice(0,3).map((p,i) => (
                  <div key={i} style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                    <span style={{fontSize:12, color:'#10b981', flexShrink:0}}>✓</span>
                    <p style={{fontSize:12, color:'#94a3b8', lineHeight:1.4}}>{p}</p>
                  </div>
                ))}
                <p style={{fontSize:12, fontWeight:700, color:'#f43f5e', marginBottom:8, marginTop:12}}>Cons</p>
                {(result.tradeoffs?.cons ?? []).slice(0,3).map((c,i) => (
                  <div key={i} style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:6}}>
                    <span style={{width:6, height:6, borderRadius:'50%', background:'#f43f5e', flexShrink:0, marginTop:4}}/>
                    <p style={{fontSize:12, color:'#94a3b8', lineHeight:1.4}}>{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Twin predictions bar */}
            <div style={{...sCard, padding:'14px 20px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:10, flexShrink:0}}>
                <span style={{fontSize:16}}>🤖</span>
                <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9'}}>Your Digital Twin predicts</p>
              </div>
              <div style={{display:'flex', gap:28, flexWrap:'wrap'}}>
                {SIM_DOMAINS.map(d => {
                  const delta = (result.scores?.projected?.[d.key]??0) - (result.scores?.baseline?.[d.key]??0);
                  const trend = getTrend(delta);
                  return (
                    <div key={d.key} style={{textAlign:'center'}}>
                      <p style={{fontSize:13, fontWeight:600, color:'#f1f5f9', marginBottom:1}}>{d.label}</p>
                      <p style={{fontSize:14, fontWeight:800, color:trend.color}}>{trend.arrows}</p>
                      <p style={{fontSize:10, color:'#64748b'}}>{trend.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!result && !loading && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div style={{...sCard, padding:'40px 24px', textAlign:'center'}}>
            <div style={{width:56, height:56, borderRadius:14, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24}}>🔮</div>
            <p style={{fontSize:15, fontWeight:700, color:'#f1f5f9', marginBottom:6}}>Your AI Digital Twin</p>
            <p style={{fontSize:13, color:'#64748b', maxWidth:380, margin:'0 auto 24px', lineHeight:1.6}}>
              Type any life decision above. The AI reads your real profile and simulates how it unfolds across health, finances, and career.
            </p>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, maxWidth:500, margin:'0 auto 24px', textAlign:'left'}}>
              {[{icon:'🧠',title:'AI Reasoning',desc:'Step-by-step causal chain'},{icon:'📅',title:'Timeline View',desc:'12-month projection'},{icon:'⚖️',title:'Tradeoffs',desc:'Pros, cons & confidence'}].map(f => (
                <div key={f.title} style={{padding:'14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)'}}>
                  <span style={{fontSize:18, display:'block', marginBottom:6}}>{f.icon}</span>
                  <p style={{fontSize:12, fontWeight:600, color:'#e2e8f0', marginBottom:3}}>{f.title}</p>
                  <p style={{fontSize:11, color:'#64748b'}}>{f.desc}</p>
                </div>
              ))}
            </div>
            <div style={{display:'flex', justifyContent:'center', gap:28}}>
              {SIM_DOMAINS.map(d => (
                <div key={d.key} style={{textAlign:'center'}}>
                  <span style={{fontSize:18}}>{d.icon}</span>
                  <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9', marginTop:4}}>{baseline[d.key] ?? 0}</p>
                  <p style={{fontSize:10, color:'#64748b'}}>{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      </>)}
    </div>
  );
}
