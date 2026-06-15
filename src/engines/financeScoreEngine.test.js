import { describe, it, expect } from 'vitest';
import { computeFinanceScore } from './financeScoreEngine.js';

describe('computeFinanceScore — score range', () => {
  it('always returns a score between 0 and 100', () => {
    const extremes = [
      { income: 0, expenses: 0, savings: 0, investments: 0, debt: 0, subscriptions: 0 },
      { income: 1000000, expenses: 10, savings: 500000, investments: 400000, debt: 0, subscriptions: 0 },
      { income: 1000, expenses: 999999, savings: 0, investments: 0, debt: 999999, subscriptions: 999 },
    ];
    for (const data of extremes) {
      const { score } = computeFinanceScore(data);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic — same input always produces same score', () => {
    const data = { income: 50000, expenses: 30000, savings: 15000, investments: 5000, debt: 10000, subscriptions: 2000 };
    const r1 = computeFinanceScore(data);
    const r2 = computeFinanceScore(data);
    expect(r1.score).toBe(r2.score);
  });
});

describe('computeFinanceScore — healthy finances score high', () => {
  it('scores well above 70 for a healthy financial profile', () => {
    const { score } = computeFinanceScore({
      income: 100000,
      expenses: 50000,   // 50% savings rate
      savings: 60000,    // 6 months emergency fund
      investments: 20000, // 20% investment rate
      debt: 0,
      subscriptions: 3000,
    });
    expect(score).toBeGreaterThan(70);
  });
});

describe('computeFinanceScore — distressed finances score low', () => {
  it('scores below 40 when expenses exceed income and debt is high', () => {
    const { score } = computeFinanceScore({
      income: 20000,
      expenses: 25000,  // spending more than earning
      savings: 0,
      investments: 0,
      debt: 100000,     // 5x income
      subscriptions: 5000,
    });
    expect(score).toBeLessThan(40);
  });
});

describe('computeFinanceScore — edge cases', () => {
  it('does not crash with zero income', () => {
    expect(() => computeFinanceScore({ income: 0, expenses: 0, savings: 0, investments: 0, debt: 0, subscriptions: 0 })).not.toThrow();
  });

  it('does not crash with null input', () => {
    expect(() => computeFinanceScore(null)).not.toThrow();
    const { score } = computeFinanceScore(null);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('handles zero income with debt — does not produce Infinity or NaN', () => {
    const { score, factors } = computeFinanceScore({ income: 0, expenses: 0, savings: 0, investments: 0, debt: 50000, subscriptions: 0 });
    expect(isNaN(score)).toBe(false);
    expect(isFinite(score)).toBe(true);
    for (const f of factors) {
      expect(isNaN(f.rawScore)).toBe(false);
    }
  });
});

describe('computeFinanceScore — factors', () => {
  it('returns exactly 5 named factors', () => {
    const { factors } = computeFinanceScore({ income: 50000, expenses: 30000, savings: 10000, investments: 5000, debt: 0, subscriptions: 1000 });
    expect(factors).toHaveLength(5);
    const names = factors.map(f => f.name);
    expect(names).toContain('Savings Rate');
    expect(names).toContain('Debt-to-Income');
    expect(names).toContain('Emergency Fund');
  });

  it('marks savings rate as critical when savings rate < 10%', () => {
    const { factors } = computeFinanceScore({ income: 100000, expenses: 95000, savings: 1000, investments: 0, debt: 0, subscriptions: 0 });
    const sr = factors.find(f => f.name === 'Savings Rate');
    expect(sr.status).toBe('critical');
  });

  it('marks debt-to-income as good when debt is zero', () => {
    const { factors } = computeFinanceScore({ income: 50000, expenses: 20000, savings: 10000, investments: 5000, debt: 0, subscriptions: 1000 });
    const dti = factors.find(f => f.name === 'Debt-to-Income');
    expect(dti.status).toBe('good');
  });
});

describe('computeFinanceScore — emotional spending risk', () => {
  it('flags high risk when expenses are 90%+ of income', () => {
    const { emotionalSpendingRisk } = computeFinanceScore({ income: 10000, expenses: 9500, savings: 0, investments: 0, debt: 0, subscriptions: 0 });
    expect(emotionalSpendingRisk.level).toBe('high');
  });

  it('detects impulse transactions from records', () => {
    const records = [
      { transactionType: 'debit', amount: 1500, transactionDate: '2024-01-10' },
      { transactionType: 'debit', amount: 800,  transactionDate: '2024-01-11' },
      { transactionType: 'credit', amount: 2000, transactionDate: '2024-01-12' },
    ];
    const { emotionalSpendingRisk } = computeFinanceScore(
      { income: 20000, expenses: 10000, savings: 5000, investments: 0, debt: 0, subscriptions: 0 },
      records
    );
    expect(emotionalSpendingRisk.impulseTransactions).toBe(2); // 2 debits > 500
  });
});
