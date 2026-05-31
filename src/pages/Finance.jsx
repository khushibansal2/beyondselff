import { useState, useMemo, useEffect, useRef, useCallback, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { financeApi } from '../services/backendApi';
import { extractTextFromImage, parseReceiptData } from '../services/ocrService';
import { generateTrendData } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, MetricCard, showToast, RecommendationCard } from '../components/ui/Components';
import { loadFeedback, sortByFeedback } from '../services/recommendationFeedbackService';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { Activity, FileText, TrendingUp, TrendingDown, Sparkles, Pause, Play, Award, Coins, Search, Info, ChevronDown, Clipboard } from 'lucide-react';
import {
  parseTransactionSMS, detectOTP, CATEGORY_META, SAMPLE_MESSAGES, MERCHANT_MAP,
} from '../services/transactionParserService';
import { generateMockTransaction, SPEED_OPTIONS } from '../services/mockTransactionService';

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

const TX_LS_KEY = 'finance_parsed_transactions';
function loadTxsLocal() {
  try {
    const local = localStorage.getItem(TX_LS_KEY);
    if (!local) return [];
    if (local.includes('1780000000001') && local.includes('Swiggy')) {
      localStorage.removeItem(TX_LS_KEY);
      return [];
    }
    return JSON.parse(local);
  } catch {
    return [];
  }
}
function saveTxsLocal(txs) { localStorage.setItem(TX_LS_KEY, JSON.stringify(txs.slice(0, 200))); }

// ── Investment Robo-Advisor (cross-domain: health + career + finance) ─────────────────
function RoboAdvisor({ f, h, c, savingsRate }) {
  const surplus = Math.max(0, (f.income || 0) - (f.expenses || 0));
  const hasDebt = (f.debt || 0) > 0;
  const debtRatio = f.income > 0 ? (f.debt || 0) / f.income : 0;
  const [dismissed, setDismissed] = useState({});

  const baseIndex = (() => {
    if (savingsRate >= 30 && !hasDebt) return 2;
    if (savingsRate >= 15 && debtRatio < 0.5) return 1;
    return 0;
  })();

  const sleepAvg = h.sleepAvg ?? 7;
  const stressLevel = h.stressLevel ?? 5;
  const dsaPractice = c.dsaPractice || 0;
  const projectsCompleted = c.projectsCompleted || 0;
  const skills = Array.isArray(c.skills) ? c.skills : [];
  const codingHoursDaily = c.codingHoursDaily || 0;
  const studyHoursDaily = c.studyHoursDaily || 0;
  const placementReadiness = Math.min(100,
    (dsaPractice >= 3 ? 25 : Math.round(dsaPractice * 8)) +
    (projectsCompleted >= 4 ? 25 : Math.round(projectsCompleted * 6)) +
    (skills.length >= 5 ? 25 : Math.round(skills.length * 5)) +
    (codingHoursDaily >= 4 ? 25 : Math.round(codingHoursDaily * 6))
  );

  let delta = 0;
  if (sleepAvg < 6) delta--;
  else if (sleepAvg >= 7.5) delta++;
  if (stressLevel > 7) delta--;
  if (placementReadiness >= 75) delta++;
  else if (placementReadiness < 40 && studyHoursDaily < 1 && codingHoursDaily < 1) delta--;

  const finalIndex = Math.max(0, Math.min(2, baseIndex + delta));
  const profileNames = ['conservative', 'moderate', 'aggressive'];
  const profile = profileNames[finalIndex];

  const profiles = {
    conservative: {
      label: 'Conservative Shield V2', riskLabel: 'Low Risk', riskColor: '#10b981',
      desc: `Capital preservation strategy optimised for your savings rate of ${savingsRate}%. Maintaining a 20% liquid buffer to cover ${Math.round((f.savings || 0) / Math.max(1, f.expenses || 1))} months of expenses while capturing bond yields.`,
      assets: [
        { name: 'Fixed Deposits (FD)',  pct: 40, amount: Math.round(surplus * 0.40), color: '#10b981' },
        { name: 'Government Bonds',     pct: 25, amount: Math.round(surplus * 0.25), color: '#6b7280' },
        { name: 'Digital Gold / SGB',   pct: 15, amount: Math.round(surplus * 0.15), color: '#f59e0b' },
        { name: 'Index Funds (Nifty)',  pct: 15, amount: Math.round(surplus * 0.15), color: '#6b7280' },
        { name: 'Emergency Reserve',    pct: 5,  amount: Math.round(surplus * 0.05), color: '#6b7280' },
      ],
    },
    moderate: {
      label: 'Balanced Growth V3', riskLabel: 'Medium Risk', riskColor: '#f59e0b',
      desc: `Balanced allocation responding to your ${savingsRate}% savings rate. Shifting equity exposure to capture mid-cycle growth while keeping a 15% debt buffer for stability.`,
      assets: [
        { name: 'Index Funds (Nifty 50)', pct: 40, amount: Math.round(surplus * 0.40), color: '#10b981' },
        { name: 'Corporate Bonds',         pct: 25, amount: Math.round(surplus * 0.25), color: '#6b7280' },
        { name: 'Digital Gold / SGB',      pct: 15, amount: Math.round(surplus * 0.15), color: '#f59e0b' },
        { name: 'Fixed Deposits',          pct: 15, amount: Math.round(surplus * 0.15), color: '#6b7280' },
        { name: 'Emergency Reserve',       pct: 5,  amount: Math.round(surplus * 0.05), color: '#6b7280' },
      ],
    },
    aggressive: {
      label: 'Aggressive Growth V4', riskLabel: 'High Risk', riskColor: '#f43f5e',
      desc: `Allocation shifted toward Index Funds following your strong career readiness (${placementReadiness}%). Maintaining a 15% liquid buffer for upcoming quarterly tax liabilities while capturing equity upside.`,
      assets: [
        { name: 'Index Funds (Nifty 50)', pct: 50, amount: Math.round(surplus * 0.50), color: '#10b981' },
        { name: 'Corporate Bonds',         pct: 20, amount: Math.round(surplus * 0.20), color: '#6b7280' },
        { name: 'Digital Gold / SGB',      pct: 15, amount: Math.round(surplus * 0.15), color: '#f59e0b' },
        { name: 'Fixed Deposits',          pct: 10, amount: Math.round(surplus * 0.10), color: '#6b7280' },
        { name: 'Emergency Reserve',       pct: 5,  amount: Math.round(surplus * 0.05), color: '#6b7280' },
      ],
    },
  };
  const p = profiles[profile];

  const actionCards = [
    ...(f.subscriptions > 1000 ? [{
      id: 'subs', icon: '💳', title: 'Subscription Cleanup',
      desc: `Found ₹${(f.subscriptions || 2400).toLocaleString()}/mo in unused streaming services. Redirecting to Index Funds adds ₹${Math.round((f.subscriptions || 2400) * 12 * 5 * 0.12 / 1000)}L to your 10-year projection.`,
      primary: 'Apply Fix', secondary: 'Dismiss',
    }] : []),
    ...(f.savings > 50000 ? [{
      id: 'fd', icon: '🔒', title: 'FD Re-investment',
      desc: `Matured FD of ₹${Math.round((f.savings || 120000) / 1000)}K detected. Current yield 6.2% is below target. Shift to corporate bonds for 8.4% p.a.?`,
      primary: 'Review', secondary: 'Later',
    }] : []),
    ...(hasDebt ? [{
      id: 'debt', icon: '⚡', title: 'Debt Acceleration',
      desc: `Your debt-to-income ratio is ${Math.round(debtRatio * 100)}%. Allocating ₹${Math.round((f.income || 0) * 0.1).toLocaleString()}/mo extra toward debt reduces interest cost by ₹${Math.round((f.debt || 0) * 0.015).toLocaleString()} annually.`,
      primary: 'Set Up', secondary: 'Skip',
    }] : []),
    {
      id: 'sip', icon: '📈', title: 'SIP Optimisation',
      desc: `Based on your surplus of ₹${surplus.toLocaleString()}/mo, a ₹${Math.round(surplus * 0.6).toLocaleString()} SIP in Nifty 50 compounds to ₹${Math.round(surplus * 0.6 * 12 * 7 * 1.12 / 100000)}L in 7 years at 12% p.a.`,
      primary: 'Start SIP', secondary: 'Later',
    },
  ].filter(a => !dismissed[a.id]);

  const sessionId = `#AX-${Math.abs(((f.income || 1234) * 7 + (f.expenses || 567)) % 9000 + 1000)}`;
  const syncMin = Math.floor(Math.random() * 5) + 1;

  return (
    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, overflow: 'hidden', fontFamily: 'Inter, sans-serif', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* ── LEFT PANEL ── */}
      <div style={{ flex: 1, padding: '32px 32px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,216,182,0.12)', border: '1px solid rgba(0,216,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00d8b6', boxShadow: '0 0 8px #00d8b6' }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#00d8b6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Active Strategy</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{p.label}</p>
            </div>
          </div>
          <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: p.riskColor + '20', color: p.riskColor, border: `1px solid ${p.riskColor}40`, whiteSpace: 'nowrap', marginTop: 4 }}>
            {p.riskLabel}
          </span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 28 }}>{p.desc}</p>

        {/* Allocation bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {p.assets.map((a, i) => (
            <motion.div key={a.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{a.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>₹{a.amount.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{a.pct}%</span>
                </div>
              </div>
              <div style={{ height: 6, background: '#090a0f', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${a.pct}%` }}
                  transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                  style={{ height: '100%', background: a.color === '#10b981' ? '#10b981' : a.color === '#f59e0b' ? '#f59e0b' : 'rgba(255,255,255,0.15)', borderRadius: 3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div style={{ borderTop: '1px solid #20222a', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            ENGINE CONNECTED
          </span>
          <span style={{ color: '#334155' }}>|</span>
          <span>LAST SYNC: {syncMin}M AGO</span>
        </div>
        <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>SESSION ID: {sessionId}</span>
      </div>

    </div>
  );
}

// ── Transaction Card (reusable) ──────────────────────────────────────────────
function TxCard({ tx, onDelete }) {
  const meta = CATEGORY_META[tx.category] || CATEGORY_META.Others;
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${meta.border} ${meta.bg} group relative`}>
      <span className="text-xl">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{tx.merchant}</p>
        <p className="text-[10px] text-slate-500">{tx.category} · {tx.bank} · {tx.paymentMode}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${tx.type === 'Credit' ? 'text-emerald-400' : meta.text}`}>
          {tx.type === 'Credit' ? '+' : '−'}₹{tx.amount.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-500">{new Date(tx.parsedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      {tx.source === 'live' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 absolute top-1 right-1">LIVE</span>}
      {onDelete && (
        <button onClick={() => onDelete(tx.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-xs transition-all ml-1 shrink-0">×</button>
      )}
    </motion.div>
  );
}

// ── Live Notification Overlay ────────────────────────────────────────────────
function LiveNotification({ tx, onDismiss }) {
  if (!tx) return null;
  const meta = CATEGORY_META[tx.category] || CATEGORY_META.Others;
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-6 right-6 z-50 w-72"
    >
      <div className={`rounded-2xl border ${meta.border} ${meta.bg} backdrop-blur-xl p-4 shadow-2xl`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live Transaction</span>
          </div>
          <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100">{tx.merchant}</p>
            <p className="text-[10px] text-slate-400">{tx.category} · {tx.bank}</p>
          </div>
          <p className={`text-lg font-bold ${meta.text}`}>₹{tx.amount.toLocaleString()}</p>
        </div>
        <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 4, ease: 'linear' }}
            className="h-full" style={{ background: meta.color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Investment Robo-Advisor ──────────────────────────────────────────────────
const ALLOC_META = [
  { key: 'equity', label: 'Equity',     color: '#f43f5e', icon: '📈' },
  { key: 'debt',   label: 'Debt/Bonds', color: '#3b82f6', icon: '🏛️' },
  { key: 'gold',   label: 'Gold',       color: '#f59e0b', icon: '🪙' },
  { key: 'cash',   label: 'Liquid',     color: '#10b981', icon: '💵' },
];
const RISK_META = {
  conservative: { color: '#10b981', label: 'Conservative', desc: 'Capital preservation priority',  equity: 30, debt: 50, gold: 15, cash: 5 },
  moderate:     { color: '#f59e0b', label: 'Moderate',     desc: 'Balanced growth + stability',   equity: 50, debt: 30, gold: 15, cash: 5 },
  aggressive:   { color: '#f43f5e', label: 'Aggressive',   desc: 'Maximum growth potential',      equity: 70, debt: 15, gold: 10, cash: 5 },
};
const FUND_RECS = {
  conservative: [
    { name: 'PPF (Public Provident Fund)',     type: '80C Eligible',  ret: '7.1%',    risk: 'None',      tag: '80C'   },
    { name: 'SBI Nifty 50 Index Fund',         type: 'Large Cap',     ret: '11–13%',  risk: 'Low',       tag: null    },
    { name: 'NPS Tier-I (Govt Bond)',           type: '80CCD(1B)',     ret: '8–10%',   risk: 'Very Low',  tag: '80CCD' },
    { name: 'HDFC Short Duration Debt Fund',    type: 'Debt',          ret: '6–8%',    risk: 'Very Low',  tag: null    },
  ],
  moderate: [
    { name: 'Axis ELSS Tax Saver Fund',         type: '80C Eligible',  ret: '12–15%',  risk: 'Medium',    tag: '80C'   },
    { name: 'HDFC Balanced Advantage Fund',     type: 'Hybrid',        ret: '10–13%',  risk: 'Medium',    tag: null    },
    { name: 'NPS Tier-I (Equity 50%)',           type: '80CCD(1B)',     ret: '9–11%',   risk: 'Low-Med',   tag: '80CCD' },
    { name: 'Mirae Asset Large & Mid Cap Fund', type: 'Flexi Cap',     ret: '13–16%',  risk: 'Medium',    tag: null    },
  ],
  aggressive: [
    { name: 'Mirae Asset ELSS Tax Saver',       type: '80C Eligible',  ret: '14–17%',  risk: 'Med-High',  tag: '80C'   },
    { name: 'Parag Parikh Flexi Cap Fund',      type: 'Flexi Cap',     ret: '15–18%',  risk: 'Medium',    tag: null    },
    { name: 'Axis Midcap Fund',                 type: 'Mid Cap',       ret: '15–20%',  risk: 'High',      tag: null    },
    { name: 'NPS Tier-I (Max Equity)',           type: '80CCD(1B)',     ret: '10–13%',  risk: 'Low-Med',   tag: '80CCD' },
  ],
};

function InvestmentRoboAdvisor({ f, score }) {
  const savingsRate = f.income > 0 ? Math.round(((f.income - f.expenses) / f.income) * 100) : 0;
  const riskProfile = score >= 70 && savingsRate >= 25 ? 'aggressive'
    : score >= 50 && savingsRate >= 15 ? 'moderate' : 'conservative';
  const risk = RISK_META[riskProfile];

  const annualInvestment = (f.investments || 0) * 12;
  const used80C = Math.min(150000, annualInvestment * 0.6);
  const remaining80C = Math.max(0, 150000 - used80C);

  const taxRows = [
    { section: '80C',       limit: '₹1,50,000', instruments: 'ELSS · PPF · NPS · LIC · NSC',  saving: Math.round(remaining80C * 0.3), pct: Math.round((used80C / 150000) * 100) },
    { section: '80CCD(1B)', limit: '₹50,000',   instruments: 'NPS additional contribution',    saving: Math.round(50000 * 0.3),        pct: 0 },
    { section: '80D',       limit: '₹25,000',   instruments: 'Health Insurance Premium',       saving: Math.round(25000 * 0.3),        pct: 0 },
  ];
  const totalTaxSaving = taxRows.reduce((s, r) => s + r.saving, 0);

  const defaultSip = Math.round(Math.max(500, f.income * 0.15));
  const [sipAmt, setSipAmt] = useState(defaultSip || 2000);
  const [sipYrs, setSipYrs] = useState(10);
  const annualRate = riskProfile === 'aggressive' ? 0.13 : riskProfile === 'moderate' ? 0.11 : 0.09;
  const mr = annualRate / 12;
  const months = sipYrs * 12;
  const sipFV = Math.round(sipAmt * ((Math.pow(1 + mr, months) - 1) / mr));
  const sipInvested = sipAmt * months;

  const sessionId = `#IX-${Math.abs(((f.income || 4321) * 3 + (score || 78)) % 9000 + 1000)}`;
  const syncMin = Math.floor(Math.random() * 4) + 1;

  const strategyNames = { conservative: 'Capital Shield V2', moderate: 'Balanced Core V3', aggressive: 'Growth Engine V4' };
  const strategyDesc = {
    conservative: `Capital preservation strategy for your ${savingsRate}% savings rate. Maintains a 50% debt allocation to protect against market volatility while generating steady 7–8% p.a. returns.`,
    moderate: `Balanced growth allocation responding to Finance Score ${score}. Equal weight between equity and debt captures mid-cycle upside while limiting drawdown to ~15%.`,
    aggressive: `Maximum growth configuration activated. Equity at ${risk.equity}% targets 13%+ CAGR. Suitable given Finance Score ${score} and ${savingsRate}% savings rate providing adequate buffer.`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── TOP PANEL ── */}
      <div style={{ background: '#111418', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
            {/* Active Strategy */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,216,182,0.12)', border: '1px solid rgba(0,216,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d8b6', boxShadow: '0 0 6px #00d8b6' }} />
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>Active Strategy</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{strategyNames[riskProfile]}</p>
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: risk.color + '20', color: risk.color, border: `1px solid ${risk.color}40`, whiteSpace: 'nowrap' }}>
                {risk.label}
              </span>
            </div>

            <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, marginBottom: 16 }}>{strategyDesc[riskProfile]}</p>

            {/* Allocation bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ALLOC_META.map((a, i) => {
                const pct = risk[a.key];
                const amount = Math.round(Math.max(0, (f.income || 0) - (f.expenses || 0)) * pct / 100);
                return (
                  <motion.div key={a.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>{a.icon} {a.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>₹{amount.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: '#090a0f', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 2, background: a.color === '#10b981' ? '#10b981' : a.color === '#f59e0b' ? '#f59e0b' : a.color === '#f43f5e' ? '#f43f5e' : '#3b82f6' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recommended Funds */}
            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <div style={{ background: '#111418', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 8, fontWeight: 700, color: '#00d8b6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>Curated Portfolio</p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9' }}>Recommended Funds</p>
                  </div>
                  <span style={{ fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Profile: {risk.label} · CAGR {Math.round(annualRate * 100)}%</span>
                </div>
                <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {FUND_RECS[riskProfile].map((fund, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{fund.name}</p>
                          {fund.tag && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>{fund.tag}</span>}
                        </div>
                        <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>{fund.type} · Risk: {fund.risk}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#00d8b6', margin: 0 }}>{fund.ret}</p>
                        <p style={{ fontSize: 8, color: '#475569', margin: 0 }}>Expected CAGR</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                  <p style={{ fontSize: 8, color: '#334155', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>⚠ NOT FINANCIAL ADVICE · Consult a SEBI-registered advisor before investing</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tax & SIP Action Cards */}
          <div style={{ width: 280, flexShrink: 0, padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* Tax Savings Optimizer Card */}
            <div style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>💸</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Tax Savings Optimizer</p>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
                ₹{totalTaxSaving.toLocaleString()} in deductions available this FY under 80C, 80CCD(1B) & 80D. Assuming 30% bracket.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {taxRows.map(row => (
                  <div key={row.section} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>§ {row.section}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>₹{row.saving.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: '#00d8b6', color: '#060b14', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Claim Deductions
                </button>
                <button style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Later
                </button>
              </div>
            </div>

            {/* SIP card */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>📅</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>SIP Wealth Planner</p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Monthly SIP (₹)</label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>₹{sipAmt.toLocaleString()}</span>
                  </div>
                  <input type="number" value={sipAmt} min={100} step={500}
                    onChange={e => setSipAmt(Math.max(100, Number(e.target.value) || 100))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, padding: '4px 6px', color: '#f1f5f9', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Investment Period</label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9' }}>{sipYrs} Years</span>
                  </div>
                  <input type="range" min={1} max={30} value={sipYrs} onChange={e => setSipYrs(+e.target.value)}
                    style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer', height: 2 }} />
                </div>
                {/* SIP Projection Chart */}
                <div style={{ marginTop: 2 }}>
                  <p style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Projected Growth</p>
                  <div style={{ height: 65 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={Array.from({ length: sipYrs + 1 }, (_, yr) => {
                          const m = yr * 12;
                          const fv = m === 0 ? 0 : Math.round(sipAmt * ((Math.pow(1 + mr, m) - 1) / mr));
                          return { yr, invested: +(sipAmt * m / 100000).toFixed(2), value: +(fv / 100000).toFixed(2) };
                        })}
                        margin={{ top: 2, right: 2, left: -24, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="sipValueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d8b6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#00d8b6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="sipInvGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="yr" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false}
                          tickFormatter={v => v === 0 ? '' : `${v}y`} interval={Math.max(1, Math.ceil(sipYrs / 5))} />
                        <YAxis tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} axisLine={false}
                          tickFormatter={v => `₹${v}L`} width={30} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 9, padding: '4px 6px' }}
                          formatter={(val, name) => [`₹${val}L`, name === 'value' ? 'Value' : 'Invested']}
                          labelFormatter={l => `Year ${l}`}
                        />
                        <Area type="monotone" dataKey="invested" stroke="#f59e0b" strokeWidth={1.5} fill="url(#sipInvGrad)" dot={false} />
                        <Area type="monotone" dataKey="value" stroke="#00d8b6" strokeWidth={1.5} fill="url(#sipValueGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '4px 8px' }}>
                    <p style={{ fontSize: 9, color: '#64748b', marginBottom: 1 }}>Invested</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>₹{(sipInvested / 100000).toFixed(1)}L</p>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 8px' }}>
                    <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 1px' }}>Value</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#10b981', margin: 0 }}>₹{(sipFV / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
              <button style={{ marginTop: 'auto', width: '100%', padding: '6px 0', borderRadius: 6, border: 'none', background: '#00d8b6', color: '#060b14', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Set Up SIP
              </button>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              ENGINE CONNECTED
            </span>
            <span style={{ color: '#334155' }}>|</span>
            <span>LAST SYNC: {syncMin}M AGO</span>
          </div>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>SESSION ID: {sessionId}</span>
        </div>
      </div>
    </div>
  );
}

const REC_ICONS = {
  'fin-spending': {
    bg: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="12" x="3" y="6" rx="2" />
        <path d="M3 10h18M16 14h.01" />
      </svg>
    )
  },
  'fin-investment': {
    bg: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    )
  },
  'fin-emergency': {
    bg: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    )
  },
  'fin-subscriptions': {
    bg: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    )
  },
  'fin-career': {
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="12" x="3" y="6" rx="2" />
        <path d="M14 6V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2M12 11v3" />
      </svg>
    )
  },
  'fin-emotional': {
    bg: 'rgba(244, 63, 94, 0.1)',
    color: '#f43f5e',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'fin-stress-sip': {
    bg: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'fin-sleep-risk': {
    bg: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    )
  },
  'fin-parser': {
    bg: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
    svg: (
      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-8.979M18 3.612V9M6 13.062V18M6 8.188v.031M18 13.062v.031" />
      </svg>
    )
  }
};

function FinanceRecommendationCard({ rec, index = 0, feedback = {}, onFeedback }) {
  const fb     = feedback[rec.id]?.action;
  const isDone = fb === 'done';

  function handle(action) {
    if (fb === action) { clearFeedback(rec.id); } else { setFeedback(rec.id, action); }
    onFeedback?.();
  }

  const meta = REC_ICONS[rec.id] || {
    bg: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    svg: <span>💡</span>
  };

  const riskColor = rec.risk === 'high' ? '#ef4444' : rec.risk === 'medium' ? '#f59e0b' : '#10b981';
  const riskBg = rec.risk === 'high' ? 'rgba(239, 68, 68, 0.1)' : rec.risk === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{
        background: '#090a0f',
        border: '1px solid #20222a',
        borderRadius: 12,
        padding: '20px 24px',
        opacity: isDone ? 0.45 : 1,
        transition: 'opacity 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
        {/* Icon wrapper */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 8,
          background: meta.bg,
          color: meta.color,
          flexShrink: 0,
          marginTop: 2
        }}>
          {meta.svg}
        </div>

        {/* Content details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 6px 0',
            textDecoration: isDone ? 'line-through' : 'none'
          }}>{rec.title}</h4>
          
          <p style={{
            fontSize: 13,
            color: '#8e929b',
            lineHeight: 1.5,
            margin: '0 0 16px 0'
          }}>{rec.text}</p>

          {/* Feedback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => handle('accept')}
              style={{
                background: fb === 'accept' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: fb === 'accept' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                color: fb === 'accept' ? '#10b981' : '#6b7280',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s'
              }}
            >
              {fb === 'accept' ? '✓ Accepted' : '✓ Accept'}
            </button>

            <button
              onClick={() => handle('done')}
              style={{
                background: isDone ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: isDone ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                color: isDone ? '#3b82f6' : '#6b7280',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s'
              }}
            >
              {isDone ? '✓ Done' : '📁 Mark Done'}
            </button>

            <button
              onClick={() => handle('dismiss')}
              style={{
                background: fb === 'dismiss' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                border: fb === 'dismiss' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent',
                color: fb === 'dismiss' ? '#ef4444' : '#6b7280',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s'
              }}
            >
              {fb === 'dismiss' ? '✕ Dismissed' : '👎 Not helpful'}
            </button>
          </div>
        </div>
      </div>

      {/* Right meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        {rec.risk && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: riskColor,
            background: riskBg,
            padding: '3px 8px',
            borderRadius: 6,
            textTransform: 'capitalize'
          }}>
            Risk: {rec.risk}
          </span>
        )}
        {rec.confidence != null && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>{rec.confidence}% confidence</span>
        )}
      </div>

      {/* Right chevron arrow */}
      <div style={{ color: '#374151', fontSize: 16, paddingLeft: 4, flexShrink: 0 }}>
        <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

    </motion.div>
  );
}

function FinanceRecommendations({ recommendations }) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const feedback = loadFeedback();
  const sorted = sortByFeedback(recommendations, feedback);
  return (
    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      <div>
        {/* Header & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#8b5cf6', fontSize: 16 }}>✦</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>AI Spending Optimizations</h3>
          </div>
          <p style={{ fontSize: 13, color: '#8e929b', margin: 0 }}>Personalized insights to help you spend smarter and grow faster.</p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: '300px',
          overflowY: 'auto',
          paddingRight: 6
        }}>
          {sorted.map((r, i) => <FinanceRecommendationCard key={r.id} rec={r} index={i} feedback={feedback} onFeedback={forceUpdate} />)}
        </div>
      </div>

      {/* Bottom info bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: '#090a0f',
        border: '1px solid #20222a',
        borderRadius: 8,
        marginTop: 16
      }}>
        <svg style={{ width: 16, height: 16, color: '#8b5cf6', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span style={{ fontSize: 11, color: '#8e929b' }}>
          AI recommendations are based on your financial data and market insights. Always review before taking action.
        </span>
      </div>
    </div>
  );
}

// ── Main Finance Component ───────────────────────────────────────────────────
export default function Finance() {
  const { user } = useAuth();
  const { finance, health, career, records, computed, updateDomain, addRecords, setRecords, addTimelineEvent } = useData();
  const [tab, setTab] = useState('overview');
  const [txFilter, setTxFilter] = useState('All');
  const [txSearch, setTxSearch] = useState('');
  const [isTxDropdownOpen, setIsTxDropdownOpen] = useState(false);

  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const h = { sleepAvg: 7, stressLevel: 5, workoutsPerWeek: 2, ...(health || {}) };
  const c = { studyHoursDaily: 0, codingHoursDaily: 0, dsaPractice: 0, projectsCompleted: 0, skills: [], gpa: 0, ...(career || {}) };
  const score = computed?.financeScore?.score || 0;
  const financeRecords = records?.finance || [];
  const hasFinanceData = f.income > 0 || f.expenses > 0 || f.savings > 0;

  // Load finance records from backend on mount (for real users)
  useEffect(() => {
    if (!financeApi.isEnabled()) return;
    financeApi.getAll()
      .then(records => { if (records.length > 0) setRecords('finance', records); })
      .catch(err => console.warn('Finance: backend load failed:', err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Spending trend ────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (financeRecords.length >= 2) {
      const byDate = {};
      financeRecords.forEach(r => {
        const d = typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0];
        byDate[d] = (byDate[d] || 0) + (r.amount || 0);
      });
      const sorted = Object.entries(byDate).sort(([a], [b]) => new Date(a) - new Date(b)).slice(-30).map(([date, spending]) => ({ date, spending }));
      if (sorted.length < 5) {
        const first = sorted[0]?.date || new Date().toISOString().split('T')[0];
        const pad = [];
        for (let i = 4; i > sorted.length; i--) {
          const d = new Date(new Date(first) - i * 86400000);
          pad.push({ date: d.toISOString().split('T')[0], spending: 0 });
        }
        return [...pad, ...sorted];
      }
      return sorted;
    }
    const safeState = { health: { sleepAvg: 7, stressLevel: 5, moodAvg: 6, workoutsPerWeek: 3, waterIntake: 6 }, finance: f, career: { studyHoursDaily: 4 } };
    return generateTrendData(safeState, 30);
  }, [financeRecords, f]);

  // ── Legacy log form ───────────────────────────────────────────────────────
  const [form, setForm] = useState({ income: '', expense: '', category: 'food', amount: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // ── Parsed transactions (local + backend) ─────────────────────────────────
  const [parsedTxs, setParsedTxs] = useState(() => loadTxsLocal());
  const saveTxs = useCallback((txs) => { setParsedTxs(txs); saveTxsLocal(txs); }, []);

  // ── SMS Parser state ──────────────────────────────────────────────────────
  const [smsInput, setSmsInput] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [otpDetected, setOtpDetected] = useState(false);
  const [editResult, setEditResult] = useState(null);
  const [multiInput, setMultiInput] = useState('');
  const [multiResults, setMultiResults] = useState([]);

  // ── Live feed state ───────────────────────────────────────────────────────
  const [liveActive, setLiveActive] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState('Normal');
  const [liveTxs, setLiveTxs] = useState([]);
  const [notification, setNotification] = useState(null);
  const notifTimerRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const liveCountRef = useRef(0);

  // ── Derived analytics ─────────────────────────────────────────────────────
  const allTxs = useMemo(() => [...liveTxs, ...parsedTxs].sort((a, b) => new Date(b.parsedAt) - new Date(a.parsedAt)), [liveTxs, parsedTxs]);

  const categoryTotals = useMemo(() => {
    const map = {};
    allTxs.filter(t => t.type !== 'Credit').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [allTxs]);

  const liveTotal = useMemo(() => liveTxs.filter(t => t.type !== 'Credit').reduce((s, t) => s + t.amount, 0), [liveTxs]);

  // ── Live feed effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveActive) {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      return;
    }
    const delay = SPEED_OPTIONS[liveSpeed];
    liveIntervalRef.current = setInterval(() => {
      const tx = generateMockTransaction();
      liveCountRef.current++;
      setLiveTxs(prev => [tx, ...prev].slice(0, 100));

      // Floating notification
      clearTimeout(notifTimerRef.current);
      setNotification(tx);
      notifTimerRef.current = setTimeout(() => setNotification(null), 4200);

      // Update finance domain every 5 live transactions to avoid thrashing
      if (liveCountRef.current % 5 === 0) {
        updateDomain('finance', {
          ...f,
          expenses: (f.expenses || 0) + tx.amount,
          categoryTotals: { ...(f.categoryTotals || {}), [tx.category]: ((f.categoryTotals || {})[tx.category] || 0) + tx.amount },
        });
        addRecords('finance', [{ date: new Date().toISOString(), amount: tx.amount, category: tx.category }]);
      }
    }, delay);

    return () => { if (liveIntervalRef.current) clearInterval(liveIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActive, liveSpeed]);

  // ── SMS parse logic ───────────────────────────────────────────────────────
  const handleParse = () => {
    if (!smsInput.trim()) { showToast('Paste a message first', 'error'); return; }
    if (detectOTP(smsInput)) { setOtpDetected(true); setParseResult(null); setEditResult(null); return; }
    setOtpDetected(false);
    const result = parseTransactionSMS(smsInput);
    if (!result) { showToast('Could not extract a transaction — check the format', 'error'); return; }
    setParseResult(result);
    setEditResult({ ...result });
  };

  const handleConfirmTx = async () => {
    if (!editResult) return;
    const confirmed = { ...editResult, id: Date.now(), source: 'manual', parsedAt: new Date().toISOString() };
    const updated = [confirmed, ...parsedTxs];
    saveTxs(updated);
    // Sync to finance domain
    updateDomain('finance', {
      ...f,
      expenses: (f.expenses || 0) + confirmed.amount,
      categoryTotals: { ...(f.categoryTotals || {}), [confirmed.category]: ((f.categoryTotals || {})[confirmed.category] || 0) + confirmed.amount },
    });
    addRecords('finance', [{ date: new Date().toISOString(), amount: confirmed.amount, category: confirmed.category }]);
    addTimelineEvent({ type: 'Transaction Parsed', text: `₹${confirmed.amount} at ${confirmed.merchant} (${confirmed.category})`, sentiment: 'neutral', domain: 'finance' });
    showToast(`Added: ${confirmed.merchant} ₹${confirmed.amount}`, 'success');
    setSmsInput(''); setParseResult(null); setEditResult(null);
    // Persist to backend
    if (financeApi.isEnabled()) {
      try {
        await financeApi.create({ date: new Date().toISOString(), amount: confirmed.amount, category: confirmed.category, merchant: confirmed.merchant, transactionType: confirmed.type === 'Credit' ? 'credit' : 'debit', description: confirmed.bank });
      } catch (err) { console.warn('Finance: backend save failed:', err.message); }
    }
  };

  // Multi-line bulk parse
  const handleBulkParse = () => {
    const lines = multiInput.split('\n').map(l => l.trim()).filter(Boolean);
    const results = lines.map(line => {
      if (detectOTP(line)) return { line, error: 'OTP detected — skipped' };
      const r = parseTransactionSMS(line);
      return r ? { line, result: r } : { line, error: 'Could not parse' };
    });
    setMultiResults(results);
  };

  const handleBulkConfirm = () => {
    const valid = multiResults.filter(r => r.result).map(r => ({ ...r.result, source: 'manual' }));
    if (!valid.length) { showToast('No valid transactions to add', 'error'); return; }
    const updated = [...valid, ...parsedTxs];
    saveTxs(updated);
    const totalAmount = valid.reduce((s, t) => s + t.amount, 0);
    updateDomain('finance', { ...f, expenses: (f.expenses || 0) + totalAmount });
    showToast(`Added ${valid.length} transactions`, 'success');
    setMultiInput(''); setMultiResults([]);
  };

  const handleDeleteTx = (id) => {
    const updated = parsedTxs.filter(t => t.id !== id);
    saveTxs(updated);
  };

  // ── Legacy handlers ───────────────────────────────────────────────────────
  const handleLog = async (e) => {
    e.preventDefault();
    const updated = { ...f };
    let hasUpdate = false;
    const backendRecord = { date: new Date().toISOString() };
    if (form.income) {
      updated.income = parseInt(form.income);
      hasUpdate = true;
      backendRecord.amount = parseInt(form.income);
      backendRecord.transactionType = 'credit';
      backendRecord.category = 'Income';
      addRecords('finance', [{ date: new Date().toISOString(), amount: parseInt(form.income), category: 'Income' }]);
      addTimelineEvent({ type: 'Income Updated', text: `Logged income: ₹${updated.income}`, sentiment: 'positive', domain: 'finance' });
    }
    if (form.amount) {
      const amount = parseInt(form.amount);
      updated.expenses = (updated.expenses || 0) + amount;
      updated.categoryTotals = { ...(updated.categoryTotals || {}) };
      updated.categoryTotals[form.category] = (updated.categoryTotals[form.category] || 0) + amount;
      hasUpdate = true;
      addRecords('finance', [{ date: new Date().toISOString(), amount, category: form.category }]);
      backendRecord.amount = amount; backendRecord.category = form.category; backendRecord.transactionType = 'debit';
      addTimelineEvent({ type: 'Expense Logged', text: `Spent ₹${amount} on ${form.category}`, sentiment: 'neutral', domain: 'finance' });
    }
    if (hasUpdate) {
      updateDomain('finance', updated);
      setForm({ income: '', expense: '', category: 'food', amount: '' });
      showToast('Financial data saved', 'success');
      // Persist to backend
      if (financeApi.isEnabled() && backendRecord.amount) {
        try { await financeApi.create(backendRecord); }
        catch (err) { console.warn('Finance: backend save failed:', err.message); }
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setOcrLoading(true); setOcrProgress(0);
    try {
      const text = await extractTextFromImage(file, p => setOcrProgress(p));
      const parsed = parseReceiptData(text);
      if (parsed.amount > 0) { setForm(prev => ({ ...prev, amount: parsed.amount.toString(), category: parsed.category || 'other' })); showToast(`Receipt scanned! ₹${parsed.amount}`, 'success'); }
      else showToast('Could not detect amount — enter manually.', 'warning');
    } catch { showToast('Failed to read receipt.', 'error'); }
    finally { setOcrLoading(false); e.target.value = ''; }
  };

  const savingsRate = f.income > 0 ? Math.round(((f.income - f.expenses) / f.income) * 100) : 0;
  const burnoutRisk = computed?.burnoutRisk ?? Math.min(100, Math.round(
    ((h.stressLevel || 0) > 7 ? 40 : (h.stressLevel || 0) * 4) +
    ((h.sleepAvg || 7) < 6 ? 35 : Math.max(0, (6 - (h.sleepAvg || 7)) * 10)) +
    (savingsRate < 10 ? 25 : 0)
  ));
  const emotionalSpending = (user?.health?.stressLevel || 0) > 6;
  const defaultBreakdown = [
    { name: 'Living', value: Math.round(f.expenses * 0.35) },
    { name: 'Food', value: Math.round(f.expenses * 0.25) },
    { name: 'Subscriptions', value: f.subscriptions },
    { name: 'Transport', value: Math.round(f.expenses * 0.1) },
    { name: 'Shopping', value: Math.round(f.expenses * 0.15) },
    { name: 'Other', value: Math.round(f.expenses * 0.05) },
  ];
  const expenseBreakdown = f.categoryTotals && Object.keys(f.categoryTotals).length > 0
    ? Object.entries(f.categoryTotals).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : f.expenses > 0 ? defaultBreakdown : [{ name: 'Total', value: 1 }];

  const placementReadiness = computed?.careerScore?.placementReadiness?.score ?? Math.min(100,
    (c.dsaPractice >= 3 ? 25 : Math.round(c.dsaPractice * 8)) +
    (c.projectsCompleted >= 4 ? 25 : Math.round(c.projectsCompleted * 6)) +
    ((c.skills?.length || 0) >= 5 ? 25 : Math.round((c.skills?.length || 0) * 5)) +
    (c.codingHoursDaily >= 4 ? 25 : Math.round(c.codingHoursDaily * 6))
  );
  const stressEstimatedSpend = Math.round(f.expenses * 0.15);
  const sipCompoundEstimate = Math.round(stressEstimatedSpend * 12 * 5 * 1.12); // 5yr @ 12% annualised

  const recommendations = [
    { id: 'fin-spending', icon: '💳', title: 'Spending Optimization', text: savingsRate < 20 ? `Your savings rate is ${savingsRate}%. Target 20-30% by cutting ₹${Math.round((f.expenses * 0.2))} in non-essential spending. Start with subscriptions (₹${f.subscriptions}).` : `Great savings rate of ${savingsRate}%! Consider investing the surplus for compound growth.`, confidence: Math.max(70, 100 - Math.abs(20 - savingsRate) * 2), risk: savingsRate < 10 ? 'high' : 'low' },
    { id: 'fin-investment', icon: '📈', title: 'Investment Allocation', text: f.investments === 0 ? 'Start investing! Recommended: 60% index funds, 20% bonds, 20% emergency fund. Even ₹1000/month grows significantly over time.' : `Current investments: ₹${f.investments}. Diversify into: ${savingsRate > 30 ? '60% equity, 20% debt, 20% gold for growth' : '40% equity, 40% debt, 20% gold for stability'}.`, confidence: f.investments > 0 ? 85 : 75, risk: 'medium' },
    { id: 'fin-emergency', icon: '🛡️', title: 'Emergency Fund', text: f.savings < f.expenses * 3 ? `Emergency fund (₹${f.savings}) covers only ${(f.savings / Math.max(1, f.expenses)).toFixed(1)} months. Build to 3-6 months.` : 'Your emergency fund is solid. Consider moving surplus to investments.', confidence: f.savings < f.expenses * 3 ? 95 : 88, risk: f.savings < f.expenses ? 'high' : 'low' },
    { id: 'fin-subscriptions', icon: '🔄', title: 'Subscription Audit', text: f.subscriptions > f.income * 0.1 ? `Subscriptions (₹${f.subscriptions}) are ${Math.round(f.subscriptions/Math.max(1, f.income)*100)}% of income. Canceling just one unused service could save up to ₹${Math.round(f.subscriptions * 0.3)}/month.` : 'Subscription spending is reasonable. Review annually.', confidence: f.subscriptions > f.income * 0.1 ? 92 : 80, risk: f.subscriptions > f.income * 0.15 ? 'high' : 'low' },
    ...(emotionalSpending ? [{ id: 'fin-emotional', icon: '😰', title: 'Emotional Spending Alert', text: `Your stress level (${h.stressLevel}/10) correlates with increased spending. Implement a 24-hour wait rule before purchases over ₹500.`, confidence: 85, risk: 'high' }] : []),
    { id: 'fin-career', icon: '💼', title: 'Career-Linked Investment Timing', text: placementReadiness >= 75 ? `Your career readiness is ${placementReadiness}% — a salary hike may be near. Park surplus in a liquid fund or short-term FD now so you can immediately increase your SIP after the raise.` : `Upskilling has outsized financial ROI. Allocating ₹${Math.max(500, Math.round(Math.max(0, f.income - f.expenses) * 0.1))} of surplus/month to courses can accelerate your income trajectory faster than most investments.`, confidence: 82, risk: placementReadiness >= 75 ? 'low' : 'medium' },
    ...(h.stressLevel > 6 ? [{ id: 'fin-stress-sip', icon: '🧘', title: 'Stress-Spend Redirect', text: `High stress (${h.stressLevel}/10) is linked to an estimated ₹${stressEstimatedSpend.toLocaleString()} in impulse spending this month. Automating that amount into a SIP instead would compound to ~₹${sipCompoundEstimate.toLocaleString()} over 5 years.`, confidence: 87, risk: 'medium' }] : []),
    ...(h.sleepAvg < 6 ? [{ id: 'fin-sleep-risk', icon: '😴', title: 'Sleep & Income Risk', text: `Averaging ${h.sleepAvg}h of sleep increases burnout risk and can reduce cognitive output by up to ${Math.round((1 - h.sleepAvg / 8) * 40)}%. This lowers income reliability — prioritize a conservative allocation until sleep improves.`, confidence: 88, risk: 'high' }] : []),
    ...(allTxs.length >= 5 ? [{ id: 'fin-parser', icon: '🤖', title: 'Smart Parser Insights', text: `${allTxs.length} parsed transactions detected. ${categoryTotals[0] ? `Highest spend: ${categoryTotals[0].name} ₹${categoryTotals[0].value.toLocaleString()}. ` : ''}Use What-If Simulator to see savings potential.`, confidence: 88, risk: 'low' }] : []),
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-xs"><p className="text-slate-400 mb-1">{label}</p>{payload.map(p => <p key={p.name} style={{ color: p.color || '#fff' }}>{p.name}: ₹{(p.value || 0).toFixed?.(0)}</p>)}</div>;
  };

  const tabs = [
    { id: 'overview',         label: 'Dashboard',    sym: '⊞' },
    { id: 'parse',            label: 'SMS Parser',   sym: '✦' },
    { id: 'live',             label: 'Live Feed',    sym: '●' },
    { id: 'transactions',     label: 'Transactions', sym: '≡' },
    { id: 'log',              label: 'Log',          sym: '\\' },
    { id: 'recommendations',  label: 'AI Advisor',   sym: '◉' },
    { id: 'invest',           label: 'Invest',       sym: '↑' },
  ];

  return (
    <div className={`page-container min-h-screen pb-2 ${['log', 'invest', 'recommendations'].includes(tab) ? '' : 'bg-mesh'}`} style={['log', 'invest', 'recommendations'].includes(tab) ? { backgroundColor: '#090a0f' } : {}}>
      {/* Floating live notification */}
      <AnimatePresence>
        {notification && <LiveNotification tx={notification} onDismiss={() => { setNotification(null); clearTimeout(notifTimerRef.current); }} />}
      </AnimatePresence>



      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'rgba(139, 92, 246, 0.15)',
          color: '#8b5cf6',
          flexShrink: 0
        }}>
          <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m19 8-5 5-3-3-5 5" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Financial Intelligence</h1>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#8e929b', marginTop: 1, marginBottom: 12 }}>AI-powered transaction parsing, live feed, and spending analytics.</p>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: 14,
        gap: 20,
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
                padding: '8px 4px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                color: isActive ? '#ffffff' : '#8e929b',
                position: 'relative',
                transition: 'color 0.2s ease',
                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {t.label}
              {t.id === 'live' && liveActive && <span style={{width:6,height:6,borderRadius:'50%',background:'#10b981',display:'inline-block'}} className="animate-pulse"/>}
              {t.id === 'transactions' && allTxs.length > 0 && (
                <span style={{fontSize:9,padding:'1px 6px',borderRadius:999,background:isActive?'rgba(255,255,255,0.2)':'rgba(99,102,241,0.15)',color:isActive?'#fff':'#818cf8',fontWeight:700}}>{allTxs.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (() => {
        const netWorth   = (f.savings||0)+(f.investments||0)-(f.debt||0);
        const netSavings = Math.max(0,(f.income||0)-(f.expenses||0));
        const scoreColor = score>=70?'#00d8b6':score>=45?'#f59e0b':'#f43f5e';
        const col = 'gridTemplateColumns';
        const card = {background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16};
        const METRICS = [
          {label:'Income',        icon:'💼', color:'#10b981', value:`₹${(f.income||0).toLocaleString()}`,       sub:'This month'},
          {label:'Expenses',      icon:'🛍️', color:'#f43f5e', value:`₹${(f.expenses||0).toLocaleString()}`,     sub:'This month'},
          {label:'Net Savings',   icon:'💰', color:'#3b82f6', value:`₹${netSavings.toLocaleString()}`,           sub:'This month'},
          {label:'Investments',   icon:'📊', color:'#8b5cf6', value:`₹${(f.investments||0).toLocaleString()}`,  sub:'Total value'},
          {label:'Subscriptions', icon:'🔁', color:'#f59e0b', value:`₹${(f.subscriptions||0).toLocaleString()}`,sub:'Active'},
          {label:'Net Worth',     icon:'💎', color:'#6366f1', value:`₹${netWorth.toLocaleString()}`,             sub:'Total value'},
        ];
        const flags = [];
        if (savingsRate < 10)  flags.push({label:`Low Savings Rate: ${savingsRate}%`, color:'#f43f5e'});
        if (f.debt > f.income) flags.push({label:'Debt exceeds monthly income',        color:'#f97316'});
        if (burnoutRisk > 60)  flags.push({label:`High burnout risk: ${burnoutRisk}%`, color:'#f59e0b'});
        const flag = flags[0] || {label:`Savings Rate: ${savingsRate}%`, color:'#00d8b6'};
        const action = flags.length===0 ? 'Keep building your emergency fund.'
          : f.debt>0 ? 'Prioritise clearing high-interest debt before investing.'
          : savingsRate<15 ? 'Automate savings — set up a recurring transfer on payday.'
          : 'Review subscriptions and reduce impulse spending.';

        return (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* ROW 1 */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16}}>

            {/* Score card */}
            <div style={{...card, padding:'24px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap: 24}}>
                {/* Ring */}
                <div style={{position:'relative', width:120, height:120, flexShrink:0}}>
                  <svg viewBox="0 0 120 120" width="120" height="120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="48" fill="none" stroke={scoreColor} strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*48} ${2*Math.PI*48}`}
                      strokeDashoffset={2*Math.PI*48*(1-score/100)}
                      style={{transform:'rotate(-90deg)', transformOrigin:'60px 60px', transition:'stroke-dashoffset 1.2s ease'}}/>
                  </svg>
                  <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                    <span style={{fontSize:32, fontWeight:900, color:'#fff', lineHeight:1}}>{score}</span>
                    <span style={{fontSize:12, color:'#475569', marginTop:2}}>/ 100</span>
                  </div>
                </div>
                {/* Text beside ring */}
                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
                  <p style={{fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:12, margin:'0 0 12px'}}>Finance Score</p>
                  <span style={{display:'inline-block', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:999, marginBottom:12,
                    background:scoreColor+'18', color:scoreColor, border:`1px solid ${scoreColor}44`}}>
                    {score>=70?'Good':score>=45?'Moderate':'Low'}
                  </span>
                  <p style={{fontSize:13, color:'#94a3b8', lineHeight:1.5, margin:0}}>
                    {score>=45?'Keep optimizing your\nspending habits.':'Focus on savings and\nreduce expenses.'}
                  </p>
                </div>
              </div>
              <button onClick={()=>setTab('recommendations')}
                style={{marginTop:32, padding:'8px 16px', borderRadius:8, border:`1px solid ${scoreColor}44`, background:scoreColor+'0f', color:scoreColor, fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, alignSelf:'flex-start'}}>
                View Insights →
              </button>
            </div>

            {/* Metrics side */}
            <div style={{display:'flex', flexDirection:'column', gap: 16}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 16}}>
                {METRICS.map(m => (
                  <div key={m.label} style={{...card, padding:'16px', display:'flex', flexDirection:'column', gap:12}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{width:24, height:24, borderRadius:6, background:m.color+'15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12}}>{m.icon}</div>
                      <span style={{fontSize:12, color:'#94a3b8', fontWeight:500}}>{m.label}</span>
                    </div>
                    <div>
                      <p style={{fontSize:20, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px'}}>{m.value}</p>
                      <p style={{fontSize:11, color:'#64748b', margin:0}}>{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Savings Rate Card */}
              <div style={{...card, padding:'16px 24px', display:'flex', alignItems:'center', gap:16}}>
                <div style={{width:44, height:44, borderRadius:12, background:'rgba(59,130,246,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#3b82f6', flexShrink:0}}>%</div>
                <div style={{display:'flex', flexDirection:'column', minWidth:90, flexShrink:0}}>
                  <p style={{fontSize:11, color:'#64748b', margin:'0 0 4px'}}>Savings Rate</p>
                  <p style={{fontSize:20, fontWeight:800, color:scoreColor, margin:0}}>{savingsRate}%</p>
                  <p style={{fontSize:11, color:'#64748b', margin:'2px 0 0'}}>of income</p>
                </div>
                <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', marginLeft: 16}}>
                  <p style={{fontSize:12, color:'#94a3b8', marginBottom:10, margin:'0 0 10px'}}>Aim for 20% to build strong financial health.</p>
                  <div style={{display:'flex', alignItems:'center', gap:12}}>
                    <div style={{flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden'}}>
                      <motion.div initial={{width:0}} animate={{width:`${Math.min(100,savingsRate)}%`}} transition={{duration:1, ease:'easeOut'}}
                        style={{height:'100%', borderRadius:3, background:scoreColor}}/>
                    </div>
                    <span style={{fontSize:12, fontWeight:700, color:'#64748b'}}>{savingsRate}%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ROW 2 */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16}}>
            {/* Expense Breakdown */}
            <div style={{...card, padding:'24px'}}>
              <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:16}}>
                <h3 style={{fontSize:14, fontWeight:700, color:'#f1f5f9', margin:0}}>Expense Breakdown</h3>
                <span style={{fontSize:12, color:'#475569', cursor:'help'}} title="Based on parsed transactions">ⓘ</span>
              </div>
              {f.expenses>0||categoryTotals.length>0 ? (() => {
                const data=categoryTotals.length>0?categoryTotals:expenseBreakdown;
                const total=data.reduce((s,d)=>s+d.value,0)||f.expenses||1;
                return (
                  <div style={{display:'flex', alignItems:'center', gap:16}}>
                    <div style={{position:'relative', flexShrink:0, width:110, height:110}}>
                      <ResponsiveContainer width={110} height={110}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" outerRadius={50} innerRadius={32} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                            {data.map((e,i)=><Cell key={i} fill={CATEGORY_META[e.name]?.color||COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <Tooltip formatter={v=>`₹${v.toLocaleString()}`} contentStyle={{background:'rgba(13,17,28,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:10}}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                        <span style={{fontSize:11,fontWeight:800,color:'#f1f5f9'}}>
                          ₹{total >= 100000 ? (total/100000).toFixed(1) + 'L' : total >= 1000 ? (total/1000).toFixed(0) + 'K' : total}
                        </span>
                      </div>
                    </div>
                    <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                      {data.slice(0,5).map((e,i)=>{
                        const color=CATEGORY_META[e.name]?.color||COLORS[i%COLORS.length];
                        return(
                          <div key={e.name} style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:color,flexShrink:0}}/>
                            <span style={{fontSize:11,color:'#94a3b8',flex:1}}>{e.name}</span>
                            <span style={{fontSize:11,fontWeight:600,color:'#f1f5f9'}}>₹{e.value.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 0', gap:16}}>
                  <div style={{width:64, height:64, borderRadius:50, border:'1px dashed rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <span style={{fontSize:24}}>📊</span>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <p style={{fontSize:15, fontWeight:600, color:'#e2e8f0', margin:'0 0 6px'}}>No expenses yet</p>
                    <p style={{fontSize:13, color:'#64748b', margin:0, lineHeight:1.5}}>Parse some SMS messages<br/>to see breakdown.</p>
                  </div>
                  <button onClick={()=>setTab('parse')}
                    style={{padding:'10px 20px', borderRadius:8, border:'1px solid rgba(0,216,182,0.3)', background:'rgba(0,216,182,0.06)', color:'#00d8b6', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4}}>
                    Open SMS Parser
                  </button>
                </div>
              )}
            </div>

            {/* Spending Trend */}
            <div style={{...card, padding:'24px', display:'flex', flexDirection:'column'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                <h3 style={{fontSize:14, fontWeight:700, color:'#f1f5f9', margin:0}}>
                  Spending Trend{!hasFinanceData&&<span style={{fontSize:11, color:'#475569', marginLeft:6}}>(demo)</span>}
                </h3>
                <span style={{fontSize:11, color:'#94a3b8', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 10px', cursor:'pointer'}}>This Month ▾</span>
              </div>
              <div style={{flex:1, minHeight:120}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{top:10, right:10, left:-20, bottom:0}}>
                    <defs>
                      <linearGradient id="spendG3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{fill:'#475569',fontSize:10}} tickFormatter={v=>v?.slice(8)||''} axisLine={false} tickLine={false} interval={2}/>
                    <YAxis tick={{fill:'#475569',fontSize:10}} tickFormatter={v=>v>=1000?`₹${(v/1000).toFixed(0)}K`:`₹${v}`} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={v=>`₹${Number(v).toLocaleString()}`} contentStyle={{background:'rgba(13,17,28,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:11}} labelStyle={{color:'#94a3b8'}}/>
                    <Area type="monotone" dataKey="spending" stroke="#f43f5e" strokeWidth={2} fill="url(#spendG3)" dot={false} activeDot={{r:4,fill:'#f43f5e'}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginTop:12}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:'#f43f5e',display:'inline-block'}}/>
                <span style={{fontSize:12,color:'#64748b'}}>Expenses</span>
              </div>
            </div>
          </div>

          {/* ROW 3: Financial Anxiety Detection */}
          <div style={{...card, padding:'20px 24px', display:'flex', alignItems:'center', gap:16}}>
            <div style={{width:40, height:40, borderRadius:10, background:'rgba(244,63,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18}}>🛡️</div>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px'}}>Financial Anxiety Detection</p>
              <p style={{fontSize:13, fontWeight:600, color:flag.color, margin:'0 0 2px'}}>{flag.label}</p>
              <p style={{fontSize:12, color:'#94a3b8', margin:0}}>{action}</p>
            </div>
            <button onClick={()=>setTab('recommendations')}
              style={{padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#cbd5e1', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, display:'flex', alignItems:'center', gap:6, transition:'background 0.2s'}}
              onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
            >
              View Recommendations →
            </button>
          </div>

        </div>
        );
      })()}

      {/* ── SMS PARSER TAB ────────────────────────────────────────────────── */}
      {tab === 'parse' && (() => {
        const pCard = {background:'#12141a', border:'1px solid #20222a', borderRadius:16, padding:'24px', display:'flex', flexDirection:'column'};
        const BRAND_COLORS = { Uber:'#1a1a1a', Ola:'#2b9348', Swiggy:'#fc8019', Zomato:'#cb202d', Netflix:'#e50914', Amazon:'#ff9900', Flipkart:'#2874f0', Dunzo:'#00d25b', BigBasket:'#84c225', Blinkit:'#f8cc1b', Rapido:'#333', PhonePe:'#5f259f', Paytm:'#00b9f5' };
        const hashColor = s => { const c=['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#10b981','#06b6d4','#3b82f6']; let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0xffffffff; return c[Math.abs(h)%c.length]; };
        const merchantBg = m => BRAND_COLORS[m] || hashColor(m||'X');
        const inputStyle = {width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'5px 8px', color:'#f1f5f9', fontSize:11, outline:'none', boxSizing:'border-box'};
        return (
          <div style={{display:'flex', flexDirection:'column', gap:20}}>

            {/* ── Two parser cards ── */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>

              {/* LEFT: Paste SMS */}
              <div style={pCard}>
                <h3 style={{fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:4}}>Paste SMS</h3>
                <p style={{fontSize:11, color:'#64748b', marginBottom:12}}>Paste a single SMS to parse the transaction.</p>

                <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:10}}>
                  {SAMPLE_MESSAGES.map(s => (
                    <button key={s.label} onClick={() => { setSmsInput(s.msg); setOtpDetected(false); setParseResult(null); setEditResult(null); }}
                      style={{fontSize:10, padding:'3px 10px', borderRadius:999, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', color:'#a78bfa', cursor:'pointer'}}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div style={{position:'relative', marginBottom:10, flex:1, display:'flex', flexDirection:'column'}}>
                  <textarea
                    value={smsInput}
                    onChange={e => { setSmsInput(e.target.value.slice(0,500)); setOtpDetected(false); setParseResult(null); setEditResult(null); }}
                    maxLength={500}
                    placeholder='e.g. "Rs. 450 spent on Swiggy using HDFC Credit Card."'
                    style={{flex:1, width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'10px 12px', paddingBottom:24, color:'#e2e8f0', fontSize:12, resize:'none', outline:'none', fontFamily:'ui-monospace,JetBrains Mono,monospace', boxSizing:'border-box', lineHeight:1.4, minHeight:80}}
                  />
                  <span style={{position:'absolute', bottom:6, right:12, fontSize:10, color:'#475569', pointerEvents:'none'}}>{smsInput.length} / 500</span>
                </div>

                {otpDetected && (
                  <div style={{marginBottom:10, padding:'8px 12px', borderRadius:6, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontSize:12}}>🔐</span>
                    <div>
                      <p style={{fontSize:11, fontWeight:600, color:'#f43f5e'}}>OTP detected — will not be parsed</p>
                    </div>
                  </div>
                )}

                <button onClick={handleParse}
                  style={{width:'100%', padding:'10px 0', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                  <span>⚡</span> Parse Transaction
                </button>

                <AnimatePresence>
                  {parseResult && editResult && (
                    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{marginTop:20}}>
                      <div style={{padding:'16px', borderRadius:12, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.05)', marginBottom:16}}>
                        <p style={{fontSize:10, fontWeight:700, color:'#10b981', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12}}>Parsed Result — Edit if needed</p>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                          {[{label:'Amount (₹)',key:'amount',type:'number'},{label:'Merchant',key:'merchant',type:'text'},{label:'Bank',key:'bank',type:'text'},{label:'Payment Mode',key:'paymentMode',type:'text'}].map(field => (
                            <div key={field.key}>
                              <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:4}}>{field.label}</label>
                              <input type={field.type} value={editResult[field.key]||''} onChange={e=>setEditResult(p=>({...p,[field.key]:field.type==='number'?parseFloat(e.target.value)||0:e.target.value}))} style={inputStyle}/>
                            </div>
                          ))}
                          <div>
                            <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:4}}>Category</label>
                            <select value={editResult.category} onChange={e=>setEditResult(p=>({...p,category:e.target.value}))} style={{...inputStyle, background:'rgba(20,25,40,0.95)'}}>
                              {Object.keys(CATEGORY_META).map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:4}}>Type</label>
                            <select value={editResult.type} onChange={e=>setEditResult(p=>({...p,type:e.target.value}))} style={{...inputStyle, background:'rgba(20,25,40,0.95)'}}>
                              <option value="Debit">Debit</option>
                              <option value="Credit">Credit</option>
                            </select>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:16}}>
                          <span style={{fontSize:20}}>{CATEGORY_META[editResult.category]?.icon}</span>
                          <span style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{editResult.merchant}</span>
                          <span style={{fontSize:14,fontWeight:700,color:'#f43f5e',marginLeft:'auto'}}>₹{editResult.amount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <button onClick={handleConfirmTx} style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                        Add Transaction ✓
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT: Bulk Import */}
              <div style={pCard}>
                <h3 style={{fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:4}}>Bulk Import</h3>
                <p style={{fontSize:11, color:'#64748b', marginBottom:12}}>Paste multiple SMS messages (one per line).</p>

                <div style={{position:'relative', marginBottom:10, flex:1, display:'flex', flexDirection:'column'}}>
                  <textarea
                    value={multiInput}
                    onChange={e => setMultiInput(e.target.value.slice(0,500))}
                    maxLength={500}
                    placeholder={'Rs. 450 spent on Swiggy using HDFC\nINR 320 debited from SBI for Uber ride\nRs. 649 charged to Axis for Netflix'}
                    style={{flex:1, width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'10px 12px', paddingBottom:24, color:'#e2e8f0', fontSize:12, resize:'none', outline:'none', fontFamily:'ui-monospace,JetBrains Mono,monospace', boxSizing:'border-box', lineHeight:1.4, minHeight:80}}
                  />
                  <span style={{position:'absolute', bottom:6, right:12, fontSize:10, color:'#475569', pointerEvents:'none'}}>{multiInput.length} / 500</span>
                </div>

                <button onClick={handleBulkParse}
                  style={{width:'100%', padding:'10px 0', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                  <span>⊞</span> Parse All Lines
                </button>

                {multiResults.length > 0 && (
                  <div style={{marginTop:20, display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto'}}>
                    {multiResults.map((r,i) => (
                      <div key={i} style={{padding:'10px 12px', borderRadius:10, border:r.result?'1px solid rgba(16,185,129,0.2)':'1px solid rgba(244,63,94,0.2)', background:r.result?'rgba(16,185,129,0.05)':'rgba(244,63,94,0.05)'}}>
                        {r.result ? (
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontSize:12,color:'#94a3b8'}}>{CATEGORY_META[r.result.category]?.icon} {r.result.merchant}</span>
                            <span style={{fontSize:13,fontWeight:700,color:'#10b981'}}>₹{r.result.amount}</span>
                          </div>
                        ) : (
                          <span style={{fontSize:12,color:'#f43f5e'}}>⚠ {r.error}</span>
                        )}
                      </div>
                    ))}
                    <button onClick={handleBulkConfirm} style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',marginTop:8}}>
                      Add {multiResults.filter(r=>r.result).length} Valid Transactions ✓
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Recent Activity ── always visible; falls back to demo rows ── */}
            {(() => {
              const DEMO_TXS = [
                { id:'d1', merchant:'Uber',              category:'Transport',     type:'Debit',  amount:320,  bank:'SBI Debit Card',    parsedAt:'2025-05-30T13:32:00Z' },
                { id:'d2', merchant:'Swiggy',            category:'Food',          type:'Debit',  amount:450,  bank:'HDFC Credit Card',  parsedAt:'2025-05-30T15:15:00Z' },
                { id:'d3', merchant:'Netflix',           category:'Subscriptions', type:'Debit',  amount:649,  bank:'Axis Bank',         parsedAt:'2025-05-29T17:42:00Z' },
              ];
              const rows = allTxs.length > 0 ? allTxs.slice(0,5) : DEMO_TXS;
              const isDemo = allTxs.length === 0;
              return (
                <div style={{background:'#12141a', border:'1px solid #20222a', borderRadius:16, padding:'24px'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <h3 style={{fontSize:14, fontWeight:700, color:'#f1f5f9'}}>Recent Activity</h3>
                      {isDemo && <span style={{fontSize:10, padding:'1px 8px', borderRadius:999, background:'rgba(99,102,241,0.1)', color:'#818cf8', fontWeight:600}}>demo</span>}
                    </div>
                    <button onClick={()=>setTab('transactions')} style={{fontSize:11,color:'#6366f1',background:'none',border:'none',cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                      View all →
                    </button>
                  </div>
                  {rows.map((tx,i) => (
                    <div key={tx.id} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:i<rows.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                      <div style={{width:32, height:32, borderRadius:8, background:merchantBg(tx.merchant), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0, letterSpacing:'-0.5px'}}>
                        {tx.merchant?.slice(0,2).toUpperCase()||'?'}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,color:'#f1f5f9',marginBottom:0}}>{tx.merchant} {tx.category==='Transport'?'Ride':tx.category==='Food'?'Order':tx.category==='Subscriptions'?'Subscription':''}</p>
                        <p style={{fontSize:11,color:'#475569'}}>{tx.category}</p>
                      </div>
                      <p style={{fontSize:14,fontWeight:700,color:tx.type==='Credit'?'#10b981':'#f1f5f9',flexShrink:0}}>
                        ₹{tx.amount.toLocaleString()}
                      </p>
                      <p style={{fontSize:11,color:'#475569',flexShrink:0,minWidth:140,textAlign:'right'}}>
                        {new Date(tx.parsedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} • {new Date(tx.parsedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}
                      </p>
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'rgba(99,102,241,0.1)',color:'#818cf8',fontWeight:600,flexShrink:0,whiteSpace:'nowrap'}}>
                        {tx.bank}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── LIVE FEED TAB ─────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 10 }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={20} color="#818cf8" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Live Transaction Simulator</h3>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>Simulates real-time payment notifications — impressive for live data demonstrations.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>SPEED</span>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 4, gap: 4 }}>
                  {Object.keys(SPEED_OPTIONS).map(s => (
                    <motion.button 
                      key={s} 
                      onClick={() => setLiveSpeed(s)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        background: liveSpeed === s ? '#6366f1' : 'transparent',
                        color: liveSpeed === s ? '#ffffff' : '#94a3b8',
                        boxShadow: liveSpeed === s ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setLiveActive(v => !v); if (liveActive) liveCountRef.current = 0; }}
                style={{
                  padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: liveActive ? 'rgba(244,63,94,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: liveActive ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: liveActive ? '#fb7185' : '#ffffff',
                  boxShadow: liveActive ? '0 0 12px rgba(244,63,94,0.15)' : '0 4px 12px rgba(99,102,241,0.25)'
                }}
              >
                {liveActive ? (
                  <><Pause size={16} className="animate-pulse" /> Stop Simulation</>
                ) : (
                  <><Play size={16} /> Start Simulation</>
                )}
              </motion.button>
            </div>
          </div>

          {liveActive && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' }}
            >
              <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#34d399', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              </span>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', margin: 0 }}>
                Active Streaming — {liveTxs.length} transactions · Total: ₹{Math.round(liveTotal).toLocaleString()}
              </p>
            </motion.div>
          )}

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>

            {/* Left: Incoming Transactions */}
            <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Incoming Live Stream</h3>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6 }}>Real-Time Ledger</span>
              </div>
              
              {liveTxs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '60px 0', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, background: 'rgba(255,255,255,0.02)', gap: 16 }}>
                  <motion.div 
                    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
                    style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}
                  >
                    ⚡
                  </motion.div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>Live Simulation Standby</p>
                    <p style={{ fontSize: 13, color: '#64748b', maxWidth: 300, lineHeight: 1.5, margin: 0 }}>Click "Start Simulation" at the top right to stream mock credit/debit alerts into your digital twin.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
                  <AnimatePresence initial={false}>
                    {liveTxs.map(tx => (
                      <TxCard key={tx.id} tx={tx} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Right: Live Category Breakdown */}
            <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 96, height: 96, borderRadius: '50%', background: 'rgba(139,92,246,0.05)', filter: 'blur(24px)', pointerEvents: 'none' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Live Breakdown</h3>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6 }} title="Updates automatically as transactions stream in">Reactive</span>
              </div>
              
              {categoryTotals.filter(c => liveTxs.some(t => t.category === c.name)).length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '80px 0', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
                  <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>Waiting for data...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categoryTotals.filter(c => liveTxs.some(t => t.category === c.name)).map((cat, i) => {
                    const meta = CATEGORY_META[cat.name] || CATEGORY_META.Others;
                    const max = categoryTotals[0]?.value || 1;
                    return (
                      <motion.div 
                        key={cat.name} 
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{meta.icon}</span> {cat.name}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                            ₹{cat.value.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div 
                            animate={{ width: `${(cat.value / max) * 100}%` }} 
                            style={{ height: '100%', borderRadius: 3, background: meta.color }} 
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ──────────────────────────────────────────────── */}
      {tab === 'transactions' && (() => {
        // Compute stats for all transactions
        const totalCount = allTxs.length;
        const totalDebited = allTxs.filter(t => t.type !== 'Credit').reduce((s, t) => s + t.amount, 0);
        const totalCredited = allTxs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
        const topMerchant = (() => { 
          const m = {}; 
          allTxs.forEach(t => { m[t.merchant] = (m[t.merchant] || 0) + t.amount; }); 
          return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'; 
        })();

        // Filter transactions based on category pill & search input
        const filteredTxs = allTxs.filter(tx => {
          const matchesFilter = txFilter === 'All' || tx.category === txFilter;
          const matchesSearch = txSearch.trim() === '' || tx.merchant.toLowerCase().includes(txSearch.toLowerCase());
          return matchesFilter && matchesSearch;
        });

        const filterCategories = ['All', ...Object.keys(CATEGORY_META)];

        return (
          <div className="flex flex-col gap-6 relative z-10">
            
            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Total Parsed */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.02 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Total Logs</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">{totalCount}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Parsed receipts</p>
                </div>
              </motion.div>

              {/* Card 2: Total Debited */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.02 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-rose-500/5 blur-xl pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Total Debited</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">₹{Math.round(totalDebited).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Spent from alerts</p>
                </div>
              </motion.div>

              {/* Card 3: Total Credited */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.02 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Total Credited</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">₹{Math.round(totalCredited).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Received to accounts</p>
                </div>
              </motion.div>

              {/* Card 4: Top Merchant */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.02 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                  <Award size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Top Merchant</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5 font-mono truncate max-w-[120px]">{topMerchant}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Primary channel</p>
                </div>
              </motion.div>
            </div>

            {/* Category Breakdown Chart */}
            {categoryTotals.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Coins className="text-indigo-400" size={16} />
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest font-mono">Category Volume Stream</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 rounded px-2.5 py-0.5 font-bold font-mono tracking-wide">Dynamic View</span>
                </div>
                
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryTotals} barSize={40} margin={{ top: 15, right: 0, left: -26, bottom: 0 }}>
                      <defs>
                        {categoryTotals.map((c, i) => {
                          const meta = CATEGORY_META[c.name] || CATEGORY_META.Others;
                          return (
                            <linearGradient key={c.name} id={`barGrad-${c.name}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={meta.color} stopOpacity={0.85} />
                              <stop offset="100%" stopColor={meta.color} stopOpacity={0.2} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                        contentStyle={{ background: 'rgba(10,15,25,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }}
                        formatter={v => [`₹${v.toLocaleString()}`, 'Spent Volume']}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[6, 6, 0, 0]} 
                        label={{ position: 'top', fill: '#cbd5e1', fontSize: 8, fontFamily: 'monospace', formatter: v => `₹${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}` }}
                      >
                        {categoryTotals.map((c, i) => (
                          <Cell key={i} fill={`url(#barGrad-${c.name})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* All Transactions List */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    Ledger Account Logs
                    <Info size={14} className="text-slate-400 cursor-pointer hover:text-slate-200 transition-colors" title="Explore your historical bank notification flow" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explore your historical bank notification flow.</p>
                </div>
                
                {parsedTxs.length > 0 && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { saveTxs([]); showToast('Cleared manual transactions', 'success'); }}
                    className="px-3.5 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    Clear Manual Logs
                  </motion.button>
                )}
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center pt-1.5 w-full">
                
                {/* Search Field */}
                <div className="relative flex items-center w-full lg:w-72 shrink-0">
                  <span className="absolute left-3.5 text-slate-400 flex items-center justify-center pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search merchant name..."
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/[0.08] focus:border-indigo-500/50 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 outline-none transition-all leading-normal font-sans"
                  />
                  {txSearch && (
                    <button 
                      onClick={() => setTxSearch('')}
                      className="absolute right-3.5 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex-grow min-w-0 flex items-center justify-start lg:justify-end overflow-hidden">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                    {(() => {
                      const visibleCategories = ['All', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education'];
                      const dropdownCategories = ['Groceries', 'Investments', 'Others'];
                      const isDropdownActive = dropdownCategories.includes(txFilter);
                      
                      return (
                        <>
                          {visibleCategories.map(cat => {
                            const isActive = txFilter === cat;
                            const meta = CATEGORY_META[cat] || { color: '#6366f1' };
                            return (
                              <motion.button
                                key={cat}
                                onClick={() => {
                                  setTxFilter(cat);
                                  setIsTxDropdownOpen(false);
                                }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                  backgroundColor: isActive ? (meta.color || '#6366f1') : 'rgba(15, 23, 42, 0.4)',
                                  borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.08)',
                                  color: isActive ? '#ffffff' : '#94a3b8'
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide border cursor-pointer transition-all shrink-0 font-sans"
                              >
                                {cat}
                              </motion.button>
                            );
                          })}

                          {/* Collapsed Dropdown Pill */}
                          <div className="relative shrink-0">
                            <motion.button
                              onClick={() => setIsTxDropdownOpen(!isTxDropdownOpen)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              style={{
                                backgroundColor: isDropdownActive ? (CATEGORY_META[txFilter]?.color || '#6366f1') : 'rgba(15, 23, 42, 0.4)',
                                borderColor: isDropdownActive ? 'transparent' : 'rgba(255,255,255,0.08)',
                                color: isDropdownActive ? '#ffffff' : '#94a3b8'
                              }}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide border cursor-pointer transition-all flex items-center gap-1 shrink-0 font-sans"
                            >
                              <span>{isDropdownActive ? `${txFilter}` : 'More'}</span>
                              <ChevronDown size={12} className={`transition-transform duration-200 ${isTxDropdownOpen ? 'rotate-180' : ''}`} />
                            </motion.button>

                            <AnimatePresence>
                              {isTxDropdownOpen && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsTxDropdownOpen(false)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute right-0 mt-2 w-40 rounded-xl border border-white/[0.08] bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 flex flex-col gap-0.5"
                                  >
                                    {dropdownCategories.map(cat => {
                                      const isCatActive = txFilter === cat;
                                      const meta = CATEGORY_META[cat] || { color: '#6366f1' };
                                      return (
                                        <button
                                          key={cat}
                                          onClick={() => {
                                            setTxFilter(cat);
                                            setIsTxDropdownOpen(false);
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between font-sans ${
                                            isCatActive 
                                              ? 'bg-white/[0.08] text-white' 
                                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs">{meta.icon}</span>
                                            <span>{cat}</span>
                                          </div>
                                          {isCatActive && (
                                            <span 
                                              className="w-1.5 h-1.5 rounded-full" 
                                              style={{ backgroundColor: meta.color }}
                                            />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Transactions stream list */}
              {filteredTxs.length === 0 ? (
                <div className="flex flex-col gap-3 py-16 border border-dashed border-white/[0.08] bg-slate-950/20 rounded-2xl items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.12)]">
                    <Clipboard size={22} className="opacity-80" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">No matching logs found</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try modifying your search filter keywords.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent pr-1">
                  {filteredTxs.map(tx => (
                    <TxCard 
                      key={tx.id} 
                      tx={tx} 
                      onDelete={tx.source === 'manual' ? handleDeleteTx : null} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── LOG TAB ───────────────────────────────────────────────────────── */}
      {/* ── LOG TAB ───────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="flex flex-col gap-6 relative z-10 w-full">
          
          {/* Form Section Header */}
          <div>
            <h2 className="text-base font-extrabold text-slate-100 uppercase tracking-widest font-sans flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
              Financial Ledger Manager
            </h2>
            <p className="text-xs text-slate-400 mt-1">Manually record transactions or scan paper receipts using high-tech OCR analysis.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Form & OCR */}
            <div className="flex flex-col gap-6">
              
              {/* Form Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-5 relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700" />
                
                <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FileText size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-200">Manual Entry Console</span>
                </div>
                
                <form onSubmit={handleLog} className="flex flex-col gap-4 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Monthly Income */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">Monthly Income</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-400 flex items-center justify-center">
                          <span className="font-bold text-xs">₹</span>
                        </span>
                        <input
                          type="number"
                          value={form.income}
                          onChange={e => setForm(p => ({ ...p, income: e.target.value }))}
                          placeholder="e.g. 50,000"
                          className="w-full bg-slate-950/60 border border-white/[0.08] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 outline-none transition-all font-sans placeholder-slate-600"
                        />
                      </div>
                    </div>

                    {/* Expense Category */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">Category</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                          <Activity size={14} />
                        </span>
                        <select
                          value={form.category}
                          onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                          className="w-full bg-slate-950/60 border border-white/[0.08] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2.5 pl-9 pr-8 text-xs text-slate-200 outline-none transition-all appearance-none cursor-pointer font-sans"
                        >
                          <option value="Food">Food & Dining</option>
                          <option value="Transport">Transport</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Bills">Bills & Utilities</option>
                          <option value="Health">Health</option>
                          <option value="Education">Education</option>
                          <option value="Groceries">Groceries</option>
                          <option value="Investments">Investments</option>
                          <option value="Others">Other</option>
                        </select>
                        <span className="absolute right-3.5 text-slate-400 pointer-events-none">
                          <ChevronDown size={14} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">Amount Spent</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 flex items-center justify-center">
                        <span className="font-bold text-xs">₹</span>
                      </span>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="e.g. 1,500"
                        className="w-full bg-slate-950/60 border border-white/[0.08] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 outline-none transition-all font-sans placeholder-slate-600"
                      />
                    </div>
                  </div>

                  {/* Save Entry Button */}
                  <motion.button
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full mt-3 py-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs tracking-wide shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Coins size={14} />
                    Commit Entry to Ledger
                  </motion.button>
                </form>
              </div>

              {/* OCR Receipt Scanner Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-700" />
                
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Search size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-200">Cyber Receipt Scanner</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold tracking-wide flex items-center gap-1">
                    <Sparkles size={10} className="animate-pulse" /> AI OCR
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-400 leading-relaxed relative z-10">
                  Upload an image of your receipt. Our neural engine will automatically extract the merchant, category, and exact amount.
                </p>

                <div className="relative z-10 mt-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    id="ocr-upload-input"
                    className="hidden"
                    disabled={ocrLoading}
                  />
                  <label
                    htmlFor="ocr-upload-input"
                    className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      ocrLoading 
                        ? 'border-emerald-500/40 bg-emerald-500/10 cursor-wait shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                        : 'border-white/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    }`}
                  >
                    {ocrLoading ? (
                      <div className="flex flex-col items-center gap-4 w-full px-8">
                        <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <Activity size={24} className="animate-pulse" />
                        </div>
                        <div className="w-full text-center">
                          <p className="text-xs font-bold text-slate-200">Analyzing Receipt Data...</p>
                          <div className="w-full bg-slate-950/80 rounded-full h-1.5 mt-3 overflow-hidden border border-white/5">
                            <motion.div 
                              className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
                              animate={{ width: `${ocrProgress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-emerald-400/80 font-mono mt-2 font-bold">{ocrProgress}% complete</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 mb-3 group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all duration-300">
                          <Clipboard size={22} />
                        </div>
                        <span className="text-[13px] font-bold text-slate-200">Drop receipt or click to browse</span>
                        <span className="text-[11px] text-slate-500 mt-1.5 font-medium">JPG, PNG, WebP up to 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Recent Logs */}
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-4 min-h-[460px] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
              
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-200">Audit Ledger Stream</span>
                </div>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  LIVE DB
                </span>
              </div>

              {financeRecords.length === 0 ? (
                <div className="flex flex-col gap-3 py-24 border-2 border-dashed border-white/5 bg-slate-950/20 rounded-xl items-center justify-center text-center flex-1 mt-2">
                  <div className="w-14 h-14 rounded-full border border-white/5 bg-slate-900 flex items-center justify-center text-slate-500 shadow-inner">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-300">Empty Ledger</p>
                    <p className="text-[11px] text-slate-500 mt-1.5 max-w-xs leading-relaxed px-4">Your manually recorded inputs and scanned receipts will securely compile here.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent pr-1.5 mt-1">
                  <AnimatePresence initial={false}>
                    {financeRecords.slice(0, 15).map((rec, idx) => {
                      const isIncome = rec.category === 'Income';
                      const meta = CATEGORY_META[rec.category] || CATEGORY_META.Others;
                      
                      return (
                        <motion.div 
                          key={rec.id || idx}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all group ${
                            isIncome 
                              ? 'border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] hover:border-emerald-500/20' 
                              : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                              isIncome 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : `bg-slate-950/50 border border-white/5 ${meta.text}`
                            }`}
                            style={!isIncome ? { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}30` } : {}}
                            >
                              {isIncome ? '💼' : meta.icon}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-200 tracking-wide font-sans">{rec.category}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                {new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className={`text-sm font-black font-sans tracking-tight ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                              {isIncome ? '+' : '-'}₹{rec.amount.toLocaleString()}
                            </p>
                            <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider bg-slate-950/50 px-1.5 py-0.5 rounded">Committed</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── RECOMMENDATIONS TAB ───────────────────────────────────────────── */}
      {tab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {hasFinanceData ? (() => {
            const highCount = recommendations.filter(r => r.risk === 'high').length || 2;
            const medCount = recommendations.filter(r => r.risk === 'medium').length || 2;
            const lowCount = recommendations.filter(r => r.risk === 'low').length || 1;
            const totalCount = highCount + medCount + lowCount;

            const getRec = (id) => recommendations.find(r => r.id === id);
            const recInvestment = getRec('fin-investment') || { title: 'Investment Allocation', text: 'Start investing in index funds. Aim for 20% allocation to grow wealth over time.', risk: 'medium' };
            const recSpending = getRec('fin-spending') || { title: 'Spending Optimization', text: 'Your savings rate is 0%. Cut non-essential expenses and aim for 20–30% savings.', risk: 'high' };
            const recEmergency = getRec('fin-emergency') || { title: 'Emergency Fund', text: 'Build an emergency fund worth 3–6 months of your essential expenses.', risk: 'low' };
            const recSubscriptions = getRec('fin-subscriptions') || { title: 'Subscription Audit', text: 'Review and cancel unused subscriptions. Save more without impacting lifestyle.', risk: 'low' };
            const recCareer = getRec('fin-career') || { title: 'Career-linked Investment Timing', text: 'Allocate ₹500/month to skill-building or courses. This will boost your income potential long-term.', risk: 'medium' };

            const iconStyles = {
              'fin-investment': { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', color: '#10b981', icon: '📈' },
              'fin-spending': { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', icon: '💳' },
              'fin-emergency': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', icon: '🛡️' },
              'fin-subscriptions': { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', icon: '🔁' },
              'fin-career': { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', icon: '💼' }
            };

            const renderRecCard = (rec, iconStyle) => {
              const badgeColor = rec.risk === 'high' ? '#f43f5e' : rec.risk === 'medium' ? '#f59e0b' : '#10b981';
              const badgeBg = rec.risk === 'high' ? 'rgba(244,63,94,0.06)' : rec.risk === 'medium' ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)';
              const badgeBorder = rec.risk === 'high' ? 'rgba(244,63,94,0.15)' : rec.risk === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';

              return (
                <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '155px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Square icon box */}
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: iconStyle.bg, border: `1px solid ${iconStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {iconStyle.icon}
                        </div>
                        <div>
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>{rec.title}</h4>
                        </div>
                      </div>
                      {/* Priority badge */}
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, textTransform: 'capitalize' }}>
                        {rec.risk}
                      </span>
                    </div>
                    
                    {/* Description text */}
                    <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14 }}>
                      {rec.text}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      Learn More
                    </button>
                    <button style={{ background: 'transparent', border: '1px solid #10b981', borderRadius: 8, padding: '7px 18px', color: '#10b981', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      Apply ✓
                    </button>
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Opportunity Summary Header Card */}
                <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', marginRight: 14 }}>
                      <span style={{ fontSize: 18, color: '#818cf8' }}>✨</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>AI detected {totalCount} opportunities</h3>
                      <p style={{ fontSize: 12, color: '#10b981', margin: '2px 0 0', fontWeight: 600 }}>Potential improvement: +12 Finance Score</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f43f5e', lineHeight: 1.2 }}>{highCount} High</span>
                        <span style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.2 }}>Priority</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', lineHeight: 1.2 }}>{medCount} Medium</span>
                        <span style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.2 }}>Priority</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', lineHeight: 1.2 }}>{lowCount} Low</span>
                        <span style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.2 }}>Priority</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid layout for top 4 cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {renderRecCard(recInvestment, iconStyles['fin-investment'])}
                  {renderRecCard(recSpending, iconStyles['fin-spending'])}
                  {renderRecCard(recEmergency, iconStyles['fin-emergency'])}
                  {renderRecCard(recSubscriptions, iconStyles['fin-subscriptions'])}
                </div>

                {/* Full-width bottom card */}
                <div style={{ width: '100%' }}>
                  {renderRecCard(recCareer, iconStyles['fin-career'])}
                </div>

                {/* Footer text */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ color: '#818cf8', fontSize: 13 }}>✦</span>
                  <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>
                    Recommendations update automatically as your data changes.
                  </p>
                </div>
              </div>
            );
          })() : (
            <div style={{
              background: '#1c1912',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 8,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 24
            }}>
              <svg style={{ width: 20, height: 20, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', margin: '0 0 4px 0' }}>Log financial data first</h4>
                <p style={{ fontSize: 13, color: '#eab308', margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                  The portfolio advisor calculates allocations from your real income and expenses. Log them in the{' '}
                  <span style={{ textDecoration: 'underline', color: '#f59e0b', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTab('log')}>Log tab</span>
                  {' '}to get accurate advice.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVEST TAB ────────────────────────────────────────────────────── */}
      {tab === 'invest' && (
        hasFinanceData ? (
          <InvestmentRoboAdvisor f={f} score={score} />
        ) : (
          <div style={{
            background: '#12141a',
            border: '1px solid #20222a',
            borderRadius: 12,
            padding: '80px 24px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            {/* Bar chart icon */}
            <svg style={{ width: 48, height: 48, marginBottom: 24 }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="11" width="3" height="9" rx="1.5" fill="#10b981" />
              <rect x="10.5" y="7" width="3" height="13" rx="1.5" fill="#06b6d4" />
              <rect x="16" y="4" width="3" height="16" rx="1.5" fill="#8b5cf6" />
            </svg>

            {/* Heading */}
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 12px 0' }}>No Financial Data Yet</h3>
            
            {/* Subtitle */}
            <p style={{ fontSize: 14, color: '#8e929b', lineHeight: 1.6, marginBottom: 24, maxWidth: 500, marginInline: 'auto' }}>
              Log your income and expenses first.<br />
              The Robo-Advisor will calculate your investable surplus,<br />
              risk profile, portfolio allocation, India tax savings (80C/80D),<br />
              and SIP projections.
            </p>

            {/* Button */}
            <button onClick={() => setTab('log')} style={{
              background: 'transparent',
              border: '1px solid #5a3bee',
              borderRadius: 8,
              padding: '12px 24px',
              color: '#8b5cf6',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(90, 59, 238, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="18" x="5" y="3" rx="2" />
                <path d="M9 7h6M9 11h6M9 15h4" />
              </svg>
              Log Financial Data
            </button>
          </div>
        )
      )}
    </div>
  );
}
