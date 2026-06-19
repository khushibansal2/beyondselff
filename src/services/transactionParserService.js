// Privacy-first: all parsing runs in the browser — no raw SMS data leaves the device.

import { stripTextPII } from '../utils/piiStrip.js';

// ── OTP / Sensitive detection ───────────────────────────────────────────────
const OTP_PATTERNS = [
  /\botp\b/i, /one.?time.?pass(word)?/i, /do.?not.?share/i,
  /verification.?code/i, /\d{4,8}.{0,20}otp/i, /temp(orary)?.?pass/i,
];

export function detectOTP(message) {
  return OTP_PATTERNS.some(p => p.test(message));
}

// ── Amount extraction ────────────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
  /(?:paid|spent|debited|charged|payment\s+of|amount\s+of)\s+(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:transferred|sent)\s+(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

function extractAmount(msg) {
  for (const p of AMOUNT_PATTERNS) {
    const m = msg.match(p);
    if (m) return parseFloat(m[1].replace(/,/g, ''));
  }
  return 0;
}

// ── Merchant / Category map ──────────────────────────────────────────────────
export const MERCHANT_MAP = {
  swiggy: { name: 'Swiggy', category: 'Food' },
  zomato: { name: 'Zomato', category: 'Food' },
  dominos: { name: "Domino's", category: 'Food' },
  'domino\'s': { name: "Domino's", category: 'Food' },
  mcdonald: { name: "McDonald's", category: 'Food' },
  kfc: { name: 'KFC', category: 'Food' },
  starbucks: { name: 'Starbucks', category: 'Food' },
  barbeque: { name: 'Barbeque Nation', category: 'Food' },
  uber: { name: 'Uber', category: 'Transport' },
  ola: { name: 'Ola', category: 'Transport' },
  rapido: { name: 'Rapido', category: 'Transport' },
  irctc: { name: 'IRCTC', category: 'Transport' },
  redbus: { name: 'redBus', category: 'Transport' },
  amazon: { name: 'Amazon', category: 'Shopping' },
  flipkart: { name: 'Flipkart', category: 'Shopping' },
  myntra: { name: 'Myntra', category: 'Shopping' },
  meesho: { name: 'Meesho', category: 'Shopping' },
  ajio: { name: 'AJIO', category: 'Shopping' },
  nykaa: { name: 'Nykaa', category: 'Shopping' },
  netflix: { name: 'Netflix', category: 'Entertainment' },
  spotify: { name: 'Spotify', category: 'Entertainment' },
  hotstar: { name: 'Disney+ Hotstar', category: 'Entertainment' },
  'youtube premium': { name: 'YouTube Premium', category: 'Entertainment' },
  bookmyshow: { name: 'BookMyShow', category: 'Entertainment' },
  pvr: { name: 'PVR Cinemas', category: 'Entertainment' },
  bigbasket: { name: 'BigBasket', category: 'Groceries' },
  'big basket': { name: 'BigBasket', category: 'Groceries' },
  blinkit: { name: 'Blinkit', category: 'Groceries' },
  zepto: { name: 'Zepto', category: 'Groceries' },
  instamart: { name: 'Instamart', category: 'Groceries' },
  apollo: { name: 'Apollo Pharmacy', category: 'Health' },
  netmeds: { name: 'Netmeds', category: 'Health' },
  '1mg': { name: '1mg', category: 'Health' },
  practo: { name: 'Practo', category: 'Health' },
  coursera: { name: 'Coursera', category: 'Education' },
  udemy: { name: 'Udemy', category: 'Education' },
  byju: { name: "BYJU'S", category: 'Education' },
  unacademy: { name: 'Unacademy', category: 'Education' },
  airtel: { name: 'Airtel', category: 'Bills' },
  jio: { name: 'Jio', category: 'Bills' },
  bsnl: { name: 'BSNL', category: 'Bills' },
  electricity: { name: 'Electricity Board', category: 'Bills' },
  'tata power': { name: 'Tata Power', category: 'Bills' },
  bescom: { name: 'BESCOM', category: 'Bills' },
  zerodha: { name: 'Zerodha', category: 'Investments' },
  groww: { name: 'Groww', category: 'Investments' },
  upstox: { name: 'Upstox', category: 'Investments' },
};

// ── Bank patterns ────────────────────────────────────────────────────────────
const BANK_PATTERNS = [
  { name: 'HDFC', re: /\bhdfc\b/i },
  { name: 'SBI', re: /\bsbi\b|state bank/i },
  { name: 'ICICI', re: /\bicici\b/i },
  { name: 'Axis', re: /\baxis\b/i },
  { name: 'Kotak', re: /\bkotak\b/i },
  { name: 'Yes Bank', re: /yes bank/i },
  { name: 'Punjab National', re: /\bpnb\b|punjab national/i },
  { name: 'Canara', re: /canara/i },
  { name: 'UPI', re: /\bupi\b/i },
  { name: 'Paytm', re: /paytm/i },
  { name: 'PhonePe', re: /phonepe/i },
  { name: 'GPay', re: /gpay|google pay/i },
];

function extractBank(msg) {
  for (const { name, re } of BANK_PATTERNS) {
    if (re.test(msg)) return name;
  }
  return 'Unknown';
}

function extractPaymentMode(msg) {
  if (/credit.?card/i.test(msg)) return 'Credit Card';
  if (/debit.?card/i.test(msg)) return 'Debit Card';
  if (/\bupi\b/i.test(msg)) return 'UPI';
  if (/net.?banking/i.test(msg)) return 'Net Banking';
  if (/wallet/i.test(msg)) return 'Wallet';
  if (/neft|rtgs|imps/i.test(msg)) return 'Bank Transfer';
  return 'UPI';
}

function extractMerchant(msg) {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(MERCHANT_MAP)) {
    if (lower.includes(key)) return { name: val.name, category: val.category };
  }
  // Try to extract from "on/at/to [Merchant]"
  const m = msg.match(/(?:\bon\b|\bat\b|\bto\b|\bfor\b)\s+([A-Z][a-zA-Z0-9\s&'.]{2,24}?)(?:\s+using|\s+via|\s+with|[.,]|$)/);
  if (m) return { name: m[1].trim(), category: 'Others' };
  return { name: 'Unknown Merchant', category: 'Others' };
}

// ── Main parser ──────────────────────────────────────────────────────────────
export function parseTransactionSMS(message) {
  if (!message?.trim()) return null;
  const amount = extractAmount(message);
  if (amount <= 0) return null;

  const { name: merchant, category } = extractMerchant(message);
  const bank = extractBank(message);
  const paymentMode = extractPaymentMode(message);
  const type = /\b(credited|received|added|deposited|cashback|refund)\b/i.test(message) ? 'Credit' : 'Debit';

  return {
    id: Date.now(),
    amount,
    merchant,
    category,
    bank,
    type,
    paymentMode,
    rawMessage: stripTextPII(message),
    parsedAt: new Date().toISOString(),
    source: 'manual',
  };
}

// ── Category metadata ────────────────────────────────────────────────────────
export const CATEGORY_META = {
  Food:          { icon: '🍔', color: '#f43f5e', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
  Transport:     { icon: '🚗', color: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  Shopping:      { icon: '🛍️', color: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  Entertainment: { icon: '🎬', color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  Bills:         { icon: '⚡', color: '#8b5cf6', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  Health:        { icon: '💊', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  Education:     { icon: '📚', color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
  Groceries:     { icon: '🛒', color: '#84cc16', bg: 'bg-lime-500/10', border: 'border-lime-500/20', text: 'text-lime-400' },
  Investments:   { icon: '📈', color: '#a78bfa', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  Others:        { icon: '💰', color: '#94a3b8', bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400' },
};

// ── Sample messages for the paste-example buttons ────────────────────────────
export const SAMPLE_MESSAGES = [
  { label: 'Swiggy', msg: 'Rs. 450 spent on Swiggy using HDFC Credit Card. Available balance: Rs. 24,550.' },
  { label: 'Uber', msg: 'INR 320 debited from SBI account for Uber ride. UPI Ref: 4521879632.' },
  { label: 'Amazon', msg: 'Payment of Rs. 1,299 to Amazon confirmed via ICICI Debit Card. Order #408-771.' },
  { label: 'Netflix', msg: 'Rs. 649 charged to your Axis Credit Card for Netflix subscription renewal.' },
  { label: 'Zomato', msg: 'Your payment of ₹380 to Zomato was successful via PhonePe UPI.' },
  { label: 'BigBasket', msg: 'INR 2,150 paid to BigBasket using HDFC Bank UPI. Transaction ID: BB29481.' },
];
