import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast } from '../components/ui/Components';
import { AdaptiveRecommendations } from '../components/ui/AdaptiveRecommendations';
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



  const roadmap = [
    { phase: 'Foundation', items: ['Data Structures & Algorithms', 'Object-Oriented Programming', 'Database Management', 'Git & Version Control'], status: c.dsaPractice >= 2 ? 'done' : 'active' },
    { phase: 'Core Skills', items: ['Frontend (React/Vue)', 'Backend (Node/Spring)', 'API Design (REST/GraphQL)', 'Testing & Debugging'], status: c.skills.length >= 4 ? 'done' : c.dsaPractice >= 2 ? 'active' : 'locked' },
    { phase: 'Projects', items: ['Full-Stack Web App', 'Mobile App / AI Project', 'Open Source Contribution', 'Technical Blog'], status: c.projectsCompleted >= 3 ? 'done' : c.skills.length >= 4 ? 'active' : 'locked' },
    { phase: 'Interview Prep', items: ['250+ DSA Problems', 'System Design Basics', 'Mock Interviews', 'Resume & LinkedIn'], status: c.projectsCompleted >= 3 ? 'active' : 'locked' },
  ];

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Career & Growth" subtitle="Track skills, prepare for placements, and accelerate your career." icon="🎯" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1" glow="glow-blue">
              <ScoreRing score={score} color="auto" label="Career Score" size={100} />
            </GlassCard>
            <MetricCard icon="📚" label="Study/day" value={`${c.studyHoursDaily}h`} color="#3b82f6" />
            <MetricCard icon="💻" label="Coding/day" value={`${c.codingHoursDaily}h`} color="#8b5cf6" />
            <MetricCard icon="🧩" label="DSA/day" value={c.dsaPractice} color="#06b6d4" />
            <MetricCard icon="🚀" label="Projects" value={c.projectsCompleted} color="#10b981" />
            <MetricCard icon="🎯" label="Placement" value={`${placementReadiness}%`} color="#f59e0b" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Skill Radar</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillRadar}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name="Skills" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Skills Portfolio</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {c.skills.map(s => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">{s}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-2xl font-bold text-blue-400">{c.coursesActive}</p>
                  <p className="text-[10px] text-slate-500">Active Courses</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-2xl font-bold text-purple-400">{c.gpa}</p>
                  <p className="text-[10px] text-slate-500">GPA</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4">Log Today's Career Data</h3>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 mb-1.5 block">Study Hours</label><input type="number" value={form.studyHours} onChange={e => setForm(p => ({ ...p, studyHours: e.target.value }))} className="input-premium" placeholder="4" step="0.5" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Coding Hours</label><input type="number" value={form.codingHours} onChange={e => setForm(p => ({ ...p, codingHours: e.target.value }))} className="input-premium" placeholder="3" step="0.5" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">DSA Problems Solved</label><input type="number" value={form.dsa} onChange={e => setForm(p => ({ ...p, dsa: e.target.value }))} className="input-premium" placeholder="3" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Add New Skill</label><input type="text" value={form.skill} onChange={e => setForm(p => ({ ...p, skill: e.target.value }))} className="input-premium" placeholder="e.g. Docker" /></div>
            <div className="md:col-span-2"><button type="submit" className="btn-primary">Save Career Data ✓</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <AdaptiveRecommendations domain="career" />
      )}

      {tab === 'roadmap' && (
        <div className="space-y-4">
          {roadmap.map((phase, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              <GlassCard className={phase.status === 'locked' ? 'opacity-50' : ''}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${phase.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : phase.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-600'}`}>
                    {phase.status === 'done' ? '✓' : i + 1}
                  </span>
                  <h4 className="font-semibold">{phase.phase}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${phase.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : phase.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-slate-600'}`}>{phase.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-11">
                  {phase.items.map(item => (
                    <div key={item} className="text-xs text-slate-400 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${phase.status === 'done' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
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
