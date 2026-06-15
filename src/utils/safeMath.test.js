import { describe, it, expect } from 'vitest';
import { safeNum, safeFloat, safeInt, safeDivide } from './safeMath.js';

describe('safeNum', () => {
  it('returns the number when valid', () => {
    expect(safeNum(42)).toBe(42);
    expect(safeNum('7.5')).toBe(7.5);
  });

  it('returns fallback for null, undefined, NaN', () => {
    expect(safeNum(null)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum(null, 99)).toBe(99);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(safeNum('abc')).toBe(0);
    expect(safeNum('', 5)).toBe(5);
  });
});

describe('safeFloat', () => {
  it('parses float strings correctly', () => {
    expect(safeFloat('3.14')).toBeCloseTo(3.14);
    expect(safeFloat(0)).toBe(0);
  });

  it('returns fallback for booleans and nulls', () => {
    expect(safeFloat(true)).toBe(0);
    expect(safeFloat(null, 1.5)).toBe(1.5);
  });
});

describe('safeInt', () => {
  it('parses integer strings correctly', () => {
    expect(safeInt('10')).toBe(10);
    expect(safeInt(7.9)).toBe(7);
  });

  it('returns fallback for booleans and nulls', () => {
    expect(safeInt(false)).toBe(0);
    expect(safeInt(null, 3)).toBe(3);
  });
});

describe('safeDivide', () => {
  it('divides correctly for normal inputs', () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(7, 4)).toBeCloseTo(1.75);
  });

  it('returns fallback instead of Infinity when denominator is zero', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });

  it('handles null inputs without throwing', () => {
    expect(safeDivide(null, 5)).toBe(0);
    expect(safeDivide(10, null)).toBe(0);
  });
});
