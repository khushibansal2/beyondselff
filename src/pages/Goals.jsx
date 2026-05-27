import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, showToast, EmptyState } from '../components/ui/Components';
import { computeGoalProgress, METRIC_OPTIONS } from '../engines/goalProgressEngine';
import { goalsApi } from '../services/backendApi';
import { Zap } from 'lucide-react';

const aiGoalSuggestions = [
  { title: 'Sleep 7.5h Every Night',    domain: 'health',  milestones: 'Sleep by 11pm, No screens after 10pm, Morning routine, 7+ hours consistently', icon: '😴', targetMetric: 'sleepAvg',         targetValue: 7.5  },
  { title: 'Build Emergency Fund ₹1L',  domain: 'finance', milestones: '₹10K saved, ₹25K saved, ₹50K saved, 3-month expenses buffer',                  icon: '🏦', targetMetric: 'savings',          targetValue: 100000 },
  { title: 'Crack FAANG Interview',     domain: 'career',  milestones: '200 DSA problems, System Design basics, 3 Projects, Mock interviews, Apply',    icon: '🎯', targetMetric: 'dsaPractice',      targetValue: 5    },
  { title: 'Workout 5x Per Week',       domain: 'health',  milestones: 'Walk daily, Gym 3x, Gym 4x, Gym 5x, Maintain streak',                           icon: '🏃', targetMetric: 'workoutsPerWeek',  targetValue: 5    },
  { title: 'Cut Expenses to ₹10000',    domain: 'finance', milestones: 'List all subscriptions, Identify unused, Cancel 3+, Review monthly',            icon: '✂️', targetMetric: 'expenses',         targetValue: 10000 },
  { title: 'Complete 5 Projects',       domain: 'career',  milestones: 'Project 1, Project 2, Project 3, Project 4, Project 5',                         icon: '🏗️', targetMetric: 'projectsCompleted', targetValue: 5   },
];

const EMPTY_FORM = { title: '', domain: 'health', deadline: '', milestones: '', priority: 'medium', targetMetric: '', targetValue: '' };

export default function Goals() {
  const { health, finance, career, goals, updateGoals } = useData();
  const [showNew,  setShowNew]  = useState(false);
  const [newGoal,  setNewGoal]  = useState(EMPTY_FORM);
  const [filter,   setFilter]   = useState('all');
  const [showMeta, setShowMeta] = useState(false); // toggle advanced metric fields

  // Build enriched goals with auto-computed progress
  const enrichedGoals = (goals || []).map(g => {
    const computed = computeGoalProgress(g, health || {}, finance || {}, career || {});
    return { ...g, _computed: computed };
  });

  // We want to fetch all goals if we land directly here
  useEffect(() => {
    if (goalsApi.isEnabled()) {
      goalsApi.getAll().then(data => updateGoals(data)).catch(console.error);
    }
  }, []);

  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) { showToast('Please enter a goal title', 'error'); return; }
    if (!newGoal.deadline)    { showToast('Please set a deadline', 'error'); return; }
    const goalData = {
      title:        newGoal.title,
      domain:       newGoal.domain,
      deadline:     newGoal.deadline,
      priority:     newGoal.priority,
      progress:     0,
      milestones:   newGoal.milestones.split(',').map(m => m.trim()).filter(Boolean),
      targetMetric: newGoal.targetMetric || undefined,
      targetValue:  newGoal.targetValue  ? Number(newGoal.targetValue) : undefined,
    };
    try {
      const saved = goalsApi.isEnabled() ? await goalsApi.create(goalData) : { ...goalData, id: 'g-' + Date.now(), createdAt: new Date().toISOString() };
      updateGoals([...(goals || []), saved]);
      setNewGoal(EMPTY_FORM);
      setShowNew(false);
      setShowMeta(false);
      showToast(`Goal "${saved.title}" created!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const addSuggestedGoal = async (suggestion) => {
    const goalData = {
      title:        suggestion.title,
      domain:       suggestion.domain,
      deadline:     new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      priority:     'medium',
      progress:     0,
      milestones:   suggestion.milestones.split(',').map(m => m.trim()),
      targetMetric: suggestion.targetMetric,
      targetValue:  suggestion.targetValue,
    };
    try {
      const saved = goalsApi.isEnabled() ? await goalsApi.create(goalData) : { ...goalData, id: 'g-' + Date.now(), createdAt: new Date().toISOString() };
      updateGoals([...(goals || []), saved]);
      showToast(`Goal "${saved.title}" added!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const updateProgress = async (id, delta) => {
    const goal = (goals || []).find(g => g.id === id);
    if (!goal) return;
    const newProgress = Math.max(0, Math.min(100, (goal.progress || 0) + delta));
    try {
      if (goalsApi.isEnabled() && String(id).indexOf('g-') !== 0) {
        await goalsApi.updateProgress(id, newProgress);
      }
      const updated = (goals || []).map(g =>
        g.id === id ? { ...g, progress: newProgress } : g
      );
      updateGoals(updated);
      if (newProgress >= 100) showToast(`🎉 Goal "${goal.title}" completed!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteGoal = async (id) => {
    const goal = (goals || []).find(g => g.id === id);
    try {
      if (goalsApi.isEnabled() && String(id).indexOf('g-') !== 0) {
        await goalsApi.delete(id);
      }
      updateGoals((goals || []).filter(g => g.id !== id));
      showToast(`Goal "${goal?.title}" deleted`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const domainColors  = { health: '#10b981', finance: '#f59e0b', career: '#3b82f6' };
  const domainIcons   = { health: '❤️', finance: '💰', career: '🎯' };
  const priorityColors = { high: 'text-red-400 bg-red-500/10', medium: 'text-amber-400 bg-amber-500/10', low: 'text-emerald-400 bg-emerald-500/10' };

  const filteredGoals  = enrichedGoals.filter(g => filter === 'all' || g.domain === filter);
  const completedGoals = enrichedGoals.filter(g => (g._computed.progress) >= 100).length;
  const activeGoals    = enrichedGoals.filter(g => (g._computed.progress) < 100).length;
  const autoCount      = enrichedGoals.filter(g => g._computed.auto).length;

  // Only show metric options matching the selected domain
  const filteredMetrics = METRIC_OPTIONS.filter(m => m.domain === newGoal.domain);

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="SMART Goals" subtitle="Set, track, and achieve goals across health, finance, and career." icon="🏆" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-blue-400">{(goals || []).length}</p>
          <p className="text-[10px] text-slate-500">Total Goals</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-amber-400">{activeGoals}</p>
          <p className="text-[10px] text-slate-500">In Progress</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-emerald-400">{completedGoals}</p>
          <p className="text-[10px] text-slate-500">Completed</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-purple-400">{autoCount}</p>
          <p className="text-[10px] text-slate-500">Auto-tracked</p>
        </GlassCard>
      </div>

      {/* ── Goal Timeline View ── */}
      {enrichedGoals.length > 0 && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const deadlines = enrichedGoals.map(g => new Date(g.deadline));
        const maxDate = new Date(Math.max(...deadlines.map(d => d.getTime())));
        const spanMs = Math.max(maxDate - today, 30 * 86400000); // at least 30 days
        return (
          <GlassCard className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">📅 Goal Timeline</h3>
              <span className="text-[10px] text-slate-500">Today → {maxDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="space-y-2.5">
              {enrichedGoals.map(g => {
                const deadline = new Date(g.deadline); deadline.setHours(23,59,59);
                const totalMs = deadline - today;
                const daysLeft = Math.max(0, Math.ceil(totalMs / 86400000));
                const barWidth = Math.min(100, Math.max(8, (totalMs / spanMs) * 100));
                const pct = g._computed.progress;
                const dc = domainColors[g.domain] || '#6366f1';
                const urgent = daysLeft <= 7;
                const overdue = deadline < today;
                return (
                  <div key={g.id}>
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      <span>{domainIcons[g.domain]}</span>
                      <span className="text-slate-300 font-medium truncate flex-1">{g.title}</span>
                      <span className={`text-[10px] font-semibold tabular-nums flex-shrink-0 ${overdue ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-slate-500'}`}>
                        {overdue ? 'Overdue' : `${daysLeft}d left`}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
                    </div>
                    <div className="relative h-5 rounded-lg bg-white/[0.03] border border-white/[0.05] overflow-hidden">
                      {/* Background track */}
                      <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                        style={{ width: `${barWidth}%`, background: `${dc}18`, borderRight: `1px solid ${dc}30` }} />
                      {/* Progress fill */}
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(pct / 100) * barWidth}%` }} transition={{ duration: 1 }}
                        className="absolute inset-y-0 left-0 rounded-lg"
                        style={{ background: `linear-gradient(90deg, ${dc}60, ${dc}90)` }} />
                      {/* Label */}
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-[9px] font-semibold text-white/70 truncate">{g.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[9px] text-slate-600">
              <div className="h-px flex-1 bg-white/[0.04]" />
              <span>bar width = time remaining · fill = progress</span>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>
          </GlassCard>
        );
      })()}

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all', 'health', 'finance', 'career'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`pill-btn capitalize ${filter === f ? 'active' : ''}`}>
              {f === 'all' ? '🌐 All' : `${domainIcons[f]} ${f}`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">
          {showNew ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* New Goal Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="mb-6">
              <h3 className="text-sm font-semibold mb-4">Create New Goal</h3>
              <form onSubmit={addGoal} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Goal Title</label>
                  <input type="text" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                    className="input-premium" placeholder="e.g. Sleep 7.5h Every Night" required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Domain</label>
                  <select value={newGoal.domain} onChange={e => setNewGoal(p => ({ ...p, domain: e.target.value, targetMetric: '' }))} className="input-premium">
                    <option value="health">❤️ Health</option>
                    <option value="finance">💰 Finance</option>
                    <option value="career">🎯 Career</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Priority</label>
                  <select value={newGoal.priority} onChange={e => setNewGoal(p => ({ ...p, priority: e.target.value }))} className="input-premium">
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Deadline</label>
                  <input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))} className="input-premium" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block">Milestones (comma-separated)</label>
                  <input type="text" value={newGoal.milestones} onChange={e => setNewGoal(p => ({ ...p, milestones: e.target.value }))}
                    className="input-premium" placeholder="Milestone 1, Milestone 2, ..." />
                </div>

                {/* Auto-tracking toggle */}
                <div className="md:col-span-2">
                  <button type="button" onClick={() => setShowMeta(p => !p)}
                    className="flex items-center gap-2 text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                    <Zap size={12} /> {showMeta ? 'Hide' : 'Enable'} auto-tracking from live data
                  </button>
                </div>

                {showMeta && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Track Metric</label>
                      <select value={newGoal.targetMetric} onChange={e => setNewGoal(p => ({ ...p, targetMetric: e.target.value }))} className="input-premium">
                        <option value="">— auto-detect from title —</option>
                        {filteredMetrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Target Value</label>
                      <input type="number" step="any" value={newGoal.targetValue} onChange={e => setNewGoal(p => ({ ...p, targetValue: e.target.value }))}
                        className="input-premium" placeholder="e.g. 7.5 or 100000" />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <button type="submit" className="btn-primary">Create Goal 🎯</button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState icon="🎯" title="No Goals Yet"
          subtitle={filter !== 'all' ? `No ${filter} goals. Try creating one!` : 'Set your first SMART goal to start tracking progress.'}
          action={<button onClick={() => setShowNew(true)} className="btn-primary text-sm">Create Goal</button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {filteredGoals.map((g, i) => {
            const dc       = domainColors[g.domain] || '#3b82f6';
            const computed = g._computed;
            const pct      = computed.progress;
            const isAuto   = computed.auto;

            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className={pct >= 100 ? 'glow-emerald' : ''}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{domainIcons[g.domain]}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{g.title}</h4>
                          {isAuto && (
                            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400 font-semibold">
                              <Zap size={8} /> AUTO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 capitalize">{g.domain} · Due {g.deadline}</span>
                          {g.priority && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${priorityColors[g.priority] || ''}`}>{g.priority}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">✕</button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        Progress
                        {isAuto && computed.label && (
                          <span className="text-[10px] text-purple-400 opacity-70">
                            · {computed.label}: {computed.currentValue}{computed.unit}
                            {computed.targetValue ? ` / ${computed.targetValue}${computed.unit}` : ''}
                          </span>
                        )}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full"
                        style={{ background: isAuto
                          ? `linear-gradient(90deg, #a855f7, #7c3aed)`
                          : `linear-gradient(90deg, ${dc}, ${dc}cc)` }} />
                    </div>
                  </div>

                  {/* Manual override buttons (only shown for non-auto goals) */}
                  {!isAuto && (
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => updateProgress(g.id, 10)}  className="btn-chip text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">+10%</button>
                      <button onClick={() => updateProgress(g.id, 25)}  className="btn-chip text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">+25%</button>
                      <button onClick={() => updateProgress(g.id, -10)} className="btn-chip text-slate-400">-10%</button>
                      {pct >= 100 && <span className="text-xs text-emerald-400 ml-auto font-semibold">✅ Done!</span>}
                    </div>
                  )}
                  {isAuto && pct >= 100 && (
                    <p className="text-xs text-emerald-400 font-semibold mb-3">✅ Goal reached!</p>
                  )}
                  {isAuto && pct < 100 && (
                    <p className="text-[11px] text-purple-400/70 mb-3">
                      Live from your {g.domain} data · updates automatically
                    </p>
                  )}

                  {/* Milestones */}
                  {g.milestones?.length > 0 && (
                    <div className="border-t border-white/[0.06] pt-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Milestones</p>
                      <div className="space-y-1.5">
                        {g.milestones.map((m, mi) => {
                          const done = (mi + 1) / g.milestones.length * 100 <= pct;
                          return (
                            <div key={mi} className="flex items-center gap-2 text-xs">
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 ${done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 text-slate-600'}`}>
                                {done ? '✓' : mi + 1}
                              </span>
                              <span className={done ? 'text-slate-300 line-through opacity-60' : 'text-slate-400'}>{m}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* AI Suggested Goals */}
      <GlassCard glow="glow-purple">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">🤖 AI-Suggested Goals</h3>
        <p className="text-xs text-slate-400 mb-4">Pre-wired with auto-tracking — progress updates from your live data.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiGoalSuggestions.map((sg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{sg.icon}</span>
                <span className="text-xs font-medium">{sg.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-1 capitalize">{sg.domain}</p>
              <p className="text-[9px] text-purple-400/70 mb-3 flex items-center gap-1">
                <Zap size={8} /> Auto-tracks {sg.targetMetric} → target {sg.targetValue?.toLocaleString()}
              </p>
              <button onClick={() => addSuggestedGoal(sg)}
                className="text-[10px] px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all w-full">
                + Add This Goal
              </button>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
