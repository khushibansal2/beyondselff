import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, showToast, EmptyState } from '../components/ui/Components';

const aiGoalSuggestions = [
  { title: 'Fix Sleep Schedule', domain: 'health', milestones: 'Sleep by 11pm, No screens after 10pm, Morning routine, 7+ hours consistently', icon: '😴' },
  { title: 'Build Emergency Fund', domain: 'finance', milestones: '₹10K saved, ₹25K saved, ₹50K saved, 3-month expenses buffer', icon: '🏦' },
  { title: 'Crack FAANG Interview', domain: 'career', milestones: '200 DSA problems, System Design basics, 3 Projects, Mock interviews, Apply', icon: '🎯' },
  { title: 'Run 5K Consistently', domain: 'health', milestones: 'Walk 2K daily, Jog 2K, Run 3K, Run 5K, Run 5K 3x/week', icon: '🏃' },
  { title: 'Cut Subscriptions by 50%', domain: 'finance', milestones: 'List all subscriptions, Identify unused, Cancel 3+, Review monthly', icon: '✂️' },
  { title: 'Learn System Design', domain: 'career', milestones: 'Basics, Load balancing, Database design, Caching, Microservices', icon: '🏗️' },
];

export default function Goals() {
  const { user } = useAuth();
  const { goals, updateGoals } = useData();
  const [showNew, setShowNew] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', domain: 'health', deadline: '', milestones: '', priority: 'medium' });
  const [filter, setFilter] = useState('all');

  const addGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) { showToast('Please enter a goal title', 'error'); return; }
    if (!newGoal.deadline) { showToast('Please set a deadline', 'error'); return; }
    const goal = {
      id: 'g-' + Date.now(),
      title: newGoal.title,
      domain: newGoal.domain,
      deadline: newGoal.deadline,
      priority: newGoal.priority,
      progress: 0,
      milestones: newGoal.milestones.split(',').map(m => m.trim()).filter(Boolean),
      createdAt: new Date().toISOString().split('T')[0],
    };
    updateGoals([...(goals || []), goal]);
    setNewGoal({ title: '', domain: 'health', deadline: '', milestones: '', priority: 'medium' });
    setShowNew(false);
    showToast(`Goal "${goal.title}" created!`, 'success');
  };

  const addSuggestedGoal = (suggestion) => {
    const goal = {
      id: 'g-' + Date.now(),
      title: suggestion.title,
      domain: suggestion.domain,
      deadline: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      priority: 'medium',
      progress: 0,
      milestones: suggestion.milestones.split(',').map(m => m.trim()),
      createdAt: new Date().toISOString().split('T')[0],
    };
    updateGoals([...(goals || []), goal]);
    showToast(`Goal "${goal.title}" added!`, 'success');
  };

  const updateProgress = (id, delta) => {
    const updatedGoals = (goals || []).map(g => g.id === id ? { ...g, progress: Math.max(0, Math.min(100, g.progress + delta)) } : g);
    updateGoals(updatedGoals);
    const goal = updatedGoals.find(g => g.id === id);
    if (goal?.progress >= 100) showToast(`🎉 Goal "${goal.title}" completed!`, 'success');
  };

  const deleteGoal = (id) => {
    const goal = (goals || []).find(g => g.id === id);
    updateGoals((goals || []).filter(g => g.id !== id));
    showToast(`Goal "${goal?.title}" deleted`, 'info');
  };

  const domainColors = { health: '#10b981', finance: '#f59e0b', career: '#3b82f6' };
  const domainIcons = { health: '❤️', finance: '💰', career: '🎯' };
  const priorityColors = { high: 'text-[#E03E3E] bg-[rgba(224,62,62,0.1)]', medium: 'text-[#D9730D] bg-[rgba(217,115,13,0.1)]', low: 'text-[#2E9E6B] bg-[rgba(46,158,107,0.1)]' };

  const filteredGoals = (goals || []).filter(g => filter === 'all' || g.domain === filter);
  const completedGoals = (goals || []).filter(g => g.progress >= 100).length;
  const activeGoals = (goals || []).filter(g => g.progress < 100).length;

  return (
    <div className="page-container min-h-screen pb-16">
      <PageHeader title="SMART Goals" subtitle="Set, track, and achieve goals across health, finance, and career." icon="🏆" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <GlassCard className="flex flex-col items-center justify-center p-6 text-center min-h-[120px] hover:translate-y-[-2px] transition-all duration-300">
          <span className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1">Total Goals</span>
          <p className="text-[28px] font-bold tracking-tight text-[#f0f0f3]">{(goals || []).length}</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center p-6 text-center min-h-[120px] hover:translate-y-[-2px] transition-all duration-300">
          <span className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1">In Progress</span>
          <p className="text-[28px] font-bold tracking-tight text-[#f59e0b]">{activeGoals}</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center p-6 text-center min-h-[120px] hover:translate-y-[-2px] transition-all duration-300">
          <span className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1">Completed</span>
          <p className="text-[28px] font-bold tracking-tight text-[#22c55e]">{completedGoals}</p>
        </GlassCard>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex gap-2.5">
          {['all', 'health', 'finance', 'career'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-xl transition-all capitalize font-medium ${filter === f ? 'bg-white/[0.08] text-[#f0f0f3] border border-white/[0.12]' : 'text-[#71717a] hover:text-[#a1a1aa] bg-white/[0.02] border border-white/[0.04]'}`}>
              {f === 'all' ? '🌐 All' : `${domainIcons[f]} ${f}`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(!showNew)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg transition-all duration-300">
          {showNew ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* New Goal Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <GlassCard className="mb-8">
              <h3 className="text-sm font-semibold mb-5 text-[#f0f0f3]">Create New Goal</h3>
              <form onSubmit={addGoal} className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Goal Title</label>
                  <input type="text" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-[#f0f0f3] placeholder-[#3f3f46] focus:outline-none focus:border-indigo-500/50 transition-colors" placeholder="e.g. Lose 10kg" required />
                </div>
                <div>
                  <label className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Domain</label>
                  <select value={newGoal.domain} onChange={e => setNewGoal(p => ({ ...p, domain: e.target.value }))} className="w-full bg-[#18181b] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-[#f0f0f3] focus:outline-none focus:border-indigo-500/50 transition-colors">
                    <option value="health">❤️ Health</option>
                    <option value="finance">💰 Finance</option>
                    <option value="career">🎯 Career</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Priority</label>
                  <select value={newGoal.priority} onChange={e => setNewGoal(p => ({ ...p, priority: e.target.value }))} className="w-full bg-[#18181b] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-[#f0f0f3] focus:outline-none focus:border-indigo-500/50 transition-colors">
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Deadline</label>
                  <input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-[#f0f0f3] focus:outline-none focus:border-indigo-500/50 transition-colors" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-1.5 block">Milestones (comma-separated)</label>
                  <input type="text" value={newGoal.milestones} onChange={e => setNewGoal(p => ({ ...p, milestones: e.target.value }))} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-[#f0f0f3] placeholder-[#3f3f46] focus:outline-none focus:border-indigo-500/50 transition-colors" placeholder="Milestone 1, Milestone 2, ..." />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg transition-all duration-300">
                    Create Goal 🎯
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState icon="🎯" title="No Goals Yet" subtitle={filter !== 'all' ? `No ${filter} goals. Try creating one!` : 'Set your first SMART goal to start tracking progress.'} action={<button onClick={() => setShowNew(true)} className="btn-primary text-sm">Create Goal</button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {filteredGoals.map((g, i) => {
            const dc = domainColors[g.domain] || '#3b82f6';
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className={`flex flex-col justify-between h-full hover:translate-y-[-2px] transition-all duration-300 ${g.progress >= 100 ? 'border-emerald-500/20' : ''}`} style={g.progress >= 100 ? { background: 'rgba(16,185,129,0.02)' } : {}}>
                  <div>
                    {/* Goal Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-lg">
                          {domainIcons[g.domain]}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-[#f0f0f3]">{g.title}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-[#52525b] uppercase tracking-wider font-semibold capitalize">{g.domain}</span>
                            <span className="text-[10px] text-[#3f3f46]">•</span>
                            <span className="text-[10px] text-[#71717a] font-medium">Due {g.deadline}</span>
                            {g.priority && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${priorityColors[g.priority] || ''}`}>{g.priority}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteGoal(g.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-[#52525b] hover:text-[#ef4444] hover:bg-white/[0.04] transition-all">✕</button>
                    </div>

                    {/* Progress Area */}
                    <div className="mb-5 bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                      <div className="flex justify-between items-center text-xs text-[#71717a] mb-2 font-medium">
                        <span>Progress</span>
                        <span className="font-bold text-[#f0f0f3]">{g.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${dc}, ${dc}cc)` }} />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => updateProgress(g.id, 10)} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-[#a1a1aa] font-semibold">+10%</button>
                        <button onClick={() => updateProgress(g.id, 25)} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-[#a1a1aa] font-semibold">+25%</button>
                        <button onClick={() => updateProgress(g.id, -10)} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-[#a1a1aa] font-semibold">-10%</button>
                        {g.progress >= 100 && <span className="text-[10px] text-[#22c55e] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg ml-auto uppercase tracking-wide flex items-center">✓ Completed</span>}
                      </div>
                    </div>
                  </div>

                  {/* Milestones Area */}
                  {g.milestones?.length > 0 && (
                    <div className="border-t border-white/[0.04] pt-4 mt-2">
                      <p className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mb-3">Milestones</p>
                      <div className="space-y-2">
                        {g.milestones.map((m, mi) => {
                          const done = (mi + 1) / g.milestones.length * 100 <= g.progress;
                          return (
                            <div key={mi} className="flex items-center gap-2.5 text-xs">
                              <span className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${done ? 'border-emerald-500/30 bg-emerald-500/10 text-[#22c55e]' : 'border-white/[0.08] bg-white/[0.02] text-[#52525b]'}`}>
                                {done ? '✓' : mi + 1}
                              </span>
                              <span className={done ? 'text-[#71717a] line-through font-medium opacity-60' : 'text-[#a1a1aa] font-medium'}>{m}</span>
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
      <div className="mt-12 pt-4">
        <div className="mb-6">
          <h3 className="dash-section-title" style={{ marginBottom: 4 }}>🤖 AI-Suggested Goals</h3>
          <p className="text-xs text-[#71717a]">Based on your cross-domain data, here are recommended goals:</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {aiGoalSuggestions.map((sg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:border-purple-500/20 hover:bg-white/[0.03] p-5 flex flex-col justify-between min-h-[160px] group transition-all duration-300">
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    {sg.icon}
                  </span>
                  <span className="text-xs font-semibold text-[#f0f0f3] leading-snug">{sg.title}</span>
                </div>
                <p className="text-[10px] text-[#52525b] uppercase tracking-wider font-semibold mb-4 capitalize">{sg.domain}</p>
              </div>
              <button onClick={() => addSuggestedGoal(sg)}
                className="text-[10.5px] font-semibold py-2 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-[#a78bfa] border border-purple-500/10 hover:border-purple-500/20 transition-all duration-300 w-full flex items-center justify-center gap-1.5">
                <span>+</span> Add Suggested Goal
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
