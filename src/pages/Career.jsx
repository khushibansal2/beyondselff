import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateTrendData, generateInsights } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast } from '../components/ui/Components';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Code2, Puzzle, Rocket, Target, GraduationCap, LayoutDashboard, ClipboardList, Sparkles, Map } from 'lucide-react';

function CareerMetric({ icon: Icon, color, label, value, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-6 flex flex-col items-center justify-between text-center min-h-[180px] group hover:translate-y-[-2px] transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center border border-white/[0.06] transition-transform duration-300 group-hover:scale-110 mb-4"
        style={{ background: `${color}12`, boxShadow: `0 0 20px ${color}15` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex flex-col items-center gap-2 mt-auto w-full">
        <p className="text-[10px] text-[#71717a] uppercase tracking-[0.08em] font-semibold">{label}</p>
        <p className="text-[28px] font-bold tracking-tight leading-none text-[#f0f0f3]">{value}</p>
        {subtitle && <p className="text-[11px] mt-1" style={{ color }}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export default function Career() {
  const { user } = useAuth();
  const { career, health, updateDomain, computed } = useData();
  const [tab, setTab] = useState('overview');
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };
  const score = computed?.careerScore?.score || 0;
  const [form, setForm] = useState({ studyHours: '', codingHours: '', dsa: '', skill: '' });

  const currentState = useMemo(() => ({
    health: health || { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0 },
    finance: computed?.financeScore?.raw || { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0 },
    career: c
  }), [health, c, computed]);

  const careerInsights = useMemo(() => {
    const all = generateInsights(currentState);
    return all.filter(ins => ins.domains.includes('career')).slice(0, 2);
  }, [currentState]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'log', label: 'Log Data', icon: ClipboardList },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
    { id: 'roadmap', label: 'Learning Path', icon: Map },
  ];

  const skillRadar = [
    { subject: 'DSA', A: Math.min(100, c.dsaPractice * 33) },
    { subject: 'Projects', A: Math.min(100, c.projectsCompleted * 20) },
    { subject: 'Skills', A: Math.min(100, c.skills.length * 16) },
    { subject: 'Study', A: Math.min(100, c.studyHoursDaily * 16) },
    { subject: 'Coding', A: Math.min(100, c.codingHoursDaily * 20) },
    { subject: 'GPA', A: Math.min(100, c.gpa * 11) },
  ];

  const handleLog = (e) => {
    e.preventDefault();
    const updated = { ...c };
    if (form.studyHours) updated.studyHoursDaily = parseFloat(form.studyHours);
    if (form.codingHours) updated.codingHoursDaily = parseFloat(form.codingHours);
    if (form.dsa) updated.dsaPractice = parseInt(form.dsa);
    if (form.skill && !updated.skills.includes(form.skill)) updated.skills = [...(updated.skills || []), form.skill];
    updateDomain('career', updated);
    setForm({ studyHours: '', codingHours: '', dsa: '', skill: '' });
    showToast('Career data updated', 'success');
  };

  const placementReadiness = Math.round((c.dsaPractice >= 3 ? 25 : c.dsaPractice * 8) + (c.projectsCompleted >= 4 ? 25 : c.projectsCompleted * 6) + (c.skills.length >= 5 ? 25 : c.skills.length * 5) + (c.codingHoursDaily >= 4 ? 25 : c.codingHoursDaily * 6));

  const availableSkills = ['TypeScript', 'Docker', 'AWS', 'System Design', 'MongoDB', 'GraphQL', 'Kubernetes', 'Redis', 'Tailwind', 'Next.js', 'Go', 'Rust', 'Python', 'ML'];
  const missingSkills = availableSkills.filter(s => !c.skills.includes(s));

  const recommendations = [
    { icon: '🧩', title: 'Skill Gap Analysis', text: c.skills.length < 5 ? `You have ${c.skills.length} skills. Top companies expect 5-7+ skills. Add: ${missingSkills.slice(0,3).join(', ')}.` : 'Strong skill set! Focus on deepening expertise in 2-3 core skills.', confidence: Math.max(70, 100 - Math.abs(5 - c.skills.length) * 5), risk: c.skills.length < 4 ? 'high' : 'low' },
    { icon: '📚', title: 'DSA Strategy', text: c.dsaPractice < 3 ? `Increase from ${c.dsaPractice} to 3-5 problems/day. Focus: Arrays → Strings → Trees → Graphs → DP. Use spaced repetition.` : 'Excellent DSA practice! Add timed mock contests to simulate interview pressure.', confidence: c.dsaPractice < 3 ? 90 : 85, risk: c.dsaPractice < 2 ? 'high' : 'low' },
    { icon: '🚀', title: 'Project Portfolio', text: c.projectsCompleted < 4 ? `${c.projectsCompleted} projects isn't enough. Build: 1 full-stack app, 1 ML/AI project, 1 open-source contribution.` : `${c.projectsCompleted} projects is strong! Add READMEs, demos, and deploy them for visibility.`, confidence: c.projectsCompleted < 4 ? 88 : 82, risk: 'medium' },
    { icon: '🎯', title: 'Placement Readiness', text: `Readiness score: ${placementReadiness}%. ${placementReadiness < 60 ? 'Focus on DSA and projects to increase interview chances.' : 'You\'re well-prepared. Practice mock interviews to build confidence.'}`, confidence: Math.max(75, placementReadiness), risk: placementReadiness < 50 ? 'high' : 'low' },
    { icon: '⏰', title: 'Study Efficiency', text: (health?.sleepAvg || 7) < 6 ? `Low sleep (${health?.sleepAvg || 7}h) is reducing your study efficiency. Even with ${c.studyHoursDaily}h of study, effective learning may be only ${Math.round(c.studyHoursDaily * 0.6)}h.` : 'Good sleep supports effective learning. Your study hours are productive.', confidence: (health?.sleepAvg || 7) < 6 ? 92 : 85, risk: (health?.sleepAvg || 7) < 6 ? 'high' : 'low' },
  ];

  const roadmap = [
    { phase: 'Foundation', items: ['Data Structures & Algorithms', 'Object-Oriented Programming', 'Database Management', 'Git & Version Control'], status: c.dsaPractice >= 2 ? 'done' : 'active' },
    { phase: 'Core Skills', items: ['Frontend (React/Vue)', 'Backend (Node/Spring)', 'API Design (REST/GraphQL)', 'Testing & Debugging'], status: c.skills.length >= 4 ? 'done' : c.dsaPractice >= 2 ? 'active' : 'locked' },
    { phase: 'Projects', items: ['Full-Stack Web App', 'Mobile App / AI Project', 'Open Source Contribution', 'Technical Blog'], status: c.projectsCompleted >= 3 ? 'done' : c.skills.length >= 4 ? 'active' : 'locked' },
    { phase: 'Interview Prep', items: ['250+ DSA Problems', 'System Design Basics', 'Mock Interviews', 'Resume & LinkedIn'], status: c.projectsCompleted >= 3 ? 'active' : 'locked' },
  ];

  return (
    <div className="page-container min-h-screen pb-20 bg-mesh">
      <PageHeader title="Career Intelligence" subtitle="Track skills, map out learning paths, and optimize your career trajectory." />
      
      {/* Custom Premium Tab Buttons */}
      <div className="flex flex-wrap justify-start gap-4 mt-8 mb-16 relative z-10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-3 px-7 py-3.5 rounded-2xl text-[13.5px] font-medium tracking-wide transition-all duration-300 select-none outline-none cursor-pointer group border ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-[#090714]/80 border-[#8b5cf6]/20 backdrop-blur-3xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/[0.04] hover:border-[#8b5cf6]/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]'
              }`}
            >
              {/* Active Glowing Background */}
              {isActive && (
                <motion.div
                  layoutId="career-active-tab-glow"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shadow-[0_0_24px_rgba(139,92,246,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              
              {/* Content */}
              <span className="relative z-10 flex items-center justify-center">
                <Icon size={16} className={`transition-all duration-300 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-[#8e8e93] group-hover:text-[#c084fc] group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]'}`} />
              </span>
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-16 lg:space-y-20">
          {/* Score + Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center min-h-[180px]" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.05)' }}>
              <div className="mb-4">
                <ScoreRing score={score} color={score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444'} label="" size={76} strokeWidth={5} />
              </div>
              <span className="text-[10px] text-[#71717a] uppercase tracking-[0.08em] font-semibold mb-2">Career Score</span>
              <span className="text-[11px] font-medium" style={{ color: score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444' }}>
                {score > 70 ? 'Excellent Status' : score > 40 ? 'Good Progress' : 'Needs Focus'}
              </span>
            </div>
            <CareerMetric icon={BookOpen} color="#3b82f6" label="Study / Day" value={`${c.studyHoursDaily}h`} subtitle="focused" delay={50} />
            <CareerMetric icon={Code2} color="#8b5cf6" label="Coding / Day" value={`${c.codingHoursDaily}h`} subtitle="hands-on" delay={100} />
            <CareerMetric icon={Puzzle} color="#0ea5e9" label="DSA / Day" value={c.dsaPractice} subtitle="problems" delay={150} />
            <CareerMetric icon={Rocket} color="#10b981" label="Projects" value={c.projectsCompleted} subtitle="completed" delay={200} />
            <CareerMetric icon={Target} color="#f59e0b" label="Placement" value={`${placementReadiness}%`} subtitle="readiness" delay={250} />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
            <GlassCard className="p-8 flex flex-col h-full">
              <div className="flex items-center justify-between mb-10">
                <h3 className="dash-section-title mb-0">Skill Radar</h3>
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-[10px] text-[#71717a] cursor-pointer hover:border-white/20 transition-colors">i</div>
              </div>
              <div className="h-80 flex items-center justify-center flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillRadar} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" gridType="polygon" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} />
                    <Radar name="Skills" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-[#8b5cf6]"></span><span className="text-[11px] text-[#a1a1aa]">You</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-[#52525b] border border-dashed"></span><span className="text-[11px] text-[#a1a1aa]">Average</span></div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 flex flex-col justify-between h-full">
              <div>
                <h3 className="dash-section-title mb-8">Skills Portfolio</h3>
                <div className="flex flex-wrap gap-2.5 mb-10">
                  <span className="px-4 py-1.5 rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[12px] text-[#d8b4fe] font-medium tracking-wide">JavaScript</span>
                  <span className="px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[12px] text-[#a1a1aa] font-medium tracking-wide">Python</span>
                  <span className="px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[12px] text-[#a1a1aa] font-medium tracking-wide">React</span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-10">
                <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{name: 'Frontend', value: 33}, {name: 'Backend', value: 25}, {name: 'DSA', value: 21}, {name: 'Tools', value: 13}, {name: 'Soft Skills', value: 8}]} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#0ea5e9" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#f97316" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-[#71717a] font-medium">Total Skills</span>
                    <span className="text-2xl font-bold text-white mt-1">24</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-4 text-[12px]"><span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span><span className="text-[#a1a1aa] w-20">Frontend</span><span className="text-white font-medium">8</span><span className="text-[#71717a]">33%</span></div>
                  <div className="flex items-center gap-4 text-[12px]"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span><span className="text-[#a1a1aa] w-20">Backend</span><span className="text-white font-medium">6</span><span className="text-[#71717a]">25%</span></div>
                  <div className="flex items-center gap-4 text-[12px]"><span className="w-2 h-2 rounded-full bg-[#0ea5e9]"></span><span className="text-[#a1a1aa] w-20">DSA</span><span className="text-white font-medium">5</span><span className="text-[#71717a]">21%</span></div>
                  <div className="flex items-center gap-4 text-[12px]"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span><span className="text-[#a1a1aa] w-20">Tools</span><span className="text-white font-medium">3</span><span className="text-[#71717a]">13%</span></div>
                  <div className="flex items-center gap-4 text-[12px]"><span className="w-2 h-2 rounded-full bg-[#f97316]"></span><span className="text-[#a1a1aa] w-20">Soft Skills</span><span className="text-white font-medium">2</span><span className="text-[#71717a]">8%</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/[0.04]">
                <div className="p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-[#3b82f6] mb-1 tracking-tight">3</p>
                  <p className="text-[10px] text-[#71717a] font-semibold uppercase tracking-wider">Active Courses</p>
                </div>
                <div className="p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-[#a855f7] mb-1 tracking-tight">7.8</p>
                  <p className="text-[10px] text-[#71717a] font-semibold uppercase tracking-wider">GPA</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Bottom Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Card 1: Learning Progress */}
            <GlassCard className="flex flex-col p-8 h-full relative">
              <div className="flex items-center justify-between mb-10">
                <h3 className="dash-section-title flex items-center gap-2 mb-0">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center"><BookOpen size={12} className="text-blue-400" /></div>
                  Learning Progress
                </h3>
                <button className="text-[11px] font-semibold text-[#8b5cf6] hover:text-[#a855f7] transition-colors">View All</button>
              </div>
              <div className="space-y-8 mt-2">
                <div>
                  <div className="flex justify-between items-center text-[12px] mb-2.5">
                    <span className="text-[#a1a1aa] font-medium">DSA Coding Practice</span>
                    <span className="text-[#8b5cf6] font-semibold">{c.dsaPractice} / 5 Daily</span>
                  </div>
                  <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#8b5cf6] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" style={{ width: `${Math.min(100, (c.dsaPractice / 5) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-[12px] mb-2.5">
                    <span className="text-[#a1a1aa] font-medium">Projects Built</span>
                    <span className="text-[#10b981] font-semibold">{c.projectsCompleted} / 4 Target</span>
                  </div>
                  <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#10b981] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, (c.projectsCompleted / 4) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-[12px] mb-2.5">
                    <span className="text-[#a1a1aa] font-medium">Daily Study Hours</span>
                    <span className="text-[#f59e0b] font-semibold">{c.studyHoursDaily}h / 6h Target</span>
                  </div>
                  <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#f59e0b] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, (c.studyHoursDaily / 6) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-8">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#8b5cf6]/[0.03] border border-[#8b5cf6]/10">
                  <span className="text-[11px] text-[#a1a1aa]">Keep going! You're building consistency.</span>
                  <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center"><BookOpen size={10} className="text-[#8b5cf6]" /></div>
                </div>
              </div>
            </GlassCard>

            {/* Card 2: Placement Readiness */}
            <GlassCard className="flex flex-col items-center text-center p-8 h-full">
              <div className="w-full flex items-center justify-start gap-2 mb-8">
                <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center"><Target size={12} className="text-[#f59e0b]" /></div>
                <h3 className="dash-section-title mb-0">Placement Readiness</h3>
              </div>
              
              <div className="mt-4 mb-6">
                <ScoreRing score={placementReadiness} color={placementReadiness > 70 ? '#22c55e' : placementReadiness > 40 ? '#f59e0b' : '#ef4444'} label="" size={110} strokeWidth={6} />
              </div>
              
              <p className="font-bold text-[16px] mb-3" style={{ color: placementReadiness > 70 ? '#22c55e' : placementReadiness > 40 ? '#f59e0b' : '#ef4444' }}>
                {placementReadiness > 70 ? 'Excellent Readiness' : placementReadiness > 40 ? 'Moderate Readiness' : 'Needs Focus'}
              </p>
              
              <p className="leading-relaxed text-[12px] text-[#a1a1aa] px-4">
                {placementReadiness > 70 ? 'You are well-prepared. Keep reviewing core topics and practice interviews.' : placementReadiness > 40 ? 'Review core DSA patterns and build one more deployment-ready project.' : 'Prioritize daily coding sessions and start building basic portfolio projects.'}
              </p>
              
              <button className="mt-auto pt-8 w-full flex items-center justify-center gap-2 text-[12px] font-medium text-[#8b5cf6] hover:text-[#a855f7] border-t border-white/[0.04] transition-colors">
                View Recommendations <span className="text-[14px]">→</span>
              </button>
            </GlassCard>

            {/* Card 3: AI Insights */}
            <GlassCard className="flex flex-col p-8 h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="dash-section-title flex items-center gap-2 mb-0">
                  <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center"><Sparkles size={12} className="text-white" /></div>
                  AI Insights
                </h3>
                <button onClick={() => setTab('recommendations')} className="text-[11px] font-semibold text-[#8b5cf6] hover:text-[#a855f7] transition-colors">View All</button>
              </div>
              
              <div className="space-y-4 w-full mt-2 flex-1">
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all duration-200 flex items-start gap-3.5 group cursor-pointer" onClick={() => setTab('recommendations')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#22c55e]/10 border border-[#22c55e]/20 text-sm flex-shrink-0 mt-0.5">
                    <span className="text-[#22c55e] text-[10px]">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[12px] text-[#22c55e] mb-1">Strength</h4>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed pr-2">You are consistent in DSA practice. Keep solving advanced problems.</p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-[#a1a1aa] transition-colors mt-0.5 text-sm">›</span>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all duration-200 flex items-start gap-3.5 group cursor-pointer" onClick={() => setTab('recommendations')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-sm flex-shrink-0 mt-0.5">
                    <span className="text-[#f59e0b] text-[10px]">!</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[12px] text-[#f59e0b] mb-1">Focus Area</h4>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed pr-2">Complete one fullstack project to improve portfolio strength.</p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-[#a1a1aa] transition-colors mt-0.5 text-sm">›</span>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all duration-200 flex items-start gap-3.5 group cursor-pointer" onClick={() => setTab('recommendations')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#ef4444]/10 border border-[#ef4444]/20 text-sm flex-shrink-0 mt-0.5">
                    <span className="text-[#ef4444] text-[10px]">📍</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[12px] text-[#ef4444] mb-1">Watchout</h4>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed pr-2">Your study hours drop on weekends. Try time blocking.</p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-[#a1a1aa] transition-colors mt-0.5 text-sm">›</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/[0.04] pb-10">
            <h3 className="dash-section-title mb-0">Log Today's Career Data</h3>
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-10">
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-3 block">Study Hours</label><input type="number" value={form.studyHours} onChange={e => setForm(p => ({ ...p, studyHours: e.target.value }))} className="input-premium w-full" placeholder="4" step="0.5" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-3 block">Coding Hours</label><input type="number" value={form.codingHours} onChange={e => setForm(p => ({ ...p, codingHours: e.target.value }))} className="input-premium w-full" placeholder="3" step="0.5" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-3 block">DSA Problems Solved</label><input type="number" value={form.dsa} onChange={e => setForm(p => ({ ...p, dsa: e.target.value }))} className="input-premium w-full" placeholder="3" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-3 block">Add New Skill</label><input type="text" value={form.skill} onChange={e => setForm(p => ({ ...p, skill: e.target.value }))} className="input-premium w-full" placeholder="e.g. Docker" /></div>
            <div className="md:col-span-2 mt-4"><button type="submit" className="btn-primary w-full py-[14px]">Save Career Data</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-8 lg:space-y-10">
          {recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard>
                <div className="flex items-start gap-7">
                  <span className="text-4xl flex-shrink-0 mt-0.5">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-5 gap-4">
                      <h4 className="text-[15px] font-semibold text-[#f0f0f3]">{r.title}</h4>
                      <div className="flex gap-3 flex-shrink-0">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${r.risk === 'high' ? 'bg-[rgba(224,62,62,0.1)] text-[#ef4444]' : r.risk === 'medium' ? 'bg-[rgba(217,115,13,0.1)] text-[#f59e0b]' : 'bg-[rgba(46,158,107,0.1)] text-[#22c55e]'}`}>Risk: {r.risk}</span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#a1a1aa]">{r.confidence}% confidence</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{r.text}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'roadmap' && (
        <div className="space-y-10 lg:space-y-12">
          {roadmap.map((phase, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              <GlassCard className={phase.status === 'locked' ? 'opacity-40' : ''}>
                <div className="flex items-center gap-5 mb-12 pb-8 border-b border-white/[0.04]">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${phase.status === 'done' ? 'bg-emerald-500/10 text-[#22c55e]' : phase.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#71717a]'}`}>
                    {phase.status === 'done' ? '✓' : i + 1}
                  </span>
                  <h4 className="font-semibold text-[#f0f0f3] text-[15px]">{phase.phase}</h4>
                  <span className={`text-[10px] font-semibold px-3 py-1 rounded-lg ml-auto capitalize tracking-wider uppercase ${phase.status === 'done' ? 'bg-[rgba(46,158,107,0.1)] text-[#22c55e]' : phase.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#71717a]'}`}>{phase.status}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 ml-[60px]">
                  {phase.items.map(item => (
                    <div key={item} className="text-[13px] text-[#a1a1aa] flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${phase.status === 'done' ? 'bg-emerald-400' : 'bg-[#52525b]'}`} />
                      {item}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
