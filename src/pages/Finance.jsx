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
import {
  parseTransactionSMS, detectOTP, CATEGORY_META, SAMPLE_MESSAGES, MERCHANT_MAP,
} from '../services/transactionParserService';
import { generateMockTransaction, SPEED_OPTIONS } from '../services/mockTransactionService';

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];

const TX_LS_KEY = 'finance_parsed_transactions';
function loadTxsLocal() { try { return JSON.parse(localStorage.getItem(TX_LS_KEY) || '[]'); } catch { return []; } }
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
    <div style={{ background: '#111418', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* Main body: left strategy + right actions */}
      <div style={{ display: 'flex', gap: 0 }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex: 1, padding: '28px 28px 24px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{a.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>₹{a.amount.toLocaleString()}</span>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{a.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${a.pct}%` }}
                    transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                    style={{ height: '100%', background: a.color === '#10b981' ? 'linear-gradient(90deg,#00d8b680,#10b981)' : a.color === '#f59e0b' ? '#f59e0b' : 'rgba(255,255,255,0.15)', borderRadius: 3 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 320, flexShrink: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 420 }}>
          <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: 4, marginBottom: 2 }}>Spending Optimization</p>
          {actionCards.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <p style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>All optimisations applied. Portfolio is healthy.</p>
            </div>
          )}
          {actionCards.map((card, i) => (
            <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{card.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{card.title}</p>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>{card.desc}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#00d8b6', color: '#060b14', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {card.primary}
                </button>
                <button onClick={() => setDismissed(d => ({ ...d, [card.id]: true }))}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {card.secondary}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── TOP PANEL: Strategy + Action Cards ── */}
      <div style={{ background: '#111418', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>

          {/* LEFT: Allocation Strategy */}
          <div style={{ flex: 1, padding: '28px 28px 24px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,216,182,0.12)', border: '1px solid rgba(0,216,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00d8b6', boxShadow: '0 0 8px #00d8b6' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#00d8b6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Active Strategy</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{strategyNames[riskProfile]}</p>
                </div>
              </div>
              <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: risk.color + '20', color: risk.color, border: `1px solid ${risk.color}40`, whiteSpace: 'nowrap', marginTop: 4 }}>
                {risk.label}
              </span>
            </div>

            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 28 }}>{strategyDesc[riskProfile]}</p>

            {/* Allocation bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {ALLOC_META.map((a, i) => {
                const pct = risk[a.key];
                const amount = Math.round(Math.max(0, (f.income || 0) - (f.expenses || 0)) * pct / 100);
                return (
                  <motion.div key={a.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{a.icon} {a.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>₹{amount.toLocaleString()}</span>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 3, background: a.color === '#10b981' ? 'linear-gradient(90deg,#00d8b680,#10b981)' : a.color === '#f59e0b' ? '#f59e0b' : a.color === '#f43f5e' ? '#f43f5e' : '#3b82f6' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Tax + SIP action cards */}
          <div style={{ width: 320, flexShrink: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: 4, marginBottom: 2 }}>Investment Actions</p>

            {/* Tax Optimizer card */}
            <div style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>💸</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Tax Savings Optimizer</p>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
                ₹{totalTaxSaving.toLocaleString()} in deductions available this FY under 80C, 80CCD(1B) & 80D. Assuming 30% bracket.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {taxRows.map(row => (
                  <div key={row.section} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>§ {row.section}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>₹{row.saving.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#00d8b6', color: '#060b14', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Claim Deductions
                </button>
                <button style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Later
                </button>
              </div>
            </div>

            {/* SIP card */}
            <div style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>📅</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>SIP Wealth Planner</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>Monthly SIP (₹)</label>
                  <input type="number" value={sipAmt} min={100}
                    onChange={e => setSipAmt(Math.max(100, Number(e.target.value) || 100))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '7px 10px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>Period: <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{sipYrs} yrs</span></label>
                  <input type="range" min={1} max={30} value={sipYrs} onChange={e => setSipYrs(+e.target.value)}
                    style={{ width: '100%', accentColor: '#f59e0b' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>Invested</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>₹{(sipInvested / 100000).toFixed(1)}L</p>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>Value</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>₹{(sipFV / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
              <button style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: '#00d8b6', color: '#060b14', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Set Up SIP
              </button>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
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

      {/* ── FUND RECOMMENDATIONS ── */}
      <div style={{ background: '#111418', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#00d8b6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Curated Portfolio</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Recommended Funds</p>
          </div>
          <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Profile: {risk.label} · CAGR {Math.round(annualRate * 100)}%</span>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FUND_RECS[riskProfile].map((fund, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{fund.name}</p>
                  {fund.tag && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>{fund.tag}</span>}
                </div>
                <p style={{ fontSize: 11, color: '#475569' }}>{fund.type} · Risk: {fund.risk}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#00d8b6' }}>{fund.ret}</p>
                <p style={{ fontSize: 10, color: '#475569' }}>Expected CAGR</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div style={{ padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
          <p style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>⚠ NOT FINANCIAL ADVICE · Consult a SEBI-registered advisor before investing</p>
        </div>
      </div>
    </div>
  );
}

function FinanceRecommendations({ recommendations }) {
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

// ── Main Finance Component ───────────────────────────────────────────────────
export default function Finance() {
  const { user } = useAuth();
  const { finance, health, career, records, computed, updateDomain, addRecords, setRecords, addTimelineEvent } = useData();
  const [tab, setTab] = useState('overview');

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
    if (form.income) { updated.income = parseInt(form.income); hasUpdate = true; backendRecord.amount = parseInt(form.income); backendRecord.transactionType = 'credit'; backendRecord.category = 'Income'; addTimelineEvent({ type: 'Income Updated', text: `Logged income: ₹${updated.income}`, sentiment: 'positive', domain: 'finance' }); }
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
    { id: 'recommendations',  label: 'Robo Advisor', sym: '◉' },
    { id: 'invest',           label: 'Invest',       sym: '↑' },
  ];

  return (
    <div className="px-4 pt-2 md:px-8 md:pt-4 pb-24 lg:pb-8 bg-mesh min-h-screen">
      {/* Floating live notification */}
      <AnimatePresence>
        {notification && <LiveNotification tx={notification} onDismiss={() => { setNotification(null); clearTimeout(notifTimerRef.current); }} />}
      </AnimatePresence>

      <PageHeader title="Financial Intelligence" subtitle="AI-powered transaction parsing, live feed, and spending analytics." icon="💰" />

      {/* Tab bar — matches screenshot style */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl" style={{background:'rgba(8,14,26,0.80)', border:'1px solid rgba(255,255,255,0.06)', width:'fit-content', marginBottom:28, marginTop:20}}>
        {tabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding:'8px 18px', borderRadius:12, fontSize:13, fontWeight:600,
                display:'flex', alignItems:'center', gap:7, transition:'all 0.2s',
                background: isActive ? '#00d8b6' : 'transparent',
                color: isActive ? '#060b14' : '#64748b',
                border: 'none', cursor:'pointer',
              }}>
              <span style={{fontSize:11, fontWeight:700, opacity: isActive ? 1 : 0.7}}>{t.sym}</span>
              {t.label}
              {t.id === 'live' && liveActive && <span style={{width:6,height:6,borderRadius:'50%',background:'#10b981',display:'inline-block'}} className="animate-pulse"/>}
              {t.id === 'transactions' && allTxs.length > 0 && (
                <span style={{fontSize:9,padding:'1px 6px',borderRadius:999,background:isActive?'rgba(6,11,20,0.25)':'rgba(0,216,182,0.15)',color:isActive?'#060b14':'#00d8b6',fontWeight:700}}>{allTxs.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Hero row: single horizontal strip */}
          <div style={{display:'flex', gap:12, alignItems:'stretch', overflowX:'auto'}}>

            {/* Score ring card */}
            <div style={{background:'rgba(8,14,26,0.90)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, flexShrink:0, minWidth:160}}>
              <div style={{position:'relative', width:100, height:100}}>
                <svg viewBox="0 0 100 100" width="100" height="100">
                  {/* Dark track */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="8"/>
                  {/* Score arc */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#00d8b6" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*40} ${2*Math.PI*40}`}
                    strokeDashoffset={2*Math.PI*40*(1-score/100)}
                    style={{transform:'rotate(-90deg)', transformOrigin:'50px 50px', transition:'stroke-dashoffset 1s ease'}}/>
                </svg>
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                  <span style={{fontSize:28, fontWeight:900, color:'#fff', lineHeight:1, fontFamily:'Space Grotesk, sans-serif'}}>{score}</span>
                  <span style={{fontSize:10, color:'#475569'}}>/100</span>
                </div>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12, color:'#94a3b8', fontWeight:500, marginBottom:4}}>Finance Score</p>
                <p style={{fontSize:13, fontWeight:700, color: score>=70?'#00d8b6':score>=45?'#f59e0b':'#f43f5e'}}>
                  {score>=70?'Good':score>=45?'Moderate':'Low'}
                </p>
              </div>
            </div>

            {/* Metric cards — single row */}
            {(() => {
              const netWorth = (f.savings||0)+(f.investments||0)-(f.debt||0);
              const netSavings = Math.max(0,(f.income||0)-(f.expenses||0));
              const cards = [
                { label:'INCOME',       icon:'💼', iconBg:'#10b981', value:`₹${(f.income||0).toLocaleString()}`,      sub:'This Month',   trend:'+12% vs last month', trendUp:true  },
                { label:'EXPENSES',     icon:'🛒', iconBg:'#f43f5e', value:`₹${(f.expenses||0).toLocaleString()}`,    sub:'This Month',   trend:'+8% vs last month',  trendUp:false },
                { label:'SAVINGS',      icon:'🏦', iconBg:'#3b82f6', value:`₹${netSavings.toLocaleString()}`,          sub:'This Month',   trend:'+18% vs last month', trendUp:true  },
                { label:'INVESTMENTS',  icon:'📈', iconBg:'#8b5cf6', value:`₹${(f.investments||0).toLocaleString()}`, sub:'Total Value',  trend:'+15% vs last month', trendUp:true  },
                { label:'NET WORTH',    icon:'💎', iconBg:'#6366f1', value:`₹${netWorth.toLocaleString()}`,            sub:'Total',        trend:'+11% vs last month', trendUp:true  },
              ];
              return cards.map(c => (
                <div key={c.label} style={{background:'rgba(8,14,26,0.90)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'18px 20px', flex:1, minWidth:160, display:'flex', flexDirection:'column', gap:6}}>
                  {/* Icon + label */}
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{width:28, height:28, borderRadius:8, background:`${c.iconBg}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0}}>{c.icon}</span>
                    <span style={{fontSize:9, color:'#64748b', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace'}}>{c.label}</span>
                  </div>
                  {/* Value */}
                  <p style={{fontSize:24, fontWeight:800, color:'#f1f5f9', fontFamily:'Space Grotesk, sans-serif', lineHeight:1.1, marginTop:4}}>{c.value}</p>
                  {/* Sub-label */}
                  <p style={{fontSize:11, color:'#475569'}}>{c.sub}</p>
                  {/* Trend */}
                  <p style={{fontSize:11, color: c.trendUp?'#10b981':'#f43f5e', fontWeight:600, display:'flex', alignItems:'center', gap:3}}>
                    <span>{c.trendUp?'↑':'↑'}</span> {c.trend}
                  </p>
                </div>
              ));
            })()}

            {/* Savings Rate — accent card */}
            <div style={{background:'rgba(8,14,26,0.90)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'18px 20px', flexShrink:0, minWidth:130, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center'}}>
              <p style={{fontSize:9, color:'#64748b', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace'}}>SAVINGS RATE</p>
              <p style={{fontSize:36, fontWeight:900, color: savingsRate>=20?'#8b5cf6':savingsRate>=10?'#f59e0b':'#f43f5e', fontFamily:'Space Grotesk, sans-serif', lineHeight:1}}>{savingsRate}%</p>
              <p style={{fontSize:13, fontWeight:700, color: savingsRate>=20?'#10b981':savingsRate>=10?'#f59e0b':'#f43f5e'}}>
                {savingsRate>=20?'Good':savingsRate>=10?'Moderate':'Low'}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* ── Expense Breakdown ── */}
            <div style={{background:'rgba(8,14,26,0.90)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'22px 24px'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:20}}>
                <h3 style={{fontSize:15, fontWeight:700, color:'#f1f5f9'}}>Expense Breakdown</h3>
                <span style={{fontSize:11, color:'#475569', cursor:'help'}} title="Based on parsed transactions">ⓘ</span>
              </div>
              {(() => {
                const data = categoryTotals.length > 0 ? categoryTotals : expenseBreakdown;
                const total = data.reduce((s, d) => s + d.value, 0) || f.expenses || 1;
                return (
                  <div style={{display:'flex', alignItems:'center', gap:24}}>
                    {/* Donut */}
                    <div style={{position:'relative', flexShrink:0, width:160, height:160}}>
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" outerRadius={72} innerRadius={48} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                            {data.map((entry, i) => (
                              <Cell key={i} fill={CATEGORY_META[entry.name]?.color || COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{background:'rgba(8,14,26,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:11}}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none'}}>
                        <span style={{fontSize:16, fontWeight:800, color:'#f1f5f9', fontFamily:'Space Grotesk, sans-serif'}}>₹{total.toLocaleString()}</span>
                        <span style={{fontSize:9, color:'#475569', marginTop:2}}>Total Expenses</span>
                      </div>
                    </div>
                    {/* Category list */}
                    <div style={{flex:1, display:'flex', flexDirection:'column', gap:10}}>
                      {data.slice(0,6).map((entry, i) => {
                        const color = CATEGORY_META[entry.name]?.color || COLORS[i % COLORS.length];
                        const pct = ((entry.value / total) * 100).toFixed(1);
                        return (
                          <div key={entry.name} style={{display:'flex', alignItems:'center', gap:8}}>
                            <span style={{width:8, height:8, borderRadius:'50%', background:color, flexShrink:0}}/>
                            <span style={{fontSize:12, color:'#94a3b8', flex:1}}>{entry.name}</span>
                            <span style={{fontSize:12, fontWeight:600, color:'#f1f5f9', minWidth:72, textAlign:'right'}}>₹{entry.value.toLocaleString()}</span>
                            <span style={{fontSize:11, color:'#475569', minWidth:38, textAlign:'right'}}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <button onClick={() => setTab('transactions')}
                style={{marginTop:18, fontSize:12, color:'#8b5cf6', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4}}>
                View full breakdown →
              </button>
            </div>

            {/* ── Spending Trend ── */}
            {(() => {
              const spendVals = trendData.map(d => d.spending || 0).filter(v => v > 0);
              const maxSpend = Math.max(...spendVals, 1);
              const minSpend = Math.min(...spendVals, 0);
              const avgSpend = spendVals.length ? Math.round(spendVals.reduce((a,b)=>a+b,0)/spendVals.length) : 0;
              const maxIdx = trendData.findIndex(d => (d.spending||0) === maxSpend);
              const minIdx = trendData.findIndex(d => (d.spending||0) === minSpend && minSpend > 0);
              const maxDate = maxIdx >= 0 ? trendData[maxIdx].date?.slice(5)?.replace('-','/') : '—';
              const minDate = minIdx >= 0 ? trendData[minIdx].date?.slice(5)?.replace('-','/') : '—';
              return (
                <div style={{background:'rgba(8,14,26,0.90)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'22px 24px'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
                    <h3 style={{fontSize:15, fontWeight:700, color:'#f1f5f9'}}>Spending Trend (30 Days)</h3>
                    <span style={{fontSize:11, color:'#94a3b8', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'4px 10px', cursor:'pointer'}}>30 Days ▾</span>
                  </div>
                  <div style={{height:180}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{top:4, right:4, left:-20, bottom:0}}>
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.45}/>
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fill:'#334155',fontSize:9}} tickFormatter={v=>v?.slice(8)||''} axisLine={false} tickLine={false} interval={2}/>
                        <YAxis tick={{fill:'#334155',fontSize:9}} tickFormatter={v=>v>=1000?`₹${(v/1000).toFixed(0)}K`:`₹${v}`} axisLine={false} tickLine={false}/>
                        <Tooltip formatter={v=>`₹${Number(v).toLocaleString()}`} contentStyle={{background:'rgba(8,14,26,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:11}} labelStyle={{color:'#94a3b8'}}/>
                        <Area type="monotone" dataKey="spending" stroke="#f43f5e" strokeWidth={2.5} fill="url(#spendGrad)" dot={false} activeDot={{r:4, fill:'#f43f5e'}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Bottom stats */}
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:6}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:'#f43f5e',display:'inline-block'}}/>
                        <span style={{fontSize:10,color:'#64748b'}}>Highest Day</span>
                      </div>
                      <p style={{fontSize:18,fontWeight:800,color:'#f1f5f9',fontFamily:'Space Grotesk, sans-serif'}}>₹{maxSpend.toLocaleString()}</p>
                      <p style={{fontSize:10,color:'#475569',marginTop:2}}>{maxDate}</p>
                    </div>
                    <div style={{textAlign:'center', borderLeft:'1px solid rgba(255,255,255,0.06)', borderRight:'1px solid rgba(255,255,255,0.06)'}}>
                      <div style={{marginBottom:6}}><span style={{fontSize:10,color:'#64748b'}}>Average Daily Spend</span></div>
                      <p style={{fontSize:18,fontWeight:800,color:'#f1f5f9',fontFamily:'Space Grotesk, sans-serif'}}>₹{avgSpend.toLocaleString()}</p>
                      <p style={{fontSize:10,color:'#475569',marginTop:2}}>/day</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:6}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',display:'inline-block'}}/>
                        <span style={{fontSize:10,color:'#64748b'}}>Lowest Day</span>
                      </div>
                      <p style={{fontSize:18,fontWeight:800,color:'#f1f5f9',fontFamily:'Space Grotesk, sans-serif'}}>₹{minSpend.toLocaleString()}</p>
                      <p style={{fontSize:10,color:'#475569',marginTop:2}}>{minDate}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Financial Runway + Cashflow Forecast ── */}
          {f.income > 0 && (() => {
            const monthlyExpenses = f.expenses || 1;
            const runwayMonths = Math.round((f.savings || 0) / monthlyExpenses);
            const monthlySurplus = (f.income || 0) - (f.expenses || 0);
            const months = ['Jun','Jul','Aug','Sep','Oct','Nov'];
            const forecastData = months.map((m, i) => ({
              month: m,
              savings: Math.round((f.savings || 0) + monthlySurplus * (i + 1)),
              surplus: Math.round(monthlySurplus),
            }));
            const runwayColor = runwayMonths >= 6 ? '#10b981' : runwayMonths >= 3 ? '#f59e0b' : '#ef4444';
            return (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Runway card */}
                <GlassCard className="flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Financial Runway</h3>
                    <p className="text-[11px] text-slate-500 mb-4">Months your savings can cover expenses</p>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-4xl font-black tabular-nums" style={{ color: runwayColor, fontFamily: 'var(--font-display)' }}>
                        {runwayMonths}
                      </span>
                      <span className="text-slate-400 text-sm mb-1">months</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/[0.05] overflow-hidden mb-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (runwayMonths / 12) * 100)}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${runwayColor}80, ${runwayColor})` }} />
                    </div>
                    <p className="text-[10px]" style={{ color: runwayColor }}>
                      {runwayMonths >= 6 ? '✅ Emergency fund healthy' : runwayMonths >= 3 ? '⚠️ Build to 6+ months' : '🚨 Critical — under 3 months'}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500">Monthly Surplus</p>
                      <p className="text-base font-bold" style={{ color: monthlySurplus >= 0 ? '#10b981' : '#ef4444' }}>₹{Math.abs(monthlySurplus).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Target</p>
                      <p className="text-base font-bold text-slate-300">6–12 mo</p>
                    </div>
                  </div>
                </GlassCard>
                {/* 6-month cashflow forecast */}
                <GlassCard className="lg:col-span-2">
                  <h3 className="text-sm font-semibold mb-1">6-Month Savings Forecast</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Projected savings at current income/expense rate</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="savingsG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fill="url(#savingsG)" name="Projected Savings" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
                    <span>📈 +₹{(monthlySurplus * 6).toLocaleString()} in 6 months</span>
                    <span className="ml-auto text-slate-600">at current rate</span>
                  </div>
                </GlassCard>
              </div>
            );
          })()}

          {/* Live stats bar */}
          {allTxs.length > 0 && (
            <GlassCard glow="glow-amber" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Smart Parser Summary</h3>
                <button onClick={() => setTab('transactions')} className="text-xs text-amber-400 hover:text-amber-300">View all →</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xl font-bold text-amber-400">{allTxs.length}</p>
                  <p className="text-[10px] text-slate-500">Total Parsed</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xl font-bold text-rose-400">₹{Math.round(allTxs.filter(t => t.type !== 'Credit').reduce((s, t) => s + t.amount, 0)).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">Total Debited</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xl font-bold text-blue-400">{categoryTotals.length}</p>
                  <p className="text-[10px] text-slate-500">Categories</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xl font-bold text-emerald-400">{categoryTotals[0]?.name || '—'}</p>
                  <p className="text-[10px] text-slate-500">Top Category</p>
                </div>
              </div>
            </GlassCard>
          )}


          {/* ── Financial Anxiety Detection banner ── */}
          {(() => {
            const flags = [];
            if (savingsRate < 10)  flags.push({ label: `Low Savings Rate: ${savingsRate}%`,   color: '#f43f5e' });
            if (f.debt > f.income) flags.push({ label: 'Debt exceeds monthly income',          color: '#f97316' });
            if (burnoutRisk > 60)  flags.push({ label: `High burnout risk: ${burnoutRisk}%`,   color: '#f59e0b' });
            const flag   = flags[0] || { label: `Savings Rate: ${savingsRate}%`, color: '#00d8b6' };
            const isGood = flags.length === 0;
            const action = isGood
              ? 'Keep building your emergency fund.'
              : f.debt > 0
                ? 'Prioritise clearing high-interest debt before investing.'
                : savingsRate < 15
                  ? 'Automate savings — set up a recurring transfer on payday.'
                  : 'Review subscriptions and reduce impulse spending.';
            return (
              <div style={{
                background:'rgba(8,14,26,0.88)', border:`1px solid ${isGood?'rgba(0,216,182,0.15)':'rgba(139,92,246,0.20)'}`,
                borderRadius:16, padding:'16px 22px',
                display:'flex', alignItems:'center', gap:24,
              }}>
                <div style={{width:44, height:44, borderRadius:12, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20}}>🛡️</div>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:4}}>Financial Anxiety Detection</p>
                  <p style={{fontSize:12, fontWeight:600, color:flag.color, marginBottom:2}}>{flag.label}</p>
                  <p style={{fontSize:11, color:'#64748b'}}>{isGood ? 'Good job! Your savings rate is healthy.' : 'Detected from your current financial pattern.'}</p>
                </div>
                <div style={{width:1, alignSelf:'stretch', background:'rgba(255,255,255,0.06)', flexShrink:0}}/>
                <div style={{flex:1, minWidth:0, paddingLeft:8}}>
                  <p style={{fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em'}}>Recommended Action</p>
                  <p style={{fontSize:12, color:'#94a3b8'}}>{action}</p>
                </div>
                <button onClick={() => setTab('recommendations')}
                  style={{padding:'9px 16px', borderRadius:10, border:'1px solid rgba(139,92,246,0.35)', background:'rgba(139,92,246,0.12)', color:'#a78bfa', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0}}>
                  View Recommendations →
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SMS PARSER TAB ────────────────────────────────────────────────── */}
      {tab === 'parse' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Single SMS parser */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">🔍 Smart SMS Parser</h3>
            <p className="text-[11px] text-slate-500 mb-4">Privacy-first: all extraction runs in your browser. No data sent externally.</p>

            {/* Example paste buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SAMPLE_MESSAGES.map(s => (
                <button key={s.label} onClick={() => setSmsInput(s.msg)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
                  {s.label}
                </button>
              ))}
            </div>

            <textarea
              value={smsInput}
              onChange={e => { setSmsInput(e.target.value); setOtpDetected(false); setParseResult(null); setEditResult(null); }}
              rows={4}
              placeholder={'Paste bank SMS here…\nE.g. "Rs. 450 spent on Swiggy using HDFC Credit Card."'}
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none font-mono"
            />

            {otpDetected && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <div>
                  <p className="text-xs font-semibold text-rose-400">OTP / Sensitive message detected</p>
                  <p className="text-[10px] text-slate-400">This message contains authentication codes and will not be parsed.</p>
                </div>
              </div>
            )}

            <button onClick={handleParse}
              className="btn-primary w-full mt-4 py-3 text-base">
              Parse Transaction ⚡
            </button>

            {/* Parsed result */}
            <AnimatePresence>
              {parseResult && editResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-4">
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-3">Parsed Result — Edit if needed</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Amount (₹)', key: 'amount', type: 'number' },
                        { label: 'Merchant', key: 'merchant', type: 'text' },
                        { label: 'Bank', key: 'bank', type: 'text' },
                        { label: 'Payment Mode', key: 'paymentMode', type: 'text' },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-[10px] text-slate-400 mb-1 block">{field.label}</label>
                          <input type={field.type} value={editResult[field.key] || ''} onChange={e => setEditResult(p => ({ ...p, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                            className="input-premium w-full text-sm" />
                        </div>
                      ))}
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Category</label>
                        <select value={editResult.category} onChange={e => setEditResult(p => ({ ...p, category: e.target.value }))} className="input-premium w-full bg-[#1a1a1a] text-sm">
                          {Object.keys(CATEGORY_META).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Type</label>
                        <select value={editResult.type} onChange={e => setEditResult(p => ({ ...p, type: e.target.value }))} className="input-premium w-full bg-[#1a1a1a] text-sm">
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-lg">{CATEGORY_META[editResult.category]?.icon}</span>
                      <span className="text-sm font-semibold text-slate-200">{editResult.merchant}</span>
                      <span className="text-sm font-bold text-rose-400 ml-auto">₹{editResult.amount?.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={handleConfirmTx} className="btn-primary w-full">Add Transaction ✓</button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Bulk paste parser */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">📋 Bulk SMS Import</h3>
            <p className="text-[11px] text-slate-500 mb-4">Paste multiple SMS messages (one per line) for batch parsing.</p>

            <textarea
              value={multiInput}
              onChange={e => setMultiInput(e.target.value)}
              rows={6}
              placeholder={'Paste multiple SMS messages, one per line:\n\nRs. 450 spent on Swiggy using HDFC\nINR 320 debited from SBI for Uber ride\nRs. 649 charged to Axis for Netflix'}
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none font-mono"
            />
            <button onClick={handleBulkParse} className="btn-primary w-full mt-3">Parse All Lines</button>

            {multiResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
                {multiResults.map((r, i) => (
                  <div key={i} className={`p-2 rounded-xl text-xs border ${r.result ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                    {r.result ? (
                      <div className="flex justify-between">
                        <span className="text-slate-300">{CATEGORY_META[r.result.category]?.icon} {r.result.merchant}</span>
                        <span className="text-emerald-400 font-bold">₹{r.result.amount}</span>
                      </div>
                    ) : (
                      <span className="text-rose-400">⚠ {r.error}</span>
                    )}
                  </div>
                ))}
                <button onClick={handleBulkConfirm} className="btn-primary w-full mt-2">
                  Add {multiResults.filter(r => r.result).length} Valid Transactions ✓
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── LIVE FEED TAB ─────────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="space-y-6">
          {/* Controls */}
          <GlassCard className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">🔴 Live Transaction Simulator</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Simulates real-time payment notifications — impressive for demos!</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Speed selector */}
                <div className="flex gap-1">
                  {Object.keys(SPEED_OPTIONS).map(s => (
                    <button key={s} onClick={() => setLiveSpeed(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${liveSpeed === s ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/[0.03] border-white/[0.06] text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                {/* Toggle */}
                <button onClick={() => { setLiveActive(v => !v); if (liveActive) liveCountRef.current = 0; }}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${liveActive ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300' : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'}`}>
                  {liveActive ? '⏸ Stop' : '▶ Start'}
                </button>
              </div>
            </div>
            {liveActive && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs text-emerald-400">Live — {liveTxs.length} transactions captured · Total debited: ₹{Math.round(liveTotal).toLocaleString()}</p>
              </div>
            )}
          </GlassCard>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Transaction feed */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Incoming Transactions</h3>
              {liveTxs.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl text-xs text-slate-500">
                  <span className="text-3xl opacity-40">📡</span>
                  Press Start to begin the live simulation
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {liveTxs.map(tx => <TxCard key={tx.id} tx={tx} />)}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Live category stats */}
            <div className="space-y-4">
              <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Live Category Breakdown</h3>
              {categoryTotals.filter(c => liveTxs.some(t => t.category === c.name)).length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">Stats appear here</div>
              ) : (
                <div className="space-y-2">
                  {categoryTotals.filter(c => liveTxs.some(t => t.category === c.name)).map((cat, i) => {
                    const meta = CATEGORY_META[cat.name] || CATEGORY_META.Others;
                    const max = categoryTotals[0]?.value || 1;
                    return (
                      <motion.div key={cat.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-3 rounded-xl border ${meta.border} ${meta.bg}`}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-300 font-medium">{meta.icon} {cat.name}</span>
                          <span className={`text-xs font-bold ${meta.text}`}>₹{cat.value.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <motion.div animate={{ width: `${(cat.value / max) * 100}%` }} className="h-full rounded-full" style={{ background: meta.color }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Live bar chart */}
              {categoryTotals.filter(c => liveTxs.some(t => t.category === c.name)).length > 1 && (
                <GlassCard className="p-4">
                  <h4 className="text-xs text-slate-400 mb-3">Spending by Category</h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryTotals.filter(c => liveTxs.some(t => t.category === c.name))} barSize={20}>
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                          {categoryTotals.map((c, i) => <Cell key={i} fill={CATEGORY_META[c.name]?.color || COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ──────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="space-y-6">
          {/* Summary */}
          {allTxs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon="📋" label="Total Parsed" value={allTxs.length} color="#f59e0b" />
              <MetricCard icon="💸" label="Total Debited" value={`₹${Math.round(allTxs.filter(t => t.type !== 'Credit').reduce((s, t) => s + t.amount, 0)).toLocaleString()}`} color="#f43f5e" />
              <MetricCard icon="💚" label="Total Credited" value={`₹${Math.round(allTxs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0)).toLocaleString()}`} color="#10b981" />
              <MetricCard icon="🏆" label="Top Merchant" value={(() => { const m = {}; allTxs.forEach(t => { m[t.merchant] = (m[t.merchant] || 0) + t.amount; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'; })()} color="#8b5cf6" />
            </div>
          )}

          {/* Category bar chart */}
          {categoryTotals.length > 1 && (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold mb-4">Spending by Category</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryTotals} barSize={32}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="₹ Spent" radius={[6, 6, 0, 0]}>
                      {categoryTotals.map((c, i) => <Cell key={i} fill={CATEGORY_META[c.name]?.color || COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {/* Transaction list */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">All Transactions ({allTxs.length})</h3>
              {parsedTxs.length > 0 && (
                <button onClick={() => { saveTxs([]); showToast('Cleared manual transactions', 'success'); }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 border border-rose-500/20 px-3 py-1 rounded-lg transition-all">
                  Clear manual
                </button>
              )}
            </div>
            {allTxs.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl text-xs text-slate-500">
                <span className="text-3xl opacity-40">📋</span>
                No transactions yet — use the SMS Parser or Live Feed tab
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {allTxs.map(tx => (
                  <TxCard key={tx.id} tx={tx} onDelete={tx.source !== 'live' ? handleDeleteTx : undefined} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── LOG TAB ───────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold">Log Financial Data</h3>
            <div className="relative w-full md:w-auto">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={ocrLoading} title="Upload receipt image" />
              <button className={`w-full md:w-auto text-xs px-4 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${ocrLoading ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'}`}>
                {ocrLoading ? <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Scanning ({ocrProgress}%)...</> : <><span>📸</span> Scan Receipt (OCR)</>}
              </button>
            </div>
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 mb-1.5 block">Monthly Income</label><input type="number" value={form.income} onChange={e => setForm(p => ({ ...p, income: e.target.value }))} className="input-premium" placeholder="₹25000" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Expense Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-premium">
                <option value="food">Food & Dining</option><option value="transport">Transport</option><option value="shopping">Shopping</option>
                <option value="subscriptions">Subscriptions</option><option value="bills">Bills & Utilities</option><option value="other">Other</option>
              </select>
            </div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Amount</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="input-premium" placeholder="₹500" /></div>
            <div className="flex items-end"><button type="submit" className="btn-primary w-full">Save Entry ✓</button></div>
          </form>
        </GlassCard>
      )}

      {/* ── RECOMMENDATIONS TAB ───────────────────────────────────────────── */}
      {tab === 'recommendations' && (
        <div className="space-y-6">
          {hasFinanceData ? (
            <RoboAdvisor f={f} h={h} c={c} savingsRate={savingsRate} />
          ) : (
            <GlassCard className="border border-amber-500/20 bg-amber-500/[0.03]">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300 mb-1">Log financial data first</p>
                  <p className="text-xs text-slate-400">The portfolio advisor calculates allocations from your real income and expenses. Log them in the <button onClick={() => setTab('log')} className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">Log tab</button> to get accurate advice.</p>
                </div>
              </div>
            </GlassCard>
          )}
          <h3 className="text-sm font-semibold flex items-center gap-2"><span>💡</span> AI Spending Optimizations</h3>
          <FinanceRecommendations recommendations={recommendations} />
        </div>
      )}

      {/* ── INVEST TAB ────────────────────────────────────────────────────── */}
      {tab === 'invest' && (
        hasFinanceData ? (
          <InvestmentRoboAdvisor f={f} score={score} />
        ) : (
          <GlassCard className="text-center py-16 border border-white/[0.06]">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-[15px] font-semibold text-slate-200 mb-2">No Financial Data Yet</h3>
            <p className="text-[13px] text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
              Log your income and expenses first. The Robo-Advisor then calculates your investable surplus, risk profile, portfolio allocation, India tax savings (80C/80D), and SIP projections.
            </p>
            <button onClick={() => setTab('log')} className="btn-primary px-6 py-2.5 text-sm">
              Log Financial Data →
            </button>
          </GlassCard>
        )
      )}
    </div>
  );
}
