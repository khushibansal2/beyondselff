import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { careerApi } from '../services/backendApi';
import { ScoreRing, GlassCard, PageHeader, MetricCard, showToast, RecommendationCard } from '../components/ui/Components';
import { loadFeedback, sortByFeedback } from '../services/recommendationFeedbackService';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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
      <svg width="160" height="130" viewBox="0 0 160 130">
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
  const match = useMemo(() => calculateJobMatch(userSkills, job), [userSkills, job]);

  const scoreColor = match.score >= 80 ? '#10b981' : match.score >= 60 ? '#f59e0b' : '#f43f5e';
  const sourceStyle = { background: job.sourceColor + '18', border: `1px solid ${job.sourceColor}40`, color: job.sourceColor };
  const initials = (job.company || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <GlassCard className="group hover:border-white/[0.12] transition-all">
        <div className="flex items-start gap-3">
          {/* Company logo / initials */}
          <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
            {job.companyLogo
              ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = initials; }} />
              : <span className="text-[13px] font-black text-[#a1a1aa]">{initials}</span>
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#f0f0f3] truncate">{job.title}</p>
                <p className="text-[12px] text-[#a1a1aa]">{job.company}</p>
              </div>
              {/* Match score ring */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="relative w-9 h-9">
                  <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={scoreColor} strokeWidth="3"
                      strokeDasharray={`${match.score * 0.879} 87.9`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: scoreColor }}>{match.score}</span>
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin size={10} />{job.location}
              </span>
              {job.remote && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">Remote</span>}
              {job.salary && <span className="flex items-center gap-1 text-[11px] text-emerald-400"><DollarSign size={9} />{job.salary}</span>}
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold" style={sourceStyle}>{job.source}</span>
            </div>

            {/* Required skills */}
            {job.requiredSkills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {job.requiredSkills.slice(0, 6).map(s => {
                  const isMatched = match.matched.some(m => m.toLowerCase() === s.toLowerCase());
                  return (
                    <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      isMatched
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.07] text-slate-400'
                    }`}>{s}</span>
                  );
                })}
                {job.requiredSkills.length > 6 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.06] text-slate-400">+{job.requiredSkills.length - 6}</span>
                )}
              </div>
            )}

            {/* Missing skills count + CTA */}
            <div className="flex items-center gap-3 mt-3">
              {match.missing.length > 0 && (
                <span className="text-[11px] text-amber-500">⚠ {match.missing.length} skill{match.missing.length > 1 ? 's' : ''} missing</span>
              )}
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-[11px] px-3.5 py-1.5 rounded-xl bg-[#0f172a] border border-white/[0.1] text-[#a1a1aa] hover:text-white hover:border-white/[0.2] transition-all font-semibold">
                Apply <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
function JobsTab({ userSkills }) {
  const [query,     setQuery]     = useState('');
  const [location,  setLocation]  = useState('');
  const [jobs,      setJobs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('all');
  const [searched,  setSearched]  = useState(false);

  const SUGGESTIONS = useMemo(() => {
    if (userSkills?.length) {
      const hasReact = userSkills.some(s => /react/i.test(s));
      const hasPython = userSkills.some(s => /python/i.test(s));
      const hasML = userSkills.some(s => /machine learning|ml|ai/i.test(s));
      if (hasML)    return ['AI Engineer', 'ML Engineer', 'Data Scientist', 'LLM Developer'];
      if (hasPython) return ['Python Developer', 'Backend Engineer', 'Data Engineer', 'FastAPI Developer'];
      if (hasReact)  return ['React Developer', 'Frontend Engineer', 'Full Stack Developer', 'Next.js Developer'];
    }
    return ['Software Engineer', 'Full Stack Developer', 'React Developer', 'Backend Engineer'];
  }, [userSkills]);

  async function doSearch(q = query, loc = location) {
    if (!q.trim()) return;
    setLoading(true); setError(null); setJobs([]); setSearched(true);
    try {
      const results = await fetchJobs(q.trim(), { location: loc.trim() });
      // Enrich with match scores then sort
      const ranked = rankJobsByMatch(userSkills || [], results);
      setJobs(ranked);
    } catch (e) {
      if (e.message === 'NO_RESULTS') setError('No jobs found for this query. Try a broader search term.');
      else setError('Could not reach job APIs. Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'remote')   return jobs.filter(j => j.remote);
    if (filter === 'salary')   return jobs.filter(j => j.salary);
    if (filter === 'match80')  return jobs.filter(j => (j.match?.score ?? 0) >= 80);
    return jobs;
  }, [jobs, filter]);

  const sources = useMemo(() => [...new Set(jobs.map(j => j.source))], [jobs]);

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <GlassCard>
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-3">Live Job Market Search</p>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Role (e.g. React Developer, ML Engineer)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-[12px] text-[#f0f0f3] placeholder-[#6b7280] outline-none focus:border-blue-500/40 transition-colors" />
          </div>
          <div className="relative sm:w-44">
            <MapPin size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={location} onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Location (optional)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-[12px] text-[#f0f0f3] placeholder-[#6b7280] outline-none focus:border-blue-500/40 transition-colors" />
          </div>
          <button onClick={() => doSearch()} disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[12px] font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Suggestion chips */}
        {!searched && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-[10px] text-slate-400 self-center">Try:</span>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-[#a1a1aa] transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Source badges + filter */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {sources.map(src => (
                <span key={src} className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-white/[0.03] border-white/[0.08] text-slate-400">
                  {src} · {jobs.filter(j => j.source === src).length}
                </span>
              ))}
            </div>
            <div className="flex gap-1 ml-auto flex-wrap">
              {['all', 'remote', 'salary', 'match80'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${filter === f ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'border-white/[0.06] text-slate-400 hover:text-[#a1a1aa]'}`}>
                  {f === 'all' ? 'All' : f === 'remote' ? '🌐 Remote' : f === 'salary' ? '💰 Salary' : '🎯 80%+ Match'}
                </button>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <GlassCard key={i}>
              <div className="flex items-start gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.05] rounded-full w-2/3" />
                  <div className="h-3 bg-white/[0.04] rounded-full w-1/3" />
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3].map(j => <div key={j} className="h-5 w-16 bg-white/[0.04] rounded-full" />)}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <GlassCard className="text-center py-8 border border-rose-500/15">
          <AlertTriangle size={28} className="mx-auto mb-2 text-rose-400" />
          <p className="text-[13px] text-[#a1a1aa] font-semibold mb-1">Search Failed</p>
          <p className="text-[11px] text-slate-400">{error}</p>
          <button onClick={() => doSearch()} className="mt-4 px-4 py-2 rounded-xl border border-white/[0.1] text-[12px] text-[#a1a1aa] hover:text-white transition-all flex items-center gap-2 mx-auto">
            <RefreshCw size={12} /> Retry
          </button>
        </GlassCard>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <GlassCard className="text-center py-12">
          <Briefcase size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-[14px] font-semibold text-[#a1a1aa] mb-1">Real-time Job Market</p>
          <p className="text-[12px] text-slate-400">Powered by Arbeitnow · Remotive · Adzuna · JSearch</p>
          <p className="text-[11px] text-slate-400 mt-1">Enter a role above to search live job listings and see your match score on each card</p>
        </GlassCard>
      )}

      {/* No results */}
      {searched && !loading && !error && filtered.length === 0 && (
        <GlassCard className="text-center py-8">
          <p className="text-[13px] font-semibold text-[#a1a1aa] mb-1">No results for this filter</p>
          <button onClick={() => setFilter('all')} className="text-[12px] text-blue-400 hover:text-blue-300 transition-colors mt-1">Clear filter</button>
        </GlassCard>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-slate-400">{filtered.length} jobs{userSkills?.length ? ' · sorted by your skill match' : ''}</p>
            {userSkills?.length === 0 && (
              <p className="text-[11px] text-amber-400">Upload your resume to see match scores</p>
            )}
          </div>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} userSkills={userSkills || []} />
          ))}
        </div>
      )}
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

function CareerRecommendations({ recommendations }) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const feedback = loadFeedback();
  const sorted = sortByFeedback(recommendations, feedback);
  return (
    <div className="space-y-5">
      <p className="text-[11px] text-slate-400">Accept to prioritize · Mark Done · Not helpful to deprioritize</p>
      {sorted.map((r, i) => <RecommendationCard key={r.id} rec={r} index={i} feedback={feedback} onFeedback={forceUpdate} />)}
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
    e.preventDefault();
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
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f3', margin: 0, letterSpacing: '-0.02em' }}>Career &amp; Growth <span style={{ fontSize: 18 }}>📈</span></h1>
        <p style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Study smarter — every session builds your digital twin.</p>
      </div>

      {/* ── Custom Pill Tab Bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
      {tab === 'brain' && (
        <div className="space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1" glow="glow-blue">
              <ScoreRing score={score} color="auto" label="Career Score" size={100} />
            </GlassCard>
            <MetricCard icon="⚡" label="Total XP" value={statsData.totalXP.toLocaleString()} color="#f59e0b" />
            <MetricCard icon="🔥" label="Streak" value={`${statsData.streak}d`} color="#f43f5e" />
            <MetricCard icon="⏱" label="Total Study" value={`${Math.round(statsData.totalMinutes / 60)}h`} color="#3b82f6" />
            <MetricCard icon="📝" label="Sessions" value={statsData.totalSessions} color="#8b5cf6" />
            <MetricCard icon="🏆" label="Best Topic" value={statsData.bestTopic || '—'} color="#10b981" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cognitive Load Meter */}
            <GlassCard className="p-6 flex flex-col items-center" glow={cognitiveLoad > 70 ? 'glow-rose' : cognitiveLoad > 40 ? '' : 'glow-emerald'}>
              <h3 className="text-sm font-semibold mb-2 self-start">Cognitive Load Meter</h3>
              <p className="text-xs text-slate-500 mb-4 self-start">Based on today's study + sleep + stress</p>
              <CognitiveGauge value={cognitiveLoad} />
              <div className="grid grid-cols-3 gap-2 w-full mt-4 text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <p className="text-xs text-emerald-400 font-bold">&lt;40</p>
                  <p className="text-[10px] text-slate-400">Optimal</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <p className="text-xs text-amber-400 font-bold">40-70</p>
                  <p className="text-[10px] text-slate-400">Moderate</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <p className="text-xs text-rose-400 font-bold">&gt;70</p>
                  <p className="text-[10px] text-slate-400">Burnout Risk</p>
                </div>
              </div>
            </GlassCard>

            {/* Skill Radar */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-4">Skill Radar</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={skillRadar}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name="Skills" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Skills Portfolio */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-4">Skills Portfolio</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {c.skills.length > 0 ? c.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">{s}</span>
                )) : <p className="text-xs text-slate-500">No skills logged yet</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-2xl font-bold text-blue-400">{c.coursesActive}</p>
                  <p className="text-[10px] text-slate-500">Active Courses</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-2xl font-bold text-purple-400">{placementReadiness}%</p>
                  <p className="text-[10px] text-slate-500">Placement Ready</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Forgetting Curve */}
          {heatmapData.forgettingCurve?.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-1">Forgetting Curve — Topic Retention</h3>
              <p className="text-xs text-slate-500 mb-4">Topics lose ~20% retention per day without review</p>
              <div className="space-y-3">
                {heatmapData.forgettingCurve.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-32 truncate">{t.topic}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.retention}%` }}
                        transition={{ delay: i * 0.05, duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ background: t.retention > 60 ? '#10b981' : t.retention > 30 ? '#f59e0b' : '#f43f5e' }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right" style={{ color: t.retention > 60 ? '#10b981' : t.retention > 30 ? '#f59e0b' : '#f43f5e' }}>{t.retention}%</span>
                    <span className="text-[10px] text-slate-500 w-14">{t.daysSince}d ago</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── LOG SESSION TAB ─────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-white mb-0.5">Smart Study Logger</h3>
            <p className="text-xs text-slate-400 mb-6">Log a focus session — saved to your digital twin's database</p>

            <div className="space-y-6">
              {/* Duration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-200">Duration</label>
                  <span className="text-sm font-bold text-white bg-blue-500/15 border border-blue-500/30 px-3 py-1 rounded-lg">
                    {logForm.durationMinutes >= 60
                      ? `${Math.floor(logForm.durationMinutes / 60)}h${logForm.durationMinutes % 60 > 0 ? ` ${logForm.durationMinutes % 60}m` : ''}`
                      : `${logForm.durationMinutes} min`}
                  </span>
                </div>
                <input type="range" min="5" max="240" step="5" value={logForm.durationMinutes}
                  onChange={e => setLogForm(p => ({ ...p, durationMinutes: +e.target.value }))}
                  className="w-full accent-blue-500" />
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>5 min</span><span>1 hr</span><span>2 hr</span><span>4 hr</span>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="text-sm font-semibold text-slate-200 mb-2 block">Topic</label>
                <select value={logForm.topic} onChange={e => setLogForm(p => ({ ...p, topic: e.target.value }))}
                  className="input-premium w-full bg-[#1a1a1a]">
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Environment */}
              <div>
                <label className="text-sm font-semibold text-slate-200 mb-2.5 block">Where did you study?</label>
                <div className="grid grid-cols-4 gap-2">
                  {ENVS.map(env => (
                    <button key={env.id} onClick={() => setLogForm(p => ({ ...p, environment: env.id }))}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${logForm.environment === env.id ? 'border-blue-500/60 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'}`}>
                      <span className="text-xl">{env.icon}</span>
                      <span className="text-xs font-medium">{env.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Quality */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-semibold text-slate-200">Focus Quality</label>
                  <span className="text-sm font-medium text-white">{['', '😴 Distracted', '😐 Low', '🙂 Moderate', '😊 High', '🔥 Peak'][logForm.focusQuality]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => setLogForm(p => ({ ...p, focusQuality: v }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border ${logForm.focusQuality >= v ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/20'}`}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Mental Fatigue */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-semibold text-slate-200">Mental Fatigue</label>
                  <span className="text-sm font-medium text-white">{['', '😊 Fresh', '🙂 Light', '😐 Moderate', '😓 Tired', '🤯 Exhausted'][logForm.mentalFatigue]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => setLogForm(p => ({ ...p, mentalFatigue: v }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border ${logForm.mentalFatigue >= v ? 'bg-rose-500/20 border-rose-500/40 text-rose-200' : 'bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/20'}`}>{v}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleLogSession} disabled={logging}
                className="btn-primary w-full disabled:opacity-60 text-base py-3">
                {logging ? 'Logging...' : '⚡ Log Session'}
              </button>
            </div>
          </GlassCard>

          {/* Career Metrics Quick Log */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">Career Metrics Logger</h3>
            <p className="text-xs text-slate-400 mb-5">Update your overall career profile data</p>
            <form onSubmit={handleCareerLog} className="space-y-4">
              <div><label className="text-sm font-semibold text-slate-200 mb-2 block">Study Hours Today</label><input type="number" value={careerForm.studyHours} onChange={e => setCareerForm(p => ({ ...p, studyHours: e.target.value }))} className="input-premium w-full" placeholder="4" step="0.5" min="0" max="24" /></div>
              <div><label className="text-sm font-semibold text-slate-200 mb-2 block">Coding Hours Today</label><input type="number" value={careerForm.codingHours} onChange={e => setCareerForm(p => ({ ...p, codingHours: e.target.value }))} className="input-premium w-full" placeholder="3" step="0.5" min="0" max="24" /></div>
              <div><label className="text-sm font-semibold text-slate-200 mb-2 block">DSA Problems Solved</label><input type="number" value={careerForm.dsa} onChange={e => setCareerForm(p => ({ ...p, dsa: e.target.value }))} className="input-premium w-full" placeholder="3" min="0" /></div>
              <div><label className="text-sm font-semibold text-slate-200 mb-2 block">Projects Completed</label><input type="number" value={careerForm.projects} onChange={e => setCareerForm(p => ({ ...p, projects: e.target.value }))} className="input-premium w-full" placeholder={c.projectsCompleted || '2'} min="0" /></div>
              <div><label className="text-sm font-semibold text-slate-200 mb-2 block">Add New Skill</label><input type="text" value={careerForm.skill} onChange={e => setCareerForm(p => ({ ...p, skill: e.target.value }))} className="input-premium w-full" placeholder="e.g. Docker, Kubernetes" /></div>
              <button type="submit" className="btn-primary w-full">Save Career Data ✓</button>
            </form>

            {recentLogs.length > 0 && (
              <div className="mt-6 border-t border-white/[0.06] pt-4 space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Recent Career Logs</p>
                {recentLogs.map((entry, i) => {
                  const parts = [];
                  if (entry.studyHours != null) parts.push(`📚 ${entry.studyHours}h`);
                  if (entry.codingHours != null) parts.push(`💻 ${entry.codingHours}h`);
                  if (entry.dsa != null) parts.push(`🧩 ${entry.dsa} DSA`);
                  if (entry.skillAdded) parts.push(`+${entry.skillAdded}`);
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs">
                      <span className="text-slate-400 font-mono">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      <div className="flex flex-wrap gap-2 text-slate-300">{parts.map((p, j) => <span key={j}>{p}</span>)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon="⚡" label="Total XP" value={heatmapData.totalXP?.toLocaleString() || '0'} color="#f59e0b" />
            <MetricCard icon="🔥" label="Current Streak" value={`${statsData.streak}d`} color="#f43f5e" />
            <MetricCard icon="⏱" label="Total Study" value={`${Math.round((statsData.totalMinutes || 0) / 60)}h`} color="#3b82f6" />
            <MetricCard icon="📝" label="Sessions" value={statsData.totalSessions || 0} color="#8b5cf6" />
          </div>

          {/* GitHub-style Heatmap */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">Focus Heatmap — Last 90 Days</h3>
            <p className="text-xs text-slate-500 mb-5">Each square = one day. Darker = more study time.</p>
            {loading ? (
              <div className="h-20 flex items-center justify-center text-xs text-slate-500">Loading...</div>
            ) : (
              <FocusHeatmap heatmap={heatmapData.heatmap} />
            )}
          </GlassCard>

          {/* Environment Efficiency */}
          {heatmapData.environmentData?.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-1">Environment Efficiency</h3>
              <p className="text-xs text-slate-500 mb-5">Average focus quality per study environment</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heatmapData.environmentData} barSize={40}>
                    <XAxis dataKey="environment" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgFocus" name="Avg Focus" radius={[6, 6, 0, 0]}>
                      {heatmapData.environmentData.map((e, i) => (
                        <Cell key={i} fill={ENV_COLORS[e.environment] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {/* Forgetting Curve */}
          {heatmapData.forgettingCurve?.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-1">Forgetting Curve — Review Urgency</h3>
              <p className="text-xs text-slate-500 mb-5">Review topics with low retention before they're forgotten</p>
              <div className="space-y-3">
                {heatmapData.forgettingCurve.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-36 truncate">{t.topic}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${t.retention}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: t.retention > 60 ? '#10b981' : t.retention > 30 ? '#f59e0b' : '#f43f5e' }} />
                    </div>
                    <span className="text-xs font-mono w-10 text-right" style={{ color: t.retention > 60 ? '#10b981' : t.retention > 30 ? '#f59e0b' : '#f43f5e' }}>{t.retention}%</span>
                    {t.retention < 40 && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 whitespace-nowrap">Review now!</span>}
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Session List */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-4">Recent Sessions</h3>
            {sessions.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                No sessions logged yet. Start with Log Session →
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sessions.slice(0, 20).map((s, i) => (
                  <motion.div key={s.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all group">
                    <div className="w-2 h-2 rounded-full" style={{ background: ENV_COLORS[s.environment] || '#3b82f6' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{s.topic}</p>
                      <p className="text-[10px] text-slate-500">{s.sessionDate || new Date(s.createdAt).toLocaleDateString()} · {s.environment}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-blue-400 font-mono">{s.durationMinutes}min</p>
                      <p className="text-[10px] text-amber-400">+{s.xpEarned}xp</p>
                    </div>
                    <div className="flex gap-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">F:{s.focusQuality}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">M:{s.mentalFatigue}</span>
                    </div>
                    <button onClick={async () => { await deleteSession(s.id); await loadData(); setSessions(p => p.filter(x => x.id !== s.id)); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-xs transition-all px-1">×</button>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── RECOMMENDATIONS TAB ─────────────────────────────────────────────── */}
      {tab === 'recommendations' && <CareerRecommendations recommendations={recommendations} />}

      {/* ── LEARNING PATH TAB ───────────────────────────────────────────────── */}
      {tab === 'roadmap' && (
        <div className="space-y-6">
          <GlassCard>
            <div className="mb-5">
              <h3 className="text-base font-bold text-white mb-1">🎯 AI Learning Path Generator</h3>
              <p className="text-xs text-slate-400">Enter your current and target roles for a personalized roadmap.</p>
            </div>
            <form onSubmit={handleGenerateLearningPath} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1"><label className="text-xs text-slate-400 mb-1.5 block">Current Role</label><input type="text" value={lpCurrentRole} onChange={e => setLpCurrentRole(e.target.value)} className="input-premium w-full" placeholder="e.g. Software Engineer" /></div>
              <div className="flex-1"><label className="text-xs text-slate-400 mb-1.5 block">Target Role</label><input type="text" value={lpTargetRole} onChange={e => setLpTargetRole(e.target.value)} className="input-premium w-full" placeholder="e.g. Machine Learning Engineer" /></div>
              <div className="flex items-end"><button type="submit" disabled={lpLoading} className="btn-primary whitespace-nowrap disabled:opacity-60">{lpLoading ? 'Building...' : 'Generate Path 🚀'}</button></div>
            </form>
          </GlassCard>

          {lpLoading && (
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <p className="text-sm text-blue-300 font-medium">Building your personalized learning path…</p>
              </div>
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}</div>
            </GlassCard>
          )}

          {lpResult && !lpLoading && (
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              {lpResult.approximate && (
                <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2.5">
                  <span className="text-amber-400">⚠️</span>
                  <p className="text-xs text-amber-300">Showing closest available path — exact match not in database.</p>
                </div>
              )}
              <GlassCard>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Learning Path</p>
                    <h3 className="text-lg font-bold text-white">{lpResult.from} <span className="text-blue-400">→</span> {lpResult.to}</h3>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center"><p className="text-2xl font-bold text-blue-400">{lpResult.totalHours}</p><p className="text-[10px] text-slate-500">Total Hours</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-emerald-400 mt-2">{lpResult.totalCost}</p><p className="text-[10px] text-slate-500">Est. Cost</p></div>
                  </div>
                </div>
              </GlassCard>
              {lpResult.phases?.map((phase, pi) => (
                <motion.div key={pi} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.1 }}>
                  <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">{pi + 1}</span>
                      <h4 className="font-semibold text-white">{phase.phase}</h4>
                    </div>
                    <div className="space-y-2">
                      {phase.courses?.map((course, ci) => (
                        <div key={ci} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/20 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="text-sm font-semibold text-white">{course.title}</h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${platformColor(course.platform)}`}>{course.platform}</span>
                              </div>
                              <div className="flex gap-3 text-[11px] text-slate-400">
                                <span>⏱ {course.hours} hrs</span>
                                <span className={course.cost === 'Free' || course.cost === 'Free to audit' ? 'text-emerald-400' : 'text-amber-400'}>
                                  {course.cost === 'Free' || course.cost === 'Free to audit' ? '✓ ' : '💳 '}{course.cost}
                                </span>
                              </div>
                            </div>
                            <a href={course.url} target="_blank" rel="noopener noreferrer"
                              className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all whitespace-nowrap">
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

          {/* Static Roadmap */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3 px-1">General Skill Roadmap</p>
            <div className="space-y-3">
              {roadmap.map((phase, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <GlassCard className={phase.status === 'locked' ? 'opacity-40' : ''}>
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
