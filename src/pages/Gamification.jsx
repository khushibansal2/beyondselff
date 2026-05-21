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
  
  const activeChallenges = new Set(gamification?.activeChallenges || []);
  const totalPoints = unlockedCount * 100 + completedGoals * 200 + activeChallenges.size * 50 + (gamification?.xp || 0);

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

  const motivationalMessage = () => {
    if (unlockedCount >= 6) return '🏆 You\'re a life optimization master! Keep pushing boundaries.';
    if (unlockedCount >= 3) return '🌟 Great progress! You\'re building strong habits across domains.';
    if (unlockedCount >= 1) return '💪 You\'ve started earning badges. Keep the momentum going!';
    return '🚀 Start your journey! Focus on sleep and hydration for easy early wins.';
  };

  return (
    <div className="page-container min-h-screen pb-20">
      <PageHeader 
        title="Rewards & Achievements" 
        subtitle="Track your streaks, earn badges, and level up your life." 
      />

      <AnimatePresence>
        {showPopup && <AchievementPopup badge={showPopup} onClose={() => setShowPopup(null)} />}
      </AnimatePresence>

      <div className="space-y-8 lg:space-y-10">

        {/* Motivational Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-transparent shadow-[0_0_20px_rgba(139,92,246,0.05)] text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <p className="text-[13px] md:text-[14px] font-semibold text-[#EBEBEB] relative z-10">{motivationalMessage()}</p>
        </motion.div>

        {/* Level & Points Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          <GlassCard className="col-span-2 p-6 md:p-8 relative overflow-hidden" glow="glow-amber">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex flex-col justify-center h-full relative z-10">
              <p className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-widest mb-1">Current Status</p>
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">Level {level}</p>
              </div>
              <div className="w-full h-2.5 rounded-full bg-white/5 border border-white/[0.04] shadow-inner mb-2.5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(xpInLevel / 300) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              </div>
              <p className="text-[11px] font-medium text-[#9B9B9B]">{xpInLevel} / 300 XP to next level</p>
            </div>
          </GlassCard>

          <GlassCard className="text-center p-6 flex flex-col items-center justify-center border-blue-500/10">
            <p className="text-4xl md:text-5xl font-bold text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.3)]">{totalPoints}</p>
            <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wider mt-3">Total Points</p>
          </GlassCard>

          <GlassCard className="text-center p-6 flex flex-col items-center justify-center border-emerald-500/10">
            <p className="text-4xl md:text-5xl font-bold text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{unlockedCount}<span className="text-2xl text-emerald-700">/{badges.length}</span></p>
            <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-wider mt-3">Badges Earned</p>
          </GlassCard>
        </div>

        {/* Streaks */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-orange-400">🔥</span> Active Streaks
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-5">
            {streaks.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg">
                <div className="flex flex-col items-center text-center">
                  <span className="text-3xl mb-3 drop-shadow-md transition-transform duration-300 group-hover:scale-110">{s.icon}</span>
                  <div className="flex items-baseline gap-1 mb-1">
                    <p className="text-3xl font-bold text-white">{s.value}</p>
                    <span className="text-[10px] text-[#9B9B9B] font-medium uppercase tracking-wide">Days</span>
                  </div>
                  <p className="text-[11px] text-[#EBEBEB] font-medium mb-4">{s.label}</p>
                  <div className="w-full h-1.5 rounded-full bg-[#0a0a0a] border border-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(s.value / s.max) * 100}%`, background: s.color, boxShadow: s.value > 0 ? `0 0 8px ${s.color}60` : 'none' }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-amber-400">🏅</span> Achievement Badges
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
            {badges.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => b.unlocked && setShowPopup(b)}
                className={`relative p-5 md:p-6 rounded-2xl text-center flex flex-col items-center transition-all duration-300 ${
                  b.unlocked 
                    ? 'cursor-pointer bg-amber-500/[0.03] border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/[0.05] hover:-translate-y-1 shadow-[0_4px_20px_rgba(245,158,11,0.05)]' 
                    : 'bg-white/[0.01] border border-white/[0.04] opacity-60 hover:opacity-80'
                }`}>
                
                {b.unlocked && (
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl pointer-events-none" />
                )}
                
                <div className="mb-4 relative z-10 transition-transform duration-300 hover:scale-105">
                  <Badge badge={b} size="lg" />
                </div>
                
                <p className={`text-[13px] font-bold mb-1.5 leading-snug relative z-10 ${b.unlocked ? 'text-amber-100' : 'text-[#EBEBEB]'}`}>{b.name}</p>
                <p className="text-[10px] text-[#9B9B9B] leading-relaxed mb-4 flex-1 relative z-10 px-1">{b.desc}</p>
                
                <div className="relative z-10 mt-auto w-full pt-3 border-t border-white/[0.04]">
                  {b.unlocked ? (
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span>✨</span> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span>🔒</span> Locked
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Challenges */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-white bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-violet-400">🎮</span> AI-Generated Challenges
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allChallenges.map((ch, i) => {
              const isActive = activeChallenges.has(ch.id);
              return (
                <motion.div key={ch.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className={`p-5 lg:p-6 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-500/[0.04] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.04]'
                  }`}>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform ${isActive ? 'bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 group-hover:scale-105'}`}>
                      {ch.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] font-bold text-white leading-tight mb-1">{ch.title}</p>
                      <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider font-medium">{ch.duration}</p>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-[#a1a1aa] leading-relaxed mb-5 min-h-[34px]">{ch.desc}</p>
                  
                  {isActive && (
                    <div className="mb-5 p-3 rounded-xl bg-[#0a0a0a]/50 border border-white/[0.04]">
                      <div className="flex justify-between text-[10px] font-semibold mb-2">
                        <span className="text-[#9B9B9B] uppercase tracking-wider">Progress</span>
                        <span className="text-blue-400">{Math.floor(Math.random() * 60 + 20)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 border border-white/[0.04] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.floor(Math.random() * 60 + 20)}%` }} transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/[0.04]">
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">+{ch.reward} XP</span>
                    <button onClick={() => toggleChallenge(ch.id)}
                      className={`text-[11px] font-semibold px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                        isActive 
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300' 
                          : 'bg-blue-600 hover:bg-blue-500 border border-blue-500/30 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:-translate-y-0.5'
                      }`}>
                      {isActive ? 'Abandon' : 'Accept Challenge'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
