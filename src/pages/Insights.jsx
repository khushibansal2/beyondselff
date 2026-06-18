import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateInsights, generateTrendData, generateCorrelations } from '../data/demoData';
import { showToast } from '../components/ui/Components';
import AIExplainer from '../components/ui/AIExplainer';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';

/* ─── Trend helpers ──────────────────────────────────────────────── */
const TREND_META = {
  improving: { arrow: '↑', color: '#10b981', label: 'Improving' },
  declining:  { arrow: '↓', color: '#f43f5e', label: 'Declining'  },
  stable:     { arrow: '→', color: '#f59e0b', label: 'Stable'     },
};

function TrendPill({ direction, momentum, domain }) {
  const meta = TREND_META[direction] || TREND_META.stable;
  const sign = momentum > 0 ? '+' : '';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600,
      padding: '2px 8px', borderRadius: 99,
      background: `${meta.color}18`,
      color: meta.color,
    }}>
      {meta.arrow} {meta.label}{momentum !== 0 ? ` (${sign}${momentum})` : ''}
    </span>
  );
}

/* ─── Animated Score Ring ─────────────────────────────────────────── */
function ScoreRingInline({ score, size = 100, strokeWidth = 7, color, label, small }) {
  const [anim, setAnim] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (anim / 100) * circ;

  useEffect(() => {
    let frame;
    let start = null;
    const duration = 900;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnim(Math.round(eased * score));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const resolvedColor = color || (score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#f97316' : '#ef4444');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${resolvedColor}60)`, transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: small ? 18 : 22, fontWeight: 700, color: resolvedColor, lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>{anim}</span>
          <span style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>/ 100</span>
        </div>
      </div>
      {label && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>}
    </div>
  );
}

/* ─── Pattern / Cascade Card ─────────────────────────────────────── */
const severityConfig = {
  critical: { border: '1px solid rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.05)', badgeBg: 'rgba(239,68,68,0.15)', badgeColor: '#fca5a5', pulse: '#f87171', label: '🚨 Critical Pattern' },
  warning:  { border: '1px solid rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.05)', badgeBg: 'rgba(245,158,11,0.15)', badgeColor: '#fcd34d', pulse: '#fbbf24', label: '⚠️ Warning Pattern' },
  positive: { border: '1px solid rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.05)', badgeBg: 'rgba(16,185,129,0.15)', badgeColor: '#6ee7b7', pulse: '#34d399', label: '✅ Positive Pattern' },
};

function PatternCard({ pattern, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = severityConfig[pattern.severity] || severityConfig.warning;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      style={{ borderRadius: 14, border: cfg.border, background: cfg.bg, overflow: 'hidden' }}
    >
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '16px 18px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>{pattern.icon || '⚡'}</span>
              {pattern.severity === 'critical' && (
                <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: cfg.pulse, animation: 'pulse 2s infinite' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: cfg.badgeBg, color: cfg.badgeColor }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: '#475569' }}>🕐 {pattern.period || 'Recent Activity'}</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{pattern.confidence || 100}% confidence</span>
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{pattern.title}</h3>
            </div>
          </div>
          <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  <span style={{ fontWeight: 600, color: '#f1f5f9', display: 'block', marginBottom: 4 }}>Trigger: {pattern.trigger}</span>
                  {pattern.description || pattern.effect}
                </p>
                <p style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 8, marginBottom: 0 }}>
                  Mechanism: {pattern.mechanism}
                </p>
              </div>
              <AIExplainer insightData={pattern} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Domains affected:</span>
                {pattern.domains?.map(d => (
                  <span key={d} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', textTransform: 'capitalize' }}>{d}</span>
                ))}
                <Link to="/coach" style={{ marginLeft: 'auto', fontSize: 10, color: '#60a5fa', textDecoration: 'none' }}>Ask AI Coach →</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Insight Card (Cross-Domain Insights section) ───────────────── */
function InsightRow({ insight, index }) {
  const domainColors = { Health: '#10b981', Finance: '#3b82f6', Career: '#8b5cf6' };
  const pct = insight.strength != null ? Math.round(insight.strength * 100) : insight.confidence != null ? Math.round(insight.confidence) : 75;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07 }}
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{insight.icon || '💧'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, margin: 0, marginBottom: 4, lineHeight: 1.4 }}>{insight.title}</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{insight.description || insight.effect}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {insight.domains?.map(d => (
              <span key={d} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                background: domainColors[d] ? `${domainColors[d]}20` : 'rgba(255,255,255,0.06)',
                color: domainColors[d] || '#94a3b8',
              }}>{d}</span>
            ))}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>{pct}%</span>
    </motion.div>
  );
}

/* ─── Correlation Row ─────────────────────────────────────────────── */
function CorrRow({ corr, index }) {
  const strengthColor = corr.type === 'positive' ? '#10b981' : corr.type === 'negative' ? '#f43f5e' : '#f59e0b';
  const pct = Math.round(corr.strength * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, flex: 1, lineHeight: 1.4 }}>{corr.pattern}</p>
      <span style={{ fontSize: 12, fontWeight: 700, color: strengthColor, flexShrink: 0, whiteSpace: 'nowrap' }}>Strength: {pct}%</span>
    </motion.div>
  );
}

/* ─── Tooltip for chart ───────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, fontSize: 11, margin: '2px 0' }}>{p.name}: {p.value?.toFixed?.(1)}</p>
        ))}
      </div>
    );
  }
  return null;
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function Insights() {
  const { user } = useAuth();
  const { computed, health, finance, career, records } = useData();

  const h = health || {};
  const f = finance || {};
  const c = career || {};

  const healthScore  = computed?.healthScore?.score  || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore  = computed?.careerScore?.score  || 0;
  const balance      = computed?.balance || 0;
  const burnout      = computed?.burnout?.risk || 0;
  const trends       = computed?.trends || {};

  const patterns = useMemo(() => {
    return (computed?.crossDomain || []).map(cd => ({
      ...cd,
      title:      cd.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Cascade',
      icon:       cd.severity === 'positive' ? '✅' : cd.severity === 'critical' ? '🚨' : '⚡',
      description: cd.effect,
      domains:    [cd.from, cd.to],
      confidence: 100,
    }));
  }, [computed?.crossDomain]);

  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline: computed?.timeline || [] }), [user, h, f, c, computed?.timeline]);

  const insights = useMemo(() => generateInsights(currentState), [currentState]);

  const healthRecords = records?.health || [];

  const trendData = useMemo(() => {
    if (healthRecords.length >= 3) {
      return [...healthRecords]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7)
        .map(r => ({
          date:   typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
          sleep:  r.sleep  ?? null,
          stress: r.stress ?? null,
          mood:   r.mood   ?? null,
          water:  r.water  ?? null,
        }));
    }
    return generateTrendData(currentState, 7);
  }, [healthRecords, currentState]);

  const correlations = useMemo(() => generateCorrelations(trendData), [trendData]);

  const criticalCount = patterns.filter(p => p.severity === 'critical').length;
  const warningCount  = patterns.filter(p => p.severity === 'warning').length;
  const positiveCount = patterns.filter(p => p.severity === 'positive').length;

  const happinessScore = Math.round(((h.moodAvg || 5) / 10 * 40) + ((10 - (h.stressLevel || 5)) / 10 * 30) + ((h.sleepAvg || 7) / 8 * 30));
  const successScore   = Math.round(careerScore * 0.4 + financeScore * 0.3 + (healthScore > 60 ? 30 : 15));

  const reflections = [
    (h.sleepAvg || 0) < 6 ? '😴 Sleep deficit detected — tonight aim for 7+ hours' : '✅ Sleep pattern is healthy',
    (h.stressLevel || 0) > 7 ? '😰 Stress is critically high — take a 15-min break now' : '✅ Stress levels are manageable',
    f.income > 0 && f.expenses / f.income > 0.9 ? '💸 Spending close to income — review today\'s expenses' : '✅ Financial discipline looks good',
    (c.studyHoursDaily || 0) + (c.codingHoursDaily || 0) > 10 ? '⚡ Long hours detected — schedule a break block' : '✅ Work-life balance looks healthy',
    (h.waterIntake || 0) < 6 ? '💧 Below hydration target — drink water now' : '✅ Hydration is on track',
    (h.sleepAvg || 0) < 6 ? '🧠 Study efficiency LOW — sleep deficit cuts retention by ~30%' : '🧠 Study efficiency HIGH — good sleep supporting learning',
  ];

  const handleExport = () => {
    const lines = [
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
      ...reflections,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `beyondself_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Full report exported', 'success');
  };

  return (
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>🧠</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Cross-Domain Intelligence</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>AI-explained patterns across your health, finances, and career.</p>
      </motion.div>

      {/* ── Data Pattern Overview ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>Data Pattern Overview</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 99, fontSize: 10, color: '#34d399', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Live
              </span>
              <div style={{ display: 'flex', gap: 12, marginLeft: 12 }}>
                {criticalCount > 0 && <div style={{ textAlign: 'center' }}><p style={{ fontSize: 16, fontWeight: 700, color: '#f87171', margin: 0 }}>{criticalCount}</p><p style={{ fontSize: 9, color: '#475569', margin: 0 }}>Critical</p></div>}
                {warningCount  > 0 && <div style={{ textAlign: 'center' }}><p style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', margin: 0 }}>{warningCount}</p><p  style={{ fontSize: 9, color: '#475569', margin: 0 }}>Warnings</p></div>}
                {positiveCount > 0 && <div style={{ textAlign: 'center' }}><p style={{ fontSize: 16, fontWeight: 700, color: '#34d399', margin: 0 }}>{positiveCount}</p><p style={{ fontSize: 9, color: '#475569', margin: 0 }}>Positive</p></div>}
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
              {healthRecords.length >= 3 ? `${Math.min(healthRecords.length, 14)} real entries analyzed` : '5 real entries analyzed'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 96, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#334155', fontSize: 9 }}
                tickFormatter={v => {
                  const d = new Date(v);
                  return `May ${d.getDate()}`;
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={7} stroke="#8b5cf6" strokeDasharray="3 3" strokeOpacity={0.35}
                label={{ value: 'Target: Balanced', fill: '#8b5cf6', fontSize: 9, position: 'right' }} />
              <Area type="monotone" dataKey="sleep"  stroke="#8b5cf6" fill="url(#sleepGrad)"  strokeWidth={2} name="Sleep"  dot={false} />
              <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#stressGrad)" strokeWidth={1.5} name="Stress" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── 7-Day Trend Momentum Strip ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{
          marginBottom: 20,
          padding: '14px 20px',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>📈 7-Day Momentum</span>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: '🏃 Health',  key: 'health'  },
            { label: '💰 Finance', key: 'finance' },
            { label: '📚 Career',  key: 'career'  },
          ].map(({ label, key }) => {
            const t = trends[key] || { direction: 'stable', momentum: 0, sampleCount: 0 };
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                <TrendPill direction={t.direction} momentum={t.momentum} domain={key} />
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 10, color: '#334155' }}>
          {Object.values(trends).reduce((s, t) => s + (t.sampleCount || 0), 0)} entries analyzed
        </span>
      </motion.div>

      {/* ── No Cascades / Pattern Cards ───────────────────────────── */}
      {patterns.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 20,
            padding: '32px 20px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>✨</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px' }}>No Cross-Domain Cascades Detected</p>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Your data looks balanced across all domains. Keep it up!</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {patterns.map((p, i) => <PatternCard key={p.id} pattern={p} index={i} />)}
        </div>
      )}

      {/* ── Score Cards Row ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {/* Life Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <ScoreRingInline score={balance} size={84} strokeWidth={6} label={null} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Life Balance</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>
              {balance >= 75 ? 'Excellent balance' : balance >= 50 ? 'Needs attention in weak areas' : 'Significant imbalance detected'}
            </p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['health','finance','career'].map(k => {
                const t = trends[k] || { direction: 'stable', momentum: 0 };
                return t.direction !== 'stable'
                  ? <TrendPill key={k} direction={t.direction} momentum={t.momentum} domain={k} />
                  : null;
              })}
            </div>
          </div>
        </motion.div>

        {/* Burnout Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <ScoreRingInline
            score={burnout}
            size={84} strokeWidth={6}
            color={burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981'}
            label={null}
          />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Burnout Risk</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: burnout > 60 ? '#f87171' : burnout > 30 ? '#fbbf24' : '#34d399' }}>✅</span>
              {burnout > 60 ? 'Immediate action required' : burnout > 30 ? 'Monitor and prevent' : 'Sustainable pace'}
            </p>
            {trends.health && <TrendPill direction={trends.health.direction} momentum={trends.health.momentum} domain="health" />}
          </div>
        </motion.div>

        {/* Happiness + Success */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <ScoreRingInline score={happinessScore} size={70} strokeWidth={5} color="#f59e0b" label="Happiness" small />
              <ScoreRingInline score={successScore}   size={70} strokeWidth={5} color="#3b82f6" label="Success"   small />
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#34d399' }}>✅</span>
              {successScore > happinessScore + 20 ? 'Success outpacing happiness' : 'Happiness and success aligned'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Cross-Domain Insights + Habit Correlations ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Cross-Domain Insights */}
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔗 Cross-Domain Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>✨</span>
                <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>No critical insights right now.</p>
              </div>
            ) : (
              insights.map((insight, i) => <InsightRow key={i} insight={insight} index={i} />)
            )}
          </div>
        </motion.div>

        {/* Habit Correlations */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔗 Habit Correlations
          </h3>
          <div>
            {correlations.map((corr, i) => <CorrRow key={i} corr={corr} index={i} />)}
          </div>
        </motion.div>
      </div>

      {/* ── Today's AI Reflection ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{
          padding: 20,
          borderRadius: 16,
          border: '1px solid rgba(139,92,246,0.15)',
          background: 'rgba(139,92,246,0.04)',
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          📝 Today's AI Reflection
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {reflections.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}
              style={{
                fontSize: 12,
                color: '#94a3b8',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                lineHeight: 1.5,
              }}
            >
              {r}
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>Analysis based on your data patterns</p>
          <button
            onClick={handleExport}
            style={{
              fontSize: 11,
              color: '#60a5fa',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Export Report ↓
          </button>
        </div>
      </motion.div>
    </div>
  );
}
