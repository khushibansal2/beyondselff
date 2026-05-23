import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader } from '../components/ui/Components';
import { fetchGitHubProfile, analyzeGitHubWithAI, LANG_COLORS } from '../services/githubService';
import {
  analyzeFood, hasNutritionixKey, saveNutritionixKeys, clearNutritionixKeys, getDemoFoodResult
} from '../services/nutritionixService';
import {
  extractPdfText, parseResumeWithAI,
  saveResumeData, loadResumeData, clearResumeData,
} from '../services/resumeService';
import {
  GitBranch, Briefcase, Activity, Landmark, Utensils,
  Search, Sparkles, CheckCircle, AlertTriangle, ExternalLink,
  Star, GitFork, Code2, Users, TrendingUp, Key, Plus,
  Zap, Brain, ChevronRight, BarChart2, RefreshCw,
} from 'lucide-react';

// ── Shared helpers ────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex-wrap">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 flex-1 justify-center text-[12px] px-4 py-2.5 rounded-xl font-semibold transition-all min-w-[100px] ${
            active === t.id
              ? 'bg-[#18181b] border border-white/[0.08] text-[#f0f0f3] shadow-lg'
              : 'text-[#52525b] hover:text-[#a1a1aa]'
          }`}
        >
          <t.icon size={14} className={active === t.id ? t.color : ''} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    live:  { cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400', label: 'Live' },
    demo:  { cls: 'bg-amber-500/10  border-amber-500/20  text-amber-400',   dot: 'bg-amber-400',   label: 'Demo' },
    none:  { cls: 'bg-[#27272a]/50  border-white/[0.06]  text-[#71717a]',   dot: 'bg-[#52525b]',   label: 'Not Connected' },
  };
  const c = cfg[status] ?? cfg.none;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-semibold ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function MacroBar({ label, value, unit = 'g', color, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[#71717a]">{label}</span>
        <span className="text-[12px] font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── GITHUB PANEL ──────────────────────────────────────────────────────────────

function GitHubPanel() {
  const { career, updateDomain } = useData();
  const [username,   setUsername]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [profile,    setProfile]    = useState(null);
  const [analysis,   setAnalysis]   = useState(null);
  const [error,      setError]      = useState(null);

  async function handleFetch() {
    if (!username.trim()) return;
    setLoading(true); setError(null); setProfile(null); setAnalysis(null);
    try {
      const data = await fetchGitHubProfile(username.trim());
      setProfile(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAIAnalysis() {
    if (!profile) return;
    setAiLoading(true);
    try {
      const res = await analyzeGitHubWithAI(profile);
      setAnalysis(res);
    } catch (e) { setError(`AI analysis failed: ${e.message}`); }
    finally { setAiLoading(false); }
  }

  function handleSyncSkills() {
    if (!profile) return;
    const newSkills = profile.languages.map(l => l.lang);
    const merged = [...new Set([...(career?.skills ?? []), ...newSkills])];
    updateDomain('career', { ...career, skills: merged });
    alert(`Synced ${newSkills.length} skills to your Career profile!`);
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} className="text-[#a1a1aa]" />
          <h3 className="text-[14px] font-semibold text-[#f0f0f3]">GitHub Developer Analytics</h3>
          <StatusBadge status={profile ? 'live' : 'none'} />
        </div>
        <p className="text-[12px] text-[#71717a] mb-4">Enter any GitHub username to analyze their coding profile, tech stack, and get AI-powered career insights.</p>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="e.g. torvalds"
            className="input-premium flex-1 text-[13px]"
          />
          <button
            onClick={handleFetch}
            disabled={!username.trim() || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13px] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #24292e, #57606a)', boxShadow: '0 0 16px rgba(0,0,0,0.4)' }}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Search size={14} />}
            {loading ? 'Fetching…' : 'Analyze'}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </GlassCard>

      {/* Profile Results */}
      <AnimatePresence>
        {profile && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* User card */}
            <GlassCard>
              <div className="flex items-start gap-4">
                <img
                  src={profile.user.avatar_url}
                  alt={profile.user.login}
                  className="w-16 h-16 rounded-2xl border border-white/[0.08]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[16px] font-bold text-[#f0f0f3]">{profile.user.name || profile.user.login}</h2>
                    <a href={profile.user.html_url} target="_blank" rel="noreferrer"
                      className="text-[11px] text-[#52525b] hover:text-indigo-400 transition-colors flex items-center gap-1">
                      @{profile.user.login} <ExternalLink size={10} />
                    </a>
                  </div>
                  {profile.user.bio && <p className="text-[12px] text-[#71717a] mt-1 leading-relaxed">{profile.user.bio}</p>}
                  {profile.domains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {profile.domains.map(d => (
                        <span key={d} className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Developer Score */}
                <div className="text-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center"
                    style={{ borderColor: profile.metrics.devScore >= 70 ? '#10b981' : profile.metrics.devScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                    <span className="text-[20px] font-black" style={{ color: profile.metrics.devScore >= 70 ? '#10b981' : profile.metrics.devScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                      {profile.metrics.devScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#52525b] mt-1">Dev Score</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/[0.05]">
                {[
                  { label: 'Repositories', value: profile.user.public_repos, icon: Code2,   color: '#6366f1' },
                  { label: 'Total Stars',  value: profile.metrics.totalStars, icon: Star,    color: '#f59e0b' },
                  { label: 'Followers',    value: profile.user.followers,      icon: Users,   color: '#10b981' },
                  { label: 'Active (30d)', value: profile.metrics.recentRepos, icon: Activity,color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <s.icon size={14} className="mx-auto mb-1.5" style={{ color: s.color }} />
                    <p className="text-[16px] font-bold text-[#f0f0f3]">{s.value}</p>
                    <p className="text-[10px] text-[#52525b]">{s.label}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Language Chart */}
            <GlassCard>
              <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Tech Stack Distribution</h3>
              <div className="space-y-3">
                {profile.languages.map(l => (
                  <div key={l.lang}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: LANG_COLORS[l.lang] ?? '#6366f1' }} />
                        <span className="text-[12px] text-[#a1a1aa] font-medium">{l.lang}</span>
                      </div>
                      <span className="text-[11px] text-[#52525b]">{l.count} repos · {l.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${l.pct}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full" style={{ background: LANG_COLORS[l.lang] ?? '#6366f1' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Top Repos */}
            <GlassCard>
              <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Top Repositories</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {profile.topRepos.map(r => (
                  <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer"
                    className="block p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#a1a1aa] group-hover:text-indigo-300 transition-colors truncate">{r.name}</p>
                        {r.description && <p className="text-[11px] text-[#52525b] mt-0.5 line-clamp-2 leading-relaxed">{r.description}</p>}
                      </div>
                      <ExternalLink size={11} className="text-[#3f3f46] group-hover:text-[#71717a] flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-3 mt-2.5">
                      {r.language && (
                        <span className="flex items-center gap-1 text-[10px] text-[#71717a]">
                          <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[r.language] ?? '#6366f1' }} />
                          {r.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-[#71717a]"><Star size={10} />{r.stargazers_count}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#71717a]"><GitFork size={10} />{r.forks_count}</span>
                    </div>
                  </a>
                ))}
              </div>
            </GlassCard>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSyncSkills}
                className="flex items-center gap-2 text-[12px] px-4 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 font-semibold transition-all">
                <Plus size={13} /> Sync Languages to Career Profile
              </button>
              <button onClick={handleAIAnalysis} disabled={aiLoading}
                className="flex items-center gap-2 text-[12px] px-4 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {aiLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Sparkles size={13} />}
                {aiLoading ? 'Analyzing…' : 'AI Career Analysis'}
              </button>
            </div>

            {/* AI Analysis */}
            {analysis && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-indigo-400" />
                      <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI Career Analysis</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#52525b]">Level:</span>
                      <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{analysis.overallLevel}</span>
                      <span className="text-[11px] text-[#52525b] ml-2">Hirability:</span>
                      <span className="text-[12px] font-bold text-emerald-400">{analysis.hirability}%</span>
                    </div>
                  </div>

                  <p className="text-[12px] text-[#a1a1aa] italic leading-relaxed mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    "{analysis.summary}"
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { title: 'Strengths',    items: analysis.strengths,    color: 'text-emerald-400', bg: 'bg-emerald-500/[0.04] border-emerald-500/15', dot: 'bg-emerald-500/60' },
                      { title: 'Skill Gaps',   items: analysis.gaps,         color: 'text-red-400',     bg: 'bg-red-500/[0.04] border-red-500/15',         dot: 'bg-red-500/60'     },
                      { title: 'Learn Next',   items: analysis.nextSkills,   color: 'text-amber-400',   bg: 'bg-amber-500/[0.04] border-amber-500/15',     dot: 'bg-amber-500/60'   },
                    ].map(s => (
                      <div key={s.title} className={`p-3.5 rounded-xl border ${s.bg}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${s.color}`}>{s.title}</p>
                        <ul className="space-y-1.5">
                          {(s.items ?? []).map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-[#a1a1aa]">
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-2">Career Paths</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.careerPaths ?? []).map((p, i) => (
                        <span key={i} className="text-[11px] px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 font-medium">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.05]">
                    <p className="text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-2">Resume Tips</p>
                    <ul className="space-y-1.5">
                      {(analysis.resumeTips ?? []).map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-[#71717a]"><ChevronRight size={12} className="mt-0.5 text-indigo-500 flex-shrink-0" />{t}</li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!profile && !loading && !error && (
        <GlassCard className="text-center py-12">
          <GitBranch size={32} className="mx-auto mb-3 text-[#52525b]" />
          <p className="text-[13px] font-semibold text-[#a1a1aa] mb-1">Analyze any GitHub profile</p>
          <p className="text-[12px] text-[#52525b]">No authentication required · Works with any public profile</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {['torvalds', 'gvanrossum', 'sindresorhus', 'yyx990803'].map(u => (
              <button key={u} onClick={() => { setUsername(u); }}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#52525b] hover:text-[#a1a1aa] transition-all font-mono">
                {u}
              </button>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── RESUME AI PANEL ───────────────────────────────────────────────────────────

const PARSE_STEPS = [
  'Reading PDF pages…',
  'Extracting text layout…',
  'Sending to Groq AI…',
  'Parsing skills & experience…',
  'Generating career insights…',
];

const PRIORITY_COLOR = { high: 'text-red-400 bg-red-500/[0.06] border-red-500/15', medium: 'text-amber-400 bg-amber-500/[0.06] border-amber-500/15', low: 'text-[#71717a] bg-white/[0.02] border-white/[0.06]' };

function ScoreCard({ label, value, color, unit = '/100' }) {
  return (
    <GlassCard>
      <p className="text-[10px] text-[#52525b] mb-1.5 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-[28px] font-black leading-none" style={{ color }}>{value}<span className="text-[12px] font-medium text-[#52525b] ml-0.5">{unit}</span></p>
      <div className="h-1.5 rounded-full bg-white/[0.05] mt-2.5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </GlassCard>
  );
}

function LinkedInPanel() {
  const { career, updateDomain } = useData();
  const fileRef   = useRef(null);
  const resultRef = useRef(null);

  const [phase,      setPhase]      = useState(() => loadResumeData() ? 'results' : 'upload');
  const [stepText,   setStepText]   = useState('');
  const [stepIdx,    setStepIdx]    = useState(0);
  const [dragOver,   setDragOver]   = useState(false);
  const [resume,     setResume]     = useState(() => loadResumeData());
  const [error,      setError]      = useState(null);
  const [synced,     setSynced]     = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  async function processFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.'); return;
    }
    setPhase('parsing'); setError(null); setStepIdx(0);

    const tick = (i, msg) => { setStepIdx(i); setStepText(msg); };

    try {
      tick(0, PARSE_STEPS[0]);
      const text = await extractPdfText(file);

      tick(2, PARSE_STEPS[2]);
      const parsed = await parseResumeWithAI(text, (msg) => tick(3, msg));

      saveResumeData(parsed);
      setResume(parsed);
      setPhase('results');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e.message === 'NO_KEY' ? 'No Groq API key configured. Add VITE_GROQ_API_KEY to your .env file.' : e.message);
      setPhase('upload');
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleReset() {
    clearResumeData();
    setResume(null); setPhase('upload'); setError(null); setSynced(false); setActiveSection('overview');
  }

  function handleSyncSkills() {
    const newSkills = resume?.skills ?? [];
    const merged = [...new Set([...(career?.skills ?? []), ...newSkills])];
    updateDomain('career', { ...career, skills: merged, projectsCompleted: (career?.projectsCompleted ?? 0) + (resume?.projects?.length ?? 0) });
    setSynced(true);
  }

  const r = resume;
  const skillCats = r?.skillCategories ?? {};

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Briefcase size={16} className="text-indigo-400" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">Resume AI Intelligence</h3>
            <StatusBadge status={phase === 'results' ? 'live' : 'none'} />
          </div>
          {phase === 'results' && (
            <button onClick={handleReset} className="text-[11px] px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 transition-all">
              Upload New
            </button>
          )}
        </div>
        {phase === 'upload' && (
          <p className="text-[12px] text-[#52525b] mt-2">
            Upload your resume PDF — AI extracts skills, experience, education, and projects, then generates ATS score, skill gap analysis, and a personalised learning roadmap.
          </p>
        )}
      </GlassCard>

      {/* ── Upload Zone ── */}
      {phase === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 p-12 ${
                dragOver ? 'border-indigo-500/50 bg-indigo-500/[0.05]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <span className="text-3xl">📄</span>
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#f0f0f3] mb-1">Drop your resume PDF here</p>
                <p className="text-[12px] text-[#52525b]">or click to browse · PDF only · text-based (not scanned)</p>
              </div>
              <div className="flex gap-3 text-[11px] text-[#3f3f46]">
                {['Skills Extraction', 'ATS Score', 'Skill Gap Analysis', 'Learning Roadmap'].map(f => (
                  <span key={f} className="flex items-center gap-1"><CheckCircle size={10} className="text-indigo-400" />{f}</span>
                ))}
              </div>
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ── Parsing Animation ── */}
      {phase === 'parsing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.03]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full border-2 border-indigo-400/60 border-t-indigo-400 animate-spin flex-shrink-0" />
              <div>
                <p className="text-[14px] font-semibold text-[#f0f0f3]">Analyzing your resume…</p>
                <p className="text-[12px] text-[#52525b]">{stepText}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {PARSE_STEPS.map((step, i) => (
                <motion.div key={step} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}
                  className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    i < stepIdx ? 'bg-indigo-500' : i === stepIdx ? 'border-2 border-indigo-400 animate-pulse' : 'border border-white/[0.06]'
                  }`}>
                    {i < stepIdx && <CheckCircle size={11} className="text-white" />}
                  </div>
                  <span className={`text-[12px] ${i <= stepIdx ? 'text-[#a1a1aa]' : 'text-[#3f3f46]'}`}>{step}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Results Dashboard ── */}
      {phase === 'results' && r && (
        <motion.div ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Identity card */}
          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                {r.personalInfo?.name ? r.personalInfo.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[16px] font-bold text-[#f0f0f3]">{r.personalInfo?.name || 'Your Profile'}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">{r.overallLevel}</span>
                  {r.totalExperienceYears > 0 && <span className="text-[11px] text-[#52525b]">{r.totalExperienceYears}yr exp</span>}
                </div>
                {r.personalInfo?.email && <p className="text-[12px] text-[#71717a] mt-0.5">{r.personalInfo.email}{r.personalInfo.location ? ` · ${r.personalInfo.location}` : ''}</p>}
                <p className="text-[12px] text-[#a1a1aa] mt-2 leading-relaxed italic">"{r.summary}"</p>
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.05]">
              <button onClick={handleSyncSkills} disabled={synced}
                className="flex items-center gap-2 text-[12px] px-4 py-2.5 rounded-xl border font-semibold transition-all disabled:cursor-default"
                style={{ background: synced ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: synced ? '#10b981' : '#6ee7b7' }}>
                {synced ? <><CheckCircle size={13} /> Synced to Career Profile</> : <><Plus size={13} /> Sync to Career Profile</>}
              </button>
              {r.personalInfo?.linkedin && (
                <a href={r.personalInfo.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] px-3.5 py-2.5 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] transition-all">
                  <ExternalLink size={12} /> LinkedIn
                </a>
              )}
              {r.personalInfo?.github && (
                <a href={r.personalInfo.github} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] px-3.5 py-2.5 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] transition-all">
                  <ExternalLink size={12} /> GitHub
                </a>
              )}
            </div>
          </GlassCard>

          {/* Score row */}
          <div className="grid grid-cols-3 gap-3">
            <ScoreCard label="ATS Score"       value={r.atsScore}        color="#f59e0b" />
            <ScoreCard label="Profile Strength" value={r.profileStrength} color="#6366f1" />
            <ScoreCard label="Hirability"       value={r.hirability}      color="#10b981" unit="%" />
          </div>

          {/* Section tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'overview',  label: 'Overview'   },
              { id: 'skills',    label: 'Skills'     },
              { id: 'experience',label: 'Experience' },
              { id: 'projects',  label: 'Projects'   },
              { id: 'insights',  label: 'AI Insights'},
              { id: 'roadmap',   label: 'Roadmap'    },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa]'
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

              {/* OVERVIEW */}
              {activeSection === 'overview' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { title: 'Strengths',  items: r.strengths,    color: 'text-emerald-400', bg: 'bg-emerald-500/[0.04] border-emerald-500/15', dot: 'bg-emerald-500/60' },
                      { title: 'Weaknesses', items: r.weaknesses,   color: 'text-red-400',     bg: 'bg-red-500/[0.04] border-red-500/15',         dot: 'bg-red-500/60'     },
                      { title: 'Skill Gaps', items: r.skillGaps,    color: 'text-amber-400',   bg: 'bg-amber-500/[0.04] border-amber-500/15',     dot: 'bg-amber-500/60'   },
                    ].map(s => (
                      <GlassCard key={s.title} className={`border ${s.bg}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${s.color}`}>{s.title}</p>
                        <ul className="space-y-1.5">
                          {(s.items ?? []).map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#a1a1aa] leading-relaxed">
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />{item}
                            </li>
                          ))}
                        </ul>
                      </GlassCard>
                    ))}
                  </div>
                  {r.salaryRange && (
                    <GlassCard className="border border-emerald-500/15">
                      <p className="text-[11px] text-[#52525b] mb-1">Estimated Salary Range</p>
                      <p className="text-[16px] font-bold text-emerald-400">{r.salaryRange}</p>
                    </GlassCard>
                  )}
                  {r.targetRoles?.length > 0 && (
                    <GlassCard>
                      <p className="text-[11px] font-semibold text-[#52525b] uppercase tracking-wider mb-3">Best-Fit Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {r.targetRoles.map((role, i) => (
                          <span key={i} className="text-[11px] px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 font-medium">{role}</span>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* SKILLS */}
              {activeSection === 'skills' && (
                <GlassCard>
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Detected Skills ({r.skills?.length ?? 0})</h3>
                  {Object.entries(skillCats).filter(([, v]) => v?.length > 0).map(([cat, skills]) => (
                    <div key={cat} className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#52525b] mb-2 capitalize">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map(s => (
                          <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!Object.values(skillCats).some(v => v?.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(r.skills ?? []).map(s => (
                        <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}

              {/* EXPERIENCE */}
              {activeSection === 'experience' && (
                <div className="space-y-3">
                  {(r.experience ?? []).length === 0 && <GlassCard><p className="text-[12px] text-[#52525b] text-center py-6">No work experience detected in the resume.</p></GlassCard>}
                  {(r.experience ?? []).map((exp, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{exp.role}</p>
                          <p className="text-[12px] text-[#71717a]">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                        </div>
                        <span className="text-[10px] text-[#52525b] whitespace-nowrap bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.05]">{exp.duration}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {(exp.highlights ?? []).map((h, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-[#71717a] leading-relaxed">
                            <ChevronRight size={11} className="mt-0.5 text-indigo-500 flex-shrink-0" />{h}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  ))}
                  {/* Education */}
                  {(r.education ?? []).length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-[#52525b] uppercase tracking-wider px-1 mt-2">Education</p>
                      {r.education.map((edu, i) => (
                        <GlassCard key={i}>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{edu.degree}</p>
                          <p className="text-[12px] text-[#71717a]">{edu.institution}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[11px] text-[#52525b]">{edu.year}</span>
                            {edu.gpa && <span className="text-[11px] text-[#52525b]">GPA: {edu.gpa}</span>}
                          </div>
                        </GlassCard>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* PROJECTS */}
              {activeSection === 'projects' && (
                <div className="space-y-3">
                  {(r.projects ?? []).length === 0 && <GlassCard><p className="text-[12px] text-[#52525b] text-center py-6">No projects detected in the resume.</p></GlassCard>}
                  {(r.projects ?? []).map((proj, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[13px] font-semibold text-[#f0f0f3]">{proj.name}</p>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline flex-shrink-0">
                            <ExternalLink size={10} /> View
                          </a>
                        )}
                      </div>
                      <p className="text-[12px] text-[#71717a] leading-relaxed mb-2">{proj.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(proj.technologies ?? []).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[#71717a] font-medium">{t}</span>
                        ))}
                      </div>
                    </GlassCard>
                  ))}
                  {(r.certifications ?? []).length > 0 && (
                    <GlassCard>
                      <p className="text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-3">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {r.certifications.map((c, i) => (
                          <span key={i} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300 font-medium">
                            <CheckCircle size={10} /> {c}
                          </span>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* AI INSIGHTS */}
              {activeSection === 'insights' && (
                <div className="space-y-4">
                  {(r.recommendations ?? []).length > 0 && (
                    <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain size={14} className="text-indigo-400" />
                        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI Recommendations</h3>
                      </div>
                      <div className="space-y-2.5">
                        {r.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/[0.08]">
                            <span className="text-[11px] font-bold text-indigo-400/70 mt-0.5 font-mono flex-shrink-0">{String(i+1).padStart(2,'0')}</span>
                            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* ROADMAP */}
              {activeSection === 'roadmap' && (
                <div className="space-y-3">
                  <GlassCard>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={14} className="text-amber-400" />
                      <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Personalised Learning Roadmap</h3>
                    </div>
                    <div className="space-y-3">
                      {(r.learningRoadmap ?? []).map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          className={`p-3.5 rounded-xl border ${PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.low}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[12px] font-semibold text-[#f0f0f3]">{item.skill}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[item.priority]}`}>{item.priority}</span>
                          </div>
                          <p className="text-[11px] text-[#71717a] mb-1 leading-relaxed">{item.reason}</p>
                          {item.resource && <p className="text-[10px] text-indigo-400">📚 {item.resource}</p>}
                        </motion.div>
                      ))}
                      {(r.learningRoadmap ?? []).length === 0 && (
                        <p className="text-[12px] text-[#52525b] text-center py-6">Roadmap data not available for this resume.</p>
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── NUTRITIONIX PANEL ─────────────────────────────────────────────────────────

function NutritionixPanel() {
  const { health, updateDomain } = useData();
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [showSetup,  setShowSetup]  = useState(!hasNutritionixKey());
  const [appId,      setAppId]      = useState('');
  const [appKey,     setAppKey]     = useState('');
  const [isDemo,     setIsDemo]     = useState(false);
  const [logged,     setLogged]     = useState(false);

  function handleSaveKeys() {
    saveNutritionixKeys(appId, appKey);
    setShowSetup(false);
  }

  async function handleAnalyze() {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null); setLogged(false); setIsDemo(false);
    try {
      const res = await analyzeFood(query.trim());
      setResult(res);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        const demo = getDemoFoodResult(query.trim());
        setResult(demo); setIsDemo(true);
      } else { setError(e.message); }
    } finally { setLoading(false); }
  }

  function handleLogToHealth() {
    if (!result) return;
    updateDomain('health', { ...health, calories: (health?.calories ?? 0) + result.total.calories });
    setLogged(true);
  }

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Utensils size={16} className="text-emerald-400" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">Nutritionix Food Tracker</h3>
            <StatusBadge status={hasNutritionixKey() ? 'live' : isDemo ? 'demo' : 'none'} />
          </div>
          <button onClick={() => setShowSetup(p => !p)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] transition-all">
            <Key size={11} /> {hasNutritionixKey() ? 'API Key Set' : 'Setup Keys'}
          </button>
        </div>
        <p className="text-[12px] text-[#52525b] mb-4">Type your meal in plain English — the AI parses it into full nutritional data instantly.</p>

        {/* Key Setup */}
        <AnimatePresence>
          {showSetup && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] space-y-3 mb-4">
                <p className="text-[11px] text-amber-300 font-semibold">Nutritionix API Keys</p>
                <p className="text-[11px] text-[#71717a]">Free tier: 500 calls/day. Get keys at <a href="https://www.nutritionix.com/business/api" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">nutritionix.com/business/api</a></p>
                <input value={appId} onChange={e => setAppId(e.target.value)} placeholder="App ID (e.g. 1a2b3c4d)" className="input-premium w-full text-[12px] font-mono" />
                <input value={appKey} onChange={e => setAppKey(e.target.value)} placeholder="App Key (e.g. abc123...)" className="input-premium w-full text-[12px] font-mono" />
                <div className="flex gap-2">
                  <button onClick={handleSaveKeys} disabled={!appId.trim() || !appKey.trim()} className="text-[12px] px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold disabled:opacity-40 transition-all">Save Keys</button>
                  {hasNutritionixKey() && <button onClick={() => { clearNutritionixKeys(); setShowSetup(true); }} className="text-[12px] px-3 py-2 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-red-400 transition-all">Clear</button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Query input */}
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="e.g. 2 eggs, toast and a glass of milk"
            className="input-premium flex-1 text-[13px]"
          />
          <button onClick={handleAnalyze} disabled={!query.trim() || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13px] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Zap size={14} />}
            {loading ? 'Parsing…' : 'Analyze'}
          </button>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {['2 eggs and toast', 'chicken biryani', 'protein shake with banana', '1 cup oatmeal with berries'].map(ex => (
            <button key={ex} onClick={() => setQuery(ex)}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.05] bg-white/[0.02] text-[#52525b] hover:text-[#a1a1aa] transition-all">
              {ex}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </GlassCard>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {isDemo && (
              <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2">
                <AlertTriangle size={13} /> Demo mode — add Nutritionix keys above for real results
              </div>
            )}

            {/* Total nutrition */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Nutrition Breakdown</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#52525b]">Health Score:</span>
                  <span className="text-[14px] font-bold" style={{ color: result.healthScore >= 70 ? '#10b981' : result.healthScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {result.healthScore}/100
                  </span>
                </div>
              </div>

              {/* Calorie hero */}
              <div className="text-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-4">
                <p className="text-[42px] font-black text-[#f0f0f3] leading-none">{result.total.calories}</p>
                <p className="text-[12px] text-[#52525b] mt-1">total calories</p>
              </div>

              <div className="space-y-3">
                <MacroBar label="Protein"       value={result.total.protein} color="#6366f1" max={60}  />
                <MacroBar label="Carbohydrates" value={result.total.carbs}   color="#f59e0b" max={100} />
                <MacroBar label="Fat"           value={result.total.fat}     color="#ec4899" max={60}  />
                <MacroBar label="Fiber"         value={result.total.fiber}   color="#10b981" max={25}  />
                <MacroBar label="Sodium"        value={result.total.sodium}  color="#ef4444" max={2300} unit="mg" />
              </div>
            </GlassCard>

            {/* Food items */}
            <GlassCard>
              <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-3">Identified Foods</h3>
              <div className="space-y-2">
                {result.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">
                        {item.thumb ? <img src={item.thumb} alt="" className="w-full h-full object-cover rounded-xl" /> : '🥘'}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-[#a1a1aa] capitalize">{item.name}</p>
                        <p className="text-[10px] text-[#52525b]">{item.qty}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-right">
                      <div><p className="text-[11px] font-bold text-[#f0f0f3]">{item.calories}</p><p className="text-[9px] text-[#52525b]">kcal</p></div>
                      <div><p className="text-[11px] font-bold text-indigo-400">{item.protein}g</p><p className="text-[9px] text-[#52525b]">protein</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <button
              onClick={handleLogToHealth}
              disabled={logged}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-[13px] transition-all disabled:cursor-default"
              style={{ background: logged ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #10b981, #059669)', border: logged ? '1px solid rgba(16,185,129,0.3)' : 'none', color: logged ? '#10b981' : 'white' }}
            >
              {logged ? <><CheckCircle size={15} /> Logged to Health Profile</> : <><Plus size={15} /> Log {result.total.calories} cal to Health Dashboard</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── GOOGLE FIT PANEL ──────────────────────────────────────────────────────────

const FIT_DEMO = {
  steps: 7234, calories: 1847, activeMinutes: 45, sleepHours: 6.8,
  heartRate: 72, distance: 5.1,
  weekly: [
    { day: 'Mon', steps: 8120, sleep: 7.2 },
    { day: 'Tue', steps: 6450, sleep: 6.5 },
    { day: 'Wed', steps: 9340, sleep: 7.8 },
    { day: 'Thu', steps: 5200, sleep: 5.9 },
    { day: 'Fri', steps: 7890, sleep: 6.8 },
    { day: 'Sat', steps: 11200, sleep: 8.1 },
    { day: 'Sun', steps: 7234, sleep: 7.0 },
  ],
};

function GoogleFitPanel() {
  const data = FIT_DEMO;

  function handleConnect() {
    const clientId    = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
    const scope       = encodeURIComponent([
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
    ].join(' '));
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&access_type=offline`;
  }

  const maxSteps = Math.max(...data.weekly.map(d => d.steps));

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">Google Fit Health Sync</h3>
            <StatusBadge status="demo" />
          </div>
          <button onClick={handleConnect}
            className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-xl font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)', boxShadow: '0 0 16px rgba(66,133,244,0.3)' }}>
            <ExternalLink size={13} /> Connect Google Fit
          </button>
        </div>
        <p className="text-[12px] text-[#52525b]">
          Connect to auto-sync steps, sleep, heart rate, and calories. Set <span className="font-mono text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</span> in your .env — <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-[#4285f4] hover:underline">get it free here</a>.
        </p>
      </GlassCard>

      {/* Today's metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Steps Today',   value: data.steps.toLocaleString(), unit: 'steps',   color: '#6366f1', target: '10,000', pct: Math.round(data.steps/10000*100) },
          { label: 'Calories Burned', value: data.calories,             unit: 'kcal',    color: '#f59e0b', target: '2,000',  pct: Math.round(data.calories/2000*100) },
          { label: 'Active Minutes', value: data.activeMinutes,          unit: 'min',     color: '#10b981', target: '60',     pct: Math.round(data.activeMinutes/60*100) },
        ].map(m => (
          <GlassCard key={m.label}>
            <p className="text-[11px] text-[#52525b] mb-2">{m.label}</p>
            <p className="text-[22px] font-black" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[10px] text-[#3f3f46]">{m.unit} · goal {m.target}</p>
            <div className="h-1.5 rounded-full bg-white/[0.05] mt-2.5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, m.pct)}%`, background: m.color }} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Weekly steps bar chart */}
      <GlassCard>
        <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Weekly Activity</h3>
        <div className="flex items-end gap-2 h-28">
          {data.weekly.map((d, i) => {
            const pct = (d.steps / maxSteps) * 100;
            const isToday = i === 6;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <p className="text-[9px] text-[#52525b]">{d.steps >= 1000 ? `${(d.steps/1000).toFixed(1)}k` : d.steps}</p>
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${pct}%` }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full rounded-t-lg"
                    style={{ background: isToday ? '#6366f1' : 'rgba(99,102,241,0.25)' }}
                  />
                </div>
                <p className="text-[10px] text-[#52525b]">{d.day}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Sleep + Heart Rate */}
      <div className="grid sm:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-[11px] text-[#52525b] font-medium mb-3">Sleep Last Night</p>
          <p className="text-[32px] font-black text-[#8b5cf6]">{data.sleepHours}h</p>
          <p className="text-[11px] text-[#52525b]">{data.sleepHours >= 7 ? '✅ Good rest' : data.sleepHours >= 6 ? '⚠️ Below optimal' : '🔴 Sleep debt'}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[11px] text-[#52525b] font-medium mb-3">Resting Heart Rate</p>
          <p className="text-[32px] font-black text-[#ef4444]">{data.heartRate}</p>
          <p className="text-[11px] text-[#52525b]">BPM · {data.heartRate < 60 ? 'Athlete range' : data.heartRate < 80 ? '✅ Normal range' : '⚠️ Slightly elevated'}</p>
        </GlassCard>
      </div>
    </div>
  );
}

// ── INDIA BANKING PANEL ──────────────────────────────────────────────────────

const AA_PROVIDERS = [
  {
    id: 'setu',
    name: 'Setu AA',
    subtitle: 'RBI Account Aggregator',
    desc: "Consent-based open banking. Real-time data from 50+ banks via India's AA framework with full audit trail.",
    badge: 'RBI Licensed',
    color: '#6366f1',
    banks: 50,
    site: 'setu.co/products/aa',
  },
  {
    id: 'finvu',
    name: 'Finvu',
    subtitle: 'NBFC-AA · 30+ Banks',
    desc: "India's leading AA platform with granular bank statement data and real-time consent management dashboard.",
    badge: 'NBFC-AA',
    color: '#10b981',
    banks: 30,
    site: 'finvu.in',
  },
  {
    id: 'perfios',
    name: 'Perfios',
    subtitle: 'Statement API · 100+ Banks',
    desc: 'Trusted by 800+ lenders & fintechs. Deep categorisation, fraud signals, and income verification on PDF statements.',
    badge: 'Fintech API',
    color: '#f59e0b',
    banks: 100,
    site: 'perfios.com',
  },
];

const INDIA_TXN = [
  { name: 'Salary Credit – Infosys Ltd',  date: 'May 22', amount: 85000,  cat: 'Income',       icon: '💰', mode: 'NEFT'  },
  { name: 'HDFC Credit Card Bill',         date: 'May 21', amount: -12450, cat: 'Credit Card',  icon: '💳', mode: 'NACH'  },
  { name: 'House Rent Transfer',           date: 'May 10', amount: -18000, cat: 'Rent',         icon: '🏠', mode: 'NEFT'  },
  { name: 'SIP – Axis Bluechip Fund',      date: 'May 16', amount: -5000,  cat: 'Investment',   icon: '📈', mode: 'SI'    },
  { name: 'LIC Premium',                   date: 'May 10', amount: -4200,  cat: 'Insurance',    icon: '🛡️', mode: 'SI'    },
  { name: 'Swiggy',                        date: 'May 20', amount: -349,   cat: 'Food',         icon: '🍱', mode: 'UPI'   },
  { name: 'Zepto',                         date: 'May 18', amount: -823,   cat: 'Groceries',    icon: '⚡', mode: 'UPI'   },
  { name: 'Blinkit',                       date: 'May 13', amount: -645,   cat: 'Groceries',    icon: '🛒', mode: 'UPI'   },
  { name: 'Uber',                          date: 'May 15', amount: -234,   cat: 'Transport',    icon: '🚗', mode: 'UPI'   },
  { name: 'Amazon',                        date: 'May 14', amount: -1299,  cat: 'Shopping',     icon: '📦', mode: 'UPI'   },
  { name: 'Netflix',                       date: 'May 12', amount: -649,   cat: 'Subscript.',   icon: '📺', mode: 'UPI'   },
  { name: 'BSNL Broadband',               date: 'May 11', amount: -999,   cat: 'Utilities',    icon: '🌐', mode: 'UPI'   },
  { name: 'PhonePe Cashback',             date: 'May 9',  amount:  250,   cat: 'Cashback',     icon: '🎁', mode: 'UPI'   },
  { name: 'CRED Reward',                  date: 'May 5',  amount:  150,   cat: 'Cashback',     icon: '💎', mode: 'UPI'   },
  { name: 'ATM Withdrawal',               date: 'May 4',  amount: -2000,  cat: 'Cash',         icon: '🏧', mode: 'ATM'   },
];

const INDIA_CATS = [
  { label: 'Rent & Housing',    amount: 18000, color: '#6366f1', pct: 34 },
  { label: 'Credit Card Bills', amount: 12450, color: '#f97316', pct: 24 },
  { label: 'Food & Dining',     amount:  4817, color: '#f59e0b', pct:  9 },
  { label: 'Investments & SIP', amount:  5000, color: '#10b981', pct: 10 },
  { label: 'Insurance & LIC',   amount:  4200, color: '#8b5cf6', pct:  8 },
  { label: 'Shopping',          amount:  1299, color: '#ec4899', pct:  2 },
  { label: 'Transport',         amount:   234, color: '#06b6d4', pct:  1 },
  { label: 'Utilities',         amount:   999, color: '#ef4444', pct:  2 },
  { label: 'Cash & Others',     amount:  2000, color: '#71717a', pct:  4 },
];

const INDIA_BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'Bank of Baroda', 'Canara', 'IndusInd', 'IDFC First', 'Federal'];

const BANKING_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
function bankingGroqKey() { return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || ''; }

async function parseStatementWithAI(text) {
  const key = bankingGroqKey();
  if (!key) throw new Error('NO_KEY');
  const res = await fetch(BANKING_GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are an Indian bank statement parser. Extract all transactions and analyse spending. Return ONLY valid JSON, no markdown:

STATEMENT TEXT:
---
${text.slice(0, 5000)}
---

{
  "transactions": [
    {"date": "DD Mon", "description": "payee/merchant", "debit": <number or null>, "credit": <number or null>, "mode": "UPI|NEFT|IMPS|SI|NACH|ATM|Other", "category": "Income|Food|Groceries|Rent|Transport|Shopping|Investment|Insurance|Utilities|Entertainment|Credit Card|Cashback|Cash|Other"}
  ],
  "summary": {
    "totalCredit": <number>,
    "totalDebit": <number>,
    "netFlow": <number>,
    "savingsRate": <integer 0-100>,
    "topSpendCategory": "<string>",
    "upiSpend": <number>,
    "investmentTotal": <number>,
    "insight": "<one actionable financial insight based on the data>"
  }
}`,
      }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content ?? '';
  raw = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s !== -1 && e > s) raw = raw.slice(s, e + 1);
  return JSON.parse(raw);
}

function buildCatsFromTxns(txns) {
  if (!txns?.length) return INDIA_CATS;
  const map = {};
  txns.forEach(t => { if (t.debit) map[t.category] = (map[t.category] ?? 0) + t.debit; });
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
  const clrs = ['#6366f1','#f97316','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#ef4444','#71717a'];
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([label, amount], i) => ({
    label, amount: Math.round(amount), color: clrs[i] ?? '#71717a',
    pct: Math.round((amount / total) * 100),
  }));
}

function IndiaBankingPanel() {
  const { finance, updateDomain } = useData();
  const fileRef = useRef(null);
  const [phase, setPhase] = useState('landing'); // landing | demo | parsing | results
  const [dragOver, setDragOver] = useState(false);
  const [stmtData, setStmtData] = useState(null);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('transactions');
  const [synced, setSynced] = useState(false);

  const isDemo = phase === 'demo';
  const isResults = phase === 'results';
  const txns = isResults ? (stmtData?.transactions ?? []) : INDIA_TXN;
  const cats = isResults ? buildCatsFromTxns(stmtData?.transactions) : INDIA_CATS;
  const totalIncome = isResults ? (stmtData?.summary?.totalCredit ?? 0) : 85400;
  const totalSpend  = isResults ? (stmtData?.summary?.totalDebit  ?? 0) : 49999;
  const savingsRate = isResults ? (stmtData?.summary?.savingsRate ?? 0) : 41;

  async function processStatement(file) {
    if (!file || file.type !== 'application/pdf') { setError('Please upload a PDF bank statement.'); return; }
    setPhase('parsing'); setError(null);
    try {
      const text = await extractPdfText(file);
      const parsed = await parseStatementWithAI(text);
      setStmtData(parsed);
      setPhase('results');
    } catch (e) {
      setError(e.message === 'NO_KEY' ? 'No Groq API key configured. Add VITE_GROQ_API_KEY to .env.' : e.message);
      setPhase('landing');
    }
  }

  function handleProviderClick(p) {
    alert(`${p.name} — ${p.subtitle}\n\n${p.desc}\n\nTo integrate for production:\n1. Sign up at ${p.site}\n2. Get API credentials from their developer portal\n3. Implement the AA consent flow on your backend\n4. Receive data via webhook\n\nShowing demo data instead.`);
    setPhase('demo');
  }

  function handleSyncFinance() {
    updateDomain('finance', { ...finance, monthlyIncome: totalIncome, monthlyExpenses: totalSpend });
    setSynced(true);
  }

  function handleReset() {
    setPhase('landing'); setStmtData(null); setError(null); setSynced(false); setActiveView('transactions');
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Landmark size={16} className="text-emerald-400" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">India Banking Intelligence</h3>
            <StatusBadge status={isResults ? 'live' : isDemo ? 'demo' : 'none'} />
          </div>
          {(isDemo || isResults) && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleSyncFinance} disabled={synced}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all disabled:cursor-default"
                style={{ background: synced ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: synced ? '#10b981' : '#6ee7b7' }}>
                {synced ? <><CheckCircle size={11} /> Synced</> : <><Plus size={11} /> Sync to Finance</>}
              </button>
              <button onClick={handleReset}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa] transition-all">
                Reset
              </button>
            </div>
          )}
        </div>
        <p className="text-[12px] text-[#52525b] mt-2">
          Powered by India's <strong className="text-[#a1a1aa]">Account Aggregator (AA) framework</strong> — RBI-regulated, consent-based open banking. Choose a provider or upload a bank statement PDF for instant AI analysis.
        </p>
      </GlassCard>

      {/* ── Landing ── */}
      {phase === 'landing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Provider cards */}
          <div className="grid sm:grid-cols-3 gap-3">
            {AA_PROVIDERS.map(p => (
              <button key={p.id} onClick={() => handleProviderClick(p)}
                className="text-left p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all hover:scale-[1.01] group">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#f0f0f3]">{p.name}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
                    style={{ color: p.color, borderColor: p.color + '40', background: p.color + '14' }}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: p.color }}>{p.subtitle}</p>
                <p className="text-[11px] text-[#52525b] leading-relaxed mb-3">{p.desc}</p>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
                  <span className="text-[10px] text-[#3f3f46]">{p.banks}+ banks</span>
                  <span className="text-[10px] font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: p.color }}>Connect →</span>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-[#3f3f46] font-medium">or upload bank statement PDF directly</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* PDF Upload */}
          <GlassCard>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processStatement(f); }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 p-8 ${
                dragOver ? 'border-emerald-500/50 bg-emerald-500/[0.04]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.03]'
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => e.target.files[0] && processStatement(e.target.files[0])} />
              <span className="text-3xl">🏦</span>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#f0f0f3] mb-1">Drop your bank statement PDF</p>
                <p className="text-[11px] text-[#52525b]">AI extracts & categorises all transactions instantly</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                {INDIA_BANKS.slice(0, 9).map(b => (
                  <span key={b} className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[#52525b]">{b}</span>
                ))}
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
          </GlassCard>

          <button onClick={() => setPhase('demo')}
            className="w-full text-[12px] py-2.5 rounded-xl border border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.02] transition-all">
            View Demo Data Instead
          </button>
        </motion.div>
      )}

      {/* ── Parsing ── */}
      {phase === 'parsing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="border border-emerald-500/15 bg-emerald-500/[0.02]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-400/60 border-t-emerald-400 animate-spin flex-shrink-0" />
              <div>
                <p className="text-[14px] font-semibold text-[#f0f0f3]">Analysing bank statement…</p>
                <p className="text-[12px] text-[#52525b]">Extracting · Categorising · Generating insights</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {['Extracting text from PDF…', 'Identifying all transactions…', 'Categorising spend with AI…', 'Calculating financial insights…'].map((step, i) => (
                <div key={step} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  </div>
                  <span className="text-[12px] text-[#52525b]">{step}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Data View (demo or AI results) ── */}
      {(isDemo || isResults) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {isDemo && (
            <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> Demo data — connect a provider or upload your statement for real AI analysis
            </div>
          )}
          {isResults && stmtData?.summary?.insight && (
            <div className="flex items-start gap-2 text-[12px] text-indigo-300 bg-indigo-500/[0.06] border border-indigo-500/20 rounded-xl px-3 py-2.5">
              <Brain size={13} className="mt-0.5 flex-shrink-0 text-indigo-400" />
              <span><strong>AI Insight:</strong> {stmtData.summary.insight}</span>
            </div>
          )}

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <GlassCard>
              <p className="text-[10px] text-[#52525b] mb-1.5 uppercase tracking-wider font-medium">Total Income</p>
              <p className="text-[22px] font-black text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-[#3f3f46]">this month</p>
            </GlassCard>
            <GlassCard>
              <p className="text-[10px] text-[#52525b] mb-1.5 uppercase tracking-wider font-medium">Total Spent</p>
              <p className="text-[22px] font-black text-[#f97316]">₹{totalSpend.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-[#3f3f46]">this month</p>
            </GlassCard>
            <GlassCard>
              <p className="text-[10px] text-[#52525b] mb-1.5 uppercase tracking-wider font-medium">Savings Rate</p>
              <p className="text-[22px] font-black text-indigo-400">{savingsRate}%</p>
              <div className="h-1.5 rounded-full bg-white/[0.05] mt-2 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${savingsRate}%` }}
                  transition={{ duration: 1 }} className="h-full rounded-full bg-indigo-500" />
              </div>
            </GlassCard>
          </div>

          {/* View tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'transactions', label: 'Transactions' },
              { id: 'categories',   label: 'Spend Analysis' },
              { id: 'upi',          label: 'UPI & AA Insights' },
            ].map(v => (
              <button key={v.id} onClick={() => setActiveView(v.id)}
                className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
                  activeView === v.id
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa]'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

              {/* TRANSACTIONS */}
              {activeView === 'transactions' && (
                <GlassCard>
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">
                    Recent Transactions {isResults && <span className="text-[11px] font-normal text-[#52525b] ml-1">({txns.length} found)</span>}
                  </h3>
                  <div className="space-y-2">
                    {txns.slice(0, 20).map((t, i) => {
                      const amt = t.amount ?? (t.credit ?? -(t.debit ?? 0));
                      const positive = t.amount > 0 || (t.credit && !t.debit);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-lg w-8 text-center flex-shrink-0">{t.icon ?? (positive ? '💰' : '💸')}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#a1a1aa] truncate">{t.name ?? t.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-[#52525b]">{t.date}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#3f3f46] font-mono">{t.mode ?? 'UPI'}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#52525b]">{t.cat ?? t.category}</span>
                            </div>
                          </div>
                          <span className={`text-[13px] font-bold flex-shrink-0 ${positive ? 'text-emerald-400' : 'text-[#f0f0f3]'}`}>
                            {positive ? '+' : ''}₹{Math.abs(amt).toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* CATEGORIES */}
              {activeView === 'categories' && (
                <GlassCard>
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Spend by Category</h3>
                  <div className="space-y-3">
                    {cats.map(c => (
                      <div key={c.label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] text-[#a1a1aa]">{c.label}</span>
                          <span className="text-[12px] font-semibold" style={{ color: c.color }}>₹{c.amount.toLocaleString('en-IN')} · {c.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${c.pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full" style={{ background: c.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.05] flex justify-between">
                    <span className="text-[12px] text-[#71717a]">Total Spent (May)</span>
                    <span className="text-[13px] font-bold text-[#f0f0f3]">₹{totalSpend.toLocaleString('en-IN')}</span>
                  </div>
                </GlassCard>
              )}

              {/* UPI & AA INSIGHTS */}
              {activeView === 'upi' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'UPI Transactions', value: isResults ? txns.filter(t => t.mode === 'UPI').length : 9, unit: 'this month', color: '#8b5cf6', isNum: true },
                      { label: 'UPI Spend Total',  value: isResults ? txns.filter(t => t.mode === 'UPI' && t.debit).reduce((a, t) => a + t.debit, 0) : 5200, unit: 'via UPI', color: '#6366f1', prefix: '₹' },
                      { label: 'NACH / SI Debits', value: isResults ? txns.filter(t => ['NACH','SI'].includes(t.mode) && t.debit).reduce((a,t)=>a+t.debit,0) : 9200, unit: 'auto-debits', color: '#f59e0b', prefix: '₹' },
                      { label: 'NEFT / IMPS',      value: isResults ? txns.filter(t => ['NEFT','IMPS'].includes(t.mode) && t.debit).reduce((a,t)=>a+t.debit,0) : 18000, unit: 'wire transfers', color: '#10b981', prefix: '₹' },
                    ].map(m => (
                      <GlassCard key={m.label}>
                        <p className="text-[10px] text-[#52525b] mb-1">{m.label}</p>
                        <p className="text-[20px] font-black" style={{ color: m.color }}>
                          {m.prefix}{(m.isNum ? m.value : m.value).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-[#3f3f46]">{m.unit}</p>
                      </GlassCard>
                    ))}
                  </div>

                  <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={13} className="text-indigo-400" />
                      <p className="text-[12px] font-bold text-[#a1a1aa]">How the AA Framework Works</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { step: '01', text: 'You give one-time consent via the AA app (Setu / Finvu)' },
                        { step: '02', text: 'AA fetches your bank data from FIPs (your banks) in real time' },
                        { step: '03', text: 'Encrypted, consent-tagged data is shared with the FIU (BeyondSelf)' },
                        { step: '04', text: 'You can revoke consent anytime — no data stored without permission' },
                      ].map(s => (
                        <div key={s.step} className="flex items-start gap-3">
                          <span className="text-[10px] font-black text-[#3f3f46] font-mono mt-0.5 flex-shrink-0">{s.step}</span>
                          <p className="text-[12px] text-[#71717a] leading-relaxed">{s.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-wrap gap-2">
                      {AA_PROVIDERS.map(p => (
                        <span key={p.id} className="text-[10px] px-2.5 py-1 rounded-lg border font-semibold"
                          style={{ color: p.color, borderColor: p.color + '30', background: p.color + '10' }}>
                          {p.name} · {p.banks}+ banks
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'github',      label: 'GitHub',       icon: GitBranch,      color: 'text-[#a1a1aa]' },
  { id: 'linkedin',    label: 'LinkedIn',     icon: Briefcase,    color: 'text-[#0077b5]' },
  { id: 'nutritionix', label: 'Nutrition',    icon: Utensils,       color: 'text-emerald-400' },
  { id: 'googlefit',   label: 'Google Fit',   icon: Activity,    color: 'text-[#4285f4]'  },
  { id: 'banking',      label: 'Banking',      icon: Landmark,    color: 'text-emerald-400' },
];

export default function Integrations() {
  const [tab, setTab] = useState('github');

  return (
    <div className="page-container min-h-screen pb-16">
      <PageHeader
        title="API Integrations"
        subtitle="Connect external platforms to enrich your digital twin with real-world data."
        icon="🔌"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'github'      && <GitHubPanel />}
          {tab === 'linkedin'    && <LinkedInPanel />}
          {tab === 'nutritionix' && <NutritionixPanel />}
          {tab === 'googlefit'   && <GoogleFitPanel />}
          {tab === 'banking'     && <IndiaBankingPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
