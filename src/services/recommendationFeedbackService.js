/**
 * Recommendation Feedback Service
 * Persists user accept/dismiss/done actions per recommendation.
 * Used to sort and filter recommendations adaptively on next render.
 */

const KEY = 'dt_rec_feedback';

export function loadFeedback() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function saveFeedback(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { /* ignore */ }
}

/** action: 'accept' | 'dismiss' | 'done' */
export function setFeedback(recId, action) {
  const all = loadFeedback();
  all[recId] = { action, timestamp: new Date().toISOString() };
  saveFeedback(all);
}

export function clearFeedback(recId) {
  const all = loadFeedback();
  delete all[recId];
  saveFeedback(all);
}

/**
 * Sort recommendations adaptively:
 * - 'done' → moved to bottom
 * - 'dismiss' → moved toward bottom
 * - 'accept' → kept near top
 * - no feedback → natural order
 */
export function sortByFeedback(recs, feedback) {
  const order = { accept: 0, undefined: 1, dismiss: 2, done: 3 };
  return [...recs].sort((a, b) => {
    const fa = feedback[a.id]?.action ?? 'undefined';
    const fb = feedback[b.id]?.action ?? 'undefined';
    return (order[fa] ?? 1) - (order[fb] ?? 1);
  });
}
