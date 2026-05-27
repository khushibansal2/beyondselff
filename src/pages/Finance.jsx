import { useState, useMemo, useEffect, useRef, useCallback, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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

// ── Investment Robo-Advisor ──────────────────────────────────────────────────
function RoboAdvisor({ f, savingsRate }) {
  const surplus = Math.max(0, (f.income || 0) - (f.expenses || 0));
  const hasDebt = (f.debt || 0) > 0;
  const debtRatio = f.income > 0 ? (f.debt || 0) / f.income : 0;
  const profile = (() => {
    if (savingsRate >= 30 && !hasDebt) return 'aggressive';
    if (savingsRate >= 15 && debtRatio < 0.5) return 'moderate';
    return 'conservative';
  })();
  const profiles = {
    conservative: {
      label: 'Conservative', color: '#10b981', emoji: '🛡️',
      reason: `Your savings rate is ${savingsRate}%${hasDebt ? ` and you carry debt of ₹${(f.debt || 0).toLocaleString()}` : ''}. Conservative allocation prioritizes capital protection.`,
      assets: [
        { name: 'Fixed Deposits (FD)', pct: 40, color: '#10b981', risk: 'Very Low', returns: '6–7% p.a.' },
        { name: 'Government Bonds', pct: 25, color: '#3b82f6', risk: 'Low', returns: '7–8% p.a.' },
        { name: 'Gold / SGB', pct: 15, color: '#f59e0b', risk: 'Low-Med', returns: '8–10% p.a.' },
        { name: 'Index Funds', pct: 15, color: '#8b5cf6', risk: 'Medium', returns: '10–12% p.a.' },
        { name: 'Emergency Reserve', pct: 5, color: '#f43f5e', risk: 'None', returns: 'Liquid' },
      ],
    },
    moderate: {
      label: 'Moderate', color: '#f59e0b', emoji: '⚖️',
      reason: `Savings rate of ${savingsRate}% is healthy${hasDebt ? ' with manageable debt' : ''}. Balanced allocation grows wealth while keeping risk in check.`,
      assets: [
        { name: 'Index Funds', pct: 40, color: '#8b5cf6', risk: 'Medium', returns: '10–12% p.a.' },
        { name: 'Fixed Deposits', pct: 25, color: '#10b981', risk: 'Very Low', returns: '6–7% p.a.' },
        { name: 'Government Bonds', pct: 20, color: '#3b82f6', risk: 'Low', returns: '7–8% p.a.' },
        { name: 'Gold / SGB', pct: 10, color: '#f59e0b', risk: 'Low-Med', returns: '8–10% p.a.' },
        { name: 'Emergency Reserve', pct: 5, color: '#f43f5e', risk: 'None', returns: 'Liquid' },
      ],
    },
    aggressive: {
      label: 'Aggressive', color: '#8b5cf6', emoji: '🚀',
      reason: `Excellent! Savings rate of ${savingsRate}% with no debt gives high risk capacity. Equity-heavy allocation maximises compounding.`,
      assets: [
        { name: 'Index + Mid-cap', pct: 60, color: '#8b5cf6', risk: 'High', returns: '12–15% p.a.' },
        { name: 'Government Bonds', pct: 20, color: '#3b82f6', risk: 'Low', returns: '7–8% p.a.' },
        { name: 'Gold / SGB', pct: 10, color: '#f59e0b', risk: 'Low-Med', returns: '8–10% p.a.' },
        { name: 'Fixed Deposits', pct: 5, color: '#10b981', risk: 'Very Low', returns: '6–7% p.a.' },
        { name: 'Emergency Reserve', pct: 5, color: '#f43f5e', risk: 'None', returns: 'Liquid' },
      ],
    },
  };
  const p = profiles[profile];

  return (
    <GlassCard glow="glow-purple">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{p.emoji}</span>
          <div>
            <h3 className="text-sm font-bold">Investment Robo-Advisor</h3>
            <p className="text-[10px] text-slate-500">AI-computed allocation based on your financial data</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-semibold border" style={{ color: p.color, borderColor: p.color + '40', background: p.color + '15' }}>{p.label} Profile</span>
      </div>
      <div className="mt-4 mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400 leading-relaxed">
        <span className="text-slate-300 font-medium">Why this profile? </span>{p.reason}
      </div>
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.06]">
        <div className="text-center">
          <p className="text-xs text-slate-500">Monthly Investable Surplus</p>
          <p className="text-xl font-bold text-emerald-400">₹{surplus.toLocaleString()}</p>
        </div>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <p className="text-[10px] text-slate-400 italic max-w-[160px] text-right">Allocate monthly to build long-term wealth</p>
      </div>
      <div className="space-y-3">
        {p.assets.map((a, i) => {
          const amount = Math.round(surplus * a.pct / 100);
          return (
            <motion.div key={a.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <span className="text-xs text-slate-300 font-medium truncate">{a.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 flex-shrink-0">{a.risk}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-[10px] text-slate-500">{a.returns}</span>
                  <span className="text-xs font-bold" style={{ color: a.color }}>₹{amount.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 w-8">{a.pct}%</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
                  className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${a.color}cc, ${a.color})` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 italic mt-4 text-center">⚠️ Deterministic suggestion. Consult a SEBI-registered advisor before investing.</p>
    </GlassCard>
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
    { section: '80C',      limit: '₹1,50,000', instruments: 'ELSS · PPF · NPS · LIC · NSC',     saving: Math.round(remaining80C * 0.3),   pct: Math.round((used80C / 150000) * 100) },
    { section: '80CCD(1B)',limit: '₹50,000',   instruments: 'NPS additional contribution',        saving: Math.round(50000 * 0.3),          pct: 0 },
    { section: '80D',      limit: '₹25,000',   instruments: 'Health Insurance Premium',           saving: Math.round(25000 * 0.3),          pct: 0 },
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

  return (
    <div className="space-y-6">
      {/* Risk Profile */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Your Risk Profile</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Finance Score {score} · Savings rate {savingsRate}%</p>
          </div>
          <span className="px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: `${risk.color}20`, color: risk.color, border: `1px solid ${risk.color}40` }}>
            {risk.label}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">{risk.desc}</p>
        <div className="space-y-2.5">
          {ALLOC_META.map(a => (
            <div key={a.key} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{a.icon} {a.label}</span>
                <span className="font-bold" style={{ color: a.color }}>{risk[a.key]}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${risk[a.key]}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full" style={{ background: a.color }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Tax Savings */}
      <GlassCard>
        <h3 className="text-sm font-bold mb-1">💸 India Tax Savings Optimizer</h3>
        <p className="text-[11px] text-slate-500 mb-4">Maximize deductions under Income Tax Act FY 2025-26</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {taxRows.map(row => (
            <div key={row.section} className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-300">§ {row.section}</span>
                <span className="text-[10px] text-slate-500">{row.limit}</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">{row.instruments}</p>
              <div className="h-1 rounded-full bg-white/[0.05] mb-2 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">Potential tax saved</p>
              <p className="text-lg font-black text-emerald-400">₹{row.saving.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-300 font-semibold">Total FY savings potential</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Assuming 30% tax bracket</p>
          </div>
          <p className="text-2xl font-black text-white">₹{totalTaxSaving.toLocaleString()}</p>
        </div>
      </GlassCard>

      {/* Fund Recommendations */}
      <GlassCard>
        <h3 className="text-sm font-bold mb-1">🏆 Recommended Funds</h3>
        <p className="text-[11px] text-slate-500 mb-4">Curated for your {risk.label.toLowerCase()} profile · Not financial advice</p>
        <div className="space-y-2.5">
          {FUND_RECS[riskProfile].map((fund, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all">
              <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{fund.name}</p>
                  {fund.tag && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">{fund.tag}</span>}
                </div>
                <p className="text-[10px] text-slate-500">{fund.type} · Risk: {fund.risk}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{fund.ret}</p>
                <p className="text-[10px] text-slate-400">Expected CAGR</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* SIP Calculator */}
      <GlassCard>
        <h3 className="text-sm font-bold mb-1">📅 SIP Wealth Planner</h3>
        <p className="text-[11px] text-slate-500 mb-4">Project your wealth with monthly investments at {Math.round(annualRate * 100)}% CAGR</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Monthly SIP (₹)</label>
              <input type="number" value={sipAmt} min={100} onChange={e => setSipAmt(Math.max(100, Number(e.target.value) || 100))} className="input-premium" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Period: <span className="text-white font-semibold">{sipYrs} years</span></label>
              <input type="range" min={1} max={30} value={sipYrs} onChange={e => setSipYrs(+e.target.value)} className="w-full accent-amber-500" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>1yr</span><span>30yr</span></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
              <p className="text-[11px] text-slate-400">Total Invested</p>
              <p className="text-xl font-black text-white">₹{sipInvested.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30">
              <p className="text-[11px] text-slate-400">Estimated Value</p>
              <p className="text-2xl font-black text-emerald-400">₹{sipFV.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Gains: ₹{(sipFV - sipInvested).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </GlassCard>
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
  const { finance, records, computed, updateDomain, addRecords, addTimelineEvent } = useData();
  const [tab, setTab] = useState('overview');

  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const score = computed?.financeScore?.score || 0;
  const financeRecords = records?.finance || [];
  const hasFinanceData = f.income > 0 || f.expenses > 0 || f.savings > 0;

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

  const handleConfirmTx = () => {
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
  const handleLog = (e) => {
    e.preventDefault();
    const updated = { ...f };
    let hasUpdate = false;
    if (form.income) { updated.income = parseInt(form.income); hasUpdate = true; addTimelineEvent({ type: 'Income Updated', text: `Logged income: ₹${updated.income}`, sentiment: 'positive', domain: 'finance' }); }
    if (form.amount) {
      const amount = parseInt(form.amount);
      updated.expenses = (updated.expenses || 0) + amount;
      updated.categoryTotals = { ...(updated.categoryTotals || {}) };
      updated.categoryTotals[form.category] = (updated.categoryTotals[form.category] || 0) + amount;
      hasUpdate = true;
      addRecords('finance', [{ date: new Date().toISOString(), amount, category: form.category }]);
      addTimelineEvent({ type: 'Expense Logged', text: `Spent ₹${amount} on ${form.category}`, sentiment: 'neutral', domain: 'finance' });
    }
    if (hasUpdate) { updateDomain('finance', updated); setForm({ income: '', expense: '', category: 'food', amount: '' }); showToast('Financial data updated', 'success'); }
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

  const recommendations = [
    { id: 'fin-spending', icon: '💳', title: 'Spending Optimization', text: savingsRate < 20 ? `Savings rate: ${savingsRate}%. Cut ₹${Math.round(f.expenses * 0.2)} in non-essentials. Start with subscriptions (₹${f.subscriptions}).` : `Great savings rate of ${savingsRate}%! Invest the surplus for compound growth.`, confidence: Math.max(70, 100 - Math.abs(20 - savingsRate) * 2), risk: savingsRate < 10 ? 'high' : 'low' },
    { id: 'fin-investment', icon: '📈', title: 'Investment Allocation', text: f.investments === 0 ? 'Start investing! 60% index funds, 20% bonds, 20% emergency fund. Even ₹1000/month grows significantly.' : `₹${f.investments} invested. Diversify: ${savingsRate > 30 ? '60% equity, 20% debt, 20% gold' : '40% equity, 40% debt, 20% gold'}.`, confidence: f.investments > 0 ? 85 : 75, risk: 'medium' },
    { id: 'fin-emergency', icon: '🛡️', title: 'Emergency Fund', text: f.savings < f.expenses * 3 ? `Emergency fund covers ${(f.savings / Math.max(1, f.expenses)).toFixed(1)} months. Build to 3–6 months.` : 'Emergency fund solid. Move surplus to investments.', confidence: f.savings < f.expenses * 3 ? 95 : 88, risk: f.savings < f.expenses ? 'high' : 'low' },
    { id: 'fin-subscriptions', icon: '🔄', title: 'Subscription Audit', text: f.subscriptions > f.income * 0.1 ? `Subscriptions (₹${f.subscriptions}) = ${Math.round(f.subscriptions / Math.max(1, f.income) * 100)}% of income. Cancel one unused service → save ₹${Math.round(f.subscriptions * 0.3)}/month.` : 'Subscription spending is reasonable.', confidence: f.subscriptions > f.income * 0.1 ? 92 : 80, risk: f.subscriptions > f.income * 0.15 ? 'high' : 'low' },
    ...(emotionalSpending ? [{ id: 'fin-emotional', icon: '😰', title: 'Emotional Spending Alert', text: `High stress level correlates with impulse purchases. Use 24-hour wait rule before purchases > ₹500.`, confidence: 85, risk: 'high' }] : []),
    ...(allTxs.length >= 5 ? [{ id: 'fin-parser', icon: '🤖', title: 'Smart Parser Insights', text: `${allTxs.length} parsed transactions detected. ${categoryTotals[0] ? `Highest spend: ${categoryTotals[0].name} ₹${categoryTotals[0].value.toLocaleString()}. ` : ''}Use What-If Simulator to see savings potential.`, confidence: 88, risk: 'low' }] : []),
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-xs"><p className="text-slate-400 mb-1">{label}</p>{payload.map(p => <p key={p.name} style={{ color: p.color || '#fff' }}>{p.name}: ₹{(p.value || 0).toFixed?.(0)}</p>)}</div>;
  };

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: '📊' },
    { id: 'parse', label: 'SMS Parser', icon: '🔍' },
    { id: 'live', label: 'Live Feed', icon: '🔴' },
    { id: 'transactions', label: 'Transactions', icon: '📋' },
    { id: 'log', label: 'Log', icon: '✏️' },
    { id: 'recommendations', label: 'AI Advisor', icon: '🤖' },
    { id: 'invest',          label: 'Invest',     icon: '📊' },
  ];

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      {/* Floating live notification */}
      <AnimatePresence>
        {notification && <LiveNotification tx={notification} onDismiss={() => { setNotification(null); clearTimeout(notifTimerRef.current); }} />}
      </AnimatePresence>

      <PageHeader title="Financial Intelligence" subtitle="AI-powered transaction parsing, live feed, and spending analytics." icon="💰" />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-gradient-to-r from-amber-600/80 to-orange-500/80 text-white shadow-lg' : 'bg-[#252525]/80 text-[#9B9B9B] hover:bg-white/5'}`}>
            <span className="mr-1.5">{t.icon}</span>{t.label}
            {t.id === 'live' && liveActive && <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />}
            {t.id === 'transactions' && allTxs.length > 0 && <span className="ml-1.5 text-[10px] px-1.5 rounded-full bg-amber-500/30 text-amber-300">{allTxs.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1" glow="glow-amber">
              <ScoreRing score={score} color="auto" label="Finance Score" size={100} />
            </GlassCard>
            <MetricCard icon="💵" label="Income" value={`₹${f.income.toLocaleString()}`} color="#10b981" />
            <MetricCard icon="💸" label="Expenses" value={`₹${f.expenses.toLocaleString()}`} color="#f43f5e" />
            <MetricCard icon="🏦" label="Savings" value={`₹${f.savings.toLocaleString()}`} color="#3b82f6" />
            <MetricCard icon="📈" label="Investments" value={`₹${f.investments.toLocaleString()}`} color="#8b5cf6" />
            <MetricCard icon="🔄" label="Subscriptions" value={`₹${f.subscriptions.toLocaleString()}`} color="#f59e0b" />
            <MetricCard icon="💎" label="Net Worth" value={`₹${((f.savings || 0) + (f.investments || 0) - (f.debt || 0)).toLocaleString()}`} color={(f.savings + f.investments - f.debt) >= 0 ? '#10b981' : '#ef4444'} />
            <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Savings Rate</p>
              <p className="text-[24px] font-bold" style={{ color: savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }}>{savingsRate}%</p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }}>{savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Moderate' : 'Low'}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
              {f.expenses === 0 && categoryTotals.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center gap-3 text-center">
                  <span className="text-4xl opacity-30">📊</span>
                  <p className="text-[13px] text-slate-400">No expenses yet — parse some SMS messages!</p>
                  <button onClick={() => setTab('parse')} className="text-[12px] px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">Open SMS Parser →</button>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryTotals.length > 0 ? categoryTotals : expenseBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value" paddingAngle={2}>
                        {(categoryTotals.length > 0 ? categoryTotals : expenseBreakdown).map((entry, i) => (
                          <Cell key={i} fill={CATEGORY_META[entry.name]?.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend formatter={v => <span className="text-xs text-slate-400">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Spending Trend {financeRecords.length >= 2 ? `(${Math.min(financeRecords.length, 30)} entries)` : '(demo)'}</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="spendG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="spending" stroke="#f43f5e" fill="url(#spendG)" strokeWidth={2} name="Spending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
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

          {(f.debt > 0 || savingsRate < 5 || emotionalSpending) && (
            <GlassCard glow="glow-rose">
              <h3 className="text-sm font-semibold mb-3">🚨 Financial Anxiety Detection</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {f.debt > 0 && <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs"><p className="font-medium text-red-400">Debt: ₹{f.debt.toLocaleString()}</p><p className="text-slate-400 mt-1">Allocate 20% of income to clearing debt first.</p></div>}
                {savingsRate < 5 && <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs"><p className="font-medium text-amber-400">Low Savings Rate: {savingsRate}%</p><p className="text-slate-400 mt-1">Aim for 20% minimum. Start with small automated transfers.</p></div>}
                {emotionalSpending && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs"><p className="font-medium text-purple-400">Emotional Spending Risk</p><p className="text-slate-400 mt-1">High stress linked to impulse purchases. Use 24-hour wait rule.</p></div>}
              </div>
            </GlassCard>
          )}
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
            <RoboAdvisor f={f} savingsRate={savingsRate} />
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
