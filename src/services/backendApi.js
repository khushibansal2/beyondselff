/**
 * backendApi.js — Centralized authenticated backend API client.
 *
 * All calls include the JWT from localStorage automatically.
 * Demo tokens (DEMO_SESSION_*) are filtered out so they never
 * reach the backend (the server would reject them anyway).
 *
 * Usage:
 *   import { healthApi, financeApi, careerApi } from '../services/backendApi';
 *   const records = await healthApi.getAll();
 *   await healthApi.create({ sleepHours: 7, stressLevel: 4, ... });
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

// ─── Auth helpers ────────────────────────────────────────────────────────────

function getToken() {
  try {
    const raw = localStorage.getItem('dt_auth');
    if (!raw) return null;
    const { token, isDemo } = JSON.parse(raw);
    // Never send demo or legacy tokens to the backend — the server blocks them
    if (isDemo || !token || token.startsWith('DEMO_SESSION_') || token.startsWith('dt_jwt_')) return null;
    return token;
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!getToken();
}

async function authFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    // Check if this is a stale session (token valid but user wiped from DB on server restart)
    const body = await res.json().catch(() => ({}));
    if (body.error === 'STALE_SESSION') {
      // Auto-clear the dead session so the user gets sent to the login page
      localStorage.removeItem('dt_auth');
      // Trigger a page reload to force AuthContext to pick up the cleared session
      window.location.href = '/';
      throw new Error('STALE_SESSION');
    }
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  // DELETE returns 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ─── Health API ───────────────────────────────────────────────────────────────

/**
 * Maps frontend health form fields → backend HealthRecord schema.
 * Backend fields: recordDate, sleepHours, stressLevel, moodScore,
 *   workoutMinutes, waterGlasses, calories, bmi, heartRate, steps
 */
function toHealthRecord(frontendRecord) {
  return {
    recordDate: (frontendRecord.date
      ? new Date(frontendRecord.date)
      : new Date()
    ).toISOString().split('T')[0],
    sleepHours:     frontendRecord.sleep      ?? frontendRecord.sleepHours     ?? null,
    stressLevel:    frontendRecord.stress     ?? frontendRecord.stressLevel    ?? null,
    moodScore:      frontendRecord.mood       ?? frontendRecord.moodScore      ?? null,
    workoutMinutes: frontendRecord.workout != null
      ? frontendRecord.workout * 30  // workoutsPerWeek → approximate minutes/day
      : (frontendRecord.workoutMinutes ?? null),
    waterGlasses:   frontendRecord.water      ?? frontendRecord.waterGlasses   ?? null,
    calories:       frontendRecord.calories   ?? null,
    bmi:            frontendRecord.bmi        ?? null,
    heartRate:      frontendRecord.heartRate  ?? null,
    steps:          frontendRecord.steps      ?? null,
  };
}

/**
 * Maps backend HealthRecord → frontend record shape used by DataContext.
 */
function fromHealthRecord(r) {
  return {
    id:               r.id,
    date:             r.recordDate,
    sleepHours:       r.sleepHours,
    sleep:            r.sleepHours,
    stressLevel:      r.stressLevel,
    stress:           r.stressLevel,
    moodScore:        r.moodScore,
    mood:             r.moodScore,
    workoutMinutes:   r.workoutMinutes,
    workoutsPerWeek:  r.workoutMinutes != null ? Math.round(r.workoutMinutes / 30) : null,
    waterGlasses:     r.waterGlasses,
    water:            r.waterGlasses,
    calories:         r.calories,
    bmi:              r.bmi,
    heartRate:        r.heartRate,
    steps:            r.steps,
    source:           r.source || 'manual',
    createdAt:        r.createdAt,
  };
}

export const healthApi = {
  isEnabled: isAuthenticated,

  async getAll() {
    const records = await authFetch('/records/health');
    return records.map(fromHealthRecord);
  },

  async create(frontendRecord) {
    const body = toHealthRecord(frontendRecord);
    const saved = await authFetch('/records/health', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return fromHealthRecord(saved);
  },

  async update(id, frontendRecord) {
    const body = toHealthRecord(frontendRecord);
    const saved = await authFetch(`/records/health/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return fromHealthRecord(saved);
  },

  async delete(id) {
    return authFetch(`/records/health/${id}`, { method: 'DELETE' });
  },
};

// ─── Finance API ──────────────────────────────────────────────────────────────

/**
 * Maps frontend finance log entry → backend FinanceRecord schema.
 * Backend fields: transactionDate, amount, category, description,
 *   transactionType, merchant, isImpulse
 */
function toFinanceRecord(frontendRecord) {
  return {
    transactionDate: (frontendRecord.date
      ? new Date(frontendRecord.date)
      : new Date()
    ).toISOString().split('T')[0],
    amount:          frontendRecord.amount ?? 0,
    category:        frontendRecord.category || 'Others',
    description:     frontendRecord.description || frontendRecord.merchant || null,
    transactionType: frontendRecord.transactionType || frontendRecord.type || 'debit',
    merchant:        frontendRecord.merchant || null,
    isImpulse:       frontendRecord.isImpulse ?? false,
  };
}

function fromFinanceRecord(r) {
  return {
    id:              r.id,
    date:            r.transactionDate,
    amount:          r.amount != null ? parseFloat(r.amount) : 0,
    category:        r.category,
    description:     r.description,
    transactionType: r.transactionType,
    type:            r.transactionType === 'credit' ? 'Credit' : 'Debit',
    merchant:        r.merchant,
    isImpulse:       r.isImpulse,
    source:          r.source || 'manual',
    createdAt:       r.createdAt,
  };
}

export const financeApi = {
  isEnabled: isAuthenticated,

  async getAll() {
    const records = await authFetch('/records/finance');
    return records.map(fromFinanceRecord);
  },

  async create(frontendRecord) {
    const body = toFinanceRecord(frontendRecord);
    const saved = await authFetch('/records/finance', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return fromFinanceRecord(saved);
  },

  async update(id, frontendRecord) {
    const body = toFinanceRecord(frontendRecord);
    const saved = await authFetch(`/records/finance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return fromFinanceRecord(saved);
  },

  async delete(id) {
    return authFetch(`/records/finance/${id}`, { method: 'DELETE' });
  },
};

// ─── Career API ───────────────────────────────────────────────────────────────

/**
 * Maps frontend career form → backend CareerRecord schema.
 * Backend fields: activityDate, studyHours, codingHours, dsaProblems,
 *   skillLearned, githubCommits, githubRepos, languages[], extractedSkills[]
 */
function toCareerRecord(frontendRecord) {
  return {
    activityDate: (frontendRecord.date
      ? new Date(frontendRecord.date)
      : new Date()
    ).toISOString().split('T')[0],
    studyHours:    frontendRecord.studyHours    ?? frontendRecord.studyHoursDaily ?? null,
    codingHours:   frontendRecord.codingHours   ?? frontendRecord.codingHoursDaily ?? null,
    dsaProblems:   frontendRecord.dsaProblems   ?? frontendRecord.dsaPractice ?? null,
    skillLearned:  frontendRecord.skillLearned  ?? null,
    githubCommits: frontendRecord.githubCommits ?? null,
    githubRepos:   frontendRecord.githubRepos   ?? null,
    languages:     Array.isArray(frontendRecord.languages) ? frontendRecord.languages : [],
    extractedSkills: Array.isArray(frontendRecord.extractedSkills)
      ? frontendRecord.extractedSkills
      : (Array.isArray(frontendRecord.skills) ? frontendRecord.skills : []),
    extractedProjects: Array.isArray(frontendRecord.extractedProjects)
      ? frontendRecord.extractedProjects
      : [],
  };
}

function fromCareerRecord(r) {
  return {
    id:              r.id,
    date:            r.activityDate,
    studyHours:      r.studyHours,
    studyHoursDaily: r.studyHours,
    codingHours:     r.codingHours,
    codingHoursDaily: r.codingHours,
    dsaProblems:     r.dsaProblems,
    dsaPractice:     r.dsaProblems,
    skillLearned:    r.skillLearned,
    githubCommits:   r.githubCommits,
    githubRepos:     r.githubRepos,
    languages:       r.languages || [],
    extractedSkills: r.extractedSkills || [],
    extractedProjects: r.extractedProjects || [],
    source:          r.source || 'manual',
    createdAt:       r.createdAt,
  };
}

export const careerApi = {
  isEnabled: isAuthenticated,

  async getAll() {
    const records = await authFetch('/records/career');
    return records.map(fromCareerRecord);
  },

  async create(frontendRecord) {
    const body = toCareerRecord(frontendRecord);
    const saved = await authFetch('/records/career', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return fromCareerRecord(saved);
  },

  async update(id, frontendRecord) {
    const body = toCareerRecord(frontendRecord);
    const saved = await authFetch(`/records/career/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return fromCareerRecord(saved);
  },

  async delete(id) {
    return authFetch(`/records/career/${id}`, { method: 'DELETE' });
  },
};

// ─── Sync helper — fetch all three domains on login ──────────────────────────

/**
 * Fetch all backend records for the authenticated user.
 * Returns { health, finance, career } arrays.
 * Silently returns empty arrays on any error (e.g. demo mode).
 */
export async function fetchAllRecords() {
  if (!isAuthenticated()) return { health: [], finance: [], career: [] };

  const [health, finance, career] = await Promise.allSettled([
    healthApi.getAll(),
    financeApi.getAll(),
    careerApi.getAll(),
  ]);

  return {
    health:  health.status  === 'fulfilled' ? health.value  : [],
    finance: finance.status === 'fulfilled' ? finance.value : [],
    career:  career.status  === 'fulfilled' ? career.value  : [],
  };
}
