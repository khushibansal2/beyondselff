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
import { CheckCircle, AlertTriangle, TrendingUp, ChevronRight, Plus, ExternalLink, Brain, Search, Loader2, Briefcase, MapPin, DollarSign, Zap, Target, BarChart2, Sparkles, RefreshCw, Trophy, Flame, Clock, Calendar, Award, FileText } from 'lucide-react';
import { fetchJobs } from '../services/jobService';
import {
  calculateJobMatch, rankJobsByMatch, aggregateMissingSkills,
  getSalaryBenchmark, getSalaryChartData, generateCareerCoach, getDigitalTwinInsights,
  fetchSkillDemandTrends, generateCareerPathSimulation,
} from '../services/careerIntelligenceService';
import { parseCertificate, getDemoCertResult } from '../services/certificateService';

// ── Cognitive Load Gauge ─────────────────────────────────────────────────────
function CognitiveGauge({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const cx = 100, cy = 110, r = 80;
  
  const getPoint = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad)
    };
  };

  const p1 = getPoint(180);
  const p2 = getPoint(108);
  const p3 = getPoint(54);
  const p4 = getPoint(0);

  const needleAngle = 180 - (pct / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const nx = cx + (r - 15) * Math.cos(needleRad);
  const ny = cy - (r - 15) * Math.sin(needleRad);

  const color = pct < 40 ? '#10b981' : pct < 70 ? '#f59e0b' : '#f43f5e';
  const label = pct < 40 ? 'Low Load' : pct < 70 ? 'Moderate' : 'High Load';

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="135" viewBox="0 0 200 135">
        {/* Track segments */}
        <path d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`} stroke="#10b981" strokeWidth="8" fill="none" opacity="0.9" />
        <path d={`M ${p2.x} ${p2.y} A ${r} ${r} 0 0 1 ${p3.x} ${p3.y}`} stroke="#f59e0b" strokeWidth="8" fill="none" opacity="0.9" />
        <path d={`M ${p3.x} ${p3.y} A ${r} ${r} 0 0 1 ${p4.x} ${p4.y}`} stroke="#f43f5e" strokeWidth="8" fill="none" opacity="0.9" />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill={color} />

        {/* Texts */}
        <text x={cx} y={cy - 24} textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="900">{Math.round(pct)}</text>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">/ 100</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={color} fontSize="12" fontWeight="700">{label}</text>
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
      <div style={{ display: 'flex', gap: 5.5, minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 5.5 }}>
            {week.map((day, di) => (
              <div
                key={di}
                className="cursor-pointer transition-transform hover:scale-125"
                style={{ width: 16.5, height: 16.5, borderRadius: 3.5, background: LEVEL_COLORS[day.level], transition: 'transform 0.15s' }}
                title={`${day.date}: ${day.minutes} min`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3.5 text-[10px] text-slate-500">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => <div key={i} style={{ width: 16.5, height: 16.5, borderRadius: 3.5, background: c }} />)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HERO HEADER CARD ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, #12141a 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 20,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: -40, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, zIndex: 1 }}>
          {/* Icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg style={{ width: 26, height: 26, color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Resume AI Intelligence</h2>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: phase === 'results' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${phase === 'results' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: phase === 'results' ? '#10b981' : '#64748b',
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'results' ? '#10b981' : '#475569', display: 'inline-block' }} />
                {phase === 'results' ? 'Analyzed' : 'Not Uploaded'}
              </span>
            </div>
            {phase === 'upload' && (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Upload your PDF — AI extracts skills, ATS score, skill gaps &amp; a personalised roadmap.
              </p>
            )}
            {phase === 'results' && (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Resume analyzed · {r?.skills?.length ?? 0} skills detected · {r?.experience?.length ?? 0} roles
              </p>
            )}
          </div>
        </div>

        {phase === 'results' && (
          <button onClick={handleReset} style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 700,
            color: '#f87171', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            zIndex: 1,
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}>
            ↺ Upload New
          </button>
        )}
      </div>

      {/* ── UPLOAD ZONE ── */}
      {phase === 'upload' && (
        <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 20, padding: 24 }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => fileRef.current?.click()}
            style={{
              borderRadius: 16,
              border: `2px dashed ${dragOver ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
              background: dragOver ? 'rgba(99,102,241,0.05)' : 'transparent',
              cursor: 'pointer',
              padding: '52px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              transition: 'all 0.25s ease',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && processFile(e.target.files[0])} />

            {/* Upload icon */}
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 32, height: 32, color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Drop your resume PDF here</p>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>or click to browse · PDF only · text-based (not scanned)</p>
            </div>

            {/* Feature chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['Skills Extraction', 'ATS Score', 'Skill Gap Analysis', 'Learning Roadmap'].map(f => (
                <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 9 }}>✓</span> {f}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#f87171' }}>
              <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── PARSING STATE ── */}
      {phase === 'parsing' && (
        <div style={{ background: '#12141a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '32px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Analyzing your resume…</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{stepText}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {RESUME_PARSE_STEPS.map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < stepIdx ? '#6366f1' : 'transparent',
                  border: i < stepIdx ? 'none' : i === stepIdx ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                  animation: i === stepIdx ? 'pulse 1s ease infinite' : 'none',
                }}>
                  {i < stepIdx && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: i <= stepIdx ? '#cbd5e1' : '#334155', fontWeight: i === stepIdx ? 600 : 400 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === 'results' && r && (
        <motion.div ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Identity card */}
          <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 20, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div style={{ width: 62, height: 62, borderRadius: 18, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#818cf8', flexShrink: 0 }}>
                {r.personalInfo?.name ? r.personalInfo.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{r.personalInfo?.name || 'Your Profile'}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>{r.overallLevel}</span>
                  {r.totalExperienceYears > 0 && <span style={{ fontSize: 12, color: '#475569' }}>{r.totalExperienceYears}yr exp</span>}
                </div>
                {r.personalInfo?.email && (
                  <p style={{ fontSize: 12, color: '#475569', margin: '0 0 8px' }}>
                    {r.personalInfo.email}{r.personalInfo.location ? ` · ${r.personalInfo.location}` : ''}
                  </p>
                )}
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{r.summary}"</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={handleSyncSkills} disabled={synced} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: synced ? 'default' : 'pointer', border: 'none', transition: 'all 0.2s',
                background: synced ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.15)',
                color: synced ? '#10b981' : '#a5b4fc',
              }}>
                {synced ? <>✓ Synced to Career</> : <>⚡ Sync Skills to Career</>}
              </button>
              {r.personalInfo?.linkedin && (
                <a href={r.personalInfo.linkedin} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#64748b', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', transition: 'all 0.2s' }}>
                  ↗ LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Score Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'ATS Score', value: r.atsScore, color: '#f59e0b', accent: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
              { label: 'Profile Strength', value: r.profileStrength, color: '#6366f1', accent: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
              { label: 'Hirability', value: r.hirability, color: '#10b981', accent: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', unit: '%' },
            ].map(s => (
              <div key={s.label} style={{ background: '#12141a', border: `1px solid ${s.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 30, fontWeight: 900, color: s.color, lineHeight: 1, margin: '0 0 12px' }}>
                  {s.value}<span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{s.unit || '/100'}</span>
                </p>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: '100%', borderRadius: 4, background: s.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Section Navigation */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'overview',   label: 'Overview',    emoji: '📊' },
              { id: 'skills',     label: 'Skills',      emoji: '⚡' },
              { id: 'experience', label: 'Experience',  emoji: '💼' },
              { id: 'projects',   label: 'Projects',    emoji: '🚀' },
              { id: 'insights',   label: 'AI Insights', emoji: '🤖' },
              { id: 'roadmap',    label: 'Roadmap',     emoji: '🗺️' },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: activeSection === s.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: activeSection === s.id ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.06)',
                color: activeSection === s.id ? '#a5b4fc' : '#475569',
              }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

              {/* OVERVIEW */}
              {activeSection === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      { title: 'Strengths',  items: r.strengths,  color: '#10b981', bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.15)', dot: '#10b981' },
                      { title: 'Weaknesses', items: r.weaknesses, color: '#f43f5e', bg: 'rgba(244,63,94,0.04)',  border: 'rgba(244,63,94,0.15)',  dot: '#f43f5e' },
                      { title: 'Skill Gaps', items: r.skillGaps,  color: '#f59e0b', bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.15)', dot: '#f59e0b' },
                    ].map(s => (
                      <div key={s.title} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '18px 20px' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.color, marginBottom: 12 }}>{s.title}</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(s.items ?? []).map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0, marginTop: 5 }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {r.salaryRange && (
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
                      <div>
                        <p style={{ fontSize: 11, color: '#475569', margin: '0 0 3px' }}>Estimated Salary Range</p>
                        <p style={{ fontSize: 17, fontWeight: 800, color: '#10b981', margin: 0 }}>{r.salaryRange}</p>
                      </div>
                    </div>
                  )}

                  {r.targetRoles?.length > 0 && (
                    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 14, padding: '18px 20px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: 12 }}>Best-Fit Roles</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {r.targetRoles.map((role, i) => (
                          <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)', color: '#c4b5fd' }}>{role}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SKILLS */}
              {activeSection === 'skills' && (
                <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 18, padding: '22px 26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Detected Skills</h3>
                      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{r.skills?.length ?? 0} skills extracted from your resume</p>
                    </div>
                  </div>
                  {Object.entries(skillCats).filter(([, v]) => v?.length > 0).map(([cat, skills]) => (
                    <div key={cat} style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', marginBottom: 8 }}>{cat}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {skills.map(s => (
                          <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#a5b4fc' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!Object.values(skillCats).some(v => v?.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(r.skills ?? []).map(s => (
                        <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#a5b4fc' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* EXPERIENCE */}
              {activeSection === 'experience' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(r.experience ?? []).length === 0 && (
                    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '40px 24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                      No work experience detected in the resume.
                    </div>
                  )}
                  {(r.experience ?? []).map((exp, i) => (
                    <div key={i} style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)', borderRadius: '16px 0 0 16px' }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, paddingLeft: 8 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{exp.role}</p>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                        </div>
                        <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>{exp.duration}</span>
                      </div>
                      <ul style={{ margin: 0, padding: '0 0 0 8px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(exp.highlights ?? []).map((h, j) => (
                          <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                            <span style={{ color: '#6366f1', fontWeight: 700, marginTop: 1 }}>›</span>{h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {(r.education ?? []).length > 0 && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', padding: '6px 0 0' }}>Education</p>
                      {r.education.map((edu, i) => (
                        <div key={i} style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 14, padding: '16px 20px' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{edu.degree}</p>
                          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>{edu.institution}</p>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 11, color: '#475569' }}>{edu.year}</span>
                            {edu.gpa && <span style={{ fontSize: 11, color: '#475569' }}>GPA: {edu.gpa}</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* PROJECTS */}
              {activeSection === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(r.projects ?? []).length === 0 && (
                    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '40px 24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>No projects detected.</div>
                  )}
                  {(r.projects ?? []).map((proj, i) => (
                    <div key={i} style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🚀</div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{proj.name}</p>
                        </div>
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>↗ View</a>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: '0 0 12px' }}>{proj.description}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {(proj.technologies ?? []).map(t => (
                          <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(r.certifications ?? []).length > 0 && (
                    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 14, padding: '18px 22px' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', marginBottom: 12 }}>Certifications</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {r.certifications.map((cert, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 6 }}>
                            ✓ {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI INSIGHTS */}
              {activeSection === 'insights' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(r.recommendations ?? []).length > 0 && (
                    <div style={{ background: '#12141a', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 18, padding: '22px 26px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>AI Recommendations</h3>
                          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Personalized career coaching based on your resume</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {r.recommendations.map((rec, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(129,140,248,0.5)', fontFamily: 'monospace', flexShrink: 0, minWidth: 24, marginTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROADMAP */}
              {activeSection === 'roadmap' && (
                <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 18, padding: '22px 26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗺️</div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Personalised Learning Roadmap</h3>
                      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Skills to learn based on your current profile</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(r.learningRoadmap ?? []).map((item, i) => {
                      const pColor = item.priority === 'high' ? '#f43f5e' : item.priority === 'medium' ? '#f59e0b' : '#64748b';
                      const pBg = item.priority === 'high' ? 'rgba(244,63,94,0.06)' : item.priority === 'medium' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)';
                      const pBorder = item.priority === 'high' ? 'rgba(244,63,94,0.18)' : item.priority === 'medium' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)';
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                          style={{ padding: '14px 18px', borderRadius: 12, background: pBg, border: `1px solid ${pBorder}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{item.skill}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, border: `1px solid ${pBorder}`, color: pColor }}>{item.priority}</span>
                          </div>
                          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', lineHeight: 1.5 }}>{item.reason}</p>
                          {item.resource && <p style={{ fontSize: 10, color: '#818cf8', margin: 0 }}>📚 {item.resource}</p>}
                        </motion.div>
                      );
                    })}
                    {(r.learningRoadmap ?? []).length === 0 && (
                      <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '32px 0' }}>Roadmap data not available for this resume.</p>
                    )}
                  </div>
                </div>
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

function JobsTab({ userSkills, targetRole, onNavigate }) {
  const [query,    setQuery]    = useState('');
  const [location, setLocation] = useState('');
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [searched, setSearched] = useState(false);
  const [showLoc,  setShowLoc]  = useState(false);
  const [trends,        setTrends]        = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  async function loadTrends(role, preloadedJobs = null) {
    setTrendsLoading(true);
    try {
      const data = await fetchSkillDemandTrends(role, preloadedJobs);
      setTrends(data);
    } catch (e) {
      console.error('loadTrends failed:', e);
    } finally {
      setTrendsLoading(false);
    }
  }

  async function doSearch(q = query, loc = location) {
    if (!q.trim()) return;
    setLoading(true); setError(null); setJobs([]); setSearched(true);
    try {
      const results = await fetchJobs(q.trim(), { location: loc.trim() });
      const ranked = rankJobsByMatch(userSkills || [], results);
      setJobs(ranked);
      // Reuse the already-fetched jobs for trend computation — avoids a duplicate API call
      loadTrends(q.trim(), ranked);
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
      <div style={{ display: (!searched && !loading) ? 'flex' : 'grid', gridTemplateColumns: (!searched && !loading) ? undefined : '1fr 340px', gap: 16, alignItems: (!searched && !loading) ? 'stretch' : 'start' }}>

        {/* Left: job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: (!searched && !loading) ? 1 : undefined }}>
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
            <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '48px 24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💼</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Real-time Job Market</p>
              <p style={{ fontSize: 12, color: '#475569' }}>Powered by Remotive · Adzuna · Jooble</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Enter a role above to find live listings with AI match scores</p>
            </div>
          )}

          {/* No results state */}
          {searched && !loading && !error && jobs.length === 0 && (
            <div style={{ background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>No jobs found</p>
              <p style={{ fontSize: 12, color: '#475569' }}>Try a broader search term or a different location</p>
              <button onClick={() => doSearch()} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {filtered.map(job => <JobCard key={job.id} job={job} userSkills={userSkills || []} />)}

          {filtered.length > 0 && (
            <button onClick={() => window.open('https://www.linkedin.com/jobs/', '_blank')} style={{ padding: '12px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              View all jobs on LinkedIn →
            </button>
          )}
        </div>

        {/* Right: score + insight */}
        <div style={{ display: 'flex', flexDirection: (!searched && !loading) ? 'row' : 'column', gap: (!searched && !loading) ? 16 : 14, flex: (!searched && !loading) ? 2 : undefined }}>
          {/* Opportunity Score */}
          <div style={{ flex: 1, background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 18px', display: 'flex', flexDirection: 'column' }}>
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
            <button onClick={() => onNavigate?.('roadmap')} style={{ marginTop: 'auto', width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Create Learning Plan →
            </button>
          </div>

          {/* Market Insight */}
          <div style={{ flex: 1, background: 'rgba(12,14,22,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💡</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Market Insight</p>
                {trends && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: trends.hiringVelocity === 'Critical' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)', color: trends.hiringVelocity === 'Critical' ? '#f43f5e' : '#10b981', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-block', marginTop: 2 }}>
                    {trends.hiringVelocity} Hiring Velocity
                  </span>
                )}
              </div>
            </div>

            {trendsLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
                <div style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '80%' }} className="animate-pulse" />
                <div style={{ height: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 4, width: '100%' }} className="animate-pulse" />
                <div style={{ height: 40, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '100%', marginTop: 8 }} className="animate-pulse" />
              </div>
            )}

            {!trendsLoading && trends && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                  {trends.query} Demand {trends.demandGrowth > 0 ? `Up ${trends.demandGrowth}%` : `${trends.demandGrowth}%`} YoY
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                  {trends.marketBrief}
                </p>
                
                <p style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Top Skill Gaps &amp; Demand</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {trends.topSkills.slice(0, 3).map((item) => (
                    <div key={item.skill} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
                        <span>{item.skill}</span>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{item.percentage}% ({item.growth})</span>
                      </div>
                      <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{ width: `${item.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #a78bfa)', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {trends.topSkills[0] && (
                  <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{trends.topSkills[0].skill} Demand Trajectory (6 Months)</p>
                    <div style={{ position: 'relative', height: 42 }}>
                      <svg width="100%" height="36" viewBox="0 0 200 36">
                        <polyline
                          points={trends.topSkills[0].trend.map((val, i) => `${i * 40},${36 - (val / 100) * 30}`).join(' ')}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        {trends.topSkills[0].trend.map((val, i) => (
                          <circle key={i} cx={i * 40} cy={36 - (val / 100) * 30} r="2.5" fill="#10b981" />
                        ))}
                      </svg>
                    </div>
                  </div>
                )}
                
                <span style={{ fontSize: 9, color: '#475569', marginTop: 10, display: 'block', textAlign: 'right' }}>
                  Source: {trends.source}
                </span>
              </div>
            )}
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
  const [trends,        setTrends]        = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

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
    setTrendsLoading(true);
    try {
      const results = await fetchJobs(roleInput);
      setJobs(rankJobsByMatch(userSkills || [], results));
      const trendData = await fetchSkillDemandTrends(roleInput);
      setTrends(trendData);
    } catch (e) {
      console.error('handleLoadMarketJobs failed:', e);
    } finally {
      setJobsLoading(false);
      setTrendsLoading(false);
    }
  }

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      handleLoadMarketJobs();
    }
  }, []);

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

              {/* Skill Demand Intelligence — full redesign */}
              {trendsLoading && (
                <GlassCard className="text-center py-6">
                  <Loader2 size={18} className="mx-auto mb-2 text-violet-400 animate-spin" />
                  <p className="text-[12px] text-slate-400">Analysing skill demand trends…</p>
                </GlassCard>
              )}

              {!trendsLoading && trends && (() => {
                const SKILL_COLORS = ['#8b5cf6','#6366f1','#3b82f6','#10b981','#f59e0b'];
                const DIR_STYLE = {
                  rising:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  icon: '↑' },
                  stable:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  icon: '→' },
                  declining:{ color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.25)',   icon: '↓' },
                };
                // Build chart data: each month across all top skills
                const months = ['Jan','Feb','Mar','Apr','May','Jun'];
                const chartData = months.map((m, i) => {
                  const pt = { month: m };
                  (trends.topSkills || []).forEach(s => { pt[s.skill] = s.trend?.[i] ?? 0; });
                  return pt;
                });
                return (
                  <div className="space-y-4">
                    {/* Market overview card */}
                    <GlassCard>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={14} className="text-violet-400" />
                            <h3 className="text-[14px] font-bold text-white">{trends.query} — Market Intelligence</h3>
                          </div>
                          <p className="text-[12px] text-slate-400 leading-relaxed max-w-xl">{trends.marketBrief}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div style={{ padding: '4px 12px', borderRadius: 8, background: trends.hiringVelocity === 'Critical' ? 'rgba(244,63,94,0.12)' : trends.hiringVelocity === 'High' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${trends.hiringVelocity === 'Critical' ? 'rgba(244,63,94,0.3)' : trends.hiringVelocity === 'High' ? 'rgba(139,92,246,0.3)' : 'rgba(16,185,129,0.3)'}`, color: trends.hiringVelocity === 'Critical' ? '#f87171' : trends.hiringVelocity === 'High' ? '#a78bfa' : '#34d399', fontSize: 11, fontWeight: 700 }}>
                            {trends.hiringVelocity} Hiring Velocity
                          </div>
                          <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, fontWeight: 700 }}>
                            +{trends.demandGrowth}% YoY Growth
                          </div>
                        </div>
                      </div>

                      {/* 6-month multi-skill trend chart */}
                      <div className="mb-3">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">6-Month Demand Trend (% of job listings)</p>
                        <div style={{ height: 160 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                              <defs>
                                {(trends.topSkills || []).map((s, i) => (
                                  <linearGradient key={s.skill} id={`grad-skill-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="10%" stopColor={SKILL_COLORS[i]} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={SKILL_COLORS[i]} stopOpacity={0} />
                                  </linearGradient>
                                ))}
                              </defs>
                              <CartesianGrid strokeDasharray="3 0" stroke="rgba(255,255,255,0.04)" vertical={false} />
                              <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} ticks={[25, 50, 75, 100]} />
                              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 }} labelStyle={{ color: '#94a3b8', marginBottom: 4 }} />
                              {(trends.topSkills || []).map((s, i) => (
                                <Area key={s.skill} type="monotone" dataKey={s.skill} stroke={SKILL_COLORS[i]} strokeWidth={2} fill={`url(#grad-skill-${i})`} dot={false} activeDot={{ r: 4, fill: SKILL_COLORS[i] }} />
                              ))}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {(trends.topSkills || []).map((s, i) => (
                            <div key={s.skill} className="flex items-center gap-1.5">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: SKILL_COLORS[i] }} />
                              <span style={{ fontSize: 10, color: '#71717a' }}>{s.skill}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>

                    {/* Per-skill demand bars */}
                    <GlassCard>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-4">Top Skills — Current Demand & Growth</p>
                      <div className="space-y-3">
                        {(trends.topSkills || []).map((s, i) => {
                          const dir = s.direction || (s.growth?.startsWith('+') ? 'rising' : 'stable');
                          const ds  = DIR_STYLE[dir] || DIR_STYLE.stable;
                          return (
                            <div key={s.skill}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SKILL_COLORS[i] }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{s.skill}</span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', background: s.demandLevel === 'critical' ? 'rgba(244,63,94,0.08)' : s.demandLevel === 'high' ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.08)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{s.demandLevel}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span style={{ fontSize: 11, fontWeight: 700, color: ds.color, background: ds.bg, border: `1px solid ${ds.border}`, padding: '1px 8px', borderRadius: 6 }}>{ds.icon} {s.growth}</span>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: SKILL_COLORS[i] }}>{s.percentage}%</span>
                                </div>
                              </div>
                              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${s.percentage}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                                  style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${SKILL_COLORS[i]}cc, ${SKILL_COLORS[i]})` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: 9, color: '#374151', marginTop: 12, textAlign: 'right' }}>{trends.source}</p>
                    </GlassCard>
                  </div>
                );
              })()}

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((r, i) => {
          const rm   = riskMeta(r.risk);
          const ic   = REC_ICONS[r.icon] || REC_ICONS['🧩'];
          const done = status[r.id] === 'done';
          const acc  = status[r.id] === 'accepted';
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, opacity: done ? 0.6 : 1, transition: 'opacity 0.2s' }}>

              {/* Icon box */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: ic.bg, border: `1px solid ${ic.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{r.icon}</div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: done ? '#64748b' : '#f1f5f9', marginBottom: 2, textDecoration: done ? 'line-through' : 'none' }}>{r.title}</p>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginBottom: 6 }}>{r.text}</p>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: acc ? undefined : 'accepted' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: acc ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.08)', border: `1px solid ${acc ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`, color: '#34d399' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Accept
                  </button>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: done ? undefined : 'done' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: done ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, color: done ? '#818cf8' : '#64748b' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/>{done && <polyline points="9 11 12 14 20 6"/>}</svg>
                    Mark Done
                  </button>
                  <button onClick={() => setStatus(s => ({ ...s, [r.id]: 'hidden' }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 15l-3-3m0 0l3-3m-3 3h10"/></svg>
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
  const { career, health, records, updateDomain, addRecords, setRecords, computed, gamification, updateGamification } = useData();

  const handleAward = (award, localXpAlreadyAdded = 0) => {
    if (award) {
      updateGamification({
        // Never decrease local XP — take backend total only if it's higher
        xp: Math.max((gamification?.xp || 0), award.totalXp),
        level: award.level,
        streak: award.streak,
        badges: award.newBadges && award.newBadges.length > 0
          ? [...(gamification?.badges || []), ...award.newBadges]
          : (gamification?.badges || [])
      });
      if (award.newBadges && award.newBadges.length > 0) {
        award.newBadges.forEach(badge => {
          showToast(`🏆 New Badge: ${badge.badgeName || badge.badgeId}!`, 'success');
        });
      }
    }
  };
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
  const ENVS = [
    { 
      id: 'HOME', 
      icon: (active) => (
        <svg style={{ width: 18, height: 18, marginBottom: 4, color: active ? '#a5b4fc' : '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ), 
      label: 'Home' 
    },
    { 
      id: 'LIBRARY', 
      icon: (active) => (
        <svg style={{ width: 18, height: 18, marginBottom: 4, color: active ? '#a5b4fc' : '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ), 
      label: 'Library' 
    },
    { 
      id: 'CAFE', 
      icon: (active) => (
        <svg style={{ width: 18, height: 18, marginBottom: 4, color: active ? '#a5b4fc' : '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      ), 
      label: 'Café' 
    },
    { 
      id: 'GROUP', 
      icon: (active) => (
        <svg style={{ width: 18, height: 18, marginBottom: 4, color: active ? '#a5b4fc' : '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ), 
      label: 'Group' 
    }
  ];
  const [logForm, setLogForm] = useState({ durationMinutes: 30, topic: 'Data Structures', category: '', focusQuality: 3, mentalFatigue: 3, environment: 'HOME' });
  const [logging, setLogging] = useState(false);

  // Learning Path state
  const savedPath = career?.generatedLearningPath || null;
  const [lpCurrentRole, setLpCurrentRole] = useState(career?.currentRole || '');
  const [lpTargetRole, setLpTargetRole] = useState(career?.targetRole || '');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpResult, setLpResult] = useState(savedPath);

  // Career path simulation state
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult]   = useState(null);

  const handleRunSimulation = async () => {
    if (!lpCurrentRole.trim() || !lpTargetRole.trim()) { showToast('Enter both current and target roles first', 'error'); return; }
    setSimLoading(true); setSimResult(null);
    try {
      const result = await generateCareerPathSimulation({
        currentRole: lpCurrentRole.trim(),
        targetRole: lpTargetRole.trim(),
        skills: userSkills || [],
        studyHoursDaily: c.studyHoursDaily || 2,
        yearsExperience: c.yearsExperience || 0,
      });
      setSimResult(result);
    } catch (e) { showToast('Simulation failed: ' + e.message, 'error'); }
    finally { setSimLoading(false); }
  };

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
      addRecords('career', [{ date: new Date().toISOString(), studyHours: todayHours, topic: logForm.topic }]);
      // Award XP locally always
      const sessionXp = Math.round(logForm.durationMinutes / 2); // ~1 XP per 2 min
      updateGamification({ xp: (gamification?.xp || 0) + sessionXp });
      showToast(`+${sessionXp} XP earned! ⚡`, 'success');
      // Sync with backend if available
      if (careerApi.isEnabled()) {
        try {
          const { award } = await careerApi.create({ date: new Date().toISOString(), studyHours: todayHours, skillLearned: logForm.topic });
          handleAward(award);
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
    addRecords('career', [record]);
    setCareerForm({ studyHours: '', codingHours: '', dsa: '', skill: '', projects: '' });
    showToast(`Career data saved (${changes} field${changes > 1 ? 's' : ''})`, 'success');
    // Award XP locally always
    const careerXp = changes * 15;
    updateGamification({ xp: (gamification?.xp || 0) + careerXp });
    showToast(`+${careerXp} XP earned! ⚡`, 'success');
    // Sync with backend if available
    if (careerApi.isEnabled()) {
      try {
        const { award } = await careerApi.create(record);
        handleAward(award);
      }
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
    { id: 'brain',           label: 'Brain Twin',     emoji: '🧠' },
    { id: 'jobs',            label: 'Job Market',     emoji: '💼' },
    { id: 'intelligence',    label: 'Market Insights', emoji: '💡' },
    { id: 'log',             label: 'Log Session',    emoji: '⚡' },
    { id: 'history',         label: 'History',        emoji: '📅' },
    { id: 'recommendations', label: 'Insights',       emoji: '✨' },
    { id: 'roadmap',         label: 'Learning Path',  emoji: '📚' },
    { id: 'resume',          label: 'Resume AI',      emoji: '📄' },
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

  // Growth stages: status is fully dynamic; items incorporate user's actual skills where possible
  const userSkillSet = new Set((c.skills || []).map(s => s.toLowerCase()));
  const coreSkillItems = c.skills.length > 0
    ? [...c.skills.slice(0, 3), ...['REST/GraphQL', 'Testing'].filter(i => !userSkillSet.has(i.toLowerCase()))].slice(0, 4)
    : ['Frontend (React)', 'Backend (Node/Spring)', 'REST/GraphQL', 'Testing'];
  const dsaLabel = c.dsaPractice > 0 ? `${c.dsaPractice} DSA problems solved` : '250+ DSA Problems';
  const projectLabel = c.projectsCompleted > 0 ? `${c.projectsCompleted} project${c.projectsCompleted !== 1 ? 's' : ''} completed` : 'Full-Stack App';
  const roadmap = [
    { phase: 'Foundation', items: ['Data Structures & Algorithms', 'OOP', 'Databases', 'Git'], status: c.dsaPractice >= 2 ? 'done' : 'active' },
    { phase: 'Core Skills', items: coreSkillItems, status: c.skills.length >= 4 ? 'done' : c.dsaPractice >= 2 ? 'active' : 'locked' },
    { phase: 'Projects', items: [projectLabel, 'ML/AI Project', 'Open Source', 'Tech Blog'], status: c.projectsCompleted >= 3 ? 'done' : c.skills.length >= 4 ? 'active' : 'locked' },
    { phase: 'Interview Prep', items: [dsaLabel, 'System Design', 'Mock Interviews', 'Resume'], status: c.projectsCompleted >= 3 ? 'active' : 'locked' },
  ];

  const platformColor = (p) => p === 'Coursera' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : p === 'Udemy' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className={`page-container min-h-screen pb-2 ${tab === 'brain' ? '' : 'bg-mesh'}`} style={tab === 'brain' ? { backgroundColor: '#090a0f' } : {}}>
      <AnimatePresence>
        {impactSession && <TwinImpactFeed session={impactSession} onDone={() => { setImpactSession(null); setTab('history'); }} />}
      </AnimatePresence>

      {/* ── Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
        <span>BeyondSelf</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#ffffff' }}>Career &amp; Growth</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', flexShrink: 0 }}>
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight m-0 flex items-center gap-2">Career &amp; Growth 📈</h1>
      </div>
      <p style={{ fontSize: 13, color: '#8e929b', marginTop: 2, marginBottom: 24 }}>Study smarter — every session builds your digital twin.</p>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: 24,
        gap: 24,
        overflowX: 'auto',
        paddingBottom: 0
      }}>
        {tabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 4px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                color: isActive ? '#ffffff' : '#8e929b',
                position: 'relative',
                transition: 'all 0.2s ease',
                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── BRAIN TWIN TAB ─────────────────────────────────────────────────── */}
      {tab === 'brain' && (() => {
        const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#8b5cf6' : '#f43f5e';
        const radarWithIdeal = skillRadar.map(d => ({ ...d, full: 100 }));
        const loadColor = cognitiveLoad < 40 ? '#10b981' : cognitiveLoad < 70 ? '#f59e0b' : '#f43f5e';
        const loadLabel = cognitiveLoad < 40 ? 'Low Load' : cognitiveLoad < 70 ? 'Moderate' : 'High Load';

        // Calculate dynamic weekly study metrics based on actual session data
        const weeklyStudyMins = sessions.filter(s => {
          const dStr = s.sessionDate || s.createdAt || '';
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return dStr && new Date(dStr) >= sevenDaysAgo;
        }).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        const weeklyStudyHrs = Math.round((weeklyStudyMins / 60) * 10) / 10;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── ROW 1: Score card (1fr) + Metrics side (2fr) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

              {/* Career Score Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.98) 0%, rgba(11, 13, 26, 0.99) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: 16,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                      <svg viewBox="0 0 120 120" width="120" height="120">
                        <defs>
                          <linearGradient id="careerScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={score >= 70 ? '#10b981' : score >= 45 ? '#8b5cf6' : '#ef4444'} />
                            <stop offset="100%" stopColor={score >= 70 ? '#34d399' : score >= 45 ? '#c084fc' : '#f87171'} />
                          </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
                        <circle cx="60" cy="60" r="48" fill="none"
                          stroke="url(#careerScoreGrad)"
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={`${2*Math.PI*48} ${2*Math.PI*48}`}
                          strokeDashoffset={2*Math.PI*48*(1-score/100)}
                          style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: '60px 60px',
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            filter: score >= 70 ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' : score >= 45 ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.4))' : 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))'
                          }}/>
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{score}</span>
                        <span style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>/ 100</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--font-display)', marginBottom: 8, margin: '0 0 8px' }}>Career Score</p>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        marginBottom: 10,
                        background: score >= 70 ? 'rgba(16, 185, 129, 0.12)' : score >= 45 ? 'rgba(139, 92, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: score >= 70 ? '#34d399' : score >= 45 ? '#a78bfa' : '#f87171',
                        border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(139, 92, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: score >= 70 ? '#10b981' : score >= 45 ? '#8b5cf6' : '#ef4444', display: 'inline-block' }} />
                        {score >= 70 ? 'Good' : score >= 45 ? 'Moderate' : 'Low'}
                      </span>
                      <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                        {weeklyStudyHrs > 0 ? `+${weeklyStudyHrs}h study this week` : '0h study this week'}
                      </p>
                    </div>
                  </div>

                  {/* Skill contributors panel */}
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>Career Contributors</span>
                    
                    {/* DSA Solved */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🧩</span> DSA Practice
                        </span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{c.dsaPractice} / 10 problems</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (c.dsaPractice / 10) * 100)}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%', borderRadius: 999 }} />
                      </div>
                    </div>

                    {/* Projects Completed */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🚀</span> Projects Done
                        </span>
                        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{c.projectsCompleted} / 5</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (c.projectsCompleted / 5) * 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, #c084fc)', height: '100%', borderRadius: 999 }} />
                      </div>
                    </div>

                      {/* Coding Hours */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>💻</span> Coding Hours
                        </span>
                        <span style={{ color: '#3b82f6', fontWeight: 700 }}>{c.codingHoursDaily}h / 4h daily</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (c.codingHoursDaily / 4) * 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%', borderRadius: 999 }} />
                      </div>
                    </div>

                  {/* Skills Portfolio */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📚</span> Skills Portfolio
                        </span>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{c.skills.length} / 8</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (c.skills.length / 8) * 100)}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', height: '100%', borderRadius: 999 }} />
                      </div>
                      {c.skills.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {c.skills.slice(0, 10).map(sk => (
                            <span key={sk} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', fontWeight: 600 }}>{sk}</span>
                          ))}
                          {c.skills.length > 10 && <span style={{ fontSize: 10, color: '#64748b' }}>+{c.skills.length - 10} more</span>}
                        </div>
                      ) : (
                        <p style={{ fontSize: 10, color: '#475569', margin: '2px 0 0' }}>Log skills in the Log tab to track your portfolio</p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('recommendations')}
                  style={{
                    marginTop: 24,
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(139, 92, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    background: score >= 70 ? 'rgba(16, 185, 129, 0.06)' : score >= 45 ? 'rgba(139, 92, 246, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                    color: score >= 70 ? '#34d399' : score >= 45 ? '#c084fc' : '#f87171',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-display)',
                    outline: 'none'
                  }}
                  className="hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
                >
                  View Insights
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
              </div>

              {/* Metrics side */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'TOTAL XP', IconComp: Zap, color: '#f59e0b', value: statsData.totalXP.toLocaleString(), sub: `Level ${Math.floor(statsData.totalXP / 500) + 1}` },
                    { label: 'STREAK', IconComp: Flame, color: '#f43f5e', value: `${statsData.streak}d`, sub: statsData.streak > 0 ? 'Keep it going!' : 'Start your streak!' },
                    { label: 'TOTAL STUDY', IconComp: Clock, color: '#6366f1', value: `${Math.round(statsData.totalMinutes / 60)}h`, sub: 'Total study hours' },
                    { label: 'SESSIONS', IconComp: Calendar, color: '#8b5cf6', value: String(statsData.totalSessions), sub: 'Total focus sessions' },
                    { label: 'BEST TOPIC', IconComp: Trophy, color: '#10b981', value: statsData.bestTopic || '\u2014', sub: statsData.bestTopic && statsData.bestTopic !== '\u2014' ? 'Top topic' : 'Not enough data' },
                    { label: 'READINESS', IconComp: Target, color: '#3b82f6', value: `${placementReadiness}%`, sub: 'Placement readiness' },
                  ].map(m => (
                    <div key={m.label} style={{
                      background: 'rgba(15,20,35,0.98)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 16,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: m.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <m.IconComp size={13} color={m.color} />
                        </div>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{m.label}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>{m.value}</p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{m.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Placement Readiness Card */}
                <div style={{
                  background: 'rgba(15,20,35,0.98)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>🎯</div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 90, flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>Placement Readiness</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: scoreColor, margin: 0 }}>{placementReadiness}%</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>score</p>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: 16 }}>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, margin: '0 0 10px' }}>Aim for 75%+ to be highly competitive for roles.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, placementReadiness)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 3, background: scoreColor }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{placementReadiness}%</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── ROW 2: Cognitive Load + Skill Radar + Skills Portfolio (3 equal columns) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

              {/* Cognitive Load Meter */}
              <div style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={15} color="#f43f5e" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Cognitive Load Meter</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Based on today's study, sleep &amp; stress</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 20px' }}>
                  <CognitiveGauge value={cognitiveLoad} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { range: '< 40', color: '#10b981', label: 'Optimal', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                    { range: '40 \u2013 70', color: '#f59e0b', label: 'Moderate', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                    { range: '> 70', color: '#f43f5e', label: 'Burnout Risk', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)' },
                  ].map(l => (
                    <div key={l.label} style={{ padding: '8px 6px', borderRadius: 10, textAlign: 'center', background: l.bg, border: `1px solid ${l.border}` }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: l.color, margin: 0 }}>{l.range}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '2px 0 0' }}>{l.label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>😊</span>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {cognitiveLoad < 40
                      ? "Great! You're in a good zone to learn deeply."
                      : cognitiveLoad < 70
                        ? "Moderate load. Take 10-minute breaks every hour."
                        : "High overload! Take a longer rest before restarting."}
                  </p>
                </div>
              </div>

              {/* Skill Radar */}
              <div style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Skill Radar</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Your overall skill distribution</p>
                </div>

                <div style={{ flex: 1, minHeight: 220 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarWithIdeal} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                      <Radar name="Ideal" dataKey="full" stroke="rgba(255,255,255,0.12)" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                      <Radar name="You" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: '#818cf8', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>You</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 0, borderTop: '2px dashed #64748b', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Ideal</span>
                  </div>
                </div>

                <button onClick={() => setTab('resume')} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', width: 'fit-content',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  View all skills <ChevronRight size={14} />
                </button>
              </div>

              {/* Skills Portfolio */}
              <div style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Skills Portfolio</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Showcase your skills and progress</p>
                </div>

                {c.skills.length > 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' }}>
                    {c.skills.map(s => (
                      <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{s}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <FileText size={28} color="#64748b" />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>{c.skills.length} Skills Logged</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px', textAlign: 'center' }}>Add your first skill to get started.</p>
                    <button onClick={() => setTab('log')} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}>
                      <Plus size={15} /> Add Skill
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 3: Digital Twin Insight ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderTop: '1px solid rgba(99,102,241,0.15)',
              marginTop: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={16} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, margin: '0 0 3px' }}>Digital Twin Insight</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: loadColor, marginBottom: 4 }}>
                  {loadLabel} — Cognitive Load {Math.round(cognitiveLoad)}%
                </p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {cognitiveLoad < 40
                    ? "Consistent small study sprints boost neural retention by 42%. Log sessions daily to prevent memory degradation and keep your virtual double in peak shape."
                    : cognitiveLoad < 70
                      ? "Your virtual double is experiencing moderate load. Balance your learning sessions with regular breaks to ensure optimum neural synchronization."
                      : "High cognitive overload detected! Give your digital twin some rest to allow neural pathway stabilization and memory consolidation."}
                </p>
              </div>
              <button onClick={() => setTab('recommendations')} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                Insights <ChevronRight size={13} />
              </button>
            </div>

          </div>
        );
      })()}


      {/* ── LOG SESSION TAB ─────────────────────────────────────────────────── */}
      {tab === 'log' && (() => {
        const metricRows = [
          { 
            key: 'studyHours', 
            label: 'Study Hours Today', 
            placeholder: '4', 
            type: 'number', 
            step: '0.5',
            iconColor: '#818cf8',
            iconBg: 'rgba(99, 102, 241, 0.08)',
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )
          },
          { 
            key: 'codingHours', 
            label: 'Coding Hours Today', 
            placeholder: '3', 
            type: 'number', 
            step: '0.5',
            iconColor: '#818cf8',
            iconBg: 'rgba(99, 102, 241, 0.08)',
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            )
          },
          { 
            key: 'dsa', 
            label: 'DSA Problems Solved', 
            placeholder: '3', 
            type: 'number', 
            step: '1',
            iconColor: '#a78bfa',
            iconBg: 'rgba(139, 92, 246, 0.08)',
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-2-2h-3.5a1.5 1.5 0 0 1-3 0H9a2 2 0 0 0-2 2v3.5a1.5 1.5 0 0 1 0 3V16a2 2 0 0 0 2 2h3.5a1.5 1.5 0 0 1 3 0H19a2 2 0 0 0 2-2z" />
              </svg>
            )
          },
          { 
            key: 'projects', 
            label: 'Projects Completed', 
            placeholder: String(career?.projectsCompleted || '2'), 
            type: 'number', 
            step: '1',
            iconColor: '#818cf8',
            iconBg: 'rgba(99, 102, 241, 0.08)',
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            )
          }
        ];

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* ── Smart Study Logger ── */}
            <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Smart Study Logger</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Log a focused session — saved to your digital twin's database.</p>
                </div>
                {/* Duration dropdown selector */}
                <div style={{ position: 'relative' }}>
                  <select value={logForm.durationMinutes} onChange={e => setLogForm(p => ({ ...p, durationMinutes: +e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 28px 6px 12px', fontSize: 13, color: '#f1f5f9', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'2.5\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}>
                    <option value="15" style={{ background: '#1a1f2e' }}>15 min</option>
                    <option value="30" style={{ background: '#1a1f2e' }}>30 min</option>
                    <option value="45" style={{ background: '#1a1f2e' }}>45 min</option>
                    <option value="60" style={{ background: '#1a1f2e' }}>60 min</option>
                    <option value="90" style={{ background: '#1a1f2e' }}>90 min</option>
                    <option value="120" style={{ background: '#1a1f2e' }}>120 min</option>
                    <option value="180" style={{ background: '#1a1f2e' }}>180 min</option>
                    <option value="240" style={{ background: '#1a1f2e' }}>240 min</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Duration Slider */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Duration</label>
                  </div>
                  <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
                    {/* Track background */}
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
                    {/* Filled portion */}
                    <div style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, background: '#4f46e5', width: `${((logForm.durationMinutes - 5) / (240 - 5)) * 100}%`, transition: 'width 0.1s' }} />
                    <input type="range" min="5" max="240" step="5" value={logForm.durationMinutes}
                      onChange={e => setLogForm(p => ({ ...p, durationMinutes: +e.target.value }))}
                      style={{ position: 'relative', width: '100%', accentColor: '#ffffff', cursor: 'pointer', background: 'transparent', zIndex: 1, margin: 0 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {['5 min', '1 hr', '2 hr', '4 hr'].map(l => (
                      <span key={l} style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{l}</span>
                    ))}
                  </div>
                </div>

                {/* Topic dropdown */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Topic</label>
                  <div style={{ position: 'relative' }}>
                    <select value={logForm.topic} onChange={e => setLogForm(p => ({ ...p, topic: e.target.value }))}
                      style={{ width: '100%', background: '#0f121e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', color: '#f1f5f9', fontSize: 13, outline: 'none', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'2.5\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '14px', cursor: 'pointer' }}>
                      {TOPICS.map(t => <option key={t} value={t} style={{ background: '#1a1f2e' }}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Where did you study? */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Where did you study?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {ENVS.map(env => {
                      const isSelected = logForm.environment === env.id;
                      return (
                        <button key={env.id} onClick={() => setLogForm(p => ({ ...p, environment: env.id }))}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 10px', borderRadius: 10, border: isSelected ? '1px solid #4f46e5' : '1px solid rgba(255,255,255,0.06)', background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s', flex: 1 }}>
                          {env.icon(isSelected)}
                          <span style={{ fontSize: 12, color: isSelected ? '#ffffff' : '#94a3b8', fontWeight: 600 }}>{env.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus Quality */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Focus Quality</label>
                      <span style={{ fontSize: 12, color: '#475569', cursor: 'help' }} title="How well were you able to concentrate?">ⓘ</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>
                      {['','😴 Distracted','😐 Moderate','🙂 Good','😊 High','🔥 Peak'][logForm.focusQuality]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => setLogForm(p => ({ ...p, focusQuality: v }))}
                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: logForm.focusQuality===v ? '1px solid #4f46e5' : '1px solid rgba(255,255,255,0.06)', background: logForm.focusQuality===v ? '#4f46e5' : 'rgba(255,255,255,0.02)', color: logForm.focusQuality===v ? '#ffffff' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mental Fatigue */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Mental Fatigue</label>
                      <span style={{ fontSize: 12, color: '#eab308', cursor: 'help' }} title="How exhausted do you feel?">ⓘ</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>
                      {['','😊 Fresh','😐 Moderate','🙂 Light','😓 Tired','🤯 Exhausted'][logForm.mentalFatigue]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => setLogForm(p => ({ ...p, mentalFatigue: v }))}
                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: logForm.mentalFatigue===v ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.06)', background: logForm.mentalFatigue===v ? '#b91c1c' : 'rgba(255,255,255,0.02)', color: logForm.mentalFatigue===v ? '#ffffff' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button onClick={handleLogSession} disabled={logging}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 700, cursor: logging ? 'not-allowed' : 'pointer', opacity: logging ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4338ca'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4f46e5'}>
                  <svg style={{ width: 14, height: 14 }} fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  {logging ? 'Logging...' : 'Log Session'}
                </button>
              </div>
            </div>

            {/* ── Career Metrics Logger ── */}
            <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px 24px' }}>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Career Metrics Logger</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Update your overall career profile data.</p>
              </div>

              <form onSubmit={handleCareerLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {metricRows.map(row => (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: row.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: row.iconColor, flexShrink: 0 }}>
                      {row.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>{row.label}</span>
                      <input type={row.type} value={careerForm[row.key]} placeholder={row.placeholder}
                        onChange={e => setCareerForm(p => ({ ...p, [row.key]: e.target.value }))}
                        step={row.step} min="0"
                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#ffffff', fontSize: 14, fontWeight: 700, outline: 'none', padding: '4px 0 0', margin: 0 }} />
                    </div>
                  </div>
                ))}

                {/* Add Skill Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0 }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>Add New Skill</span>
                    <input type="text" value={careerForm.skill} placeholder="e.g. Docker, Kubernetes"
                      onChange={e => setCareerForm(p => ({ ...p, skill: e.target.value }))}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#ffffff', fontSize: 14, fontWeight: 700, outline: 'none', padding: '4px 0 0', margin: 0 }} />
                  </div>
                </div>

                {/* Submit button */}
                <button type="submit"
                  style={{ width: '100%', marginTop: 8, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                  <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Career Data
                </button>
              </form>
            </div>

          </div>
        );
      })()}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (() => {
        const totalStudyH = Math.round((statsData.totalMinutes || 0) / 60);
        const avgDailyH   = statsData.totalSessions > 0 ? (totalStudyH / Math.max(1, statsData.totalSessions)).toFixed(1) : '0';
        const consistencyScore = Math.min(100, Math.round(
          (statsData.streak > 0 ? Math.min(40, statsData.streak * 3) : 0) +
          (statsData.totalSessions > 0 ? Math.min(40, statsData.totalSessions * 2) : 0) +
          (totalStudyH > 0 ? Math.min(20, totalStudyH) : 0)
        ));

        // Compute peak study hour from real sessions
        const peakStudyTime = (() => {
          if (!sessions.length) return null;
          const hourBuckets = {};
          sessions.forEach(s => {
            const d = new Date(s.createdAt || s.sessionDate || Date.now());
            const h = d.getHours();
            const bucket = Math.floor(h / 2) * 2; // 2-hour buckets
            hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
          });
          const peakHour = Object.entries(hourBuckets).sort((a,b) => b[1]-a[1])[0]?.[0];
          if (peakHour == null) return null;
          const h = Number(peakHour);
          const fmt = hr => { const ampm = hr < 12 ? 'AM' : 'PM'; const h12 = hr === 0 ? 12 : hr > 12 ? hr-12 : hr; return `${h12} ${ampm}`; };
          return `${fmt(h)} – ${fmt(h+2)}`;
        })();

        const INSIGHTS = [
          { 
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ), 
            label: 'Most Productive Day',
            value: heatmapData.bestDay || (sessions.length ? 'Computing…' : 'Log sessions'),
            bg: 'rgba(99,102,241,0.12)',  
            ic: '#818cf8' 
          },
          { 
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ), 
            label: 'Peak Study Time',
            value: peakStudyTime || (sessions.length ? 'Computing…' : 'Log sessions'),
            bg: 'rgba(99,102,241,0.12)',  
            ic: '#818cf8' 
          },
          { 
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ), 
            label: 'Best Streak',          
            value: `${statsData.streak || 0} Days`,    
            bg: 'rgba(249,115,22,0.12)', 
            ic: '#f97316' 
          },
          { 
            icon: (
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            ), 
            label: 'Avg Daily Focus',      
            value: `${avgDailyH} hrs`,                  
            bg: 'rgba(16,185,129,0.12)', 
            ic: '#10b981' 
          },
        ];

        // Build 6-month study hours trend from sessions
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();

        // Real monthly deltas
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;
        const sessionKey = s => { const d = new Date(s.createdAt||s.sessionDate||Date.now()); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
        const thisMoSessions = sessions.filter(s => sessionKey(s) === thisMonthKey);
        const lastMoSessions = sessions.filter(s => sessionKey(s) === lastMonthKey);
        const thisMoHrs  = Math.round(thisMoSessions.reduce((s2,s) => s2+(s.durationMinutes||0)/60, 0));
        const lastMoHrs  = Math.round(lastMoSessions.reduce((s2,s) => s2+(s.durationMinutes||0)/60, 0));
        const deltaHrs   = thisMoHrs - lastMoHrs;
        const deltaSess  = thisMoSessions.length - lastMoSessions.length;
        const thisMoXP   = thisMoSessions.reduce((s2,s) => s2+(s.xpEarned||10), 0);
        const lastMoXP   = lastMoSessions.reduce((s2,s) => s2+(s.xpEarned||10), 0);
        const deltaXP    = thisMoXP - lastMoXP;
        const deltaHrsStr  = deltaHrs  >= 0 ? `+${deltaHrs}h this month`  : `${deltaHrs}h this month`;
        const deltaSessStr = deltaSess >= 0 ? `+${deltaSess} this month`   : `${deltaSess} this month`;
        const deltaXPStr   = deltaXP   >= 0 ? `+${deltaXP} this month`    : `${deltaXP} this month`;
        const trendData = Array.from({length:6},(_,i)=>{
          const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const hrs = sessions.filter(s=>{
            const sd = new Date(s.createdAt||s.sessionDate||Date.now());
            return `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}` === key;
          }).reduce((sum,s)=>sum+(s.durationMinutes||0)/60,0);
          return { month: months[d.getMonth()], hours: Math.round(hrs) };
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── STAT CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
              {[
                {
                  icon: <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
                  label: 'Total XP',         
                  value: (heatmapData.totalXP||0).toLocaleString(),
                  sub: sessions.length > 0 ? deltaXPStr : 'Log sessions to track',
                  color: '#818cf8',
                  bg: 'rgba(99, 102, 241, 0.12)',
                  border: 'rgba(99, 102, 241, 0.25)',
                  subColor: '#10b981'
                },
                {
                  icon: <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                  label: 'Current Streak',   
                  value: `${statsData.streak||0} Days`,
                  sub: (statsData.streak||0) > 0 ? `Keep it up!` : 'Start logging to build streak',
                  color: '#f97316',
                  bg: 'rgba(249, 115, 22, 0.12)',
                  border: 'rgba(249, 115, 22, 0.25)',
                  subColor: '#64748b'
                },
                {
                  icon: <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                  label: 'Total Study Time', 
                  value: `${totalStudyH}h`,
                  sub: sessions.length > 0 ? deltaHrsStr : 'Log sessions to track',
                  color: '#3b82f6',
                  bg: 'rgba(59, 130, 246, 0.12)',
                  border: 'rgba(59, 130, 246, 0.25)',
                  subColor: '#10b981'
                },
                {
                  icon: <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
                  label: 'Sessions Completed',
                  value: statsData.totalSessions||0,
                  sub: sessions.length > 0 ? deltaSessStr : 'Log sessions to track',
                  color: '#a855f7',
                  bg: 'rgba(168, 85, 247, 0.12)',
                  border: 'rgba(168, 85, 247, 0.25)',
                  subColor: '#10b981'
                },
              ].map(s=>(
                <div key={s.label} style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: s.subColor, marginTop: 4, fontWeight: 600, margin: '4px 0 0' }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── HEATMAP + INSIGHTS ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

              {/* Heatmap card */}
              <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Focus Heatmap</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>(Last 90 Days)</span>
                  <span title="Each square = one day. Darker = more study time." style={{ fontSize: 12, color: '#475569', cursor: 'help' }}>ⓘ</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64, flex: 1 }}>
                  {/* Heatmap */}
                  <div style={{ flexShrink: 0 }}>
                    {loading
                      ? <div style={{ height: 100, width: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>Loading…</div>
                      : <FocusHeatmap heatmap={heatmapData.heatmap} />
                    }
                  </div>
                  
                  {/* Consistency Score ring */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, width: 160 }}>
                    <div style={{ position: 'relative', width: 120, height: 120 }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
                        <circle cx="60" cy="60" r="51" fill="none" stroke="#6366f1" strokeWidth="8"
                          strokeDasharray={`${(consistencyScore/100)*(2*Math.PI*51)} ${2*Math.PI*51}`} strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 1s ease' }}/>
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{consistencyScore}%</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: '4px 0 0', textAlign: 'center' }}>Consistency Score</p>
                    <p style={{ fontSize: 11, color: '#10b981', margin: '2px 0 0', fontWeight: 600, textAlign: 'center' }}>↑ +12% this month</p>
                  </div>
                </div>
              </div>

              {/* Learning Insights */}
              <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>Learning Insights</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {INSIGHTS.map((ins,i)=>(
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: ins.bg, border: `1px solid rgba(255,255,255,0.03)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ins.ic, flexShrink: 0 }}>
                        {ins.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{ins.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{ins.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ACTIVITY + TREND ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

              {/* Recent Learning Activity */}
              <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Recent Learning Activity</p>
                  {sessions.length>4&&<button style={{ fontSize: 13, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all sessions →</button>}
                </div>
                {sessions.length===0
                  ? <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>No sessions yet — log your first session.</div>
                  : <div style={{ position: 'relative' }}>
                      {/* Vertical timeline line */}
                      <div style={{ position: 'absolute', left: 5, top: 12, bottom: 12, width: 2, background: 'rgba(99,102,241,0.15)', borderRadius: 1 }}/>
                      {sessions.slice(0,4).map((s,i)=>(
                        <div key={s.id||i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', paddingLeft: 0 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1', border: '3px solid #12141a', flexShrink: 0, zIndex: 1, marginLeft: 0 }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{new Date(s.createdAt||s.sessionDate||Date.now()).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{s.topic}</p>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', flexShrink: 0, marginRight: 8 }}>
                            {s.durationMinutes>=60?`${Math.floor(s.durationMinutes/60)} hr${s.durationMinutes%60>0?' '+s.durationMinutes%60+'m':''}`:s.durationMinutes+' min'}
                          </span>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Study Hours Trend */}
              <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Study Hours Trend</p>
                    <span title="Monthly study hours" style={{ fontSize: 12, color: '#475569', cursor: 'help' }}>ⓘ</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>This Year ▾</span>
                </div>
                <div style={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={v => `${v}h`} contentStyle={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }}/>
                      <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2.5} fill="url(#studyGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {(() => {
                  const older = trendData.slice(0, 4);
                  const newer = trendData.slice(4);
                  const oldAvg = older.length ? older.reduce((s,d) => s+d.hours, 0)/older.length : 0;
                  const newAvg = newer.length ? newer.reduce((s,d) => s+d.hours, 0)/newer.length : 0;
                  if (!oldAvg) return <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, margin: '12px 0 0' }}>Log sessions to see your trend</p>;
                  const pct = Math.round(((newAvg - oldAvg) / Math.max(1, oldAvg)) * 100);
                  return <p style={{ fontSize: 12, color: pct >= 0 ? '#10b981' : '#ef4444', marginTop: 12, fontWeight: 600, margin: '12px 0 0' }}>{pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}% study hours vs previous period</p>;
                })()}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── Generator card ── */}
            <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎯</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>AI Learning Path Generator</p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>Enter your current and target roles for a personalized roadmap.</p>
                </div>
              </div>
              <form onSubmit={handleGenerateLearningPath} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Current Role</label>
                  <input type="text" value={lpCurrentRole} onChange={e => setLpCurrentRole(e.target.value)} placeholder="e.g. Software Engineer"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Target Role</label>
                  <input type="text" value={lpTargetRole} onChange={e => setLpTargetRole(e.target.value)} placeholder="e.g. Machine Learning Engineer"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button type="submit" disabled={lpLoading}
                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: lpLoading ? 'not-allowed' : 'pointer', opacity: lpLoading ? 0.6 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {lpLoading ? <><div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" /> Building…</> : 'Generate Path 🚀'}
                  </button>
                  {lpResult && !lpLoading && (
                    <button type="button" onClick={() => setLpResult(null)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ── Career Path Simulation ── */}
            <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Career Path Simulation</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Salary milestones from {lpCurrentRole || 'current role'} → {lpTargetRole || 'target role'}</p>
                  </div>
                </div>
                <button onClick={handleRunSimulation} disabled={simLoading || !lpCurrentRole.trim() || !lpTargetRole.trim()}
                  style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: simLoading || !lpCurrentRole.trim() || !lpTargetRole.trim() ? 'not-allowed' : 'pointer', opacity: simLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {simLoading ? <><div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" /> Simulating…</> : 'Run Simulation →'}
                </button>
              </div>

              {simResult && (
                <div>
                  {/* Summary row */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Current Salary', value: simResult.currentSalary?.label || '—', color: '#f59e0b' },
                      { label: 'Target Salary',  value: simResult.targetSalary?.label  || '—', color: '#10b981' },
                      { label: 'Salary Growth',  value: `+${simResult.salaryGrowthPct || 0}%`,  color: '#8b5cf6' },
                      { label: 'Timeline',       value: `${simResult.totalMonths || '—'} months`, color: '#6366f1' },
                    ].map(s => (
                      <div key={s.label} style={{ flex: '1 1 120px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 12px' }}>
                        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 3px', fontWeight: 600 }}>{s.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Phase timeline */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 14, top: 16, bottom: 16, width: 2, background: 'linear-gradient(180deg,#8b5cf6,#6366f1)', borderRadius: 2 }} />
                    {(simResult.phases || []).map((phase, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: i === (simResult.phases.length - 1) ? '#8b5cf6' : 'rgba(139,92,246,0.2)', border: '2px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#a78bfa', flexShrink: 0, zIndex: 1 }}>
                          {phase.month}m
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{phase.role}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>₹{phase.salaryMin}–{phase.salaryMax} LPA</span>
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', lineHeight: 1.4 }}>{phase.milestone}</p>
                          {phase.action && <p style={{ fontSize: 10, color: '#475569', margin: 0, fontStyle: 'italic' }}>→ {phase.action}</p>}
                          {phase.skillsToAdd?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                              {phase.skillsToAdd.map(s => (
                                <span key={s} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {simResult.keyInsight && (
                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p style={{ fontSize: 11, color: '#818cf8', margin: 0 }}>💡 {simResult.keyInsight}</p>
                    </div>
                  )}
                  <p style={{ fontSize: 9, color: '#374151', margin: '6px 0 0', textAlign: 'right' }}>
                    {simResult.source === 'ai' ? 'AI-generated · Groq' : 'Estimated · based on market data'}
                  </p>
                </div>
              )}

              {!simResult && !simLoading && (
                <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '12px 0' }}>
                  Fill in Current Role + Target Role above, then click Run Simulation to see your salary trajectory.
                </p>
              )}
            </div>

            {/* ── Roadmap header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Your Personalized Roadmap</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
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
              <div style={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, borderLeft: '2px dashed rgba(255,255,255,0.1)' }} />

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
                    style={{ display: 'flex', gap: 14, marginBottom: 8, opacity: isLocked ? 0.65 : 1 }}>
                    {/* Number circle */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: isLocked ? 'rgba(15,18,30,0.95)' : 'rgba(99,102,241,0.2)', border: `2px solid ${isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: isLocked ? '#475569' : '#818cf8', zIndex: 1 }}>
                        {i + 1}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{ flex: 1, background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: meta.icon === '</>' ? 14 : 18, fontWeight: 800, color: '#f1f5f9', flexShrink: 0, fontFamily: 'monospace' }}>
                          {meta.icon}
                        </div>
                        {/* Title + desc */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{phaseName}</p>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                          </div>
                          <p style={{ fontSize: 12, color: '#64748b', marginBottom: isAI && aiCourses.length ? 0 : 4 }}>{meta.desc}</p>
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
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {aiCourses.map((course, ci) => (
                            <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{course.title}</p>
                                <p style={{ fontSize: 11, color: '#475569' }}>⏱ {course.hours} hrs · {course.cost}</p>
                              </div>
                              <a href={course.url} target="_blank" rel="noopener noreferrer"
                                style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💡</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 1 }}>How it works</p>
                <p style={{ fontSize: 12, color: '#64748b' }}>Our AI analyzes your goals, role, and progress to create a roadmap tailored for you.</p>
              </div>
              <button style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <JobsTab userSkills={userSkills} targetRole={c.targetRole} onNavigate={setTab} />
        </div>
      )}

      {/* ── MARKET INSIGHTS TAB ─────────────────────────────────────────────── */}
      {tab === 'intelligence' && (
        <CareerIntelligenceTab
          userSkills={userSkills}
          targetRole={c.targetRole || 'Software Engineer'}
          health={health}
          computed={computed}
        />
      )}

      {/* ── RESUME AI TAB ─────────────────────────────────────────────────────── */}
      {tab === 'resume' && (
        <ResumeTab career={c} updateDomain={updateDomain} />
      )}
    </div>
  );
}
