/**
 * Utility functions for safe mathematical operations to prevent NaN, Infinity, and undefined propagation.
 */

/**
 * Safely parse a value to a number. If invalid, returns the fallback.
 */
export function safeNum(value, fallback = 0) {
  if (value == null || value === '' || isNaN(value)) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely parse a value to a float. If invalid, returns the fallback.
 */
export function safeFloat(value, fallback = 0) {
  if (value == null || typeof value === 'boolean') return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely parse a value to an integer. If invalid, returns the fallback.
 */
export function safeInt(value, fallback = 0) {
  if (value == null || typeof value === 'boolean') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely divide two numbers. Prevents divide-by-zero Infinity or NaN.
 */
export function safeDivide(numerator, denominator, fallback = 0) {
  const num = safeNum(numerator);
  const den = safeNum(denominator);
  if (den === 0) return fallback;
  return num / den;
}
