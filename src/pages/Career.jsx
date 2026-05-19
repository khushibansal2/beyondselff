import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast } from '../components/ui/Components';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function Career() {
  const { user } = useAuth();
  const { career, health, updateDomain, computed } = useData();
  const [tab, setTab] = useState('overview');
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };
  const score = computed?.careerScore?.score || 0;
  const [form, setForm] = useState({ studyHours: '', codingHours: '', dsa: '', skill: '' });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'log', label: 'Log Data', icon: '✏️' },
    { id: 'recommendations', label: 'AI Recommendations', icon: '🤖' },
    { id: 'roadmap', label: 'Learning Path', icon: '🗺️' },
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

  const recommendations = [
    { icon: '🧩', title: 'Skill Gap Analysis', text: c.skills.length < 5 ? `You have ${c.skills.length} skills. Top companies expect 5-7+ skills. Add: ${['TypeScript','Docker','AWS','System Design','MongoDB'].filter(s => !c.skills.includes(s)).slice(0,3).join(', ')}.` : 'Strong skill set! Focus on deepening expertise in 2-3 core skills.', confidence: 86, risk: c.skills.length < 4 ? 'high' : 'low' },
    { icon: '📚', title: 'DSA Strategy', text: c.dsaPractice < 3 ? `Increase from ${c.dsaPractice} to 3-5 problems/day. Focus: Arrays → Strings → Trees → Graphs → DP. Use spaced repetition.` : 'Excellent DSA practice! Add timed mock contests to simulate interview pressure.', confidence: 89, risk: c.dsaPractice < 2 ? 'high' : 'low' },
    { icon: '🚀', title: 'Project Portfolio', text: c.projectsCompleted < 4 ? `${c.projectsCompleted} projects isn't enough. Build: 1 full-stack app, 1 ML/AI project, 1 open-source contribution.` : `${c.projectsCompleted} projects is strong! Add READMEs, demos, and deploy them for visibility.`, confidence: 84, risk: 'medium' },
    { icon: '🎯', title: 'Placement Readiness', text: `Readiness score: ${placementReadiness}%. ${placementReadiness < 60 ? 'Focus on DSA and projects to increase interview chances.' : 'You\'re well-prepared. Practice mock interviews to build confidence.'}`, confidence: 81, risk: placementReadiness < 50 ? 'high' : 'low' },
    { icon: '⏰', title: 'Study Efficiency', text: (health?.sleepAvg || 7) < 6 ? `Low sleep (${health?.sleepAvg || 7}h) is reducing your study efficiency. Even with ${c.studyHoursDaily}h of study, effective learning may be only ${Math.round(c.studyHoursDaily * 0.6)}h.` : 'Good sleep supports effective learning. Your study hours are productive.', confidence: 78, risk: (health?.sleepAvg || 7) < 6 ? 'high' : 'low' },
  ];

  const roadmap = [
    { phase: 'Foundation', items: ['Data Structures & Algorithms', 'Object-Oriented Programming', 'Database Management', 'Git & Version Control'], status: c.dsaPractice >= 2 ? 'done' : 'active' },
    { phase: 'Core Skills', items: ['Frontend (React/Vue)', 'Backend (Node/Spring)', 'API Design (REST/GraphQL)', 'Testing & Debugging'], status: c.skills.length >= 4 ? 'done' : c.dsaPractice >= 2 ? 'active' : 'locked' },
    { phase: 'Projects', items: ['Full-Stack Web App', 'Mobile App / AI Project', 'Open Source Contribution', 'Technical Blog'], status: c.projectsCompleted >= 3 ? 'done' : c.skills.length >= 4 ? 'active' : 'locked' },
    { phase: 'Interview Prep', items: ['250+ DSA Problems', 'System Design Basics', 'Mock Interviews', 'Resume & LinkedIn'], status: c.projectsCompleted >= 3 ? 'active' : 'locked' },
  ];

  return (
    <div className="page-container min-h-screen">
      <PageHeader title="Career & Growth" subtitle="Track skills, prepare for placements, and accelerate your career." icon="🎯" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1 border-white/[0.04]">
              <ScoreRing score={score} color="auto" label="Career Score" size={120} />
            </GlassCard>
            <MetricCard icon="📚" label="Study/day" value={`${c.studyHoursDaily}h`} color="#3b82f6" />
            <MetricCard icon="💻" label="Coding/day" value={`${c.codingHoursDaily}h`} color="#8b5cf6" />
            <MetricCard icon="🧩" label="DSA/day" value={c.dsaPractice} color="#0ea5e9" />
            <MetricCard icon="🚀" label="Projects" value={c.projectsCompleted} color="#10b981" />
            <MetricCard icon="🎯" label="Placement" value={`${placementReadiness}%`} color="#f59e0b" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            <GlassCard>
              <h3 className="dash-section-title mb-6">Skill Radar</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillRadar}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <Radar name="Skills" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="dash-section-title mb-6">Skills Portfolio</h3>
              <div className="flex flex-wrap gap-2.5 mb-6">
                {c.skills.map(s => (
                  <span key={s} className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[12px] text-[#a1a1aa] font-medium tracking-wide">
                    {s}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-5 mt-auto">
                <div className="p-5 rounded-2xl bg-[#141416] border border-white/[0.04] text-center">
                  <p className="text-3xl font-bold text-blue-400 mb-1">{c.coursesActive}</p>
                  <p className="text-[11px] text-[#71717a] font-medium uppercase tracking-wide">Active Courses</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#141416] border border-white/[0.04] text-center">
                  <p className="text-3xl font-bold text-[#a78bfa] mb-1">{c.gpa}</p>
                  <p className="text-[11px] text-[#71717a] font-medium uppercase tracking-wide">GPA</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="border-b border-white/[0.04] pb-6 mb-8">
            <h3 className="dash-section-title mb-0">Log Today's Career Data</h3>
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-6">
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Study Hours</label><input type="number" value={form.studyHours} onChange={e => setForm(p => ({ ...p, studyHours: e.target.value }))} className="input-premium w-full" placeholder="4" step="0.5" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Coding Hours</label><input type="number" value={form.codingHours} onChange={e => setForm(p => ({ ...p, codingHours: e.target.value }))} className="input-premium w-full" placeholder="3" step="0.5" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">DSA Problems Solved</label><input type="number" value={form.dsa} onChange={e => setForm(p => ({ ...p, dsa: e.target.value }))} className="input-premium w-full" placeholder="3" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Add New Skill</label><input type="text" value={form.skill} onChange={e => setForm(p => ({ ...p, skill: e.target.value }))} className="input-premium w-full" placeholder="e.g. Docker" /></div>
            <div className="md:col-span-2 mt-2"><button type="submit" className="btn-primary w-full py-[14px]">Save Career Data</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-6">
          {recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard>
                <div className="flex items-start gap-6">
                  <span className="text-4xl flex-shrink-0">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3 gap-4">
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
        <div className="space-y-6">
          {roadmap.map((phase, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              <GlassCard className={phase.status === 'locked' ? 'opacity-40' : ''}>
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.04]">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${phase.status === 'done' ? 'bg-emerald-500/10 text-[#22c55e]' : phase.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#71717a]'}`}>
                    {phase.status === 'done' ? '✓' : i + 1}
                  </span>
                  <h4 className="font-semibold text-[#f0f0f3] text-[15px]">{phase.phase}</h4>
                  <span className={`text-[11px] font-medium px-3 py-1 rounded-lg ml-auto capitalize ${phase.status === 'done' ? 'bg-[rgba(46,158,107,0.1)] text-[#22c55e]' : phase.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#71717a]'}`}>{phase.status}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 ml-12">
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
