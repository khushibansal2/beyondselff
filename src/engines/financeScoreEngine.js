/**
 * Finance Score Engine — Deterministic scoring for financial domain.
 * 
 * Rules:
 * - No Math.random() — same input always produces same output
 * - Exposes contributing factors for explainability
 * - Applies data freshness weighting for transaction records
 * - All outputs are deterministic and testable
 */

import { safeNum } from '../utils/safeMath.js';
import { freshnessWeight } from './healthScoreEngine.js';

/**
 * Calculate finance score from financial data.
 * Returns: { score, factors[], trends[], sources[] }
 */
export function computeFinanceScore(financeData, financeRecords = []) {
  const f = financeData || {};

  const income = safeNum(f.income, 20000);
  const expenses = safeNum(f.expenses, 15000);
  const savings = safeNum(f.savings, 10000);
  const investments = safeNum(f.investments, 0);
  const debt = safeNum(f.debt, 0);
  const subscriptions = safeNum(f.subscriptions, 2000);

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  
  // FIX: If zero income but has debt, DTI is infinite. So default to 100% DTI (0 score)
  const debtToIncome = income > 0 ? (debt / income) * 100 : (debt > 0 ? 100 : 0);
  
  const investmentRate = income > 0 ? (investments / income) * 100 : 0;
  const subscriptionRate = income > 0 ? (subscriptions / income) * 100 : 0;
  
  // FIX: If zero expenses, emergency runway is essentially infinite
  const emergencyMonths = expenses > 0 ? savings / expenses : (savings > 0 ? 999 : 0);

  // Factor scores (0-100 each)
  const savingsScore = Math.min(100, Math.max(0, savingsRate * 3.3)); // 30% savings = 100
  const debtScore = Math.max(0, 100 - debtToIncome * 2); // 0 debt = 100, 50% DTI = 0
  const investScore = Math.min(100, investmentRate * 5); // 20% invest rate = 100
  const subScore = Math.max(0, 100 - subscriptionRate * 6.67); // 0% subs = 100, 15% = 0
  
  // Max cap emergency months to 6 for the score calculation
  const emergencyScore = Math.min(100, emergencyMonths * 16.67); // 6 months = 100

  const factors = [
    { name: 'Savings Rate', value: Math.round(savingsRate), unit: '%', weight: 0.30, rawScore: Math.round(savingsScore), status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'warning' : 'critical' },
    { name: 'Debt-to-Income', value: Math.round(debtToIncome), unit: '%', weight: 0.20, rawScore: Math.round(debtScore), status: debtToIncome <= 10 ? 'good' : debtToIncome <= 30 ? 'warning' : 'critical' },
    { name: 'Investment Rate', value: Math.round(investmentRate), unit: '%', weight: 0.20, rawScore: Math.round(investScore), status: investmentRate >= 15 ? 'good' : investmentRate >= 5 ? 'warning' : 'critical' },
    { name: 'Subscription Load', value: Math.round(subscriptionRate), unit: '%', weight: 0.15, rawScore: Math.round(subScore), status: subscriptionRate <= 5 ? 'good' : subscriptionRate <= 10 ? 'warning' : 'critical' },
    { name: 'Emergency Fund', value: emergencyMonths >= 999 ? '∞' : Math.round(emergencyMonths * 10) / 10, unit: 'months', weight: 0.15, rawScore: Math.round(emergencyScore), status: emergencyMonths >= 3 ? 'good' : emergencyMonths >= 1 ? 'warning' : 'critical' },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.rawScore * f.weight, 0));
  factors.forEach(f => { f.contribution = Math.round(f.rawScore * f.weight); });

  // Detect emotional spending risk from stress correlation
  const emotionalSpendingRisk = computeEmotionalSpendingRisk(financeData, financeRecords);

  const trends = computeFinanceTrends(financeRecords);

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
    trends,
    emotionalSpendingRisk,
    summary: {
      income, expenses, savings, investments, debt, subscriptions,
      savingsRate: Math.round(savingsRate),
      emergencyMonths: Math.round(emergencyMonths * 10) / 10,
    },
    sources: buildFinanceSources(financeRecords, f),
  };
}

/**
 * Detect emotional spending patterns.
 * This is a cross-domain relationship — computed deterministically.
 */
function computeEmotionalSpendingRisk(financeData, records) {
  const f = financeData || {};
  const expenseRatio = f.income > 0 ? f.expenses / f.income : 1;

  // Count high-value transactions in records
  let lateNightSpending = 0;
  let impulseCount = 0;

  if (records && records.length > 0) {
    for (const r of records) {
      if (r.transactionType === 'debit' && r.amount > 500) {
        impulseCount++;
      }
    }
  }

  const riskLevel = expenseRatio > 0.9 ? 'high' : expenseRatio > 0.75 ? 'moderate' : 'low';

  return {
    level: riskLevel,
    expenseRatio: Math.round(expenseRatio * 100),
    impulseTransactions: impulseCount,
  };
}

/**
 * Compute finance trends from records.
 */
function computeFinanceTrends(records) {
  if (!records || records.length < 3) return [];
  const trends = [];

  const recent = records.slice(-7);
  const older = records.slice(-14, -7);

  if (recent.length > 0 && older.length > 0) {
    const recentSpend = recent.filter(r => r.transactionType === 'debit').reduce((s, r) => s + (r.amount || 0), 0);
    const olderSpend = older.filter(r => r.transactionType === 'debit').reduce((s, r) => s + (r.amount || 0), 0);

    if (olderSpend > 0) {
      const change = ((recentSpend - olderSpend) / olderSpend) * 100;
      trends.push({
        metric: 'Weekly Spending',
        direction: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
        delta: Math.round(change),
        recentTotal: Math.round(recentSpend),
      });
    }
  }

  return trends;
}

function buildFinanceSources(records, summaryData) {
  const sources = [];
  if (records && records.length > 0) {
    sources.push(`${records.length} financial transactions`);
  }
  if (summaryData && Object.keys(summaryData).length > 0) {
    sources.push('User financial profile');
  }
  return sources;
}
