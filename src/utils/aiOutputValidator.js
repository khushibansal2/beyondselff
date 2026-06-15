/**
 * Validates AI responses to catch hallucinated numbers.
 *
 * The system prompt grounds the AI to specific computed scores. If the AI
 * returns a number that doesn't appear in the context, it invented it.
 * This validator flags those mismatches so they can be filtered or logged.
 */

/**
 * Extract all integers from a string.
 */
function extractNumbers(text) {
  return (text.match(/\b\d+(\.\d+)?\b/g) || []).map(Number);
}

/**
 * Collect the "allowed" numbers from the context object — these are the
 * real computed values the AI is permitted to reference.
 */
function allowedNumbers(context) {
  const allowed = new Set();
  const add = (v) => { if (v != null && !isNaN(Number(v))) allowed.add(Number(v)); };

  add(context?.healthScore?.score);
  add(context?.financeScore?.score);
  add(context?.careerScore?.score);
  add(context?.balance);
  add(context?.burnout?.risk);
  add(context?.weakestDomain?.score);

  for (const f of context?.healthScore?.factors || []) add(f.value);
  for (const f of context?.financeScore?.factors || []) add(f.value);
  for (const f of context?.careerScore?.factors || []) add(f.value);

  // Allow common reference numbers (percentages, round numbers used in phrases)
  [0, 100, 10, 50, 3, 5, 7, 8].forEach(n => allowed.add(n));

  return allowed;
}

/**
 * Returns a list of numbers in the AI response that don't appear in the
 * computed context. An empty list means the response is clean.
 *
 * @param {string} aiResponse
 * @param {object} context - The same context object sent to the AI
 * @returns {{ clean: boolean, hallucinated: number[] }}
 */
export function validateAIOutput(aiResponse, context) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return { clean: true, hallucinated: [] };
  }

  const responseNumbers = extractNumbers(aiResponse);
  const allowed = allowedNumbers(context);

  const hallucinated = responseNumbers.filter(n => !allowed.has(n));

  return {
    clean: hallucinated.length === 0,
    hallucinated,
  };
}

/**
 * Check that PII fields are absent from a data object before it's sent to AI.
 * Returns a list of PII keys that were found (should be empty for safe data).
 *
 * @param {object} data
 * @returns {string[]}
 */
export function detectPII(data) {
  if (!data || typeof data !== 'object') return [];
  const PII_KEYS = ['name', 'email', 'password', 'id', 'avatar', 'phone', 'ssn'];
  return PII_KEYS.filter(key => key in data);
}
