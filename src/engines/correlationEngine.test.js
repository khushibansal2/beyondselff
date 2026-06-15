import { describe, it, expect } from 'vitest';
import { computeCorrelations, strengthLabel } from './correlationEngine.js';

// ─── strengthLabel ────────────────────────────────────────────────────────────

describe('strengthLabel', () => {
  it('classifies strong correlation', () => {
    expect(strengthLabel(0.8)).toBe('strong');
    expect(strengthLabel(-0.9)).toBe('strong');
  });

  it('classifies moderate correlation', () => {
    expect(strengthLabel(0.5)).toBe('moderate');
    expect(strengthLabel(-0.45)).toBe('moderate');
  });

  it('classifies weak correlation', () => {
    expect(strengthLabel(0.25)).toBe('weak');
  });

  it('classifies negligible correlation', () => {
    expect(strengthLabel(0.1)).toBe('negligible');
    expect(strengthLabel(0)).toBe('negligible');
  });
});

// ─── computeCorrelations — empty / insufficient data ─────────────────────────

describe('computeCorrelations — empty data', () => {
  it('returns empty array when no records provided', () => {
    expect(computeCorrelations({})).toEqual([]);
  });

  it('returns empty array with fewer than 14 paired data points', () => {
    const health = Array.from({ length: 10 }, (_, i) => ({
      recordDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
      sleepHours: 7,
      stressLevel: 4,
    }));
    const career = Array.from({ length: 10 }, (_, i) => ({
      activityDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
      studyHours: 3,
    }));
    // 10 pairs < MIN_PAIRS (14) → no correlations computed
    expect(computeCorrelations({ health, career })).toEqual([]);
  });
});

// ─── computeCorrelations — known strong positive correlation ──────────────────

describe('computeCorrelations — known relationship', () => {
  it('detects strong positive sleep→study correlation', () => {
    // Build 20 days where sleep and study move together perfectly
    const health = Array.from({ length: 20 }, (_, i) => ({
      recordDate: `2024-02-${String(i + 1).padStart(2, '0')}`,
      sleepHours: 5 + (i % 4),          // cycles 5,6,7,8
      stressLevel: 5,
    }));
    const career = Array.from({ length: 20 }, (_, i) => ({
      activityDate: `2024-02-${String(i + 1).padStart(2, '0')}`,
      studyHours: 1 + (i % 4),          // cycles 1,2,3,4 — same pattern
    }));

    const results = computeCorrelations({ health, career });
    const sleepStudy = results.find(r => r.fromMetric === 'sleep' && r.toMetric === 'study');

    expect(sleepStudy).toBeDefined();
    expect(sleepStudy.r).toBeGreaterThan(0.8);   // near-perfect positive
    expect(sleepStudy.direction).toBe('positive');
    expect(sleepStudy.strength).toBe('strong');
    expect(sleepStudy.n).toBeGreaterThanOrEqual(14);
  });

  it('detects negative stress→study correlation', () => {
    // High stress days = low study hours
    const health = Array.from({ length: 20 }, (_, i) => ({
      recordDate: `2024-03-${String(i + 1).padStart(2, '0')}`,
      stressLevel: 2 + (i % 8),          // 2→9
      sleepHours: 7,
    }));
    const career = Array.from({ length: 20 }, (_, i) => ({
      activityDate: `2024-03-${String(i + 1).padStart(2, '0')}`,
      studyHours: 8 - (i % 8),          // 8→1 — inverse of stress
    }));

    const results = computeCorrelations({ health, career });
    const stressStudy = results.find(r => r.fromMetric === 'stress' && r.toMetric === 'study');

    expect(stressStudy).toBeDefined();
    expect(stressStudy.r).toBeLessThan(-0.8);
    expect(stressStudy.direction).toBe('negative');
  });
});

// ─── computeCorrelations — output shape ──────────────────────────────────────

describe('computeCorrelations — output shape', () => {
  it('every result has required fields', () => {
    const health = Array.from({ length: 20 }, (_, i) => ({
      recordDate: `2024-04-${String(i + 1).padStart(2, '0')}`,
      sleepHours: 5 + (i % 4),
      stressLevel: 3,
    }));
    const career = Array.from({ length: 20 }, (_, i) => ({
      activityDate: `2024-04-${String(i + 1).padStart(2, '0')}`,
      studyHours: 2 + (i % 4),
    }));

    const results = computeCorrelations({ health, career });
    for (const c of results) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('r');
      expect(c).toHaveProperty('n');
      expect(c).toHaveProperty('direction');
      expect(c).toHaveProperty('strength');
      expect(c).toHaveProperty('insight');
      expect(typeof c.insight).toBe('string');
      expect(c.insight.length).toBeGreaterThan(0);
    }
  });

  it('r is always between -1 and 1', () => {
    const health = Array.from({ length: 20 }, (_, i) => ({
      recordDate: `2024-05-${String(i + 1).padStart(2, '0')}`,
      sleepHours: Math.random() * 4 + 5,
      stressLevel: Math.random() * 8 + 1,
    }));
    const career = Array.from({ length: 20 }, (_, i) => ({
      activityDate: `2024-05-${String(i + 1).padStart(2, '0')}`,
      studyHours: Math.random() * 5 + 1,
    }));

    const results = computeCorrelations({ health, career });
    for (const c of results) {
      expect(Math.abs(c.r)).toBeLessThanOrEqual(1);
    }
  });

  it('never returns two results for the same edgeId (deduplication)', () => {
    const health = Array.from({ length: 20 }, (_, i) => ({
      recordDate: `2024-06-${String(i + 1).padStart(2, '0')}`,
      sleepHours: 5 + (i % 4),
      stressLevel: 3,
    }));
    const career = Array.from({ length: 20 }, (_, i) => ({
      activityDate: `2024-06-${String(i + 1).padStart(2, '0')}`,
      studyHours: 2 + (i % 4),
    }));

    const results = computeCorrelations({ health, career });
    const edgeIds = results.map(r => r.edgeId);
    const unique = new Set(edgeIds);
    expect(edgeIds.length).toBe(unique.size);
  });
});
