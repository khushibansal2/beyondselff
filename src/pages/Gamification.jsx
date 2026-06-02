import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { gamificationApi } from '../services/backendApi';
import { badges as allBadges, challenges as allChallenges } from '../data/demoData';
import { GlassCard, PageHeader, Badge, AchievementPopup, showToast } from '../components/ui/Components';
import {
  Zap, Shield, Brain, Flame, TrendingUp, Target, Clock, Users, User,
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-white/[0.03] border border-white/[0.05]">
            <Icon size={14} style={{ color: meta.color, filter: `drop-shadow(0 0 4px ${meta.color}80)` }} />
          </div>
          <span className="text-[12px] text-slate-300 font-semibold tracking-wide">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {prevValue !== undefined && delta !== 0 && (
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
          <span className="text-[13px] font-black text-white">{value}</span>
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
        {prevValue !== undefined && (
          <div className="absolute h-full rounded-full opacity-20" style={{ width: `${prevValue}%`, background: meta.color }} />
        )}
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full relative" 
          style={{ 
            background: `linear-gradient(90deg, ${meta.color}dd, ${meta.color})`, 
            boxShadow: `0 0 12px ${meta.color}ee` 
          }}
        />
      </div>
    </div>
  );
}

// ── PROTOTYPE DISCLAIMER ───────────────────────────────────────────────────────

function PrototypeDisclaimer({ featureName }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      style={{
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(12px)',
        marginBottom: '20px',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            flexShrink: 0
          }}>
            <AlertTriangle size={18} style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.05em', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                Prototype Preview
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                {featureName} is simulated client-side
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
              Currently using local storage & demo users. Learn about our secure production roadmap.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          className="hover:bg-white/10"
        >
          {expanded ? 'Hide Roadmap' : 'View Production Roadmap'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: 14, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Production Architecture Specifications:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>🗄️</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f1f5f9' }}>DB-Backed Persistent Engine</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#8b949e', margin: 0, lineHeight: 1.4 }}>
                    All user profiles, actions, and reactions are stored in a relational/NoSQL DB, replacing local storage data persistence.
                  </p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>🔌</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f1f5f9' }}>Challenge Participation APIs</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#8b949e', margin: 0, lineHeight: 1.4 }}>
                    Restful endpoints handle secure enrollment, validation, and reward distribution for guild and individual challenges.
                  </p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>⚡</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f1f5f9' }}>WebSocket Real-Time Sync</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#8b949e', margin: 0, lineHeight: 1.4 }}>
                    Bidirectional WebSocket connections push real-time user presence, active grinder counts, and room reactions to peers instantly.
                  </p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>🔒</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f1f5f9' }}>Anonymous Percentile Model</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#8b949e', margin: 0, lineHeight: 1.4 }}>
                    Leaderboards focus on anonymous cohort-based percentile metrics rather than revealing raw user-vs-user names and profiles.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="flex flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Hologram Avatar & Tier Progress Card ────────────────── */}
      <div 
        className="flex items-center gap-6 flex-wrap relative overflow-hidden"
        style={{
          padding: 24, 
          borderRadius: 24, 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.5) 0%, rgba(8, 12, 24, 0.75) 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)'
        }}
      >
        
        {/* Cyber Hologram Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle at 30% 30%, ${tier.color}30, #090d16)`,
            border: `2.5px solid ${tier.color}`, 
            boxShadow: `0 0 30px ${tier.color}50, inset 0 0 15px ${tier.color}30`,
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Pulsing hologram beam */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.15,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '8px 8px'
            }} />
            
            {/* Holographic scanner laser line */}
            <motion.div
              animate={{ y: [-10, 94, -10] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              style={{
                position: 'absolute', left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
                boxShadow: `0 0 10px ${tier.color}, 0 0 20px ${tier.color}`, 
                zIndex: 2
              }}
            />
            
            <span style={{ fontSize: 34, filter: `drop-shadow(0 0 12px ${tier.color})`, zIndex: 1 }}>🧬</span>
          </div>
          <div style={{
            position: 'absolute', bottom: -4, right: -4, fontSize: 9, fontWeight: 900, padding: '2.5px 10px',
            borderRadius: 99, background: '#090d16', border: `1.5px solid ${tier.color}`, color: tier.color,
            boxShadow: `0 4px 12px ${tier.color}40`, textTransform: 'uppercase', trackingWidth: '0.05em'
          }}>
            {tier.name}
          </div>
        </div>

        {/* Identity & XP Details */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{codename}</h2>
            {isRecovery && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-extrabold tracking-wider animate-pulse">
                RECOVERY ARC
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, margin: '0 0 16px' }}>Anonymous Identity · <span style={{ color: tier.color, fontWeight: 700 }}>{tier.name} Tier</span></p>

          {/* XP progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
              <span className="text-slate-400">{currentTier.name} <span className="text-slate-600">→</span> <span style={{ color: nextTier.color }}>{nextTier.name}</span></span>
              <span className="text-slate-200">{xp.toLocaleString()} <span className="text-slate-600">/</span> {nextTier.min.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`, boxShadow: `0 0 10px ${tier.color}80` }}
              />
            </div>
            <p style={{ fontSize: 10.5, color: '#475569', fontWeight: 500, margin: 0 }}>{pct}% completed towards your next rank</p>
          </div>
        </div>

        {/* Harmony Diagnostic Dial */}
        <div style={{ textAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `3px solid ${harmonyColor}`,
            background: 'rgba(9, 13, 22, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${harmonyColor}40, inset 0 0 15px ${harmonyColor}20`,
            position: 'relative',
            marginBottom: 6
          }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', textShadow: `0 0 8px ${harmonyColor}` }}>
              {Math.max(0, harmony)}
            </span>
            <span style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', trackingWidth: '0.05em', textTransform: 'uppercase', marginTop: -2 }}>
              HARMONY
            </span>
          </div>
        </div>

      </div>

      {isRecovery && (
        <div style={{ 
          padding: 16, 
          borderRadius: 16, 
          background: 'rgba(245,158,11,0.05)', 
          border: '1px solid rgba(245,158,11,0.15)', 
          fontSize: 12.5, 
          color: '#fbbf24', 
          lineHeight: 1.5,
          boxShadow: '0 4px 15px rgba(245,158,11,0.05)'
        }}>
          <strong style={{ color: '#f59e0b' }}>Recovery Arc Active:</strong> Standard quests are balanced. Complete daily items to restore streak multiplier benefits.
        </div>
      )}

      {/* ── Present Self vs Shadow Self ─────────────────────────── */}
      <div style={{
        padding: 24, 
        borderRadius: 24, 
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.4) 0%, rgba(8, 12, 24, 0.6) 100%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.6))' }}>⚔️</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>Present Self vs Shadow Self</h3>
          </div>
          <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold tracking-wide">
            30 days ago
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {STAT_META.map(m => (
            <StatBar key={m.key} meta={m} value={stats[m.key]} prevValue={prevStats[m.key]} />
          ))}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, margin: 0 }}>Overall improvement vs Shadow Self</p>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#10b981', textShadow: '0 0 8px rgba(16,185,129,0.3)' }}>
            +{Math.round(STAT_META.reduce((a, m) => a + (stats[m.key] - prevStats[m.key]), 0) / STAT_META.length)} avg points
          </span>
        </div>
      </div>

      {/* ── 8 Life Stats Node Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_META.map(m => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.key} 
              whileHover={{ y: -4, scale: 1.02 }}
              className="flex items-center gap-3.5"
              style={{
                padding: '16px 18px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Left color-coded icon background */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: `${m.color}15`,
                border: `1.5px solid ${m.color}25`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 12px ${m.color}10`
              }}>
                <Icon size={20} style={{ color: m.color, filter: `drop-shadow(0 0 4px ${m.color})` }} />
              </div>
              {/* Right vertical texts */}
              <div className="flex flex-col items-start min-w-0">
                <span style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                  {stats[m.key]}
                </span>
                <span className="truncate" style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', trackingWidth: '0.05em', marginTop: 2 }}>
                  {m.label}
                </span>
              </div>
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

  const CHALLENGE_ICONS = {
    c1: { icon: '💤', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.15)', color: '#818cf8' },
    c2: { icon: '🥡', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    c3: { icon: '🧩', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)', color: '#10b981' },
    c4: { icon: '🧘', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)', color: '#f97316' },
    c5: { icon: '📊', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.15)', color: '#06b6d4' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Plain Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.5))' }}>✨</span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f3', margin: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>AI-Generated Quests</h2>
          {isRecovery && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">Recovery Mode</span>}
        </div>
        <button onClick={handleGenerate} disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            padding: '8px 16px',
            borderRadius: 10,
            fontWeight: 700,
            color: '#a5b4fc',
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          className="hover:scale-[1.02] hover:bg-indigo-500/10 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-indigo-400 rounded-full animate-spin" /> : <Sparkles size={13} className="text-[#a5b4fc]" />}
          {loading ? 'Generating…' : aiQuests.length ? 'Regenerate' : 'Generate Quests'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {aiQuests.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0 36px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px', fontFamily: 'Inter, sans-serif' }}>No quests yet.</p>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, fontFamily: 'Inter, sans-serif' }}>Click "Generate Quests" to get AI-personalized quests based on your weakest stats.</p>
        </div>
      )}

      {aiQuests.length > 0 && (
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
      )}

      {/* Grid of Standalone Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allChallenges.map((ch) => {
          const isActive = activeChallenges.has(ch.id);
          const meta = CHALLENGE_ICONS[ch.id] || CHALLENGE_ICONS.c1;
          return (
            <div 
              key={ch.id} 
              style={{
                display: 'flex',
                gap: 16,
                padding: 20,
                borderRadius: 20,
                border: isActive ? '1px solid rgba(129, 140, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(13, 17, 28, 0.45)',
                boxShadow: isActive ? '0 8px 32px rgba(129,140,248,0.1), inset 0 1px 1px rgba(255,255,255,0.02)' : '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.02)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Circle icon container */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                fontSize: 20,
                flexShrink: 0
              }}>
                {meta.icon}
              </div>

              {/* Main Content Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Title & XP */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#f8fafc', margin: 0, fontFamily: 'Inter, sans-serif' }}>{ch.title}</h4>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#f59e0b', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>+{ch.reward} XP</span>
                </div>
                
                {/* Duration */}
                <p style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>{ch.duration}</p>

                {/* Dotted Divider */}
                <div style={{ borderTop: '1px dotted rgba(255,255,255,0.08)', margin: '12px 0' }} />

                {/* Description & Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, fontFamily: 'Inter, sans-serif', lineHeight: 1.4, flex: 1 }}>{ch.desc}</p>
                  <button
                    onClick={() => toggleChallenge(ch.id)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      transition: 'all 0.2s',
                      border: isActive ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(129,140,248,0.35)',
                      background: isActive ? 'rgba(239,68,68,0.08)' : 'rgba(129,140,248,0.06)',
                      color: isActive ? '#fca5a5' : '#a5b4fc',
                      flexShrink: 0
                    }}
                    className="hover:scale-[1.02] hover:bg-indigo-500/10 active:scale-[0.98]"
                  >
                    {isActive ? '✓ Joined' : 'Accept'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const [reactions,    setReactions]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('grind_reactions') || '{}'); } catch { return {}; }
  });
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
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        <PrototypeDisclaimer featureName="Silent Grind Rooms" />
        
        {/* Plain Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f3', margin: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>Silent Grind Rooms</h2>
            <p style={{ fontSize: 12.5, color: '#8b949e', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
              Join anonymously. Work in silence. Earn XP on completion. Others are grinding right now.
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>All Rooms</span>
            <span style={{ fontSize: 10, color: '#8b949e' }}>▾</span>
          </div>
        </div>

        {/* Room rows Card Container */}
        <div style={{
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden'
        }}>
          {GRIND_ROOMS.map((room, i) => (
            <button key={room.id} onClick={() => enterRoom(room)}
              style={{
                width:'100%', 
                display:'flex', 
                alignItems:'center', 
                gap:16, 
                padding:'16px 20px', 
                background:'transparent', 
                border:'none', 
                borderTop: i===0 ? 'none' : '1px solid rgba(255,255,255,0.06)', 
                cursor:'pointer', 
                textAlign:'left', 
                transition:'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0}}>
                {room.icon}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9', margin: '0 0 3px'}}>{room.name}</p>
                <p style={{fontSize:12, color:'#8b949e', margin: 0}}>{room.type} • {room.sound}</p>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:6, flexShrink:0}}>
                <Clock size={13} style={{color:'#475569'}}/>
                <span style={{fontSize:13, color:'#cbd5e1', fontWeight:500, marginRight:16}}>{room.minutes} min</span>
              </div>
              <span style={{fontSize:13, fontWeight:700, color:'#10b981', minWidth:90, flexShrink:0}}>{room.users} grinding</span>
              <ChevronRight size={16} style={{color:'#475569', flexShrink:0}}/>
            </button>
          ))}
        </div>

        {/* Standalone Tip Bar Card */}
        <div style={{
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px'
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{fontSize:16}}>🎧</span>
            <span style={{fontSize:12.5, color:'#8b949e', fontWeight:500, fontFamily: 'Inter, sans-serif'}}>Tip: Use headphones for the best experience.</span>
          </div>
          <span style={{fontSize:12.5, color:'#818cf8', fontWeight:700, cursor:'pointer', fontFamily: 'Inter, sans-serif'}} className="hover:underline">Learn more ↗</span>
        </div>

        {sessions > 0 && (
          <div style={{
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            padding:'16px 20px'
          }}>
            <p style={{fontSize:11, color:'#8b949e', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600}}>Today's Grind</p>
            <p style={{fontSize:22, fontWeight:800, color:'#10b981', margin: 0}}>{sessions} session{sessions !== 1 ? 's' : ''} completed</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PrototypeDisclaimer featureName="Silent Grind Rooms" />
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
            {selectedRoom.users + (running ? 1 : 0)} grinding in silence <span style={{ color: '#f59e0b', fontSize: '9px', marginLeft: '6px', border: '1px solid rgba(245,158,11,0.25)', padding: '1px 4px', borderRadius: '4px', background: 'rgba(245,158,11,0.05)', textTransform: 'none' }}>[Simulated]</span>
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
          <div className="flex gap-4 mt-3 items-center">
            <span style={{ fontSize: '9.5px', color: '#71717a', marginRight: '4px' }}>Simulated Reactions:</span>
            {['🔥','⚡','👏'].map(r => {
              const count = reactions[r] || 0;
              return (
                <button key={r} onClick={() => {
                  const next = { ...reactions, [r]: (reactions[r] || 0) + 1 };
                  setReactions(next);
                  try { localStorage.setItem('grind_reactions', JSON.stringify(next)); } catch {}
                  showToast(`${r} sent to the room`, 'success');
                }} className="flex items-center gap-1 text-[13px] hover:scale-125 transition-transform">
                  {r}{count > 0 && <span className="text-[9px] text-slate-500">{count}</span>}
                </button>
              );
            })}
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

  // Sigmoid formula to compute dynamic percentile based on user total score
  const percentile = useMemo(() => {
    const rawPct = Math.round(100 / (1 + Math.exp(-((myTotal - 55) / 12))));
    return Math.min(99, Math.max(5, rawPct));
  }, [myTotal]);

  const cohortTier = useMemo(() => {
    if (percentile >= 90) return { name: 'Elite Ascendant', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', desc: 'You are among the most disciplined and balanced individuals globally.' };
    if (percentile >= 75) return { name: 'High Performer', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', desc: 'Outstanding consistency. You are pacing well ahead of the average user.' };
    if (percentile >= 50) return { name: 'Consistent Seeker', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', desc: 'Solid habits. You maintain healthy averages across most categories.' };
    return { name: 'Rising Wanderer', color: '#71717a', bg: 'rgba(113,113,122,0.12)', desc: 'Building momentum. Consistency is starting to compound.' };
  }, [percentile]);

  function toggleChallenge(id) {
    setJoined(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('joined_challenges', JSON.stringify([...next]));
      return next;
    });
  }

  const pCard = {
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
  };

  const rawPts = [myTotal-8, myTotal-6, myTotal-7, myTotal-4, myTotal-5, myTotal-2, myTotal];
  const minP = Math.min(...rawPts), maxP = Math.max(...rawPts);
  const norm = v => maxP === minP ? 35 : 45 - ((v - minP) / (maxP - minP)) * 32;
  const sparkCoords = rawPts.map((v, i) => `${(i / 6) * 200},${norm(v)}`).join(' ');

  const cohorts = [
    { label: 'Health Quotient', score: userScores.health || 60, median: 58, top: 82, color: '#10b981' },
    { label: 'Financial Wisdom', score: userScores.finance || 60, median: 62, top: 86, color: '#f59e0b' },
    { label: 'Career Growth', score: userScores.career || 60, median: 54, top: 80, color: '#3b82f6' }
  ];

  return (
    <div style={{display:'flex', flexDirection:'column', gap:12}}>
      <PrototypeDisclaimer featureName="Percentile & Social Engine" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Card: Anonymous Percentile Analytics */}
        <div className="lg:col-span-2" style={{ ...pCard, padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
                <span style={{fontSize:14, filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))'}}>📊</span>
                <p style={{fontSize:14, fontWeight:800, color:'#ffffff', margin: 0, letterSpacing: '-0.01em'}}>Anonymous Percentile Comparison</p>
              </div>
              <p style={{fontSize:11.5, color:'#64748b', margin: 0}}>Privacy-preserving aggregate metrics. No names exposed.</p>
            </div>
          </div>

          {/* Percentile Big Stat Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.04)',
            marginBottom: 20,
            flexWrap: 'wrap'
          }}>
            <div style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              border: `3px solid ${cohortTier.color}`,
              background: 'rgba(9, 13, 22, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${cohortTier.color}30, inset 0 0 15px ${cohortTier.color}15`,
              flexShrink: 0
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', textShadow: `0 0 8px ${cohortTier.color}` }}>
                {percentile}%
              </span>
              <span style={{ fontSize: 7.5, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', marginTop: -2 }}>
                Percentile
              </span>
            </div>
            
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                color: cohortTier.color,
                background: cohortTier.bg,
                border: `1px solid ${cohortTier.color}25`,
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {cohortTier.name}
              </span>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '8px 0 4px' }}>
                You score higher than {percentile}% of active members.
              </p>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                {cohortTier.desc}
              </p>
            </div>
          </div>

          {/* Benchmark Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#cbd5e1', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category Benchmarks</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cohorts.map((c) => {
                return (
                  <div key={c.label} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{c.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: c.color }}>Your Score: {c.score}</span>
                    </div>
                    
                    {/* Visual bar showing User, Median and Top 10% */}
                    <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', margin: '14px 0 10px' }}>
                      {/* Median marker */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: `${c.median}%`, 
                          top: '-6px', 
                          width: '2px', 
                          height: '18px', 
                          background: '#64748b', 
                          zIndex: 2 
                        }} 
                      >
                        <span style={{ position: 'absolute', top: '-14px', left: '-18px', fontSize: '8px', color: '#64748b', fontWeight: 800 }}>Med: {c.median}</span>
                      </div>
                      
                      {/* Top 10% marker */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: `${c.top}%`, 
                          top: '-6px', 
                          width: '2px', 
                          height: '18px', 
                          background: '#ec4899', 
                          zIndex: 2 
                        }} 
                      >
                        <span style={{ position: 'absolute', top: '-14px', left: '-18px', fontSize: '8px', color: '#ec4899', fontWeight: 800 }}>Top 10%: {c.top}</span>
                      </div>

                      {/* User score progress bar */}
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: 0, 
                          height: '100%', 
                          width: `${c.score}%`, 
                          background: c.color, 
                          borderRadius: '99px',
                          boxShadow: `0 0 8px ${c.color}60`
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy statement footer */}
          <div style={{ borderTop: '1px dotted rgba(255,255,255,0.06)', marginTop: 20, paddingTop: 14 }}>
            <p style={{ fontSize: 11, color: '#8b949e', margin: 0, lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12 }}>🛡️</span>
              <span>
                <strong>Privacy by Design:</strong> Direct user-vs-user rank tables expose personal data. BeyondSelf anonymizes comparison calculations. In production, your score is aggregated locally into global distribution bins, completely hiding your identification from others.
              </span>
            </p>
          </div>
        </div>

        {/* Right Card: Life Score Display */}
        <div className="lg:col-span-1" style={{...pCard, padding: '24px 20px 20px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
          <div style={{display:'flex', flexDirection:'column'}}>
            <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom: 12}}>
              <p style={{fontSize:46, fontWeight:900, color:'#ffffff', lineHeight:1, margin:0, letterSpacing: '-0.03em'}}>{myTotal}</p>
              <p style={{fontSize:15, color:'#cbd5e1', fontWeight:600, margin:0, letterSpacing: '-0.01em'}}>Your Life Score</p>
            </div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              {[
                ['🔥', userScores.health||55, '#f97316'],
                ['❤️', userScores.finance||54, '#ef4444'],
                ['🧠', userScores.career||39, '#ec4899'],
                ['🛡️', Math.round(myTotal*0.78), '#8b5cf6']
              ].map(([icon, val, color]) => (
                <div key={icon} style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'rgba(255,255,255,0.035)', 
                  padding:'5px 12px', borderRadius:12,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                }}>
                  <span style={{fontSize:12, filter: `drop-shadow(0 0 3px ${color}60)`}}>{icon}</span>
                  <span style={{fontSize:12, fontWeight:800, color:'#ffffff'}}>{val}</span>
                </div>
              ))}
            </div>
            
            {/* Divider Line */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '16px 0 12px' }} />
          </div>
          
          {/* Sparkline Chart */}
          <div style={{flex:1, minHeight:46, display: 'flex', alignItems: 'flex-end', marginTop: 4}}>
            <svg width="100%" height="46" viewBox="0 0 200 46" preserveAspectRatio="none" style={{overflow: 'visible'}}>
              <defs>
                <linearGradient id="spkG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={`0,46 ${sparkCoords} 200,46`} fill="url(#spkG)"/>
              <polyline points={sparkCoords} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {rawPts.map((v, i) => (
                <circle key={i} cx={(i/6)*200} cy={norm(v)} r="3.5" fill="#ffffff" stroke="#818cf8" strokeWidth="2" />
              ))}
            </svg>
          </div>

          {/* Real weekly gain label */}
          <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12}}>
            {(() => {
              const gain = rawPts[rawPts.length-1] - rawPts[0];
              return <p style={{fontSize:12.5, fontWeight:600, color: gain >= 0 ? '#22c55e' : '#ef4444', margin: 0}}>{gain >= 0 ? '+' : ''}{gain} pts this week</p>;
            })()}
          </div>
        </div>
      </div>

      {/* Bottom section: Global Challenges */}
      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
              <span style={{fontSize:14, filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.6))'}}>🌎</span>
              <p style={{fontSize:14, fontWeight:800, color:'#ffffff', margin: 0, letterSpacing: '-0.01em'}}>Global Challenges</p>
            </div>
            <p style={{fontSize:11, color:'#64748b', margin: 0}}>Join challenges. Earn XP. Beat your peers. <span style={{ color: '#f59e0b', fontSize: '9px', marginLeft: '6px', border: '1px solid rgba(245,158,11,0.25)', padding: '1px 4px', borderRadius: '4px', background: 'rgba(245,158,11,0.05)', textTransform: 'none' }}>[Simulated Participation]</span></p>
          </div>
          <button style={{
            padding: '5px 11px', borderRadius: '9px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            View All Challenges
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {SOCIAL_CHALLENGES.map(ch => {
            const isJoined = joined.has(ch.id);
            const dColor = DOMAIN_COLOR[ch.domain] || '#6366f1';
            const dLabel = ch.domain.charAt(0).toUpperCase() + ch.domain.slice(1);
            return (
              <div key={ch.id} style={{...pCard, padding: 13, display:'flex', alignItems:'center', gap:12}}>
                <div style={{
                  width:42, height:42, borderRadius:'50%',
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, flexShrink:0,
                }}>
                  {ch.icon}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:1}}>
                    <p style={{fontSize:12, fontWeight:800, color:'#f1f5f9', lineHeight:1.2, margin: 0}}>{ch.title}</p>
                    <span style={{fontSize:9, padding:'2px 6px', borderRadius:999, background:dColor+'18', color:dColor, border:`1.5px solid ${dColor}25`, fontWeight:800, flexShrink:0}}>{dLabel}</span>
                  </div>
                  <p style={{fontSize:10.5, color:'#64748b', margin: '0 0 6px'}}>{ch.desc}</p>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <p style={{fontSize:10, color:'#475569', fontWeight:600, margin: 0}}>👥 {ch.participants.toLocaleString()} joined</p>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:11, fontWeight:800, color:dColor}}>+{ch.xp} XP</span>
                      <button
                        onClick={() => toggleChallenge(ch.id)}
                        style={{
                          padding:'4px 10px', 
                          borderRadius:6, 
                          border: isJoined ? '1px solid rgba(99,102,241,0.3)' : 'none', 
                          background: isJoined ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                          color: isJoined ? '#a5b4fc' : '#ffffff', 
                          fontSize:10.5, 
                          fontWeight:800, 
                          cursor:'pointer',
                          boxShadow: isJoined ? 'none' : '0 4px 10px rgba(99,102,241,0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isJoined ? '✓ Joined' : 'Join'}
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <PrototypeDisclaimer featureName="Anonymous Guilds" />
      
      {/* Plain Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f3', margin: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>Anonymous Guilds</h2>
          <p style={{ fontSize: 12.5, color: '#8b949e', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Join a guild to earn XP, complete collective quests, and build accountability — all anonymously.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          cursor: 'pointer',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>All Guilds</span>
          <span style={{ fontSize: 10, color: '#8b949e' }}>▾</span>
        </div>
      </div>

      {/* Grid of Standalone Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GUILDS.map((guild) => {
          const isMine = myGuildId === guild.id;
          const rs = RANK_STYLE[guild.rank] || RANK_STYLE.Silver;
          return (
            <div 
              key={guild.id} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 16,
                border: isMine ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isMine 
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(8, 12, 24, 0.9) 100%)' 
                  : 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
                boxShadow: isMine ? '0 8px 32px rgba(99,102,241,0.15), inset 0 1px 1px rgba(255,255,255,0.05)' : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 58, 
                height: 58, 
                borderRadius: 14, 
                background: `linear-gradient(135deg, ${guild.color}22, rgba(255,255,255,0.04))`, 
                border: `1px solid ${guild.color}30`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 26, 
                flexShrink: 0
              }}>
                {guild.icon}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{guild.name}</p>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, color: rs.color, background: rs.bg, border: `1px solid ${rs.border}` }}>
                    {guild.rank.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '9px', color: '#8b949e', border: '1px solid rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>Simulated</span>
                </div>
                <p style={{ fontSize: 12, color: '#8b949e', margin: '0 0 4px', lineHeight: 1.4 }}>{guild.desc}</p>
                <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Focus: <span style={{ color: guild.color, fontWeight: 600 }}>{guild.stat}</span></p>
              </div>
              {/* Members + Join */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>👥</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtMembers(guild.members)} members</span>
                  </div>
                  <span style={{ fontSize: '8px', color: '#e0a82e', opacity: 0.8, letterSpacing: '0.02em' }}>[Simulated]</span>
                </div>
                <button
                  onClick={() => { onJoin(isMine ? null : guild.id); showToast(isMine ? 'Left guild' : `Joined ${guild.name}!`, isMine ? 'info' : 'success'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    border: isMine ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    background: isMine ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                    color: isMine ? '#fca5a5' : '#ffffff',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  }}
                  className="hover:scale-[1.02] hover:brightness-115 active:scale-[0.98]"
                >
                  {isMine ? 'Leave' : 'Join'} <span style={{ fontSize: 13 }}>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BADGES PANEL ───────────────────────────────────────────────────────────────

function BadgesPanel({ badges, streaks, showPopup, setShowPopup }) {
  const earnedCount = badges.filter(b => b.unlocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} className="max-w-[1100px]">

      {/* ── Active Streaks ── */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f3', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', marginBottom: 6 }}>Active Streaks</h2>
        <p style={{ fontSize: 12.5, color: '#8b949e', margin: '0 0 20px', fontFamily: 'Inter, sans-serif' }}>Keep going. Consistency builds legends.</p>
        <div className="flex gap-4">
          {streaks.map((s, i) => (
            <div 
              key={i}
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.6) 0%, rgba(8, 12, 24, 0.8) 100%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                padding: '20px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '220px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  fontSize: 54,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.5))'
                }}>
                  {s.icon}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#cbd5e1' }}>{s.value === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
              <p style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#8b949e',
                marginTop: 12,
                margin: '12px 0 0',
                textAlign: 'center',
                letterSpacing: '0.01em'
              }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievement Badges ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f3', margin: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>Achievement Badges</h2>
          <span style={{ fontSize: 13, color: '#8b949e', fontWeight: 500 }}>{earnedCount} / {badges.length} earned</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((b, i) => {
            const cardBg = b.unlocked
              ? 'linear-gradient(135deg, rgba(20, 25, 45, 0.7) 0%, rgba(10, 14, 28, 0.9) 100%)'
              : 'rgba(255,255,255,0.02)';
            const cardBorder = b.unlocked
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : '1px solid rgba(255, 255, 255, 0.05)';
            const cardGlow = b.unlocked
              ? '0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(245,158,11,0.08), inset 0 1px 1px rgba(255,255,255,0.05)'
              : 'none';
              
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => b.unlocked && setShowPopup(b)}
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  border: cardBorder,
                  background: cardBg,
                  boxShadow: cardGlow,
                  backdropFilter: 'blur(20px)',
                  padding: '24px 16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: b.unlocked ? 'pointer' : 'default',
                  transition: 'all 0.2s ease-in-out'
                }}
                className={b.unlocked ? 'hover:scale-[1.02] hover:brightness-110' : ''}
              >
                {/* Badge icon area */}
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  background: b.unlocked 
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.28) 100%)' 
                    : 'rgba(255,255,255,0.035)',
                  border: b.unlocked
                    ? '1px solid rgba(245,158,11,0.35)'
                    : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: b.unlocked ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none'
                }}>
                  {b.icon && b.icon.length <= 2
                    ? <span style={{ fontSize: 30, filter: b.unlocked ? 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' : 'grayscale(100%) opacity(40%)' }}>{b.icon}</span>
                    : <Badge badge={b} />
                  }
                </div>

                <p style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: b.unlocked ? '#ffffff' : '#8c95a0',
                  margin: 0,
                  lineHeight: 1.3,
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {b.name}
                </p>
                <p style={{
                  fontSize: 11,
                  color: b.unlocked ? '#94a3b8' : '#57606a',
                  margin: '4px 0 8px',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {b.desc}
                </p>

                {b.unlocked ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginTop: 'auto' }}>+100 XP</span>
                ) : (
                  <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', minHeight: 16 }} />
                )}

                {/* Golden Indicator Dot for Unlocked Badges (bottom-left) */}
                {b.unlocked && (
                  <div style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    boxShadow: '0 0 8px #f59e0b'
                  }} />
                )}

                {/* Locked overlay lock icon (bottom-right) */}
                {!b.unlocked && (
                  <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
                    <Lock size={12} className="text-[#484f58]" />
                  </div>
                )}
              </motion.div>
            );
          })}
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
  { id: 'peers',    label: 'Peers',      icon: Users  },
  { id: 'guilds',   label: 'Guilds',     icon: Brain  },
  { id: 'badges',   label: 'Badges',     icon: Trophy },
];

export default function Gamification() {
  const { user }                                    = useAuth();
  const { computed, gamification, updateGamification, health, finance, career, records } = useData();
  const [tab,       setTab]       = useState('identity');
  const [showPopup, setShowPopup] = useState(null);
  const [myGuild,   setMyGuild]   = useState(() => localStorage.getItem('my_guild_id'));

  const h = health  || {};
  const f = finance || {};
  const c = career  || {};
  const xp = gamification?.xp || 0;

  const codename = useMemo(() => generateCodename(user?.name || user?.id || 'default'), [user]);
  const tier     = useMemo(() => getTier(xp), [xp]);
  const stats    = useMemo(() => computeLifeStats(h, f, c, xp), [h, f, c, xp]);

  // Shadow Self: compute from records that are 30+ days old to show real historical state
  const prevStats = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const oldHealth  = (records?.health  || []).filter(r => new Date(r.date || r.recordDate).getTime() < cutoff);
    const oldFinance = (records?.finance || []).filter(r => new Date(r.date).getTime() < cutoff);
    const oldCareer  = (records?.career  || []).filter(r => new Date(r.date).getTime() < cutoff);

    if (oldHealth.length === 0 && oldFinance.length === 0 && oldCareer.length === 0) {
      // No historical records — estimate shadow self as 72-78% of current (first-time user)
      const seed = 0.72 + (xp % 7) * 0.01;
      return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.max(10, Math.round(v * seed))]));
    }

    const avg = (arr, field, fallbackField) => {
      const vals = arr.map(r => r[field] ?? r[fallbackField]).filter(v => v != null && !isNaN(Number(v)));
      return vals.length ? vals.reduce((s, v) => s + Number(v), 0) / vals.length : null;
    };

    const oldSleepAvg       = avg(oldHealth, 'sleepHours', 'sleep') ?? h.sleepAvg ?? 6;
    const oldStressLevel    = avg(oldHealth, 'stressLevel', 'stress') ?? h.stressLevel ?? 6;
    const oldWorkouts       = avg(oldHealth, 'workoutsPerWeek', 'workout') ?? h.workoutsPerWeek ?? 1;
    const oldWater          = avg(oldHealth, 'waterGlasses', 'water') ?? h.waterIntake ?? 4;
    const oldStudyHours     = avg(oldCareer, 'studyHours') ?? c.studyHoursDaily ?? 0;
    const oldDsa            = avg(oldCareer, 'dsaProblems') ?? c.dsaPractice ?? 0;
    const oldIncome         = oldFinance.filter(r => (r.transactionType || 'debit').toLowerCase() === 'credit').reduce((s, r) => s + (r.amount || 0), 0);
    const oldExpenses       = oldFinance.filter(r => (r.transactionType || 'debit').toLowerCase() !== 'credit').reduce((s, r) => s + (r.amount || 0), 0);
    const oldSavRate        = oldIncome > 0 ? Math.max(0, (oldIncome - oldExpenses) / oldIncome) : (f.income > 0 ? Math.max(0, (f.income - f.expenses) / f.income) * 0.8 : 0.2);

    const oldXpEst = Math.max(0, xp - 200); // estimate XP was ~200 less 30 days ago
    const oldXpScore = Math.min(100, Math.round(Math.log10(oldXpEst + 10) * 18));
    const oldSleep   = Math.min(100, Math.round((oldSleepAvg / 9) * 100));
    const oldStress  = Math.min(100, Math.round(((10 - oldStressLevel) / 10) * 100));
    const oldWorkout = Math.min(100, Math.round((oldWorkouts / 7) * 100));
    const oldWaterS  = Math.min(100, Math.round((oldWater / 8) * 100));
    const oldStudy   = Math.min(100, Math.round((oldStudyHours / 8) * 100));
    const oldDsaS    = Math.min(100, Math.round((oldDsa / 5) * 100));

    return {
      focus:            Math.max(10, Math.round((oldStudy + oldDsaS) / 2)),
      discipline:       Math.max(10, Math.round(oldXpScore * 0.6 + oldStudy * 0.4)),
      calmness:         Math.max(10, Math.round((oldStress + oldSleep) / 2)),
      energy:           Math.max(10, Math.round((oldSleep + oldWorkout + oldWaterS) / 3)),
      financialWisdom:  Math.max(10, Math.round(oldSavRate * 100)),
      socialConfidence: Math.max(15, Math.min(100, 35 + Math.round((c.linkedinConnections || 0) / 30))),
      consistency:      Math.max(10, oldXpScore),
      recoveryStrength: Math.max(25, Math.min(100, 45 + Math.round(oldXpScore * 0.3))),
    };
  }, [stats, xp, records, h, f, c]);

  // Recovery Arc: backend determines if streak is 0
  const streaks = [
    { label: 'Overall Streak', value: gamification?.streak || 0, icon: '🔥', max: 30, color: '#f59e0b' },
  ];
  const isRecovery = (gamification?.streak || 0) === 0;

  // Use backend badges or fallback to demo locked badges
  const badges = useMemo(() => {
    const earned = (gamification?.badges || []).filter(b => typeof b === 'object' && b !== null);
    const earnedIds = new Set(earned.map(b => b.badgeId));

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

  async function handleGrindXP(bonus) {
    if (gamificationApi.isEnabled()) {
      try {
        const award = await gamificationApi.awardXp(bonus);
        if (award) {
          updateGamification({
            xp: award.totalXp,
            level: award.level,
            streak: award.streak,
            badges: award.newBadges && award.newBadges.length > 0
              ? [...(gamification?.badges || []), ...award.newBadges]
              : (gamification?.badges || [])
          });
          showToast(`+${bonus} XP earned from grind session! ⚡`, 'success');
          if (award.newBadges && award.newBadges.length > 0) {
            award.newBadges.forEach(badge => {
              showToast(`🏆 New Badge Unlocked: ${badge.badgeName || badge.badgeId}!`, 'success');
            });
          }
          return;
        }
      } catch (err) {
        console.warn('Failed to award grind XP to backend, falling back to local:', err);
      }
    }
    updateGamification({ xp: (gamification?.xp || 0) + bonus });
    showToast(`+${bonus} XP earned from grind session!`, 'success');
  }

  function handleGuildJoin(guildId) {
    setMyGuild(guildId);
    if (guildId) localStorage.setItem('my_guild_id', guildId);
    else localStorage.removeItem('my_guild_id');
  }

  return (
    <div className="page-container min-h-screen pb-2" style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.04) 0%, transparent 60%), #09090b' }}>
      <AnimatePresence>{showPopup && <AchievementPopup badge={showPopup} onClose={() => setShowPopup(null)} />}</AnimatePresence>

      {/* ── Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
        <span>BeyondSelf</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#ffffff' }}>Rewards &amp; Achievements</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', flexShrink: 0 }}>
              <Star style={{ width: 20, height: 20 }} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight m-0 flex items-center gap-2">Rewards &amp; Achievements ⚔️</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11.5px] text-white font-extrabold uppercase tracking-wide m-0">{codename}</p>
              <p className="text-[10.5px] font-bold mt-0.5" style={{ color: '#71717a' }}>{tier.name}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[18px] border border-white/[0.08]"
              style={{ 
                background: `radial-gradient(circle at 30% 30%, rgba(129, 140, 248, 0.15), #0c0e17)`, 
                boxShadow: `0 0 16px rgba(129, 140, 248, 0.25)`,
                border: '1px solid rgba(129, 140, 248, 0.35)'
              }}>
              🧬
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#8e929b', marginTop: 8, marginBottom: 0 }}>
          Anonymous RPG • {tier.name} Tier • <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{xp.toLocaleString()} XP</span>
        </p>

        {isRecovery && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <Flame size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-[12px] text-amber-300"><strong>Recovery Arc.</strong> Smaller quests active. Your streak memory is preserved. Rise when ready.</p>
          </motion.div>
        )}
      </div>

      {/* Tab bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
          gap: 24,
          overflowX: 'auto',
          paddingBottom: 0
        }}
      >
        {TABS.map(t => {
          const Icon = t.icon;
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
                marginBottom: -1
              }}
            >
              <Icon size={14} className={`transition-all duration-200 ${isActive ? 'text-[#ffffff]' : 'text-[#71717a]'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={tab} 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -8 }} 
          transition={{ duration: 0.15 }}
          style={{ marginTop: 20 }}
        >
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
