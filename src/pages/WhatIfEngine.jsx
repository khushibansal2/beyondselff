import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { trainWhatIfModel, predictWhatIf, FEATURE_NAMES } from '../services/whatIfService';
import { GlassCard, PageHeader, ScoreRing } from '../components/ui/Components';
import {
  Brain, Zap, TrendingUp, TrendingDown, Minus,
  RefreshCw, CheckCircle, AlertCircle, Info, BarChart2,
  Cpu, FlaskConical, Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Tooltip, BarChart, Bar, XAxis, YAxis,
  Legend, Cell,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const SLIDER_CONFIG = [
  { key: 'sleep_hours',     label: 'Sleep',          unit: 'hrs',  min: 3,  max: 10,  step: 0.5, color: '#6366f1', icon: '😴' },
  { key: 'stress_level',    label: 'Stress Level',   unit: '/10',  min: 1,  max: 10,  step: 0.5, color: '#ef4444', icon: '😤' },
  { key: 'workout_minutes', label: 'Workout',         unit: 'min',  min: 0,  max: 120, step: 5,   color: '#10b981', icon: '🏃' },
  { key: 'study_hours',     label: 'Study Hours',    unit: 'hrs',  min: 0,  max: 12,  step: 0.5, color: '#3b82f6', icon: '📚' },
  { key: 'spending_ratio',  label: 'Spending Ratio', unit: '%',    min: 0.1,max: 1,   step: 0.05,color: '#f59e0b', icon: '💸' },
  { key: 'mood_score',      label: 'Mood Score',     unit: '/10',  min: 1,  max: 10,  step: 0.5, color: '#8b5cf6', icon: '😊' },
];

const DEFAULT_PARAMS = {
  sleep_hours: 7,
  stress_level: 5,
  workout_minutes: 30,
  study_hours: 3,
  spending_ratio: 0.7,
  mood_score: 6,
};

const DOMAIN_META = {
  health_score:  { label: 'Health',  color: '#10b981', icon: '❤️' },
  finance_score: { label: 'Finance', color: '#f59e0b', icon: '💰' },
  career_score:  { label: 'Career',  color: '#6366f1', icon: '🚀' },
};

const FEATURE_LABELS = {
  sleep_hours:     'Sleep',
  stress_level:    'Stress',
  workout_minutes: 'Workout',
  study_hours:     'Study',
  spending_ratio:  'Spending',
  mood_score:      'Mood',
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function AccuracyBadge({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}18` }}>
      R² {pct}%
    </span>
  );
}

function DeltaBadge({ current, predicted }) {
  if (predicted == null) return null;
  const delta = Math.round(predicted - current);
  if (delta > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-bold"><TrendingUp size={11} />+{delta}</span>;
  if (delta < 0) return <span className="flex items-center gap-0.5 text-red-400 text-[11px] font-bold"><TrendingDown size={11} />{delta}</span>;
  return <span className="flex items-center gap-0.5 text-slate-500 text-[11px]"><Minus size={11} />0</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WhatIfEngine() {
  const { records, computed } = useData();

  const [params, setParams]           = useState(DEFAULT_PARAMS);
  const [trainResult, setTrainResult] = useState(null);
  const [prediction, setPrediction]   = useState(null);
  const [training, setTraining]       = useState(false);
  const [predicting, setPredicting]   = useState(false);
  const [tab, setTab]                 = useState('predict'); // 'predict' | 'importance'
  const debounceRef                   = useRef(null);

  // Current rule-based scores as baseline
  const baseline = {
    health_score:  computed?.healthScore?.score  ?? 50,
    finance_score: computed?.financeScore?.score ?? 50,
    career_score:  computed?.careerScore?.score  ?? 50,
  };

  const handleTrain = useCallback(async () => {
    setTraining(true);
    try {
      const result = await trainWhatIfModel(
        records.health  || [],
        records.finance || [],
        records.career  || [],
      );
      setTrainResult(result);
    } finally {
      setTraining(false);
    }
  }, [records]);

  const handlePredict = useCallback(async (newParams) => {
    setPredicting(true);
    try {
      const result = await predictWhatIf(newParams);
      setPrediction(result);
    } finally {
      setPredicting(false);
    }
  }, []);

  const updateParam = useCallback((key, value) => {
    const next = { ...params, [key]: value };
    setParams(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handlePredict(next), 300);
  }, [params, handlePredict]);

  // Radar data: baseline vs. ML prediction
  const radarData = Object.entries(DOMAIN_META).map(([key, meta]) => ({
    domain: meta.label,
    Baseline: baseline[key],
    'ML Prediction': prediction?.predictions?.[key] ?? baseline[key],
  }));

  // Feature importance bar data for selected target
  const [importanceTarget, setImportanceTarget] = useState('health_score');
  const importanceData = FEATURE_NAMES.map((name, i) => ({
    name: FEATURE_LABELS[name] || name,
    importance: Math.round(
      ((trainResult?.feature_importance?.[importanceTarget]?.[i] ??
        prediction?.feature_importance?.[importanceTarget]?.[i] ?? 0) * 100)
    ),
    color: SLIDER_CONFIG.find(s => s.key === name)?.color ?? '#6366f1',
  }));

  const modelSource = trainResult?.offline || prediction?.offline
    ? (trainResult?.mock ? 'Mock ML' : 'Offline fallback')
    : trainResult?.trained
    ? (prediction?.model === 'ridge_regression' ? 'Ridge Regression' : 'ML Trained')
    : 'Deterministic rules';

  const isModelTrained = trainResult?.trained;
  const sampleCount    = trainResult?.sample_count ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="What-If Engine"
        subtitle="ML-powered scenario predictions trained on your personal data"
        icon={<FlaskConical size={20} className="text-violet-400" />}
      />

      {/* Model status bar */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-3" animate={false}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: isModelTrained ? '#10b98120' : '#f59e0b20' }}>
            <Cpu size={17} style={{ color: isModelTrained ? '#10b981' : '#f59e0b' }} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">
              {isModelTrained ? 'Model trained' : 'No model yet'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isModelTrained
                ? `${sampleCount} samples · ${modelSource}`
                : 'Train to use your personal data for predictions'}
            </p>
          </div>
        </div>

        {isModelTrained && (
          <div className="flex items-center gap-2">
            {Object.entries(DOMAIN_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">{meta.label}</span>
                <AccuracyBadge value={trainResult?.accuracy?.[key]} />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleTrain}
          disabled={training}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
          style={{ background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf630' }}
        >
          <RefreshCw size={13} className={training ? 'animate-spin' : ''} />
          {training ? 'Training…' : isModelTrained ? 'Retrain' : 'Train Model'}
        </button>
      </GlassCard>

      {/* Offline notice */}
      {(trainResult?.offline || prediction?.offline) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[12px] text-amber-300">
          <Info size={14} />
          ML service offline — using deterministic engine as fallback. Predictions are still accurate.
        </motion.div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Sliders */}
        <GlassCard className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sliders size={15} className="text-violet-400" />
              <h3 className="text-[13px] font-bold text-white">Adjust Scenario</h3>
            </div>
            <button
              onClick={() => { setParams(DEFAULT_PARAMS); handlePredict(DEFAULT_PARAMS); }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {SLIDER_CONFIG.map(({ key, label, unit, min, max, step, color, icon }) => {
            const val = params[key];
            const pct = ((val - min) / (max - min)) * 100;
            const display = key === 'spending_ratio' ? `${Math.round(val * 100)}%` : val;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-300 flex items-center gap-1.5">
                    <span>{icon}</span>{label}
                  </span>
                  <span className="text-[12px] font-bold" style={{ color }}>
                    {display}{key !== 'spending_ratio' ? ` ${unit}` : ''}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
                  <input
                    type="range" min={min} max={max} step={step} value={val}
                    onChange={e => updateParam(key, parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </GlassCard>

        {/* Right: Prediction results */}
        <div className="space-y-4">
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(DOMAIN_META).map(([key, meta]) => {
              const pred = prediction?.predictions?.[key];
              const base = baseline[key];
              return (
                <GlassCard key={key} className="text-center space-y-2" delay={0.05}>
                  <span className="text-lg">{meta.icon}</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{meta.label}</p>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pred ?? base}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.2 }}
                      className="text-2xl font-black"
                      style={{ color: meta.color, fontFamily: 'var(--font-display)' }}
                    >
                      {predicting ? '…' : Math.round(pred ?? base)}
                    </motion.div>
                  </AnimatePresence>

                  <DeltaBadge current={base} predicted={pred} />

                  {pred != null && (
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-[10px] text-slate-500">was {Math.round(base)}</span>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          {/* Model confidence */}
          {prediction && (
            <GlassCard className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-violet-400" />
                <h3 className="text-[12px] font-bold text-white">Model Confidence</h3>
                <span className="text-[10px] text-slate-500 ml-auto">{prediction.model ?? '—'}</span>
              </div>
              <div className="space-y-2">
                {Object.entries(DOMAIN_META).map(([key, meta]) => {
                  const conf = prediction.confidence?.[key] ?? 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 w-14">{meta.label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(conf * 100)}%` }}
                          transition={{ duration: 0.5 }}
                          style={{ background: meta.color }}
                        />
                      </div>
                      <AccuracyBadge value={conf} />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Tabs: Radar / Feature importance */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { id: 'predict', label: 'Radar Comparison', icon: <BarChart2 size={13} /> },
          { id: 'importance', label: 'Feature Importance', icon: <Brain size={13} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={tab === t.id
              ? { background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf630' }
              : { color: '#64748b' }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <AnimatePresence mode="wait">
        {tab === 'predict' ? (
          <motion.div key="radar"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>
            <GlassCard>
              <h3 className="text-[13px] font-bold text-white mb-4">Baseline vs. ML Prediction</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} outerRadius={100}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                  <Radar name="Baseline" dataKey="Baseline" stroke="#475569" fill="#47556930" strokeWidth={2} />
                  <Radar name="ML Prediction" dataKey="ML Prediction" stroke="#8b5cf6" fill="#8b5cf620" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} />
                  <Tooltip
                    contentStyle={{ background: '#0f1224', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#a78bfa', fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div key="importance"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-white">Feature Importance</h3>
                <div className="flex gap-1">
                  {Object.entries(DOMAIN_META).map(([key, meta]) => (
                    <button key={key}
                      onClick={() => setImportanceTarget(key)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={importanceTarget === key
                        ? { background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}30` }
                        : { color: '#64748b' }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={importanceData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} width={55} />
                  <Tooltip
                    formatter={v => [`${v}%`, 'Influence']}
                    contentStyle={{ background: '#0f1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {importanceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-slate-500 mt-3">
                Shows which habits most influence your {DOMAIN_META[importanceTarget].label.toLowerCase()} score in the ML model.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works explainer */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-violet-400" />
          <h3 className="text-[13px] font-bold text-white">How it works</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-slate-400">
          {[
            { step: '1', title: 'Train on your data', desc: 'A Ridge Regression model learns the relationship between your daily habits and domain scores from your historical records.' },
            { step: '2', title: 'Adjust the sliders', desc: 'Move any habit slider to pose a what-if scenario — e.g. "What if I sleep 8h and cut spending to 60%?"' },
            { step: '3', title: 'Get ML predictions', desc: 'The model predicts your personalized health, finance, and career scores based on how YOUR data responds to each habit.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black text-violet-400"
                style={{ background: '#8b5cf620', border: '1px solid #8b5cf630' }}>
                {step}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white mb-0.5">{title}</p>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
