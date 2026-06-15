import { describe, it, expect } from 'vitest';
import { validateAIOutput, detectPII } from './aiOutputValidator.js';

const CONTEXT = {
  healthScore:  { score: 72, factors: [{ name: 'Sleep Quality', value: 6.5 }] },
  financeScore: { score: 58, factors: [] },
  careerScore:  { score: 81, factors: [] },
  balance: 70,
  burnout: { risk: 35, level: 'moderate' },
  weakestDomain: { name: 'Finance', score: 58 },
};

// ─── validateAIOutput ─────────────────────────────────────────────────────────

describe('validateAIOutput — grounded responses', () => {
  it('passes when response only uses known scores', () => {
    const response = 'Your health score is 72/100 and your finance score is 58/100. Your balance is 70.';
    const { clean, hallucinated } = validateAIOutput(response, CONTEXT);
    expect(clean).toBe(true);
    expect(hallucinated).toEqual([]);
  });

  it('passes when response contains no numbers at all', () => {
    const response = 'Keep logging data to get personalised insights.';
    const { clean } = validateAIOutput(response, CONTEXT);
    expect(clean).toBe(true);
  });
});

describe('validateAIOutput — hallucinated numbers', () => {
  it('flags numbers not present in the context', () => {
    // AI says burnout is 89% but computed context says 35%
    const response = 'Your burnout risk is 89% — this is critically high and your sleep score is 72.';
    const { clean, hallucinated } = validateAIOutput(response, CONTEXT);
    expect(clean).toBe(false);
    expect(hallucinated).toContain(89);
  });

  it('flags invented score numbers', () => {
    const response = 'Your career score improved from 45 to 91 this week!';
    // 45 and 91 are not in CONTEXT
    const { clean, hallucinated } = validateAIOutput(response, CONTEXT);
    expect(clean).toBe(false);
    expect(hallucinated).toContain(45);
    expect(hallucinated).toContain(91);
  });
});

describe('validateAIOutput — edge cases', () => {
  it('returns clean for empty string', () => {
    expect(validateAIOutput('', CONTEXT).clean).toBe(true);
  });

  it('returns clean for null response without throwing', () => {
    expect(validateAIOutput(null, CONTEXT).clean).toBe(true);
  });

  it('handles missing context gracefully', () => {
    const response = 'Your score is 99.';
    expect(() => validateAIOutput(response, null)).not.toThrow();
    expect(() => validateAIOutput(response, {})).not.toThrow();
  });
});

// ─── detectPII ────────────────────────────────────────────────────────────────

describe('detectPII — strips before AI calls', () => {
  it('detects common PII fields', () => {
    const data = { name: 'Alice', email: 'alice@test.com', score: 72 };
    const found = detectPII(data);
    expect(found).toContain('name');
    expect(found).toContain('email');
    expect(found).not.toContain('score');
  });

  it('returns empty array for safe data', () => {
    const safeData = { healthScore: { score: 72 }, balance: 70 };
    expect(detectPII(safeData)).toEqual([]);
  });

  it('detects password if accidentally included', () => {
    const data = { password: 'secret123', balance: 70 };
    const found = detectPII(data);
    expect(found).toContain('password');
  });

  it('handles null without throwing', () => {
    expect(detectPII(null)).toEqual([]);
    expect(detectPII(undefined)).toEqual([]);
  });
});
