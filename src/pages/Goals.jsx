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
    <div className="page-container min-h-screen">
      <PageHeader title="SMART Goals" subtitle="Set, track, and achieve goals across health, finance, and career." icon="🏆" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-blue-400">{(goals || []).length}</p>
          <p className="text-[10px] text-[#9B9B9B]">Total Goals</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-[#D9730D]">{activeGoals}</p>
          <p className="text-[10px] text-[#9B9B9B]">In Progress</p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-2xl font-bold text-[#2E9E6B]">{completedGoals}</p>
          <p className="text-[10px] text-[#9B9B9B]">Completed</p>
        </GlassCard>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all', 'health', 'finance', 'career'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize ${filter === f ? 'bg-white/10 text-white' : 'text-[#9B9B9B] hover:text-white bg-[#252525]'}`}>
              {f === 'all' ? '🌐 All' : `${domainIcons[f]} ${f}`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">{showNew ? 'Cancel' : '+ New Goal'}</button>
      </div>

      {/* New Goal Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="mb-6">
              <h3 className="text-sm font-semibold mb-4">Create New Goal</h3>
              <form onSubmit={addGoal} className="grid md:grid-cols-2 gap-4">
                <div><label className="text-xs text-[#9B9B9B] mb-1.5 block">Goal Title</label><input type="text" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} className="input-premium" placeholder="e.g. Lose 10kg" required /></div>
                <div><label className="text-xs text-[#9B9B9B] mb-1.5 block">Domain</label><select value={newGoal.domain} onChange={e => setNewGoal(p => ({ ...p, domain: e.target.value }))} className="input-premium"><option value="health">❤️ Health</option><option value="finance">💰 Finance</option><option value="career">🎯 Career</option></select></div>
                <div><label className="text-xs text-[#9B9B9B] mb-1.5 block">Priority</label><select value={newGoal.priority} onChange={e => setNewGoal(p => ({ ...p, priority: e.target.value }))} className="input-premium"><option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option></select></div>
                <div><label className="text-xs text-[#9B9B9B] mb-1.5 block">Deadline</label><input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))} className="input-premium" required /></div>
                <div className="md:col-span-2"><label className="text-xs text-[#9B9B9B] mb-1.5 block">Milestones (comma-separated)</label><input type="text" value={newGoal.milestones} onChange={e => setNewGoal(p => ({ ...p, milestones: e.target.value }))} className="input-premium" placeholder="Milestone 1, Milestone 2, ..." /></div>
                <div className="md:col-span-2"><button type="submit" className="btn-primary">Create Goal 🎯</button></div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState icon="🎯" title="No Goals Yet" subtitle={filter !== 'all' ? `No ${filter} goals. Try creating one!` : 'Set your first SMART goal to start tracking progress.'} action={<button onClick={() => setShowNew(true)} className="btn-primary text-sm">Create Goal</button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {filteredGoals.map((g, i) => {
            const dc = domainColors[g.domain] || '#3b82f6';
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className={g.progress >= 100 ? 'glow-emerald' : ''}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{domainIcons[g.domain]}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{g.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#9B9B9B] capitalize">{g.domain} • Due {g.deadline}</span>
                          {g.priority && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${priorityColors[g.priority] || ''}`}>{g.priority}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-xs text-slate-600 hover:text-[#E03E3E] transition-colors">✕</button>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#9B9B9B] mb-1">
                      <span>Progress</span><span>{g.progress}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${dc}, ${dc}cc)` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <button onClick={() => updateProgress(g.id, 10)} className="text-xs px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">+10%</button>
                    <button onClick={() => updateProgress(g.id, 25)} className="text-xs px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">+25%</button>
                    <button onClick={() => updateProgress(g.id, -10)} className="text-xs px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">-10%</button>
                    {g.progress >= 100 && <span className="text-xs text-[#2E9E6B] ml-auto">✅ Completed!</span>}
                  </div>

                  {g.milestones?.length > 0 && (
                    <div className="border-t border-[rgba(255,255,255,0.055)] pt-3">
                      <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-2">Milestones</p>
                      <div className="space-y-1.5">
                        {g.milestones.map((m, mi) => {
                          const done = (mi + 1) / g.milestones.length * 100 <= g.progress;
                          return (
                            <div key={mi} className="flex items-center gap-2 text-xs">
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 ${done ? 'border-emerald-500 bg-emerald-500/20 text-[#2E9E6B]' : 'border-slate-700 text-slate-600'}`}>
                                {done ? '✓' : mi + 1}
                              </span>
                              <span className={done ? 'text-[#EBEBEB] line-through opacity-60' : 'text-[#9B9B9B]'}>{m}</span>
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
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">🤖 AI-Suggested Goals</h3>
        <p className="text-xs text-[#9B9B9B] mb-4">Based on your cross-domain data, here are recommended goals:</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiGoalSuggestions.map((sg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="p-4 rounded-xl bg-[#252525] border border-[rgba(255,255,255,0.055)] hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{sg.icon}</span>
                <span className="text-xs font-medium">{sg.title}</span>
              </div>
              <p className="text-[10px] text-[#9B9B9B] mb-3 capitalize">{sg.domain}</p>
              <button onClick={() => addSuggestedGoal(sg)}
                className="text-[10px] px-3 py-1 rounded-lg bg-purple-500/10 text-[#9065B0] hover:bg-purple-500/20 transition-all w-full">
                + Add This Goal
              </button>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
