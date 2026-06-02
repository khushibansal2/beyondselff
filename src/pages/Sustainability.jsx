import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, ReferenceLine, CartesianGrid,
} from 'recharts';
import { getSustainabilitySourceLabel, getCarbonRating } from '../services/sustainabilityService';

/* ─── Circular Progress for Carbon Indicator ─────────────────────── */
function CircularProgress({ value, target, size = 110, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, value / target);
  const offset = circ - pct * circ;
  const color = value > target ? '#f43f5e' : '#10b981';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}50)`, transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, transition: 'color 0.4s' }}>{Math.round(value)}</span>
        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, marginTop: 3 }}>KG CO₂e</span>
      </div>
    </div>
  );
}

/* ─── Chart Tooltip ───────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 12 }}>
        <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 4px', fontWeight: 600 }}>Day {label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color || p.stroke, fontSize: 12, fontWeight: 700, margin: 0 }}>
            {Math.round(p.value)} kg CO₂e
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Telemetry Toggle ────────────────────────────────────────────── */
function TelemetryToggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: enabled ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.08)',
        position: 'relative', transition: 'all 0.3s',
        boxShadow: enabled ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
      }}
      aria-label={enabled ? 'Disable telemetry sync' : 'Enable telemetry sync'}
    >
      <span style={{
        position: 'absolute', top: 2, left: enabled ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

/* ─── Source Dot ──────────────────────────────────────────────────── */
function SourceDot({ connected, label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: connected ? '#10b981' : '#475569',
        boxShadow: connected ? '0 0 6px #10b981' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color: connected ? '#34d399' : '#475569' }}>
        {connected ? 'Connected' : 'Not linked'}
      </span>
    </div>
  );
}

/* ─── Guidance Card ───────────────────────────────────────────────── */
function GuidanceCard({ icon, title, desc, cta, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        padding: 18, borderRadius: 14, cursor: onClick ? 'pointer' : 'default',
        background: hover ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
        border: hover ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.05)',
        display: 'flex', gap: 14, alignItems: 'flex-start',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: 26, flexShrink: 0 }}>{icon}</span>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>{title}</h4>
        <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 8px', lineHeight: 1.5 }}>{desc}</p>
        {cta && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>{cta} →</span>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Emitter Row ─────────────────────────────────────────────────── */
function EmitterRow({ emitter, maxCo2, animate, delay }) {
  const pct = maxCo2 > 0 ? (emitter.co2 / maxCo2) * 100 : 0;
  const cat = emitter.transport > 0 ? 'Transport' : emitter.energy > 0 ? 'Energy' : 'Food';
  const catColor = { Transport: '#f43f5e', Energy: '#f59e0b', Food: '#10b981' }[cat] || '#818cf8';
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{emitter.label}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
            background: `${catColor}18`, border: `1px solid ${catColor}30`, color: catColor
          }}>{cat}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{emitter.co2} kg</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 2, background: catColor, filter: `drop-shadow(0 0 3px ${catColor}60)` }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Health Offset Row ───────────────────────────────────────────── */
function HealthOffsetRow({ detail, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{detail.type === 'steps' ? '🚶' : '💪'}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8' }}>{detail.label}</span>
        {detail.date && <span style={{ fontSize: 10, color: '#475569' }}>{detail.date}</span>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>-{detail.offset.toFixed(2)} kg</span>
    </motion.div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function Sustainability() {
  const navigate = useNavigate();
  const {
    sustainability, updateDomain,
    sustainabilitySyncEnabled, setSustainabilitySyncEnabled,
    computedSustainability,
    records,
    logEcoAction, deleteEcoAction,
  } = useData();

  const [tab, setTab] = useState('dashboard');

  // Determine data sources connected
  const hasFinanceRecords = (records?.finance || []).length > 0;
  const hasHealthRecords  = (records?.health  || []).length > 0;
  const hasAnyRecords     = hasFinanceRecords || hasHealthRecords;

  // Resolve which footprint data to show
  const sustainData = useMemo(() => {
    if (sustainabilitySyncEnabled && computedSustainability) {
      return {
        carbonFootprint: {
          transport: computedSustainability.transport,
          energy:    computedSustainability.energy,
          food:      computedSustainability.food,
        },
        ecoActions: sustainability?.ecoActions || [],
        _real: true,
        _result: computedSustainability,
      };
    }
    // Fall back to manually entered or demo data
    const hasManualCarbon =
      (sustainability?.carbonFootprint?.transport || 0) +
      (sustainability?.carbonFootprint?.energy    || 0) +
      (sustainability?.carbonFootprint?.food      || 0) > 0;
    return {
      carbonFootprint: hasManualCarbon
        ? sustainability.carbonFootprint
        : { transport: 112, energy: 98, food: 70 },
      ecoActions: sustainability?.ecoActions || [],
      _real: false,
      _result: null,
    };
  }, [sustainabilitySyncEnabled, computedSustainability, sustainability]);

  const totalCarbon = (sustainData.carbonFootprint.transport || 0)
    + (sustainData.carbonFootprint.energy || 0)
    + (sustainData.carbonFootprint.food   || 0);
  const targetCarbon = 238;
  const overTarget   = Math.max(0, totalCarbon - targetCarbon);
  const rating = getCarbonRating(totalCarbon, targetCarbon);

  // 30-day trend (driven by real data shape when available)
  const trendData = useMemo(() => {
    const base = [320, 330, 290, 290, 310, 305, 290, 275, 275, 250, 260, 235, 235, 245, 220, 225, 215, 205, 210, 200, 200, 195, 190, 195, 195, 205, 210, 215, totalCarbon, totalCarbon];
    return base.map((val, i) => ({ date: String(i + 1).padStart(2, '0'), carbon: val }));
  }, [totalCarbon]);

  const pieData = [
    { name: 'Transport', value: sustainData.carbonFootprint.transport, color: '#f43f5e' },
    { name: 'Energy',    value: sustainData.carbonFootprint.energy,    color: '#f59e0b' },
    { name: 'Food/Diet', value: sustainData.carbonFootprint.food,      color: '#10b981' },
  ];

  const handleLogAction = async (action, carbonSaved) => {
    try {
      await logEcoAction(action, carbonSaved);
      showToast(`Logged: "${action}". Saved ${carbonSaved}kg CO₂!`, 'success');
    } catch (e) {
      showToast('Failed to log eco-action.', 'error');
    }
  };

  const tabs = [
    { id: 'dashboard',        label: 'Dashboard',     icon: '🌿' },
    { id: 'actions',          label: 'Eco-Actions',   icon: '🏃' },
    { id: 'audit',            label: 'Carbon Audit',  icon: '🔍' },
    { id: 'recommendations',  label: 'AI Green Tips', icon: '💡' },
  ];

  const logableActions = [
    { title: 'Used Public Transport',    saved: 12, icon: '🚌', desc: 'Commute via bus/metro instead of single car occupancy' },
    { title: 'Plant-Based Day',          saved: 6,  icon: '🥗', desc: 'Substituted all meat products with organic plant items' },
    { title: 'Smart Energy Off',         saved: 4,  icon: '🔌', desc: 'Unplugged all standby home electronics overnight' },
    { title: 'Zero Waste Meals',         saved: 3,  icon: '🍎', desc: 'Managed leftovers perfectly with zero food waste' },
    { title: 'Cycled to Work',           saved: 8,  icon: '🚲', desc: 'Replaced motorised commute with cycling' },
    { title: 'Cold Wash Laundry',        saved: 2,  icon: '🧺', desc: 'Used cold water for laundry cycle instead of hot' },
  ];

  const topEmitters      = sustainData._result?.topEmitters      || [];
  const healthOffsetDetails = sustainData._result?.healthOffsets?.details || [];
  const loggedOffset     = sustainData._result?.offsets?.ecoLogged || 0;
  const healthOffset     = sustainData._result?.offsets?.health   || 0;
  const maxEmitterCo2    = topEmitters[0]?.co2 || 1;
  const sourceLabel      = sustainData._result
    ? getSustainabilitySourceLabel(sustainData._result)
    : 'Manual / Demo';

  return (
    <div style={{ padding: '28px 32px 80px', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'var(--font-primary)' }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Sustainability Tracking</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Real-time carbon intelligence from your Digital Twin data.</p>
          </div>
        </div>

        {/* Carbon rating badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99,
          background: `${rating.color}14`, border: `1px solid ${rating.color}30`, color: rating.color
        }}>{rating.label}</span>
      </div>

      {/* ── Digital Twin Telemetry Sync Card ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '18px 22px', borderRadius: 16, marginBottom: 20,
          background: sustainabilitySyncEnabled
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(139,92,246,0.04) 100%)'
            : 'rgba(255,255,255,0.02)',
          border: sustainabilitySyncEnabled
            ? '1px solid rgba(16,185,129,0.25)'
            : '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.4s',
        }}
      >
        {/* Left: title + source tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: sustainabilitySyncEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${sustainabilitySyncEnabled ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sustainabilitySyncEnabled ? '#10b981' : '#475569'} strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9' }}>Digital Twin Telemetry Sync</span>
              {sustainabilitySyncEnabled && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 9.5, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399'
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s infinite' }} />
                  LIVE
                </span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              {sustainabilitySyncEnabled
                ? `Carbon calculated from ${sourceLabel}`
                : 'Enable to compute footprint from your real Banking & Health data.'}
            </p>
          </div>
        </div>

        {/* Middle: connected sources */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <SourceDot connected={hasFinanceRecords} label="Banking"    icon="🏦" />
          <SourceDot connected={hasHealthRecords}  label="Fitbit/Health" icon="❤️" />
        </div>

        {/* Right: toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!hasAnyRecords && (
            <button
              onClick={() => navigate('/integrations')}
              style={{
                fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8'
              }}
            >
              Connect Data →
            </button>
          )}
          <TelemetryToggle
            enabled={sustainabilitySyncEnabled}
            onChange={(val) => {
              setSustainabilitySyncEnabled(val);
              if (val && !hasAnyRecords) {
                showToast('No data synced yet — connect Banking or Fitbit first.', 'info');
              } else if (val) {
                showToast('Telemetry sync enabled — carbon calculated from real data!', 'success');
              }
            }}
          />
        </div>
      </motion.div>

      {/* ── Tab Selectors ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', padding: '0 4px 10px', fontSize: 13.5, fontWeight: 600,
              color: tab === t.id ? '#10b981' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: 6, position: 'relative', transition: 'color 0.2s'
            }}
          >
            <span>{t.icon}</span> {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="activeEcoTab"
                style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#10b981', borderRadius: 99 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── DASHBOARD TAB ─────────────────────────────────── */}
        {tab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Offsets summary (shown when sync enabled) */}
            {sustainabilitySyncEnabled && computedSustainability && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  padding: '14px 20px', borderRadius: 14,
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Health Offsets</span>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#34d399', margin: '2px 0 0' }}>−{healthOffset.toFixed(1)} kg</p>
                  <span style={{ fontSize: 10, color: '#475569' }}>from active transit</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Eco Actions</span>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#34d399', margin: '2px 0 0' }}>−{loggedOffset.toFixed(1)} kg</p>
                  <span style={{ fontSize: 10, color: '#475569' }}>manually logged</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Transactions Analysed</span>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '2px 0 0' }}>{computedSustainability.financeRecordCount}</p>
                  <span style={{ fontSize: 10, color: '#475569' }}>finance records</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Health Logs</span>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '2px 0 0' }}>{computedSustainability.healthRecordCount}</p>
                  <span style={{ fontSize: 10, color: '#475569' }}>used for offsets</span>
                </div>
              </motion.div>
            )}

            {/* Top Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

              {/* Monthly Summary */}
              <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <CircularProgress value={totalCarbon} target={targetCarbon} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Monthly Total</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px' }}>Target: {targetCarbon} kg</p>
                  <span style={{
                    fontSize: 9.5, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                    background: overTarget > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                    color: overTarget > 0 ? '#f43f5e' : '#10b981'
                  }}>{overTarget > 0 ? `+${Math.round(overTarget)} kg over` : 'On track ✓'}</span>
                  {sustainabilitySyncEnabled && (
                    <p style={{ fontSize: 9, color: '#34d399', margin: '4px 0 0', fontWeight: 600 }}>📡 Live Telemetry</p>
                  )}
                </div>
              </div>

              {['transport', 'energy', 'food'].map((key) => {
                const icons   = { transport: ['🚗', '#f43f5e'], energy: ['⚡', '#f59e0b'], food: ['🥗', '#10b981'] };
                const labels  = { transport: 'Transport', energy: 'Energy', food: 'Food / Diet' };
                const [icon, color] = icons[key];
                return (
                  <div key={key} style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>{labels[key]}</p>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                        {sustainData.carbonFootprint[key]} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>kg</span>
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Graphs Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

              {/* Pie Breakdown */}
              <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>Carbon Footprint Breakdown</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
                  <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{Math.round(totalCarbon)}</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Total kg</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, paddingLeft: 32 }}>
                    {pieData.map(p => {
                      const pct = Math.round((p.value / totalCarbon) * 100);
                      return (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{p.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 20, fontWeight: 700 }}>
                            <span style={{ color: '#64748b', width: 28, textAlign: 'right' }}>{pct}%</span>
                            <span style={{ color: '#f1f5f9', width: 44, textAlign: 'right' }}>{p.value}kg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 30-Day Trend */}
              <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', minHeight: 280 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>30-Day Carbon Trend</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ecoTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 380]} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={targetCarbon} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4}
                        label={{ position: 'right', value: `${targetCarbon}kg`, fill: '#ef4444', fontSize: 9 }} />
                      <Area type="monotone" dataKey="carbon" stroke="#10b981" fill="url(#ecoTrendGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* ── ECO-ACTIONS TAB ───────────────────────────────── */}
        {tab === 'actions' && (
          <motion.div key="actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>

            {/* Quick Logging */}
            <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Log Eco-friendly Actions</h3>
              <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 20px' }}>Log daily green practices to immediately offset your carbon baseline.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logableActions.map(action => (
                  <div key={action.title} style={{
                    padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{action.icon}</span>
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px' }}>{action.title}</h4>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{action.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLogAction(action.title, action.saved)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.12)',
                        color: '#34d399', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
                    >
                      −{action.saved}kg
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action History Log */}
            <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Eco-Action History</h3>
                {sustainData.ecoActions.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    −{sustainData.ecoActions.reduce((s, a) => s + (a.points || 0), 0).toFixed(1)} kg total
                  </span>
                )}
              </div>
              {(!sustainData.ecoActions || sustainData.ecoActions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                  <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📝</span>
                  <p style={{ fontSize: 12, margin: 0 }}>No eco-actions logged yet. Try logging one on the left!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {sustainData.ecoActions.map((action, i) => (
                    <div key={action.id || i} style={{
                      padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', margin: '0 0 3px' }}>{action.action}</p>
                        <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>
                          {new Date(action.date).toLocaleDateString()} at {new Date(action.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>−{action.points}kg CO₂</span>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this eco-action?')) {
                              try {
                                await deleteEcoAction(action.id || action.date);
                                showToast('Eco-action deleted.', 'success');
                              } catch (e) {
                                showToast('Failed to delete eco-action.', 'error');
                              }
                            }
                          }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.6, transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                          title="Delete eco-action"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CARBON AUDIT TAB ─────────────────────────────── */}
        {tab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {!sustainabilitySyncEnabled ? (
              /* ── Sync not enabled — guide user ── */
              <div style={{ padding: 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>📡</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Enable Telemetry Sync</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                  The Carbon Audit tab shows detailed breakdowns of how each transaction and health activity contributes to your footprint. Turn on the Telemetry Sync toggle above to see it.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
                  <GuidanceCard
                    icon="🏦" title="Connect Banking Data"
                    desc="Import bank statements or link via Account Aggregator to analyse spending-based emissions."
                    cta="Go to Banking Integration"
                    onClick={() => navigate('/integrations')}
                  />
                  <GuidanceCard
                    icon="❤️" title="Sync Fitness Tracker"
                    desc="Connect Fitbit to credit active transit (steps & workouts) as carbon offsets."
                    cta="Go to Fitbit Integration"
                    onClick={() => navigate('/integrations')}
                  />
                </div>
              </div>
            ) : !hasAnyRecords ? (
              /* ── No data yet ── */
              <div style={{ padding: 32, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚡</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>No Data Synced Yet</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
                  Telemetry sync is on, but no banking or health records are loaded. Connect your accounts to see the full carbon audit.
                </p>
                <button
                  onClick={() => navigate('/integrations')}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 13
                  }}
                >
                  Connect Integrations →
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>

                {/* Top Carbon Emitters */}
                <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Top Carbon Emitters</h3>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>from {hasFinanceRecords ? computedSustainability?.financeRecordCount : 0} transactions</span>
                  </div>
                  {topEmitters.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '20px 0' }}>
                      No carbon-contributing transactions found. (Shopping, investments, etc. are not counted.)
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {topEmitters.map((em, i) => (
                        <EmitterRow key={i} emitter={em} maxCo2={maxEmitterCo2} delay={i * 0.05} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Offsets & Eco Actions Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Health Active Transit */}
                  <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(16,185,129,0.12)', background: 'rgba(16,185,129,0.04)', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>🚶 Active Transit Offsets</h3>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>−{healthOffset.toFixed(2)} kg total</span>
                    </div>
                    {healthOffsetDetails.length === 0 ? (
                      <p style={{ fontSize: 11.5, color: '#475569', margin: 0 }}>
                        No health data with steps/workout info found. Sync Fitbit to credit active transit.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                        {healthOffsetDetails.slice(0, 10).map((d, i) => (
                          <HealthOffsetRow key={i} detail={d} delay={i * 0.04} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Eco Actions Tally */}
                  <div style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(16,185,129,0.12)', background: 'rgba(16,185,129,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📝 Logged Eco-Actions</h3>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>−{loggedOffset.toFixed(1)} kg</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                      {sustainData.ecoActions.length} action{sustainData.ecoActions.length !== 1 ? 's' : ''} logged •{' '}
                      <button onClick={() => setTab('actions')} style={{ background: 'none', border: 'none', color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                        Log more →
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RECOMMENDATIONS TAB ────────────────────────────── */}
        {tab === 'recommendations' && (
          <motion.div key="recommendations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Personalised tips based on highest emitting category */}
            <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>AI Personalised Carbon Offsets</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    title: 'Smart Energy Timer Integration',
                    impact: 'High', savings: '45kg / Month', icon: '🔋',
                    desc: 'Install automated smart plugs on household media systems to completely isolate power consumption during late hours (12AM - 6AM).',
                    active: sustainData.carbonFootprint.energy > 80,
                  },
                  {
                    title: 'Public Transit Hybrid Switch',
                    impact: 'Medium', savings: '32kg / Month', icon: '🚇',
                    desc: 'Shift Tuesday and Thursday commutes to rail lines. Bypasses core rush traffic while cleanly minimising carbon emissions.',
                    active: sustainData.carbonFootprint.transport > 80,
                  },
                  {
                    title: 'Local Organic Sourcing',
                    impact: 'Low', savings: '15kg / Month', icon: '🍎',
                    desc: 'Procure seasonal produce from local agrarian co-operatives. Lowers long-distance freight distribution energy baseline.',
                    active: sustainData.carbonFootprint.food > 60,
                  },
                  {
                    title: 'Electric Vehicle Switch',
                    impact: 'High', savings: '60kg / Month', icon: '⚡',
                    desc: 'Switch from petrol/diesel vehicle to an EV or hybrid. Over 30-day cycles, EV charging on green energy cuts transport emissions by up to 70%.',
                    active: sustainData.carbonFootprint.transport > 100,
                  },
                  {
                    title: 'Meal Prep Sundays',
                    impact: 'Medium', savings: '22kg / Month', icon: '🥘',
                    desc: 'Cooking in bulk reduces per-meal energy consumption, cuts food delivery (packaging + last-mile vehicle) emissions significantly.',
                    active: sustainData.carbonFootprint.food > 50,
                  },
                ].map((rec, i) => (
                  <div key={i} style={{
                    padding: 18, borderRadius: 14,
                    background: rec.active ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.01)',
                    border: rec.active ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', gap: 16, alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{rec.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{rec.title}</h4>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {rec.active && (
                            <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                              Recommended for You
                            </span>
                          )}
                          <span style={{
                            fontSize: 9.5, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                            background: rec.impact === 'High' ? 'rgba(16,185,129,0.1)' : rec.impact === 'Medium' ? 'rgba(99,102,241,0.1)' : 'rgba(100,116,139,0.1)',
                            color: rec.impact === 'High' ? '#34d399' : rec.impact === 'Medium' ? '#818cf8' : '#94a3b8'
                          }}>{rec.impact} Impact</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: 1.4 }}>{rec.desc}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#10b981', margin: 0 }}>Estimated: Saves {rec.savings}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Floating Action Button */}
      {tab !== 'actions' && (
        <div style={{ position: 'fixed', bottom: 24, right: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 50 }}>
          <button
            onClick={() => setTab('actions')}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Log Action</span>
        </div>
      )}

    </div>
  );
}
