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

export async function authFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // Only default to application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    // Check if this is a stale session (token valid but user wiped from DB on server restart)
    const body = await res.json().catch(() => ({}));
    if (body.error === 'STALE_SESSION') {
      // Auto-clear the dead session so the user gets sent to the login page
      localStorage.removeItem('dt_auth');
      // Trigger a page reload to force AuthContext to pick up the cleared session
      window.location.href = '/login';
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
    const response = await authFetch('/records/health', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    // Backend returns { record, award } envelope
    const record = response.record ? fromHealthRecord(response.record) : fromHealthRecord(response);
    const award = response.award || null;
    return { record, award };
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
    const response = await authFetch('/records/finance', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    // Backend returns { record, award } envelope
    const record = response.record ? fromFinanceRecord(response.record) : fromFinanceRecord(response);
    const award = response.award || null;
    return { record, award };
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
    const response = await authFetch('/records/career', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    // Backend returns { record, award } envelope
    const record = response.record ? fromCareerRecord(response.record) : fromCareerRecord(response);
    const award = response.award || null;
    return { record, award };
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

// ─── Goals API ─────────────────────────────────────────────────────────────────

function toGoalRecord(frontendGoal) {
  return {
    title:        frontendGoal.title,
    domain:       frontendGoal.domain,
    deadline:     frontendGoal.deadline ? new Date(frontendGoal.deadline).toISOString().split('T')[0] : null,
    priority:     frontendGoal.priority || 'medium',
    status:       frontendGoal.status || 'active',
    description:  frontendGoal.targetMetric || '', // We use description to store the targetMetric
    targetValue:  frontendGoal.targetValue ?? null,
    currentValue: frontendGoal.progress ?? 0,
    milestones:   JSON.stringify(frontendGoal.milestones || []),
  };
}

function fromGoalRecord(r) {
  let parsedMilestones = [];
  try {
    parsedMilestones = r.milestones ? JSON.parse(r.milestones) : [];
  } catch (e) {
    parsedMilestones = [];
  }
  return {
    id:           r.id,
    title:        r.title,
    domain:       r.domain,
    deadline:     r.deadline,
    priority:     r.priority,
    status:       r.status,
    targetMetric: r.description,
    targetValue:  r.targetValue,
    progress:     r.currentValue,
    milestones:   parsedMilestones,
    createdAt:    r.createdAt,
  };
}

export const goalsApi = {
  isEnabled: isAuthenticated,

  async getAll() {
    const records = await authFetch('/goals');
    return records.map(fromGoalRecord);
  },

  async create(frontendGoal) {
    const body = toGoalRecord(frontendGoal);
    const saved = await authFetch('/goals', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return fromGoalRecord(saved.goal || saved);
  },

  async update(id, frontendGoal) {
    const body = toGoalRecord(frontendGoal);
    const saved = await authFetch(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return fromGoalRecord(saved);
  },

  async updateProgress(id, progress) {
    const saved = await authFetch(`/goals/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ currentValue: progress }),
    });
    return fromGoalRecord(saved.goal || saved);
  },

  async delete(id) {
    return authFetch(`/goals/${id}`, { method: 'DELETE' });
  },
};

export const gamificationApi = {
  isEnabled: isAuthenticated,

  async getSummary() {
    return authFetch('/gamification/summary', { method: 'GET' });
  },

  /** Award XP for Grind Room sessions */
  async awardXp(xp, reason = 'grind_session') {
    return authFetch('/gamification/award-xp', {
      method: 'POST',
      body: JSON.stringify({ xp, reason }),
    });
  },

  /** Re-fetch full gamification state (stats + badges) */
  async refresh() {
    return authFetch('/gamification/summary', { method: 'GET' });
  },
};

function fromEcoAction(r) {
  return {
    id: r.id,
    action: r.actionName,
    points: r.carbonSaved,
    date: r.loggedAt,
  };
}

export const sustainabilityApi = {
  isEnabled: isAuthenticated,

  async getSettings() {
    return authFetch('/sustainability/settings');
  },

  async updateSettings(syncEnabled) {
    return authFetch('/sustainability/settings', {
      method: 'PUT',
      body: JSON.stringify({ syncEnabled }),
    });
  },

  async getEcoActions() {
    const actions = await authFetch('/sustainability/eco-actions');
    return actions.map(fromEcoAction);
  },

  async createEcoAction(actionName, carbonSaved) {
    const saved = await authFetch('/sustainability/eco-actions', {
      method: 'POST',
      body: JSON.stringify({ actionName, carbonSaved }),
    });
    return fromEcoAction(saved);
  },

  async deleteEcoAction(id) {
    return authFetch(`/sustainability/eco-actions/${id}`, { method: 'DELETE' });
  },
};

// ─── ML Scores API ───────────────────────────────────────────────────────────

export const mlScoresApi = {
  isEnabled: isAuthenticated,

  async get() {
    return authFetch('/ml-scores');
  },

  async save(predictions) {
    return authFetch('/ml-scores', {
      method: 'POST',
      body: JSON.stringify(predictions),
    });
  },
};

// ─── Sync helper — fetch all records on login ────────────────────────────

/**
 * Fetch all backend records for the authenticated user.
 * Returns { health, finance, career, goals, gamification, sustainabilitySettings, ecoActions } arrays.
 * Silently returns empty arrays on any error (e.g. demo mode).
 */
export async function fetchAllRecords() {
  if (!isAuthenticated()) return { health: [], finance: [], career: [], goals: [], gamification: null, sustainabilitySettings: null, ecoActions: [], mlScores: null };

  const [health, finance, career, goals, gamification, sustainabilitySettings, ecoActions, mlScores] = await Promise.allSettled([
    healthApi.getAll(),
    financeApi.getAll(),
    careerApi.getAll(),
    goalsApi.getAll(),
    gamificationApi.getSummary(),
    sustainabilityApi.getSettings(),
    sustainabilityApi.getEcoActions(),
    mlScoresApi.get(),
  ]);

  return {
    health:  health.status  === 'fulfilled' ? health.value  : [],
    finance: finance.status === 'fulfilled' ? finance.value : [],
    career:  career.status  === 'fulfilled' ? career.value  : [],
    goals:   goals.status   === 'fulfilled' ? goals.value   : [],
    gamification: gamification.status === 'fulfilled' ? gamification.value : null,
    sustainabilitySettings: sustainabilitySettings.status === 'fulfilled' ? sustainabilitySettings.value : null,
    ecoActions: ecoActions.status === 'fulfilled' ? ecoActions.value : [],
    mlScores: mlScores.status === 'fulfilled' ? mlScores.value : null,
  };
}

