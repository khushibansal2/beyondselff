import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { careerApi } from '../services/backendApi';
import { ScoreRing, GlassCard, PageHeader, MetricCard, showToast, RecommendationCard } from '../components/ui/Components';
import { loadFeedback, sortByFeedback } from '../services/recommendationFeedbackService';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { generateLearningPath } from '../services/learningService';
import { logSession, getSessions, getHeatmap, getStats, deleteSession } from '../services/studyService';
import {
  extractPdfText, parseResumeWithAI,
  saveResumeData, loadResumeData, clearResumeData,
} from '../services/resumeService';
import { CheckCircle, AlertTriangle, TrendingUp, ChevronRight, Plus, ExternalLink, Brain, Search, Loader2, Briefcase, MapPin, DollarSign, Zap, Target, BarChart2, Sparkles, RefreshCw } from 'lucide-react';
import { fetchJobs } from '../services/jobService';
import {
  calculateJobMatch, rankJobsByMatch, aggregateMissingSkills,
  getSalaryBenchmark, getSalaryChartData, generateCareerCoach, getDigitalTwinInsights,
} from '../services/careerIntelligenceService';

// ── Cognitive Load Gauge ─────────────────────────────────────────────────────
function CognitiveGauge({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const angle = -135 + (pct / 100) * 270;
  const rad = (angle * Math.PI) / 180;
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const color = pct < 40 ? '#10b981' : pct < 70 ? '#f59e0b' : '#f43f5e';
  const label = pct < 40 ? 'Low' : pct < 70 ? 'Moderate' : 'High';

  const arcPath = (startAngle, endAngle) => {
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="97" viewBox="0 0 160 130">
        <path d={arcPath(-45, 45, '#10b981')} stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d={arcPath(45, 90, '#f59e0b')} stroke="#f59e0b" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d={arcPath(90, 135, '#f43f5e')} stroke="#f43f5e" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.3" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        <text x={cx} y={cy + 28} textAnchor="middle" fill={color} fontSize="16" fontWeight="bold">{Math.round(pct)}</text>
        <text x={cx} y={cy + 42} textAnchor="middle" fill="#9B9B9B" fontSize="9">{label} Load</text>
      </svg>
    </div>
  );
}

// ── Focus Heatmap ────────────────────────────────────────────────────────────
function FocusHeatmap({ heatmap }) {
  if (!heatmap?.length) return <div className="h-24 flex items-center justify-center text-xs text-slate-500">No data yet</div>;
  const LEVEL_COLORS = ['#1a1a1a', '#14532d', '#166534', '#15803d', '#22c55e'];
  const weeks = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className="w-3.5 h-3.5 rounded-sm cursor-pointer transition-transform hover:scale-125"
                style={{ background: LEVEL_COLORS[day.level] }}
                title={`${day.date}: ${day.minutes} min`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Twin Impact Feed ─────────────────────────────────────────────────────────
function TwinImpactFeed({ session, onDone }) {
  const impacts = [
    { icon: '⚡', label: `+${session.xpEarned} XP earned`, color: '#f59e0b' },
    { icon: '🧠', label: `${session.topic} memory reinforced`, color: '#8b5cf6' },
    { icon: '🎯', label: `Focus quality: ${session.focusQuality}/5`, color: '#3b82f6' },
    session.focusQuality >= 4 && { icon: '🔥', label: 'High focus session bonus!', color: '#f43f5e' },
  ].filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <span className="text-6xl">🏆</span>
        </motion.div>
        <h3 className="text-xl font-bold text-white">Session Complete!</h3>
        <div className="space-y-2">
          {impacts.map((imp, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <span className="text-xl">{imp.icon}</span>
              <span className="text-sm font-medium" style={{ color: imp.color }}>{imp.label}</span>
            </motion.div>
          ))}
        </div>
        <div className="text-xs text-slate-400">{session.durationMinutes} min · {session.environment}</div>
        <button onClick={onDone} className="btn-primary w-full mt-2">Continue</button>
      </div>
    </motion.div>
  );
}

// ── Resume Tab helpers ───────────────────────────────────────────────────────
const RESUME_PARSE_STEPS = [
  'Reading PDF pages…',
  'Extracting text layout…',
  'Sending to Groq AI…',
  'Parsing skills & experience…',
  'Generating career insights…',
];
const PRIORITY_COLOR = {
  high:   'text-red-400 bg-red-500/[0.06] border-red-500/15',
  medium: 'text-amber-400 bg-amber-500/[0.06] border-amber-500/15',
  low:    'text-slate-400 bg-white/[0.02] border-white/[0.06]',
};
function ResumeScoreCard({ label, value, color, unit = '/100' }) {
  return (
    <GlassCard>
      <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-[28px] font-black leading-none" style={{ color }}>{value}<span className="text-[12px] font-medium text-slate-400 ml-0.5">{unit}</span></p>
      <div className="h-1.5 rounded-full bg-white/[0.05] mt-2.5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </GlassCard>
  );
}

function ResumeTab({ career: c, updateDomain }) {
  const fileRef   = useRef(null);
  const resultRef = useRef(null);
  const [phase,        setPhase]        = useState(() => loadResumeData() ? 'results' : 'upload');
  const [stepText,     setStepText]     = useState('');
  const [stepIdx,      setStepIdx]      = useState(0);
  const [dragOver,     setDragOver]     = useState(false);
  const [resume,       setResume]       = useState(() => loadResumeData());
  const [error,        setError]        = useState(null);
  const [synced,       setSynced]       = useState(false);
  const [activeSection,setActiveSection]= useState('overview');

  async function processFile(file) {
    if (!file || file.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    setPhase('parsing'); setError(null); setStepIdx(0);
    const tick = (i, msg) => { setStepIdx(i); setStepText(msg); };
    try {
      tick(0, RESUME_PARSE_STEPS[0]);
      const text = await extractPdfText(file);
      tick(2, RESUME_PARSE_STEPS[2]);
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

  function handleReset() {
    clearResumeData();
    setResume(null); setPhase('upload'); setError(null); setSynced(false); setActiveSection('overview');
  }

  function handleSyncSkills() {
    const newSkills = resume?.skills ?? [];
    const merged = [...new Set([...(c?.skills ?? []), ...newSkills])];
    updateDomain('career', { ...c, skills: merged, projectsCompleted: (c?.projectsCompleted ?? 0) + (resume?.projects?.length ?? 0) });
    setSynced(true);
    showToast(`Synced ${newSkills.length} skills to Career profile!`, 'success');
  }

  const r = resume;
  const skillCats = r?.skillCategories ?? {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📄</span>
            <h3 className="text-[14px] font-semibold text-[#f0f0f3]">Resume AI Intelligence</h3>
            <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-semibold ${phase === 'results' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#27272a]/50 border-white/[0.06] text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${phase === 'results' ? 'bg-emerald-400' : 'bg-[#71717a]'}`} />
              {phase === 'results' ? 'Analyzed' : 'Not Uploaded'}
            </span>
          </div>
          {phase === 'results' && (
            <button onClick={handleReset} className="text-[11px] px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 transition-all">
              Upload New
            </button>
          )}
        </div>
        {phase === 'upload' && (
          <p className="text-[12px] text-slate-500 mt-2">
            Upload your resume PDF — AI extracts skills, experience, education, and projects, then generates ATS score, skill gap analysis, and a personalised learning roadmap.
          </p>
        )}
      </GlassCard>

      {/* Upload Zone */}
      {phase === 'upload' && (
        <GlassCard>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 p-12 ${
              dragOver ? 'border-blue-500/50 bg-blue-500/[0.05]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-3xl">📄</span>
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-[#f0f0f3] mb-1">Drop your resume PDF here</p>
              <p className="text-[12px] text-slate-500">or click to browse · PDF only · text-based (not scanned)</p>
            </div>
            <div className="flex gap-3 text-[11px] text-slate-400">
              {['Skills Extraction', 'ATS Score', 'Skill Gap Analysis', 'Learning Roadmap'].map(f => (
                <span key={f} className="flex items-center gap-1"><CheckCircle size={10} className="text-blue-400" />{f}</span>
              ))}
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-start gap-2 text-[12px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
        </GlassCard>
      )}

      {/* Parsing Animation */}
      {phase === 'parsing' && (
        <GlassCard className="border border-blue-500/15 bg-blue-500/[0.03]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full border-2 border-blue-400/60 border-t-blue-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-[14px] font-semibold text-[#f0f0f3]">Analyzing your resume…</p>
              <p className="text-[12px] text-slate-500">{stepText}</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {RESUME_PARSE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  i < stepIdx ? 'bg-blue-500' : i === stepIdx ? 'border-2 border-blue-400 animate-pulse' : 'border border-white/[0.06]'
                }`}>
                  {i < stepIdx && <CheckCircle size={11} className="text-white" />}
                </div>
                <span className={`text-[12px] ${i <= stepIdx ? 'text-slate-300' : 'text-slate-600'}`}>{step}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Results Dashboard */}
      {phase === 'results' && r && (
        <motion.div ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Identity card */}
          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                {r.personalInfo?.name ? r.personalInfo.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[16px] font-bold text-[#f0f0f3]">{r.personalInfo?.name || 'Your Profile'}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">{r.overallLevel}</span>
                  {r.totalExperienceYears > 0 && <span className="text-[11px] text-slate-500">{r.totalExperienceYears}yr exp</span>}
                </div>
                {r.personalInfo?.email && <p className="text-[12px] text-slate-500 mt-0.5">{r.personalInfo.email}{r.personalInfo.location ? ` · ${r.personalInfo.location}` : ''}</p>}
                <p className="text-[12px] text-slate-400 mt-2 leading-relaxed italic">"{r.summary}"</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.05]">
              <button onClick={handleSyncSkills} disabled={synced}
                className="flex items-center gap-2 text-[12px] px-4 py-2.5 rounded-xl border font-semibold transition-all disabled:cursor-default"
                style={{ background: synced ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.1)', borderColor: synced ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)', color: synced ? '#10b981' : '#93c5fd' }}>
                {synced ? <><CheckCircle size={13} /> Synced to Career</> : <><Plus size={13} /> Sync Skills to Career</>}
              </button>
              {r.personalInfo?.linkedin && (
                <a href={r.personalInfo.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] px-3.5 py-2.5 rounded-xl border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-all">
                  <ExternalLink size={12} /> LinkedIn
                </a>
              )}
            </div>
          </GlassCard>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <ResumeScoreCard label="ATS Score"        value={r.atsScore}        color="#f59e0b" />
            <ResumeScoreCard label="Profile Strength" value={r.profileStrength} color="#6366f1" />
            <ResumeScoreCard label="Hirability"       value={r.hirability}      color="#10b981" unit="%" />
          </div>

          {/* Section tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'overview',   label: 'Overview'    },
              { id: 'skills',     label: 'Skills'      },
              { id: 'experience', label: 'Experience'  },
              { id: 'projects',   label: 'Projects'    },
              { id: 'insights',   label: 'AI Insights' },
              { id: 'roadmap',    label: 'Roadmap'     },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
                  activeSection === s.id
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                    : 'border-white/[0.06] text-slate-500 hover:text-slate-300'
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
                      { title: 'Strengths',  items: r.strengths,  color: 'text-emerald-400', bg: 'bg-emerald-500/[0.04] border-emerald-500/15', dot: 'bg-emerald-500/60' },
                      { title: 'Weaknesses', items: r.weaknesses, color: 'text-red-400',     bg: 'bg-red-500/[0.04] border-red-500/15',         dot: 'bg-red-500/60'     },
                      { title: 'Skill Gaps', items: r.skillGaps,  color: 'text-amber-400',   bg: 'bg-amber-500/[0.04] border-amber-500/15',     dot: 'bg-amber-500/60'   },
                    ].map(s => (
                      <GlassCard key={s.title} className={`border ${s.bg}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${s.color}`}>{s.title}</p>
                        <ul className="space-y-1.5">
                          {(s.items ?? []).map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed">
                              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />{item}
                            </li>
                          ))}
                        </ul>
                      </GlassCard>
                    ))}
                  </div>
                  {r.salaryRange && (
                    <GlassCard className="border border-emerald-500/15">
                      <p className="text-[11px] text-slate-500 mb-1">Estimated Salary Range</p>
                      <p className="text-[16px] font-bold text-emerald-400">{r.salaryRange}</p>
                    </GlassCard>
                  )}
                  {r.targetRoles?.length > 0 && (
                    <GlassCard>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Best-Fit Roles</p>
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 capitalize">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map(s => (
                          <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15 text-blue-300 font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!Object.values(skillCats).some(v => v?.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(r.skills ?? []).map(s => (
                        <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15 text-blue-300 font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}

              {/* EXPERIENCE */}
              {activeSection === 'experience' && (
                <div className="space-y-3">
                  {(r.experience ?? []).length === 0 && <GlassCard><p className="text-[12px] text-slate-500 text-center py-6">No work experience detected in the resume.</p></GlassCard>}
                  {(r.experience ?? []).map((exp, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{exp.role}</p>
                          <p className="text-[12px] text-slate-500">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.05]">{exp.duration}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {(exp.highlights ?? []).map((h, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                            <ChevronRight size={11} className="mt-0.5 text-blue-500 flex-shrink-0" />{h}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  ))}
                  {(r.education ?? []).length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mt-2">Education</p>
                      {r.education.map((edu, i) => (
                        <GlassCard key={i}>
                          <p className="text-[13px] font-semibold text-[#f0f0f3]">{edu.degree}</p>
                          <p className="text-[12px] text-slate-500">{edu.institution}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[11px] text-slate-500">{edu.year}</span>
                            {edu.gpa && <span className="text-[11px] text-slate-500">GPA: {edu.gpa}</span>}
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
                  {(r.projects ?? []).length === 0 && <GlassCard><p className="text-[12px] text-slate-500 text-center py-6">No projects detected in the resume.</p></GlassCard>}
                  {(r.projects ?? []).map((proj, i) => (
                    <GlassCard key={i}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[13px] font-semibold text-[#f0f0f3]">{proj.name}</p>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline flex-shrink-0">
                            <ExternalLink size={10} /> View
                          </a>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-500 leading-relaxed mb-2">{proj.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(proj.technologies ?? []).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 font-medium">{t}</span>
                        ))}
                      </div>
                    </GlassCard>
                  ))}
                  {(r.certifications ?? []).length > 0 && (
                    <GlassCard>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {r.certifications.map((cert, i) => (
                          <span key={i} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300 font-medium">
                            <CheckCircle size={10} /> {cert}
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
                    <GlassCard className="border border-blue-500/15 bg-blue-500/[0.02]">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain size={14} className="text-blue-400" />
                        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI Recommendations</h3>
                      </div>
                      <div className="space-y-2.5">
                        {r.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.08]">
                            <span className="text-[11px] font-bold text-blue-400/70 mt-0.5 font-mono flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                            <p className="text-[12px] text-slate-400 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* ROADMAP */}
              {activeSection === 'roadmap' && (
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
                        <p className="text-[11px] text-slate-500 mb-1 leading-relaxed">{item.reason}</p>
                        {item.resource && <p className="text-[10px] text-blue-400">📚 {item.resource}</p>}
                      </motion.div>
                    ))}
                    {(r.learningRoadmap ?? []).length === 0 && (
                      <p className="text-[12px] text-slate-500 text-center py-6">Roadmap data not available for this resume.</p>
                    )}
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, userSkills }) {
  const match      = useMemo(() => calculateJobMatch(userSkills, job), [userSkills, job]);
  const scoreColor = match.score >= 80 ? '#10b981' : match.score >= 60 ? '#f59e0b' : '#f43f5e';
  const scoreLabel = match.score >= 80 ? 'Great Match' : match.score >= 60 ? 'Good Match' : 'Partial Match';
  const initials   = (job.company || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const circ       = 2 * Math.PI * 20;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ background: 'rgba(15,18,30,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>

        {/* Company logo */}
        <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {job.companyLogo
            ? <img src={job.companyLogo} alt={job.company} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} onError={e => { e.target.style.display = 'none'; }} />
            : <span style={{ fontSize: 16, fontWeight: 900, color: '#94a3b8' }}>{initials}</span>}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{job.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{job.company}</span>
            <span style={{ color: '#334155' }}>·</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{job.location}</span>
            {job.salary && <><span style={{ color: '#334155' }}>·</span><span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{job.salary}</span></>}
            {job.remote && <><span style={{ color: '#334155' }}>·</span><span style={{ fontSize: 11, color: '#60a5fa' }}>Remote</span></>}
            <span style={{ fontSize: 11, color: '#475569' }}>· Full-time</span>
          </div>
        </div>

        {/* Match ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="28" cy="28" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle cx="28" cy="28" r="20" fill="none" stroke={scoreColor} strokeWidth="4"
                strokeDasharray={`${(match.score / 100) * circ} ${circ}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{match.score}%</span>
              <span style={{ fontSize: 8, color: '#475569', lineHeight: 1, marginTop: 1 }}>Match</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <a href={job.url} target="_blank" rel="noopener noreferrer"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}>
          View Job <span style={{ fontSize: 15 }}>›</span>
        </a>
      </div>
    </motion.div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
const ROLE_CHIPS = ['Frontend', 'Backend', 'Full Stack', 'AI Engineer', 'ML Engineer', 'Product Engineer'];
const LOCATIONS  = [{ label: 'Anywhere', value: '' }, { label: 'Remote', value: 'remote' }, { label: 'Bengaluru', value: 'Bengaluru' }, { label: 'Mumbai', value: 'Mumbai' }, { label: 'Hyderabad', value: 'Hyderabad' }, { label: 'Delhi', value: 'Delhi' }];

function JobsTab({ userSkills }) {
  const [query,    setQuery]    = useState('');
  const [location, setLocation] = useState('');
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [searched, setSearched] = useState(false);
  const [showLoc,  setShowLoc]  = useState(false);

  async function doSearch(q = query, loc = location) {
    if (!q.trim()) return;
    setLoading(true); setError(null); setJobs([]); setSearched(true);
    try {
      const results = await fetchJobs(q.trim(), { location: loc.trim() });
      setJobs(rankJobsByMatch(userSkills || [], results));
    } catch (e) {
      if (e.message === 'NO_RESULTS') setError('No jobs found. Try a broader search term.');
      else setError('Could not reach job APIs. Check your connection.');
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    if (filter === 'remote')  return jobs.filter(j => j.remote);
    if (filter === 'salary')  return jobs.filter(j => j.salary);
    if (filter === 'match80') return jobs.filter(j => (j.match?.score ?? 0) >= 80);
    return jobs;
  }, [jobs, filter]);

  // Stats
  const avgMatch   = jobs.length ? Math.round(jobs.reduce((s, j) => s + (j.match?.score ?? 0), 0) / jobs.length) : 0;
  const matchLabel = avgMatch >= 80 ? 'Great Match' : avgMatch >= 60 ? 'Good Match' : 'Building...';
  const matchColor = avgMatch >= 80 ? '#10b981' : avgMatch >= 60 ? '#f59e0b' : '#6366f1';
  const missingAll = useMemo(() => aggregateMissingSkills(userSkills || [], jobs.slice(0, 5)), [userSkills, jobs]);
  const circ       = 2 * Math.PI * 36;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── SEARCH PANEL ── */}
      <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 28px 22px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Find Your Next Opportunity 🚀</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Discover opportunities that match your skills and goals.</p>

        {/* Inputs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {/* Role */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Role (e.g. React Developer, ML Engineer)"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '12px 14px 12px 40px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {/* Location dropdown */}
          <div style={{ position: 'relative', width: 200 }}>
            <MapPin size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', zIndex: 1 }} />
            <button onClick={() => setShowLoc(s => !s)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '12px 36px 12px 40px', color: '#f1f5f9', fontSize: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {LOCATIONS.find(l => l.value === location)?.label || 'Anywhere'}
              <span style={{ fontSize: 10, color: '#475569', marginRight: -20 }}>▾</span>
            </button>
            {showLoc && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 50 }}>
                {LOCATIONS.map(l => (
                  <button key={l.value} onClick={() => { setLocation(l.value); setShowLoc(false); }}
                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', color: location === l.value ? '#818cf8' : '#94a3b8', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Search button */}
          <button onClick={() => doSearch()} disabled={loading || !query.trim()}
            style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', opacity: !query.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? 'Searching…' : 'Search Jobs →'}
          </button>
        </div>

        {/* Role chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ROLE_CHIPS.map(chip => (
            <button key={chip} onClick={() => { setQuery(chip); doSearch(chip); }}
              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: query === chip ? '#6366f1' : 'rgba(255,255,255,0.04)', border: query === chip ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)', color: query === chip ? '#fff' : '#94a3b8' }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS ROW ── */}
      {searched && !loading && jobs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {[
            { icon: '💼', bg: '#6366f1', label: 'Jobs Found',   value: jobs.length, sub: `+${Math.min(36, Math.round(jobs.length * 0.08))} new today` },
            { icon: '🎯', bg: '#10b981', label: 'Match Score',  value: `${avgMatch}%`, sub: matchLabel, color: matchColor },
            { icon: '₹',  bg: '#f59e0b', label: 'Avg Salary',   value: jobs.find(j => j.salary)?.salary || '—', sub: '+8% vs last month' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg + '22', border: `1px solid ${s.bg}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: s.color || '#f1f5f9', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: s.color || '#10b981', marginTop: 2 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

        {/* Left: job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Filter bar */}
          {jobs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Recommended Jobs</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all','remote','match80'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: filter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)', color: filter === f ? '#818cf8' : '#64748b' }}>
                    {f === 'all' ? 'All' : f === 'remote' ? '🌐 Remote' : '🎯 80%+ Match'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && [1,2,3].map(i => (
            <div key={i} style={{ background: 'rgba(15,18,30,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} className="animate-pulse" />
              <div style={{ flex: 1 }} className="animate-pulse">
                <div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '55%', marginBottom: 8 }} />
                <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 6, width: '35%' }} />
              </div>
            </div>
          ))}

          {/* Error */}
          {error && !loading && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#f87171', marginBottom: 8 }}>{error}</p>
              <button onClick={() => doSearch()} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* Empty / landing state */}
          {!searched && !loading && (
            <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💼</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Real-time Job Market</p>
              <p style={{ fontSize: 12, color: '#475569' }}>Powered by Arbeitnow · Remotive · Adzuna</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Enter a role above to find live listings with AI match scores</p>
            </div>
          )}

          {/* Results */}
          {filtered.map(job => <JobCard key={job.id} job={job} userSkills={userSkills || []} />)}

          {filtered.length > 0 && (
            <button style={{ padding: '12px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              View all jobs →
            </button>
          )}
        </div>

        {/* Right: score + insight */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Opportunity Score */}
          <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 18px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>Your Opportunity Score</p>
            {/* Gauge ring */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="36" fill="none" stroke={searched && jobs.length ? matchColor : '#6366f1'} strokeWidth="8"
                    strokeDasharray={`${((searched && jobs.length ? avgMatch : 0) / 100) * circ} ${circ}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                </svg>
                {/* decorative stars */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{searched && jobs.length ? `${avgMatch}%` : '—'}</span>
                  <span style={{ fontSize: 11, color: matchColor, fontWeight: 600, marginTop: 2 }}>{searched && jobs.length ? matchLabel : 'Search first'}</span>
                </div>
              </div>
            </div>
            {/* Missing skills */}
            {missingAll.length > 0 && (
              <>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Missing Skills</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {missingAll.slice(0, 4).map(item => (
                    <div key={item.skill} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.5)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.skill}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Create Learning Plan →
            </button>
          </div>

          {/* Market Insight */}
          <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💡</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Market Insight</p>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
              {query ? `${query} demand increased 32% this month.` : 'Tech hiring is up 28% this quarter.'}<br />
              <span style={{ color: '#64748b' }}>Keep building {query ? `${query} + related skills.` : 'in-demand skills.'}</span>
            </p>
            {/* Mini trend line */}
            <svg width="100%" height="36" viewBox="0 0 200 36">
              <polyline points="0,30 40,24 80,18 120,10 160,6 200,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module-level tooltip component (must be outside render to avoid remounting)
function SalaryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-xs">
      <p className="text-[#a1a1aa] mb-1.5 font-semibold">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'min' ? 'Min' : p.name === 'max' ? 'Max' : 'Mid'}: ₹{p.value}L
        </p>
      ))}
    </div>
  );
}

// ── Career Intelligence Tab ───────────────────────────────────────────────────
function CareerIntelligenceTab({ userSkills, targetRole, health, computed }) {
  const [section,      setSection]      = useState('match');
  const [jobs,         setJobs]         = useState([]);
  const [jobsLoading,  setJobsLoading]  = useState(false);
  const [coach,        setCoach]        = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError,   setCoachError]   = useState(null);
  const [roleInput,    setRoleInput]    = useState(targetRole || 'Software Engineer');

  const salary     = useMemo(() => getSalaryBenchmark(roleInput, userSkills), [roleInput, userSkills]);
  const salaryChart = useMemo(() => getSalaryChartData(), []);
  const twinInsights = useMemo(() => getDigitalTwinInsights({
    sleepAvg:       health?.sleepAvg,
    stressLevel:    health?.stressLevel,
    financeScore:   computed?.financeScore?.score,
    studyHoursDaily: 0,
  }), [health, computed]);

  const missingAgg = useMemo(() => aggregateMissingSkills(userSkills || [], jobs), [userSkills, jobs]);
  const topJob     = useMemo(() => jobs[0] || null, [jobs]);
  const avgMatch   = useMemo(() => jobs.length
    ? Math.round(jobs.slice(0, 10).reduce((s, j) => s + (j.match?.score ?? 0), 0) / Math.min(10, jobs.length))
    : 0, [jobs]);

  async function handleLoadMarketJobs() {
    if (jobsLoading) return;
    setJobsLoading(true);
    try {
      const results = await fetchJobs(roleInput);
      setJobs(rankJobsByMatch(userSkills || [], results));
    } catch {
      // silently skip — match section shows empty state
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleGenerateCoach() {
    if (!userSkills?.length) { setCoachError('Upload your resume first to generate coaching.'); return; }
    setCoachLoading(true); setCoachError(null);
    try {
      const result = await generateCareerCoach({
        skills:        userSkills,
        targetRole:    roleInput,
        missingSkills: missingAgg.slice(0, 8).map(m => m.skill),
        matchScore:    avgMatch,
        salaryRange:   salary.label,
        studyHours:    0,
        sleepAvg:      health?.sleepAvg ?? 7,
      });
      setCoach(result);
      setSection('coach');
    } catch (e) {
      setCoachError(e.message === 'NO_KEY' ? 'Add VITE_GROQ_API_KEY to .env to enable AI coaching.' : 'AI coaching failed. Please try again.');
    } finally {
      setCoachLoading(false);
    }
  }

  const PRIORITY_BADGE = {
    critical: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
    high:     'bg-amber-500/10 border-amber-500/25 text-amber-400',
    medium:   'bg-blue-500/10 border-blue-500/25 text-blue-400',
  };

  return (
    <div className="space-y-5">
      {/* Role input + section nav */}
      <GlassCard>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative min-w-0">
            <Target size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={roleInput} onChange={e => setRoleInput(e.target.value)}
              placeholder="Target role (e.g. Senior React Developer)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-[12px] text-[#f0f0f3] placeholder-[#6b7280] outline-none focus:border-violet-500/40 transition-colors" />
          </div>
          <button onClick={() => { setJobs([]); setCoach(null); handleLoadMarketJobs(); }}
            className="text-[11px] px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-[#a1a1aa] transition-all flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {[
            { id: 'match',  label: 'Match Analysis', icon: '🎯' },
            { id: 'salary', label: 'Salary Analytics', icon: '💰' },
            { id: 'coach',  label: 'AI Career Coach', icon: '🤖' },
            { id: 'twin',   label: 'Twin Insights', icon: '🔗' },
          ].map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`text-[11px] px-3.5 py-1.5 rounded-xl border font-semibold transition-all ${
                section === s.id
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                  : 'border-white/[0.06] text-slate-400 hover:text-[#a1a1aa]'
              }`}>{s.icon} {s.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* ── MATCH ANALYSIS ─────────────────────────────────────────────── */}
          {section === 'match' && (
            <div className="space-y-4">
              {/* No skills warning */}
              {!userSkills?.length && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-slate-400">Upload your resume in the <strong className="text-amber-400">Resume AI</strong> tab to unlock personalised match analysis.</p>
                </div>
              )}

              {/* Scores row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg Market Match', value: `${avgMatch}%`, color: avgMatch >= 70 ? '#10b981' : avgMatch >= 50 ? '#f59e0b' : '#f43f5e', icon: '🎯' },
                  { label: 'Your Skills', value: userSkills?.length ?? 0, color: '#3b82f6', icon: '⚡' },
                  { label: 'Gap Skills', value: missingAgg.filter(m => m.priority === 'critical' || m.priority === 'high').length, color: '#f59e0b', icon: '📚' },
                ].map(m => (
                  <GlassCard key={m.label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">{m.label}</p>
                    <p className="text-[26px] font-black leading-none" style={{ color: m.color }}>{m.value}</p>
                  </GlassCard>
                ))}
              </div>

              {/* Market loading / load trigger */}
              {jobsLoading && (
                <GlassCard className="text-center py-6">
                  <Loader2 size={20} className="mx-auto mb-2 text-violet-400 animate-spin" />
                  <p className="text-[12px] text-slate-400">Fetching live market data…</p>
                </GlassCard>
              )}
              {!jobsLoading && !jobs.length && (
                <GlassCard className="text-center py-6">
                  <p className="text-[12px] text-slate-400 mb-3">Fetch live job listings to generate skill gap analysis</p>
                  <button onClick={handleLoadMarketJobs}
                    className="px-5 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[12px] font-semibold hover:bg-violet-500/25 transition-all flex items-center gap-2 mx-auto">
                    <RefreshCw size={12} /> Load Market Data
                  </button>
                </GlassCard>
              )}

              {/* Critical gap skills */}
              {missingAgg.length > 0 && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={13} className="text-amber-400" />
                    <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Skills Gap — Market Demand</h3>
                    <span className="text-[10px] text-slate-400 ml-auto">Based on {jobs.length} live listings</span>
                  </div>
                  <div className="space-y-2">
                    {missingAgg.map((m, i) => (
                      <motion.div key={m.skill} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 w-16 text-center ${PRIORITY_BADGE[m.priority]}`}>{m.priority}</span>
                        <span className="text-[12px] text-[#a1a1aa] font-medium flex-1">{m.skill}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.8, delay: i * 0.04 }}
                              className="h-full rounded-full bg-amber-500" />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{m.pct}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Current skill strengths */}
              {userSkills?.length > 0 && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Your Verified Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map(s => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">{s}</span>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Top matching job preview */}
              {topJob && (
                <GlassCard>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">🏆 Top Matching Job</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#f0f0f3] truncate">{topJob.title}</p>
                      <p className="text-[12px] text-[#a1a1aa]">{topJob.company} · {topJob.location}</p>
                    </div>
                    <div className="text-[22px] font-black flex-shrink-0" style={{ color: '#10b981' }}>{topJob.match?.score ?? 0}%</div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {/* ── SALARY ANALYTICS ───────────────────────────────────────────── */}
          {section === 'salary' && (
            <div className="space-y-4">
              {/* Your estimated salary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Min Estimate',  value: `₹${salary.min}L`,  color: '#f59e0b' },
                  { label: 'Mid Estimate',  value: `₹${salary.mid}L`,  color: '#3b82f6' },
                  { label: 'Max Estimate',  value: `₹${salary.max}L`,  color: '#10b981' },
                ].map(m => (
                  <GlassCard key={m.label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1.5">{m.label}</p>
                    <p className="text-[24px] font-black leading-none" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1">per annum</p>
                  </GlassCard>
                ))}
              </div>

              {salary.premiumSkills.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                  <Sparkles size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-300">Premium Skill Bonus Detected</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {salary.premiumSkills.join(', ')} command above-median compensation. Your max range reflects this premium.
                    </p>
                  </div>
                </div>
              )}

              {/* Salary chart */}
              <GlassCard>
                <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-4">Indian Tech Market — Salary by Role (LPA)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
                      <XAxis dataKey="role" tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<SalaryTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="min" name="min" fill="#f43f5e" fillOpacity={0.6} radius={[3,3,0,0]} />
                      <Bar dataKey="mid" name="mid" fill="#3b82f6" fillOpacity={0.8} radius={[3,3,0,0]} />
                      <Bar dataKey="max" name="max" fill="#10b981" fillOpacity={0.6} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  {[['#f43f5e','Min'],['#3b82f6','Mid'],['#10b981','Max']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                      <span className="text-[10px] text-slate-400">{l}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Role-specific benchmarks */}
              <GlassCard>
                <h3 className="text-[13px] font-semibold text-[#f0f0f3] mb-3">Salary Benchmarks — Indian Tech Market</h3>
                <div className="space-y-2.5">
                  {salaryChart.map((row, i) => (
                    <motion.div key={row.role} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3">
                      <span className="text-[11px] text-[#a1a1aa] w-28 flex-shrink-0">{row.role}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-violet-500/60"
                          style={{ width: `${(row.max / 100) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 w-24 text-right flex-shrink-0">₹{row.min}–{row.max}L</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── AI CAREER COACH ─────────────────────────────────────────────── */}
          {section === 'coach' && (
            <div className="space-y-4">
              {/* Generate button */}
              {!coach && (
                <GlassCard className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                    <Brain size={26} className="text-violet-400" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#f0f0f3] mb-1">AI Career Coach</h3>
                  <p className="text-[12px] text-slate-400 mb-1">Powered by Groq · llama-3.3-70b</p>
                  <p className="text-[11px] text-slate-400 mb-5">Generates a personalised roadmap, portfolio ideas, interview tips and weekly plan based on your resume + market data.</p>
                  {coachError && (
                    <p className="text-[12px] text-rose-400 mb-4">{coachError}</p>
                  )}
                  <button onClick={handleGenerateCoach} disabled={coachLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto">
                    {coachLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate My Career Plan</>}
                  </button>
                </GlassCard>
              )}

              {/* Coach results */}
              {coach && (
                <div className="space-y-4">
                  {/* Readiness + verdict */}
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Career Readiness</p>
                      <div className="flex items-end gap-3">
                        <span className="text-[40px] font-black leading-none"
                          style={{ color: coach.readinessScore >= 70 ? '#10b981' : coach.readinessScore >= 50 ? '#f59e0b' : '#f43f5e' }}>
                          {coach.readinessScore}%
                        </span>
                        <p className="text-[11px] text-slate-400 mb-1 leading-relaxed">{coach.verdict}</p>
                      </div>
                    </GlassCard>
                    <GlassCard className="col-span-2 sm:col-span-1 border border-violet-500/10 bg-violet-500/[0.03]">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">💡 Twin Insight</p>
                      <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{coach.digitalTwinInsight}</p>
                    </GlassCard>
                  </div>

                  {/* Top skills to learn */}
                  {coach.topSkillsToLearn?.length > 0 && (
                    <GlassCard>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={13} className="text-amber-400" />
                        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Priority Skills to Learn</h3>
                      </div>
                      <div className="space-y-3">
                        {coach.topSkillsToLearn.map((item, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                            className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold text-[#f0f0f3]">{item.skill}</span>
                              <span className="text-[10px] text-slate-400">{item.weeks}w estimate</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mb-1.5">{item.reason}</p>
                            {item.resource && (
                              <p className="text-[10px] text-blue-400">📚 {item.resource}</p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Portfolio projects */}
                  {coach.portfolioProjects?.length > 0 && (
                    <GlassCard>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={13} className="text-blue-400" />
                        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Portfolio Project Ideas</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {coach.portfolioProjects.map((p, i) => (
                          <div key={i} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <p className="text-[12px] font-semibold text-[#f0f0f3] mb-1">🚀 {p.title}</p>
                            <p className="text-[11px] text-slate-400 mb-2">{p.impact}</p>
                            <div className="flex flex-wrap gap-1">
                              {(p.stack || []).map(t => (
                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">{t}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Weekly plan */}
                  {coach.weeklyPlan?.length > 0 && (
                    <GlassCard>
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart2 size={13} className="text-emerald-400" />
                        <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Weekly Action Plan</h3>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {coach.weeklyPlan.map((day, i) => (
                          <div key={i} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <p className="text-[10px] font-bold text-emerald-400 mb-1">{day.days}</p>
                            <p className="text-[11px] font-semibold text-[#a1a1aa] mb-1">{day.focus}</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{day.task}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Interview tips + salary tip */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {coach.interviewTips?.length > 0 && (
                      <GlassCard>
                        <p className="text-[11px] font-semibold text-[#a1a1aa] mb-2">🎤 Interview Tips</p>
                        <ul className="space-y-2">
                          {coach.interviewTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                              <ChevronRight size={10} className="mt-0.5 text-blue-400 flex-shrink-0" />{tip}
                            </li>
                          ))}
                        </ul>
                      </GlassCard>
                    )}
                    {coach.salaryTip && (
                      <GlassCard className="border border-emerald-500/15 bg-emerald-500/[0.03]">
                        <p className="text-[11px] font-semibold text-emerald-300 mb-2">💰 Salary Negotiation</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{coach.salaryTip}</p>
                      </GlassCard>
                    )}
                  </div>

                  {/* Regenerate button */}
                  <button onClick={() => { setCoach(null); setCoachError(null); }}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08] text-[12px] text-slate-400 hover:text-[#a1a1aa] transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={12} /> Regenerate Career Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── DIGITAL TWIN INSIGHTS ──────────────────────────────────────── */}
          {section === 'twin' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04]">
                <Brain size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-violet-300">Cross-Domain Digital Twin Analysis</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Your health, finance, and career data are interconnected. These insights surface hidden relationships that affect your career performance.</p>
                </div>
              </div>

              {twinInsights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <GlassCard className={`border ${
                    insight.type === 'warning'  ? 'border-amber-500/15 bg-amber-500/[0.02]' :
                    insight.type === 'positive' ? 'border-emerald-500/15 bg-emerald-500/[0.02]' :
                    'border-blue-500/15 bg-blue-500/[0.02]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{
                          color: insight.type === 'warning' ? '#f59e0b' : insight.type === 'positive' ? '#10b981' : '#3b82f6'
                        }}>{insight.domain}</p>
                        <p className="text-[12px] text-[#a1a1aa] leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}

              <GlassCard>
                <p className="text-[11px] font-semibold text-[#a1a1aa] mb-3">Log more data to unlock deeper insights</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { domain: 'Sleep', status: (health?.sleepAvg ?? 0) > 0, icon: '😴' },
                    { domain: 'Stress', status: (health?.stressLevel ?? 0) > 0, icon: '🧠' },
                    { domain: 'Study', status: false, icon: '📚' },
                  ].map(d => (
                    <div key={d.domain} className={`p-3 rounded-xl border ${d.status ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                      <span className="text-xl">{d.icon}</span>
                      <p className="text-[10px] text-slate-400 mt-1">{d.domain}</p>
                      <p className={`text-[10px] font-bold ${d.status ? 'text-emerald-400' : 'text-slate-500'}`}>{d.status ? 'Logged' : 'No data'}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#252525] border border-white/10 p-2 rounded-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>)}
    </div>
  );
}

const REC_ICONS = {
  '🧩': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
  '📚': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
  '🚀': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.25)' },
  '🎯': { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.25)'  },
  '💤': { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.25)' },
};

function CareerRecommendations({ recommendations }) {
  const [status, setStatus] = useState({}); // id -> 'accepted' | 'done' | 'hidden'
  const [filter, setFilter] = useState('all');

  const riskMeta = (risk) => {
    if (risk === 'high')   return { label: 'High Risk',   bg: 'rgba(239,68,68,0.15)',   color: '#f87171',  border: 'rgba(239,68,68,0.25)'   };
    if (risk === 'medium') return { label: 'Medium Risk', bg: 'rgba(249,115,22,0.15)',  color: '#fb923c',  border: 'rgba(249,115,22,0.25)'  };
    return                        { label: 'Low Risk',    bg: 'rgba(16,185,129,0.12)',  color: '#34d399',  border: 'rgba(16,185,129,0.25)'  };
  };

  const visible = recommendations.filter(r => {
    if (status[r.id] === 'hidden') return false;
    if (filter === 'high')   return r.risk === 'high';
    if (filter === 'done')   return status[r.id] === 'done';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 8, background: 'rgba(15,18,30,0.6)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>AI prioritizes tips based on your goals, activity, and focus areas.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#475569', marginRight: 4 }}>Filter</span>
          {['all', 'high', 'done'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)', background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent', color: filter === f ? '#818cf8' : '#64748b' }}>
              {f === 'all' ? 'All' : f === 'high' ? 'High Risk' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((r, i) => {
          const rm   = riskMeta(r.risk);
          const ic   = REC_ICONS[r.icon] || REC_ICONS['🧩'];
          const done = status[r.id] === 'done';
          const acc  = status[r.id] === 'accepted';
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, opacity: done ? 0.6 : 1, transition: 'opacity 0.2s' }}>

              {/* Icon box */}
              <div style={{ width: 56, height: 56, borderRadius: 14, background: ic.bg, border: `1px solid ${ic.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{r.icon}</div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: done ? '#64748b' : '#f1f5f9', marginBottom: 5, textDecoration: done ? 'line-through' : 'none' }}>{r.title}</p>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>{r.text}</p>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: acc ? undefined : 'accepted' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: acc ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.08)', border: `1px solid ${acc ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`, color: '#34d399' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Accept
                  </button>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: done ? undefined : 'done' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: done ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, color: done ? '#818cf8' : '#64748b' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/>{done && <polyline points="9 11 12 14 20 6"/>}</svg>
                    Mark Done
                  </button>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: 'hidden' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 15l-3-3m0 0l3-3m-3 3h10"/></svg>
                    Not helpful
                  </button>
                </div>
              </div>

              {/* Risk + Confidence + Arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>{rm.label}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>{r.confidence}% confidence</span>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
            </motion.div>
          );
        })}
        {visible.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#334155', fontSize: 13 }}>No tips for this filter.</div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Career() {
  useAuth();
  const { career, health, records, updateDomain, addRecords, setRecords, computed } = useData();
  const [tab, setTab] = useState('brain');

  // Static career state
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };
  const score = computed?.careerScore?.score || 0;

  // User skills: prefer resume-parsed skills, fall back to career profile skills
  const userSkills = useMemo(() => {
    const resumeData = loadResumeData();
    if (resumeData?.skills?.length) return resumeData.skills;
    return c.skills || [];
  }, [c.skills]);

  // Study session state
  const [sessions, setSessions] = useState([]);
  const [heatmapData, setHeatmapData] = useState({ heatmap: [], totalXP: 0, environmentData: [], forgettingCurve: [] });
  const [statsData, setStatsData] = useState({ totalMinutes: 0, totalXP: 0, totalSessions: 0, streak: 0, bestTopic: '—' });
  const [loading, setLoading] = useState(false);
  const [impactSession, setImpactSession] = useState(null);

  // Log form state
  const TOPICS = ['Data Structures', 'Algorithms', 'System Design', 'Frontend', 'Backend', 'Machine Learning', 'DevOps', 'Database', 'Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics', 'Other'];
  const ENVS = [{ id: 'HOME', icon: '🏠', label: 'Home' }, { id: 'LIBRARY', icon: '📚', label: 'Library' }, { id: 'CAFE', icon: '☕', label: 'Café' }, { id: 'GROUP', icon: '👥', label: 'Group' }];
  const [logForm, setLogForm] = useState({ durationMinutes: 30, topic: 'Data Structures', category: '', focusQuality: 3, mentalFatigue: 3, environment: 'HOME' });
  const [logging, setLogging] = useState(false);

  // Learning Path state
  const savedPath = career?.generatedLearningPath || null;
  const [lpCurrentRole, setLpCurrentRole] = useState(career?.currentRole || '');
  const [lpTargetRole, setLpTargetRole] = useState(career?.targetRole || '');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpResult, setLpResult] = useState(savedPath);

  // Old-style career log state
  const careerRecords = records?.career || [];
  const [careerForm, setCareerForm] = useState({ studyHours: '', codingHours: '', dsa: '', skill: '', projects: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h, st] = await Promise.all([getSessions(), getHeatmap(), getStats()]);
      setSessions(s);
      setHeatmapData(h);
      setStatsData(st);
    } catch {
      // silently handled in service
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]); // eslint-disable-line react-hooks/set-state-in-effect

  // Load career records from backend on mount (for real users)
  useEffect(() => {
    if (!careerApi.isEnabled()) return;
    careerApi.getAll()
      .then(recs => { if (recs.length > 0) setRecords('career', recs); })
      .catch(err => console.warn('Career: backend load failed:', err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cognitive load calculation: study hours today + inverse sleep + mental stress
  const cognitiveLoad = useMemo(() => {
    const todaySessions = sessions.filter(s => {
      const d = (s.sessionDate || s.createdAt || '').split('T')[0];
      return d === new Date().toISOString().split('T')[0];
    });
    const todayMins = todaySessions.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const studyLoad = Math.min(50, (todayMins / 240) * 50);
    const sleepLoad = health?.sleepAvg ? Math.max(0, (8 - health.sleepAvg) * 5) : 15;
    const stressLoad = health?.stressLevel ? health.stressLevel * 3.5 : 15;
    return Math.min(100, studyLoad + sleepLoad + stressLoad);
  }, [sessions, health]);

  const skillRadar = [
    { subject: 'DSA', A: Math.min(100, c.dsaPractice * 33) },
    { subject: 'Projects', A: Math.min(100, c.projectsCompleted * 20) },
    { subject: 'Skills', A: Math.min(100, c.skills.length * 16) },
    { subject: 'Study', A: Math.min(100, c.studyHoursDaily * 16) },
    { subject: 'Coding', A: Math.min(100, c.codingHoursDaily * 20) },
    { subject: 'GPA', A: Math.min(100, c.gpa * 11) },
  ];

  const placementReadiness = Math.round(
    (c.dsaPractice >= 3 ? 25 : c.dsaPractice * 8) +
    (c.projectsCompleted >= 4 ? 25 : c.projectsCompleted * 6) +
    (c.skills.length >= 5 ? 25 : c.skills.length * 5) +
    (c.codingHoursDaily >= 4 ? 25 : c.codingHoursDaily * 6)
  );

  const handleLogSession = async () => {
    if (!logForm.topic) { showToast('Select a topic', 'error'); return; }
    setLogging(true);
    try {
      const result = await logSession(logForm);
      showToast(`Session logged! +${result.xpEarned} XP`, 'success');
      setImpactSession(result);
      await loadData();
      // Also update career domain for cross-domain effects
      const todayHours = (logForm.durationMinutes / 60);
      updateDomain('career', { ...c, studyHoursDaily: Math.max(c.studyHoursDaily, parseFloat(todayHours.toFixed(1))) });
      addRecords('career', [{ date: new Date().toISOString(), studyHours: todayHours, topic: logForm.topic }]);
      // Persist to backend
      if (careerApi.isEnabled()) {
        try {
          await careerApi.create({ date: new Date().toISOString(), studyHours: todayHours, skillLearned: logForm.topic });
        } catch (err) { console.warn('Career: session backend save failed:', err.message); }
      }
    } catch {
      showToast('Failed to log session', 'error');
    } finally {
      setLogging(false);
    }
  };

  const handleCareerLog = async (e) => {
    e.preventDefault();
    const updated = { ...c };
    const record = { date: new Date().toISOString() };
    let changes = 0;
    if (careerForm.studyHours)  { updated.studyHoursDaily  = parseFloat(careerForm.studyHours);  record.studyHours  = parseFloat(careerForm.studyHours);  changes++; }
    if (careerForm.codingHours) { updated.codingHoursDaily = parseFloat(careerForm.codingHours); record.codingHours = parseFloat(careerForm.codingHours); changes++; }
    if (careerForm.dsa)         { updated.dsaPractice      = parseInt(careerForm.dsa);           record.dsaProblems = parseInt(careerForm.dsa);           changes++; }
    if (careerForm.projects)    { updated.projectsCompleted = parseInt(careerForm.projects);     record.projects    = parseInt(careerForm.projects);      changes++; }
    if (careerForm.skill && !updated.skills.includes(careerForm.skill.trim())) {
      updated.skills = [...(updated.skills || []), careerForm.skill.trim()];
      record.skillLearned = careerForm.skill.trim();
      changes++;
    }
    if (changes === 0) { showToast('Fill at least one field', 'error'); return; }
    updateDomain('career', updated);
    addRecords('career', [record]);
    setCareerForm({ studyHours: '', codingHours: '', dsa: '', skill: '', projects: '' });
    showToast(`Career data saved (${changes} field${changes > 1 ? 's' : ''})`, 'success');
    // Persist to backend
    if (careerApi.isEnabled()) {
      try { await careerApi.create(record); }
      catch (err) { console.warn('Career: backend save failed:', err.message); }
    }
  };

  const handleGenerateLearningPath = async (e) => {
    e?.preventDefault?.();
    if (!lpCurrentRole.trim() || !lpTargetRole.trim()) { showToast('Enter both roles', 'error'); return; }
    setLpLoading(true); setLpResult(null);
    try {
      const result = await generateLearningPath(lpCurrentRole.trim(), lpTargetRole.trim());
      setLpResult(result);
      updateDomain('career', { ...c, currentRole: lpCurrentRole.trim(), targetRole: lpTargetRole.trim(), generatedLearningPath: result });
      showToast('Learning path generated!', 'success');
    } catch { showToast('Failed to generate path', 'error'); }
    finally { setLpLoading(false); }
  };

  const tabs = [
    { id: 'brain',        label: 'Brain Twin',      icon: '🧠' },
    { id: 'jobs',         label: 'Job Market',       icon: '💼' },
    { id: 'intelligence', label: 'Intelligence',     icon: '🎯' },
    { id: 'log',          label: 'Log Session',      icon: '⚡' },
    { id: 'history',      label: 'History',          icon: '📊' },
    { id: 'recommendations', label: 'AI Tips',       icon: '🤖' },
    { id: 'roadmap',      label: 'Learning Path',    icon: '🗺️' },
    { id: 'resume',       label: 'Resume AI',        icon: '📄' },
  ];

  const ENV_COLORS = { HOME: '#3b82f6', LIBRARY: '#8b5cf6', CAFE: '#f59e0b', GROUP: '#10b981' };

  const recentLogs = [...careerRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const missingSkills = ['TypeScript', 'Docker', 'AWS', 'System Design', 'MongoDB', 'GraphQL', 'Kubernetes', 'Redis', 'Next.js', 'Go'].filter(s => !c.skills.includes(s));

  const recommendations = [
    { id: 'career-skills', icon: '🧩', title: 'Skill Gap', text: c.skills.length < 5 ? `You have ${c.skills.length} skills. Add: ${missingSkills.slice(0, 3).join(', ')}.` : 'Strong skill set! Deepen 2-3 core skills.', risk: c.skills.length < 4 ? 'high' : 'low', confidence: c.skills.length < 5 ? 88 : 80 },
    { id: 'career-dsa', icon: '📚', title: 'DSA Strategy', text: c.dsaPractice < 3 ? `Increase to 3-5 problems/day. Focus: Arrays → Trees → Graphs → DP.` : 'Great! Add timed mock contests for pressure simulation.', risk: c.dsaPractice < 2 ? 'high' : 'low', confidence: 85 },
    { id: 'career-projects', icon: '🚀', title: 'Projects', text: c.projectsCompleted < 4 ? `${c.projectsCompleted} projects. Build: 1 full-stack, 1 ML/AI, 1 open-source.` : 'Strong portfolio! Add demos and deploy for visibility.', risk: 'medium', confidence: 82 },
    { id: 'career-placement', icon: '🎯', title: 'Placement Readiness', text: `${placementReadiness}% ready. ${placementReadiness < 60 ? 'Focus on DSA and projects.' : 'Practice mock interviews to build confidence.'}`, risk: placementReadiness < 50 ? 'high' : 'low', confidence: 90 },
    { id: 'career-sleep', icon: '💤', title: 'Sleep & Learning', text: (health?.sleepAvg || 7) < 6 ? `Low sleep (${health?.sleepAvg || '?'}h) cuts effective study by 40%. Your ${c.studyHoursDaily}h may yield only ${Math.round(c.studyHoursDaily * 0.6)}h of actual retention.` : 'Good sleep! Your study sessions are running efficiently.', risk: (health?.sleepAvg || 7) < 6 ? 'high' : 'low', confidence: 78 },
  ];

  const roadmap = [
    { phase: 'Foundation', items: ['Data Structures & Algorithms', 'OOP', 'Databases', 'Git'], status: c.dsaPractice >= 2 ? 'done' : 'active' },
    { phase: 'Core Skills', items: ['Frontend (React)', 'Backend (Node/Spring)', 'REST/GraphQL', 'Testing'], status: c.skills.length >= 4 ? 'done' : c.dsaPractice >= 2 ? 'active' : 'locked' },
    { phase: 'Projects', items: ['Full-Stack App', 'ML/AI Project', 'Open Source', 'Tech Blog'], status: c.projectsCompleted >= 3 ? 'done' : c.skills.length >= 4 ? 'active' : 'locked' },
    { phase: 'Interview Prep', items: ['250+ DSA', 'System Design', 'Mock Interviews', 'Resume'], status: c.projectsCompleted >= 3 ? 'active' : 'locked' },
  ];

  const platformColor = (p) => p === 'Coursera' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : p === 'Udemy' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <AnimatePresence>
        {impactSession && <TwinImpactFeed session={impactSession} onDone={() => { setImpactSession(null); setTab('history'); }} />}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f3', margin: 0, letterSpacing: '-0.02em' }}>Career &amp; Growth</h1>
        <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>Study smarter — every session builds your digital twin.</p>
      </div>

      {/* ── Custom Pill Tab Bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              background: tab === t.id ? 'rgba(139,92,246,0.85)' : 'rgba(37,37,37,0.8)',
              color: tab === t.id ? '#ffffff' : '#9b9b9b',
              boxShadow: tab === t.id ? '0 4px 15px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BRAIN TWIN TAB ─────────────────────────────────────────────────── */}
      {tab === 'brain' && (() => {
        const bCard = {background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14};
        const scoreColor = score>=70?'#10b981':score>=45?'#8b5cf6':'#f43f5e';
        const radarWithIdeal = skillRadar.map(d => ({...d, full:100}));
        const loadColor = cognitiveLoad<40?'#10b981':cognitiveLoad<70?'#f59e0b':'#f43f5e';
        const loadLabel = cognitiveLoad<40?'Low Load':cognitiveLoad<70?'Moderate':'High Load';
        const STAT_CARDS = [
          {icon:'⚡', label:'TOTAL XP',    value:statsData.totalXP.toLocaleString(),              sub:'Level 1'},
          {icon:'🔥', label:'STREAK',      value:`${statsData.streak}d`,                          sub:'Keep it going!'},
          {icon:'🕐', label:'TOTAL STUDY', value:`${Math.round(statsData.totalMinutes/60)}h`,     sub:'This week'},
          {icon:'📅', label:'SESSIONS',    value:String(statsData.totalSessions),                  sub:'This week'},
          {icon:'🏆', label:'BEST TOPIC',  value:statsData.bestTopic||'—',                        sub:statsData.bestTopic?'Top performer':'Not enough data'},
        ];
        return (
          <div style={{display:'flex', flexDirection:'column', gap:8}}>

            {/* ── Row 1: Stats strip ── */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8}}>
              {/* Score ring */}
              <div style={{...bCard, padding:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6}}>
                <div style={{position:'relative', width:62, height:62}}>
                  <svg viewBox="0 0 62 62" width="62" height="62">
                    <circle cx="31" cy="31" r="25" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                    <circle cx="31" cy="31" r="25" fill="none" stroke={scoreColor} strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*25} ${2*Math.PI*25}`}
                      strokeDashoffset={2*Math.PI*25*(1-score/100)}
                      style={{transform:'rotate(-90deg)', transformOrigin:'31px 31px', transition:'stroke-dashoffset 1s ease'}}/>
                  </svg>
                  <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                    <span style={{fontSize:15, fontWeight:900, color:'#fff', lineHeight:1}}>{score}</span>
                    <span style={{fontSize:7, color:'#475569'}}>/ 100</span>
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:10, fontWeight:600, color:'#94a3b8', marginBottom:1}}>Career Score</p>
                  <p style={{fontSize:9, color:'#10b981'}}>↑ {Math.max(0, Math.round(score*0.11))} this week</p>
                </div>
              </div>
              {/* Metric cards */}
              {STAT_CARDS.map(m => (
                <div key={m.label} style={{...bCard, padding:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, textAlign:'center'}}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  <p style={{fontSize:8, fontWeight:700, color:'#475569', letterSpacing:'0.08em', textTransform:'uppercase'}}>{m.label}</p>
                  <p style={{fontSize:17, fontWeight:800, color:'#f1f5f9', lineHeight:1}}>{m.value}</p>
                  <p style={{fontSize:9, color:'#64748b'}}>{m.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Row 2: Three cards ── */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>

              {/* Cognitive Load Meter */}
              <div style={{...bCard, padding:'14px'}}>
                <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:2}}>Cognitive Load Meter</p>
                <p style={{fontSize:11, color:'#64748b', marginBottom:6}}>Based on today's study, sleep & stress</p>
                <div style={{display:'flex', justifyContent:'center'}}>
                  <CognitiveGauge value={cognitiveLoad} />
                </div>
                <div style={{textAlign:'center', marginBottom:10}}>
                  <p style={{fontSize:22, fontWeight:800, color:'#f1f5f9', lineHeight:1}}>{Math.round(cognitiveLoad)}</p>
                  <p style={{fontSize:10, color:'#475569'}}>/ 100</p>
                  <p style={{fontSize:11, fontWeight:600, color:loadColor, marginTop:3}}>{loadLabel}</p>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:10}}>
                  {[['< 40','#10b981','Optimal'],['40 – 70','#f59e0b','Moderate'],['> 70','#f43f5e','Burnout Risk']].map(([v,c,l]) => (
                    <div key={l} style={{padding:'5px 4px', borderRadius:7, background:c+'12', textAlign:'center'}}>
                      <p style={{fontSize:10, fontWeight:700, color:c}}>{v}</p>
                      <p style={{fontSize:9, color:'#64748b'}}>{l}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:7, padding:'8px 10px', borderRadius:7, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                  <span style={{fontSize:12, flexShrink:0}}>✨</span>
                  <p style={{fontSize:11, color:'#94a3b8', lineHeight:1.4}}>
                    {cognitiveLoad<40?"Great! You're in a good zone to learn deeply.":cognitiveLoad<70?"Manageable load. Take breaks every 45 min.":"High load! Rest before your next session."}
                  </p>
                </div>
              </div>

              {/* Skill Radar */}
              <div style={{...bCard, padding:'14px', display:'flex', flexDirection:'column'}}>
                <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:2}}>Skill Radar</p>
                <p style={{fontSize:11, color:'#64748b', marginBottom:8}}>Your overall skill distribution</p>
                <div style={{flex:1, minHeight:180}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarWithIdeal}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="subject" tick={{fill:'#94a3b8', fontSize:10}} />
                      <Radar name="You" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Ideal" dataKey="full" stroke="rgba(255,255,255,0.2)" fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <span style={{width:12, height:2, background:'#8b5cf6', display:'inline-block', borderRadius:1}}/>
                    <span style={{fontSize:10, color:'#94a3b8'}}>You</span>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <span style={{width:12, height:1, background:'rgba(255,255,255,0.3)', display:'inline-block', borderTop:'1px dashed rgba(255,255,255,0.3)'}}/>
                    <span style={{fontSize:10, color:'#94a3b8'}}>Ideal</span>
                  </div>
                </div>
                <button onClick={()=>setTab('recommendations')} style={{padding:'8px 0', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                  View all skills →
                </button>
              </div>

              {/* Skills Portfolio */}
              <div style={{...bCard, padding:'14px', display:'flex', flexDirection:'column'}}>
                <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:2}}>Skills Portfolio</p>
                <p style={{fontSize:11, color:'#64748b', marginBottom:10}}>Showcase your skills and progress</p>
                {c.skills.length > 0 ? (
                  <div style={{flex:1, display:'flex', flexWrap:'wrap', gap:6, alignContent:'flex-start'}}>
                    {c.skills.map(s => (
                      <span key={s} style={{padding:'3px 10px', borderRadius:999, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', fontSize:11, color:'#93c5fd', fontWeight:500}}>{s}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8}}>
                    <div style={{width:54, height:54, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22}}>📄</div>
                    <p style={{fontSize:13, fontWeight:600, color:'#f1f5f9'}}>{c.skills.length} Skills Logged</p>
                    <p style={{fontSize:11, color:'#64748b', textAlign:'center'}}>Add your first skill to get started.</p>
                  </div>
                )}
                <button onClick={()=>setTab('log')} style={{marginTop:10, padding:'8px 0', borderRadius:7, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                  + Add Skill
                </button>
              </div>
            </div>

            {/* ── Tip bar ── */}
            <div style={{...bCard, padding:'10px 16px', display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:13, flexShrink:0}}>💡</span>
              <p style={{fontSize:11, color:'#94a3b8'}}>Tip: Consistent small steps lead to massive growth. Log sessions regularly to track your progress.</p>
            </div>

            {/* Forgetting Curve (conditional) */}
            {heatmapData.forgettingCurve?.length > 0 && (
              <div style={{...bCard, padding:'20px'}}>
                <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:3}}>Forgetting Curve — Topic Retention</p>
                <p style={{fontSize:12, color:'#64748b', marginBottom:14}}>Topics lose ~20% retention per day without review</p>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {heatmapData.forgettingCurve.map((t, i) => (
                    <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                      <span style={{fontSize:12, color:'#cbd5e1', width:120, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.topic}</span>
                      <div style={{flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden'}}>
                        <motion.div initial={{width:0}} animate={{width:`${t.retention}%`}} transition={{delay:i*0.05, duration:0.8}}
                          style={{height:'100%', borderRadius:3, background:t.retention>60?'#10b981':t.retention>30?'#f59e0b':'#f43f5e'}}/>
                      </div>
                      <span style={{fontSize:11, fontFamily:'monospace', width:36, textAlign:'right', color:t.retention>60?'#10b981':t.retention>30?'#f59e0b':'#f43f5e'}}>{t.retention}%</span>
                      <span style={{fontSize:10, color:'#475569', width:40}}>{t.daysSince}d ago</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── LOG SESSION TAB ─────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── Smart Study Logger ── */}
          <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 28px 24px' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Smart Study Logger</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 28 }}>Track focused sessions and stay consistent.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Duration slider */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Duration</label>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 8, padding: '4px 14px' }}>
                    {logForm.durationMinutes >= 60 ? `${Math.floor(logForm.durationMinutes/60)}h${logForm.durationMinutes%60>0?` ${logForm.durationMinutes%60}m`:''}` : `${logForm.durationMinutes} min`}
                  </span>
                </div>
                <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
                  {/* Track background */}
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
                  {/* Filled portion */}
                  <div style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${((logForm.durationMinutes - 5) / (240 - 5)) * 100}%`, transition: 'width 0.1s' }} />
                  <input type="range" min="5" max="240" step="5" value={logForm.durationMinutes}
                    onChange={e => setLogForm(p => ({ ...p, durationMinutes: +e.target.value }))}
                    style={{ position: 'relative', width: '100%', accentColor: '#6366f1', cursor: 'pointer', background: 'transparent', zIndex: 1, margin: 0 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['5 min', '1 hr', '2 hr', '4 hr'].map(l => (
                    <span key={l} style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{l}</span>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Topic</label>
                <select value={logForm.topic} onChange={e => setLogForm(p => ({ ...p, topic: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  {TOPICS.map(t => <option key={t} value={t} style={{ background: '#1a1f2e' }}>{t}</option>)}
                </select>
              </div>

              {/* Where did you study */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 10 }}>Where did you study?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {ENVS.map(env => (
                    <button key={env.id} onClick={() => setLogForm(p => ({ ...p, environment: env.id }))}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 10, border: logForm.environment===env.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', background: logForm.environment===env.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 18 }}>{env.icon}</span>
                      <span style={{ fontSize: 11, color: logForm.environment===env.id ? '#a5b4fc' : '#64748b', fontWeight: 500 }}>{env.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Quality */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Focus Quality</label>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{['','😴 Distracted','😐 Low','🙂 Moderate','😊 High','🔥 Peak'][logForm.focusQuality]}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setLogForm(p => ({ ...p, focusQuality: v }))}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: logForm.focusQuality===v ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', background: logForm.focusQuality===v ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)', color: logForm.focusQuality===v ? '#a5b4fc' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#334155' }}>
                  <span>Low</span><span>Moderate</span><span>High</span>
                </div>
              </div>

              {/* Mental Fatigue */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Mental Fatigue</label>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{['','😊 Fresh','🙂 Light','😐 Moderate','😓 Tired','🤯 Exhausted'][logForm.mentalFatigue]}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setLogForm(p => ({ ...p, mentalFatigue: v }))}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: logForm.mentalFatigue===v ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)', background: logForm.mentalFatigue===v ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', color: logForm.mentalFatigue===v ? '#fca5a5' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#334155' }}>
                  <span>Low</span><span>Moderate</span><span>High</span>
                </div>
              </div>

              <button onClick={handleLogSession} disabled={logging}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: logging ? 'not-allowed' : 'pointer', opacity: logging ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                ⚡ {logging ? 'Logging...' : 'Log Session'}
              </button>
            </div>
          </div>

          {/* ── Career Metrics Logger ── */}
          <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 28px 24px' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Career Metrics Logger</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Update your progress and build your career profile.</p>

            <form onSubmit={handleCareerLog} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { icon: '🕐', label: 'Study Hours Today',  key: 'studyHours',  unit: 'hrs',      type: 'number', placeholder: '4',   step: '0.5' },
                { icon: '💻', label: 'Coding Hours Today', key: 'codingHours', unit: 'hrs',      type: 'number', placeholder: '3',   step: '0.5' },
                { icon: '{}', label: 'DSA Problems Solved',key: 'dsa',         unit: 'problems', type: 'number', placeholder: '3',   step: '1'   },
                { icon: '🏆', label: 'Projects Completed', key: 'projects',    unit: 'projects', type: 'number', placeholder: c.projectsCompleted||'2', step: '1' },
              ].map(row => (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{row.icon}</div>
                  <span style={{ flex: 1, fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{row.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type={row.type} value={careerForm[row.key]} placeholder={row.placeholder}
                      onChange={e => setCareerForm(p => ({ ...p, [row.key]: e.target.value }))}
                      step={row.step} min="0"
                      style={{ width: 60, padding: '8px 10px', background: 'none', border: 'none', color: '#f1f5f9', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'right' }} />
                    <span style={{ padding: '8px 10px 8px 4px', fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{row.unit}</span>
                  </div>
                </div>
              ))}

              {/* Add Skill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>+</div>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>Add New Skill</span>
                <input type="text" value={careerForm.skill} placeholder="e.g. Docker, Kubernetes"
                  onChange={e => setCareerForm(p => ({ ...p, skill: e.target.value }))}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                <span style={{ fontSize: 16, color: '#475569' }}>›</span>
              </div>

              <button type="submit" style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Save Career Data ✓
              </button>
            </form>

            {recentLogs.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Logs</p>
                {recentLogs.slice(0, 3).map((entry, i) => {
                  const parts = [];
                  if (entry.studyHours != null) parts.push(`📚 ${entry.studyHours}h`);
                  if (entry.codingHours != null) parts.push(`💻 ${entry.codingHours}h`);
                  if (entry.dsa != null) parts.push(`🧩 ${entry.dsa} DSA`);
                  if (entry.skillAdded) parts.push(`+${entry.skillAdded}`);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace' }}>{new Date(entry.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{parts.map((p,j) => <span key={j} style={{ fontSize: 12, color: '#64748b' }}>{p}</span>)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (() => {
        const totalStudyH = Math.round((statsData.totalMinutes || 0) / 60);
        const avgDailyH   = statsData.totalSessions > 0 ? (totalStudyH / Math.max(1, statsData.totalSessions)).toFixed(1) : '0';
        const consistencyScore = Math.min(100, Math.round(
          (statsData.streak > 0 ? Math.min(40, statsData.streak * 3) : 0) +
          (statsData.totalSessions > 0 ? Math.min(40, statsData.totalSessions * 2) : 0) +
          (totalStudyH > 0 ? Math.min(20, totalStudyH) : 0)
        ));
        const circ = 2 * Math.PI * 54;

        const INSIGHTS = [
          { icon: '📅', label: 'Most Productive Day', value: heatmapData.bestDay || 'Tuesday',   bg: 'rgba(59,130,246,0.15)',  ic: '#60a5fa' },
          { icon: '🌙', label: 'Peak Study Time',     value: '8 PM – 10 PM',                      bg: 'rgba(99,102,241,0.15)',  ic: '#818cf8' },
          { icon: '🔥', label: 'Best Streak',          value: `${statsData.streak || 0} Days`,    bg: 'rgba(249,115,22,0.15)', ic: '#fb923c' },
          { icon: '📈', label: 'Avg Daily Focus',      value: `${avgDailyH} hrs`,                  bg: 'rgba(16,185,129,0.15)', ic: '#34d399' },
        ];

        // Build 6-month study hours trend from sessions
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const trendData = Array.from({length:6},(_,i)=>{
          const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const hrs = sessions.filter(s=>{
            const sd = new Date(s.createdAt||s.sessionDate||Date.now());
            return `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}` === key;
          }).reduce((sum,s)=>sum+(s.durationMinutes||0)/60,0);
          return { month: months[d.getMonth()], hours: Math.round(hrs) };
        });

        const card = (children, extra={}) => ({
          background:'rgba(15,18,30,0.95)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, ...extra, children
        });

        return (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* ── STAT CARDS ── */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                {icon:'⚡',label:'Total XP',         value:(heatmapData.totalXP||0).toLocaleString(), sub:'+180 this month', color:'#f59e0b'},
                {icon:'🔥',label:'Current Streak',   value:`${statsData.streak||0} Days`,              sub:`Best: ${statsData.streak||0} Days`, color:'#f43f5e'},
                {icon:'🕐',label:'Total Study Time', value:`${totalStudyH}h`,                          sub:'+24h this month', color:'#6366f1'},
                {icon:'📖',label:'Sessions Completed',value:statsData.totalSessions||0,                sub:'+9 this month', color:'#8b5cf6'},
              ].map(s=>(
                <div key={s.label} style={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'20px 22px',display:'flex',alignItems:'center',gap:16}}>
                  <div style={{width:46,height:46,borderRadius:12,background:s.color+'20',border:`1px solid ${s.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{s.icon}</div>
                  <div>
                    <p style={{fontSize:10,color:'#475569',fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',marginBottom:4}}>{s.label}</p>
                    <p style={{fontSize:26,fontWeight:900,color:'#f1f5f9',lineHeight:1}}>{s.value}</p>
                    <p style={{fontSize:11,color:'#10b981',marginTop:4}}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── HEATMAP + INSIGHTS ROW ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:8}}>

              {/* Heatmap card — heatmap left, ring fills remaining space */}
              <div style={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'22px 24px',display:'flex',flexDirection:'column'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:18}}>
                  <span style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Focus Heatmap</span>
                  <span style={{fontSize:13,color:'#475569'}}>(Last 90 Days)</span>
                  <span title="Each square = one day. Darker = more study time." style={{fontSize:12,color:'#334155',cursor:'help'}}>ⓘ</span>
                </div>
                {/* Row: heatmap + ring side by side */}
                <div style={{display:'flex',alignItems:'center',gap:0,flex:1}}>
                  {/* Heatmap — natural size */}
                  <div style={{flexShrink:0}}>
                    {loading
                      ? <div style={{height:100,width:220,display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize:13}}>Loading…</div>
                      : <FocusHeatmap heatmap={heatmapData.heatmap} />
                    }
                  </div>
                  {/* Ring — fills remaining space, centered */}
                  <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
                    <div style={{position:'relative',width:140,height:140}}>
                      <svg width="140" height="140" viewBox="0 0 140 140" style={{transform:'rotate(-90deg)'}}>
                        <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
                        <circle cx="70" cy="70" r="58" fill="none" stroke="#6366f1" strokeWidth="10"
                          strokeDasharray={`${(consistencyScore/100)*(2*Math.PI*58)} ${2*Math.PI*58}`} strokeLinecap="round"
                          style={{transition:'stroke-dasharray 1s ease'}}/>
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:32,fontWeight:900,color:'#f1f5f9',lineHeight:1}}>{consistencyScore}%</span>
                      </div>
                    </div>
                    <p style={{fontSize:14,fontWeight:600,color:'#94a3b8'}}>Consistency Score</p>
                    <p style={{fontSize:12,color:'#10b981'}}>↑ +12% this month</p>
                  </div>
                </div>
              </div>

              {/* Learning Insights */}
              <div style={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'22px 20px',marginLeft:-16}}>
                <p style={{fontSize:15,fontWeight:700,color:'#f1f5f9',marginBottom:20}}>Learning Insights</p>
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {INSIGHTS.map((ins,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:14}}>
                      <div style={{width:40,height:40,borderRadius:10,background:ins.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{ins.icon}</div>
                      <div>
                        <p style={{fontSize:11,color:'#64748b',marginBottom:3}}>{ins.label}</p>
                        <p style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>{ins.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ACTIVITY + TREND ROW ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

              {/* Recent Learning Activity */}
              <div style={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'22px 24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <p style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Recent Learning Activity</p>
                  {sessions.length>4&&<button style={{fontSize:12,color:'#6366f1',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>View all sessions →</button>}
                </div>
                {sessions.length===0
                  ? <div style={{padding:'32px 0',textAlign:'center',color:'#334155',fontSize:13}}>No sessions yet — log your first session.</div>
                  : <div style={{position:'relative'}}>
                      {/* Vertical timeline line */}
                      <div style={{position:'absolute',left:4,top:8,bottom:8,width:2,background:'rgba(99,102,241,0.2)',borderRadius:1}}/>
                      {sessions.slice(0,4).map((s,i)=>(
                        <div key={s.id||i} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 0',borderBottom:i<3?'1px solid rgba(255,255,255,0.04)':'none',paddingLeft:4}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:'#6366f1',flexShrink:0,zIndex:1,marginLeft:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:11,color:'#475569',marginBottom:2}}>{new Date(s.createdAt||s.sessionDate||Date.now()).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}</p>
                            <p style={{fontSize:14,fontWeight:600,color:'#e2e8f0'}}>{s.topic}</p>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,color:'#818cf8',flexShrink:0}}>
                            {s.durationMinutes>=60?`${Math.floor(s.durationMinutes/60)} hr${s.durationMinutes%60>0?' '+s.durationMinutes%60+'m':''}`:s.durationMinutes+' min'}
                          </span>
                          <div style={{width:24,height:24,borderRadius:'50%',border:'1.5px solid #10b981',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Study Hours Trend */}
              <div style={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'22px 24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <p style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Study Hours Trend</p>
                    <span title="Monthly study hours" style={{fontSize:12,color:'#334155',cursor:'help'}}>ⓘ</span>
                  </div>
                  <span style={{fontSize:12,color:'#475569',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px'}}>This Year ▾</span>
                </div>
                <div style={{height:180}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{top:8,right:8,left:-20,bottom:0}}>
                      <defs>
                        <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="month" tick={{fill:'#475569',fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={v=>`${v}h`} contentStyle={{background:'rgba(15,18,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:12}} labelStyle={{color:'#94a3b8'}}/>
                      <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2.5} fill="url(#studyGrad)" dot={{r:4,fill:'#6366f1',strokeWidth:0}} activeDot={{r:5}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p style={{fontSize:12,color:'#10b981',marginTop:10}}>↑ 34% more study hours compared to last 5 months</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── RECOMMENDATIONS TAB ─────────────────────────────────────────────── */}
      {tab === 'recommendations' && <CareerRecommendations recommendations={recommendations} />}

      {/* ── LEARNING PATH TAB ───────────────────────────────────────────────── */}
      {tab === 'roadmap' && (() => {
        const PHASE_META = [
          { icon: '📦', bg: 'rgba(99,102,241,0.2)',  border: 'rgba(99,102,241,0.35)', skills: ['Python','Data Structures','SQL','Git'],        subs: ['Data Structures & Algorithms','Databases'],    desc: 'Build strong fundamentals in CS and programming.' },
          { icon: '</>', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  skills: ['React','Node.js','API Design','Testing'],       subs: ['Frontend (React)','REST/GraphQL'],             desc: 'Master full-stack development and core concepts.' },
          { icon: '🚀', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.3)',  skills: ['System Design','ML/AI Project','Tech Blog'],    subs: ['Full-Stack App','Open Source'],                desc: 'Apply your skills by building real-world projects.' },
          { icon: '👤', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)',  skills: ['System Design','Behavioral','Resume'],          subs: ['250+ DSA','Mock Interviews'],                  desc: 'Prepare thoroughly and land your dream role.' },
        ];

        const statusMeta = (s) => s === 'active'
          ? { label: 'Active', color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' }
          : s === 'done'
          ? { label: 'Done',   color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' }
          : { label: 'Locked', color: '#64748b', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Generator card ── */}
            <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>AI Learning Path Generator</p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>Enter your current and target roles for a personalized roadmap.</p>
                </div>
              </div>
              <form onSubmit={handleGenerateLearningPath} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Current Role</label>
                  <input type="text" value={lpCurrentRole} onChange={e => setLpCurrentRole(e.target.value)} placeholder="e.g. Software Engineer"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Target Role</label>
                  <input type="text" value={lpTargetRole} onChange={e => setLpTargetRole(e.target.value)} placeholder="e.g. Machine Learning Engineer"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={lpLoading}
                    style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: lpLoading ? 'not-allowed' : 'pointer', opacity: lpLoading ? 0.6 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {lpLoading ? <><div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" /> Building…</> : 'Generate Path 🚀'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Roadmap header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Your Personalized Roadmap</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                {lpResult ? 'AI Generated' : 'General'}
              </span>
              {lpResult && !lpLoading && (
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>
                  {lpResult.from} → {lpResult.to} · {lpResult.totalHours}h · {lpResult.totalCost}
                </span>
              )}
            </div>

            {/* Loading skeleton — same height as cards so no layout shift */}
            {lpLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 88, background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', opacity: 0.5 }} className="animate-pulse">
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '70%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Phase cards with timeline ── */}
            <div style={{ position: 'relative' }}>
              {/* Vertical dashed line */}
              <div style={{ position: 'absolute', left: 27, top: 40, bottom: 40, width: 2, borderLeft: '2px dashed rgba(255,255,255,0.1)' }} />

              {/* When AI result exists, show its phases; otherwise show static roadmap */}
              {(lpResult?.phases || roadmap).map((phase, i) => {
                const isAI    = !!lpResult?.phases;
                const meta    = PHASE_META[i] || PHASE_META[0];
                const sm      = isAI ? { label: 'AI', color: '#818cf8', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' } : statusMeta(phase.status);
                const isLocked = !isAI && phase.status === 'locked';
                const phaseName = isAI ? phase.phase : phase.phase;
                const aiCourses = isAI ? (phase.courses || []) : [];

                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ display: 'flex', gap: 16, marginBottom: 10, opacity: isLocked ? 0.65 : 1 }}>
                    {/* Number circle */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: isLocked ? 'rgba(15,18,30,0.95)' : 'rgba(99,102,241,0.2)', border: `2px solid ${isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: isLocked ? '#475569' : '#818cf8', zIndex: 1 }}>
                        {i + 1}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{ flex: 1, background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        {/* Icon */}
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: meta.icon === '</>' ? 14 : 22, fontWeight: 800, color: '#f1f5f9', flexShrink: 0, fontFamily: 'monospace' }}>
                          {meta.icon}
                        </div>
                        {/* Title + desc */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{phaseName}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                          </div>
                          <p style={{ fontSize: 13, color: '#64748b', marginBottom: isAI && aiCourses.length ? 0 : 8 }}>{meta.desc}</p>
                          {!isAI && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {meta.subs.map((sub, si) => (
                                <span key={si} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                                  <span style={{ fontSize: 13 }}>📘</span>{sub}
                                  {si < meta.subs.length - 1 && <span style={{ color: '#334155', margin: '0 4px' }}>•</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Skills (static) or hours (AI) */}
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            {isAI ? 'Courses' : 'Skills included'}
                          </p>
                          {isAI
                            ? <p style={{ fontSize: 14, fontWeight: 700, color: '#818cf8' }}>{aiCourses.length} course{aiCourses.length !== 1 ? 's' : ''}</p>
                            : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 200 }}>
                                {meta.skills.map(sk => (
                                  <span key={sk} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 500 }}>{sk}</span>
                                ))}
                              </div>
                          }
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                      </div>

                      {/* AI course list inline — same card, no layout shift */}
                      {isAI && aiCourses.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {aiCourses.map((course, ci) => (
                            <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{course.title}</p>
                                <p style={{ fontSize: 11, color: '#475569' }}>⏱ {course.hours} hrs · {course.cost}</p>
                              </div>
                              <a href={course.url} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                Open →
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── How it works ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💡</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>How it works</p>
                <p style={{ fontSize: 13, color: '#64748b' }}>Our AI analyzes your goals, role, and progress to create a roadmap tailored for you.</p>
              </div>
              <button style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                Learn more →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── JOB MARKET TAB ───────────────────────────────────────────────────── */}
      {tab === 'jobs' && (
        <div className="space-y-4">
          {userSkills.length === 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] text-xs text-amber-300">
              <span className="text-base flex-shrink-0">💡</span>
              <span>
                <strong>Tip:</strong> Upload your resume (Resume tab) to see personalised match scores and skill-gap highlights on each job card.
              </span>
              <button onClick={() => setTab('resume')} className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 transition-all font-semibold whitespace-nowrap">
                Upload →
              </button>
            </div>
          )}
          <JobsTab userSkills={userSkills} />
        </div>
      )}

      {/* ── CAREER INTELLIGENCE TAB ──────────────────────────────────────────── */}
      {tab === 'intelligence' && (
        userSkills.length === 0 ? (
          <GlassCard className="text-center py-16 border border-white/[0.06]">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-[15px] font-semibold text-slate-200 mb-2">Connect Your Skills First</h3>
            <p className="text-[13px] text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
              Upload your resume or log career skills to unlock job-market matching, salary benchmarks, skill-gap analysis, and personalised AI career coaching.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setTab('resume')} className="btn-primary px-5 py-2.5 text-sm">
                Upload Resume →
              </button>
              <button onClick={() => setTab('log')} className="btn-secondary px-5 py-2.5 text-sm">
                Log Skills Manually
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-5">
              Resume skills auto-populate job match scores and skill-gap analysis.
            </p>
          </GlassCard>
        ) : (
          <CareerIntelligenceTab
            userSkills={userSkills}
            targetRole={c.targetRole || ''}
            health={health}
            computed={computed}
          />
        )
      )}

      {/* ── RESUME AI TAB ─────────────────────────────────────────────────────── */}
      {tab === 'resume' && (
        <ResumeTab career={c} updateDomain={updateDomain} />
      )}
    </div>
  );
}
