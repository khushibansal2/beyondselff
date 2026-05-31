import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';
import { computeGoalProgress, METRIC_OPTIONS } from '../engines/goalProgressEngine';
import { goalsApi } from '../services/backendApi';

const aiGoalSuggestions = [
  { title: 'Sleep 7.5h Every Night',   domain: 'health',  milestones: 'Sleep by 11pm, No screens after 10pm, Morning routine, 7+ hours consistently', icon: '😴', targetMetric: 'sleepAvg',         targetValue: 7.5   },
  { title: 'Build Emergency Fund ₹1L', domain: 'finance', milestones: '₹10K saved, ₹25K saved, ₹50K saved, 3-month expenses buffer',                  icon: '🏦', targetMetric: 'savings',          targetValue: 100000 },
  { title: 'Crack FAANG Interview',    domain: 'career',  milestones: '200 DSA problems, System Design basics, 3 Projects, Mock interviews, Apply',    icon: '🎯', targetMetric: 'dsaPractice',      targetValue: 5     },
  { title: 'Workout 5x Per Week',      domain: 'health',  milestones: 'Walk daily, Gym 3x, Gym 4x, Gym 5x, Maintain streak',                           icon: '🏃', targetMetric: 'workoutsPerWeek',  targetValue: 5     },
  { title: 'Cut Expenses to ₹10000',   domain: 'finance', milestones: 'List all subscriptions, Identify unused, Cancel 3+, Review monthly',            icon: '✂️', targetMetric: 'expenses',         targetValue: 10000 },
  { title: 'Complete 5 Projects',      domain: 'career',  milestones: 'Project 1, Project 2, Project 3, Project 4, Project 5',                         icon: '🏗️', targetMetric: 'projectsCompleted', targetValue: 5    },
];

const EMPTY_FORM = { title: '', domain: 'health', deadline: '', milestones: '', priority: 'medium', targetMetric: '', targetValue: '' };

const domainColor  = { health: '#10b981', finance: '#f59e0b', career: '#3b82f6' };
const domainIcon   = { health: '❤️', finance: '💰', career: '🎯' };
const domainBadge  = { health: 'rgba(16,185,129,0.15)', finance: 'rgba(245,158,11,0.15)', career: 'rgba(59,130,246,0.15)' };
const priorityMeta = {
  high:   { color: '#f87171', bg: 'rgba(239,68,68,0.12)',   label: 'High'   },
  medium: { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  label: 'Medium' },
  low:    { color: '#34d399', bg: 'rgba(16,185,129,0.12)',  label: 'Low'    },
};

const card = { background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

export default function Goals() {
  const { health, finance, career, goals, updateGoals } = useData();
  const [showNew,  setShowNew]  = useState(false);
  const [newGoal,  setNewGoal]  = useState(EMPTY_FORM);
  const [filter,   setFilter]   = useState('all');
  const [showMeta, setShowMeta] = useState(false);

  const enrichedGoals = (goals || []).map(g => {
    const computed = computeGoalProgress(g, health || {}, finance || {}, career || {});
    return { ...g, _computed: computed };
  });

  useEffect(() => {
    if (goalsApi.isEnabled()) goalsApi.getAll().then(data => updateGoals(data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) { showToast('Please enter a goal title', 'error'); return; }
    if (!newGoal.deadline)     { showToast('Please set a deadline', 'error'); return; }
    const goalData = {
      title: newGoal.title, domain: newGoal.domain, deadline: newGoal.deadline,
      priority: newGoal.priority, progress: 0,
      milestones: newGoal.milestones.split(',').map(m => m.trim()).filter(Boolean),
      targetMetric: newGoal.targetMetric || undefined,
      targetValue:  newGoal.targetValue ? Number(newGoal.targetValue) : undefined,
    };
    try {
      const saved = goalsApi.isEnabled() ? await goalsApi.create(goalData) : { ...goalData, id: 'g-' + Date.now(), createdAt: new Date().toISOString() };
      updateGoals([...(goals || []), saved]);
      setNewGoal(EMPTY_FORM); setShowNew(false); setShowMeta(false);
      showToast(`Goal "${saved.title}" created!`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const addSuggestedGoal = async (sg) => {
    const goalData = {
      title: sg.title, domain: sg.domain,
      deadline: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      priority: 'medium', progress: 0,
      milestones: sg.milestones.split(',').map(m => m.trim()),
      targetMetric: sg.targetMetric, targetValue: sg.targetValue,
    };
    try {
      const saved = goalsApi.isEnabled() ? await goalsApi.create(goalData) : { ...goalData, id: 'g-' + Date.now(), createdAt: new Date().toISOString() };
      updateGoals([...(goals || []), saved]);
      showToast(`Goal "${saved.title}" added!`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const updateProgress = async (id, delta) => {
    const goal = (goals || []).find(g => g.id === id);
    if (!goal) return;
    const newProgress = Math.max(0, Math.min(100, (goal.progress || 0) + delta));
    try {
      if (goalsApi.isEnabled() && String(id).indexOf('g-') !== 0) await goalsApi.updateProgress(id, newProgress);
      updateGoals((goals || []).map(g => g.id === id ? { ...g, progress: newProgress } : g));
      if (newProgress >= 100) showToast(`🎉 Goal "${goal.title}" completed!`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const deleteGoal = async (id) => {
    const goal = (goals || []).find(g => g.id === id);
    try {
      if (goalsApi.isEnabled() && String(id).indexOf('g-') !== 0) await goalsApi.delete(id);
      updateGoals((goals || []).filter(g => g.id !== id));
      showToast(`Goal "${goal?.title}" deleted`, 'info');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const filteredGoals  = enrichedGoals.filter(g => filter === 'all' || g.domain === filter);
  const completedCount = enrichedGoals.filter(g => g._computed.progress >= 100).length;
  const activeCount    = enrichedGoals.filter(g => g._computed.progress < 100).length;
  const autoCount      = enrichedGoals.filter(g => g._computed.auto).length;
  const filteredMetrics = METRIC_OPTIONS.filter(m => m.domain === newGoal.domain);

  const STATS = [
    { label: 'Total Goals',  value: (goals || []).length, color: '#6366f1', icon: '🏆' },
    { label: 'In Progress',  value: activeCount,          color: '#f59e0b', icon: '⚡' },
    { label: 'Completed',    value: completedCount,       color: '#10b981', icon: '✅' },
    { label: 'Auto-tracked', value: autoCount,            color: '#a855f7', icon: '🤖' },
  ];

  return (
    <div className="page-container min-h-screen pb-2 bg-mesh" style={{ fontFamily: 'var(--font-primary)' }}>

      {/* ── Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
        <span>BeyondSelf</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#ffffff' }}>Goals</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#6366f1', flexShrink: 0 }}>
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>SMART Goals</h1>
      </div>
      <p style={{ fontSize: 13, color: '#8e929b', marginTop: 2, marginBottom: 24 }}>Set, track, and achieve goals across health, finance, and career.</p>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Goal Timeline ── */}
      {enrichedGoals.length > 0 && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const deadlines = enrichedGoals.map(g => new Date(g.deadline));
        const maxDate = new Date(Math.max(...deadlines.map(d => d.getTime())));
        const spanMs = Math.max(maxDate - today, 30 * 86400000);
        return (
          <div style={{ ...card, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>📅 Goal Timeline</p>
              <span style={{ fontSize: 10, color: '#475569' }}>Today → {maxDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrichedGoals.map(g => {
                const deadline = new Date(g.deadline); deadline.setHours(23,59,59);
                const totalMs = deadline - today;
                const daysLeft = Math.max(0, Math.ceil(totalMs / 86400000));
                const barWidth = Math.min(100, Math.max(8, (totalMs / spanMs) * 100));
                const pct = g._computed.progress;
                const dc = domainColor[g.domain] || '#6366f1';
                const overdue = deadline < today;
                const urgent = daysLeft <= 7 && !overdue;
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
                      <span>{domainIcon[g.domain]}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: overdue ? '#f87171' : urgent ? '#fbbf24' : '#475569', flexShrink: 0 }}>
                        {overdue ? 'Overdue' : `${daysLeft}d left`}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569', width: 30, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ position: 'relative', height: 18, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, left: 0, width: `${barWidth}%`, background: `${dc}14`, borderRight: `1px solid ${dc}25` }} />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(pct / 100) * barWidth}%` }} transition={{ duration: 1 }}
                        style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${dc}55, ${dc}88)`, borderRadius: 8 }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 9, color: '#334155', textAlign: 'center', marginTop: 10 }}>bar width = time remaining · fill = progress</p>
          </div>
        );
      })()}

      {/* ── Filter Bar + New Goal ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, gap: 0, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['all', 'health', 'finance', 'career'].map(f => {
            const isActive = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
                  color: isActive ? '#ffffff' : '#8e929b', transition: 'color 0.2s',
                  borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                {f === 'all' ? '🌐 All' : `${domainIcon[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowNew(!showNew)}
          style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: showNew ? 'rgba(244,63,94,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: showNew ? '#f87171' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8, flexShrink: 0 }}>
          {showNew ? '✕ Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* ── New Goal Form ── */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <div style={{ ...card, padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Create New Goal</p>
              <form onSubmit={addGoal}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Goal Title</label>
                    <input type="text" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                      style={inputStyle} placeholder="e.g. Sleep 7.5h Every Night" required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Domain</label>
                    <select value={newGoal.domain} onChange={e => setNewGoal(p => ({ ...p, domain: e.target.value, targetMetric: '' }))}
                      style={{ ...inputStyle, background: 'rgba(15,20,35,0.98)' }}>
                      <option value="health">❤️ Health</option>
                      <option value="finance">💰 Finance</option>
                      <option value="career">🎯 Career</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Priority</label>
                    <select value={newGoal.priority} onChange={e => setNewGoal(p => ({ ...p, priority: e.target.value }))}
                      style={{ ...inputStyle, background: 'rgba(15,20,35,0.98)' }}>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Deadline</label>
                    <input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))}
                      style={{ ...inputStyle, colorScheme: 'dark' }} required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Milestones <span style={{ color: '#334155' }}>(comma-separated)</span></label>
                    <input type="text" value={newGoal.milestones} onChange={e => setNewGoal(p => ({ ...p, milestones: e.target.value }))}
                      style={inputStyle} placeholder="Milestone 1, Milestone 2, Milestone 3..." />
                  </div>
                </div>

                {/* Auto-tracking toggle */}
                <button type="button" onClick={() => setShowMeta(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', marginBottom: showMeta ? 14 : 0, padding: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
                  {showMeta ? 'Hide' : 'Enable'} auto-tracking from live data
                </button>

                <AnimatePresence>
                  {showMeta && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, overflow: 'hidden' }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Track Metric</label>
                        <select value={newGoal.targetMetric} onChange={e => setNewGoal(p => ({ ...p, targetMetric: e.target.value }))}
                          style={{ ...inputStyle, background: 'rgba(15,20,35,0.98)' }}>
                          <option value="">— auto-detect from title —</option>
                          {filteredMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>Target Value</label>
                        <input type="number" step="any" value={newGoal.targetValue} onChange={e => setNewGoal(p => ({ ...p, targetValue: e.target.value }))}
                          style={inputStyle} placeholder="e.g. 7.5 or 100000" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit"
                  style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Create Goal →
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Goals Grid ── */}
      {filteredGoals.length === 0 ? (
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
            {filter !== 'all' ? `No ${filter} goals yet` : 'No goals yet'}
          </p>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>
            {filter !== 'all' ? `Create a ${filter} goal to start tracking.` : 'Set your first SMART goal to start tracking progress.'}
          </p>
          <button onClick={() => setShowNew(true)}
            style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Create Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {filteredGoals.map((g, i) => {
            const dc       = domainColor[g.domain] || '#6366f1';
            const computed = g._computed;
            const pct      = computed.progress;
            const isAuto   = computed.auto;
            const pm       = priorityMeta[g.priority] || priorityMeta.medium;
            const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000)) : null;
            const overdue  = g.deadline && new Date(g.deadline) < new Date();

            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <div style={{ ...card, padding: '18px 20px', borderLeft: `3px solid ${dc}`, position: 'relative', height: '100%', boxSizing: 'border-box' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: domainBadge[g.domain], color: dc }}>{g.domain}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: pm.bg, color: pm.color }}>{pm.label}</span>
                        {isAuto && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>⚡ AUTO</span>}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{g.title}</p>
                      {g.deadline && (
                        <p style={{ fontSize: 10, color: overdue ? '#f87171' : daysLeft <= 7 ? '#fbbf24' : '#475569', marginTop: 4 }}>
                          {overdue ? '⚠ Overdue' : `📅 ${daysLeft}d left · ${g.deadline}`}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteGoal(g.id)}
                      style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>
                      ✕
                    </button>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Progress
                        {isAuto && computed.label && (
                          <span style={{ color: '#a855f7', marginLeft: 6 }}>· {computed.label}: {computed.currentValue}{computed.unit}{computed.targetValue ? ` / ${computed.targetValue}${computed.unit}` : ''}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: pct >= 100 ? '#10b981' : dc }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: isAuto ? 'linear-gradient(90deg,#a855f7,#7c3aed)' : `linear-gradient(90deg,${dc},${dc}cc)` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  {!isAuto && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: pct >= 100 ? 8 : g.milestones?.length > 0 ? 14 : 0 }}>
                      {[{ d: 10, l: '+10%' }, { d: 25, l: '+25%' }, { d: -10, l: '−10%' }].map(({ d, l }) => (
                        <button key={l} onClick={() => updateProgress(g.id, d)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${d > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, background: d > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', color: d > 0 ? '#34d399' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          {l}
                        </button>
                      ))}
                      {pct >= 100 && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>✅ Done!</span>}
                    </div>
                  )}
                  {isAuto && pct >= 100 && <p style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginBottom: 10 }}>✅ Goal reached!</p>}
                  {isAuto && pct < 100 && <p style={{ fontSize: 10, color: 'rgba(168,85,247,0.7)', marginBottom: g.milestones?.length > 0 ? 14 : 0 }}>Live from your {g.domain} data · updates automatically</p>}

                  {/* Milestones */}
                  {g.milestones?.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Milestones</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {g.milestones.map((m, mi) => {
                          const done = (mi + 1) / g.milestones.length * 100 <= pct;
                          return (
                            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${done ? '#10b981' : '#334155'}`, background: done ? 'rgba(16,185,129,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {done ? <span style={{ fontSize: 9, color: '#10b981' }}>✓</span> : <span style={{ fontSize: 9, color: '#475569' }}>{mi + 1}</span>}
                              </div>
                              <span style={{ fontSize: 11, color: done ? 'rgba(148,163,184,0.5)' : '#94a3b8', textDecoration: done ? 'line-through' : 'none' }}>{m}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── AI Suggested Goals ── */}
      <div style={{ ...card, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>AI-Suggested Goals</p>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Pre-wired with auto-tracking — progress updates from your live data.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {aiGoalSuggestions.map((sg, i) => {
            const dc = domainColor[sg.domain] || '#6366f1';
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${dc}44`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{sg.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{sg.title}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: domainBadge[sg.domain], color: dc }}>{sg.domain}</span>
                  <span style={{ fontSize: 9, color: '#475569' }}>→ target {sg.targetValue?.toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(168,85,247,0.7)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
                  Auto-tracks {sg.targetMetric}
                </p>
                <button onClick={() => addSuggestedGoal(sg)}
                  style={{ marginTop: 'auto', padding: '7px 0', borderRadius: 8, border: `1px solid ${dc}30`, background: `${dc}0f`, color: dc, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  + Add This Goal
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
