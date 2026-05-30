import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader } from '../components/ui/Components';
import { authFetch } from '../services/backendApi';
import { fetchGitHubProfile, analyzeGitHubWithAI, LANG_COLORS } from '../services/githubService';
import {
  analyzeFood, hasNutritionixKey, saveNutritionixKeys, clearNutritionixKeys, getDemoFoodResult
} from '../services/nutritionixService';
import { extractPdfText } from '../services/resumeService';
import { searchCoursera, clearCourseraCache, hasCourseraCache } from '../services/courseraService';
import {
  GitBranch, Briefcase, Activity, Landmark, Utensils, BookOpen,
  Search, Sparkles, CheckCircle, AlertTriangle, ExternalLink,
  Star, GitFork, Code2, Users, Key, Plus,
  Zap, Brain, ChevronRight, Loader2, Heart, Moon, Footprints, X,
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
              : 'text-[#71717a] hover:text-[#a1a1aa]'
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
    none:  { cls: 'bg-[#27272a]/50  border-white/[0.06]  text-[#71717a]',   dot: 'bg-[#71717a]',   label: 'Not Connected' },
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
                      className="text-[11px] text-[#71717a] hover:text-indigo-400 transition-colors flex items-center gap-1">
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
                  <p className="text-[10px] text-[#71717a] mt-1">Dev Score</p>
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
                    <p className="text-[10px] text-[#71717a]">{s.label}</p>
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
                      <span className="text-[11px] text-[#71717a]">{l.count} repos · {l.pct}%</span>
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
                        {r.description && <p className="text-[11px] text-[#71717a] mt-0.5 line-clamp-2 leading-relaxed">{r.description}</p>}
                      </div>
                      <ExternalLink size={11} className="text-[#6b7280] group-hover:text-[#71717a] flex-shrink-0 mt-0.5" />
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
                      <span className="text-[11px] text-[#71717a]">Level:</span>
                      <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">{analysis.overallLevel}</span>
                      <span className="text-[11px] text-[#71717a] ml-2">Hirability:</span>
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
                    <p className="text-[11px] font-bold text-[#71717a] uppercase tracking-wider mb-2">Career Paths</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.careerPaths ?? []).map((p, i) => (
                        <span key={i} className="text-[11px] px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 font-medium">{p}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.05]">
                    <p className="text-[11px] font-bold text-[#71717a] uppercase tracking-wider mb-2">Resume Tips</p>
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
          <GitBranch size={32} className="mx-auto mb-3 text-[#71717a]" />
          <p className="text-[13px] font-semibold text-[#a1a1aa] mb-1">Analyze any GitHub profile</p>
          <p className="text-[12px] text-[#71717a]">No authentication required · Works with any public profile</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {['torvalds', 'gvanrossum', 'sindresorhus', 'yyx990803'].map(u => (
              <button key={u} onClick={() => { setUsername(u); }}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:text-[#a1a1aa] transition-all font-mono">
                {u}
              </button>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── MOCK LINKEDIN PANEL ───────────────────────────────────────────────────────

const MOCK_PROFILE = {
  name: 'Arjun Mehta', initials: 'AM',
  headline: 'Full Stack Developer · React · Node.js · AWS | Building @ BeyondSelf',
  location: 'Bengaluru, Karnataka, India',
  connections: 487, followers: 612,
  about: 'Passionate engineer building scalable web applications and digital twin systems. Open to SDE-II / Senior roles at product-first companies.',
  analytics: { profileViews: 234, viewsTrend: '+18%', searchAppearances: 89, postImpressions: 1847 },
  experience: [
    { title: 'Software Development Engineer II', company: 'Flipkart', logo: '🛒', duration: 'Jun 2022 – Present · 2 yrs', location: 'Bengaluru, Hybrid', highlights: ['Built real-time inventory system handling 2M+ daily requests', 'Reduced P99 latency by 40% via Redis caching + CDN strategy', 'Led a team of 4 engineers on the seller portal redesign'] },
    { title: 'SDE I', company: 'Swiggy', logo: '🍜', duration: 'Aug 2020 – May 2022 · 1 yr 9 mo', location: 'Bengaluru, Remote', highlights: ['Developed order-tracking microservice — 99.9% uptime', 'Led migration from monolith to microservices, cutting deploy time by 60%'] },
    { title: 'Software Engineering Intern', company: 'Razorpay', logo: '💳', duration: 'Jan 2020 – Jul 2020 · 7 mo', location: 'Bengaluru', highlights: ['Built internal analytics dashboard used by 30+ PMs', 'Improved test coverage from 45% → 82%'] },
  ],
  education: [{ institution: 'BITS Pilani', degree: 'B.E. Computer Science', year: '2016 – 2020', grade: '8.7 CGPA' }],
  skills: [
    { name: 'React.js', endorsements: 47 }, { name: 'Node.js', endorsements: 38 },
    { name: 'System Design', endorsements: 29 }, { name: 'AWS', endorsements: 22 },
    { name: 'TypeScript', endorsements: 19 }, { name: 'MongoDB', endorsements: 15 },
    { name: 'Docker', endorsements: 12 }, { name: 'GraphQL', endorsements: 8 },
    { name: 'Redis', endorsements: 6 }, { name: 'Kubernetes', endorsements: 4 },
  ],
  jobs: [
    { title: 'Senior Software Engineer', company: 'Google', logo: '🟡', location: 'Hyderabad, India', match: 94, applicants: 234, postedAgo: '2d', salary: '₹40L – ₹60L', type: 'Full-time' },
    { title: 'Full Stack Engineer', company: 'Zepto', logo: '⚡', location: 'Mumbai, India', match: 88, applicants: 89, postedAgo: '5d', salary: '₹25L – ₹35L', type: 'Full-time' },
    { title: 'Staff Engineer', company: 'Meesho', logo: '🛍️', location: 'Bengaluru, Hybrid', match: 82, applicants: 45, postedAgo: '1w', salary: '₹35L – ₹55L', type: 'Full-time' },
    { title: 'Engineering Manager', company: 'CRED', logo: '💎', location: 'Bengaluru, India', match: 74, applicants: 67, postedAgo: '3d', salary: '₹45L – ₹70L', type: 'Full-time' },
  ],
};


function LinkedInPanel() {
  const [searchInput, setSearchInput]  = useState('');
  const [profile,     setProfile]      = useState(null);
  const [loading,     setLoading]      = useState(false);
  const [activeTab,   setActiveTab]    = useState('experience');
  const [followed,    setFollowed]     = useState(false);
  const [savedJobs,   setSavedJobs]    = useState([]);

  const strHash = (s) => Math.abs(s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));

  const generateProfile = (name) => {
    const h = strHash(name.toLowerCase());
    const words = name.trim().split(/\s+/);
    const initials = words.map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2) || '??';
    const headlines = [
      'Full Stack Developer · React · Node.js · AWS | Building @ Scale',
      'Senior Software Engineer · Python · ML · Cloud | Ex-Google',
      'Engineering Lead · System Design · Distributed Systems | Ex-Amazon',
      'Frontend Engineer · React · TypeScript · Design Systems | Ex-Flipkart',
    ];
    const locations = ['Bengaluru, Karnataka, India', 'Mumbai, Maharashtra, India', 'Delhi NCR, India', 'Hyderabad, Telangana, India'];
    const colleges  = ['IIT Bombay', 'IIT Delhi', 'BITS Pilani', 'NIT Trichy'];
    const degrees   = ['B.Tech Computer Science', 'B.E. Computer Science', 'B.Tech Information Technology', 'M.Tech Computer Science'];
    const conns = 280 + (h % 420);
    return {
      name: name.trim(), initials,
      headline:  headlines[h % headlines.length],
      location:  locations[h % locations.length],
      connections: conns, followers: conns + 80 + (h % 180),
      about: `Passionate engineer with ${3 + (h % 8)} years of experience building scalable systems. Open to SDE-II / Senior roles at product-first companies.`,
      analytics: {
        profileViews:       100 + (h % 300),
        viewsTrend:         `+${5 + (h % 28)}%`,
        searchAppearances:  40  + (h % 90),
        postImpressions:    600 + (h % 1800),
      },
      experience: MOCK_PROFILE.experience,
      education:  [{ institution: colleges[h % colleges.length], degree: degrees[h % degrees.length], year: `${2014 + (h % 6)} – ${2018 + (h % 6)}`, grade: `${(7.5 + (h % 15) / 10).toFixed(1)} CGPA` }],
      skills: MOCK_PROFILE.skills,
      jobs:   MOCK_PROFILE.jobs,
    };
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    setProfile(null);
    setActiveTab('experience');
    setFollowed(false);
    setSavedJobs([]);
    try {
      const res = await fetch(
        `${BACKEND}/api/linkedin/profile?username=${encodeURIComponent(searchInput.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        // Map backend response to the UI's expected shape, filling gaps with generated data
        const gen = generateProfile(searchInput.trim());
        setProfile({
          ...gen,
          name:        data.name        || gen.name,
          headline:    data.headline    || gen.headline,
          location:    data.location    || gen.location,
          connections: data.connections || gen.connections,
          followers:   data.followers   || gen.followers,
          about:       data.summary     || gen.about,
          skills:      (data.skills || []).map(s => ({ name: s, endorsements: Math.floor(Math.random() * 40) + 3 })),
          experience:  data.experience?.length ? data.experience.map(e => ({
            title: e.title, company: e.company, logo: '💼',
            duration: e.duration, location: e.location,
            highlights: e.skills ? e.skills.map(sk => `Worked with ${sk}`) : [],
          })) : gen.experience,
          source: data.source || 'linkedin_demo',
        });
      } else {
        setProfile(generateProfile(searchInput.trim()));
      }
    } catch (_) {
      // Backend unavailable — fall back to local generation
      await new Promise(r => setTimeout(r, 600));
      setProfile(generateProfile(searchInput.trim()));
    }
    setLoading(false);
  };

  const matchColor = (m) => m >= 90 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
    : m >= 80 ? 'text-[#00a0dc] bg-[#0077b5]/10 border-[#0077b5]/25'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/25';

  return (
    <div className="space-y-5">
      {/* API Notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
        <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-semibold text-amber-300">Mock LinkedIn Data</p>
          <p className="text-[11px] text-[#71717a] mt-0.5">
            LinkedIn's API requires partner-level approval and is not available to third-party apps without review. This panel uses realistic mock data. In production, integrate via <span className="text-amber-400 font-mono text-[10px]">LinkedIn OAuth 2.0</span> after partner approval.
          </p>
        </div>
      </div>

      {/* Search */}
      <GlassCard>
        <p className="text-[11px] text-[#71717a] font-semibold uppercase tracking-wider mb-2.5">Search LinkedIn Profile</p>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter a name (e.g. Priya Sharma)"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-[12px] text-[#f0f0f3] placeholder-[#6b7280] outline-none focus:border-[#0077b5]/40 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchInput.trim()}
            className="px-4 py-2 rounded-xl bg-[#0077b5] text-white text-[12px] font-semibold hover:bg-[#006097] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {!profile && !loading && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {['Arjun Mehta', 'Priya Sharma', 'Rahul Gupta', 'Ananya Singh'].map(n => (
              <button key={n} onClick={() => setSearchInput(n)}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:text-[#a1a1aa] transition-all">
                {n}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Loading */}
      {loading && (
        <GlassCard className="text-center py-10">
          <Loader2 size={28} className="mx-auto mb-3 text-[#0077b5] animate-spin" />
          <p className="text-[13px] font-semibold text-[#a1a1aa]">Fetching profile for "{searchInput}"…</p>
          <p className="text-[11px] text-[#71717a] mt-1">Connecting to LinkedIn Mock API</p>
        </GlassCard>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <GlassCard className="text-center py-12">
          <Users size={32} className="mx-auto mb-3 text-[#71717a]" />
          <p className="text-[13px] font-semibold text-[#a1a1aa] mb-1">Search any LinkedIn profile</p>
          <p className="text-[12px] text-[#71717a]">Enter a name above · Try a quick name suggestion to get started</p>
        </GlassCard>
      )}

      {profile && !loading && (
        <>
          {/* Profile Card — clean dark header, no blue banner */}
          <GlassCard>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl border-2 border-[#0077b5]/30 bg-gradient-to-br from-[#0077b5] to-[#00a0dc] flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0">
                  {profile.initials}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#f0f0f3]">{profile.name}</h2>
                  <p className="text-[11px] text-[#71717a] mt-0.5">{profile.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#00a0dc] font-semibold">{profile.connections} connections</span>
                    <span className="text-[#6b7280]">·</span>
                    <span className="text-[11px] text-[#71717a]">{profile.followers} followers</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setFollowed(f => !f)}
                  className={`text-[11px] px-4 py-1.5 rounded-full border font-semibold transition-all ${followed ? 'bg-white/[0.04] border-white/[0.1] text-[#71717a]' : 'bg-[#0077b5] border-[#0077b5] text-white hover:bg-[#006097]'}`}>
                  {followed ? '✓ Following' : '+ Follow'}
                </button>
                <button className="text-[11px] px-4 py-1.5 rounded-full border border-white/[0.1] text-[#a1a1aa] hover:border-white/[0.2] transition-all font-semibold">Message</button>
              </div>
            </div>
            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{profile.headline}</p>
            <p className="text-[11px] text-[#71717a] mt-3 leading-relaxed border-t border-white/[0.04] pt-3">{profile.about}</p>
          </GlassCard>

          {/* Analytics Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Profile Views',      value: profile.analytics.profileViews,                      sub: `${profile.analytics.viewsTrend} this week`, color: '#0077b5' },
              { label: 'Search Appearances', value: profile.analytics.searchAppearances,                  sub: 'last 7 days',   color: '#10b981' },
              { label: 'Post Impressions',   value: profile.analytics.postImpressions.toLocaleString(),   sub: 'last 30 days',  color: '#8b5cf6' },
            ].map(m => (
              <GlassCard key={m.label}>
                <p className="text-[10px] text-[#71717a] font-medium mb-1.5 uppercase tracking-wider">{m.label}</p>
                <p className="text-[22px] font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">{m.sub}</p>
              </GlassCard>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'experience', label: 'Experience & Education' },
              { id: 'skills',     label: 'Skills' },
              { id: 'jobs',       label: 'Job Matches' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
                  activeTab === t.id
                    ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#00a0dc]'
                    : 'border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa]'
                }`}>{t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

              {/* EXPERIENCE */}
              {activeTab === 'experience' && (
                <div className="space-y-3">
                  {profile.experience.map((exp, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xl flex-shrink-0">{exp.logo}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{exp.title}</p>
                          <p className="text-[12px] text-[#a1a1aa]">{exp.company} · {exp.location}</p>
                          <p className="text-[11px] text-[#71717a] mt-0.5">{exp.duration}</p>
                          <ul className="mt-2.5 space-y-1.5">
                            {exp.highlights.map((h, j) => (
                              <li key={j} className="flex items-start gap-2 text-[11px] text-[#71717a]">
                                <ChevronRight size={10} className="mt-0.5 text-[#0077b5] flex-shrink-0" />{h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                  <p className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider px-1 pt-1">Education</p>
                  {profile.education.map((edu, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">🎓</div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{edu.degree}</p>
                          <p className="text-[12px] text-[#a1a1aa]">{edu.institution}</p>
                          <p className="text-[11px] text-[#71717a] mt-0.5">{edu.year} · {edu.grade}</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* SKILLS */}
              {activeTab === 'skills' && (
                <GlassCard>
                  <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Top Skills ({profile.skills.length})</h3>
                  <div className="space-y-2.5">
                    {profile.skills.map((s, i) => (
                      <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[12px] text-[#a1a1aa] font-medium">{s.name}</span>
                            <span className="text-[10px] text-[#71717a]">{s.endorsements} endorsements</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (s.endorsements / 50) * 100)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.04 }}
                              className="h-full rounded-full bg-[#0077b5]"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* JOBS */}
              {activeTab === 'jobs' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <Sparkles size={12} className="text-[#0077b5]" />
                    <p className="text-[11px] text-[#71717a]">Jobs matched to your profile using mock LinkedIn AI recommendations</p>
                  </div>
                  {profile.jobs.map((job, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <GlassCard>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-2xl flex-shrink-0">{job.logo}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="text-[13px] font-semibold text-[#f0f0f3]">{job.title}</p>
                                <p className="text-[12px] text-[#a1a1aa]">{job.company}</p>
                                <p className="text-[11px] text-[#71717a] mt-0.5">{job.location} · {job.type} · Posted {job.postedAgo}</p>
                              </div>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${matchColor(job.match)} flex-shrink-0`}>{job.match}% match</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                              <span className="text-[11px] text-emerald-400 font-semibold">{job.salary}</span>
                              <span className="text-[10px] text-[#71717a]">{job.applicants} applicants</span>
                              <button
                                onClick={() => setSavedJobs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                                className={`text-[11px] px-3 py-1 rounded-full border transition-all font-semibold ml-auto ${savedJobs.includes(i) ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#00a0dc]' : 'border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa]'}`}>
                                {savedJobs.includes(i) ? '✓ Saved' : 'Save'}
                              </button>
                              <button className="text-[11px] px-3 py-1 rounded-full bg-[#0077b5] text-white font-semibold hover:bg-[#006097] transition-all">Easy Apply</button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}

                  {/* OAuth explainer */}
                  <GlassCard className="border border-[#0077b5]/15 bg-[#0077b5]/[0.03]">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={13} className="text-[#0077b5]" />
                      <p className="text-[12px] font-bold text-[#a1a1aa]">How to Enable Real LinkedIn Integration</p>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { step: '01', text: 'Apply for LinkedIn Partner Program at developer.linkedin.com/partner-programs' },
                        { step: '02', text: 'Get approved for Sign In with LinkedIn + Profile API access' },
                        { step: '03', text: 'Implement OAuth 2.0 PKCE flow — redirect to LinkedIn authorization endpoint' },
                        { step: '04', text: 'Exchange auth code for access token (server-side, never in browser)' },
                        { step: '05', text: 'Call /v2/me and /v2/emailAddress with Bearer token to fetch real profile data' },
                      ].map(s => (
                        <div key={s.step} className="flex items-start gap-3">
                          <span className="text-[10px] font-black text-[#0077b5]/60 font-mono mt-0.5 flex-shrink-0">{s.step}</span>
                          <p className="text-[11px] text-[#71717a] leading-relaxed">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </>
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
        <p className="text-[12px] text-[#71717a] mb-4">Type your meal in plain English — the AI parses it into full nutritional data instantly.</p>

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
              className="text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.05] bg-white/[0.02] text-[#71717a] hover:text-[#a1a1aa] transition-all">
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
                  <span className="text-[11px] text-[#71717a]">Health Score:</span>
                  <span className="text-[14px] font-bold" style={{ color: result.healthScore >= 70 ? '#10b981' : result.healthScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {result.healthScore}/100
                  </span>
                </div>
              </div>

              {/* Calorie hero */}
              <div className="text-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-4">
                <p className="text-[42px] font-black text-[#f0f0f3] leading-none">{result.total.calories}</p>
                <p className="text-[12px] text-[#71717a] mt-1">total calories</p>
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
                        <p className="text-[10px] text-[#71717a]">{item.qty}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-right">
                      <div><p className="text-[11px] font-bold text-[#f0f0f3]">{item.calories}</p><p className="text-[9px] text-[#71717a]">kcal</p></div>
                      <div><p className="text-[11px] font-bold text-indigo-400">{item.protein}g</p><p className="text-[9px] text-[#71717a]">protein</p></div>
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

// ── FITBIT PANEL (real OAuth) ─────────────────────────────────────────────────

const BACKEND = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

function FitbitPanel() {
  const [configured, setConfigured] = useState(null); // null=loading, true, false
  const [connected,  setConnected]  = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [data,       setData]       = useState(null);  // synced health data
  const [notice,     setNotice]     = useState(null);  // {type:'success'|'error', msg}

  function getUserId() {
    try { return JSON.parse(localStorage.getItem('dt_auth') || '{}')?.user?.id || 'default'; }
    catch { return 'default'; }
  }

  // Check config + connection status on mount; also handle OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fitbitStatus = params.get('fitbit');
    const returnedUserId = params.get('userId');

    if (fitbitStatus) {
      // Clean the URL so refreshing doesn't retrigger
      window.history.replaceState({}, '', window.location.pathname + '?tab=fitbit');
      if (fitbitStatus === 'success') {
        setNotice({ type: 'success', msg: 'Fitbit connected! Syncing your data...' });
        setConnected(true);
        if (returnedUserId) triggerSync(returnedUserId);
      } else {
        const msg = params.get('msg') || 'Connection failed';
        setNotice({ type: 'error', msg: `OAuth error: ${msg}` });
      }
    }

    // Check if backend has keys configured
    authFetch('/fitbit/config', { signal: AbortSignal.timeout(5000) })
      .then(d => {
        setConfigured(d.configured);
        if (d.configured) {
          // Check if this user is already connected
          const uid = returnedUserId || getUserId();
          return authFetch(`/fitbit/status?userId=${encodeURIComponent(uid)}`, { signal: AbortSignal.timeout(5000) })
            .then(s => {
              if (s.connected) {
                setConnected(true);
                triggerSync(uid);
              }
            });
        }
      })
      .catch(() => setConfigured(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerSync(userId) {
    setSyncing(true);
    try {
      const json = await authFetch(`/fitbit/sync?userId=${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(12000) });
      if (json.connected && json.health) {
        setData(json);
        setNotice({ type: 'success', msg: `Synced from Fitbit${json.displayName ? ` · ${json.displayName}` : ''} · ${json.syncedAt}` });
      }
    } catch (e) {
      setNotice({ type: 'error', msg: `Sync failed: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnect() {
    const uid = getUserId();
    try {
      const json = await authFetch(`/fitbit/connect?userId=${encodeURIComponent(uid)}`, { signal: AbortSignal.timeout(6000) });
      if (!json.configured) {
        setNotice({ type: 'error', msg: 'Backend not configured. Set FITBIT_CLIENT_ID + FITBIT_CLIENT_SECRET env vars.' });
        return;
      }
      window.location.href = json.url; // redirect to Fitbit login
    } catch (e) {
      if (e.message === 'NOT_AUTHENTICATED') {
        setNotice({ type: 'error', msg: 'Please sign in with a real account to connect Fitbit. Demo accounts cannot use live integrations.' });
      } else {
        setNotice({ type: 'error', msg: `Cannot reach backend: ${e.message}` });
      }
    }
  }

  async function handleDisconnect() {
    const uid = getUserId();
    await authFetch(`/fitbit/disconnect?userId=${encodeURIComponent(uid)}`, { method: 'POST', signal: AbortSignal.timeout(5000) }).catch(() => {});
    setConnected(false);
    setData(null);
    setNotice({ type: 'success', msg: 'Fitbit disconnected.' });
  }

  const h = data?.health || {};

  return (
    <div className="space-y-5">
      {/* Header card */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#00b0b9]" />
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">Fitbit Health Sync</h3>
            <StatusBadge status={connected ? 'live' : 'none'} />
            {syncing && <Loader2 size={13} className="text-[#00b0b9] animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            {connected
              ? <button onClick={handleDisconnect}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.08] text-[#71717a] hover:text-[#ef4444] hover:border-red-500/30 transition-all">
                  Disconnect
                </button>
              : <button onClick={handleConnect}
                  className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #00b0b9, #0077b6)', boxShadow: '0 0 16px rgba(0,176,185,0.3)' }}>
                  <ExternalLink size={13} /> Connect Fitbit
                </button>
            }
          </div>
        </div>

        {notice && (
          <div className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl mb-3 ${
            notice.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {notice.type === 'success' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            {notice.msg}
          </div>
        )}

        {configured === false && !connected && (
          <div className="text-[12px] text-[#71717a] bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
            <p className="font-semibold text-[#a1a1aa] mb-1">Setup required</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Register a free app at <a href="https://dev.fitbit.com/apps/new" target="_blank" rel="noreferrer" className="text-[#00b0b9] hover:underline">dev.fitbit.com/apps/new</a></li>
              <li>Set OAuth 2.0 Application Type to <span className="font-mono text-[10px] bg-white/[0.04] px-1 rounded">Personal</span></li>
              <li>Callback URL: <span className="font-mono text-[10px] bg-white/[0.04] px-1 rounded">http://localhost:8080/api/fitbit/callback</span></li>
              <li>Start backend with: <span className="font-mono text-[10px] bg-white/[0.04] px-1 rounded">FITBIT_CLIENT_ID=xxx FITBIT_CLIENT_SECRET=yyy mvn spring-boot:run</span></li>
            </ol>
          </div>
        )}

        {configured === true && !connected && (
          <p className="text-[12px] text-[#71717a]">
            Click <strong className="text-[#a1a1aa]">Connect Fitbit</strong> to authorize via OAuth. We fetch sleep, steps, heart rate, and calories — no password stored.
          </p>
        )}
      </GlassCard>

      {/* Live data — only shown after successful sync */}
      {connected && data && (
        <>
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Steps Today',     value: (h.steps || 0).toLocaleString(), unit: 'steps',   color: '#6366f1', target: '10,000', pct: Math.round((h.steps||0)/10000*100), icon: <Footprints size={14} /> },
              { label: 'Calories Burned', value: h.calories || '—',               unit: 'kcal',    color: '#f59e0b', target: '2,000',  pct: Math.round((h.calories||0)/2000*100), icon: <Zap size={14} /> },
              { label: 'Distance',        value: h.distanceMetres ? `${(h.distanceMetres/1000).toFixed(1)}` : '—', unit: 'km', color: '#10b981', target: '8 km', pct: Math.round((h.distanceMetres||0)/8000*100), icon: <Activity size={14} /> },
            ].map(m => (
              <GlassCard key={m.label}>
                <div className="flex items-center gap-1.5 mb-2" style={{ color: m.color }}>{m.icon}<p className="text-[11px] text-[#71717a]">{m.label}</p></div>
                <p className="text-[22px] font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] text-[#6b7280]">{m.unit} · goal {m.target}</p>
                <div className="h-1.5 rounded-full bg-white/[0.05] mt-2.5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, m.pct)}%` }}
                    transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
                    className="h-full rounded-full" style={{ background: m.color }} />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Sleep + Heart Rate */}
          <div className="grid sm:grid-cols-2 gap-4">
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Moon size={14} className="text-[#8b5cf6]" />
                <p className="text-[12px] font-semibold text-[#f0f0f3]">Sleep Last Night</p>
              </div>
              <p className="text-[36px] font-black text-[#8b5cf6]">{h.sleepHours ? `${h.sleepHours}h` : '—'}</p>
              <p className="text-[11px] text-[#71717a] mt-1">
                {!h.sleepHours ? 'No sleep data yet'
                  : h.sleepHours >= 7 ? '✅ Good rest'
                  : h.sleepHours >= 6 ? '⚠️ Below optimal (target 7–9h)'
                  : '🔴 Sleep debt — affects focus & recovery'}
              </p>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={14} className="text-[#ef4444]" />
                <p className="text-[12px] font-semibold text-[#f0f0f3]">Resting Heart Rate</p>
              </div>
              <p className="text-[36px] font-black text-[#ef4444]">{h.restingHeartRate || '—'}</p>
              <p className="text-[11px] text-[#71717a] mt-1">
                {!h.restingHeartRate ? 'No heart rate data yet'
                  : h.restingHeartRate < 60 ? '🏅 Athlete range (< 60 bpm)'
                  : h.restingHeartRate < 80 ? '✅ Normal range'
                  : '⚠️ Slightly elevated — check hydration & stress'}
              </p>
            </GlassCard>
          </div>
        </>
      )}

      {/* Connected but still syncing */}
      {connected && !data && syncing && (
        <GlassCard>
          <div className="flex items-center gap-3 py-4 justify-center">
            <Loader2 size={18} className="animate-spin text-[#00b0b9]" />
            <span className="text-[13px] text-[#71717a]">Fetching your Fitbit data...</span>
          </div>
        </GlassCard>
      )}
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
    <div className="space-y-4">

      {/* ── HEADER CARD ── */}
      <GlassCard>
        <div className="flex items-start justify-between gap-6">
          {/* Left: big icon + text */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Landmark size={24} className="text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-[20px] font-bold text-[#f0f0f3]" style={{ fontFamily: 'var(--font-display)' }}>India Banking Intelligence</h2>
                <StatusBadge status={isResults ? 'live' : isDemo ? 'demo' : 'none'} />
              </div>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-2">
                Powered by India's <strong className="text-[#e2e8f0]">Account Aggregator (AA) framework</strong> — RBI-regulated, consent-based open banking.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[12px]">🔒</span>
                <span className="text-[12px] text-[#71717a]">
                  Your data is encrypted and secure. Read our <span className="text-emerald-500 hover:underline cursor-pointer">privacy policy</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: button block */}
          <div className="flex flex-col items-end gap-2.5 flex-shrink-0 ml-4">
            {phase === 'landing' ? (
              <>
                <button
                  onClick={() => setPhase('demo')}
                  className="flex items-center gap-2 text-[14px] px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 whitespace-nowrap"
                  style={{ background: '#10b981' }}
                >
                  Connect Banking <ExternalLink size={15} />
                </button>
                <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                  <CheckCircle size={13} /> Secure OAuth 2.0
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleSyncFinance} disabled={synced}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all disabled:cursor-default"
                  style={{ background: synced ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: synced ? '#10b981' : '#6ee7b7' }}>
                  {synced ? <><CheckCircle size={11} /> Synced</> : <><Plus size={11} /> Sync to Finance</>}
                </button>
                <button onClick={handleReset}
                  className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] transition-all">
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Landing Phase ── */}
      {phase === 'landing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* 3-column provider cards — individual bordered cards */}
          <div className="grid grid-cols-3 gap-4">
            {AA_PROVIDERS.map(p => (
              <button key={p.id} onClick={() => handleProviderClick(p)}
                className="text-left p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all group flex flex-col">
                {/* Name + badge row */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[15px] font-bold text-[#f0f0f3]">{p.name}</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ml-2"
                    style={{ color: p.color, borderColor: p.color + '50', background: p.color + '18' }}>
                    {p.badge}
                  </span>
                </div>
                {/* Subtitle */}
                <p className="text-[12px] font-semibold mb-3" style={{ color: p.color }}>{p.subtitle}</p>
                {/* Description */}
                <p className="text-[12px] text-[#71717a] leading-relaxed flex-1 mb-5">{p.desc}</p>
                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                    <Landmark size={13} />{p.banks}+ banks
                  </span>
                  <span className="text-[12px] font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: p.color }}>
                    Connect →
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Upload card — standalone */}
          <GlassCard>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-4">
                {/* PDF Icon */}
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <span className="text-[18px] leading-none">📄</span>
                  <span className="text-[9px] font-bold text-purple-400 mt-1 tracking-wider">PDF</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#f0f0f3] mb-1">Upload bank statement PDF</h3>
                  <p className="text-[12px] text-[#71717a]">AI extracts &amp; categorises all transactions instantly</p>
                </div>
              </div>
              {/* Upload button + hint */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-[13px] px-5 py-2.5 rounded-xl font-semibold text-[#f0f0f3] transition-all hover:bg-white/[0.06] whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.13)' }}
                >
                  <span className="text-[16px] leading-none">↑</span> Upload PDF
                </button>
                <span className="text-[11px] text-[#6b7280]">Supports PDF up to 25MB</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => e.target.files[0] && processStatement(e.target.files[0])} />

            {error && (
              <div className="mt-4 flex items-center gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
          </GlassCard>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-2 pb-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[12px] text-[#6b7280]">or view demo data</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* View Demo Data button — centered */}
          <div className="flex justify-center pb-2">
            <button onClick={() => setPhase('demo')}
              className="flex items-center gap-2 text-[13px] px-6 py-2.5 rounded-xl font-semibold text-[#a1a1aa] hover:text-[#f0f0f3] transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <Activity size={15} />
              View Demo Data Instead
            </button>
          </div>

          {/* Privacy footer — full width, outside card */}
          <div className="flex items-center justify-between px-1 py-4 border-t border-white/[0.05]">
            <span className="flex items-center gap-2.5 text-[12px] text-[#64748b]">
              <span className="text-[15px]">🛡️</span>
              We never store your banking credentials. You're always in control.
            </span>
            <button className="text-[12px] text-[#64748b] hover:text-[#94a3b8] flex items-center gap-1.5 transition-colors">
              Learn more about AA framework <ExternalLink size={13} />
            </button>
          </div>
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
                <p className="text-[12px] text-[#71717a]">Extracting · Categorising · Generating insights</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {['Extracting text from PDF…', 'Identifying all transactions…', 'Categorising spend with AI…', 'Calculating financial insights…'].map((step, i) => (
                <div key={step} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  </div>
                  <span className="text-[12px] text-[#71717a]">{step}</span>
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
              <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-medium">Total Income</p>
              <p className="text-[22px] font-black text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-[#6b7280]">this month</p>
            </GlassCard>
            <GlassCard>
              <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-medium">Total Spent</p>
              <p className="text-[22px] font-black text-[#f97316]">₹{totalSpend.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-[#6b7280]">this month</p>
            </GlassCard>
            <GlassCard>
              <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-medium">Savings Rate</p>
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
                    : 'border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa]'
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
                    Recent Transactions {isResults && <span className="text-[11px] font-normal text-[#71717a] ml-1">({txns.length} found)</span>}
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
                              <span className="text-[10px] text-[#71717a]">{t.date}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#6b7280] font-mono">{t.mode ?? 'UPI'}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#71717a]">{t.cat ?? t.category}</span>
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
                        <p className="text-[10px] text-[#71717a] mb-1">{m.label}</p>
                        <p className="text-[20px] font-black" style={{ color: m.color }}>
                          {m.prefix}{(m.isNum ? m.value : m.value).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-[#6b7280]">{m.unit}</p>
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
                          <span className="text-[10px] font-black text-[#6b7280] font-mono mt-0.5 flex-shrink-0">{s.step}</span>
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

// ── COURSERA PANEL (real API) ─────────────────────────────────────────────────

const SKILL_CHIPS = ['Python', 'Machine Learning', 'React', 'SQL', 'Data Science', 'Cloud', 'Deep Learning', 'JavaScript', 'DevOps', 'Java', 'Rust', 'NLP'];

function CourseraPanel() {
  const { career, updateDomain } = useData();
  const [query, setQuery]       = useState('');
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState({});
  const [hasCache, setHasCache] = useState(hasCourseraCache());
  const inputRef = useRef(null);

  const doSearch = async (term) => {
    if (!term.trim()) return;
    setLoading(true); setError(''); setCourses([]); setProgress('');
    try {
      const results = await searchCoursera(term.trim(), { onProgress: setProgress });
      setCourses(results);
      if (results.length === 0) setError(`No Coursera courses found for "${term}". Try a broader term.`);
      setHasCache(hasCourseraCache());
    } catch (e) {
      setError(`Coursera API error: ${e.message}. Check network or try clearing cache.`);
    } finally { setLoading(false); setProgress(''); }
  };

  // Auto-search top skill on mount
  useEffect(() => {
    const topSkill = career?.skills?.[0];
    if (topSkill) { setQuery(topSkill); doSearch(topSkill); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = (course) => {
    setSaved(s => ({ ...s, [course.id]: true }));
    const existing = career?.courseraLearning || [];
    if (!existing.find(c => c.id === course.id)) {
      updateDomain('career', { courseraLearning: [...existing, { id: course.id, name: course.name, partner: course.partner, url: course.url, addedAt: new Date().toISOString() }] });
    }
  };

  const savedCourses = career?.courseraLearning || [];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0056d2]/20 border border-[#0056d2]/30 flex items-center justify-center">
              <BookOpen size={18} className="text-[#0056d2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Coursera</h3>
              <p className="text-[11px] text-slate-500">AI-powered · Groq + Coursera · Real course links</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="live" />
            {hasCache && (
              <button onClick={() => { clearCourseraCache(); setHasCache(false); }} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                Clear cache
              </button>
            )}
          </div>
        </div>

        <p className="text-[12px] text-slate-400 mb-4">
          Uses <span className="text-emerald-400 font-semibold">Groq AI</span> to recommend real Coursera courses — links go directly to <span className="text-[#0056d2]">coursera.org</span>. Uses your existing <code className="text-[11px] bg-white/5 px-1 rounded">VITE_GROQ_API_KEY</code>.
        </p>

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(query)}
              placeholder="Search Coursera… e.g. Python, Machine Learning, React"
              className="w-full pl-8 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-600 outline-none focus:border-[#0056d2]/40 transition-colors"
            />
          </div>
          <button
            onClick={() => doSearch(query)}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#0056d2] hover:bg-[#0047b3] disabled:opacity-40 text-white text-[13px] font-semibold transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        {/* Skill chips */}
        <div className="flex flex-wrap gap-1.5">
          {SKILL_CHIPS.map(s => (
            <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${query === s ? 'bg-[#0056d2]/20 border-[#0056d2]/40 text-[#60a5fa]' : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.15] hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Progress / loading */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0056d2]/10 border border-[#0056d2]/20">
          <Loader2 size={14} className="animate-spin text-[#60a5fa]" />
          <p className="text-[12px] text-[#60a5fa]">{progress || 'Searching Coursera catalog…'}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400" />
          <p className="text-[12px] text-amber-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {courses.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 mb-3 px-1">{courses.length} courses found on Coursera for "<span className="text-slate-300">{query}</span>"</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((course, i) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all group">
                {/* Course thumbnail */}
                {course.photo ? (
                  <img src={course.photo} alt={course.name}
                    className="w-full h-28 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-[#0056d2]/20 to-purple-900/20 flex items-center justify-center">
                    <BookOpen size={28} className="text-[#0056d2]/50" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-[13px] font-semibold text-white leading-snug mb-1 line-clamp-2">{course.name}</p>
                  <p className="text-[11px] text-slate-500 mb-1">{course.partner}</p>
                  <div className="flex gap-2 mb-3">
                    {course.level && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{course.level}</span>}
                    {course.duration && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">⏱ {course.duration}</span>}
                  </div>
                  <div className="flex gap-2">
                    <a href={course.url} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#0056d2]/15 border border-[#0056d2]/25 text-[#60a5fa] text-[12px] font-semibold hover:bg-[#0056d2]/25 transition-all">
                      <ExternalLink size={12} /> View Course
                    </a>
                    <button
                      onClick={() => handleSave(course)}
                      disabled={saved[course.id] || !!savedCourses.find(c => c.id === course.id)}
                      className="px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all disabled:opacity-40"
                      style={saved[course.id] || savedCourses.find(c => c.id === course.id)
                        ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                    >
                      {saved[course.id] || savedCourses.find(c => c.id === course.id) ? <CheckCircle size={13} /> : <Plus size={13} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Saved courses */}
      {savedCourses.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Saved to Learning Path ({savedCourses.length})</h3>
          <div className="space-y-2">
            {savedCourses.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-200 truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500">{c.partner}</p>
                </div>
                <a href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#60a5fa] hover:underline flex items-center gap-1 shrink-0">
                  Open <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'github',      label: 'GitHub',       icon: GitBranch,  color: 'text-[#a1a1aa]'    },
  { id: 'coursera',    label: 'Coursera',     icon: BookOpen,   color: 'text-[#0056d2]'    },
  { id: 'linkedin',    label: 'LinkedIn',     icon: Briefcase,  color: 'text-[#0077b5]'    },
  { id: 'nutritionix', label: 'Nutrition',    icon: Utensils,   color: 'text-emerald-400'  },
  { id: 'fitbit',      label: 'Fitbit',       icon: Activity,   color: 'text-[#00b0b9]'    },
  { id: 'banking',     label: 'Banking',      icon: Landmark,   color: 'text-emerald-400'  },
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
          {tab === 'coursera'    && <CourseraPanel />}
          {tab === 'linkedin'    && <LinkedInPanel />}
          {tab === 'nutritionix' && <NutritionixPanel />}
          {tab === 'fitbit'      && <FitbitPanel />}
          {tab === 'banking'     && <IndiaBankingPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
