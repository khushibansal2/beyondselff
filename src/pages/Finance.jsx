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
import { Activity, FileText, TrendingUp, TrendingDown, Sparkles, Pause, Play, Award, Coins, Search, Info, ChevronDown, Clipboard, CreditCard, Wallet, ArrowLeftRight, ChevronLeft, ChevronRight, Calendar, Filter, MoreVertical, Trash2, Download, Plus } from 'lucide-react';
import {
  parseTransactionSMS, detectOTP, CATEGORY_META, SAMPLE_MESSAGES, MERCHANT_MAP,
} from '../services/transactionParserService';
import { generateMockTransaction, SPEED_OPTIONS } from '../services/mockTransactionService';
import { chatWithAI } from '../services/aiService';

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#84cc16'];

const TX_LS_KEY = 'finance_parsed_transactions';

const DEFAULT_MOCK_TRANSACTIONS = [
  { id: 't1', merchant: 'Amazon.in', category: 'Shopping', type: 'Debit', amount: 2499.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-29T10:42:00Z', ref: 'Order #403-5982748-1234567' },
  { id: 't2', merchant: 'Salary Credit', category: 'Income', type: 'Credit', amount: 72400.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-29T09:15:00Z', ref: 'Acme Corporation Pvt. Ltd.' },
  { id: 't3', merchant: 'Swiggy', category: 'Food', type: 'Debit', amount: 480.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-28T20:22:00Z', ref: 'Order #SWI9283746' },
  { id: 't4', merchant: 'Uber', category: 'Transport', type: 'Debit', amount: 215.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-28T16:50:00Z', ref: 'Ride to Koramangala' },
  { id: 't5', merchant: 'Zomato', category: 'Food', type: 'Debit', amount: 362.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-27T11:03:00Z', ref: 'Order #ZOM556738' },
  { id: 't6', merchant: 'Netflix', category: 'Entertainment', type: 'Debit', amount: 649.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-26T19:45:00Z', ref: 'Monthly Subscription' },
  { id: 't7', merchant: 'PhonePe Transfer', category: 'Transfer', type: 'Transfer', amount: 1000.00, bank: 'PhonePe', mask: 'UPI', parsedAt: '2025-05-26T14:30:00Z', ref: 'To: Rahul Sharma' },
  { id: 't8', merchant: 'BigBasket', category: 'Groceries', type: 'Debit', amount: 1089.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-25T17:15:00Z', ref: 'Order #BB123456789' },
  { id: 't9', merchant: 'Rent Payment', category: 'Bills', type: 'Debit', amount: 18500.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-24T09:15:00Z', ref: 'Rent for May' },
  { id: 't10', merchant: 'Electricity Bill', category: 'Bills', type: 'Debit', amount: 3500.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-23T18:30:00Z', ref: 'State Electricity Board' },
  { id: 't11', merchant: 'Amazon.in', category: 'Shopping', type: 'Debit', amount: 3000.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-22T11:45:00Z', ref: 'Order #403-9182736-2345678' },
  { id: 't12', merchant: 'Zomato', category: 'Food', type: 'Debit', amount: 850.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-21T20:30:00Z', ref: 'Order #ZOM887712' },
  { id: 't13', merchant: 'Uber', category: 'Transport', type: 'Debit', amount: 450.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-20T14:15:00Z', ref: 'Ride to Office' },
  { id: 't14', merchant: 'Reliance Digital', category: 'Shopping', type: 'Debit', amount: 2200.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-19T16:50:00Z', ref: 'Electronics Purchase' },
  { id: 't15', merchant: 'BookMyShow', category: 'Entertainment', type: 'Debit', amount: 980.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-18T21:10:00Z', ref: 'Movie Tickets' },
  { id: 't16', merchant: 'Airtel Bill', category: 'Bills', type: 'Debit', amount: 799.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-17T10:00:00Z', ref: 'Broadband Payment' },
  { id: 't17', merchant: 'Swiggy', category: 'Food', type: 'Debit', amount: 620.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-16T13:20:00Z', ref: 'Order #SWI228833' },
  { id: 't18', merchant: 'Starbucks', category: 'Food', type: 'Debit', amount: 350.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-15T08:45:00Z', ref: 'Morning Coffee' },
  { id: 't19', merchant: 'Decathlon', category: 'Shopping', type: 'Debit', amount: 1500.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-14T19:30:00Z', ref: 'Sports Equipment' },
  { id: 't20', merchant: 'Fuel Pump', category: 'Transport', type: 'Debit', amount: 1500.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-13T11:15:00Z', ref: 'Petrol Fill' },
  { id: 't21', merchant: 'MilkBasket', category: 'Groceries', type: 'Debit', amount: 1000.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-12T17:40:00Z', ref: 'Daily Essentials' },
  { id: 't22', merchant: 'Grocery Store', category: 'Groceries', type: 'Debit', amount: 717.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-11T09:30:00Z', ref: 'Supermarket Store' },
  { id: 't23', merchant: 'Amazon.in', category: 'Shopping', type: 'Debit', amount: 2000.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-10T18:15:00Z', ref: 'Order #403-1122334-5566778' },
  { id: 't24', merchant: 'Uber', category: 'Transport', type: 'Debit', amount: 320.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-09T14:00:00Z', ref: 'Ride back home' },
  { id: 't25', merchant: 'Swiggy', category: 'Food', type: 'Debit', amount: 450.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-08T20:00:00Z', ref: 'Order #SWI443322' },
  { id: 't26', merchant: 'Pharmacy', category: 'Health', type: 'Debit', amount: 650.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-07T11:30:00Z', ref: 'Medical Prescription' },
  { id: 't27', merchant: 'Cafe Coffee Day', category: 'Food', type: 'Debit', amount: 280.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-06T15:45:00Z', ref: 'Afternoon Snacks' },
  { id: 't28', merchant: 'Metro Card Recharge', category: 'Transport', type: 'Debit', amount: 500.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-05T10:15:00Z', ref: 'Smart Card Topup' },
  { id: 't29', merchant: 'Spotify', category: 'Entertainment', type: 'Debit', amount: 119.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-04T19:00:00Z', ref: 'Premium Monthly' },
  { id: 't30', merchant: 'Reliance Smart', category: 'Groceries', type: 'Debit', amount: 880.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-03T12:30:00Z', ref: 'Weekly Groceries' },
  { id: 't31', merchant: 'Coursera', category: 'Education', type: 'Debit', amount: 1000.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-02T09:00:00Z', ref: 'AI Course Certification' },
  { id: 't32', merchant: 'Local Bakery', category: 'Food', type: 'Debit', amount: 301.00, bank: 'HDFC Bank', mask: '•••• 4321', parsedAt: '2025-05-01T17:00:00Z', ref: 'Pastries and Bread' }
];

function loadTxsLocal() {
  try {
    const local = localStorage.getItem(TX_LS_KEY);
    if (!local || local === '[]') {
      localStorage.setItem(TX_LS_KEY, JSON.stringify(DEFAULT_MOCK_TRANSACTIONS));
      return DEFAULT_MOCK_TRANSACTIONS;
    }
    return JSON.parse(local);
  } catch {
    return DEFAULT_MOCK_TRANSACTIONS;
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
  const syncMin = score > 0 ? 'Live' : 'Not synced';

  return (
    <div style={{ background: '#12141a', border: '1px solid #20222a', borderRadius: 16, overflow: 'hidden', fontFamily: 'var(--font-primary)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* ── LEFT PANEL ── */}
      <div style={{ flex: 1, padding: '32px 32px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Active Strategy</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{p.label}</p>
            </div>
          </div>
          <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: p.riskColor + '20', color: p.riskColor, border: `1px solid ${p.riskColor}40`, whiteSpace: 'nowrap', marginTop: 4 }}>
            {p.riskLabel}
          </span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</p>

        {/* AI Analysis */}
        {aiAnalysis ? (
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Analysis</p>
            <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</p>
            <button onClick={() => setAiAnalysis(null)} style={{ marginTop: 8, fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Dismiss</button>
          </div>
        ) : (
          <button
            onClick={handleGetAIAnalysis}
            disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          >
            {aiLoading ? '⏳ Analyzing…' : '✨ Get AI Analysis'}
          </button>
        )}

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
          <span>DATA: {score > 0 ? 'LIVE' : 'DEMO MODE'}</span>
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
      className={`flex items-center gap-3 p-3 rounded-xl border ${meta.border} ${meta.bg} group`}>
      <span className="text-xl shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-200 truncate">{tx.merchant}</p>
          {tx.source === 'live' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">LIVE</span>}
        </div>
        <p className="text-[10px] text-slate-500 truncate">{tx.category}{tx.bank ? ` · ${tx.bank}` : ''}{tx.paymentMode ? ` · ${tx.paymentMode}` : tx.source ? ` · ${tx.source}` : ''}</p>
      </div>
      <div className="text-right shrink-0 min-w-[90px]">
        <p className={`text-sm font-bold ${tx.type === 'Credit' ? 'text-emerald-400' : meta.text}`}>
          {tx.type === 'Credit' ? '+' : '−'}₹{tx.amount.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-500">{new Date(tx.parsedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(tx.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-xs transition-all shrink-0">×</button>
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
          <span className="text-2xl shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-semibold text-slate-100 truncate">{tx.merchant}</p>
            <p className="text-[10px] text-slate-400 truncate">{tx.category} · {tx.bank}</p>
          </div>
          <p className={`text-lg font-bold shrink-0 min-w-[70px] text-right ${meta.text}`}>₹{tx.amount.toLocaleString()}</p>
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

function InvestmentRoboAdvisor({ f, score, financeRecords = [], onNavigate }) {
  const dispIncome = f.income || 0;
  const dispExpenses = f.expenses || 0;
  const dispSavings = f.savings || 0;
  const dispInvestments = f.investments || 0;
  const dispSubscriptions = f.subscriptions || 0;
  const dispScore = score || 0;
  const dispDebt = f.debt || 0;
  const dispNetWorth = (f.savings || 0) + (f.investments || 0) - (f.debt || 0);

  const savingsRate = dispIncome > 0 ? Math.round(((dispIncome - dispExpenses) / dispIncome) * 100) : 0;
  const riskProfile = dispScore >= 70 && savingsRate >= 25 ? 'aggressive'
    : dispScore >= 50 && savingsRate >= 15 ? 'moderate' : 'conservative';
  
  const [overrideProfile, setOverrideProfile] = useState(null);
  const activeProfile = overrideProfile || riskProfile;
  const risk = RISK_META[activeProfile];

  // Recalculate allocation values based on the active risk profile
  const totalInvestments = dispInvestments;
  const pieData = [
    { name: 'Equity', value: Math.round(totalInvestments * (risk.equity / 100)), pct: risk.equity, color: '#3b82f6' },
    { name: 'Debt / Bonds', value: Math.round(totalInvestments * (risk.debt / 100)), pct: risk.debt, color: '#6366f1' },
    { name: 'Gold', value: Math.round(totalInvestments * (risk.gold / 100)), pct: risk.gold, color: '#f59e0b' },
    { name: 'Liquid', value: Math.round(totalInvestments * (risk.cash / 100)), pct: risk.cash, color: '#10b981' },
  ];

  const annualInvestment = dispInvestments * 12;
  const used80C = Math.min(150000, annualInvestment * 0.6);
  const remaining80C = Math.max(0, 150000 - used80C);

  const taxRows = f.income > 0 ? [
    { section: '80C',       saving: Math.round(remaining80C * 0.3) },
    { section: '80CCD(1B)', saving: Math.round(50000 * 0.3) },
    { section: '80D',       saving: Math.round(25000 * 0.3) },
  ] : [
    { section: '80C',       saving: 45000 },
    { section: '80CCD(1B)', saving: 15000 },
    { section: '80D',       saving: 7500 },
  ];
  const totalTaxSaving = taxRows.reduce((s, r) => s + r.saving, 0);

  const [sipAmt, setSipAmt] = useState(() => Math.max(500, Math.round((f.income || 0) * 0.1 / 500) * 500) || 500);
  const [sipYrs, setSipYrs] = useState(10);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGetAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const ctx = {
        domain: 'finance',
        finance: { income: dispIncome, expenses: dispExpenses, savings: dispSavings, investments: dispInvestments, debt: dispDebt, subscriptions: dispSubscriptions, savingsRate, netWorth: dispNetWorth },
        financeScore: dispScore,
        riskProfile: activeProfile,
      };
      const prompt = `Give me a concise 3-point AI financial analysis and 2 specific action items based on my profile: income ₹${dispIncome.toLocaleString()}/month, expenses ₹${dispExpenses.toLocaleString()}, savings ₹${dispSavings.toLocaleString()}, investments ₹${dispInvestments.toLocaleString()}, debt ₹${dispDebt.toLocaleString()}, ${activeProfile} risk profile, savings rate ${savingsRate}%. Be specific with numbers.`;
      const { response } = await chatWithAI(prompt, ctx, []);
      setAiAnalysis(response);
    } catch {
      setAiAnalysis('Unable to get AI analysis right now. Check your API key in Settings or try again.');
    } finally {
      setAiLoading(false);
    }
  };
  const annualRate = activeProfile === 'aggressive' ? 0.13 : activeProfile === 'moderate' ? 0.11 : 0.09;
  const mr = annualRate / 12;
  const months = sipYrs * 12;
  const sipFV = Math.round(sipAmt * ((Math.pow(1 + mr, months) - 1) / mr));
  const sipInvested = sipAmt * months;

  const sessionId = `#IX-${Math.abs(((dispIncome) * 3 + (dispScore)) % 9000 + 1000)}`;
  const syncMin = useMemo(() => {
    if (financeRecords.length === 0) return null;
    const last = financeRecords[financeRecords.length - 1];
    const diff = Math.floor((Date.now() - new Date(last.date || Date.now())) / 60000);
    return diff < 1 ? 'just now' : diff < 60 ? `${diff}m ago` : `${Math.floor(diff/60)}h ago`;
  }, [financeRecords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: 'var(--font-primary)' }}>
      
      {/* ── ROW 1: Portfolio Allocation & Metrics Grid Stack ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-stretch">
        
        {/* Left: Portfolio Allocation Card (lg:col-span-4) */}
        <div 
          style={{ 
            background: '#12141a', 
            border: '1px solid #20222a', 
            borderRadius: '16px', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            boxSizing: 'border-box'
          }}
          className="lg:col-span-4"
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>Portfolio Allocation</span>
              <Info size={14} style={{ color: '#565a64', cursor: 'pointer', marginLeft: '6px' }} />
            </div>
            {/* Moderate risk pill badge */}
            <button 
              onClick={() => {
                const nextProf = activeProfile === 'conservative' ? 'moderate' : activeProfile === 'moderate' ? 'aggressive' : 'conservative';
                setOverrideProfile(nextProf);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
            >
              {activeProfile}
            </button>
          </div>

          {/* Doughnut Chart & Legend Container */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', height: '100%' }}>
            {/* Chart */}
            <div style={{ width: '140px', height: '140px', position: 'relative', flexShrink: 0, margin: '0 auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={3} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Total Value */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                width: '100%'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                  ₹{totalInvestments.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '8px', color: '#8e929b', marginTop: '1px' }}>
                  Total Value
                </div>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px', width: '100%' }}>
              {pieData.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                    <span style={{ color: '#8e929b', fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#565a64', fontSize: '11px' }}>{item.pct}%</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Metrics Stack (lg:col-span-6) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }} className="lg:col-span-6">
          {/* 3x2 Grid of 6 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(() => {
              // Compute real trends from financeRecords (last 30 vs previous 30 days)
              const now = Date.now();
              const DAY = 86400000;
              const recent = financeRecords.filter(r => (now - new Date(r.date).getTime()) < 30 * DAY);
              const older  = financeRecords.filter(r => { const a = now - new Date(r.date).getTime(); return a >= 30 * DAY && a < 60 * DAY; });
              const sumDebits = (arr) => arr.filter(r => (r.transactionType || r.type || 'debit').toLowerCase() !== 'credit').reduce((s, r) => s + (r.amount || 0), 0);
              const sumCredits = (arr) => arr.filter(r => (r.transactionType || r.type || 'debit').toLowerCase() === 'credit').reduce((s, r) => s + (r.amount || 0), 0);
              const pctChange = (curr, prev) => {
                if (!prev) return null;
                const d = Math.round(((curr - prev) / prev) * 100);
                return d === 0 ? '→ Unchanged' : `${d > 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last 30d`;
              };
              const recentExp = sumDebits(recent); const olderExp = sumDebits(older);
              const recentInc = sumCredits(recent); const olderInc = sumCredits(older);
              const recentSav = recentInc - recentExp; const olderSav = olderInc - olderExp;
              const expTrend = pctChange(recentExp, olderExp) || (financeRecords.length ? `${financeRecords.filter(r=>(r.transactionType||'debit').toLowerCase()!=='credit').length} debit records` : 'No records yet');
              const incTrend = pctChange(recentInc, olderInc) || (dispIncome > 0 ? `₹${dispIncome.toLocaleString()} total` : 'No records yet');
              const savTrend = olderSav !== 0 ? pctChange(recentSav, Math.abs(olderSav)) : (dispSavings > 0 ? `₹${dispSavings.toLocaleString()} saved` : 'Log income to track');
              return [
              {
                title: 'Income',
                val: dispIncome,
                sub: 'This month',
                trend: incTrend,
                isGreen: true,
                icon: <Wallet size={16} />,
                bg: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981'
              },
              {
                title: 'Expenses',
                val: dispExpenses,
                sub: 'This month',
                trend: expTrend,
                isGreen: recentExp <= olderExp,
                icon: <CreditCard size={16} />,
                bg: 'rgba(244, 63, 94, 0.1)',
                color: '#f43f5e'
              },
              {
                title: 'Net Savings',
                val: dispSavings,
                sub: 'This month',
                trend: savTrend,
                isGreen: recentSav >= olderSav,
                icon: <Coins size={16} />,
                bg: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981'
              },
              {
                title: 'Investments',
                val: dispInvestments,
                sub: 'Total value',
                trend: dispInvestments > 0 ? `₹${dispInvestments.toLocaleString()} tracked` : 'Set in Log → Profile',
                isGreen: true,
                icon: <TrendingUp size={16} />,
                bg: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6'
              },
              {
                title: 'Subscriptions',
                val: dispSubscriptions,
                sub: 'Monthly',
                trend: dispSubscriptions > 0 ? `₹${dispSubscriptions.toLocaleString()}/month` : 'Set in Log → Profile',
                isText: true,
                icon: <Clipboard size={16} />,
                bg: 'rgba(139, 92, 246, 0.1)',
                color: '#8b5cf6'
              },
              {
                title: 'Net Worth',
                val: dispNetWorth,
                sub: 'Total value',
                trend: dispNetWorth > 0 ? `Assets – Liabilities` : 'Add investments & debt',
                isGreen: dispNetWorth >= 0,
                icon: <Award size={16} />,
                bg: 'rgba(139, 92, 246, 0.1)',
                color: '#8b5cf6'
              }
            ]})().map((card, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: '#12141a', 
                  border: '1px solid #20222a', 
                  borderRadius: '12px', 
                  padding: '14px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  background: card.bg, 
                  color: card.color, 
                  flexShrink: 0 
                }}>
                  {card.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#8e929b', fontWeight: 500 }}>{card.title}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    ₹{card.val.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '9px', color: '#565a64', marginTop: '1px' }}>{card.sub}</div>
                  <div style={{ 
                    fontSize: '9.5px', 
                    color: card.isText ? '#8e929b' : card.isGreen ? '#10b981' : '#f43f5e', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '2px', 
                    marginTop: '4px' 
                  }}>
                    {card.isText ? card.trend : (
                      <>
                        <span>{card.trend.split(' ')[0]} {card.trend.split(' ')[1]}</span>
                        <span style={{ color: '#565a64', fontWeight: 400 }}>{card.trend.split(' ').slice(2).join(' ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Savings Rate Card */}
          <div 
            style={{ 
              background: '#12141a', 
              border: '1px solid #20222a', 
              borderRadius: '12px', 
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                background: 'rgba(139, 92, 246, 0.15)', 
                color: '#8b5cf6', 
                fontSize: '15px', 
                fontWeight: 'bold' 
              }}>
                %
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#8e929b', fontWeight: 500 }}>Savings Rate</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{Math.max(0, savingsRate)}%</span>
                  <span style={{ fontSize: '9px', color: '#565a64' }}>of income</span>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '10px', color: '#8e929b', textAlign: 'left' }}>
                Aim for 20% to build strong financial health.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '6px', background: '#050608', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', borderRadius: '3px', transition: 'width 1s ease' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#8e929b', fontWeight: 600 }}>Target 20%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── ROW 2: Recommended Funds & Sidebar Column Stack ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-stretch">
        
        {/* Left: Recommended Funds Card (lg:col-span-6) */}
        <div 
          style={{ 
            background: '#12141a', 
            border: '1px solid #20222a', 
            borderRadius: '16px', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            boxSizing: 'border-box'
          }}
          className="lg:col-span-6"
        >
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyStyle: 'stretch', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>Recommended Funds</span>
                <span style={{ fontSize: '11px', color: '#8e929b' }}>
                  Profile: {activeProfile === 'conservative' ? 'Conservative' : activeProfile === 'moderate' ? 'Moderate' : 'Aggressive'} • CAGR {activeProfile === 'aggressive' ? '14%' : activeProfile === 'moderate' ? '11%' : '8%'}
                </span>
              </div>
              <button 
                onClick={() => showToast('Redirecting to investment marketplace...', 'info')}
                style={{ fontSize: '12px', fontWeight: 600, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all
              </button>
            </div>

            {/* Fund List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FUND_RECS[activeProfile].map((fund, idx) => {
                // Colored circles for icons matching mockup
                const icons = [
                  { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', icon: <Coins size={14} /> },
                  { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: <Award size={14} /> },
                  { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', icon: <FileText size={14} /> },
                  { bg: 'rgba(169, 85, 247, 0.15)', color: '#a855f7', icon: <TrendingUp size={14} /> }
                ];
                const meta = icons[idx % icons.length];

                return (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.005 }}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                    onClick={() => showToast(`Simulating details for ${fund.name}`, 'info')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: meta.bg, 
                        color: meta.color, 
                        flexShrink: 0 
                      }}>
                        {meta.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{fund.name}</span>
                          {fund.tag && (
                            <span style={{ 
                              fontSize: '8px', 
                              fontWeight: 700, 
                              color: '#10b981', 
                              background: 'rgba(16, 185, 129, 0.12)', 
                              border: '1px solid rgba(16, 185, 129, 0.2)', 
                              padding: '1.5px 5px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {fund.tag}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#565a64', marginTop: '2px' }}>
                          {fund.type} • Risk: {fund.risk}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>{fund.ret}</div>
                        <div style={{ fontSize: '9px', color: '#565a64', marginTop: '1px' }}>Expected CAGR</div>
                      </div>
                      <span style={{ color: '#565a64', fontSize: '14px' }}>›</span>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer Centered Link */}
          <div 
            onClick={() => showToast('Redirecting to investment marketplace...', 'info')}
            style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#8b5cf6', 
              textAlign: 'center', 
              cursor: 'pointer', 
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>View all recommended funds</span>
            <span>→</span>
          </div>

        </div>

        {/* Right: Sidebar Stack (lg:col-span-4) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="lg:col-span-4">
          
          {/* Tax Savings Optimizer Card */}
          <div 
            style={{ 
              background: '#12141a', 
              border: '1px solid #20222a', 
              borderRadius: '16px', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '28px', 
                height: '28px', 
                borderRadius: '6px', 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10b981' 
              }}>
                <FileText size={14} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>Tax Savings Optimizer</span>
            </div>

            <div style={{ fontSize: '11px', color: '#8e929b', lineHeight: 1.4 }}>
              ₹67,500 in deductions available this FY under 80C, 80CCD(1B) & 80D.
            </div>

            {/* List breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {[
                { section: '80C', val: '₹45,000' },
                { section: '80CCD(1B)', val: '₹15,000' },
                { section: '80D', val: '₹7,500' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8e929b' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>✓</span>
                    <span>{item.section}</span>
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{item.val}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                onClick={() => { onNavigate?.('log'); showToast('Opening Finance Log — add your deduction entries there', 'success'); }}
                style={{ 
                  flex: 1, 
                  padding: '9px', 
                  background: '#6366f1', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  textAlign: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
              >
                Claim Deductions
              </button>
              <button 
                onClick={() => showToast('Deductions saved for later review', 'info')}
                style={{ 
                  padding: '9px 16px', 
                  background: 'transparent', 
                  color: '#8e929b', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 500, 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Later
              </button>
            </div>

          </div>

          {/* SIP Wealth Planner Card */}
          <div 
            style={{ 
              background: '#12141a', 
              border: '1px solid #20222a', 
              borderRadius: '16px', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '6px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: '#ffffff' 
                }}>
                  <Calendar size={14} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>SIP Wealth Planner</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                <span>₹500</span>
                <span 
                  onClick={() => {
                    const amt = prompt('Enter custom monthly SIP amount (₹):', sipAmt);
                    if (amt && !isNaN(amt)) setSipAmt(Math.max(100, Number(amt)));
                  }}
                  style={{ color: '#565a64', fontSize: '11px', cursor: 'pointer' }}
                  title="Edit amount"
                >
                  ✎
                </span>
              </div>
            </div>

            {/* Slider control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e929b' }}>
                <span>Investment Period</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{sipYrs} Years</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={30} 
                value={sipYrs} 
                onChange={e => setSipYrs(+e.target.value)}
                style={{ width: '100%', accentColor: '#8b5cf6', height: '4px', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
              />
            </div>

            {/* Sleek Line/Area chart projection with dot indicators */}
            <div style={{ height: '70px', width: '100%', marginTop: '6px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={Array.from({ length: sipYrs + 1 }, (_, yr) => {
                    const m = yr * 12;
                    const fv = m === 0 ? 0 : Math.round(sipAmt * ((Math.pow(1 + mr, m) - 1) / mr));
                    return { yr, value: +(fv / 100000).toFixed(2) };
                  })}
                  margin={{ top: 2, right: 6, left: -26, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="sipValueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="yr" 
                    tick={{ fontSize: 7, fill: '#565a64' }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={v => v === 0 ? '' : `${v}Y`} 
                    interval={Math.max(1, Math.ceil(sipYrs / 3))} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.8} 
                    fill="url(#sipValueGrad)" 
                    dot={({ cx, cy, index, payload }) => {
                      const isMarker = payload.yr > 0 && (payload.yr % 3 === 0 || payload.yr === sipYrs);
                      if (!isMarker) return null;
                      return (
                        <g key={index}>
                          <circle cx={cx} cy={cy} r={3} fill="#8b5cf6" stroke="#ffffff" strokeWidth={1} />
                        </g>
                      );
                    }} 
                    activeDot={{ r: 4 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown Indicators Row */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <div style={{ flex: 1, padding: '10px', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                <div style={{ fontSize: '9px', color: '#8e929b', fontWeight: 500 }}>Invested</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                  ₹{(sipInvested / 100000).toFixed(1)}L
                </div>
              </div>
              <div style={{ flex: 1, padding: '10px', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                <div style={{ fontSize: '9px', color: '#8e929b', fontWeight: 500 }}>Value</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                  ₹{(sipFV / 100000).toFixed(1)}L
                </div>
              </div>
            </div>

            {/* Set Up SIP Button */}
            <button 
              onClick={() => { window.open('https://groww.in/mutual-funds/category/index-funds', '_blank'); showToast(`Opening Groww to set up ₹${sipAmt.toLocaleString()}/mo SIP`, 'success'); }}
              style={{ 
                width: '100%', 
                padding: '10px', 
                background: '#6366f1', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: 600, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px', 
                marginTop: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
            >
              <span>Set Up SIP</span>
              <span>→</span>
            </button>

          </div>

        </div>

      </div>

      {/* ── Page Footer: Connected Session ID ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', fontSize: '9px', color: '#565a64', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} className="animate-pulse" />
            ENGINE CONNECTED
          </span>
          <span>STATUS: {syncMin}</span>
        </div>
        <span>SESSION: {sessionId}</span>
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
    bg: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
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
    bg: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
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
  const { finance, health, career, records, computed, updateDomain, addRecords, setRecords, addTimelineEvent, gamification, updateGamification, refreshGamification } = useData();

  const handleAward = (award) => {
    if (award) {
      updateGamification({
        xp: award.totalXp,
        level: award.level,
        streak: award.streak,
        badges: award.newBadges && award.newBadges.length > 0
          ? [...(gamification?.badges || []), ...award.newBadges]
          : (gamification?.badges || [])
      });
      if (award.xpGained > 0) {
        showToast(`Earned +${award.xpGained} XP! ⚡`, 'success');
      }
      if (award.newBadges && award.newBadges.length > 0) {
        award.newBadges.forEach(badge => {
          showToast(`🏆 New Badge Unlocked: ${badge.badgeName || badge.badgeId}!`, 'success');
        });
      }
    }
  };
  const [tab, setTab] = useState('overview');
  const [txFilter, setTxFilter] = useState('All');
  const [txSearch, setTxSearch] = useState('');
  const [isTxDropdownOpen, setIsTxDropdownOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 8;

  useEffect(() => {
    setTxPage(1);
  }, [txFilter, txSearch]);

  // Sanitise: clamp any field that exceeds ₹10 crore/month (prevents corruption from bad tx accumulation)
  const MAX_SANE = 10_000_000;
  const sanitiseFinance = (raw) => {
    if (!raw) return {};
    const out = { ...raw };
    ['income','expenses','savings','investments','subscriptions','debt'].forEach(k => {
      const v = Number(out[k]);
      if (!isFinite(v) || v > MAX_SANE || v < 0) out[k] = 0;
      else out[k] = v;
    });
    return out;
  };
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...sanitiseFinance(finance) };
  const h = { sleepAvg: 7, stressLevel: 5, workoutsPerWeek: 2, ...(health || {}) };
  const c = { studyHoursDaily: 0, codingHoursDaily: 0, dsaPractice: 0, projectsCompleted: 0, skills: [], gpa: 0, ...(career || {}) };
  const score = computed?.financeScore?.score || 0;
  const financeRecords = records?.finance || [];
  const hasFinanceData = f.income > 0 || f.expenses > 0 || f.savings > 0;

  // Auto-heal: if stored finance data was corrupted, persist the sanitised version
  useEffect(() => {
    if (!finance) return;
    const needsHeal = ['income','expenses','savings','investments','subscriptions','debt'].some(k => {
      const v = Number(finance[k]);
      return !isFinite(v) || v > MAX_SANE || v < 0;
    });
    if (needsHeal) {
      updateDomain('finance', f);
      showToast('Finance data was corrupted and has been reset to safe values.', 'warning');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load finance records from backend on mount (for real users) and auto-seed if empty
  useEffect(() => {
    const local = loadTxsLocal();
    if (!local || local.length === 0) {
      saveTxs(DEFAULT_MOCK_TRANSACTIONS);
    }

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
  const [profileForm, setProfileForm] = useState({ investments: '', debt: '', subscriptions: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // ── Parsed transactions (local + backend) ─────────────────────────────────
  const [parsedTxs, setParsedTxs] = useState(() => loadTxsLocal());
  const saveTxs = useCallback((txs) => { setParsedTxs(txs); saveTxsLocal(txs); }, []);

  // Sync parsedTxs totals → DataContext so the finance score always reflects what's displayed
  useEffect(() => {
    if (!parsedTxs.length) return;
    const totalExpenses = Math.round(parsedTxs
      .filter(t => t.type !== 'Credit' && t.type !== 'Transfer')
      .reduce((s, t) => s + (t.amount || 0), 0));
    const totalIncome = Math.round(parsedTxs
      .filter(t => t.type === 'Credit')
      .reduce((s, t) => s + (t.amount || 0), 0));
    const update = {
      expenses: totalExpenses,
      income:   totalIncome,  // always set income (0 if no credits — stale closure fixed)
      savings:  Math.max(0, totalIncome - totalExpenses),
    };
    updateDomain('finance', update);
  }, [parsedTxs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for voice-logged transactions from VoiceLogger (same-tab real-time update)
  useEffect(() => {
    const handler = (e) => {
      setParsedTxs(prev => [e.detail, ...prev]);
    };
    window.addEventListener('voice-finance-tx', handler);
    return () => window.removeEventListener('voice-finance-tx', handler);
  }, []);

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
  // Normalise voice-logged DataContext records into the same shape as parsedTxs.
  // Only records with source:'voice' are included here to avoid duplicating
  // SMS-parsed transactions that Finance.jsx already adds to both lists.
  const voiceTxs = useMemo(() =>
    financeRecords
      .filter(r => r.source === 'voice' && r.amount > 0)
      .map(r => ({
        id: 'voice-' + r.date,
        merchant: r.merchant || 'Voice Log',
        category: r.category ? r.category.charAt(0).toUpperCase() + r.category.slice(1) : 'Others',
        type: 'Debit',
        amount: r.amount,
        bank: null,
        mask: null,
        parsedAt: r.date,
        ref: '🎤 Voice Log',
        source: 'voice',
      })),
  [financeRecords]);

  const allTxs = useMemo(() => [...liveTxs, ...parsedTxs, ...voiceTxs].sort((a, b) => new Date(b.parsedAt) - new Date(a.parsedAt)), [liveTxs, parsedTxs, voiceTxs]);

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

      // Update categoryTotals every 5 live transactions — never touch f.expenses (monthly budget)
      if (liveCountRef.current % 5 === 0) {
        addRecords('finance', [{ date: new Date().toISOString(), amount: tx.amount, category: tx.category, transactionType: 'debit' }]);
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
    const amt = Math.abs(Number(editResult.amount) || 0);
    if (amt <= 0 || amt > 10_000_000) { showToast('Invalid amount — must be ₹1 to ₹1,00,00,000', 'error'); return; }
    const confirmed = { ...editResult, amount: amt, id: Date.now(), source: 'manual', parsedAt: new Date().toISOString() };
    saveTxs([confirmed, ...parsedTxs]);
    addRecords('finance', [{ date: new Date().toISOString(), amount: amt, category: confirmed.category, transactionType: confirmed.type === 'Credit' ? 'credit' : 'debit' }]);
    addTimelineEvent({ type: 'Transaction Parsed', text: `₹${amt} at ${confirmed.merchant} (${confirmed.category})`, sentiment: 'neutral', domain: 'finance' });
    showToast(`Added: ${confirmed.merchant} ₹${amt}`, 'success');
    setSmsInput(''); setParseResult(null); setEditResult(null);
    if (financeApi.isEnabled()) {
      try {
        const { award } = await financeApi.create({ date: new Date().toISOString(), amount: amt, category: confirmed.category, merchant: confirmed.merchant, transactionType: confirmed.type === 'Credit' ? 'credit' : 'debit' });
        handleAward(award);
      }
      catch (err) { console.warn('Finance: backend save failed:', err.message); }
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

  const handleBulkConfirm = async () => {
    const valid = multiResults.filter(r => r.result)
      .map(r => ({ ...r.result, amount: Math.abs(Number(r.result.amount) || 0), id: Date.now() + Math.random(), source: 'manual', parsedAt: new Date().toISOString() }))
      .filter(t => t.amount > 0 && t.amount <= 10_000_000);
    if (!valid.length) { showToast('No valid transactions to add', 'error'); return; }
    saveTxs([...valid, ...parsedTxs]);
    addRecords('finance', valid.map(t => ({ date: new Date().toISOString(), amount: t.amount, category: t.category, transactionType: t.type === 'Credit' ? 'credit' : 'debit' })));
    showToast(`Added ${valid.length} transaction${valid.length !== 1 ? 's' : ''}`, 'success');
    setMultiInput(''); setMultiResults([]);
    if (financeApi.isEnabled()) {
      try {
        await Promise.all(valid.map(t => financeApi.create({ date: new Date().toISOString(), amount: t.amount, category: t.category, merchant: t.merchant, transactionType: t.type === 'Credit' ? 'credit' : 'debit' })));
        refreshGamification();
      }
      catch (err) { console.warn('Finance: bulk backend save failed:', err.message); }
    }
  };

  const handleDeleteTx = async (id) => {
    const tx = parsedTxs.find(t => t.id === id);
    saveTxs(parsedTxs.filter(t => t.id !== id));
    // parsedTxs sync useEffect will recompute expenses/income/savings automatically
    if (financeApi.isEnabled() && tx?.backendId) {
      try { await financeApi.delete(tx.backendId); } catch (err) { console.warn('Finance: backend delete failed:', err.message); }
    }
  };

  // ── Legacy handlers ───────────────────────────────────────────────────────
  const handleLog = async (e) => {
    e.preventDefault();
    let changes = 0;
    const recordsToLog = [];
    const backendRecords = [];
    
    if (form.income) {
      const incomeVal = parseInt(form.income, 10);
      recordsToLog.push({ date: new Date().toISOString(), amount: incomeVal, category: 'Income', transactionType: 'credit' });
      backendRecords.push({ date: new Date().toISOString(), amount: incomeVal, category: 'Income', transactionType: 'credit' });
      addTimelineEvent({ type: 'Income Updated', text: `Logged income: ₹${incomeVal}`, sentiment: 'positive', domain: 'finance' });
      changes++;
    }
    if (form.amount) {
      const amountVal = parseInt(form.amount, 10);
      recordsToLog.push({ date: new Date().toISOString(), amount: amountVal, category: form.category, transactionType: 'debit' });
      backendRecords.push({ date: new Date().toISOString(), amount: amountVal, category: form.category, transactionType: 'debit' });
      addTimelineEvent({ type: 'Expense Logged', text: `Spent ₹${amountVal} on ${form.category}`, sentiment: 'neutral', domain: 'finance' });
      changes++;
    }
    
    if (changes > 0) {
      // Add to parsedTxs so the parsedTxs→score sync useEffect fires
      const now = new Date().toISOString();
      const newTxs = [];
      if (form.income) {
        newTxs.push({ id: `manual-${Date.now()}-inc`, merchant: 'Income', category: 'Income', type: 'Credit', amount: parseInt(form.income, 10), bank: 'Manual', mask: null, parsedAt: now, ref: 'Manual Log', source: 'manual-log' });
      }
      if (form.amount) {
        const cat = form.category || 'others';
        newTxs.push({ id: `manual-${Date.now()}-exp`, merchant: cat.charAt(0).toUpperCase() + cat.slice(1), category: cat.charAt(0).toUpperCase() + cat.slice(1), type: 'Debit', amount: parseInt(form.amount, 10), bank: 'Manual', mask: null, parsedAt: now, ref: 'Manual Log', source: 'manual-log' });
      }
      if (newTxs.length) saveTxs([...newTxs, ...parsedTxs]);

      addRecords('finance', recordsToLog);
      setForm({ income: '', expense: '', category: 'food', amount: '' });
      showToast('Financial data saved', 'success');

      // Persist to backend
      if (financeApi.isEnabled()) {
        try {
          await Promise.all(backendRecords.map(rec => financeApi.create(rec)));
          refreshGamification();
        }
        catch (err) { console.warn('Finance: backend save failed:', err.message); }
      }
    } else {
      showToast('Please fill at least one field', 'error');
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

  const groupedData = useMemo(() => {
    const rawData = categoryTotals.length > 0 ? categoryTotals : expenseBreakdown;
    const groups = {
      'Food & Dining': { value: 0, color: '#ec4899' },
      'Shopping': { value: 0, color: '#f97316' },
      'Transport': { value: 0, color: '#3b82f6' },
      'Bills & Utilities': { value: 0, color: '#10b981' },
      'Entertainment': { value: 0, color: '#8b5cf6' },
      'Others': { value: 0, color: '#64748b' }
    };

    rawData.forEach(item => {
      const name = item.name.toLowerCase();
      if (name.includes('food') || name.includes('dining')) {
        groups['Food & Dining'].value += item.value;
      } else if (name.includes('shopping')) {
        groups['Shopping'].value += item.value;
      } else if (name.includes('transport') || name.includes('travel')) {
        groups['Transport'].value += item.value;
      } else if (name.includes('bills') || name.includes('utilities') || name.includes('rent') || name.includes('electricity')) {
        groups['Bills & Utilities'].value += item.value;
      } else if (name.includes('entertainment') || name.includes('movie') || name.includes('spotify') || name.includes('netflix')) {
        groups['Entertainment'].value += item.value;
      } else {
        groups['Others'].value += item.value;
      }
    });

    const total = Object.values(groups).reduce((s, g) => s + g.value, 0) || 1;
    const list = Object.entries(groups).map(([name, g]) => ({
      name,
      value: g.value,
      color: g.color,
      percentage: total > 0 ? Math.round((g.value / total) * 100) : 0
    }));

    const hasData = Object.values(groups).some(g => g.value > 0);
    if (!hasData) {
      return [
        { name: 'Food & Dining', value: 28, color: '#ec4899', percentage: 28 },
        { name: 'Shopping', value: 22, color: '#f97316', percentage: 22 },
        { name: 'Transport', value: 18, color: '#3b82f6', percentage: 18 },
        { name: 'Bills & Utilities', value: 15, color: '#10b981', percentage: 15 },
        { name: 'Entertainment', value: 10, color: '#8b5cf6', percentage: 10 },
        { name: 'Others', value: 7, color: '#64748b', percentage: 7 }
      ];
    }

    return list.filter(g => g.value > 0);
  }, [categoryTotals, expenseBreakdown]);

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
    <div className={`page-container min-h-screen pb-2 ${['log', 'invest', 'recommendations'].includes(tab) ? '' : 'bg-mesh'}`} style={['log', 'invest', 'recommendations'].includes(tab) ? { backgroundColor: '#090a0f', fontFamily: 'var(--font-primary)' } : { fontFamily: 'var(--font-primary)' }}>
      {/* Floating live notification */}
      <AnimatePresence>
        {notification && <LiveNotification tx={notification} onDismiss={() => { setNotification(null); clearTimeout(notifTimerRef.current); }} />}
      </AnimatePresence>



      {/* ── Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
        <span>BeyondSelf</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#ffffff' }}>Financial Intelligence</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(139, 92, 246, 0.15)',
          color: '#8b5cf6',
          flexShrink: 0
        }}>
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m19 8-5 5-3-3-5 5" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Financial Intelligence</h1>
      </div>
      <p style={{ fontSize: 13, color: '#8e929b', marginTop: 2, marginBottom: 24 }}>AI-powered transaction parsing, live feed, and spending analytics.</p>

      {/* Tab bar */}
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
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (() => {
        const netWorth   = (f.savings||0)+(f.investments||0)-(f.debt||0);
        const netSavings = Math.max(0,(f.income||0)-(f.expenses||0));
        const scoreColor = score>=70?'#8b5cf6':score>=45?'#f59e0b':'#f43f5e';
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
        const flag = flags[0] || {label:`Savings Rate: ${savingsRate}%`, color:'#8b5cf6'};
        const action = flags.length===0 ? 'Keep building your emergency fund.'
          : f.debt>0 ? 'Prioritise clearing high-interest debt before investing.'
          : savingsRate<15 ? 'Automate savings — set up a recurring transfer on payday.'
          : 'Review subscriptions and reduce impulse spending.';

        return (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* ROW 1 */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16}}>

            {/* Score card */}
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
                        <linearGradient id="financeScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'} />
                          <stop offset="100%" stopColor={score >= 70 ? '#34d399' : score >= 45 ? '#facc15' : '#f87171'} />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="48" fill="none"
                        stroke="url(#financeScoreGrad)"
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*48} ${2*Math.PI*48}`}
                        strokeDashoffset={2*Math.PI*48*(1-score/100)}
                        style={{
                          transform: 'rotate(-90deg)',
                          transformOrigin: '60px 60px',
                          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: score >= 70 ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' : score >= 45 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))'
                        }}/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{score}</span>
                      <span style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--font-display)', marginBottom: 8, margin: '0 0 8px' }}>Finance Score</p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      marginBottom: 10,
                      background: score >= 70 ? 'rgba(16, 185, 129, 0.12)' : score >= 45 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171',
                      border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444', display: 'inline-block' }} />
                      {score >= 70 ? 'Good' : score >= 45 ? 'Moderate' : 'Low'}
                    </span>
                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                      {score >= 45 ? 'Keep optimizing your spending habits.' : 'Focus on savings and reduce expenses.'}
                    </p>
                  </div>
                </div>

                {/* Financial contributors Breakdown panel */}
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>Finance Contributors</span>
                  
                  {/* Savings Index */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💰</span> Savings Index
                      </span>
                      <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{Math.min(100, Math.max(0, savingsRate))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%`, background: 'linear-gradient(90deg, #8b5cf6, #00ffd5)', height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Investment Index */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📈</span> Investment Index
                      </span>
                      <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{Math.min(100, Math.round(((f.investments || 0) / Math.max(1, f.income || 50000)) * 300))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.round(((f.investments || 0) / Math.max(1, f.income || 50000)) * 300))}%`, background: 'linear-gradient(90deg, #8b5cf6, #c084fc)', height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Budget Control */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚖️</span> Budget Control
                      </span>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{Math.max(0, Math.min(100, Math.round((1 - (f.expenses || 0) / Math.max(1, f.income || 50000)) * 100)))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, Math.round((1 - (f.expenses || 0) / Math.max(1, f.income || 50000)) * 100)))}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', height: '100%', borderRadius: 999 }} />
                    </div>
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
                  border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  background: score >= 70 ? 'rgba(16, 185, 129, 0.06)' : score >= 45 ? 'rgba(245, 158, 11, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                  color: score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171',
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
            <div style={{...card, padding:'24px', display: 'flex', flexDirection: 'column', gap: 16}}>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                <h3 style={{fontSize:15, fontWeight:800, color:'#f1f5f9', margin:0, fontFamily: 'var(--font-display)'}}>Expense Breakdown</h3>
                <span style={{fontSize:12, color:'#475569', cursor:'help'}} title="Based on parsed transactions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
                </span>
              </div>
              
              {/* Chart container */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
                {/* Donut Chart */}
                <div style={{position:'relative', flexShrink:0, width:130, height:130}}>
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie data={groupedData} cx="50%" cy="50%" outerRadius={60} innerRadius={42} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                        {groupedData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip formatter={v=>`₹${v.toLocaleString()}`} contentStyle={{background:'rgba(13,17,28,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:10}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legends */}
                <div style={{flex:1, display:'flex', flexDirection:'column', gap:10}}>
                  {groupedData.map(e => (
                    <div key={e.name} style={{display:'flex', alignItems:'center', gap:10}}>
                      <span style={{width:10, height:10, borderRadius:'50%', background:e.color, flexShrink:0}}/>
                      <span style={{fontSize:12, color:'#94a3b8', fontWeight:500, flex:1}}>{e.name}</span>
                      <span style={{fontSize:12, fontWeight:700, color: '#f1f5f9'}}>{e.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* View full breakdown CTA */}
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setTab('transactions')}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    color: '#8b5cf6',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-display)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover:underline hover:text-[#7c3aed]"
                >
                  View full breakdown
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
              </div>
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
        const hashColor = s => { const c=['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#10b981','#8b5cf6','#3b82f6']; let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0xffffffff; return c[Math.abs(h)%c.length]; };
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
        const now = new Date();
        const msPerDay = 86400000;
        const cutoff30 = new Date(now - 30 * msPerDay);
        const cutoff60 = new Date(now - 60 * msPerDay);

        // Current 30-day window
        const recent = allTxs.filter(t => new Date(t.parsedAt) >= cutoff30);
        const prev   = allTxs.filter(t => { const d = new Date(t.parsedAt); return d >= cutoff60 && d < cutoff30; });

        const sumSpent  = txs => txs.filter(t => t.type !== 'Credit').reduce((s, t) => s + t.amount, 0);
        const sumIncome = txs => txs.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);

        const totalCount  = allTxs.length;
        const totalSpent  = sumSpent(recent);
        const totalIncome = sumIncome(recent);
        const netSavings  = totalIncome - totalSpent;

        const prevSpent  = sumSpent(prev);
        const prevIncome = sumIncome(prev);
        const prevNet    = prevIncome - prevSpent;

        const pctChange = (curr, prev2) => {
          if (!prev2 || prev2 === 0) return null;
          const delta = ((curr - prev2) / prev2) * 100;
          return { pct: Math.abs(delta).toFixed(1), up: delta >= 0 };
        };
        const spentTrend  = pctChange(totalSpent,  prevSpent);
        const incomeTrend = pctChange(totalIncome, prevIncome);
        const netTrend    = pctChange(netSavings,  prevNet);

        // Date range label
        const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const dateRangeLabel = recent.length > 0
          ? `${fmt(cutoff30)} – ${fmt(now)}`
          : allTxs.length > 0 ? `${fmt(new Date(allTxs[allTxs.length-1].parsedAt))} – ${fmt(now)}` : 'No transactions';

        // Filter transactions based on category pill & search input
        const filteredTxs = allTxs.filter(tx => {
          const matchesFilter = txFilter === 'All' || tx.category === txFilter;
          const matchesSearch = txSearch.trim() === '' || 
            tx.merchant.toLowerCase().includes(txSearch.toLowerCase()) ||
            tx.category.toLowerCase().includes(txSearch.toLowerCase()) ||
            (tx.ref && tx.ref.toLowerCase().includes(txSearch.toLowerCase()));
          return matchesFilter && matchesSearch;
        });

        const totalPages = Math.ceil(filteredTxs.length / txPageSize) || 1;
        const slicedTxs = filteredTxs.slice((txPage - 1) * txPageSize, txPage * txPageSize);

        return (
          <div className="flex flex-col gap-6 relative z-10 w-full font-sans">
            
            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Total Spent */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.015 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(20,22,35,0.65) 0%, rgba(10,12,20,0.65) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  boxSizing: 'border-box'
                }}
                className="backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-violet-500/5 blur-xl pointer-events-none" />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <p className="text-[13px] text-slate-400 font-medium font-sans">Total Spent</p>
                  <p className="text-[25px] font-bold text-slate-100 mt-1 font-sans leading-none tracking-tight">₹{Math.round(totalSpent).toLocaleString('en-IN')}</p>
                  <p className={`text-[11.5px] font-semibold flex items-center gap-1 mt-1.5 font-sans leading-none ${spentTrend ? (spentTrend.up ? 'text-[#ef4444]' : 'text-[#10b981]') : 'text-slate-500'}`}>
                    {spentTrend ? <><span>{spentTrend.up ? '↑' : '↓'} {spentTrend.pct}%</span><span className="text-slate-500 font-normal">vs prev 30d</span></> : <span className="text-slate-500 font-normal">Last 30 days</span>}
                  </p>
                </div>
              </motion.div>

              {/* Card 2: Total Income */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.015 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(20,22,35,0.65) 0%, rgba(10,12,20,0.65) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  boxSizing: 'border-box'
                }}
                className="backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Download size={22} />
                </div>
                <div>
                  <p className="text-[13px] text-slate-400 font-medium font-sans">Total Income</p>
                  <p className="text-[25px] font-bold text-slate-100 mt-1 font-sans leading-none tracking-tight">₹{Math.round(totalIncome).toLocaleString('en-IN')}</p>
                  <p className={`text-[11.5px] font-semibold flex items-center gap-1 mt-1.5 font-sans leading-none ${incomeTrend ? (incomeTrend.up ? 'text-[#10b981]' : 'text-[#ef4444]') : 'text-slate-500'}`}>
                    {incomeTrend ? <><span>{incomeTrend.up ? '↑' : '↓'} {incomeTrend.pct}%</span><span className="text-slate-500 font-normal">vs prev 30d</span></> : <span className="text-slate-500 font-normal">Last 30 days</span>}
                  </p>
                </div>
              </motion.div>

              {/* Card 3: Net Savings */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.015 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(20,22,35,0.65) 0%, rgba(10,12,20,0.65) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  boxSizing: 'border-box'
                }}
                className="backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-[13px] text-slate-400 font-medium font-sans">Net Savings</p>
                  <p className="text-[25px] font-bold text-slate-100 mt-1 font-sans leading-none tracking-tight">₹{Math.round(netSavings).toLocaleString('en-IN')}</p>
                  <p className={`text-[11.5px] font-semibold flex items-center gap-1 mt-1.5 font-sans leading-none ${netTrend ? (netTrend.up ? 'text-[#10b981]' : 'text-[#ef4444]') : 'text-slate-500'}`}>
                    {netTrend ? <><span>{netTrend.up ? '↑' : '↓'} {netTrend.pct}%</span><span className="text-slate-500 font-normal">vs prev 30d</span></> : <span className="text-slate-500 font-normal">Last 30 days</span>}
                  </p>
                </div>
              </motion.div>

              {/* Card 4: Transactions */}
              <motion.div 
                whileHover={{ y: -3, scale: 1.015 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(20,22,35,0.65) 0%, rgba(10,12,20,0.65) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  boxSizing: 'border-box'
                }}
                className="backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ArrowLeftRight size={22} />
                </div>
                <div>
                  <p className="text-[13px] text-slate-400 font-medium font-sans">Transactions</p>
                  <p className="text-[25px] font-bold text-slate-100 mt-1 font-sans leading-none tracking-tight">{totalCount}</p>
                  <p className="text-[11.5px] text-slate-500 font-medium mt-1.5 font-sans leading-none">
                    <span>vs last 30 days</span>
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Aligned Search & Filter bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mt-6">
              
              {/* Search input (mag glass on left) */}
              <div className="relative flex items-center w-full sm:w-80 shrink-0">
                <span className="absolute left-3.5 text-slate-400 flex items-center justify-center pointer-events-none">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  className="w-full bg-[#111219]/60 border border-white/[0.08] focus:border-indigo-500/50 rounded-xl py-2.5 pr-8 text-[13px] text-slate-200 outline-none transition-all leading-normal font-sans"
                />
                {txSearch && (
                  <button 
                    onClick={() => setTxSearch('')}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date & Filter selectors on right */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                
                {/* Styled date range container */}
                <div className="flex items-center gap-2 bg-[#111219]/60 border border-white/[0.08] rounded-xl px-4 py-2 text-[13px] text-slate-200 cursor-pointer hover:bg-white/[0.02] transition-all">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{dateRangeLabel}</span>
                  <ChevronDown size={14} className="text-slate-400 ml-1" />
                </div>

                {/* Filter button with category dropdown list */}
                <div 
                  onClick={() => setIsTxDropdownOpen(!isTxDropdownOpen)}
                  className="flex items-center gap-2 bg-[#111219]/60 border border-white/[0.08] rounded-xl px-4 py-2 text-[13px] text-slate-200 cursor-pointer hover:bg-white/[0.02] transition-all relative"
                >
                  <Filter size={14} className="text-slate-400" />
                  <span>{txFilter === 'All' ? 'Filter' : txFilter === 'Food' ? 'Food & Dining' : txFilter === 'Transport' ? 'Travel' : txFilter}</span>
                  <ChevronDown size={14} className="text-slate-400 ml-1" />

                  {/* Absolute positioning dropdown filter list */}
                  <AnimatePresence>
                    {isTxDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsTxDropdownOpen(false); }} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/[0.08] bg-[#0c0d12]/98 backdrop-blur-xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-50 flex flex-col gap-0.5"
                        >
                          {['All', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Groceries', 'Investments', 'Others'].map(cat => {
                            const isCatActive = txFilter === cat;
                            const meta = CATEGORY_META[cat] || { color: '#6366f1', icon: '💰' };
                            return (
                              <button
                                key={cat}
                                onClick={() => {
                                  setTxFilter(cat);
                                  setIsTxDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-between font-sans ${
                                  isCatActive 
                                    ? 'bg-white/[0.08] text-white' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{meta.icon}</span>
                                  <span>{cat === 'Food' ? 'Food & Dining' : cat === 'Transport' ? 'Travel' : cat}</span>
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
              </div>

            </div>

            {/* High-Contrast Transactions Table inside rounded border container */}
            <div className="w-full overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0c0d12]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] mt-6">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-[12px] text-[#64748b] font-semibold">
                      <th style={{ paddingLeft: '24px' }} className="py-3 select-none cursor-pointer hover:text-white transition-colors w-[16%]">
                        <div className="flex items-center gap-1.5">
                          <span>Date</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 opacity-60"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                        </div>
                      </th>
                      <th className="py-3 px-4 w-[26%]">Description</th>
                      <th className="py-3 px-4 w-[16%]">Category</th>
                      <th className="py-3 px-4 w-[14%]">Amount</th>
                      <th className="py-3 px-4 w-[14%]">Type</th>
                      <th className="py-3 px-4 w-[14%]">Source</th>
                      <th className="py-3 w-[4%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {slicedTxs.map(tx => {
                      const displayDate = new Date(tx.parsedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const displayTime = new Date(tx.parsedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      // Category mapping for exact mockup badging with outline vector SVGs
                      let catLabel = tx.category;
                      let catColor = 'rgba(148, 163, 184, 0.08)';
                      let catBorder = '1px solid rgba(148, 163, 184, 0.15)';
                      let catTextColor = '#94a3b8';
                      let catIcon = (
                        <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" />
                        </svg>
                      );

                      if (tx.category === 'Food') {
                        catLabel = 'Food & Dining';
                        catColor = 'rgba(249, 115, 22, 0.08)';
                        catBorder = '1px solid rgba(249, 115, 22, 0.15)';
                        catTextColor = '#fb923c';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                            <path d="M7 2v20" />
                            <path d="M21 15V2v0a5 5 0 0 0-5 5v8" />
                            <path d="M18 15v7" />
                          </svg>
                        );
                      } else if (tx.category === 'Transport') {
                        catLabel = 'Travel';
                        catColor = 'rgba(59, 130, 246, 0.08)';
                        catBorder = '1px solid rgba(59, 130, 246, 0.15)';
                        catTextColor = '#60a5fa';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <circle cx="17" cy="17" r="2" />
                          </svg>
                        );
                      } else if (tx.category === 'Shopping') {
                        catColor = 'rgba(167, 139, 250, 0.08)';
                        catBorder = '1px solid rgba(167, 139, 250, 0.15)';
                        catTextColor = '#c084fc';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <path d="M3 6h18" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                        );
                      } else if (tx.category === 'Entertainment') {
                        catColor = 'rgba(192, 132, 252, 0.08)';
                        catBorder = '1px solid rgba(192, 132, 252, 0.15)';
                        catTextColor = '#c084fc';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                          </svg>
                        );
                      } else if (tx.category === 'Income') {
                        catColor = 'rgba(16, 185, 129, 0.08)';
                        catBorder = '1px solid rgba(16, 185, 129, 0.15)';
                        catTextColor = '#34d399';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                        );
                      } else if (tx.category === 'Transfer') {
                        catColor = 'rgba(139, 92, 246, 0.08)';
                        catBorder = '1px solid rgba(139, 92, 246, 0.15)';
                        catTextColor = '#22d3ee';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5" />
                            <path d="M5 12l7-7 7 7" />
                          </svg>
                        );
                      } else if (tx.category === 'Groceries') {
                        catColor = 'rgba(34, 197, 94, 0.08)';
                        catBorder = '1px solid rgba(34, 197, 94, 0.15)';
                        catTextColor = '#4ade80';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.7 12.5a2 2 0 0 0 2 1.5h9.7a2 2 0 0 0 2-1.5L23 6H6" />
                          </svg>
                        );
                      } else if (tx.category === 'Bills') {
                        catColor = 'rgba(139, 92, 246, 0.08)';
                        catBorder = '1px solid rgba(139, 92, 246, 0.15)';
                        catTextColor = '#22d3ee';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                        );
                      } else if (tx.category === 'Health') {
                        catColor = 'rgba(16, 185, 129, 0.08)';
                        catBorder = '1px solid rgba(16, 185, 129, 0.15)';
                        catTextColor = '#34d399';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                        );
                      } else if (tx.category === 'Education') {
                        catColor = 'rgba(236, 72, 153, 0.08)';
                        catBorder = '1px solid rgba(236, 72, 153, 0.15)';
                        catTextColor = '#f472b6';
                        catIcon = (
                          <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                        );
                      }

                      const isCredit = tx.type === 'Credit';
                      const isTransfer = tx.type === 'Transfer';

                      return (
                        <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                          {/* Date Column */}
                          <td style={{ paddingLeft: '24px' }} className="py-3">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-slate-100 font-sans">{displayDate}</span>
                              <span className="text-[11px] text-[#565a64] mt-0.5 font-sans font-medium">{displayTime}</span>
                            </div>
                          </td>

                          {/* Description Column */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-slate-100 font-sans">{tx.merchant}</span>
                              <span className="text-[11px] text-[#565a64] mt-0.5 font-sans font-medium leading-none">{tx.ref || 'Parsed bank notification'}</span>
                            </div>
                          </td>

                          {/* Category Badge Column */}
                          <td className="py-3 px-4">
                            <div 
                              style={{
                                backgroundColor: catColor,
                                border: catBorder,
                                color: catTextColor
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-max text-[11px] font-semibold tracking-normal font-sans"
                            >
                              <span style={{ display: 'flex', alignItems: 'center' }}>{catIcon}</span>
                              <span>{catLabel}</span>
                            </div>
                          </td>

                          {/* Amount Column */}
                          <td className="py-3 px-4">
                            <span className={`text-[13px] font-semibold font-sans ${isCredit ? 'text-[#10b981]' : 'text-slate-100'}`}>
                              {isCredit ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Type Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {isCredit ? (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-[#10b981] font-sans">
                                  <span>↑</span>
                                  <span>Income</span>
                                </span>
                              ) : isTransfer ? (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-blue-400 font-sans">
                                  <span>↑</span>
                                  <span>Transfer</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-rose-400 font-sans">
                                  <span>↓</span>
                                  <span>Expense</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Source Column */}
                          <td style={{ paddingRight: '24px' }} className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-slate-100 font-sans">{tx.bank}</span>
                              <span className="text-[11px] text-[#565a64] mt-0.5 font-sans font-medium">{tx.mask || 'UPI'}</span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 text-center relative select-none w-[4%]">
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the transaction from ${tx.merchant}?`)) {
                                  const updated = parsedTxs.filter(t => t.id !== tx.id);
                                  saveTxs(updated);
                                  showToast('Transaction deleted successfully', 'success');
                                }
                              }}
                              className="text-slate-600 hover:text-slate-300 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer opacity-60 hover:opacity-100"
                              title="Delete Transaction"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* High-Fidelity Glowing Empty State */}
              {slicedTxs.length === 0 && (
                <div className="flex flex-col gap-3.5 py-18 items-center justify-center text-center w-full bg-[#08090d]/30">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.12)]">
                    <Clipboard size={22} className="opacity-80" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-200 font-sans">No matching logs found</p>
                    <p className="text-[11px] text-[#64748b] mt-1 font-sans">Try modifying your search keywords or active filter.</p>
                  </div>
                </div>
              )}

              {/* Pagination footer bar */}
              {filteredTxs.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-5 py-4 border-t border-white/[0.05] bg-[#0c0d12]/20 w-full select-none">
                  
                  {/* Counter */}
                  <span className="text-[12px] text-[#64748b] font-medium font-sans">
                    Showing <span className="text-slate-300 font-semibold">{(txPage - 1) * txPageSize + 1}</span> to <span className="text-slate-300 font-semibold">{Math.min(txPage * txPageSize, filteredTxs.length)}</span> of <span className="text-slate-300 font-semibold">{filteredTxs.length}</span> transactions
                  </span>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Previous chevron */}
                    <button
                      disabled={txPage === 1}
                      onClick={() => setTxPage(prev => Math.max(1, prev - 1))}
                      className="w-7.5 h-7.5 rounded-lg border border-white/[0.06] flex items-center justify-center text-[#64748b] hover:bg-white/5 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = pageNum === txPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setTxPage(pageNum)}
                          style={isActive ? { backgroundColor: '#6366f1' } : {}}
                          className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
                            isActive 
                              ? 'text-white border-none shadow-[0_0_12px_rgba(99,102,241,0.25)]' 
                              : 'border border-white/[0.06] text-[#64748b] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next chevron */}
                    <button
                      disabled={txPage === totalPages}
                      onClick={() => setTxPage(prev => Math.min(totalPages, prev + 1))}
                      className="w-7.5 h-7.5 rounded-lg border border-white/[0.06] flex items-center justify-center text-[#64748b] hover:bg-white/5 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── LOG TAB ───────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="flex flex-col gap-6 relative z-10 w-full px-1">

          {/* ── Financial Profile Card ── */}
          <div style={{ padding: '20px 24px' }} className="rounded-2xl border border-white/5 bg-[#0b0c10]">
            <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Financial Profile</p>
            <form onSubmit={e => {
              e.preventDefault();
              const updates = {};
              if (profileForm.investments !== '') updates.investments = Number(profileForm.investments);
              if (profileForm.debt !== '')        updates.debt        = Number(profileForm.debt);
              if (profileForm.subscriptions !== '') updates.subscriptions = Number(profileForm.subscriptions);
              if (Object.keys(updates).length === 0) { showToast('Enter at least one value', 'error'); return; }
              updateDomain('finance', updates);
              setProfileForm({ investments: '', debt: '', subscriptions: '' });
              showToast('Financial profile updated', 'success');
            }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'investments', label: 'Monthly Investments (SIP / MF)', placeholder: `Current: ₹${(f.investments||0).toLocaleString()}`, color: '#10b981' },
                { key: 'debt',        label: 'Total Debt Balance',             placeholder: `Current: ₹${(f.debt||0).toLocaleString()}`,        color: '#f43f5e' },
                { key: 'subscriptions', label: 'Monthly Subscriptions',       placeholder: `Current: ₹${(f.subscriptions||0).toLocaleString()}`, color: '#8b5cf6' },
              ].map(({ key, label, placeholder, color }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label style={{ fontFamily: 'var(--font-display)', color }} className="text-[10px] font-bold uppercase tracking-wider">{label}</label>
                  <input
                    type="number" min="0" value={profileForm[key]}
                    onChange={e => setProfileForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ height: 42, padding: '10px 14px', backgroundColor: '#050608', border: `1px solid ${color}30`, borderRadius: 10, color: '#f1f5f9', fontSize: 12, outline: 'none' }}
                    className="w-full"
                  />
                </div>
              ))}
              <div className="sm:col-span-3 flex items-center gap-4">
                <button type="submit" style={{ height: 42, backgroundColor: '#4f46e5', borderRadius: 10, fontFamily: 'var(--font-display)', padding: '0 20px' }}
                  className="text-white font-bold text-xs tracking-wide cursor-pointer transition-all hover:bg-indigo-500 active:scale-[0.98]">
                  Save Profile
                </button>
                <span className="text-xs text-slate-500">
                  Investments ₹{(f.investments||0).toLocaleString()} · Debt ₹{(f.debt||0).toLocaleString()} · Subs ₹{(f.subscriptions||0).toLocaleString()}
                </span>
              </div>
            </form>
          </div>
          
          {/* Form Section Header */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
              </div>
              FINANCIAL LEDGER MANAGER
            </h2>
            <p style={{ fontFamily: 'var(--font-primary)' }} className="text-xs text-slate-400 mt-1">Manually record transactions or scan paper receipts using high-tech OCR analysis.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Left Column: Form & OCR */}
            <div className="flex flex-col gap-6 h-full">
              
              {/* Form Card */}
              <div style={{ padding: '24px' }} className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                  <div className="text-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold uppercase tracking-wider text-slate-200">MANUAL ENTRY CONSOLE</span>
                </div>
                
                <form onSubmit={handleLog} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Monthly Income */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MONTHLY INCOME</label>
                      <input
                        type="text"
                        value={form.income}
                        onChange={e => setForm(p => ({ ...p, income: e.target.value }))}
                        placeholder="e.g. 50,000"
                        style={{ height: '46px', padding: '12px 16px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                        className="w-full text-xs text-slate-200 outline-none transition-all placeholder-slate-600 focus:border-[#6366f1]/50"
                      />
                    </div>

                    {/* Expense Category */}
                    <div className="flex flex-col gap-2">
                      <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CATEGORY</label>
                      <div className="relative flex items-center">
                        <select
                          value={form.category}
                          onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                          style={{ height: '46px', padding: '12px 16px', paddingRight: '40px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                          className="w-full text-xs text-slate-200 outline-none transition-all appearance-none cursor-pointer focus:border-[#6366f1]/50"
                        >
                          <option value="Food" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Food & Dining</option>
                          <option value="Transport" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Transport</option>
                          <option value="Shopping" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Shopping</option>
                          <option value="Entertainment" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Entertainment</option>
                          <option value="Bills" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Bills & Utilities</option>
                          <option value="Health" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Health</option>
                          <option value="Education" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Education</option>
                          <option value="Groceries" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Groceries</option>
                          <option value="Investments" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Investments</option>
                          <option value="Others" style={{ backgroundColor: '#050608', fontFamily: 'var(--font-primary)' }}>Other</option>
                        </select>
                        <span className="absolute right-4 text-slate-400 pointer-events-none">
                          <ChevronDown size={14} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-2">
                    <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AMOUNT SPENT</label>
                    <input
                      type="text"
                      value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="e.g. 1,500"
                      style={{ height: '46px', padding: '12px 16px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                      className="w-full text-xs text-slate-200 outline-none transition-all placeholder-slate-600 focus:border-[#6366f1]/50"
                    />
                  </div>

                  {/* Save Entry Button */}
                  <button
                    type="submit"
                    style={{ height: '46px', backgroundColor: '#4f46e5', borderRadius: '12px', fontFamily: 'var(--font-display)' }}
                    className="w-full mt-2 text-white font-bold text-xs tracking-wide cursor-pointer transition-all flex items-center justify-center active:scale-[0.98] hover:bg-[#4338ca]"
                  >
                    Commit Entry to Ledger
                  </button>
                </form>
              </div>

              {/* OCR Receipt Scanner Card */}
              <div style={{ padding: '24px' }} className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-emerald-500">
                      <Sparkles size={18} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold uppercase tracking-wider text-slate-200">CYBER RECEIPT SCANNER</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md font-bold tracking-wider uppercase border border-emerald-500/20">
                    OCR AI
                  </span>
                </div>

                <p style={{ fontFamily: 'var(--font-primary)' }} className="text-xs text-slate-400 leading-relaxed font-medium">
                  Scan and auto-fill manual transactions by uploading an image of your receipt.
                </p>

                <div className="mt-2 flex-1 flex flex-col">
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
                    style={{ flex: 1, minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#050608', borderColor: 'rgba(255, 255, 255, 0.08)', borderStyle: 'dashed', borderWidth: '1px', borderRadius: '12px', padding: '24px 16px', fontFamily: 'var(--font-primary)' }}
                    className="cursor-pointer transition-all hover:bg-slate-900/40 w-full"
                  >
                    {ocrLoading ? (
                      <div className="flex flex-col items-center gap-4 w-full px-8">
                        <div className="text-emerald-500 animate-spin">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                        </div>
                        <div className="w-full text-center">
                          <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-200">Analyzing...</p>
                          <div className="w-full bg-[#050608] rounded-full h-1 mt-3 overflow-hidden">
                            <motion.div 
                              className="bg-emerald-500 h-full rounded-full" 
                              animate={{ width: `${ocrProgress}%` }}
                            />
                          </div>
                          <p style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] text-emerald-500 font-bold mt-2">{ocrProgress}%</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                        </div>
                        <span style={{ fontFamily: 'var(--font-primary)' }} className="text-[13px] font-semibold text-slate-200">Drop receipt or click to upload</span>
                        <span style={{ fontFamily: 'var(--font-primary)' }} className="text-xs text-slate-500 mt-1.5 font-medium">Supports PNG, JPG, WebP</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Recent Logs */}
            <div 
              style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px' }}
              className="rounded-2xl border border-white/5 bg-[#0b0c10] gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex-1"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="text-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold uppercase tracking-wider text-slate-200">AUDIT LEDGER STREAM</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-[9px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md font-bold tracking-wider uppercase border border-indigo-500/20">
                  DATABASE
                </span>
              </div>

              {financeRecords.length === 0 ? (
                <div className="flex flex-col gap-3 py-24 items-center justify-center text-center flex-1">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                    <FileText size={20} className="opacity-80" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)' }} className="text-[13px] font-bold text-slate-300">Empty Ledger Stream</p>
                    <p style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] text-slate-500 mt-1 max-w-xs px-4 font-medium leading-normal">Your manually recorded inputs and scanned receipts will securely compile here.</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent pr-1"
                >
                  <AnimatePresence initial={false}>
                    {financeRecords.slice(0, 15).map((rec, idx) => {
                      const isIncome = rec.category === 'Income';

                      const categoryIcons = {
                        Income: '💼',
                        Food: '🍴',
                        Transport: '🚗',
                        Shopping: '🛍️',
                        Entertainment: '🎬',
                        Transfer: '📤',
                        Groceries: '🛒',
                        Bills: '⚡',
                        Health: '💊',
                        Education: '📚',
                        Investments: '📈',
                        Others: '💰'
                      };
                      const icon = categoryIcons[rec.category] || categoryIcons.Others;

                      return (
                        <motion.div 
                          key={rec.id || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="py-3.5 border-b border-white/5 flex items-center gap-3 group last:border-b-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#15171e] border border-white/5 flex items-center justify-center text-base shrink-0 shadow-sm">
                              {icon}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <p style={{ fontFamily: 'var(--font-display)' }} className="text-[13px] font-semibold text-slate-200 truncate">{rec.category === 'Food' ? 'Food & Dining' : rec.category === 'Transport' ? 'Transport / Travel' : rec.category}</p>
                              <p style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                {new Date(rec.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                              <p style={{ fontFamily: 'var(--font-primary)' }} className={`text-[13px] font-bold ${isIncome ? 'text-emerald-500' : 'text-slate-200'}`}>
                                {isIncome ? '+' : '-'} ₹ {rec.amount.toLocaleString('en-IN')}
                              </p>
                              <span style={{ fontFamily: 'var(--font-display)' }} className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                COMMITTED
                              </span>
                            </div>
                            
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete this ledger entry of ₹${rec.amount.toLocaleString()} for ${rec.category}?`)) {
                                  const updated = financeRecords.filter((_, i) => i !== idx);
                                  setRecords('finance', updated);
                                  // Also remove from parsedTxs so parsedTxs sync doesn't overwrite this deletion
                                  const matchType = (rec.transactionType || 'debit').toLowerCase() === 'credit' ? 'Credit' : 'Debit';
                                  const matchedIdx = parsedTxs.findIndex(t => t.amount === rec.amount && (t.type === matchType) && Math.abs(new Date(t.parsedAt) - new Date(rec.date)) < 60000);
                                  if (matchedIdx !== -1) saveTxs(parsedTxs.filter((_, i) => i !== matchedIdx));
                                  showToast('Ledger entry deleted successfully', 'success');
                                }
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                              title="Delete Ledger Entry"
                            >
                              <Trash2 size={13} />
                            </button>
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
                    <button
                      onClick={() => showToast(rec.text, 'success')}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      Learn More
                    </button>
                    <button
                      onClick={() => {
                        const destMap = {
                          'fin-investment':    'invest',
                          'fin-spending':      'transactions',
                          'fin-emergency':     'log',
                          'fin-subscriptions': 'transactions',
                          'fin-career':        'invest',
                        };
                        const dest = destMap[rec.id] || 'overview';
                        setTab(dest);
                        showToast(`${rec.title} — opening ${dest} section`, 'success');
                      }}
                      style={{ background: 'transparent', border: '1px solid #10b981', borderRadius: 8, padding: '7px 18px', color: '#10b981', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
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
        <InvestmentRoboAdvisor f={f} score={score} financeRecords={financeRecords} onNavigate={setTab} />
      )}
    </div>
  );
}
