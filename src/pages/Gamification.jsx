import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { badges as allBadges, challenges as allChallenges } from '../data/demoData';
import { GlassCard, PageHeader, Badge, AchievementPopup, showToast } from '../components/ui/Components';

export default function Gamification() {
  const { user } = useAuth();
  const { computed, gamification, updateGamification } = useData();
  const [showPopup, setShowPopup] = useState(null);

  const h = user?.health || {};
  const f = user?.finance || {};
  const c = user?.career || {};

  const lifeBalance = computed?.balance || 0;

  // Determine unlocked badges based on actual computed state
  const badges = useMemo(() => {
    return allBadges.map(b => {
      let unlocked = false;
      if (b.id === 'b1' && (h.sleepAvg || 0) >= 7) unlocked = true;
      if (b.id === 'b2' && (h.workoutsPerWeek || 0) >= 5) unlocked = true;
      if (b.id === 'b3' && f.income && (f.income - f.expenses) / f.income > 0.2) unlocked = true;
      if (b.id === 'b4' && (c.dsaPractice || 0) >= 3) unlocked = true;
      if (b.id === 'b5' && (c.studyHoursDaily || 0) >= 5) unlocked = true;
      if (b.id === 'b6' && (h.stressLevel || 5) <= 4) unlocked = true;
      if (b.id === 'b7' && (h.waterIntake || 0) >= 8) unlocked = true;
      if (b.id === 'b8' && lifeBalance >= 75) unlocked = true;
      return { ...b, unlocked };
    });
  }, [h, f, c, lifeBalance]);

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const completedGoals = (user?.goals || []).filter(g => g.progress >= 100).length;
  
  // Use active challenges from DataContext gamification state
  const activeChallenges = new Set(gamification?.activeChallenges || []);
  
  const totalPoints = unlockedCount * 100 + completedGoals * 200 + activeChallenges.size * 50 + (gamification?.xp || 0);

  // Streaks (derived from real data patterns)
  const streaks = [
    { label: 'Study Streak', value: (c.studyHoursDaily || 0) >= 4 ? 7 : (c.studyHoursDaily || 0) >= 2 ? 3 : 0, icon: '📚', max: 30, color: '#3b82f6' },
    { label: 'Workout Streak', value: (h.workoutsPerWeek || 0) >= 4 ? 12 : (h.workoutsPerWeek || 0) >= 2 ? 5 : 0, icon: '💪', max: 30, color: '#10b981' },
    { label: 'Savings Streak', value: f.income > f.expenses ? 15 : 0, icon: '💰', max: 30, color: '#f59e0b' },
    { label: 'Hydration Streak', value: (h.waterIntake || 0) >= 6 ? 8 : 0, icon: '💧', max: 30, color: '#06b6d4' },
    { label: 'Sleep Streak', value: (h.sleepAvg || 0) >= 7 ? 10 : (h.sleepAvg || 0) >= 6 ? 4 : 0, icon: '😴', max: 30, color: '#8b5cf6' },
    { label: 'Low Stress', value: (h.stressLevel || 5) <= 5 ? 6 : 0, icon: '🧘', max: 30, color: '#f43f5e' },
  ];

  const level = Math.floor(totalPoints / 300) + 1;
  const xpInLevel = totalPoints % 300;

  const toggleChallenge = (id) => {
    const next = new Set(activeChallenges);
    if (next.has(id)) {
      next.delete(id);
      showToast('Challenge abandoned', 'info');
    } else {
      next.add(id);
      showToast('Challenge accepted! 🎮', 'success');
    }
    updateGamification({ activeChallenges: Array.from(next) });
  };

  // Motivational messages based on actual progress
  const motivationalMessage = () => {
    if (unlockedCount >= 6) return '🏆 You\'re a life optimization master! Keep pushing boundaries.';
    if (unlockedCount >= 3) return '🌟 Great progress! You\'re building strong habits across domains.';
    if (unlockedCount >= 1) return '💪 You\'ve started earning badges. Keep the momentum going!';
    return '🚀 Start your journey! Focus on sleep and hydration for easy early wins.';
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Rewards & Achievements" subtitle="Track your streaks, earn badges, and level up your life." icon="⭐" />

      <AnimatePresence>
        {showPopup && <AchievementPopup badge={showPopup} onClose={() => setShowPopup(null)} />}
      </AnimatePresence>

      {/* Level & Points */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <GlassCard glow="glow-amber" className="text-center col-span-2 md:col-span-1">
          <p className="text-4xl font-bold gradient-text-warm" style={{ fontFamily: 'var(--font-display)' }}>Level {level}</p>
          <div className="w-full h-2 rounded-full bg-white/5 mt-3 mb-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(xpInLevel / 300) * 100}%` }} transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
          <p className="text-xs text-slate-500">{xpInLevel}/300 XP to next level</p>
        </GlassCard>

        <GlassCard className="text-center">
          <p className="text-4xl font-bold text-blue-400" style={{ fontFamily: 'var(--font-display)' }}>{totalPoints}</p>
          <p className="text-xs text-slate-500 mt-2">Total Points</p>
        </GlassCard>

        <GlassCard className="text-center">
          <p className="text-4xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>{unlockedCount}/{badges.length}</p>
          <p className="text-xs text-slate-500 mt-2">Badges Earned</p>
        </GlassCard>

        <GlassCard className="text-center">
          <p className="text-4xl font-bold text-purple-400" style={{ fontFamily: 'var(--font-display)' }}>{activeChallenges.size}</p>
          <p className="text-xs text-slate-500 mt-2">Active Challenges</p>
        </GlassCard>
      </div>

      {/* Motivational */}
      <GlassCard className="mb-8 !p-4" glow="glow-purple">
        <p className="text-sm text-slate-300 text-center">{motivationalMessage()}</p>
      </GlassCard>

      {/* Streaks */}
      <GlassCard className="mb-8">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔥 Active Streaks</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {streaks.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
              className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{s.value}<span className="text-xs text-slate-500 font-normal"> days</span></p>
              <p className="text-[10px] text-slate-500 mt-1">{s.label}</p>
              <div className="w-full h-1 rounded-full bg-white/5 mt-2">
                <div className="h-full rounded-full" style={{ width: `${(s.value / s.max) * 100}%`, background: s.color }} />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Badges */}
      <GlassCard className="mb-8">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🏅 Achievement Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => b.unlocked && setShowPopup(b)}
              className={`p-4 rounded-xl text-center cursor-pointer transition-all ${b.unlocked ? 'bg-white/[0.03] border border-amber-500/20 hover:border-amber-500/40' : 'bg-white/[0.01] border border-white/[0.04] opacity-50'}`}>
              <div className="flex justify-center mb-2"><Badge badge={b} /></div>
              <p className="text-xs font-medium">{b.name}</p>
              <p className="text-[10px] text-slate-500 mt-1">{b.desc}</p>
              {b.unlocked ? (
                <span className="text-[9px] text-amber-400 mt-1 block">✨ Unlocked • +100 XP</span>
              ) : (
                <span className="text-[9px] text-slate-600 mt-1 block">🔒 Locked</span>
              )}
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Challenges */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🎮 AI-Generated Challenges</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allChallenges.map((ch, i) => {
            const isActive = activeChallenges.has(ch.id);
            let progress = 0;
            if (ch.id === 'c1') progress = Math.min(100, Math.round(((h.sleepAvg || 0) / 7) * 100));
            if (ch.id === 'c2') progress = f.expenses > 0 ? Math.max(0, 100 - Math.round((f.expenses / (f.income || 1)) * 100)) : 100;
            if (ch.id === 'c3') progress = Math.min(100, Math.round(((c.dsaPractice || 0) / 5) * 100));
            if (ch.id === 'c4') progress = Math.min(100, Math.round(((h.workoutsPerWeek || 0) / 5) * 100));
            if (ch.id === 'c5') progress = Math.min(100, Math.round(((f.savings || 0) / Math.max(f.expenses || 1, 1)) * 100));

            return (
              <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-white/[0.02] border-white/[0.06] hover:border-blue-500/30'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{ch.title}</p>
                    <p className="text-[10px] text-slate-500">{ch.duration}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">{ch.desc}</p>
                {isActive && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Progress</span><span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-400">+{ch.reward} XP</span>
                  <button onClick={() => toggleChallenge(ch.id)}
                    className={`text-[10px] px-3 py-1 rounded-full transition-all ${isActive ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20'}`}>
                    {isActive ? 'Abandon' : 'Start Challenge'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
