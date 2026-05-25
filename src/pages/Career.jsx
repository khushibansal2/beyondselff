import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast } from '../components/ui/Components';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { generateLearningPath } from '../services/learningService';

export default function Career() {
  const { user } = useAuth();
  const { career, health, records, updateDomain, addRecords, computed } = useData();
  const careerRecords = records?.career || [];
  const [tab, setTab] = useState('overview');
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };
  const score = computed?.careerScore?.score || 0;
  const [form, setForm] = useState({ studyHours: '', codingHours: '', dsa: '', skill: '', projects: '' });

  // ── Learning Path State ────────────────────────────────────────────────────
  const savedPath = career?.generatedLearningPath || null;
  const [lpCurrentRole, setLpCurrentRole] = useState(career?.currentRole || c.currentRole || '');
  const [lpTargetRole, setLpTargetRole] = useState(career?.targetRole || '');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpResult, setLpResult] = useState(savedPath);

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
    const record = { date: new Date().toISOString() };
    let changes = 0;
    if (form.studyHours)  { updated.studyHoursDaily  = parseFloat(form.studyHours);  record.studyHours  = parseFloat(form.studyHours);  changes++; }
    if (form.codingHours) { updated.codingHoursDaily = parseFloat(form.codingHours); record.codingHours = parseFloat(form.codingHours); changes++; }
    if (form.dsa)         { updated.dsaPractice      = parseInt(form.dsa);           record.dsa         = parseInt(form.dsa);           changes++; }
    if (form.projects)    { updated.projectsCompleted = parseInt(form.projects);     record.projects    = parseInt(form.projects);      changes++; }
    if (form.skill && !updated.skills.includes(form.skill.trim())) {
      updated.skills = [...(updated.skills || []), form.skill.trim()];
      record.skillAdded = form.skill.trim();
      changes++;
    }
    if (changes === 0) { showToast('Please fill at least one field', 'error'); return; }
    updateDomain('career', updated);
    addRecords('career', [record]);
    setForm({ studyHours: '', codingHours: '', dsa: '', skill: '', projects: '' });
    showToast(`Career data updated (${changes} field${changes > 1 ? 's' : ''})`, 'success');
  };

  // Consecutive logging streak
  const streak = (() => {
    if (careerRecords.length === 0) return 0;
    const uniqueDays = [...new Set(careerRecords.map(r => (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString()).split('T')[0]))].sort().reverse();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let count = 0; let cursor = new Date(today);
    for (const d of uniqueDays) {
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      const diff = Math.round((cursor - day) / 86400000);
      if (diff === 0 || diff === 1) { count++; cursor = day; } else break;
    }
    return count;
  })();

  const recentLogs = [...careerRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

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

  const platformColor = (platform) => {
    if (platform === 'Coursera') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (platform === 'Udemy') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20'; // YouTube
  };

  const handleGenerateLearningPath = async (e) => {
    e.preventDefault();
    if (!lpCurrentRole.trim() || !lpTargetRole.trim()) {
      showToast('Please enter both current and target roles.', 'error');
      return;
    }
    setLpLoading(true);
    setLpResult(null);
    try {
      const result = await generateLearningPath(lpCurrentRole.trim(), lpTargetRole.trim());
      setLpResult(result);
      updateDomain('career', {
        ...c,
        currentRole: lpCurrentRole.trim(),
        targetRole: lpTargetRole.trim(),
        generatedLearningPath: result,
      });
      showToast('Learning path generated!', 'success');
    } catch (err) {
      showToast('Failed to generate path. Try again.', 'error');
    } finally {
      setLpLoading(false);
    }
  };

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold">Log Today's Career Data</h3>
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.05]">
                <span className="text-lg">🔥</span>
                <span className="text-[12px] font-semibold text-blue-300">{streak}-Day Streak</span>
                <span className="text-[10px] text-blue-500/60 ml-1">{careerRecords.length} entries</span>
              </div>
            )}
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-400 mb-1.5 block">Study Hours Today</label><input type="number" value={form.studyHours} onChange={e => setForm(p => ({ ...p, studyHours: e.target.value }))} className="input-premium" placeholder="4" step="0.5" min="0" max="24" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Coding Hours Today</label><input type="number" value={form.codingHours} onChange={e => setForm(p => ({ ...p, codingHours: e.target.value }))} className="input-premium" placeholder="3" step="0.5" min="0" max="24" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">DSA Problems Solved</label><input type="number" value={form.dsa} onChange={e => setForm(p => ({ ...p, dsa: e.target.value }))} className="input-premium" placeholder="3" min="0" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Projects Completed (total)</label><input type="number" value={form.projects} onChange={e => setForm(p => ({ ...p, projects: e.target.value }))} className="input-premium" placeholder={c.projectsCompleted || '2'} min="0" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Add New Skill</label><input type="text" value={form.skill} onChange={e => setForm(p => ({ ...p, skill: e.target.value }))} className="input-premium" placeholder="e.g. Docker, Kubernetes" /></div>
            <div className="flex items-end"><button type="submit" className="btn-primary w-full">Save Entry ✓</button></div>
          </form>

          {recentLogs.length > 0 && (
            <div className="mt-8 border-t border-white/[0.04] pt-6">
              <h4 className="text-[12px] font-semibold text-[#a1a1aa] mb-4 uppercase tracking-wide">Recent Logs</h4>
              <div className="space-y-2">
                {recentLogs.map((entry, i) => {
                  const date = new Date(entry.date);
                  const parts = [];
                  if (entry.studyHours != null)  parts.push(`📚 ${entry.studyHours}h study`);
                  if (entry.codingHours != null) parts.push(`💻 ${entry.codingHours}h coding`);
                  if (entry.dsa != null)         parts.push(`🧩 ${entry.dsa} DSA`);
                  if (entry.projects != null)    parts.push(`🚀 ${entry.projects} projects`);
                  if (entry.skillAdded)          parts.push(`🎯 +${entry.skillAdded}`);
                  return (
                    <div key={i} className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] text-[11px]">
                      <span className="text-[#52525b] font-mono min-w-[52px]">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      <div className="flex flex-wrap gap-2 text-[#a1a1aa]">{parts.map((p, j) => <span key={j}>{p}</span>)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard>
                <div className="flex items-start gap-4"><span className="text-3xl">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2"><h4 className="font-semibold">{r.title}</h4>
                      <div className="flex gap-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${r.risk === 'high' ? 'bg-red-500/10 text-red-400' : r.risk === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>Risk: {r.risk}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{r.confidence}%</span></div></div>
                    <p className="text-sm text-slate-400 leading-relaxed">{r.text}</p></div></div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'roadmap' && (
        <div className="space-y-6">

          {/* ── AI Learning Path Generator ── */}
          <GlassCard>
            <div className="mb-5">
              <h3 className="text-[16px] font-bold text-[#f0f0f3] tracking-tight mb-1">🎯 AI Learning Path Generator</h3>
              <p className="text-[12px] text-slate-400">Enter your current and target roles to get a personalized AI-curated course roadmap.</p>
            </div>
            <form onSubmit={handleGenerateLearningPath} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1.5 block">Current Role</label>
                <input
                  type="text"
                  value={lpCurrentRole}
                  onChange={e => setLpCurrentRole(e.target.value)}
                  className="input-premium w-full"
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1.5 block">Target Role</label>
                <input
                  type="text"
                  value={lpTargetRole}
                  onChange={e => setLpTargetRole(e.target.value)}
                  className="input-premium w-full"
                  placeholder="e.g. Machine Learning Engineer"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={lpLoading}
                  className="btn-primary whitespace-nowrap disabled:opacity-60"
                >
                  {lpLoading ? 'Building...' : 'Generate Path 🚀'}
                </button>
              </div>
            </form>
          </GlassCard>

          {/* ── Loading skeleton ── */}
          {lpLoading && (
            <GlassCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <p className="text-sm text-blue-300 font-medium">Building your learning path…</p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
                ))}
              </div>
            </GlassCard>
          )}

          {/* ── Generated Learning Path ── */}
          {lpResult && !lpLoading && (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

              {/* Approximate match warning */}
              {lpResult.approximate && (
                <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2.5">
                  <span className="text-amber-400 text-base">⚠️</span>
                  <p className="text-[12px] text-amber-300">
                    Showing closest available path for your transition — exact match not found in our database.
                  </p>
                </div>
              )}

              {/* Summary header */}
              <GlassCard>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Learning Path</p>
                    <h3 className="text-[18px] font-bold text-[#f0f0f3]">
                      {lpResult.from} <span className="text-blue-400">→</span> {lpResult.to}
                    </h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-blue-400">{lpResult.totalHours}</p>
                      <p className="text-[10px] text-slate-500">Total Hours</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-emerald-400 mt-1">{lpResult.totalCost}</p>
                      <p className="text-[10px] text-slate-500">Est. Cost</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Phases */}
              {lpResult.phases?.map((phase, pi) => (
                <motion.div key={pi} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.1 }}>
                  <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                        {pi + 1}
                      </span>
                      <h4 className="font-semibold text-[#f0f0f3] text-[14px]">{phase.phase}</h4>
                    </div>
                    <div className="space-y-3">
                      {phase.courses?.map((course, ci) => (
                        <div key={ci} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/20 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h5 className="text-[13px] font-semibold text-[#f0f0f3]">{course.title}</h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${platformColor(course.platform)}`}>
                                  {course.platform}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span>⏱ {course.hours} hrs</span>
                                <span className={course.cost === 'Free' || course.cost === 'Free to audit' ? 'text-emerald-400' : 'text-amber-400'}>
                                  {course.cost === 'Free' || course.cost === 'Free to audit' ? '✓ ' : '💳 '}{course.cost}
                                </span>
                              </div>
                            </div>
                            <a
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-medium hover:bg-blue-500/20 hover:text-blue-300 transition-all whitespace-nowrap"
                            >
                              Open Course →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Static Skill Roadmap (always visible below) ── */}
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3 px-1">General Skill Roadmap</p>
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
          </div>

        </div>
      )}
    </div>
  );
}
