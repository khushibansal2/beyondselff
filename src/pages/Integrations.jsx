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
  Trash2, MapPin, ShieldCheck, Calendar, Filter, ChevronDown, ChevronLeft, MoreVertical,
  Link, Cable
} from 'lucide-react';

const Github = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Linkedin = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const PlugIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v8" />
    <path d="M16.24 7.76a6 6 0 0 1-8.49 0" />
    <rect x="9" y="10" width="6" height="6" rx="2" />
    <path d="M12 16v6" />
  </svg>
);

// ── Shared helpers ────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  const activeColor = {
    github: '#ffffff',
    linkedin: '#0077b5',
    nutritionix: '#10b981',
    fitbit: '#00b0b9',
    banking: '#10b981'
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      marginBottom: '12px',
      gap: 20,
      position: 'relative',
      zIndex: 2,
      overflowX: 'auto',
      paddingBottom: 0
    }} className="custom-scrollbar">
      {tabs.map((t) => {
        const isActive = active === t.id;
        const brandColor = isActive ? (activeColor[t.id] || '#ffffff') : '#8e929b';
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 4px',
              background: 'none',
              border: 'none',
              color: isActive ? '#ffffff' : '#8e929b',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.2s',
              borderBottom: isActive ? `2px solid ${activeColor[t.id] || '#8b5cf6'}` : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap'
            }}
          >
            <t.icon size={15} style={{ color: brandColor }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const isLive = status === 'live';
  const isDemo = status === 'demo';
  
  const pulseStyle = isLive 
    ? 'pulse-dot 1.8s infinite'
    : isDemo 
      ? 'pulse-dot-orange 1.8s infinite'
      : 'none';
      
  const labelColor = isLive 
    ? '#34d399' 
    : isDemo 
      ? '#fbbf24' 
      : '#8b949e';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      padding: '3px 10px',
      borderRadius: 99,
      fontWeight: 600,
      background: isLive ? 'rgba(16,185,129,0.06)' : isDemo ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isLive ? 'rgba(16,185,129,0.15)' : isDemo ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)'}`,
      color: labelColor,
      textTransform: 'none'
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isLive ? '#10b981' : isDemo ? '#f59e0b' : '#6e7681',
        animation: pulseStyle
      }} />
      {status === 'live' ? 'Twin Live' : status === 'demo' ? 'Twin Demo' : 'Not Connected'}
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
      <GlassCard className="relative overflow-hidden !p-6 md:!p-7">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/[0.015] blur-3xl pointer-events-none" />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Github size={20} className="text-white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>GitHub Developer Analytics</h3>
                <StatusBadge status={profile ? 'live' : 'none'} />
              </div>
              <p style={{ fontSize: 12.5, color: '#8b949e', margin: '4px 0 0' }}>
                Analyze any public profile — tech stack, activity, and AI career insights.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="e.g. torvalds"
              className="input-premium w-full text-[13.5px]"
              style={{ paddingLeft: 16, paddingRight: 16, height: 42, boxSizing: 'border-box' }}
            />
          </div>
          <motion.button
            onClick={handleFetch}
            disabled={!username.trim() || loading}
            whileHover={!loading && username.trim() ? { scale: 1.03, y: -1 } : {}}
            whileTap={!loading && username.trim() ? { scale: 0.97 } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 42, borderRadius: 12, 
              fontWeight: 700, fontSize: 13, color: '#ffffff', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)', opacity: !username.trim() || loading ? 0.5 : 1,
              boxSizing: 'border-box'
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Analyze
          </motion.button>
        </div>

        {!profile && (
          <div style={{
            marginTop: 24,
            padding: '44px 24px',
            borderRadius: 16,
            border: '1px dashed rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.005)'
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16
            }}>
              <Github size={22} style={{ color: '#fff' }} />
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px 0' }}>Analyze any GitHub profile</h4>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 20px 0', textAlign: 'center' }}>
              No authentication required • Works with any public profile
            </p>
            
            {/* Suggested Chips inside empty state */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Try:</span>
              {['torvalds', 'gvanrossum', 'sindresorhus', 'yyx990803'].map(u => (
                <motion.button 
                  key={u} 
                  onClick={() => setUsername(u)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    fontSize: 11.5, padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc', fontWeight: 600, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#c7d2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.color = '#a5b4fc'; }}
                >
                  {u}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </GlassCard>

      {/* Profile Results */}
      <AnimatePresence>
        {profile && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Left Column (span 2) */}
            <div className="lg:col-span-2 space-y-5">
            {/* User card */}
            <GlassCard className="relative overflow-hidden !p-6 md:!p-7">
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left flex-1">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-75 blur transition duration-300" />
                    <img
                      src={profile.user.avatar_url}
                      alt={profile.user.login}
                      className="relative w-18 h-18 rounded-2xl border border-white/[0.1] object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#090d16] rounded-full ring-2 ring-emerald-500/30 animate-pulse" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <h2 className="text-[18px] font-black text-white tracking-tight">{profile.user.name || profile.user.login}</h2>
                      <a href={profile.user.html_url} target="_blank" rel="noreferrer"
                        className="text-[11.5px] font-bold text-[#8b949e] hover:text-indigo-400 transition-colors flex items-center gap-1">
                        @{profile.user.login} <ExternalLink size={11} className="stroke-[2.5]" />
                      </a>
                    </div>
                    {profile.user.bio && (
                      <p className="text-[12.5px] text-[#8b949e] mt-2 leading-relaxed max-w-xl">
                        {profile.user.bio}
                      </p>
                    )}
                    {profile.domains.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                        {profile.domains.map(d => (
                          <span key={d} className="text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/35 text-indigo-200 font-semibold shadow-[0_2px_8px_rgba(99,102,241,0.08)]">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Developer Score Circular Gauge */}
                {(() => {
                  const score = profile.metrics.devScore;
                  const strokeColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  const glowColor = score >= 70 ? 'rgba(16, 185, 129, 0.4)' : score >= 40 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                  const radius = 26;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (score / 100) * circumference;

                  return (
                    <div className="relative flex flex-col items-center justify-center flex-shrink-0 sm:pt-1">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="transparent"
                            stroke="rgba(255, 255, 255, 0.03)"
                            strokeWidth="4.5"
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r={radius}
                            fill="transparent"
                            stroke={strokeColor}
                            strokeWidth="4.5"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            strokeLinecap="round"
                            style={{
                              filter: `drop-shadow(0 0 6px ${strokeColor})`,
                            }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[22px] font-black tracking-tight" style={{ color: strokeColor, textShadow: `0 0 10px ${glowColor}` }}>
                            {score}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-[#8b949e] mt-1.5 uppercase tracking-wider">Dev Score</p>
                    </div>
                  );
                })()}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-5 pb-5">
                {[
                  { label: 'Repositories', value: profile.user.public_repos, sub: 'Active projects', icon: Code2,   color: '#6366f1' },
                  { label: 'Total Stars',  value: profile.metrics.totalStars, sub: 'Across all repos', icon: Star,    color: '#fbbf24' },
                  { label: 'Followers',    value: profile.user.followers,      sub: 'Community reach', icon: Users,   color: '#10b981' },
                  { label: 'Active (30D)', value: profile.metrics.recentRepos, sub: 'Recent activity', icon: Activity,color: '#a78bfa' },
                ].map(s => (
                  <motion.div
                    key={s.label}
                    whileHover={{ y: -3, scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.12)' }}
                    className="relative overflow-hidden rounded-2xl bg-white/[0.015] border border-white/[0.05] flex items-center gap-4 transition-all duration-300"
                    style={{
                      padding: '16px 20px',
                      boxShadow: `inset 0 1px 1px rgba(255,255,255,0.01)`
                    }}
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color}00, ${s.color}40, ${s.color}00)` }} />
                    <div 
                      style={{ 
                        width: 38, height: 38, borderRadius: '50%', 
                        background: `rgba(255, 255, 255, 0.02)`, 
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <s.icon size={16} style={{ color: s.color, filter: `drop-shadow(0 0 4px ${s.color}40)` }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>{s.value}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                      <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Tech Stack and Top Repositories in a stunning side-by-side grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16, alignItems: 'stretch' }}>
              {/* Language Chart */}
              <GlassCard className="flex flex-col relative overflow-hidden !p-4" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2.5">
                  <Code2 size={15} className="text-indigo-400" />
                  <h3 className="text-[13.5px] font-bold text-white tracking-wide">Tech Stack Distribution</h3>
                </div>
                <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minHeight: 0 }}>
                  {profile.languages.map(l => {
                    const langColor = LANG_COLORS[l.lang] ?? '#6366f1';
                    return (
                      <motion.div 
                        key={l.lang}
                        whileHover={{ x: 3 }}
                        className="group transition-all"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110" 
                              style={{ 
                                background: langColor,
                                boxShadow: `0 0 10px ${langColor}60`
                              }} 
                            />
                            <span className="text-[13px] text-slate-200 font-semibold group-hover:text-white transition-colors">{l.lang}</span>
                          </div>
                          <span className="text-[11.5px] text-[#8b949e] font-medium transition-colors group-hover:text-slate-300">
                            {l.count} {l.count === 1 ? 'repo' : 'repos'} <span className="text-slate-600 mx-1">•</span> {l.pct}%
                          </span>
                        </div>
                        <div className="h-[7px] rounded-full bg-white/[0.03] border border-white/[0.04] overflow-hidden p-[1px]">
                          <motion.div
                            initial={{ width: 0 }} 
                            animate={{ width: `${l.pct}%` }}
                            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full transition-all duration-300" 
                            style={{ 
                                background: `linear-gradient(90deg, ${langColor}dd, ${langColor})`,
                                boxShadow: `0 0 8px ${langColor}80`
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Top Repos */}
              <GlassCard className="relative overflow-hidden !p-4" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2.5">
                  <GitBranch size={15} className="text-purple-400" />
                  <h3 className="text-[13.5px] font-bold text-white tracking-wide">Top Repositories</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  {profile.topRepos.map(r => {
                    const hasDetails = r.language || r.stargazers_count > 0 || r.forks_count > 0;
                    return (
                      <motion.a 
                        key={r.id} 
                        href={r.html_url} 
                        target="_blank" 
                        rel="noreferrer"
                        whileHover={{ y: -2, borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                        className="block rounded-xl border border-white/[0.05] bg-white/[0.005] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-300 group"
                        style={{ padding: '8px 12px' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <GitBranch size={13} className="text-[#8b949e] group-hover:text-[#818cf8] transition-colors flex-shrink-0" />
                              <p className="text-[13px] font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                                {r.name}
                              </p>
                            </div>
                          </div>
                          <ExternalLink size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                        {hasDetails && (
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.03]">
                            <div className="flex items-center gap-3">
                              {r.language && (
                                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#8b949e]">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full" 
                                    style={{ 
                                      background: LANG_COLORS[r.language] ?? '#6366f1',
                                      boxShadow: `0 0 6px ${(LANG_COLORS[r.language] ?? '#6366f1')}40`
                                    }} 
                                  />
                                  {r.language}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[10.5px] font-medium text-[#8b949e] group-hover:text-amber-400 transition-colors">
                                <Star size={11} className="fill-transparent group-hover:fill-amber-400/20" />
                                {r.stargazers_count}
                              </span>
                              <span className="flex items-center gap-1 text-[10.5px] font-medium text-[#8b949e] group-hover:text-indigo-400 transition-colors">
                                <GitFork size={11} />
                                {r.forks_count}
                              </span>
                            </div>
                          </div>
                        )}
                      </motion.a>
                    );
                  })}
                </div>
              </GlassCard>
            </div>

            {/* High-fidelity Action Banners Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
              
              {/* Banner 1: Sync Languages */}
              <div
                onClick={handleSyncSkills}
                style={{
                  background: 'rgba(16, 185, 129, 0.03)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.2) 100%)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Sync Languages to Career Profile</div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Keep your skills in sync</div>
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: '#10b981' }} />
              </div>

              {/* Banner 2: AI Career Analysis */}
              <div
                onClick={handleAIAnalysis}
                style={{
                  background: 'rgba(139, 92, 246, 0.03)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 12px rgba(139, 92, 246, 0.06)',
                  opacity: aiLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!aiLoading) {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.2) 100%)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a78bfa',
                      boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {aiLoading ? (
                      <Loader2 size={14} className="animate-spin text-[#a78bfa]" />
                    ) : (
                      <Sparkles size={14} className="text-[#a78bfa] animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                      {aiLoading ? 'Analyzing tech stack…' : 'AI Career Analysis'}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                      Get AI-powered career insights
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: '#a78bfa' }} />
              </div>

              {/* Banner 3: Data Status Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.01)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.04)',
                      border: '1px solid rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Data is fetched live from GitHub</div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>Public profile data • Real-time insights</div>
                  </div>
                </div>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8b949e',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)',
                }}>
                  <Github size={16} />
                </div>
              </div>

            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {analysis ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <GlassCard className="relative overflow-hidden border border-indigo-500/20 bg-indigo-500/[0.01] shadow-[0_0_30px_rgba(99,102,241,0.06)] !p-6 md:!p-7">
                  <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                        <Brain size={16} className="text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-white tracking-wide">AI Career Passport</h3>
                        <p className="text-[11px] text-[#8b949e]">Personalized technical assessment & insights</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3.5 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[11px] font-medium text-[#8b949e]">Level:</span>
                        <span className="text-[11px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {analysis.overallLevel}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[11px] font-medium text-[#8b949e]">Hirability:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-[6px] rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${analysis.hirability}%` }} />
                          </div>
                          <span className="text-[12px] font-black text-emerald-400">
                            {analysis.hirability}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary quote */}
                  <div className="relative p-4 rounded-xl bg-white/[0.015] border-l-2 border-indigo-500/40 border-y border-r border-white/[0.04] mb-6 shadow-inner">
                    <span className="absolute -top-3 left-4 text-[42px] font-serif text-indigo-500/20 select-none leading-none">“</span>
                    <p className="text-[12.5px] text-slate-300 italic leading-relaxed pl-3 pr-2 relative z-10">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Strengths / Gaps / Learn Next Columns */}
                  <div className="grid sm:grid-cols-3 gap-5 mb-6">
                    {[
                      { 
                        title: 'Key Strengths', 
                        items: analysis.strengths, 
                        color: 'text-emerald-400', 
                        border: 'border-emerald-500/15', 
                        bg: 'from-emerald-500/[0.03] to-transparent',
                        icon: (
                          <svg className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )
                      },
                      { 
                        title: 'Skill Gaps', 
                        items: analysis.gaps, 
                        color: 'text-red-400', 
                        border: 'border-red-500/15', 
                        bg: 'from-red-500/[0.03] to-transparent',
                        icon: (
                          <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )
                      },
                      { 
                        title: 'Recommend Next', 
                        items: analysis.nextSkills, 
                        color: 'text-amber-400', 
                        border: 'border-amber-500/15', 
                        bg: 'from-amber-500/[0.03] to-transparent',
                        icon: (
                          <svg className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )
                      },
                    ].map(s => (
                      <div 
                        key={s.title} 
                        className={`p-4 rounded-2xl border ${s.border} bg-gradient-to-b ${s.bg} flex flex-col`}
                      >
                        <p className={`text-[11.5px] font-black uppercase tracking-wider mb-3 pb-1.5 border-b border-white/[0.03] ${s.color}`}>
                          {s.title}
                        </p>
                        <ul className="space-y-2.5 flex-1">
                          {(s.items ?? []).map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300 leading-relaxed font-medium">
                              {s.icon}
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Career Paths */}
                  <div className="mt-5 p-4 rounded-2xl bg-white/[0.005] border border-white/[0.04]">
                    <p className="text-[11.5px] font-black text-[#8b949e] uppercase tracking-wider mb-3">Target Career Paths</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(analysis.careerPaths ?? []).map((p, i) => (
                        <span 
                          key={i} 
                          className="text-[11.5px] px-3.5 py-1.5 rounded-xl border border-purple-500/25 bg-purple-500/[0.06] text-purple-200 font-semibold shadow-[0_2px_10px_rgba(168,85,247,0.04)]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Resume Tips */}
                  <div className="mt-5 pt-5 border-t border-white/[0.05]">
                    <p className="text-[11.5px] font-black text-[#8b949e] uppercase tracking-wider mb-3">Resume Optimization Tips</p>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {(analysis.resumeTips ?? []).map((t, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[12px] text-slate-300 leading-relaxed font-medium">
                          <ChevronRight size={13} className="mt-1 text-indigo-400 flex-shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="relative overflow-hidden border border-white/[0.05] !p-6 flex flex-col items-center text-center justify-center min-h-[320px]">
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-3xl pointer-events-none" />
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Brain size={22} className="text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-[15px] font-bold text-white mb-2">AI Career Passport</h3>
                <p className="text-[12.5px] text-[#8b949e] leading-relaxed max-w-[280px] mb-5">
                  Generate a personalized professional passport mapping your skills, hirability index, and custom resume optimizations based on your public GitHub history.
                </p>
                <motion.button
                  onClick={handleAIAnalysis}
                  disabled={aiLoading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_4px_15px_rgba(99,102,241,0.2)] border-none cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating Passport...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="animate-pulse" />
                      Unlock AI Passport
                    </>
                  )}
                </motion.button>
              </GlassCard>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
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

const GoogleLogo = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const MicrosoftLogo = () => (
  <div className="grid grid-cols-2 gap-[2px] w-3 h-3 flex-shrink-0">
    <div className="bg-[#F25022] w-1.5 h-1.5" />
    <div className="bg-[#7FBA00] w-1.5 h-1.5" />
    <div className="bg-[#00A1F1] w-1.5 h-1.5" />
    <div className="bg-[#FFB900] w-1.5 h-1.5" />
  </div>
);

const AmazonLogo = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.9 18.2c-2.4 1.4-5.6 2-8.5 2-3.8 0-7.3-1.2-10-3.3-.4-.3-.3-.8.2-.6 2.9 1.1 6.3 1.7 9.8 1.7 2.6 0 5.4-.4 7.7-1.3.5-.2.8.2.8.5 0-.1 0-.1 0 0z" fill="#FF9900"/>
    <path d="M17.5 17.5c-.3-.4-1.2-.2-1.6 0-.3.2-.3.7-.1.9.4.5 1.4.5 1.7 0 .2-.2.2-.6 0-.9z" fill="#FF9900"/>
    <path d="M12 4.5c-3.3 0-6 2.7-6 6v3c0 2.2 1.8 4 4 4s4-1.8 4-4v-3c0-3.3-2.7-6-6-6zm2 9c0 1.1-.9 2-2 2s-2-.9-2-2v-3c0-1.1.9-2 2-2s2 .9 2 2v3z" fill="#FFFFFF"/>
  </svg>
);

const MOCK_TOP_MATCHES = [
  {
    name: 'Priya Sharma', degree: '2nd',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    role: 'Software Engineer @ Google',
    company: 'Google',
    location: 'Bengaluru, India',
    experience: '6+ yrs', followers: '12K+',
    skills: 'AI/ML, Product Strategy, Leadership',
    score: 82, scoreLabel: 'Excellent', scoreColor: '#388bfd'
  },
  {
    name: 'Arjun Mehta', degree: '2nd',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
    role: 'Product Manager @ Microsoft',
    company: 'Microsoft',
    location: 'Mumbai, India',
    experience: '8+ yrs', followers: '8K+',
    skills: 'Product Strategy, Growth, Analytics',
    score: 76, scoreLabel: 'Good', scoreColor: '#ab7df8'
  },
  {
    name: 'Rahul Gupta', degree: '3rd+',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    role: 'Data Scientist @ Amazon',
    company: 'Amazon',
    location: 'Hyderabad, India',
    experience: '5+ yrs', followers: '6K+',
    skills: 'Data Science, ML, Python',
    score: 68, scoreLabel: 'Good', scoreColor: '#6e7681'
  }
];


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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search */}
      <GlassCard className="!p-5">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="w-6 h-6 rounded-md bg-[#0077b5] flex items-center justify-center text-white font-sans font-bold text-[13px] select-none">in</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>LinkedIn Profile Intelligence</h3>
              <StatusBadge status={profile ? 'live' : 'none'} />
            </div>
          </div>
        </div>
        
        <p style={{ fontSize: 12.5, color: '#8b949e', margin: '4px 0 0' }}>
          Analyze any LinkedIn profile or search for professional connections to enrich your career analytics and job matches.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, width: '100%', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, color: '#6e7681' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Arjun Mehta, Priya Sharma"
              className="input-premium w-full text-[13.5px] !pl-10"
              style={{ height: 42, boxSizing: 'border-box' }}
            />
          </div>
          <motion.button
            onClick={handleSearch}
            disabled={!searchInput.trim() || loading}
            whileHover={!loading && searchInput.trim() ? { scale: 1.03, y: -1 } : {}}
            whileTap={!loading && searchInput.trim() ? { scale: 0.97 } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', height: 42, borderRadius: 12, 
              fontWeight: 700, fontSize: 13, color: '#ffffff', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)', opacity: !searchInput.trim() || loading ? 0.5 : 1,
              boxSizing: 'border-box'
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Analyze
          </motion.button>
        </div>

        {/* Suggested row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 600 }}>Suggested:</span>
            {['Priya Sharma', 'Arjun Mehta', 'Rahul Gupta', 'Ananya Singh'].map(n => (
              <button 
                key={n} 
                onClick={() => setSearchInput(n)} 
                style={{
                  fontSize: 11.5, padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#94a3b8', fontWeight: 600, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                {n}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setSearchInput('')} 
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6e7681', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#6e7681'}
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>

      </GlassCard>

      {/* Loading State */}
      {loading && (
        <GlassCard className="text-center py-12">
          <Loader2 size={32} className="mx-auto mb-4 text-indigo-400 animate-spin" />
          <p className="text-[14px] font-semibold text-[#8b949e]">Analyzing profile for "{searchInput}"…</p>
        </GlassCard>
      )}

      {/* Empty State / Top Matches */}
      {!profile && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '32px', width: '100%', minWidth: 0 }}>
          <GlassCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 18px', textAlign: 'center', marginTop: 16 }}>
            {/* Top Graphic Area */}
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              
              {/* Decorative Background Sparkles */}
              <div style={{ position: 'absolute', top: 4, left: '16%', opacity: 0.5 }} className="animate-pulse">
                <Sparkles size={13} className="text-blue-400" />
              </div>
              <div style={{ position: 'absolute', bottom: 12, left: '8%', opacity: 0.4 }} className="animate-pulse">
                <Sparkles size={11} className="text-indigo-400" />
              </div>
              <div style={{ position: 'absolute', top: 20, right: '12%', opacity: 0.5 }} className="animate-pulse">
                <Sparkles size={14} className="text-violet-400" />
              </div>

              {/* Glowing LinkedIn badge */}
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 119, 181, 0.22) 0%, rgba(0, 119, 181, 0.04) 100%)',
                border: '1.5px solid rgba(0, 119, 181, 0.3)',
                boxShadow: '0 0 24px rgba(0, 119, 181, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, zIndex: 2
              }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#00a0dc', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.06em', textShadow: '0 0 8px rgba(0, 160, 220, 0.4)' }}>in</span>
              </div>

              {/* Central Vector Profile Card Mockup */}
              <div style={{
                position: 'relative',
                width: 172,
                height: 104,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.01)',
                padding: '14px 18px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 1
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {/* Simplified Profile Circle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#8b949e', flexShrink: 0
                  }}>
                    <Users size={15} />
                  </div>

                  {/* Horizontal text placeholders */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ height: 5, borderRadius: 2.5, background: 'rgba(255, 255, 255, 0.06)', width: '85%' }} />
                    <div style={{ height: 5, borderRadius: 2.5, background: 'rgba(255, 255, 255, 0.03)', width: '65%' }} />
                  </div>
                </div>

                {/* Bottom line placeholder */}
                <div style={{ height: 5, borderRadius: 2.5, background: 'rgba(255, 255, 255, 0.04)', width: '75%', marginTop: 6 }} />

                {/* Circular Magnifying Glass Lens with chart bars */}
                <div style={{
                  position: 'absolute',
                  bottom: -14,
                  right: -14,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(13, 20, 35, 0.9)',
                  border: '1.5px solid rgba(129, 140, 248, 0.25)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}>
                  {/* Mini Bar Chart lines inside circular lens */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#818cf8]">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>

                  {/* Magnifying Glass Handle protruding outside bottom-right */}
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 3,
                    background: '#818cf8',
                    borderRadius: 1.5,
                    transform: 'rotate(45deg) translate(7px, 7px)',
                    boxShadow: '0 0 6px rgba(129, 140, 248, 0.6)'
                  }} />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px 0', letterSpacing: '-0.01em' }}>Analyze any LinkedIn profile</h4>
            <p style={{ fontSize: 12.5, color: '#8b949e', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
              No authentication required<br />
              Works with any public profile
            </p>

            {/* Thin Horizontal Divider */}
            <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.05)', margin: '20px 0 16px' }} />

            {/* Bottom Badges Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', gap: 6 }}>
              
              {/* Career Insights badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(129, 140, 248, 0.04)',
                  border: '1px solid rgba(129, 140, 248, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8'
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>Career Insights</span>
              </div>

              {/* Skill Match badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(129, 140, 248, 0.04)',
                  border: '1px solid rgba(129, 140, 248, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8'
                }}>
                  <ShieldCheck size={13} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>Skill Match</span>
              </div>

              {/* Job Opportunities badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(129, 140, 248, 0.04)',
                  border: '1px solid rgba(129, 140, 248, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8'
                }}>
                  <Briefcase size={13} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>Job Opportunities</span>
              </div>

            </div>
          </GlassCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 8, marginBottom: 14, minWidth: 0 }}>
              <h3 className="text-[17px] font-bold text-white tracking-tight" style={{ margin: 0 }}>Top Matches</h3>
              <button className="text-[13px] text-[#ab7df8] hover:text-[#c084fc] hover:underline flex items-center gap-1.5 transition-colors font-semibold" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }} className="animate-fadeIn">
              {MOCK_TOP_MATCHES.map(match => (
                <div 
                  key={match.name} 
                  className="flex items-center bg-[#121826]/40 hover:bg-[#182030]/60 border border-white/[0.04] hover:border-white/[0.08] rounded-2xl transition-all duration-300 cursor-pointer group shadow-lg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '24px 24px',
                    width: '100%',
                    minWidth: 0
                  }}
                  onClick={() => { setSearchInput(match.name); handleSearch(); }}
                >
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-4.5 w-[38%]" style={{ display: 'flex', alignItems: 'center', gap: 18, width: '38%', minWidth: 0 }}>
                    <div className="relative flex-shrink-0" style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={match.avatar} className="rounded-full border border-white/[0.08] object-cover" style={{ width: 56, height: 56, display: 'block', borderRadius: '50%' }} alt={match.name} />
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#22c55e] border-2 border-[#0e1322] rounded-full shadow-md"></div>
                    </div>
                    <div className="min-w-0 flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, flex: 1 }}>
                      <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <h4 className="text-[15px] font-bold text-white tracking-wide leading-none truncate" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.name}</h4>
                        <span className="text-[10px] font-bold text-[#8b949e] bg-[#222730] border border-white/[0.06] px-2 py-0.5 rounded-md flex-shrink-0 select-none">{match.degree}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 text-[#94a3b8] text-[13px] leading-tight" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {match.company === 'Google' && <GoogleLogo />}
                        {match.company === 'Microsoft' && <MicrosoftLogo />}
                        {match.company === 'Amazon' && <AmazonLogo />}
                        <span className="truncate pl-0.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.role}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8b949e] text-[12.5px] leading-none mt-0.5" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <MapPin size={12} className="flex-shrink-0 text-[#6e7681]" />
                        <span className="truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="w-[11%] flex flex-col gap-1.5 pl-1" style={{ width: '11%', display: 'flex', flexDirection: 'column', gap: 9, paddingLeft: 4, minWidth: 0 }}>
                    <span className="text-[12px] text-[#8b949e] font-normal select-none truncate" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Experience</span>
                    <span className="text-[14px] font-bold text-white mt-0.5 truncate" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.experience}</span>
                  </div>

                  {/* Followers */}
                  <div className="w-[11%] flex flex-col gap-1.5 pl-1" style={{ width: '11%', display: 'flex', flexDirection: 'column', gap: 9, paddingLeft: 4, minWidth: 0 }}>
                    <span className="text-[12px] text-[#8b949e] font-normal select-none truncate" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Followers</span>
                    <span className="text-[14px] font-bold text-white mt-0.5 truncate" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.followers}</span>
                  </div>

                  {/* Skills */}
                  <div className="w-[21%] flex flex-col gap-1.5 pr-2" style={{ width: '21%', display: 'flex', flexDirection: 'column', gap: 9, paddingRight: 8, minWidth: 0 }}>
                    <span className="text-[12px] text-[#8b949e] font-normal select-none truncate" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Skills</span>
                    <span className="text-[13px] font-normal text-[#c9d1d9] leading-relaxed block mt-0.5 truncate" style={{ fontSize: 13, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={match.skills}>{match.skills}</span>
                  </div>

                  {/* Activity Score */}
                  <div className="w-[15%] flex flex-col items-center justify-center gap-1" style={{ width: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, minWidth: 0 }}>
                    <span className="text-[12px] text-[#8b949e] font-normal select-none text-center truncate" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Activity Score</span>
                    <div className="relative w-[44px] h-[44px] flex items-center justify-center mt-1 select-none" style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                        <circle cx="22" cy="22" r="18.5" fill="none" stroke={`${match.scoreColor || '#ab7df8'}20`} strokeWidth="3" />
                        <circle cx="22" cy="22" r="18.5" fill="none" stroke={match.scoreColor || '#ab7df8'} strokeWidth="3" strokeDasharray={2 * Math.PI * 18.5} strokeDashoffset={(2 * Math.PI * 18.5) * (1 - match.score / 100)} strokeLinecap="round" />
                      </svg>
                      <span className="text-[14px] font-black text-white" style={{ fontSize: 14, fontWeight: 900 }}>{match.score}</span>
                    </div>
                    <span className="text-[11.5px] font-bold mt-0.5 text-[#22c55e] tracking-tight truncate" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.scoreLabel}</span>
                  </div>

                  {/* Arrow */}
                  <div className="w-[4%] flex justify-end items-center" style={{ width: '4%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
                    <ChevronRight size={18} className="text-[#8b949e] group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profile && !loading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Left Column (span 2) */}
          <div className="lg:col-span-2 space-y-5">
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
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column (span 1) */}
          <div className="space-y-5">
            {/* AI Job Matches & Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles size={13} className="text-[#00a0dc]" />
                <p className="text-[12px] font-bold text-[#f0f0f3]">AI Job Matches</p>
              </div>
              <p className="text-[11.5px] text-[#71717a] px-1 leading-relaxed">
                Jobs matched to your profile using high-fidelity LinkedIn AI recommendations.
              </p>
              {profile.jobs.map((job, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <GlassCard className="!p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-xl flex-shrink-0">{job.logo}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-[13px] font-semibold text-[#f0f0f3]">{job.title}</p>
                            <p className="text-[11px] text-[#a1a1aa]">{job.company}</p>
                            <p className="text-[10.5px] text-[#71717a] mt-0.5">{job.location} · {job.type} · Posted {job.postedAgo}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${matchColor(job.match)} flex-shrink-0`}>{job.match}% match</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.03]">
                          <span className="text-[11px] text-emerald-400 font-semibold">{job.salary}</span>
                          <button
                            onClick={() => setSavedJobs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                            className={`text-[10px] px-2.5 py-0.5 rounded-lg border transition-all font-semibold ${savedJobs.includes(i) ? 'bg-[#0077b5]/15 border-[#0077b5]/30 text-[#00a0dc]' : 'border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa]'}`}>
                            {savedJobs.includes(i) ? '✓ Saved' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* OAuth Partner Integration Guide */}
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
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Utensils size={20} className="text-emerald-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>Nutritionix Food Tracker</h3>
                <StatusBadge status={hasNutritionixKey() ? 'live' : isDemo ? 'demo' : 'none'} />
              </div>
              <p style={{ fontSize: 12.5, color: '#8b949e', margin: '4px 0 0' }}>
                Type your meal in plain English — AI parses full nutritional data instantly.
              </p>
            </div>
          </div>
          <button onClick={() => setShowSetup(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              fontSize: 11, fontWeight: 600, color: '#8b949e', border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#8b949e'; }}
          >
            <Key size={11} /> {hasNutritionixKey() ? 'API Key Set' : 'Setup Keys'}
          </button>
        </div>

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
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Utensils size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6e7681' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="e.g. 2 eggs, toast and a glass of milk"
              className="input-premium w-full text-[13.5px] !pl-10"
            />
          </div>
          <motion.button
            onClick={handleAnalyze}
            disabled={!query.trim() || loading}
            whileHover={!loading && query.trim() ? { scale: 1.03, y: -1 } : {}}
            whileTap={!loading && query.trim() ? { scale: 0.97 } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderRadius: 12, 
              fontWeight: 700, fontSize: 13, color: '#ffffff', border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)', opacity: !query.trim() || loading ? 0.5 : 1
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Analyze
          </motion.button>
        </div>

        {/* Examples */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Try:</span>
          {['2 eggs and toast', 'chicken biryani', 'protein shake with banana', '1 cup oatmeal with berries'].map(ex => (
            <motion.button 
              key={ex} 
              onClick={() => setQuery(ex)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                fontSize: 11.5, padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
                background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)',
                color: '#6ee7b7', fontWeight: 600, transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'; e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.15)'; e.currentTarget.style.background = 'rgba(16,185,129,0.06)'; }}
            >
              {ex}
            </motion.button>
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Left Column (span 2) */}
            <div className="lg:col-span-2 space-y-5">
              {isDemo && (
                <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} /> Demo mode — add Nutritionix keys above for real results
                </div>
              )}

              {/* Total nutrition */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Utensils size={15} className="text-emerald-400" />
                    <h3 className="text-[13.5px] font-bold text-white tracking-wide">Nutrition Breakdown</h3>
                  </div>
                  {/* Health Score Circular Gauge */}
                  {(() => {
                    const score = result.healthScore;
                    const strokeColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                    const glowColor = score >= 70 ? 'rgba(16, 185, 129, 0.4)' : score >= 50 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    const radius = 20;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (score / 100) * circumference;
                    return (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-[#8b949e]">Health Score</span>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r={radius} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="3.5" />
                            <motion.circle cx="25" cy="25" r={radius} fill="transparent" stroke={strokeColor} strokeWidth="3.5"
                              strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }}
                              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} strokeLinecap="round"
                              style={{ filter: `drop-shadow(0 0 5px ${strokeColor})` }}
                            />
                          </svg>
                          <span className="absolute text-[14px] font-black" style={{ color: strokeColor, textShadow: `0 0 8px ${glowColor}` }}>
                            {score}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Calorie hero + Macro cards row */}
                <div className="grid grid-cols-4 gap-3.5 mb-5">
                  {[
                    { label: 'Calories', value: result.total.calories, unit: 'kcal', color: '#f59e0b', icon: Zap },
                    { label: 'Protein', value: result.total.protein, unit: 'g', color: '#6366f1', icon: Activity },
                    { label: 'Carbs', value: result.total.carbs, unit: 'g', color: '#f97316', icon: Activity },
                    { label: 'Fat', value: result.total.fat, unit: 'g', color: '#ec4899', icon: Activity },
                  ].map(m => (
                    <motion.div
                      key={m.label}
                      whileHover={{ y: -3, scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.12)' }}
                      className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex flex-col items-center justify-center transition-all duration-300"
                    >
                      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${m.color}00, ${m.color}40, ${m.color}00)` }} />
                      <p className="text-[24px] font-black text-white tracking-tight leading-none mb-0.5">{m.value}</p>
                      <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">{m.unit} {m.label}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-3.5">
                  <MacroBar label="Protein"       value={result.total.protein} color="#6366f1" max={60}  />
                  <MacroBar label="Carbohydrates" value={result.total.carbs}   color="#f59e0b" max={100} />
                  <MacroBar label="Fat"           value={result.total.fat}     color="#ec4899" max={60}  />
                  <MacroBar label="Fiber"         value={result.total.fiber}   color="#10b981" max={25}  />
                  <MacroBar label="Sodium"        value={result.total.sodium}  color="#ef4444" max={2300} unit="mg" />
                </div>
              </GlassCard>

              {/* Food items */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-4">
                  <Utensils size={15} className="text-emerald-400" />
                  <h3 className="text-[13.5px] font-bold text-white tracking-wide">Identified Foods</h3>
                  <span className="ml-auto text-[11px] text-[#8b949e] font-medium">{result.items.length} items</span>
                </div>
                <div className="space-y-3">
                  {result.items.map((item, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ y: -1, borderColor: 'rgba(255, 255, 255, 0.1)' }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.05] transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center text-base overflow-hidden flex-shrink-0">
                          {item.thumb ? <img src={item.thumb} alt="" className="w-full h-full object-cover rounded-xl" /> : '🥘'}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-200 capitalize group-hover:text-white transition-colors">{item.name}</p>
                          <p className="text-[11px] text-[#8b949e] mt-0.5">{item.qty}</p>
                        </div>
                      </div>
                      <div className="flex gap-5 text-right">
                        <div>
                          <p className="text-[13px] font-black text-white">{item.calories}</p>
                          <p className="text-[9px] text-[#8b949e] font-medium uppercase tracking-wider">kcal</p>
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-indigo-400">{item.protein}g</p>
                          <p className="text-[9px] text-[#8b949e] font-medium uppercase tracking-wider">protein</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Right Column (span 1) */}
            <div className="space-y-5">
              {/* AI Nutrition & Health Recommendations */}
              <GlassCard className="relative overflow-hidden border border-emerald-500/20 bg-emerald-500/[0.01]">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={14} className="text-emerald-400 animate-pulse" />
                  <h4 className="text-[13.5px] font-bold text-white tracking-wide">AI Wellness Advice</h4>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const score = result.healthScore;
                    let recommendations = [];
                    if (score >= 75) {
                      recommendations = [
                        "Excellent meal composition! Highly nutrient-dense with a strong macro profile.",
                        "High fiber and protein content will keep your glycemic response stable.",
                        "Great choice for building high-quality lean mass and supporting cellular recovery."
                      ];
                    } else if (score >= 50) {
                      recommendations = [
                        "Balanced nutritional profile, but there is some room for enhancement.",
                        "Consider adding a handful of greens or berries to boost micronutrients and antioxidants.",
                        "Hydrate well to support digestion of this meal's nutrient profile."
                      ];
                    } else {
                      recommendations = [
                        "This meal is relatively high in sodium, fats, or refined carbs and lower in fiber/protein.",
                        "Pair with a lean protein source or a side salad to improve your glycemic response.",
                        "Make sure to balance your next meal with high-fiber greens and lean clean proteins."
                      ];
                    }
                    return recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-slate-300 leading-relaxed font-medium">
                        <ChevronRight size={13} className="mt-1 text-emerald-400 flex-shrink-0" />
                        <span>{r}</span>
                      </div>
                    ));
                  })()}
                </div>
              </GlassCard>

              {/* Digital Twin Sync actions card */}
              <GlassCard className="border border-indigo-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <Cable size={14} className="text-indigo-400" />
                  <h4 className="text-[13.5px] font-bold text-white tracking-wide">Digital Twin Sync</h4>
                </div>
                <p className="text-[12px] text-[#8b949e] leading-relaxed mb-4">
                  Log this meal's nutritional load into your real-time Health profile to dynamically sync with your physiological digital twin.
                </p>
                <motion.button
                  onClick={handleLogToHealth}
                  disabled={logged}
                  whileHover={!logged ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!logged ? { scale: 0.98 } : {}}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-[13px] transition-all disabled:cursor-default cursor-pointer"
                  style={{ 
                    background: logged ? 'rgba(16,185,129,0.08)' : 'linear-gradient(135deg, #10b981, #059669)', 
                    border: logged ? '1px solid rgba(16,185,129,0.25)' : 'none', 
                    color: logged ? '#10b981' : 'white',
                    boxShadow: logged ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {logged ? <><CheckCircle size={14} /> Logged to Health Profile</> : <><Plus size={14} /> Log {result.total.calories} cal to Twin</>}
                </motion.button>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── FITBIT PANEL (real OAuth) ─────────────────────────────────────────────────

const BACKEND = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

function FitbitPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Left Column (span 2) */}
      <div className="lg:col-span-2 space-y-5">
        {/* ── 4 Metric Cards ── */}
        <div 
          className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl overflow-hidden shadow-lg gap-px bg-white/[0.06]"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(16px)',
            width: '100%',
            minWidth: 0
          }}
        >
          {[
            { label:'Steps',      value:'8,642',  suffix:'',     Icon:Footprints, bg:'#10b98120', iconCls:'text-emerald-400', trend:'+12.4%', up:true  },
            { label:'Sleep',      value:'7h 32m', suffix:'',     Icon:Moon,       bg:'#6366f120', iconCls:'text-indigo-400',  trend:'+8.1%',  up:true  },
            { label:'Heart Rate', value:'72',     suffix:'bpm',  Icon:Heart,      bg:'#ef444420', iconCls:'text-rose-400',    trend:'-3.2%',  up:false },
            { label:'Calories',   value:'2,184',  suffix:'kcal', Icon:Zap,        bg:'#f59e0b20', iconCls:'text-amber-400',   trend:'+6.7%',  up:true  },
          ].map((m, idx) => (
            <div
              key={m.label}
              className="group hover:bg-[#162035]/90 transition-colors duration-300"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '24px 24px',
                backgroundColor: 'rgba(13, 20, 35, 0.85)',
                minWidth: 0
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: m.bg }}
              >
                <m.Icon size={19} className={m.iconCls} />
              </div>
              <div className="min-w-0 flex flex-col gap-1" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <p className="text-[11.5px] text-[#8b949e]" style={{ margin: 0, fontSize: 11.5, fontWeight: 500 }}>{m.label}</p>
                <div className="flex items-baseline gap-1.5" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="text-[22px] font-black text-white leading-none" style={{ fontSize: 22 }}>{m.value}</span>
                  {m.suffix && <span className="text-[11.5px] text-[#8b949e] font-normal" style={{ fontSize: 11.5 }}>{m.suffix}</span>}
                </div>
                <p className={`text-[12px] font-bold ${m.up ? 'text-[#10b981]' : 'text-[#f43f5e]'}`} style={{ margin: 0, fontSize: 12 }}>
                  {m.up ? '▲' : '▼'} {m.trend.replace('+','').replace('-','')} <span className="text-[#8b949e] font-normal">vs last 7 days</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── All Activities Table ── */}
        <div className="glass-card overflow-hidden flex flex-col flex-1">
          {/* Toolbar */}
          <div 
            className="flex items-center justify-between border-b border-white/[0.06]"
            style={{ paddingBottom: '16px' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#f0f0f3]">All Activities</span>
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '20px',
                  minWidth: '22px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#8b949e',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                10
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  color: '#8b949e',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#c9d1d9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#8b949e';
                }}
              >
                <Calendar size={13.5} className="text-[#8b949e]" />
                <span>May 23 - May 29, 2025</span>
                <ChevronDown size={13.5} />
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  color: '#8b949e',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#c9d1d9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#8b949e';
                }}
              >
                <Filter size={13.5} className="text-[#8b949e]" />
                <span>Filter</span>
                <ChevronDown size={13.5} />
              </button>
            </div>
          </div>

          {/* Column header row */}
          <div
            className="grid border-b border-white/[0.06] text-[11px] font-bold text-[#8b949e] uppercase tracking-wider"
            style={{ 
              gridTemplateColumns: '150px 1fr 110px 120px 120px 40px',
              paddingTop: '14px',
              paddingBottom: '14px',
              alignItems: 'center'
            }}
          >
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#c9d1d9]">Date &amp; Time <ChevronDown size={11}/></div>
            <div className="flex items-center">Activity</div>
            <div className="flex items-center">Type</div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#c9d1d9]">Value <ChevronDown size={11}/></div>
            <div className="flex items-center">Source</div>
            <div/>
          </div>

          {/* Data rows */}
          <div className="flex-1 flex flex-col divide-y divide-white/[0.06]">
          {[
            { date:'May 29, 2025', time:'10:42 AM', act:'Walk',            sub:'Outdoor',          type:'Steps',    pill:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', val:'6,213 steps', Icon:Footprints, ib:'bg-emerald-500/10', ic:'text-emerald-400' },
            { date:'May 29, 2025', time:'09:15 AM', act:'Sleep',           sub:'7h 32m',           type:'Sleep',    pill:'bg-indigo-500/10  text-indigo-400  border-indigo-500/20',  val:'7h 32m',      Icon:Moon,       ib:'bg-indigo-500/10',  ic:'text-indigo-400'  },
            { date:'May 28, 2025', time:'08:22 PM', act:'Heart Rate',      sub:'Resting',          type:'Heart',    pill:'bg-rose-500/10    text-rose-400    border-rose-500/20',    val:'72 bpm',      Icon:Heart,      ib:'bg-rose-500/10',    ic:'text-rose-400'    },
            { date:'May 28, 2025', time:'06:45 PM', act:'Calories Burned', sub:'Active',           type:'Calories', pill:'bg-amber-500/10   text-amber-400   border-amber-500/20',   val:'512 kcal',    Icon:Zap,        ib:'bg-amber-500/10',   ic:'text-amber-400'   },
            { date:'May 28, 2025', time:'04:30 PM', act:'Run',             sub:'Outdoor · 5.2 km', type:'Activity', pill:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', val:'5.2 km',      Icon:Footprints, ib:'bg-emerald-500/10', ic:'text-emerald-400' },
          ].map((row, i) => (
            <div
              key={i}
              className="grid hover:bg-white/[0.015] transition-colors group"
              style={{ 
                gridTemplateColumns: '150px 1fr 110px 120px 120px 40px', 
                minHeight: '56px',
                paddingTop: '14px',
                paddingBottom: '14px',
                alignItems: 'center'
              }}
            >
              <div>
                <p className="text-[13px] text-[#f0f0f3] font-medium">{row.date}</p>
                <p className="text-[11px] text-[#8b949e] mt-0.5">{row.time}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${row.ib} flex items-center justify-center flex-shrink-0`}>
                  <row.Icon size={15} className={row.ic} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#f0f0f3]">{row.act}</p>
                  <p className="text-[11px] text-[#8b949e]">{row.sub}</p>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${row.pill}`}>
                  {row.type}
                </span>
              </div>
              <div className="text-[13px] text-[#f0f0f3] font-medium">{row.val}</div>
              <div className="flex items-center gap-2 text-[13px] text-[#f0f0f3]">
                <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="8"  r="3.5" fill="#00b0b9"/>
                  <circle cx="20" cy="20" r="4.5" fill="#00b0b9"/>
                  <circle cx="20" cy="32" r="3.5" fill="#00b0b9"/>
                  <circle cx="9"  cy="14" r="3"   fill="#00b0b9" opacity="0.6"/>
                  <circle cx="9"  cy="26" r="3"   fill="#00b0b9" opacity="0.6"/>
                  <circle cx="31" cy="14" r="3"   fill="#00b0b9" opacity="0.6"/>
                  <circle cx="31" cy="26" r="3"   fill="#00b0b9" opacity="0.6"/>
                </svg>
                Fitbit
              </div>
              <button className="flex justify-center text-[#8b949e] hover:text-[#f0f0f3] opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical size={15} />
              </button>
            </div>
          ))}
          </div>

          {/* Pagination footer */}
          <div 
            className="flex items-center justify-between border-t border-white/[0.06]"
            style={{ paddingTop: '16px' }}
          >
            <p className="text-[12px] text-[#8b949e]">Showing 1 to 5 of 10 activities</p>
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[#8b949e] hover:text-[#f0f0f3] transition-colors">
                <ChevronLeft size={14}/>
              </button>
              <button className="w-8 h-8 rounded-lg bg-[#388bfd] text-white flex items-center justify-center text-[12px] font-bold shadow-md shadow-blue-500/25">1</button>
              <button className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[#8b949e] hover:text-[#f0f0f3] transition-colors text-[12px]">2</button>
              <button className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[#8b949e] hover:text-[#f0f0f3] transition-colors">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (span 1) */}
      <div className="space-y-5">
        {/* Connection Status & Sync Guide Card */}
        <GlassCard className="border border-[#00b0b9]/15 bg-[#00b0b9]/[0.02] !p-6">
          <div className="flex items-center gap-3 mb-4">
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(0, 176, 185, 0.15)',
              border: '1px solid rgba(0, 176, 185, 0.3)',
              display: 'flex', alignItems: 'center', justifyCent: 'center', flexShrink: 0
            }} className="flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="8"  r="3.5" fill="#00b0b9"/>
                <circle cx="20" cy="20" r="4.5" fill="#00b0b9"/>
                <circle cx="20" cy="32" r="3.5" fill="#00b0b9"/>
                <circle cx="9"  cy="14" r="3"   fill="#00b0b9" opacity="0.6"/>
                <circle cx="9"  cy="26" r="3"   fill="#00b0b9" opacity="0.6"/>
                <circle cx="31" cy="14" r="3"   fill="#00b0b9" opacity="0.6"/>
                <circle cx="31" cy="26" r="3"   fill="#00b0b9" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <h4 className="text-[13.5px] font-bold text-white tracking-wide">Fitbit Health Sync</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[10px] text-[#10b981] font-semibold">Live Sync Active</span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-[#8b949e] leading-relaxed mb-4">
            Authorize BeyondSelf to fetch steps, sleep duration, active calories, and heart rate directly from your Fitbit cloud via secure OAuth 2.0 protocols.
          </p>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 18px', borderRadius: 12, 
              fontWeight: 750, fontSize: 13, color: '#00b0b9', border: '1px solid rgba(0,176,185,0.3)',
              background: 'rgba(0, 176, 185, 0.08)', cursor: 'pointer', transition: 'all 0.2s', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,176,185,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,176,185,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 176, 185, 0.08)'; e.currentTarget.style.borderColor = 'rgba(0,176,185,0.3)'; }}
          >
            Reconnect Cloud Sync <ExternalLink size={13} />
          </button>
        </GlassCard>

        {/* AI Wellness Recommendations */}
        <GlassCard className="relative overflow-hidden border border-indigo-500/15 bg-indigo-500/[0.01] !p-6">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-indigo-400 animate-pulse" />
            <h4 className="text-[13.5px] font-bold text-white tracking-wide">AI Wellness Advice</h4>
          </div>
          <div className="space-y-3.5">
            {[
              "Sleep Quality: 7h 32m achieved. Excellent consistency. Maintaining this window reduces cumulative sleep debt and optimizes cognitive function.",
              "Daily Steps: 8,642 steps. You are 86% toward your 10k target. A brisk 12-minute walk will trigger physical twin sync baseline.",
              "Cardiovascular: Resting HR is 72 bpm. Stable baseline. Your recovery kinetics after activity indicate strong aerobic endurance.",
              "Caloric Output: Active burn of 2,184 kcal aligns perfectly with your metabolic digital twin prediction."
            ].map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-slate-300 leading-relaxed font-medium">
                <ChevronRight size={13} className="mt-1 text-indigo-400 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ── INDIA BANKING PANEL ──────────────────────────────────────────────────────


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

  // ── RBI Account Aggregator Simulated Flow States ──
  const [showAaModal, setShowAaModal] = useState(false);
  const [selectedAaProvider, setSelectedAaProvider] = useState(null);
  const [aaStep, setAaStep] = useState('phone'); // phone | otp | discover | success
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState(['hdfc', 'icici']);
  const [aaProviderConnected, setAaProviderConnected] = useState(null);

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
    setSelectedAaProvider(p);
    setPhoneNumber('');
    setOtpValue(['', '', '', '', '', '']);
    setAaStep('phone');
    setShowAaModal(true);
  }

  function handleSyncFinance() {
    updateDomain('finance', { ...finance, monthlyIncome: totalIncome, monthlyExpenses: totalSpend });
    setSynced(true);
  }

  function handleReset() {
    setPhase('landing'); setStmtData(null); setError(null); setSynced(false); setActiveView('transactions');
    setAaProviderConnected(null);
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processStatement(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── HEADER CARD ── */}
      <GlassCard className="!p-5">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Landmark size={18} style={{ color: '#34d399' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>India Banking Intelligence</h3>
                <StatusBadge status={isResults ? 'live' : isDemo ? 'demo' : 'none'} />
                {aaProviderConnected && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontWeight: 600,
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    color: '#818cf8'
                  }}>
                    Connected via {aaProviderConnected}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: '#8b949e', margin: 0 }}>
                Consent-based secure open banking powered by India's RBI-regulated Account Aggregator (AA) framework.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {phase === 'landing' ? (
              <>
                <button
                  onClick={() => handleProviderClick(AA_PROVIDERS[0])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 10, 
                    fontWeight: 600, fontSize: 13, color: '#34d399', border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16, 185, 129, 0.12)', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                >
                  Connect Banking <ExternalLink size={13} />
                </button>
                <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                  <ShieldCheck size={12} /> Secure OAuth 2.0
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#34d399] font-bold text-[12px] select-none">
                <CheckCircle size={13} className="text-emerald-400" /> Secure AA Tunnel Active
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Landing Phase ── */}
      {phase === 'landing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 3-column provider cards */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '20px' }}>
            {AA_PROVIDERS.map(p => (
              <button key={p.id} onClick={() => handleProviderClick(p)}
                className="text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all group flex flex-col overflow-hidden shadow-lg hover:shadow-indigo-500/[0.02]"
                style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Color accent top bar */}
                <div style={{ height: 3, background: p.color, opacity: 0.7, width: '100%' }} />
                <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Logo icon + badge row */}
                  <div className="flex items-start justify-between mb-3.5">
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: p.color + '1a',
                      border: `1px solid ${p.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Landmark size={18} style={{ color: p.color }} />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0"
                      style={{ color: p.id === 'setu' ? '#34d399' : p.color, borderColor: (p.id === 'setu' ? '#10b981' : p.color) + '50', background: (p.id === 'setu' ? '#10b981' : p.color) + '18' }}>
                      {p.badge}
                    </span>
                  </div>
                  {/* Name */}
                  <span className="text-[15px] font-bold text-[#f0f0f3] mb-1">{p.name}</span>
                  {/* Subtitle */}
                  <p className="text-[12px] font-semibold mb-3.5" style={{ color: p.color }}>{p.subtitle}</p>
                  {/* Description */}
                  <p className="text-[12px] text-[#71717a] leading-relaxed flex-1 mb-4.5">{p.desc}</p>
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
                      <Landmark size={13} />{p.banks}+ banks
                    </span>
                    <span className="text-[12px] font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: p.color }}>
                      Connect →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Premium Dropzone File Uploader */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="group relative overflow-hidden text-center cursor-pointer border border-dashed hover:border-solid hover:bg-white/[0.03] transition-all duration-300 shadow-xl"
            style={{
              borderColor: dragOver ? '#a78bfa' : 'rgba(255, 255, 255, 0.08)',
              backgroundColor: dragOver ? 'rgba(139, 92, 246, 0.05)' : 'rgba(13, 20, 35, 0.45)',
              borderRadius: '24px',
              padding: '36px 24px',
              backdropFilter: 'blur(16px)'
            }}
          >
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
            
            {/* SVG Glowing Document Icon */}
            <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-[22px] mx-auto mb-4 group-hover:scale-110 group-hover:border-purple-500/40 transition-transform duration-300 flex-shrink-0">
              📂
            </div>
            
            <h3 className="text-[15px] font-bold text-white mb-1.5">Upload your bank statement PDF</h3>
            <p className="text-[12px] text-[#8b949e] max-w-sm mx-auto leading-relaxed mb-4">
              Drag & drop your statement here, or <span className="text-[#a5b4fc] font-semibold underline group-hover:text-[#c7d2fe]">browse files</span>. AI will parse & categorise all transactions instantly.
            </p>
            
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05] text-[10px] text-[#6b7280] font-medium tracking-wide uppercase">
              Supports HDFC, ICICI, SBI & more · Max 25MB
            </span>

            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => e.target.files[0] && processStatement(e.target.files[0])} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 pt-2 pb-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[12px] text-[#6b7280]">or view demo database</span>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Left Column (span 2) */}
          <div className="lg:col-span-2 space-y-5">
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
            <div className="grid grid-cols-3 gap-3.5">
              <GlassCard>
                <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-semibold">Total Income</p>
                <p className="text-[22px] font-black text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-[#6b7280]">this month</p>
              </GlassCard>
              <GlassCard>
                <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-semibold">Total Spent</p>
                <p className="text-[22px] font-black text-[#f97316]">₹{totalSpend.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-[#6b7280]">this month</p>
              </GlassCard>
              <GlassCard>
                <p className="text-[10px] text-[#71717a] mb-1.5 uppercase tracking-wider font-semibold">Savings Rate</p>
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

                        // Custom brand colors for circular badges
                        let badgeBg = 'rgba(255,255,255,0.03)';
                        let badgeBorder = 'rgba(255,255,255,0.06)';
                        let badgeColor = '#ffffff';
                        
                        if (t.name.includes('Salary') || t.name.includes('Infosys')) {
                          badgeBg = 'rgba(16,185,129,0.1)';
                          badgeBorder = 'rgba(16,185,129,0.2)';
                          badgeColor = '#10b981';
                        } else if (t.name.includes('HDFC')) {
                          badgeBg = 'rgba(239,68,68,0.1)';
                          badgeBorder = 'rgba(239,68,68,0.2)';
                          badgeColor = '#ef4444';
                        } else if (t.name.includes('Axis') || t.name.includes('SIP')) {
                          badgeBg = 'rgba(99,102,241,0.1)';
                          badgeBorder = 'rgba(99,102,241,0.2)';
                          badgeColor = '#818cf8';
                        } else if (t.name.includes('Swiggy')) {
                          badgeBg = 'rgba(245,158,11,0.1)';
                          badgeBorder = 'rgba(245,158,11,0.2)';
                          badgeColor = '#f59e0b';
                        } else if (t.name.includes('Zepto') || t.name.includes('Blinkit')) {
                          badgeBg = 'rgba(139,92,246,0.1)';
                          badgeBorder = 'rgba(139,92,246,0.2)';
                          badgeColor = '#a78bfa';
                        } else if (t.name.includes('Uber')) {
                          badgeBg = 'rgba(15,23,42,0.8)';
                          badgeBorder = 'rgba(255,255,255,0.1)';
                          badgeColor = '#ffffff';
                        } else if (t.name.includes('Amazon')) {
                          badgeBg = 'rgba(249,115,22,0.1)';
                          badgeBorder = 'rgba(249,115,22,0.2)';
                          badgeColor = '#f97316';
                        } else if (positive) {
                          badgeBg = 'rgba(16,185,129,0.08)';
                          badgeBorder = 'rgba(16,185,129,0.15)';
                          badgeColor = '#10b981';
                        }

                        return (
                          <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300 group">
                            <div 
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base transition-transform duration-300 group-hover:scale-105"
                              style={{ 
                                backgroundColor: badgeBg, 
                                border: `1px solid ${badgeBorder}`,
                                color: badgeColor
                              }}
                            >
                              {t.icon ?? (positive ? '💰' : '💸')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-[#f0f0f3] truncate group-hover:text-white transition-colors">{t.name ?? t.description}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] text-[#71717a] font-medium">{t.date}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#6b7280] font-mono">{t.mode ?? 'UPI'}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[#71717a]">{t.cat ?? t.category}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`text-[13.5px] font-black ${positive ? 'text-emerald-400' : 'text-white'}`}>
                                {positive ? '+' : '-'}₹{Math.abs(amt).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9px] text-[#6b7280] font-medium uppercase tracking-wider">INR</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* CATEGORIES */}
                {activeView === 'categories' && (
                  <GlassCard>
                    <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-5">Spend by Category</h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 py-2">
                      {/* SVG Donut Chart on the Left */}
                      <div className="relative w-[150px] h-[150px] flex-shrink-0">
                        <svg width="100%" height="100%" viewBox="0 0 100 100">
                          {/* Empty background circle */}
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                          {(() => {
                            let accumulatedPercent = 0;
                            const radius = 38;
                            const circumference = 2 * Math.PI * radius; // 238.76
                            return cats.map((c, idx) => {
                              const strokeDashoffset = circumference - (circumference * c.pct) / 100;
                              const rotation = (accumulatedPercent * 360) / 100;
                              accumulatedPercent += c.pct;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="transparent"
                                  stroke={c.color}
                                  strokeWidth="8"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  transform={`rotate(${rotation - 90} 50 50)`}
                                  style={{
                                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transformOrigin: '50% 50%'
                                  }}
                                />
                              );
                            });
                          })()}
                        </svg>
                        {/* Text in the center of the Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-[9px] text-[#71717a] uppercase tracking-wider font-semibold">Total Spent</span>
                          <span className="text-[17px] font-black text-white mt-0.5">₹{totalSpend.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Category list on the Right */}
                      <div className="flex-1 w-full space-y-3">
                        {cats.map(c => (
                          <div key={c.label}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[12px] text-[#a1a1aa] flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color, display: 'inline-block' }} />
                                {c.label}
                              </span>
                              <span className="text-[12px] font-semibold text-white">₹{c.amount.toLocaleString('en-IN')} <span className="text-[#71717a] font-normal">({c.pct}%)</span></span>
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
                    </div>
                    
                    <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex justify-between items-center">
                      <span className="text-[12px] text-[#71717a] font-medium">Reporting Cycle (May 2025)</span>
                      <span className="text-[13px] font-black text-[#34d399]">₹{totalSpend.toLocaleString('en-IN')} Total Debit Flow</span>
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column (span 1) */}
          <div className="space-y-5">
            {/* AI Financial Recommendations & UPI/AA insights */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles size={13} className="text-emerald-400" />
                <p className="text-[12px] font-bold text-[#f0f0f3]">AI Financial Insights & UPI / AA Metrics</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'UPI Transactions', value: isResults ? txns.filter(t => t.mode === 'UPI').length : 9, unit: 'this month', color: '#8b5cf6', isNum: true },
                  { label: 'UPI Spend Total',  value: isResults ? txns.filter(t => t.mode === 'UPI' && t.debit).reduce((a, t) => a + t.debit, 0) : 5200, unit: 'via UPI', color: '#6366f1', prefix: '₹' },
                  { label: 'NACH / SI Debits', value: isResults ? txns.filter(t => ['NACH','SI'].includes(t.mode) && t.debit).reduce((a,t)=>a+t.debit,0) : 9200, unit: 'auto-debits', color: '#f59e0b', prefix: '₹' },
                  { label: 'NEFT / IMPS',      value: isResults ? txns.filter(t => ['NEFT','IMPS'].includes(t.mode) && t.debit).reduce((a,t)=>a+t.debit,0) : 18000, unit: 'wire transfers', color: '#10b981', prefix: '₹' },
                ].map(m => (
                  <GlassCard key={m.label} className="!p-4">
                    <p className="text-[9.5px] text-[#71717a] mb-1 font-semibold uppercase tracking-wider">{m.label}</p>
                    <p className="text-[18px] font-black" style={{ color: m.color }}>
                      {m.prefix}{(m.isNum ? m.value : m.value).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-[#6b7280]">{m.unit}</p>
                  </GlassCard>
                ))}
              </div>

              {/* AA Framework card */}
              <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02] !p-6">
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
                <div className="mt-3.5 pt-3.5 border-t border-white/[0.05] flex flex-wrap gap-2">
                  {AA_PROVIDERS.map(p => (
                    <span key={p.id} className="text-[9.5px] px-2.5 py-0.5 rounded-lg border font-semibold"
                      style={{ color: p.color, borderColor: p.color + '30', background: p.color + '10' }}>
                      {p.name} · {p.banks}+ banks
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Digital Twin Financial Sync actions card */}
            <GlassCard className="border border-emerald-500/15 bg-emerald-500/[0.01] !p-6">
              <div className="flex items-center gap-2 mb-4">
                <Landmark size={14} className="text-emerald-400" />
                <h4 className="text-[13.5px] font-bold text-white tracking-wide">Financial Twin Sync</h4>
              </div>
              <p className="text-[12.5px] text-[#8b949e] leading-relaxed mb-4">
                Sync aggregated asset balances, savings rate ({savingsRate}%), and monthly cashflows to update your financial digital twin.
              </p>
              <div className="flex flex-col gap-2">
                <motion.button
                  onClick={handleSyncFinance}
                  disabled={synced}
                  whileHover={!synced ? { scale: 1.02, y: -1 } : {}}
                  whileTap={!synced ? { scale: 0.98 } : {}}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] transition-all disabled:cursor-default cursor-pointer"
                  style={{ 
                    background: synced ? 'rgba(16,185,129,0.08)' : 'linear-gradient(135deg, #10b981, #059669)', 
                    border: synced ? '1px solid rgba(16,185,129,0.25)' : 'none', 
                    color: synced ? '#10b981' : 'white',
                    boxShadow: synced ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {synced ? <><CheckCircle size={14} /> Synced to Finance Dashboard</> : <><Plus size={14} /> Sync ₹{(totalIncome - totalSpend).toLocaleString('en-IN')} Surplus to Twin</>}
                </motion.button>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-xl border border-white/[0.06] text-[#71717a] hover:text-[#a1a1aa] hover:border-white/[0.12] transition-all bg-white/[0.02] text-[12px] font-semibold cursor-pointer"
                >
                  Reset Banking Interface
                </button>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* ── RBI ACCOUNT AGGREGATOR CONSENT FLOW MODAL ── */}
      <AnimatePresence>
        {showAaModal && selectedAaProvider && (
          <div className="fixed inset-0 z-50 bg-[#060814]/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="w-full max-w-md bg-[#0d1423] border border-white/[0.08] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col gap-5 p-6"
            >
              {/* Top Accent Color Bar */}
              <div style={{ height: 4, background: selectedAaProvider.color, width: '100%', position: 'absolute', top: 0, left: 0 }} />

              {/* Close Button */}
              <button 
                onClick={() => setShowAaModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-[#8b949e] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>

              {/* Header block */}
              <div className="flex items-center gap-3.5 pr-8">
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: selectedAaProvider.color + '1a',
                  border: `1px solid ${selectedAaProvider.color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Landmark size={18} style={{ color: selectedAaProvider.color }} />
                </div>
                <div>
                  <h4 className="text-[14.5px] font-black text-white">{selectedAaProvider.name}</h4>
                  <p className="text-[11px] text-[#8b949e] flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={11} className="text-[#34d399]" /> RBI Licensed Consent Manager
                  </p>
                </div>
              </div>

              {/* Step 1: Phone Verification */}
              {aaStep === 'phone' && (
                <div className="flex flex-col gap-4 pt-1">
                  <div>
                    <h5 className="text-[15px] font-bold text-white mb-1.5">Link your Bank Accounts</h5>
                    <p className="text-[12px] text-[#8b949e] leading-relaxed">
                      Enter the mobile number linked with your bank accounts to securely fetch your transactions via the RBI Account Aggregator framework.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-[#05080f]/60 border border-white/[0.08] rounded-xl px-3.5 py-3 focus-within:border-indigo-500 focus-within:shadow-[0_0_12px_rgba(99,102,241,0.18)] transition-all">
                    <span className="text-[13px] font-bold text-[#8b949e] font-mono">🇮🇳 +91</span>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-transparent border-none outline-none text-[13.5px] font-semibold text-white tracking-wider"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input type="checkbox" defaultChecked className="mt-1 accent-indigo-500 rounded" />
                    <span className="text-[11px] text-[#71717a] leading-relaxed">
                      I authorize {selectedAaProvider.name} to send OTP and fetch my bank accounts to sync with BeyondSelf.
                    </span>
                  </label>

                  <button
                    disabled={phoneNumber.length !== 10}
                    onClick={() => setAaStep('otp')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/15"
                  >
                    Send Secure OTP <Sparkles size={13} />
                  </button>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {aaStep === 'otp' && (
                <div className="flex flex-col gap-4 pt-1">
                  <div>
                    <h5 className="text-[15px] font-bold text-white mb-1.5">Verify Mobile Number</h5>
                    <p className="text-[12px] text-[#8b949e] leading-relaxed">
                      Enter the 6-digit OTP sent via secure SMS to <strong className="text-white font-mono">+91 {phoneNumber}</strong>.
                    </p>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpValue.join('')}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      const newOtp = ['', '', '', '', '', ''];
                      for (let i = 0; i < val.length; i++) newOtp[i] = val[i];
                      setOtpValue(newOtp);
                    }}
                    style={{
                      width: '180px',
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(5, 8, 15, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      outline: 'none',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      margin: '0 auto',
                      display: 'block'
                    }}
                    className="focus:border-indigo-500 focus:shadow-[0_0_12px_rgba(99,102,241,0.25)] transition-all font-mono"
                  />

                  <div className="flex justify-between items-center text-[11.5px] text-[#71717a] pt-1.5">
                    <span>Didn't receive code?</span>
                    <button className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Resend OTP in 42s</button>
                  </div>

                  <button
                    disabled={otpValue.filter(Boolean).length !== 6}
                    onClick={() => {
                      setAaStep('discover');
                      setIsDiscovering(true);
                      setTimeout(() => {
                        setIsDiscovering(false);
                      }, 1800);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/15"
                  >
                    Confirm & Discover Accounts
                  </button>
                </div>
              )}

              {/* Step 3: Discover & Link Accounts */}
              {aaStep === 'discover' && (
                <div className="flex flex-col gap-4 pt-1">
                  {isDiscovering ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                      {/* Animating Bank circles */}
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-indigo-500/10 border-t-indigo-400 animate-spin" />
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl animate-pulse">
                          🔍
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[14.5px] font-bold text-white mb-1">Discovering Bank Accounts…</h5>
                        <p className="text-[11.5px] text-[#8b949e]">Securely querying RBI Financial Information Providers (FIPs)</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h5 className="text-[15px] font-bold text-white mb-1.5">Accounts Discovered</h5>
                        <p className="text-[12px] text-[#8b949e] leading-relaxed">
                          We found the following RBI-registered accounts linked with your phone number. Select the ones you want to link:
                        </p>
                      </div>

                      <div className="space-y-2">
                        {[
                          { id: 'hdfc', name: 'HDFC Bank Savings *9924', icon: '🏦', balance: '₹1,42,850' },
                          { id: 'icici', name: 'ICICI Bank Savings *8812', icon: '🏦', balance: '₹41,200' },
                          { id: 'sbi', name: 'SBI Savings Account *4451', icon: '🏦', balance: '₹8,450' }
                        ].map(acc => {
                          const isSel = selectedAccounts.includes(acc.id);
                          return (
                            <label 
                              key={acc.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                isSel 
                                  ? 'bg-indigo-600/10 border-indigo-500/30' 
                                  : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={isSel} 
                                  onChange={() => {
                                    if (isSel) {
                                      setSelectedAccounts(selectedAccounts.filter(x => x !== acc.id));
                                    } else {
                                      setSelectedAccounts([...selectedAccounts, acc.id]);
                                    }
                                  }}
                                  className="accent-indigo-500 rounded"
                                />
                                <span className="text-lg leading-none">{acc.icon}</span>
                                <div>
                                  <p className="text-[12.5px] font-semibold text-white">{acc.name}</p>
                                  <p className="text-[10px] text-[#8b949e] mt-0.5">Balance: {acc.balance}</p>
                                </div>
                              </div>
                              <span className="text-[9.5px] font-bold px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] text-[#8b949e] rounded-md font-mono">FIP</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="bg-[#05080f]/40 border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1.5 text-[11px] text-[#71717a]">
                        <p className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                          🛡️ Secure Consent Summary
                        </p>
                        <p>· Frequency: Daily updates · Duration: 1 Year (revocable anytime)</p>
                        <p>· Purpose: Automated Financial Intelligence Twin Sync</p>
                      </div>

                      <button
                        disabled={selectedAccounts.length === 0}
                        onClick={() => setAaStep('success')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-emerald-500/15"
                      >
                        Approve secure Consent ({selectedAccounts.length} Linked) <ShieldCheck size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Consent Securely Approved */}
              {aaStep === 'success' && (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                  {/* Glowing success checkmark */}
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-3xl animate-bounce shadow-xl shadow-emerald-500/10">
                    ✅
                  </div>
                  <div>
                    <h5 className="text-[17px] font-black text-white">Consent Securely Approved!</h5>
                    <p className="text-[12.5px] text-[#8b949e] leading-relaxed max-w-xs mx-auto mt-1.5">
                      Your bank account data has been encrypted and linked successfully. Syncing financial assets to your Digital Twin...
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setAaProviderConnected(selectedAaProvider.name);
                      setPhase('demo');
                      setShowAaModal(false);
                    }}
                    className="w-full py-3 mt-3 rounded-xl font-bold text-[13px] text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
                  >
                    Go to Finance Panel
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ── ACADEMIC PORTAL HEADER CARD (HORIZONTAL SPLIT MOCKUP STYLE) ── */}
      <GlassCard className="!p-8 !pb-9" style={{ display: 'flex', flexDirection: 'row', gap: '36px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Left Column: 3D glowing circular illustration with rotating orbital dots */}
        <div style={{
          width: 170, height: 170, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          border: '1px dashed rgba(99,102,241,0.18)',
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, margin: '0 auto'
        }}>
          {/* Outer rotating orbit 1 */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 10, border: '1px solid rgba(129,140,248,0.15)',
              borderRadius: '50%'
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 8px #818cf8' }} />
          </motion.div>

          {/* Inner counter-rotating orbit 2 */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 26, border: '1px dashed rgba(167,139,250,0.12)',
              borderRadius: '50%'
            }}
          >
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa', position: 'absolute', bottom: '15%', right: '50%', transform: 'translateX(50%)', boxShadow: '0 0 6px #a78bfa' }} />
          </motion.div>

          {/* Deep glowing background circle */}
          <div style={{
            position: 'absolute', width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(13, 20, 35, 0.8)', border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 0 32px rgba(99,102,241,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BookOpen size={44} style={{ color: '#818cf8', filter: 'drop-shadow(0 0 16px rgba(129,140,248,0.65))' }} />
          </div>
        </div>

        {/* Right Column: Portal Content (Title, desc, search, skill pills) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>Coursera Academic Portal</h3>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)', color: '#34d399'
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s infinite' }} />
                Twin Live
              </span>
            </div>
            
            <button style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }} className="hover:text-slate-300">
              <MoreVertical size={16} />
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#64748b', margin: '-14px 0 0 0', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Live Catalog · Real-Time API Sync · Verified Credentials
          </p>

          <p style={{ fontSize: 12.5, color: '#8b949e', margin: 0, lineHeight: 1.6 }}>
            Directly query Coursera's global developer database to search for live verified courses, specialization tracks, and university certificates. Save select programs to construct your AI-guided digital twin learning roadmap.
          </p>

          {/* Search Input Box */}
          <div style={{ display: 'flex', gap: 12, width: '100%', alignItems: 'center' }}>
            <div style={{
              position: 'relative', flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(5, 8, 15, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12, padding: '0 16px', transition: 'all 0.25s'
            }} className="focus-within:border-indigo-500/50 focus-within:shadow-[0_0_12px_rgba(99,102,241,0.18)]">
              <Search size={14} style={{ color: '#4b5563', marginRight: 10, flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(query)}
                placeholder="Search live Coursera database… e.g. Python, AI Agent, Next.js"
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, color: '#fff', padding: '12px 0', boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={() => doSearch(query)}
              disabled={loading || !query.trim()}
              style={{
                padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                opacity: (loading || !query.trim()) ? 0.4 : 1,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
              }}
              onMouseEnter={e => { if (!loading && query.trim()) e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { if (!loading && query.trim()) e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </div>

          {/* Skill chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
            {SKILL_CHIPS.map(s => {
              const isAct = query === s;
              return (
                <button 
                  key={s} 
                  onClick={() => { setQuery(s); doSearch(s); }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 99,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: isAct ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                    border: isAct ? '1px solid rgba(129,140,248,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: isAct ? '#818cf8' : '#8b949e'
                  }}
                  onMouseEnter={e => {
                    if (!isAct) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.color = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isAct) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#8b949e';
                    }
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ── RECOMMENDED FOR YOU CAROUSEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Recommended for You</h4>
          <button 
            onClick={() => { setQuery('AI'); doSearch('AI'); }}
            style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            className="hover:text-[#94a3b8]"
          >
            View all →
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <div 
            className="custom-scrollbar"
            style={{
              display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px',
              width: '100%', boxSizing: 'border-box', scrollBehavior: 'smooth'
            }}
          >
            {[
              { id: 'rec-1', name: 'Python for Everybody', partner: 'University of Michigan', logo: '🐍', color: '#10b981', badge: 'Beginner', badgeColor: '#34d399', badgeBg: 'rgba(16,185,129,0.08)', badgeBorder: 'rgba(16,185,129,0.2)', rating: '4.8', size: '18 Weeks' },
              { id: 'rec-2', name: 'Machine Learning Specialization', partner: 'DeepLearning.AI', logo: '🧠', color: '#fbbf24', badge: 'Intermediate', badgeColor: '#fbbf24', badgeBg: 'rgba(245,158,11,0.08)', badgeBorder: 'rgba(245,158,11,0.2)', rating: '4.9', size: '4 Courses' },
              { id: 'rec-3', name: 'Google Cloud Professional', partner: 'Google Cloud', logo: '☁️', color: '#3b82f6', badge: 'Advanced', badgeColor: '#60a5fa', badgeBg: 'rgba(59,130,246,0.08)', badgeBorder: 'rgba(59,130,246,0.2)', rating: '4.7', size: '12 Weeks' },
              { id: 'rec-4', name: 'React Developer', partner: 'Meta', logo: '⚛️', color: '#06b6d4', badge: 'Intermediate', badgeColor: '#34d399', badgeBg: 'rgba(16,185,129,0.08)', badgeBorder: 'rgba(16,185,129,0.2)', rating: '4.6', size: '10 Weeks' },
              { id: 'rec-5', name: 'Data Science Specialization', partner: 'Johns Hopkins Univ.', logo: '📊', color: '#ec4899', badge: 'Intermediate', badgeColor: '#f472b6', badgeBg: 'rgba(244,114,182,0.08)', badgeBorder: 'rgba(244,114,182,0.2)', rating: '4.8', size: '6 Courses' },
            ].map(rec => (
              <div 
                key={rec.id}
                onClick={() => { setQuery(rec.name); doSearch(rec.name); }}
                style={{
                  width: '232px', minWidth: '232px', background: 'rgba(13, 20, 35, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px',
                  padding: '18px 20px', display: 'flex', flexDirection: 'column',
                  gap: 12, cursor: 'pointer', transition: 'all 0.25s', boxSizing: 'border-box'
                }}
                className="hover:scale-[1.02] hover:border-indigo-500/20 hover:bg-[#162035]/60"
              >
                {/* Top Row: brand logo + titles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, flexShrink: 0
                  }}>
                    {rec.logo}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.name}</p>
                    <p style={{ fontSize: 10.5, color: '#64748b', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.partner}</p>
                  </div>
                </div>

                {/* Middle Row: Badge */}
                <div style={{ display: 'flex' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    color: rec.badgeColor, background: rec.badgeBg, border: `1px solid ${rec.badgeBorder}`,
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {rec.badge}
                  </span>
                </div>

                {/* Divider Line */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '2px 0' }} />

                {/* Bottom Row: Rating + Duration */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontWeight: 600 }}>
                    {rec.rating} <Star size={11} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>
                    {rec.size}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Arrow Button overlay */}
          <button 
            style={{
              position: 'absolute', right: -12, zIndex: 10, width: 28, height: 28,
              borderRadius: '50%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              transition: 'all 0.2s'
            }}
            className="hover:scale-105 hover:bg-[#1e293b]"
            onClick={() => {
              const el = document.querySelector('.custom-scrollbar');
              if (el) el.scrollBy({ left: 240, behavior: 'smooth' });
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Progress / loading */}
      {loading && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16,
            background: 'rgba(0,86,210,0.08)', border: '1px solid rgba(0,86,210,0.18)'
          }}
        >
          <Loader2 size={15} className="animate-spin" style={{ color: '#60a5fa' }} />
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#60a5fa', margin: 0 }}>
            {progress || 'Connecting to Coursera Catalog Services…'}
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)'
          }}
        >
          <AlertTriangle size={15} style={{ color: '#fbbf24' }} />
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#f59e0b', margin: 0 }}>{error}</p>
        </motion.div>
      )}

      {/* Results Grid */}
      {courses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 4px', fontWeight: 600 }}>
            Catalog matches: <strong style={{ color: '#94a3b8' }}>{courses.length} courses</strong> found for "{query}"
          </p>
          
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '20px' 
            }}
          >
            {courses.map((course, i) => {
              const isSaved = saved[course.id] || !!savedCourses.find(c => c.id === course.id);

              // Premium styling based on program level
              let badgeBg = 'rgba(255,255,255,0.04)';
              let badgeBorder = 'rgba(255,255,255,0.08)';
              let badgeColor = '#94a3b8';
              const lvl = course.level?.toLowerCase() || '';

              if (lvl.includes('begin')) {
                badgeBg = 'rgba(16,185,129,0.12)';
                badgeBorder = 'rgba(16,185,129,0.2)';
                badgeColor = '#34d399';
              } else if (lvl.includes('intermed')) {
                badgeBg = 'rgba(59,130,246,0.12)';
                badgeBorder = 'rgba(59,130,246,0.2)';
                badgeColor = '#60a5fa';
              } else if (lvl.includes('adv') || lvl.includes('special')) {
                badgeBg = 'rgba(139,92,246,0.12)';
                badgeBorder = 'rgba(139,92,246,0.2)';
                badgeColor = '#a78bfa';
              }

              return (
                <motion.div 
                  key={course.id} 
                  initial={{ opacity: 0, y: 12 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.04 }}
                  className="group"
                  style={{
                    background: 'rgba(13, 20, 35, 0.45)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                    e.currentTarget.style.boxShadow = '0 12px 36px 0 rgba(99,102,241,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.25)';
                  }}
                >
                  {/* Aspect-ratio Banner */}
                  <div style={{ width: '100%', height: 120, position: 'relative', overflow: 'hidden', background: '#05080f' }}>
                    {course.photo ? (
                      <img 
                        src={course.photo} 
                        alt={course.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, transition: 'all 0.3s' }}
                        className="group-hover:scale-105 group-hover:opacity-100"
                        onError={e => { e.currentTarget.style.display = 'none'; }} 
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, rgba(0,86,210,0.15) 0%, rgba(99,102,241,0.05) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <BookOpen size={32} style={{ color: 'rgba(96, 165, 250, 0.25)' }} />
                      </div>
                    )}

                    {/* Level Pill Indicator top-left */}
                    {course.level && (
                      <span style={{
                        position: 'absolute', top: 12, left: 12, fontSize: 9.5, fontWeight: 700,
                        padding: '3px 9px', borderRadius: 6, backdropFilter: 'blur(8px)',
                        background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor,
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        {course.level}
                      </span>
                    )}
                  </div>

                  {/* Body details */}
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px 0', lineHeight: 1.5 }} className="line-clamp-2">
                        {course.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>
                        Offered by {course.partner}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {course.duration && (
                        <span style={{ fontSize: 10.5, fontWeight: 500, color: '#8b949e', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                          ⏱ {course.duration}
                        </span>
                      )}
                      <span style={{ fontSize: 10.5, fontWeight: 500, color: '#8b949e', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                        ✓ Course
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <a 
                        href={course.url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          textDecoration: 'none', padding: '8px 0', borderRadius: 10,
                          background: 'rgba(0,86,210,0.12)', border: '1px solid rgba(0,86,210,0.22)',
                          color: '#60a5fa', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,86,210,0.22)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,86,210,0.12)'; }}
                      >
                        <ExternalLink size={12} /> View Program
                      </a>
                      <button
                        onClick={() => handleSave(course)}
                        disabled={isSaved}
                        style={{
                          width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: isSaved ? 'default' : 'pointer', border: '1px solid',
                          background: isSaved ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                          borderColor: isSaved ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)',
                          color: isSaved ? '#34d399' : '#8b949e', transition: 'all 0.2s', flexShrink: 0
                        }}
                        onMouseEnter={e => { if (!isSaved) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={e => { if (!isSaved) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8b949e'; } }}
                      >
                        {isSaved ? <CheckCircle size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved courses: Structured Learning Roadmap */}
      {savedCourses.length > 0 && (
        <GlassCard className="!p-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} style={{ color: '#34d399' }} />
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>AI Academic Learning Path</h3>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '3px 8px', borderRadius: 8 }}>
                {savedCourses.length} Programs Linked
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', padding: '3px 8px', borderRadius: 8 }}>
                Est: ~{savedCourses.length * 8} Hours
              </span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>
            Your Digital Twin has mapped these saved programs chronologically. Complete them sequentially to optimize skill projections and accelerate career domain conversions.
          </p>

          {/* Interactive Connect-the-Dots Timeline Path */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 14 }}>
            {/* Vertical timeline connecting line */}
            <div style={{
              position: 'absolute', top: 8, bottom: 8, left: 3, width: 2,
              background: 'linear-gradient(180deg, #10b981 0%, rgba(99,102,241,0.4) 60%, rgba(255,255,255,0.05) 100%)',
              pointerEvents: 'none'
            }} />

            {savedCourses.map((c, idx) => {
              const isFirst = idx === 0;
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isFirst ? '#10b981' : '#6366f1',
                    border: isFirst ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(99,102,241,0.4)',
                    boxShadow: isFirst ? '0 0 8px #10b981' : '0 0 6px #6366f1',
                    flexShrink: 0, marginTop: 5, zIndex: 2, marginLeft: -17
                  }} />

                  <div 
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.012)',
                      border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.25s'
                    }}
                    className="hover:bg-white/[0.03] hover:border-white/[0.08]"
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: isFirst ? '#34d399' : '#818cf8', textTransform: 'uppercase', fontMono: 'true' }}>
                          Step {idx + 1}
                        </span>
                        {isFirst && (
                          <span style={{ fontSize: 8.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)' }}>
                            Active Track
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#f1f5f9', margin: '3px 0 1px 0', truncate: 'true' }}>{c.name}</p>
                      <p style={{ fontSize: 10.5, color: '#64748b', margin: 0 }}>Offered by {c.partner}</p>
                    </div>

                    <a 
                      href={c.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{
                        fontSize: 11, fontWeight: 600, color: '#60a5fa', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0
                      }}
                      className="hover:underline"
                    >
                      Launch <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

const TABS = [
  { id: 'github',      label: 'GitHub',       icon: Github,     color: 'text-[#a1a1aa]'    },
  { id: 'linkedin',    label: 'LinkedIn',     icon: Linkedin,   color: 'text-[#0077b5]'    },
  { id: 'nutritionix', label: 'Nutrition',    icon: Utensils,   color: 'text-emerald-400'  },
  { id: 'fitbit',      label: 'Fitbit',       icon: Activity,   color: 'text-[#00b0b9]'    },
  { id: 'banking',     label: 'Banking',      icon: Landmark,   color: 'text-emerald-400'  },
  { id: 'coursera',    label: 'Coursera',     icon: BookOpen,   color: 'text-[#0056d2]'    },
];

export default function Integrations() {
  const [tab, setTab] = useState('github');

  return (
    <div className="page-container min-h-screen pb-2 relative pt-6 px-8" style={{ zIndex: 1, paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box' }}>
      
      {/* ── Cybernetic CSS Keyframes & Overrides ── */}
      <style>{`
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); opacity: 0.8; }
          50% { box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); opacity: 1; }
          100% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); opacity: 0.8; }
        }
        @keyframes pulse-dot-orange {
          0% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.4); opacity: 0.8; }
          50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.8); opacity: 1; }
          100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.4); opacity: 0.8; }
        }
        @keyframes scanline {
          0% { transform: translateY(0); }
          50% { transform: translateY(260px); }
          100% { transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .cyber-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
        }
        .glass-card {
          background: rgba(13, 20, 35, 0.45) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          position: relative !important;
          overflow: hidden !important;
          padding: 24px 28px !important;
        }
        .glass-card.table-card {
          padding: 0 !important;
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.1) !important;
          transform: translateY(-2px);
        }
        .input-premium, .input-premium-custom {
          background: rgba(5, 8, 15, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          padding: 10px 16px !important;
          color: #fff !important;
          font-size: 13.5px !important;
          transition: all 0.25s ease !important;
        }
        .input-premium:focus, .input-premium-custom:focus {
          border-color: rgba(99, 102, 241, 0.45) !important;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.25) !important;
          outline: none !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.25);
        }
      `}</style>

      {/* Cyber Grid & Glowing Ambient Blurs */}
      <div className="cyber-grid" style={{ position: 'absolute', inset: -20, opacity: 0.6, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 280, height: 280, background: 'rgba(99,102,241,0.06)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '8%', width: 340, height: 340, background: 'rgba(6,182,212,0.05)', filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Page Header ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* ── Breadcrumbs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
          <span>BeyondSelf</span>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#ffffff' }}>Integrations</span>
        </div>

        {/* ── Page Header Title ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8', flexShrink: 0 }}>
            <Link size={18} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>API Integrations</h1>
        </div>
        <p style={{ fontSize: 13, color: '#8e929b', marginTop: 2, marginBottom: 24 }}>Connect external platforms to enrich your digital twin with real-world data.</p>
      </div>

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
          {tab === 'fitbit'      && <FitbitPanel />}
          {tab === 'banking'     && <IndiaBankingPanel />}
          {tab === 'coursera'    && <CourseraPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
