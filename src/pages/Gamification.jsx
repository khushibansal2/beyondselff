import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { badges as allBadges, challenges as allChallenges } from '../data/demoData';
import { GlassCard, PageHeader, Badge, AchievementPopup, showToast } from '../components/ui/Components';
import {
  Zap, Shield, Brain, Flame, TrendingUp, Target, Clock, Users,
  Trophy, Play, Pause, RotateCcw, Sparkles, Star, ChevronRight,
  CheckCircle, AlertTriangle, Lock, Swords, Scroll, Wind,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ARCHETYPES = ['Shadow','Iron','Void','Storm','Night','Silent','Ember','Fractal','Sage','Phoenix'];
const ROLES      = ['Monk','Architect','Strategist','Sentinel','Coder','Weaver','Scholar','Pioneer','Forger','Mind'];

const TIERS = [
  { name: 'Wanderer',    min: 0,      color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
  { name: 'Apprentice',  min: 500,    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { name: 'Seeker',      min: 2000,   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  { name: 'Forged',      min: 6000,   color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { name: 'Disciplined', min: 15000,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { name: 'Sovereign',   min: 30000,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { name: 'Architect',   min: 60000,  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  { name: 'Ascendant',   min: 100000, color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
  { name: 'Mythic',      min: 160000, color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  { name: 'Eternal',     min: 250000, color: '#ffffff', bg: 'rgba(255,255,255,0.10)' },
];

const STAT_META = [
  { key: 'focus',            label: 'Focus',            icon: Brain,     color: '#6366f1', desc: 'Deep work quality & study depth'         },
  { key: 'discipline',       label: 'Discipline',       icon: Shield,    color: '#8b5cf6', desc: 'Consistency and habit strength'           },
  { key: 'calmness',         label: 'Calmness',         icon: Wind,      color: '#06b6d4', desc: 'Stress management & mental clarity'       },
  { key: 'energy',           label: 'Energy',           icon: Zap,       color: '#f59e0b', desc: 'Physical vitality & sleep quality'        },
  { key: 'financialWisdom',  label: 'Fin. Wisdom',      icon: TrendingUp,color: '#10b981', desc: 'Savings rate & spending discipline'       },
  { key: 'socialConfidence', label: 'Confidence',       icon: Users,     color: '#ec4899', desc: 'Interpersonal growth & presence'          },
  { key: 'consistency',      label: 'Consistency',      icon: Target,    color: '#f97316', desc: 'Long-term reliability across domains'     },
  { key: 'recoveryStrength', label: 'Recovery',         icon: Flame,     color: '#ef4444', desc: 'Bounce-back speed after setbacks'         },
];

const GUILDS = [
  { id:'g1', name:'5AM Club',           icon:'🌅', desc:'Early risers building momentum before the world wakes.',        stat:'Discipline',       members:2847, color:'#f59e0b', xp:'1.2M', rank:'Gold'     },
  { id:'g2', name:'Deep Work League',   icon:'🧠', desc:'Focus maximalists. No distractions. Only depth.',              stat:'Focus',            members:4123, color:'#6366f1', xp:'3.4M', rank:'Mythic'   },
  { id:'g3', name:'No-Spend Warriors',  icon:'🛡️', desc:'Financial discipline through intentional spending.',           stat:'Financial Wisdom', members:1654, color:'#10b981', xp:'890K', rank:'Silver'   },
  { id:'g4', name:'Iron Brotherhood',   icon:'⚡', desc:'Physical discipline. Train harder than yesterday.',            stat:'Energy',           members:3291, color:'#ef4444', xp:'2.1M', rank:'Gold'     },
  { id:'g5', name:'Monk Mode Society',  icon:'🌙', desc:'Digital detox. Solitude. Clarity through silence.',            stat:'Calmness',         members: 982, color:'#8b5cf6', xp:'654K', rank:'Silver'   },
  { id:'g6', name:'Recovery Guild',     icon:'🔥', desc:'Rising stronger after every setback. No shame here.',          stat:'Recovery',         members:1876, color:'#f97316', xp:'743K', rank:'Bronze'   },
];

const GRIND_ROOMS = [
  { id:'r1', name:'The Forge',       type:'Deep Work',      minutes:90, icon:'⚒️', sound:'Binaural 40Hz',   users:47  },
  { id:'r2', name:'Pomodoro Hall',   type:'Pomodoro 25/5',  minutes:25, icon:'🍅', sound:'Rain on Glass',   users:138 },
  { id:'r3', name:'Dawn Session',    type:'Morning Energy', minutes:45, icon:'🌅', sound:'Forest Ambience', users:23  },
  { id:'r4', name:'Night Architect', type:'Late Night',     minutes:60, icon:'🌙', sound:'Deep Silence',    users:89  },
  { id:'r5', name:'Recovery Space',  type:'Light Focus',    minutes:20, icon:'🌿', sound:'Tibetan Bowls',   users:31  },
];

const PHANTOM_USERS = [
  'Shadow Monk','Iron Phoenix','Void Sentinel','Storm Architect','Night Strategist',
  'Silent Forger','Ember Mind','Fractal Sage','Iron Weaver','Void Scholar',
  'Storm Pioneer','Phoenix Coder','Sage Sentinel','Night Monk','Silent Architect',
];

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
function groqKey() { return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || ''; }

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateCodename(seed = 'user') {
  const h = String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 17);
  return `${ARCHETYPES[h % ARCHETYPES.length]} ${ROLES[(h * 13) % ROLES.length]}`;
}

function getTier(xp) {
  let tier = TIERS[0];
  for (const t of TIERS) { if (xp >= t.min) tier = t; else break; }
  return tier;
}

function getNextTier(xp) {
  for (let i = 0; i < TIERS.length; i++) {
    if (xp < TIERS[i].min) return { tier: TIERS[i], prev: TIERS[i - 1] ?? TIERS[0] };
  }
  return { tier: TIERS[TIERS.length - 1], prev: TIERS[TIERS.length - 2] };
}

function computeLifeStats(health = {}, finance = {}, career = {}, xp = 0) {
  const sleep   = Math.min(100, Math.round(((health.sleepAvg    || 6) / 9)  * 100));
  const stress  = Math.min(100, Math.round(((10 - (health.stressLevel || 5)) / 10) * 100));
  const workout = Math.min(100, Math.round(((health.workoutsPerWeek || 0) / 7) * 100));
  const water   = Math.min(100, Math.round(((health.waterIntake  || 0) / 8) * 100));
  const study   = Math.min(100, Math.round(((career.studyHoursDaily || 0) / 8) * 100));
  const dsa     = Math.min(100, Math.round(((career.dsaPractice  || 0) / 5) * 100));
  const savRate = finance.income > 0 ? Math.max(0, (finance.income - (finance.expenses || 0)) / finance.income) : 0.3;
  const xpScore = Math.min(100, Math.round(Math.log10(xp + 10) * 18));
  return {
    focus:            Math.max(15, Math.round((study + dsa) / 2)),
    discipline:       Math.max(15, Math.round((xpScore * 0.6 + study * 0.4))),
    calmness:         Math.max(15, Math.round((stress + sleep) / 2)),
    energy:           Math.max(15, Math.round((sleep + workout + water) / 3)),
    financialWisdom:  Math.max(15, Math.round(savRate * 100)),
    socialConfidence: Math.max(20, Math.min(100, 38 + Math.round((career.linkedinConnections || 0) / 25))),
    consistency:      Math.max(15, xpScore),
    recoveryStrength: Math.max(30, Math.min(100, 50 + Math.round(xpScore * 0.3))),
  };
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBar({ meta, value, prevValue }) {
  const Icon = meta.icon;
  const delta = value - (prevValue ?? value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color: meta.color }} />
          <span className="text-[11px] text-[#a1a1aa] font-medium">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {prevValue !== undefined && delta !== 0 && (
            <span className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
          <span className="text-[12px] font-bold text-[#f0f0f3]">{value}</span>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        {prevValue !== undefined && (
          <div className="absolute h-full rounded-full opacity-25" style={{ width: `${prevValue}%`, background: meta.color }} />
        )}
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}60` }}
        />
      </div>
    </div>
  );
}

// ── IDENTITY PANEL ─────────────────────────────────────────────────────────────

function IdentityPanel({ codename, tier, xp, stats, prevStats, isRecovery }) {
  const { tier: nextTier, prev: currentTier } = getNextTier(xp);
  const xpInBand = xp - currentTier.min;
  const bandSize = nextTier.min - currentTier.min;
  const pct      = Math.min(100, Math.round((xpInBand / bandSize) * 100));
  const harmony  = Math.round(100 - (Math.sqrt(STAT_META.reduce((acc, m) => {
    const diff = stats[m.key] - (STAT_META.reduce((s, n) => s + stats[n.key], 0) / 8);
    return acc + diff * diff;
  }, 0) / 8)) * 2);

  return (
    <div className="space-y-5">
      {/* Codename + Tier card */}
      <GlassCard>
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border-2 border-white/[0.08]"
              style={{ background: `radial-gradient(circle at 30% 30%, ${tier.bg}, #111318)`, boxShadow: `0 0 30px ${tier.color}30` }}>
              🧬
            </div>
            <div className="absolute -bottom-1 -right-1 text-[9px] font-black px-2 py-0.5 rounded-full border"
              style={{ background: tier.bg, borderColor: tier.color + '40', color: tier.color }}>
              {tier.name}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-[18px] font-black text-[#f0f0f3] tracking-tight">{codename}</h2>
              {isRecovery && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">RECOVERY ARC</span>
              )}
            </div>
            <p className="text-[12px] text-[#52525b] mb-3">Anonymous Identity · {tier.name} Tier</p>

            {/* XP Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#52525b] font-semibold uppercase tracking-wider">{currentTier.name} → {nextTier.name}</span>
                <span className="text-[#71717a]">{xp.toLocaleString()} / {nextTier.min.toLocaleString()} XP</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`, boxShadow: `0 0 12px ${tier.color}60` }} />
              </div>
              <p className="text-[10px] text-[#3f3f46]">{pct}% to {nextTier.name}</p>
            </div>
          </div>

          {/* Harmony score */}
          <div className="text-center flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center"
              style={{ borderColor: harmony >= 70 ? '#10b981' : harmony >= 50 ? '#f59e0b' : '#ef4444' }}>
              <span className="text-[18px] font-black" style={{ color: harmony >= 70 ? '#10b981' : harmony >= 50 ? '#f59e0b' : '#ef4444' }}>
                {Math.max(0, harmony)}
              </span>
            </div>
            <p className="text-[9px] text-[#52525b] mt-1 font-semibold">HARMONY</p>
          </div>
        </div>

        {isRecovery && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <p className="text-[12px] text-amber-300 leading-relaxed">
              <strong>Recovery Arc active.</strong> Smaller quests have been generated. Each completion brings you back stronger. Your streak memory is preserved.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Past Self vs Present Self */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Swords size={14} className="text-indigo-400" />
          <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Present Self vs Shadow Self</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 ml-auto">30 days ago</span>
        </div>
        <div className="space-y-3">
          {STAT_META.map(m => (
            <StatBar key={m.key} meta={m} value={stats[m.key]} prevValue={prevStats[m.key]} />
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
          <p className="text-[11px] text-[#52525b]">Overall improvement vs Shadow Self</p>
          <span className="text-[13px] font-bold text-emerald-400">
            +{Math.round(STAT_META.reduce((a, m) => a + (stats[m.key] - prevStats[m.key]), 0) / STAT_META.length)} avg
          </span>
        </div>
      </GlassCard>

      {/* 8 Life Stats Grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {STAT_META.map(m => {
          const Icon = m.icon;
          return (
            <GlassCard key={m.key} className="text-center !p-3">
              <Icon size={16} className="mx-auto mb-1.5" style={{ color: m.color }} />
              <p className="text-[18px] font-black text-[#f0f0f3]">{stats[m.key]}</p>
              <p className="text-[9px] text-[#52525b] mt-0.5 leading-tight">{m.label}</p>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ── QUESTS PANEL ───────────────────────────────────────────────────────────────

async function fetchAIQuests(stats, codename, isRecovery) {
  const key = groqKey();
  if (!key) throw new Error('NO_KEY');
  const weakest = STAT_META.sort((a, b) => stats[a.key] - stats[b.key]).slice(0, 2).map(m => m.label).join(', ');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are the Guild Master AI for an anonymous self-improvement RPG. Generate 3 personalized quests for ${codename}.

Context:
- Weakest stats: ${weakest}
- Mode: ${isRecovery ? 'Recovery Arc (easier quests needed)' : 'Growth Mode'}
- Focus level: ${stats.focus}, Discipline: ${stats.discipline}, Calmness: ${stats.calmness}

Return ONLY valid JSON array, no markdown:
[
  {
    "title": "short quest title",
    "description": "1 sentence, specific and actionable",
    "type": "daily|weekly|recovery",
    "stat": "which stat this improves",
    "xp": <50-300>,
    "icon": "single emoji",
    "difficulty": "easy|medium|hard"
  }
]

Make quests specific, not generic. RPG tone. Under 15 words per description.`,
      }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content ?? '';
  raw = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
  const s = raw.indexOf('['), e = raw.lastIndexOf(']');
  if (s !== -1 && e > s) raw = raw.slice(s, e + 1);
  return JSON.parse(raw);
}

function QuestsPanel({ stats, codename, isRecovery, activeChallenges, toggleChallenge, health, finance, career }) {
  const [aiQuests, setAiQuests]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [completed, setCompleted]   = useState(new Set());

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const quests = await fetchAIQuests(stats, codename, isRecovery);
      setAiQuests(quests);
    } catch (e) {
      setError(e.message === 'NO_KEY' ? 'Add VITE_GROQ_API_KEY to .env to generate AI quests.' : e.message);
    } finally { setLoading(false); }
  }

  const DIFF_COLOR = { easy: 'text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20', medium: 'text-amber-400 bg-amber-500/[0.08] border-amber-500/20', hard: 'text-red-400 bg-red-500/[0.08] border-red-500/20' };

  return (
    <div className="space-y-5">
      {/* AI Quests */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scroll size={14} className="text-indigo-400" />
            <h3 className="text-[13px] font-semibold text-[#f0f0f3]">AI-Generated Quests</h3>
            {isRecovery && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">Recovery Mode</span>}
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={13} />}
            {loading ? 'Generating…' : aiQuests.length ? 'Regenerate' : 'Generate Quests'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {aiQuests.length === 0 && !loading && (
          <div className="text-center py-10 text-[#52525b]">
            <Sparkles size={28} className="mx-auto mb-3 text-[#3f3f46]" />
            <p className="text-[13px] font-semibold text-[#71717a] mb-1">No quests yet</p>
            <p className="text-[12px]">Click Generate to get AI-personalized quests based on your weakest stats.</p>
          </div>
        )}

        <div className="space-y-3">
          {aiQuests.map((q, i) => {
            const done = completed.has(i);
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`p-3.5 rounded-xl border transition-all ${done ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{q.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={`text-[12px] font-semibold ${done ? 'line-through text-[#52525b]' : 'text-[#f0f0f3]'}`}>{q.title}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold capitalize ${DIFF_COLOR[q.difficulty] ?? DIFF_COLOR.medium}`}>{q.difficulty}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#52525b] capitalize">{q.type}</span>
                    </div>
                    <p className="text-[11px] text-[#71717a] leading-relaxed">{q.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-amber-400 font-semibold">+{q.xp} XP · {q.stat}</span>
                      <button onClick={() => setCompleted(s => { const n = new Set(s); done ? n.delete(i) : n.add(i); return n; })}
                        className={`text-[10px] px-3 py-1 rounded-full border font-semibold transition-all ${done ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'border-white/[0.08] text-[#71717a] hover:text-[#a1a1aa]'}`}>
                        {done ? '✓ Done' : 'Complete'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Existing Challenges */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-purple-400" />
          <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Domain Challenges</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {allChallenges.map((ch, i) => {
            const isActive = activeChallenges.has(ch.id);
            let progress = 0;
            if (ch.id === 'c1') progress = Math.min(100, Math.round(((health?.sleepAvg || 0) / 7) * 100));
            if (ch.id === 'c2') progress = finance?.expenses > 0 ? Math.max(0, 100 - Math.round((finance.expenses / (finance.income || 1)) * 100)) : 100;
            if (ch.id === 'c3') progress = Math.min(100, Math.round(((career?.dsaPractice || 0) / 5) * 100));
            if (ch.id === 'c4') progress = Math.min(100, Math.round(((health?.workoutsPerWeek || 0) / 5) * 100));
            if (ch.id === 'c5') progress = Math.min(100, Math.round(((finance?.savings || 0) / Math.max(finance?.expenses || 1, 1)) * 100));
            return (
              <div key={ch.id} className={`p-3.5 rounded-xl border transition-all ${isActive ? 'bg-indigo-500/[0.04] border-indigo-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#f0f0f3] truncate">{ch.title}</p>
                    <p className="text-[10px] text-[#52525b]">{ch.duration}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#71717a] mb-2.5 leading-relaxed">{ch.desc}</p>
                {isActive && (
                  <div className="mb-2.5">
                    <div className="flex justify-between text-[10px] text-[#52525b] mb-1"><span>Progress</span><span>{progress}%</span></div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-400 font-semibold">+{ch.reward} XP</span>
                  <button onClick={() => toggleChallenge(ch.id)}
                    className={`text-[10px] px-3 py-1.5 rounded-xl border font-semibold transition-all ${isActive ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                    {isActive ? 'Abandon' : 'Accept'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

// ── GRIND ROOM PANEL ───────────────────────────────────────────────────────────

function GrindRoomPanel({ onXP }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [running,      setRunning]      = useState(false);
  const [done,         setDone]         = useState(false);
  const [sessions,     setSessions]     = useState(0);
  const intervalRef = useRef(null);
  const phantoms = useMemo(() => PHANTOM_USERS.sort(() => Math.random() - 0.5).slice(0, 6), []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            setSessions(s => s + 1);
            onXP?.(selectedRoom?.minutes >= 60 ? 200 : selectedRoom?.minutes >= 45 ? 150 : 100);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function enterRoom(room) {
    setSelectedRoom(room);
    setTimeLeft(room.minutes * 60);
    setRunning(false);
    setDone(false);
  }

  function reset() {
    setRunning(false);
    setTimeLeft(selectedRoom ? selectedRoom.minutes * 60 : 0);
    setDone(false);
  }

  const pct = selectedRoom ? Math.round(((selectedRoom.minutes * 60 - timeLeft) / (selectedRoom.minutes * 60)) * 100) : 0;

  if (!selectedRoom) {
    return (
      <div className="space-y-5">
        <GlassCard>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-indigo-400" />
            <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Silent Grind Rooms</h3>
          </div>
          <p className="text-[12px] text-[#52525b] mb-5">Join anonymously. Work in silence. Earn XP on completion. Others are grinding right now.</p>
          <div className="space-y-2.5">
            {GRIND_ROOMS.map(room => (
              <button key={room.id} onClick={() => enterRoom(room)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all text-left group">
                <span className="text-2xl flex-shrink-0">{room.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#f0f0f3]">{room.name}</p>
                  <p className="text-[11px] text-[#52525b]">{room.type} · {room.sound}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-bold text-[#a1a1aa]">{room.minutes} min</p>
                  <p className="text-[10px] text-emerald-400">{room.users} grinding</p>
                </div>
                <ChevronRight size={14} className="text-[#3f3f46] group-hover:text-[#71717a] flex-shrink-0" />
              </button>
            ))}
          </div>
        </GlassCard>

        {sessions > 0 && (
          <GlassCard className="border border-emerald-500/15">
            <p className="text-[11px] text-[#52525b] mb-1 font-semibold uppercase tracking-wider">Today's Grind</p>
            <p className="text-[24px] font-black text-emerald-400">{sessions} session{sessions !== 1 ? 's' : ''} completed</p>
          </GlassCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="border border-indigo-500/15 bg-indigo-500/[0.02]">
        {/* Room header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedRoom.icon}</span>
            <div>
              <p className="text-[14px] font-bold text-[#f0f0f3]">{selectedRoom.name}</p>
              <p className="text-[11px] text-[#52525b]">{selectedRoom.type} · {selectedRoom.sound}</p>
            </div>
          </div>
          <button onClick={() => setSelectedRoom(null)} className="text-[11px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">← Rooms</button>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center w-40 h-40">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <motion.circle cx="80" cy="80" r="70" fill="none" stroke="#6366f1" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))' }}
                transition={{ duration: 0.5 }} />
            </svg>
            <div className="text-center z-10">
              <p className="text-[32px] font-black text-[#f0f0f3] tabular-nums leading-none">{fmtTime(timeLeft)}</p>
              <p className="text-[10px] text-[#52525b] mt-1">{pct}% complete</p>
            </div>
          </div>
        </div>

        {done ? (
          <div className="text-center mb-5">
            <p className="text-[14px] font-bold text-emerald-400 mb-1">Session Complete.</p>
            <p className="text-[12px] text-[#71717a]">The system has recorded your work. XP awarded.</p>
          </div>
        ) : null}

        {/* Controls */}
        <div className="flex gap-2 justify-center mb-6">
          <button onClick={() => setRunning(r => !r)} disabled={done}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[13px] text-white disabled:opacity-40 transition-all"
            style={{ background: running ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: running ? '1px solid rgba(239,68,68,0.3)' : 'none', color: running ? '#fca5a5' : 'white' }}>
            {running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> {done ? 'Done' : timeLeft === selectedRoom.minutes * 60 ? 'Start' : 'Resume'}</>}
          </button>
          <button onClick={reset} className="p-2.5 rounded-xl border border-white/[0.08] text-[#52525b] hover:text-[#a1a1aa] transition-all">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Live presence */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[10px] text-[#52525b] font-semibold uppercase tracking-wider mb-3">
            {selectedRoom.users + (running ? 1 : 0)} grinding in silence
          </p>
          <div className="flex flex-wrap gap-2">
            {phantoms.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-[#52525b]">{name}</span>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-1.5">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-semibold">You</span>
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-3">
            {['🔥','⚡','👏'].map(r => (
              <button key={r} onClick={() => showToast(`${r} sent to the room`, 'success')}
                className="text-[13px] hover:scale-125 transition-transform">{r}</button>
            ))}
          </div>
        </div>
      </GlassCard>

      {sessions > 0 && (
        <GlassCard className="border border-emerald-500/15">
          <p className="text-[11px] text-[#52525b] mb-1 uppercase tracking-wider">Sessions today</p>
          <p className="text-[22px] font-black text-emerald-400">{sessions} completed</p>
        </GlassCard>
      )}
    </div>
  );
}

// ── GUILDS PANEL ───────────────────────────────────────────────────────────────

function GuildsPanel({ myGuildId, onJoin }) {
  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} className="text-purple-400" />
          <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Anonymous Guilds</h3>
        </div>
        <p className="text-[12px] text-[#52525b] mb-5">Join a guild to share XP, complete collective quests, and build accountability — all anonymously. You will never need to reveal your identity.</p>

        {myGuildId && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 flex items-center gap-2">
            <CheckCircle size={13} className="text-indigo-400" />
            <p className="text-[12px] text-indigo-300">You are a member of <strong>{GUILDS.find(g => g.id === myGuildId)?.name}</strong></p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {GUILDS.map(guild => {
            const isMine = myGuildId === guild.id;
            return (
              <div key={guild.id}
                className={`p-4 rounded-2xl border transition-all ${isMine ? 'border-opacity-50' : 'border-white/[0.06] bg-white/[0.02]'}`}
                style={isMine ? { borderColor: guild.color + '40', background: guild.color + '08' } : {}}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{guild.icon}</span>
                    <div>
                      <p className="text-[13px] font-bold text-[#f0f0f3]">{guild.name}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border"
                        style={{ color: guild.color, borderColor: guild.color + '40', background: guild.color + '14' }}>
                        {guild.rank}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#71717a] leading-relaxed mb-3">{guild.desc}</p>
                <div className="flex items-center justify-between text-[10px] mb-3">
                  <span className="text-[#52525b]">{guild.members.toLocaleString()} members</span>
                  <span style={{ color: guild.color }} className="font-semibold">{guild.xp} collective XP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#52525b]">Focus: {guild.stat}</span>
                  <button
                    onClick={() => { onJoin(isMine ? null : guild.id); showToast(isMine ? 'Left guild' : `Joined ${guild.name}!`, isMine ? 'info' : 'success'); }}
                    className="text-[10px] px-3 py-1.5 rounded-xl border font-semibold transition-all"
                    style={isMine
                      ? { borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5', background: 'rgba(239,68,68,0.06)' }
                      : { borderColor: guild.color + '40', color: guild.color, background: guild.color + '10' }}>
                    {isMine ? 'Leave' : 'Join Guild'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

// ── BADGES PANEL ───────────────────────────────────────────────────────────────

function BadgesPanel({ badges, streaks, showPopup, setShowPopup }) {
  return (
    <div className="space-y-5">
      {/* Streaks */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Flame size={14} className="text-orange-400" />
          <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Active Streaks</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {streaks.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
              className="text-center p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="text-[20px] font-black text-[#f0f0f3]">{s.value}<span className="text-[10px] text-[#52525b] font-normal ml-0.5">d</span></p>
              <p className="text-[10px] text-[#52525b] mt-1">{s.label}</p>
              <div className="h-1 rounded-full bg-white/[0.04] mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(s.value / s.max) * 100}%`, background: s.color }} />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Badges */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-amber-400" />
          <h3 className="text-[13px] font-semibold text-[#f0f0f3]">Achievement Badges</h3>
          <span className="text-[10px] text-[#52525b] ml-auto">{badges.filter(b => b.unlocked).length}/{badges.length} earned</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              onClick={() => b.unlocked && setShowPopup(b)}
              className={`p-3.5 rounded-xl text-center cursor-pointer transition-all ${b.unlocked ? 'bg-white/[0.03] border border-amber-500/20 hover:border-amber-500/40' : 'bg-white/[0.01] border border-white/[0.04] opacity-40'}`}>
              <div className="flex justify-center mb-2"><Badge badge={b} /></div>
              <p className="text-[11px] font-semibold text-[#a1a1aa]">{b.name}</p>
              <p className="text-[10px] text-[#52525b] mt-0.5">{b.desc}</p>
              {b.unlocked
                ? <span className="text-[9px] text-amber-400 mt-1 block">✨ +100 XP</span>
                : <Lock size={10} className="mx-auto mt-1.5 text-[#3f3f46]" />}
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity', label: 'Identity',   icon: Star     },
  { id: 'quests',   label: 'Quests',     icon: Scroll   },
  { id: 'grind',    label: 'Grind Room', icon: Clock    },
  { id: 'guilds',   label: 'Guilds',     icon: Users    },
  { id: 'badges',   label: 'Badges',     icon: Trophy   },
];

export default function Gamification() {
  const { user }                                    = useAuth();
  const { computed, gamification, updateGamification } = useData();
  const [tab,       setTab]       = useState('identity');
  const [showPopup, setShowPopup] = useState(null);
  const [myGuild,   setMyGuild]   = useState(() => localStorage.getItem('my_guild_id'));

  const h = user?.health  || {};
  const f = user?.finance || {};
  const c = user?.career  || {};
  const xp = (gamification?.xp || 0) + (gamification?.activeChallenges?.length || 0) * 50;

  const codename = useMemo(() => generateCodename(user?.name || user?.id || 'default'), [user]);
  const tier     = useMemo(() => getTier(xp), [xp]);
  const stats    = useMemo(() => computeLifeStats(h, f, c, xp), [h, f, c, xp]);

  // Simulate 30-days-ago shadow self (slightly lower on all stats)
  const prevStats = useMemo(() => {
    const seed = 0.72 + (xp % 7) * 0.01;
    return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.max(10, Math.round(v * seed))]));
  }, [stats, xp]);

  // Recovery Arc: all streaks are 0
  const streaks = [
    { label: 'Study',    value: (c.studyHoursDaily  || 0) >= 4 ? 7  : (c.studyHoursDaily  || 0) >= 2 ? 3 : 0, icon: '📚', max: 30, color: '#3b82f6' },
    { label: 'Workout',  value: (h.workoutsPerWeek  || 0) >= 4 ? 12 : (h.workoutsPerWeek  || 0) >= 2 ? 5 : 0, icon: '💪', max: 30, color: '#10b981' },
    { label: 'Savings',  value: f.income > f.expenses ? 15 : 0,                                                  icon: '💰', max: 30, color: '#f59e0b' },
    { label: 'Hydration',value: (h.waterIntake      || 0) >= 6 ? 8  : 0,                                         icon: '💧', max: 30, color: '#06b6d4' },
    { label: 'Sleep',    value: (h.sleepAvg         || 0) >= 7 ? 10 : (h.sleepAvg || 0) >= 6 ? 4 : 0,           icon: '😴', max: 30, color: '#8b5cf6' },
    { label: 'Low Stress',value: (h.stressLevel     || 5) <= 5 ? 6  : 0,                                         icon: '🧘', max: 30, color: '#f43f5e' },
  ];
  const isRecovery = streaks.every(s => s.value === 0);

  const badges = useMemo(() => allBadges.map(b => {
    let unlocked = false;
    if (b.id === 'b1' && (h.sleepAvg || 0) >= 7)                                            unlocked = true;
    if (b.id === 'b2' && (h.workoutsPerWeek || 0) >= 5)                                     unlocked = true;
    if (b.id === 'b3' && f.income && (f.income - f.expenses) / f.income > 0.2)              unlocked = true;
    if (b.id === 'b4' && (c.dsaPractice || 0) >= 3)                                         unlocked = true;
    if (b.id === 'b5' && (c.studyHoursDaily || 0) >= 5)                                     unlocked = true;
    if (b.id === 'b6' && (h.stressLevel || 5) <= 4)                                         unlocked = true;
    if (b.id === 'b7' && (h.waterIntake || 0) >= 8)                                         unlocked = true;
    if (b.id === 'b8' && (computed?.balance || 0) >= 75)                                    unlocked = true;
    return { ...b, unlocked };
  }), [h, f, c, computed]);

  const activeChallenges = new Set(gamification?.activeChallenges || []);

  function toggleChallenge(id) {
    const next = new Set(activeChallenges);
    next.has(id) ? next.delete(id) : next.add(id);
    updateGamification({ activeChallenges: Array.from(next) });
    showToast(next.has(id) ? 'Challenge accepted! ⚔️' : 'Challenge abandoned', next.has(id) ? 'success' : 'info');
  }

  function handleGrindXP(bonus) {
    updateGamification({ xp: (gamification?.xp || 0) + bonus });
    showToast(`+${bonus} XP earned from grind session!`, 'success');
  }

  function handleGuildJoin(guildId) {
    setMyGuild(guildId);
    if (guildId) localStorage.setItem('my_guild_id', guildId);
    else localStorage.removeItem('my_guild_id');
  }

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 min-h-screen" style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.04) 0%, transparent 60%), #09090b' }}>
      <AnimatePresence>{showPopup && <AchievementPopup badge={showPopup} onClose={() => setShowPopup(null)} />}</AnimatePresence>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-black text-[#f0f0f3] tracking-tight">⚔️ Life Arena</h1>
            <p className="text-[12px] text-[#52525b] mt-0.5">Anonymous RPG · {tier.name} Tier · {xp.toLocaleString()} XP</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[11px] text-[#52525b] font-semibold uppercase tracking-wider">{codename}</p>
              <p className="text-[10px] font-bold" style={{ color: tier.color }}>{tier.name}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-white/[0.08]"
              style={{ background: `radial-gradient(circle at 30% 30%, ${tier.bg}, #111318)`, boxShadow: `0 0 20px ${tier.color}25` }}>
              🧬
            </div>
          </div>
        </div>

        {isRecovery && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <Flame size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-[12px] text-amber-300"><strong>Recovery Arc.</strong> Smaller quests active. Your streak memory is preserved. Rise when ready.</p>
          </motion.div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 flex-1 justify-center text-[11px] px-3 py-2.5 rounded-xl font-semibold transition-all min-w-[80px] ${
                tab === t.id ? 'bg-[#18181b] border border-white/[0.08] text-[#f0f0f3] shadow-lg' : 'text-[#52525b] hover:text-[#a1a1aa]'
              }`}>
              <Icon size={13} className={tab === t.id ? 'text-indigo-400' : ''} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {tab === 'identity' && <IdentityPanel codename={codename} tier={tier} xp={xp} stats={stats} prevStats={prevStats} isRecovery={isRecovery} />}
          {tab === 'quests'   && <QuestsPanel stats={stats} codename={codename} isRecovery={isRecovery} activeChallenges={activeChallenges} toggleChallenge={toggleChallenge} health={h} finance={f} career={c} />}
          {tab === 'grind'    && <GrindRoomPanel onXP={handleGrindXP} />}
          {tab === 'guilds'   && <GuildsPanel myGuildId={myGuild} onJoin={handleGuildJoin} />}
          {tab === 'badges'   && <BadgesPanel badges={badges} streaks={streaks} showPopup={showPopup} setShowPopup={setShowPopup} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
