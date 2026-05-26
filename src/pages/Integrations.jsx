import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader } from '../components/ui/Components';
import { fetchGitHubProfile, analyzeGitHubWithAI, LANG_COLORS } from '../services/githubService';
import {
  analyzeFood, hasNutritionixKey, saveNutritionixKeys, clearNutritionixKeys, getDemoFoodResult
} from '../services/nutritionixService';
import { extractPdfText } from '../services/resumeService';
import {
  GitBranch, Briefcase, Activity, Landmark, Utensils,
  Search, Sparkles, CheckCircle, AlertTriangle, ExternalLink,
  Star, GitFork, Code2, Users, Key, Plus,
  Zap, Brain, ChevronRight, Loader2,
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
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    setProfile(generateProfile(searchInput.trim()));
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
        <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-wider mb-2.5">Search LinkedIn Profile</p>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter a name (e.g. Priya Sharma)"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-[12px] text-[#f0f0f3] placeholder-[#3f3f46] outline-none focus:border-[#0077b5]/40 transition-colors"
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
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[#52525b] hover:text-[#a1a1aa] transition-all">
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
          <p className="text-[11px] text-[#52525b] mt-1">Connecting to LinkedIn Mock API</p>
        </GlassCard>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <GlassCard className="text-center py-12">
          <Users size={32} className="mx-auto mb-3 text-[#52525b]" />
          <p className="text-[13px] font-semibold text-[#a1a1aa] mb-1">Search any LinkedIn profile</p>
          <p className="text-[12px] text-[#52525b]">Enter a name above · Try a quick name suggestion to get started</p>
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
                  <p className="text-[11px] text-[#52525b] mt-0.5">{profile.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#00a0dc] font-semibold">{profile.connections} connections</span>
                    <span className="text-[#3f3f46]">·</span>
                    <span className="text-[11px] text-[#52525b]">{profile.followers} followers</span>
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
                <p className="text-[10px] text-[#52525b] font-medium mb-1.5 uppercase tracking-wider">{m.label}</p>
                <p className="text-[22px] font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] text-[#3f3f46] mt-0.5">{m.sub}</p>
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
                    : 'border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa]'
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
                          <p className="text-[11px] text-[#52525b] mt-0.5">{exp.duration}</p>
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
                  <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider px-1 pt-1">Education</p>
                  {profile.education.map((edu, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">🎓</div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{edu.degree}</p>
                          <p className="text-[12px] text-[#a1a1aa]">{edu.institution}</p>
                          <p className="text-[11px] text-[#52525b] mt-0.5">{edu.year} · {edu.grade}</p>
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
                            <span className="text-[10px] text-[#52525b]">{s.endorsements} endorsements</span>
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
                                <p className="text-[11px] text-[#52525b] mt-0.5">{job.location} · {job.type} · Posted {job.postedAgo}</p>
                              </div>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${matchColor(job.match)} flex-shrink-0`}>{job.match}% match</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                              <span className="text-[11px] text-emerald-400 font-semibold">{job.salary}</span>
                              <span className="text-[10px] text-[#52525b]">{job.applicants} applicants</span>
                              <button
                                onClick={() => setSavedJobs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                                className={`text-[11px] px-3 py-1 rounded-full border transition-all font-semibold ml-auto ${savedJobs.includes(i) ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#00a0dc]' : 'border-white/[0.06] text-[#52525b] hover:text-[#a1a1aa]'}`}>
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
