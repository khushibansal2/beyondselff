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

const SOCIAL_CHALLENGES = [
  { id: 'sc1', icon: '🛡️', title: '30-Day No-Impulse Spend', domain: 'finance', duration: 30, xp: 500, participants: 1247, desc: 'Log 0 impulse purchases for 30 days' },
  { id: 'sc2', icon: '😴', title: '7-Day 8h Sleep Streak',    domain: 'health',  duration: 7,  xp: 200, participants: 3421, desc: 'Maintain 8h sleep average for 7 days' },
  { id: 'sc3', icon: '💻', title: '50 DSA in 14 Days',        domain: 'career',  duration: 14, xp: 400, participants: 892,  desc: 'Solve 50 DSA problems in 14 days' },
  { id: 'sc4', icon: '🧘', title: 'Zero Stress Week',         domain: 'health',  duration: 7,  xp: 300, participants: 2156, desc: 'Keep stress level ≤ 4 for 7 days' },
  { id: 'sc5', icon: '💰', title: '₹5K Savings Sprint',       domain: 'finance', duration: 30, xp: 350, participants: 678,  desc: 'Save an extra ₹5,000 this month' },
  { id: 'sc6', icon: '🚶', title: '10K Steps × 14 Days',      domain: 'health',  duration: 14, xp: 280, participants: 1893, desc: 'Log 10,000+ steps daily for 14 days' },
];

const DOMAIN_COLOR = { health: '#10b981', finance: '#f59e0b', career: '#3b82f6' };

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

  const harmonyColor = harmony >= 70 ? '#10b981' : harmony >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Hologram Avatar & Tier Progress Card ────────────────── */}
      <div style={{
        padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
      }}>
        
        {/* Cyber Hologram Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 84, height: 84, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle at 30% 30%, ${tier.color}25, #090d16)`,
            border: `2px solid ${tier.color}50`, boxShadow: `0 0 30px ${tier.color}35`,
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Pulsing hologram beam */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.12,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '8px 8px'
            }} />
            <span style={{ fontSize: 34, filter: `drop-shadow(0 0 8px ${tier.color}aa)` }}>🧬</span>
          </div>
          <div style={{
            position: 'absolute', bottom: -6, right: -6, fontSize: 9, fontWeight: 800, padding: '2px 8px',
            borderRadius: 99, background: '#090d16', border: `1px solid ${tier.color}50`, color: tier.color,
            boxShadow: `0 2px 10px ${tier.color}30`, textTransform: 'uppercase'
          }}>
            {tier.name}
          </div>
        </div>

        {/* Identity & XP Details */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0, trackingWidth: '-0.02em' }}>{codename}</h2>
            {isRecovery && (
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontWeight: 700 }}>
                RECOVERY ARC
              </span>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 14px' }}>Anonymous Identity · {tier.name} Tier</p>

          {/* XP progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 600, color: '#475569' }}>
              <span>{currentTier.name} → {nextTier.name}</span>
              <span>{xp.toLocaleString()} / {nextTier.min.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }}
                style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`, boxShadow: `0 0 8px ${tier.color}80` }}
              />
            </div>
            <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>{pct}% completed towards your next rank</p>
          </div>
        </div>

        {/* Harmony Diagnostic Dial */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, border: `2px solid ${harmonyColor}50`,
            background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 16px ${harmonyColor}15`, marginBottom: 4
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: harmonyColor }}>{Math.max(0, harmony)}</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', trackingWidth: '0.05em' }}>HARMONY</span>
        </div>

      </div>

      {isRecovery && (
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
          <strong>Recovery Arc Active:</strong> Standard quests are balanced. Complete daily items to restore streak multiplier benefits.
        </div>
      )}

      {/* ── Present Self vs Shadow Self ─────────────────────────── */}
      <div style={{
        padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚔️</span>
            <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Present Self vs Shadow Self</h3>
          </div>
          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600 }}>
            30 days ago
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {STAT_META.map(m => (
            <StatBar key={m.key} meta={m} value={stats[m.key]} prevValue={prevStats[m.key]} />
          ))}
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>Overall improvement vs Shadow Self</p>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
            +{Math.round(STAT_META.reduce((a, m) => a + (stats[m.key] - prevStats[m.key]), 0) / STAT_META.length)} avg points
          </span>
        </div>
      </div>

      {/* ── 8 Life Stats Node Grid ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {STAT_META.map(m => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.key} whileHover={{ y: -2 }}
              style={{
                padding: '16px 12px', borderRadius: 16, border: `1px solid ${m.color}25`,
                background: `linear-gradient(135deg, ${m.color}08 0%, rgba(255,255,255,0.01) 100%)`,
                textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: `${m.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
              }}>
                <Icon size={15} style={{ color: m.color }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 2px', lineHeight: 1 }}>{stats[m.key]}</h3>
              <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{m.label}</p>
            </motion.div>
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
          <div className="text-center py-10 text-[#71717a]">
            <Sparkles size={28} className="mx-auto mb-3 text-[#6b7280]" />
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
                      <p className={`text-[12px] font-semibold ${done ? 'line-through text-[#71717a]' : 'text-[#f0f0f3]'}`}>{q.title}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold capitalize ${DIFF_COLOR[q.difficulty] ?? DIFF_COLOR.medium}`}>{q.difficulty}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#71717a] capitalize">{q.type}</span>
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
                    <p className="text-[10px] text-[#71717a]">{ch.duration}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#71717a] mb-2.5 leading-relaxed">{ch.desc}</p>
                {isActive && (
                  <div className="mb-2.5">
                    <div className="flex justify-between text-[10px] text-[#71717a] mb-1"><span>Progress</span><span>{progress}%</span></div>
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
    const gCard = { background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 };
    return (
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        <div style={gCard}>
          {/* Header */}
          <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 20px 14px'}}>
            <div>
              <p style={{fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:4}}>Silent Grind Rooms</p>
              <p style={{fontSize:12, color:'#64748b'}}>Join anonymously. Work in silence. Earn XP on completion. Others are grinding right now.</p>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', cursor:'pointer', flexShrink:0}}>
              <span style={{fontSize:12, color:'#94a3b8', fontWeight:500}}>All Rooms</span>
              <span style={{fontSize:10, color:'#64748b'}}>▾</span>
            </div>
          </div>

          {/* Room rows */}
          <div>
            {GRIND_ROOMS.map((room, i) => (
              <button key={room.id} onClick={() => enterRoom(room)}
                style={{width:'100%', display:'flex', alignItems:'center', gap:16, padding:'16px 20px', background:'transparent', border:'none', borderTop: i===0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.06)', cursor:'pointer', textAlign:'left', transition:'background 0.15s'}}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0}}>
                  {room.icon}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:3}}>{room.name}</p>
                  <p style={{fontSize:12, color:'#64748b'}}>{room.type} • {room.sound}</p>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:6, flexShrink:0}}>
                  <Clock size={13} style={{color:'#475569'}}/>
                  <span style={{fontSize:13, color:'#94a3b8', fontWeight:500, marginRight:16}}>{room.minutes} min</span>
                </div>
                <span style={{fontSize:13, fontWeight:700, color:'#10b981', minWidth:90, flexShrink:0}}>{room.users} grinding</span>
                <ChevronRight size={16} style={{color:'#475569', flexShrink:0}}/>
              </button>
            ))}
          </div>

          {/* Tip bar */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{fontSize:16}}>🎧</span>
              <span style={{fontSize:12, color:'#64748b'}}>Tip: Use headphones for the best experience.</span>
            </div>
            <span style={{fontSize:12, color:'#6366f1', fontWeight:600, cursor:'pointer'}}>Learn more ↗</span>
          </div>
        </div>

        {sessions > 0 && (
          <div style={{...gCard, padding:'16px 20px'}}>
            <p style={{fontSize:11, color:'#64748b', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600}}>Today's Grind</p>
            <p style={{fontSize:22, fontWeight:800, color:'#10b981'}}>{sessions} session{sessions !== 1 ? 's' : ''} completed</p>
          </div>
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
              <p className="text-[11px] text-[#71717a]">{selectedRoom.type} · {selectedRoom.sound}</p>
            </div>
          </div>
          <button onClick={() => setSelectedRoom(null)} className="text-[11px] text-[#71717a] hover:text-[#a1a1aa] transition-colors">← Rooms</button>
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
              <p className="text-[10px] text-[#71717a] mt-1">{pct}% complete</p>
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
          <button onClick={reset} className="p-2.5 rounded-xl border border-white/[0.08] text-[#71717a] hover:text-[#a1a1aa] transition-all">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Live presence */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[10px] text-[#71717a] font-semibold uppercase tracking-wider mb-3">
            {selectedRoom.users + (running ? 1 : 0)} grinding in silence
          </p>
          <div className="flex flex-wrap gap-2">
            {phantoms.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-[#71717a]">{name}</span>
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
          <p className="text-[11px] text-[#71717a] mb-1 uppercase tracking-wider">Sessions today</p>
          <p className="text-[22px] font-black text-emerald-400">{sessions} completed</p>
        </GlassCard>
      )}
    </div>
  );
}

// ── PEERS PANEL ────────────────────────────────────────────────────────────────

function PeersPanel({ userScores, codename }) {
  const [joined, setJoined] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('joined_challenges') || '[]')); }
    catch { return new Set(); }
  });

  const myTotal = Math.round(((userScores.health || 60) + (userScores.finance || 60) + (userScores.career || 60)) / 3);

  const peers = useMemo(() => {
    const names = PHANTOM_USERS.slice(0, 4);
    const mults = [0.88, 1.10, 0.96, 1.05];
    return names.map((name, i) => {
      const v = mults[i];
      const h  = Math.min(100, Math.max(20, Math.round((userScores.health  || 60) * v + (i * 4 - 8))));
      const fi = Math.min(100, Math.max(20, Math.round((userScores.finance || 60) * v - (i * 3))));
      const ca = Math.min(100, Math.max(20, Math.round((userScores.career  || 60) * v + (i * 5 - 6))));
      return { name, health: h, finance: fi, career: ca, total: Math.round((h + fi + ca) / 3) };
    });
  }, [userScores]);

  const leaderboard = useMemo(() => {
    return [
      { name: codename, ...userScores, total: myTotal, isMe: true },
      ...peers,
    ].sort((a, b) => b.total - a.total).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [peers, userScores, myTotal, codename]);

  function toggleChallenge(id) {
    const next = new Set(joined);
    next.has(id) ? next.delete(id) : next.add(id);
    setJoined(next);
    localStorage.setItem('joined_challenges', JSON.stringify(Array.from(next)));
    showToast(next.has(id) ? 'Challenge joined! 🔥' : 'Challenge left', next.has(id) ? 'success' : 'info');
  }

  const PEER_AVATARS = ['🔥','⛈️','∞','🌿','⚡'];
  const PEER_COLORS  = ['#f97316','#64748b','#6366f1','#10b981','#f59e0b'];
  const rankIcon = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;
  const getLevel = total => Math.max(1, Math.floor(total / 7));

  const pCard = { background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 };

  // Sparkline: normalise 7 fake points ending at myTotal
  const rawPts = [myTotal-8, myTotal-6, myTotal-7, myTotal-4, myTotal-5, myTotal-2, myTotal];
  const minP = Math.min(...rawPts), maxP = Math.max(...rawPts);
  const norm = v => maxP === minP ? 40 : 70 - ((v - minP) / (maxP - minP)) * 60;
  const sparkCoords = rawPts.map((v, i) => `${(i / 6) * 200},${norm(v)}`).join(' ');

  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>

      {/* ── Row 1: Leaderboard + Score card ── */}
      <div style={{display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:8}}>

        {/* Leaderboard */}
        <div style={pCard}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px 8px'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
                <span style={{fontSize:13}}>🏆</span>
                <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9'}}>Anonymous Leaderboard</p>
              </div>
              <p style={{fontSize:11, color:'#64748b'}}>Real scores. Hidden identities.</p>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', cursor:'pointer', flexShrink:0}}>
              <span style={{fontSize:11, color:'#94a3b8'}}>All Time</span>
              <span style={{fontSize:9, color:'#64748b'}}>▾</span>
            </div>
          </div>
          <div style={{padding:'4px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'flex-end'}}>
            <span style={{fontSize:10, color:'#475569', fontWeight:600}}>Life Score</span>
          </div>
          {leaderboard.map((p, idx) => {
            const avatarColor = PEER_COLORS[idx] || '#6366f1';
            return (
              <div key={p.name} style={{
                display:'flex', alignItems:'center', gap:8, padding:'7px 14px',
                borderTop:'1px solid rgba(255,255,255,0.05)',
                background: p.isMe ? 'rgba(99,102,241,0.08)' : 'transparent',
              }}>
                <span style={{fontSize: p.rank<=3?13:11, fontWeight:700, color:'#64748b', width:22, textAlign:'center', flexShrink:0}}>{rankIcon(p.rank)}</span>
                <div style={{width:26, height:26, borderRadius:6, background:avatarColor+'18', border:`1px solid ${avatarColor}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0}}>
                  {PEER_AVATARS[idx]}
                </div>
                <div style={{flex:1, minWidth:0, display:'flex', alignItems:'center', gap:6}}>
                  <p style={{fontSize:12, fontWeight:600, color:'#f1f5f9'}}>{p.name}</p>
                  {p.isMe && <span style={{fontSize:8, padding:'1px 5px', borderRadius:4, background:'rgba(99,102,241,0.3)', color:'#a5b4fc', fontWeight:700}}>YOU</span>}
                  <span style={{fontSize:10, color:'#64748b', background:'rgba(255,255,255,0.05)', padding:'1px 7px', borderRadius:999}}>Lv. {getLevel(p.total)}</span>
                </div>
                <p style={{fontSize:14, fontWeight:800, color: p.isMe ? '#818cf8' : '#f1f5f9', flexShrink:0}}>{p.total}</p>
              </div>
            );
          })}
        </div>

        {/* Your Life Score */}
        <div style={{...pCard, padding:'12px', display:'flex', flexDirection:'column', gap:8}}>
          <div style={{display:'flex', alignItems:'baseline', gap:8}}>
            <p style={{fontSize:30, fontWeight:900, color:'#f1f5f9', lineHeight:1}}>{myTotal}</p>
            <p style={{fontSize:12, color:'#94a3b8', fontWeight:600}}>Your Life Score</p>
          </div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
            {[['🔥', userScores.health||55],['❤️', userScores.finance||54],['💜', userScores.career||39],['🛡️', Math.round(myTotal*0.78)]].map(([icon,val]) => (
              <div key={icon} style={{display:'flex', alignItems:'center', gap:3}}>
                <span style={{fontSize:12}}>{icon}</span>
                <span style={{fontSize:12, fontWeight:700, color:'#e2e8f0'}}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{flex:1, minHeight:50}}>
            <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spkG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={`${sparkCoords} 200,60 0,60`} fill="url(#spkG)"/>
              <polyline points={sparkCoords} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {rawPts.map((v,i) => <circle key={i} cx={(i/6)*200} cy={norm(v)} r="3" fill="#6366f1"/>)}
            </svg>
          </div>
          <p style={{fontSize:11, fontWeight:700, color:'#10b981'}}>+4 this week</p>
        </div>
      </div>

      {/* ── Row 2: Global Challenges ── */}
      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
              <span style={{fontSize:13}}>🌍</span>
              <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9'}}>Global Challenges</p>
            </div>
            <p style={{fontSize:11, color:'#64748b'}}>Join challenges. Earn XP. Beat your peers.</p>
          </div>
          <button style={{padding:'6px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0}}>
            View All Challenges
          </button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {SOCIAL_CHALLENGES.map(ch => {
            const isJoined = joined.has(ch.id);
            const dColor = DOMAIN_COLOR[ch.domain] || '#6366f1';
            const dLabel = ch.domain.charAt(0).toUpperCase() + ch.domain.slice(1);
            return (
              <div key={ch.id} style={{...pCard, padding:'10px 12px', display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>
                  {ch.icon}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, marginBottom:2}}>
                    <p style={{fontSize:12, fontWeight:700, color:'#f1f5f9', lineHeight:1.2}}>{ch.title}</p>
                    <span style={{fontSize:9, padding:'2px 6px', borderRadius:999, background:dColor+'20', color:dColor, fontWeight:700, flexShrink:0}}>{dLabel}</span>
                  </div>
                  <p style={{fontSize:10, color:'#64748b', marginBottom:6}}>{ch.desc}</p>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <p style={{fontSize:10, color:'#475569'}}>👥 {ch.participants.toLocaleString()} joined</p>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:11, fontWeight:700, color:dColor}}>+{ch.xp} XP</span>
                      <button onClick={() => toggleChallenge(ch.id)}
                        style={{padding:'3px 10px', borderRadius:6, border: isJoined ? '1px solid rgba(99,102,241,0.3)' : 'none', background: isJoined ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: isJoined ? '#a5b4fc' : '#fff', fontSize:10, fontWeight:700, cursor:'pointer'}}>
                        {isJoined ? '✓' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── GUILDS PANEL ───────────────────────────────────────────────────────────────

function GuildsPanel({ myGuildId, onJoin }) {
  const RANK_STYLE = {
    Gold:   { color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.35)'  },
    Mythic: { color:'#8b5cf6', bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.35)' },
    Silver: { color:'#94a3b8', bg:'rgba(148,163,184,0.1)', border:'rgba(148,163,184,0.3)' },
    Bronze: { color:'#f97316', bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.35)' },
  };
  const fmtMembers = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n;

  return (
    <div style={{background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 20px 14px'}}>
        <div>
          <p style={{fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:4}}>Anonymous Guilds</p>
          <p style={{fontSize:12, color:'#64748b'}}>Join a guild to earn XP, complete collective quests, and build accountability — all anonymously.</p>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', cursor:'pointer', flexShrink:0}}>
          <span style={{fontSize:12, color:'#94a3b8', fontWeight:500}}>All Guilds</span>
          <span style={{fontSize:10, color:'#64748b'}}>▾</span>
        </div>
      </div>

      {/* Guild rows */}
      {GUILDS.map((guild, i) => {
        const isMine = myGuildId === guild.id;
        const rs = RANK_STYLE[guild.rank] || RANK_STYLE.Silver;
        return (
          <div key={guild.id} style={{
            display:'flex', alignItems:'center', gap:16, padding:'16px 20px',
            borderTop:'1px solid rgba(255,255,255,0.06)',
            background: isMine ? guild.color+'08' : 'transparent',
          }}>
            {/* Icon */}
            <div style={{width:58, height:58, borderRadius:14, background:`linear-gradient(135deg, ${guild.color}22, rgba(255,255,255,0.04))`, border:`1px solid ${guild.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0}}>
              {guild.icon}
            </div>
            {/* Info */}
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
                <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>{guild.name}</p>
                <span style={{fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, color:rs.color, background:rs.bg, border:`1px solid ${rs.border}`}}>
                  {guild.rank.toUpperCase()}
                </span>
              </div>
              <p style={{fontSize:12, color:'#64748b', marginBottom:3}}>{guild.desc}</p>
              <p style={{fontSize:12, color:'#475569'}}>Focus: <span style={{color:guild.color, fontWeight:600}}>{guild.stat}</span></p>
            </div>
            {/* Members + Join */}
            <div style={{display:'flex', alignItems:'center', gap:16, flexShrink:0}}>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                <span style={{fontSize:13, color:'#475569'}}>👥</span>
                <span style={{fontSize:12, color:'#94a3b8'}}>{fmtMembers(guild.members)} members</span>
              </div>
              <button
                onClick={() => { onJoin(isMine ? null : guild.id); showToast(isMine ? 'Left guild' : `Joined ${guild.name}!`, isMine ? 'info' : 'success'); }}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                  border: isMine ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.18)',
                  background: isMine ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                  color: isMine ? '#fca5a5' : '#f1f5f9',
                }}>
                {isMine ? 'Leave' : 'Join'} <span style={{fontSize:13}}>→</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── BADGES PANEL ───────────────────────────────────────────────────────────────

function BadgesPanel({ badges, streaks, showPopup, setShowPopup }) {
  const earnedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* ── Active Streaks ── */}
      <div>
        <h2 className="text-[17px] font-bold text-[#f0f0f3] mb-1">Active Streaks</h2>
        <p className="text-[12px] text-[#8b949e] mb-4">Keep going. Consistency builds legends.</p>
        <div className="flex gap-4">
          {streaks.map((s, i) => (
            <div key={i}
              className="bg-[#161b22] border border-[#30363d] rounded-2xl px-8 py-6 flex items-center gap-6 min-w-[220px]">
              <span className="text-[44px] leading-none">{s.icon}</span>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[36px] font-black text-[#f0f0f3] leading-none">{s.value}</span>
                  <span className="text-[16px] text-[#8b949e] font-medium ml-1">day</span>
                </div>
                <p className="text-[12px] text-[#8b949e] mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievement Badges ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[17px] font-bold text-[#f0f0f3]">Achievement Badges</h2>
          <span className="text-[13px] text-[#8b949e]">{earnedCount} / {badges.length} earned</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => b.unlocked && setShowPopup(b)}
              className={`relative rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
                b.unlocked
                  ? 'bg-[#161b22] border border-amber-500/30 shadow-lg shadow-amber-500/10 hover:border-amber-500/60 hover:shadow-amber-500/20'
                  : 'bg-[#0d1117] border border-[#21262d]'
              }`}
            >
              {/* Badge icon area */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-1 ${
                b.unlocked ? 'bg-amber-500/15' : 'bg-[#161b22] border border-[#21262d]'
              }`}>
                {b.icon && b.icon.length <= 2
                  ? <span className={`text-[32px] ${!b.unlocked ? 'grayscale opacity-50' : ''}`}>{b.icon}</span>
                  : <Badge badge={b} />
                }
              </div>

              <p className={`text-[13px] font-semibold leading-snug ${b.unlocked ? 'text-[#f0f0f3]' : 'text-[#6e7681]'}`}>
                {b.name}
              </p>
              <p className={`text-[11px] leading-relaxed ${b.unlocked ? 'text-[#8b949e]' : 'text-[#484f58]'}`}>
                {b.desc}
              </p>

              {b.unlocked
                ? <span className="text-[11px] text-amber-400 font-semibold mt-1">+100 XP</span>
                : <Lock size={13} className="text-[#484f58] mt-1" />
              }

              {/* Locked overlay icon at bottom-left */}
              {!b.unlocked && (
                <div className="absolute bottom-3 left-3">
                  <Lock size={12} className="text-[#484f58]" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity', label: 'Identity',   icon: Star   },
  { id: 'quests',   label: 'Quests',     icon: Scroll },
  { id: 'grind',    label: 'Grind Room', icon: Clock  },
  { id: 'peers',    label: 'Peers',      icon: Swords },
  { id: 'guilds',   label: 'Guilds',     icon: Users  },
  { id: 'badges',   label: 'Badges',     icon: Trophy },
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
  const xp = gamification?.xp || 0;

  const codename = useMemo(() => generateCodename(user?.name || user?.id || 'default'), [user]);
  const tier     = useMemo(() => getTier(xp), [xp]);
  const stats    = useMemo(() => computeLifeStats(h, f, c, xp), [h, f, c, xp]);

  // Simulate 30-days-ago shadow self (slightly lower on all stats)
  const prevStats = useMemo(() => {
    const seed = 0.72 + (xp % 7) * 0.01;
    return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.max(10, Math.round(v * seed))]));
  }, [stats, xp]);

  // Recovery Arc: backend determines if streak is 0
  const streaks = [
    { label: 'Overall Streak', value: gamification?.streak || 0, icon: '🔥', max: 30, color: '#f59e0b' },
  ];
  const isRecovery = (gamification?.streak || 0) === 0;

  // Use backend badges or fallback to demo locked badges
  const badges = useMemo(() => {
    const earned = gamification?.badges || [];
    const earnedIds = new Set(earned.map(b => b.badgeId));
    
    // Map earned badges to the UI format
    const earnedMapped = earned.map(b => ({
      id: b.badgeId,
      name: b.badgeName,
      icon: b.icon || '🏅',
      desc: b.description,
      unlocked: true,
      earnedAt: b.earnedAt
    }));

    // Show unearned demo badges as locked
    const lockedMapped = allBadges
      .filter(b => !earnedIds.has(b.id) && !earnedIds.has(b.name.toLowerCase().replace(/ /g, '_')))
      .map(b => ({ ...b, unlocked: false }));

    return [...earnedMapped, ...lockedMapped];
  }, [gamification?.badges]);

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
    <div className="px-6 py-6 md:px-10 md:py-8 pb-24 lg:pb-10 min-h-screen" style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.04) 0%, transparent 60%), #09090b' }}>
      <AnimatePresence>{showPopup && <AchievementPopup badge={showPopup} onClose={() => setShowPopup(null)} />}</AnimatePresence>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-black text-[#f0f0f3] tracking-tight">⚔️ Life Arena</h1>
            <p className="text-[12px] text-[#71717a] mt-0.5">Anonymous RPG · {tier.name} Tier · {xp.toLocaleString()} XP</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[11px] text-[#71717a] font-semibold uppercase tracking-wider">{codename}</p>
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
                tab === t.id ? 'bg-[#18181b] border border-white/[0.08] text-[#f0f0f3] shadow-lg' : 'text-[#71717a] hover:text-[#a1a1aa]'
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
          {tab === 'peers'    && <PeersPanel codename={codename} userScores={{ health: computed?.healthScore?.score || 60, finance: computed?.financeScore?.score || 60, career: computed?.careerScore?.score || 60 }} />}
          {tab === 'guilds'   && <GuildsPanel myGuildId={myGuild} onJoin={handleGuildJoin} />}
          {tab === 'badges'   && <BadgesPanel badges={badges} streaks={streaks} showPopup={showPopup} setShowPopup={setShowPopup} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
