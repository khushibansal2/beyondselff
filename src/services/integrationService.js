/**
 * integrationService.js — Real & Deterministic Integration Layer
 *
 * Rules:
 * - ZERO Math.random() for provider data
 * - Health: reads from last uploaded CSV health records OR calls real backend
 * - Finance: parses real bank CSV via backend, categorizes transactions
 * - GitHub: calls real GitHub API via backend SyncController
 * - All synced data persists through cloud sync
 * - Provider state (connected/disconnected/lastSync) persisted to localStorage
 */

const API_BASE = 'http://localhost:8080/api';

const getAuthHeaders = () => {
  try {
    const auth = localStorage.getItem('dt_auth');
    if (auth) {
      const { token } = JSON.parse(auth);
      return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }
  } catch { /* ignore */ }
  return { 'Content-Type': 'application/json' };
};

// ── Provider definitions ──────────────────────────────────────────────────────
export const PROVIDERS = {
  HEALTH:  { id: 'health_fitbit',    name: 'Health CSV / Fitbit', category: 'health',   icon: '🏃' },
  FINANCE: { id: 'finance_plaid',    name: 'Bank CSV / Plaid',    category: 'finance',  icon: '🏦' },
  CAREER:  { id: 'career_github',    name: 'GitHub',              category: 'career',   icon: '🐙' },
};

// ── Provider state persistence ────────────────────────────────────────────────
const PROVIDER_STATE_KEY = 'dt_provider_state';

export const loadProviderStates = () => {
  try {
    const raw = localStorage.getItem(PROVIDER_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const saveProviderState = (providerId, state) => {
  try {
    const all = loadProviderStates();
    all[providerId] = { ...all[providerId], ...state };
    localStorage.setItem(PROVIDER_STATE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};

export const disconnectProvider = (providerId) => {
  saveProviderState(providerId, {
    connected: false,
    lastSync: null,
    lastSyncStatus: 'disconnected',
    errorMessage: null,
  });
};

// ── Health Integration (CSV-backed, real data from import history) ─────────────
async function syncHealthProvider() {
  // Strategy: read from the user's most recent health records in backend
  try {
    const res = await fetch(`${API_BASE}/records/health`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const records = await res.json(); // Array of health records from PostgreSQL
      if (records && records.length > 0) {
        // Deterministically average real imported records
        const latest = records.slice(-7); // Last 7 records (weekly window)
        const avg = (key) => {
          const vals = latest.map(r => r[key]).filter(v => v != null && !isNaN(v));
          return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
        };

        const metrics = {
          health: {
            sleepAvg:        avg('sleepHours') ?? avg('sleepAvg'),
            stressLevel:     avg('stressLevel'),
            workoutsPerWeek: avg('workouts') ?? avg('workoutsPerWeek'),
            waterIntake:     avg('waterGlasses') ?? avg('waterIntake'),
            moodAvg:         avg('moodScore') ?? avg('moodAvg'),
            steps:           avg('steps'),
          }
        };
        // Remove null values
        Object.keys(metrics.health).forEach(k => metrics.health[k] == null && delete metrics.health[k]);
        return { metrics, source: 'backend_records', recordCount: latest.length };
      }
    }
  } catch (err) {
    console.warn('[HealthSync] Backend unavailable, falling back to import history:', err.message);
  }

  // Fallback: read from localStorage import history
  const importHistory = getLocalImportHistory('health');
  if (importHistory && importHistory.length > 0) {
    const latest = importHistory.slice(-5);
    const avg = (key) => {
      const vals = latest.map(r => r[key]).filter(v => v != null && !isNaN(Number(v)));
      return vals.length > 0 ? parseFloat((vals.reduce((a, b) => Number(a) + Number(b), 0) / vals.length).toFixed(1)) : null;
    };
    return {
      metrics: {
        health: {
          sleepAvg:        avg('sleepHours') ?? avg('sleepAvg'),
          workoutsPerWeek: avg('workouts') ?? avg('workoutsPerWeek'),
          stressLevel:     avg('stressLevel'),
          waterIntake:     avg('waterGlasses') ?? avg('waterIntake'),
        }
      },
      source: 'local_import',
      recordCount: latest.length,
    };
  }

  throw new Error('No health data available. Upload a health CSV first.');
}

// ── Finance Integration (real bank CSV parsing via backend) ────────────────────
async function syncFinanceProvider() {
  try {
    const res = await fetch(`${API_BASE}/records/finance`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const records = await res.json();
      if (records && records.length > 0) {
        // Deterministic spending analysis
        const amounts  = records.map(r => Number(r.amount || r.expenses || 0)).filter(v => v > 0);
        const total    = amounts.reduce((a, b) => a + b, 0);
        const avgDaily = amounts.length > 0 ? Math.round(total / Math.max(amounts.length, 1)) : 0;

        // Recurring detection: transactions with same description appearing 2+ times
        const descCounts = {};
        records.forEach(r => {
          const key = (r.description || r.category || 'unknown').toLowerCase().trim();
          descCounts[key] = (descCounts[key] || 0) + 1;
        });
        const recurring = Object.entries(descCounts)
          .filter(([, count]) => count >= 2)
          .map(([desc]) => desc);

        // Category totals
        const catTotals = {};
        records.forEach(r => {
          const cat = r.category || classifyTransaction(r.description || '');
          catTotals[cat] = (catTotals[cat] || 0) + Number(r.amount || 0);
        });

        const totalExpenses   = Math.round(total);
        const subscriptionAmt = recurring.reduce((acc, desc) => {
          const matching = records.filter(r => (r.description || '').toLowerCase().includes(desc));
          return acc + matching.reduce((s, r) => s + Number(r.amount || 0), 0);
        }, 0);

        return {
          metrics: {
            finance: {
              expenses:                    totalExpenses,
              avgDailySpend:               avgDaily,
              recurringCount:              recurring.length,
              subscriptions:               Math.round(subscriptionAmt),
              recurringSubscriptionsDetected: recurring.length > 0,
              categoryBreakdown:           catTotals,
            }
          },
          source: 'backend_records',
          recordCount: records.length,
          recurringDetected: recurring,
        };
      }
    }
  } catch (err) {
    console.warn('[FinanceSync] Backend unavailable:', err.message);
  }

  // Fallback: local import history
  const importHistory = getLocalImportHistory('finance');
  if (importHistory && importHistory.length > 0) {
    const amounts = importHistory.map(r => Number(r.amount || r.expenses || 0)).filter(v => v > 0);
    const total = amounts.reduce((a, b) => a + b, 0);
    return {
      metrics: { finance: { expenses: Math.round(total), recurringSubscriptionsDetected: importHistory.length > 3 } },
      source: 'local_import',
      recordCount: importHistory.length,
    };
  }

  throw new Error('No finance data available. Upload a bank statement CSV first.');
}

// ── GitHub Integration (real GitHub API via backend) ──────────────────────────
async function syncGitHubProvider() {
  // Get GitHub username from settings or user profile
  const githubUsername = getGitHubUsername();
  if (!githubUsername) {
    throw new Error('GitHub username not set. Add it in Settings → Integrations.');
  }

  const res = await fetch(`${API_BASE}/sync/github?githubUsername=${encodeURIComponent(githubUsername)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `GitHub sync failed (${res.status})`);
  }

  const data = await res.json();

  // Map real GitHub data to career metrics
  const publicRepos    = data.publicRepos || 0;
  const totalCommits   = data.totalCommits || data.estimatedCommits || 0;
  const contributionDays = data.contributionDays || Math.min(publicRepos * 3, 30);

  // Deterministic career metrics from real GitHub data
  const codingHoursDaily   = Math.min(parseFloat(((totalCommits / 30) * 0.5).toFixed(1)), 8);
  const dsaPractice         = Math.min(Math.floor(totalCommits / 20), 5);
  const projectsCompleted   = publicRepos;
  const codingStreakDays    = contributionDays;

  return {
    metrics: {
      career: {
        codingHoursDaily:  Math.max(codingHoursDaily, 0.5),
        dsaPractice:        dsaPractice,
        projectsCompleted:  projectsCompleted,
        codingStreakDays:   codingStreakDays,
        commitCount:        totalCommits,
        publicRepos:        publicRepos,
      }
    },
    source: 'github_api',
    raw: { publicRepos, totalCommits, username: githubUsername },
  };
}

// ── Main sync dispatcher ──────────────────────────────────────────────────────
export const syncProviderData = async (providerId, lastSyncTime) => {
  const startTime = Date.now();

  try {
    let result;

    if (providerId === PROVIDERS.HEALTH.id) {
      result = await syncHealthProvider();
    } else if (providerId === PROVIDERS.FINANCE.id) {
      result = await syncFinanceProvider();
    } else if (providerId === PROVIDERS.CAREER.id) {
      result = await syncGitHubProvider();
    } else {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const payload = {
      date: new Date().toISOString().split('T')[0],
      source: providerId,
      timestamp: Date.now(),
      metrics: result.metrics,
      meta: {
        dataSource: result.source,
        recordCount: result.recordCount,
        durationMs: Date.now() - startTime,
      }
    };

    // Persist provider state
    saveProviderState(providerId, {
      connected: true,
      lastSync: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastRecordCount: result.recordCount || 0,
      errorMessage: null,
    });

    return payload;

  } catch (err) {
    // Persist failure state
    saveProviderState(providerId, {
      connected: false,
      lastSync: new Date().toISOString(),
      lastSyncStatus: 'error',
      errorMessage: err.message,
    });
    throw err;
  }
};

// ── Merge normalized metrics into history ─────────────────────────────────────
export const normalizeAndMergeMetrics = (existingHistory, newPayloads) => {
  let mergedHistory = [...(existingHistory || [])];

  newPayloads.forEach(payload => {
    const { date, source, metrics } = payload;
    const existingIndex = mergedHistory.findIndex(m => m.date === date);

    if (existingIndex >= 0) {
      const existing = mergedHistory[existingIndex];
      const h = { ...existing.health,  ...metrics.health };
      const f = { ...existing.finance, ...metrics.finance };
      const c = { ...existing.career,  ...metrics.career };
      Object.keys(h).forEach(k => h[k] === undefined && delete h[k]);
      Object.keys(f).forEach(k => f[k] === undefined && delete f[k]);
      Object.keys(c).forEach(k => c[k] === undefined && delete c[k]);
      mergedHistory[existingIndex] = {
        ...existing,
        sources: Array.from(new Set([...(existing.sources || []), source])),
        health: h, finance: f, career: c,
      };
    } else {
      mergedHistory.push({
        id: `sync-${Date.now()}-${source}`,
        date, sources: [source], ...metrics
      });
    }
  });

  // Sort chronologically, deduplicate by date
  const uniqueDates = {};
  mergedHistory.forEach(m => { uniqueDates[m.date] = m; });
  return Object.values(uniqueDates).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get GitHub username from localStorage settings */
function getGitHubUsername() {
  try {
    const settings = localStorage.getItem('dt_integration_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.githubUsername || '';
    }
    // Also try from auth profile
    const auth = localStorage.getItem('dt_auth');
    if (auth) {
      const { user } = JSON.parse(auth);
      return user?.githubUsername || '';
    }
  } catch { /* ignore */ }
  return '';
}

/** Save GitHub username to localStorage settings */
export const saveIntegrationSettings = (settings) => {
  try {
    const existing = JSON.parse(localStorage.getItem('dt_integration_settings') || '{}');
    localStorage.setItem('dt_integration_settings', JSON.stringify({ ...existing, ...settings }));
  } catch { /* ignore */ }
};

export const loadIntegrationSettings = () => {
  try {
    return JSON.parse(localStorage.getItem('dt_integration_settings') || '{}');
  } catch { return {}; }
};

/** Get local import history from DataContext state stored in localStorage */
function getLocalImportHistory(domain) {
  try {
    // Try to get from the active DataContext state in localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dt_state_'));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      if (state?.records?.[domain]?.length > 0) {
        return state.records[domain];
      }
    }
  } catch { /* ignore */ }
  return [];
}

/** Classify transaction by description keywords */
function classifyTransaction(description) {
  const d = description.toLowerCase();
  if (/netflix|spotify|amazon prime|disney|hulu|youtube/.test(d)) return 'subscriptions';
  if (/swiggy|zomato|food|restaurant|cafe|pizza|burger/.test(d)) return 'food';
  if (/uber|ola|metro|bus|petrol|fuel/.test(d)) return 'transport';
  if (/amazon|flipkart|myntra|shopping/.test(d)) return 'shopping';
  if (/electricity|water|rent|maintenance/.test(d)) return 'utilities';
  if (/gym|fitness|sport/.test(d)) return 'fitness';
  return 'other';
}
