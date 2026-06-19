/**
 * DataContext.jsx — Single Source of Truth
 * 
 * ALL domain data flows through this centralized state system.
 * Dashboard, Coach, Insights, Simulator, Goals, Charts, Gamification, Anomaly Detection
 * ALL derive from this same synchronized state.
 * 
 * Rules:
 * - Real imported data ALWAYS takes priority over demo seed data
 * - Demo personas = fallback/onboarding only
 * - localStorage persistence for refresh safety
 * - No duplicated state, no isolated page state
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { computeLifeBalance } from '../engines/lifeBalanceEngine';
import { detectAnomalies } from '../engines/anomalyEngine';
import { computeCorrelations } from '../engines/correlationEngine';
import { calculateRealSustainability } from '../services/sustainabilityService';

const DataContext = createContext(null);

// Initial empty state shape
const EMPTY_STATE = {
  _version: 2,
  userId: null,
  // Domain data (from user input, uploads, or demo seed)
  health: {},
  finance: {},
  career: {
    studyHoursDaily: 4,
    codingHoursDaily: 2,
    dsaPractice: 2,
    projectsCompleted: 3,
    skills: ['JavaScript', 'React'],
    gpa: 7.2,
    coursesActive: 1,
  },
  goals: [],
  timeline: [],
  anomalies: [],

  // Records from backend (imported data)
  records: {
    health: [],
    finance: [],
    career: [],
  },

  // Sustainability tracking
  sustainability: { carbonFootprint: { transport: 0, energy: 0, food: 0 }, ecoActions: [] },
  sustainabilitySyncEnabled: false, // when true, use real telemetry data for carbon calc

  // LifeMarket contracts
  lifeMarket: { contracts: [] },

  // Gamification
  gamification: {
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],
    activeChallenges: [],
  },

  // AI cache (to minimize Gemini calls)
  aiCache: {
    dashboardNarrative: null,
    dashboardNarrativeHash: null,
    coachHistory: [],
    lastInsightUpdate: null,
  },

  // Simulator state persistence
  simulatorState: { selected: [], months: 3 },

  // Metadata
  dataSource: 'none', // 'none' | 'demo' | 'imported' | 'mixed'
  lastUpdated: null,
  importHistory: [],
};

// Action types
const ACTIONS = {
  SET_USER_DATA: 'SET_USER_DATA',
  UPDATE_DOMAIN: 'UPDATE_DOMAIN',
  ADD_RECORDS: 'ADD_RECORDS',
  SET_RECORDS: 'SET_RECORDS',
  UPDATE_GOALS: 'UPDATE_GOALS',
  ADD_GOAL: 'ADD_GOAL',
  DELETE_GOAL: 'DELETE_GOAL',
  ADD_TIMELINE_EVENT: 'ADD_TIMELINE_EVENT',
  UPDATE_GAMIFICATION: 'UPDATE_GAMIFICATION',
  UPDATE_AI_CACHE: 'UPDATE_AI_CACHE',
  UPDATE_SIMULATOR_STATE: 'UPDATE_SIMULATOR_STATE',
  SET_SUSTAINABILITY_SYNC: 'SET_SUSTAINABILITY_SYNC',
  SET_SUSTAINABILITY_DATA: 'SET_SUSTAINABILITY_DATA',
  ADD_ECO_ACTION: 'ADD_ECO_ACTION',
  DELETE_ECO_ACTION: 'DELETE_ECO_ACTION',
  RESET: 'RESET',
  HYDRATE: 'HYDRATE',
};


function aggregateHealth(records, currentState = {}) {
  if (!records || !records.length) return currentState;
  const sum = { sleep: 0, mood: 0, stress: 0, workout: 0, water: 0, calories: 0, bmi: 0, weight: 0, protein: 0, carbs: 0, fat: 0 };
  const count = { sleep: 0, mood: 0, stress: 0, workout: 0, water: 0, calories: 0, bmi: 0, weight: 0, protein: 0, carbs: 0, fat: 0 };

  records.forEach(r => {
    const sleep = r.sleepHours ?? r.sleep;
    const mood = r.moodScore ?? r.mood;
    const stress = r.stressLevel ?? r.stress;
    const workout = r.workoutsPerWeek ?? (r.workoutMinutes != null ? Math.round(r.workoutMinutes / 30) : null) ?? r.workout;
    const water = r.waterGlasses ?? r.water;
    const calories = r.calories;
    const bmi = r.bmi;
    const weight = r.weight;
    const protein = r.protein;
    const carbs = r.carbs;
    const fat = r.fat;

    if (sleep != null && sleep >= 0) { sum.sleep += Math.min(12, Math.max(3, sleep)); count.sleep++; }
    if (mood != null) { sum.mood += Math.min(10, Math.max(1, mood)); count.mood++; }
    if (stress != null) { sum.stress += Math.min(10, Math.max(1, stress)); count.stress++; }
    if (workout != null) { sum.workout += workout; count.workout++; }
    if (water != null) { sum.water += water; count.water++; }
    if (calories != null) { sum.calories += calories; count.calories++; }
    if (bmi != null) { sum.bmi += bmi; count.bmi++; }
    if (weight != null) { sum.weight += weight; count.weight++; }
    if (protein != null) { sum.protein += protein; count.protein++; }
    if (carbs != null) { sum.carbs += carbs; count.carbs++; }
    if (fat != null) { sum.fat += fat; count.fat++; }
  });

  return {
    ...currentState,
    sleepAvg: count.sleep ? Math.round((sum.sleep / count.sleep) * 10) / 10 : (currentState.sleepAvg ?? 7),
    moodAvg: count.mood ? Math.round(sum.mood / count.mood) : (currentState.moodAvg ?? 7),
    stressLevel: count.stress ? Math.round(sum.stress / count.stress) : (currentState.stressLevel ?? 5),
    workoutsPerWeek: count.workout ? Math.round(sum.workout / count.workout) : (currentState.workoutsPerWeek ?? 2),
    waterIntake: count.water ? Math.round(sum.water / count.water) : (currentState.waterIntake ?? 6),
    calories: count.calories ? Math.round(sum.calories / count.calories) : (currentState.calories ?? 2000),
    bmi: count.bmi ? Math.round((sum.bmi / count.bmi) * 10) / 10 : (currentState.bmi ?? 22),
    weight: count.weight ? Math.round((sum.weight / count.weight) * 10) / 10 : (currentState.weight ?? 70),
    protein: count.protein ? Math.round(sum.protein / count.protein) : (currentState.protein ?? null),
    carbs: count.carbs ? Math.round(sum.carbs / count.carbs) : (currentState.carbs ?? null),
    fat: count.fat ? Math.round(sum.fat / count.fat) : (currentState.fat ?? null),
  };
}

function aggregateFinance(records, currentState = {}, oldRecords = []) {
  const categoryTotals = { ...(currentState.categoryTotals || {}) };
  
  // Calculate sums for old records
  let oldExpensesSum = 0;
  const oldCategorySums = {};
  if (oldRecords && oldRecords.length) {
    oldRecords.forEach(r => {
      const amt = Number(r.amount) || 0;
      const type = r.transactionType || r.type || 'debit';
      const cat = (r.category || 'others').toLowerCase();
      
      if (type.toLowerCase() === 'credit' || cat === 'income') {
        // Credit
      } else {
        oldExpensesSum += amt;
        oldCategorySums[cat] = (oldCategorySums[cat] || 0) + amt;
      }
    });
  }

  // Calculate sums for new records
  let newExpensesSum = 0;
  const newCategorySums = {};
  if (records && records.length) {
    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      const type = r.transactionType || r.type || 'debit';
      const cat = (r.category || 'others').toLowerCase();
      
      if (type.toLowerCase() === 'credit' || cat === 'income') {
        // Credit
      } else {
        newExpensesSum += amt;
        newCategorySums[cat] = (newCategorySums[cat] || 0) + amt;
      }
    });
  }

  // Calculate base expenses and category totals (offsetting old records)
  const currentExpenses = currentState.expenses || 0;
  const baseExpenses = Math.max(0, currentExpenses - oldExpensesSum);
  const totalExpenses = baseExpenses + newExpensesSum;

  // Update category totals with offset
  const updatedCategoryTotals = { ...categoryTotals };
  Object.keys(newCategorySums).forEach(cat => {
    const oldCatSum = oldCategorySums[cat] || 0;
    const currentCatVal = categoryTotals[cat] || 0;
    const baseCatVal = Math.max(0, currentCatVal - oldCatSum);
    updatedCategoryTotals[cat] = baseCatVal + newCategorySums[cat];
  });

  // Calculate income
  let totalIncome = currentState.income || 0;
  const creditSum = records ? records
    .filter(r => (r.transactionType || r.type || 'debit').toLowerCase() === 'credit' || (r.category || '').toLowerCase() === 'income')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0) : 0;

  if (creditSum > 0) {
    let oldIncomeSum = 0;
    if (oldRecords && oldRecords.length) {
      oldIncomeSum = oldRecords
        .filter(r => (r.transactionType || r.type || 'debit').toLowerCase() === 'credit' || (r.category || '').toLowerCase() === 'income')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    }
    const baseIncome = Math.max(0, (currentState.income || 0) - oldIncomeSum);
    totalIncome = baseIncome + creditSum;
  }

  return {
    ...currentState,
    income: totalIncome || 25000,
    expenses: totalExpenses,
    categoryTotals: updatedCategoryTotals,
    savings: Math.max(0, totalIncome - totalExpenses),
  };
}

function aggregateCareer(records, currentState = {}) {
  if (!records || !records.length) return currentState;

  let dsaSum = 0, dsaCount = 0;
  let studyHoursSum = 0, studyCount = 0;
  let codingHoursSum = 0, codingCount = 0;
  let latestProjects = null;
  const skillsSet = new Set(currentState.skills || []);

  records.forEach(r => {
    if (r.dsaProblems != null) { dsaSum += r.dsaProblems; dsaCount++; }
    if (r.studyHours != null) { studyHoursSum += r.studyHours; studyCount++; }
    if (r.codingHours != null) { codingHoursSum += r.codingHours; codingCount++; }
    if (r.projects != null) latestProjects = r.projects;
    if (r.skillLearned && r.skillLearned.trim()) {
      skillsSet.add(r.skillLearned.trim());
    }
  });

  return {
    ...currentState,
    skills: Array.from(skillsSet),
    dsaPractice: dsaCount ? Math.round((dsaSum / dsaCount) * 10) / 10 : (currentState.dsaPractice ?? 2),
    studyHoursDaily: studyCount ? Math.round((studyHoursSum / studyCount) * 10) / 10 : (currentState.studyHoursDaily ?? 3),
    codingHoursDaily: codingCount ? Math.round((codingHoursSum / codingCount) * 10) / 10 : (currentState.codingHoursDaily ?? 2),
    projectsCompleted: latestProjects !== null ? latestProjects : (currentState.projectsCompleted ?? 3),
  };
}

function dataReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USER_DATA: {
      // Load a full user dataset (from demo or imported)
      const { userData, source } = action.payload;
      
      // Legacy data preservation: if userId is missing but we have real data, assume it belongs to the logging-in user
      let currentUserId = state.userId;
      if (!currentUserId && state.dataSource !== 'demo' && state.dataSource !== 'none') {
        currentUserId = userData.id;
      }

      // If switching users, or logging in as a known user, try to load THEIR persisted state from localStorage
      if (userData && userData.id && userData.id !== currentUserId) {
        try {
          const raw = storageAdapter.load(userData.id);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              return migrateSchema({ ...EMPTY_STATE, ...parsed, userId: userData.id });
            }
          }
        } catch (e) {
          console.warn('DataContext: Failed to load switched user state', e);
        }
      }

      // CRITICAL FIX: Do not overwrite with AuthContext demo fallback if we already have persisted data for this user
      if (currentUserId === userData.id && state.dataSource !== 'demo' && state.dataSource !== 'none') {
        return { ...state, userId: currentUserId };
      }
      
      return {
        ...state,
        userId: userData.id || currentUserId,
        health: userData.health || {},
        finance: userData.finance || {},
        career: userData.career || {},
        goals: userData.goals || [],
        timeline: userData.timeline || [],
        dataSource: source || 'demo',
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.UPDATE_DOMAIN: {
      const { domain, data } = action.payload;
      return {
        ...state,
        [domain]: { ...state[domain], ...data },
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
        // Invalidate AI cache on data change
        aiCache: { ...state.aiCache, dashboardNarrative: null, dashboardNarrativeHash: null },
      };
    }

    case ACTIONS.ADD_RECORDS: {
      const { domain, records } = action.payload;
      const newRecords = [...(state.records[domain] || []), ...records];
      let domainUpdate = {};
      if (domain === 'health') {
        domainUpdate = { health: aggregateHealth(newRecords, state.health) };
      } else if (domain === 'finance') {
        domainUpdate = { finance: aggregateFinance(newRecords, state.finance, state.records.finance) };
      } else if (domain === 'career') {
        domainUpdate = { career: aggregateCareer(newRecords, state.career) };
      }
      return {
        ...state,
        records: {
          ...state.records,
          [domain]: newRecords,
        },
        ...domainUpdate,
        dataSource: state.dataSource === 'none' || state.dataSource === 'demo' ? 'imported' : state.dataSource,
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
        aiCache: { ...state.aiCache, dashboardNarrative: null, dashboardNarrativeHash: null },
      };
    }

    case ACTIONS.SET_RECORDS: {
      const { domain, records } = action.payload;
      let domainUpdate = {};
      if (domain === 'health') {
        // Use empty base so backend records are the sole source of truth — prevents
        // localStorage state from a different browser session tainting the aggregate.
        domainUpdate = { health: aggregateHealth(records, {}) };
      } else if (domain === 'finance') {
        domainUpdate = { finance: aggregateFinance(records, {}, []) };
      } else if (domain === 'career') {
        domainUpdate = { career: aggregateCareer(records, {}) };
      }
      return {
        ...state,
        records: {
          ...state.records,
          [domain]: records,
        },
        ...domainUpdate,
        dataSource: 'imported',
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
        aiCache: { ...state.aiCache, dashboardNarrative: null, dashboardNarrativeHash: null },
      };
    }

    case ACTIONS.UPDATE_GOALS: {
      return {
        ...state,
        goals: action.payload,
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.ADD_GOAL: {
      return {
        ...state,
        goals: [...state.goals, action.payload],
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.DELETE_GOAL: {
      return {
        ...state,
        goals: state.goals.filter(g => g.id !== action.payload),
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.ADD_TIMELINE_EVENT: {
      return {
        ...state,
        timeline: [action.payload, ...state.timeline].slice(0, 100), // Keep last 100
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.UPDATE_GAMIFICATION: {
      return {
        ...state,
        gamification: { ...state.gamification, ...action.payload },
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.UPDATE_AI_CACHE: {
      return {
        ...state,
        aiCache: { ...state.aiCache, ...action.payload },
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.UPDATE_SIMULATOR_STATE: {
      return {
        ...state,
        simulatorState: { ...(state.simulatorState || {}), ...action.payload },
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.SET_SUSTAINABILITY_SYNC: {
      return {
        ...state,
        sustainabilitySyncEnabled: !!action.payload,
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.SET_SUSTAINABILITY_DATA: {
      const { syncEnabled, ecoActions } = action.payload;
      return {
        ...state,
        sustainabilitySyncEnabled: syncEnabled,
        sustainability: {
          ...state.sustainability,
          ecoActions: ecoActions || [],
        },
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.ADD_ECO_ACTION: {
      return {
        ...state,
        sustainability: {
          ...state.sustainability,
          ecoActions: [action.payload, ...(state.sustainability?.ecoActions || [])],
        },
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.DELETE_ECO_ACTION: {
      return {
        ...state,
        sustainability: {
          ...state.sustainability,
          ecoActions: (state.sustainability?.ecoActions || []).filter(a => a.id !== action.payload && a.date !== action.payload),
        },
        _revision: (state._revision || 0) + 1,
      };
    }

    case ACTIONS.RESET: {
      return { ...EMPTY_STATE };
    }

    case ACTIONS.HYDRATE: {
      if (!action.payload || typeof action.payload !== 'object') return state;
      // Conflict resolution: only hydrate if incoming state is newer using monotonic revision
      const currentRevision = state._revision || 0;
      const incomingRevision = action.payload._revision || 0;
      
      // If incoming revision is strictly less than or equal to current, ignore it to prevent overwriting newer local edits
      if (incomingRevision <= currentRevision) return state;
      
      return migrateSchema({ ...EMPTY_STATE, ...action.payload });
    }

    default:
      return state;
  }
}

import { storageAdapter } from '../utils/storageAdapter';
import { trainWhatIfModel, getMLDashboardScores, getMLCascadeEffects } from '../services/whatIfService';

// localStorage key (maintained in adapter)
const STORAGE_KEY = storageAdapter.getKeyPrefix();

function migrateSchema(data) {
  if (!data || typeof data !== 'object') return data;
  let migrated = { ...data };
  
  if (!migrated._version || migrated._version < 2) {
    // Migration from v1 to v2
    if (!migrated.records) migrated.records = { health: [], finance: [], career: [] };
    if (!migrated.aiCache) migrated.aiCache = { dashboardNarrative: null, coachHistory: [] };
    migrated._version = 2;
  }
  
  // Ensure _revision exists
  if (typeof migrated._revision !== 'number') {
    migrated._revision = 0;
  }
  
  if (!migrated.simulatorState) migrated.simulatorState = { selected: [], months: 3 };
  if (!migrated.sustainability) migrated.sustainability = { carbonFootprint: { transport: 0, energy: 0, food: 0 }, ecoActions: [] };
  if (migrated.sustainabilitySyncEnabled === undefined) migrated.sustainabilitySyncEnabled = false;
  if (!migrated.lifeMarket) migrated.lifeMarket = { contracts: [] };

  return migrated;
}

function loadPersistedState() {
  try {
    const authRaw = storageAdapter.getAuth();
    let userId = null;
    if (authRaw) {
      try {
        userId = JSON.parse(authRaw)?.user?.id;
      } catch (e) {}
    }

    if (userId) {
      let raw = storageAdapter.load(userId);
      if (!raw) {
        // Try migrating legacy data
        const legacyRaw = storageAdapter.loadLegacy();
        if (legacyRaw) {
          try {
            const parsedLegacy = JSON.parse(legacyRaw);
            if (!parsedLegacy.userId || parsedLegacy.userId === userId) {
              raw = legacyRaw;
              storageAdapter.save(userId, JSON.parse(legacyRaw));
              storageAdapter.removeLegacy();
            }
          } catch (e) {}
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid state shape');
        return migrateSchema({ ...EMPTY_STATE, ...parsed, userId });
      }
    } else {
      // If no auth user found, try to load legacy un-scoped data
      const raw = storageAdapter.loadLegacy();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid state shape');
        return migrateSchema({ ...EMPTY_STATE, ...parsed });
      }
    }
  } catch (e) {
    console.warn('DataContext: Failed to load persisted state. Falling back to safe defaults.', e);
  }
  return null;
}

function persistState(state) {
  storageAdapter.save(state.userId, state);
}

import { useAuth } from './AuthContext';
import { fetchAllRecords, sustainabilityApi, gamificationApi } from '../services/backendApi';

export function DataProvider({ children }) {
  const { registerAuthCallback } = useAuth();
  const [state, dispatch] = useReducer(dataReducer, EMPTY_STATE, () => {
    return loadPersistedState() || EMPTY_STATE;
  });

  // Pulls all backend records and dispatches them into state
  const syncFromBackend = useCallback(async () => {
    try {
      const { health, finance, career, goals, gamification, sustainabilitySettings, ecoActions } = await fetchAllRecords();
      if (health.length)  dispatch({ type: ACTIONS.SET_RECORDS, payload: { domain: 'health',  records: health  } });
      if (finance.length) dispatch({ type: ACTIONS.SET_RECORDS, payload: { domain: 'finance', records: finance } });
      if (career.length)  dispatch({ type: ACTIONS.SET_RECORDS, payload: { domain: 'career',  records: career  } });
      if (goals && goals.length > 0) dispatch({ type: ACTIONS.UPDATE_GOALS, payload: goals });
      if (gamification && gamification.stats) {
        dispatch({ type: ACTIONS.UPDATE_GAMIFICATION, payload: {
          xp: gamification.stats.xp,
          level: gamification.stats.level,
          streak: gamification.stats.currentStreak,
          badges: gamification.badges || [],
        } });
      }
      dispatch({
        type: ACTIONS.SET_SUSTAINABILITY_DATA,
        payload: {
          syncEnabled: sustainabilitySettings ? sustainabilitySettings.syncEnabled : false,
          ecoActions: ecoActions || [],
        }
      });
    } catch (e) {
      console.warn('DataContext: Backend sync failed (non-critical):', e.message);
    }
  }, []);

  // Sync with AuthContext on login/logout
  useEffect(() => {
    registerAuthCallback(async (authUser) => {
      if (!authUser) {
        dispatch({ type: ACTIONS.RESET });
      } else {
        dispatch({
          type: ACTIONS.SET_USER_DATA,
          payload: { userData: authUser, source: authUser.persona === 'New User' ? 'none' : 'demo' },
        });

        // For real (non-demo) accounts, pull saved records from the Spring Boot backend
        const isRealUser = !authUser.persona || authUser.persona === 'New User';
        const isRealToken = (() => {
          try {
            const raw = localStorage.getItem('dt_auth');
            if (!raw) return false;
            const { isDemo, token } = JSON.parse(raw);
            return !isDemo && token && !token.startsWith('DEMO_SESSION_');
          } catch { return false; }
        })();

        if (isRealToken) {
          await syncFromBackend();
        }
      }
    });
  }, [registerAuthCallback]);

  // Re-fetch from backend when tab becomes visible (keeps multi-browser sessions in sync)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const raw = localStorage.getItem('dt_auth');
        if (!raw) return;
        const { isDemo, token } = JSON.parse(raw);
        if (isDemo || !token || token.startsWith('DEMO_SESSION_')) return;
        await syncFromBackend();
      } catch { /* non-critical */ }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncFromBackend]);

  // Persist on every state change (debounced effect)
  useEffect(() => {
    const timer = setTimeout(() => persistState(state), 300);
    return () => clearTimeout(timer);
  }, [state]);

  // Multi-tab sync
  useEffect(() => {
    const handleStorage = (e) => {
      if (state.userId && e.key === `${STORAGE_KEY}_${state.userId}`) {
        try {
          if (e.newValue) {
            const incoming = JSON.parse(e.newValue);
            if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
              dispatch({ type: ACTIONS.HYDRATE, payload: incoming });
            }
          }
        } catch (err) {
          console.warn("DataContext: Failed to parse multi-tab state sync", err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state.userId]);

  // ML state — declared before computed useMemo so mlCascade is available as a dep
  const [mlRawScores, setMlRawScores] = useState(null);
  const [mlCascade, setMlCascade] = useState(null);

  // Computed scores — derived from engines (deterministic, memoized)
  const computed = useMemo(() => {
    const userData = {
      health: state.health,
      finance: state.finance,
      career: state.career,
    };

    const hasData = Object.keys(state.health).length > 0 ||
                    Object.keys(state.finance).length > 0 ||
                    Object.keys(state.career).length > 0;

    try {
      const lifeBalance = computeLifeBalance(userData, state.records, mlCascade);
      const anomalies = detectAnomalies(userData, state.records);
      const correlations = computeCorrelations(state.records);
      return {
        ...lifeBalance,
        lifeBalance,
        anomalies,
        correlations,
        hasData,
      };
    } catch (e) {
      console.error('DataContext: Score computation error', e);
      return { lifeBalance: null, anomalies: [], hasData: false };
    }
  }, [state.health, state.finance, state.career, state.records, mlCascade]);

  // ── ML scores (XGBoost, async) ────────────────────────────────────────────
  // Replaces deterministic engine scores on the dashboard once the model is ready.
  // Falls back to computed (deterministic) while loading or when the ML service
  // is offline — consumers always see a score, never null.
  const mlModelTrainedRef = useRef(false);
  const mlPredictTimerRef = useRef(null);

  // Train once when records change (records = training data)
  useEffect(() => {
    let cancelled = false;
    async function trainModel() {
      mlModelTrainedRef.current = false;
      await trainWhatIfModel(
        state.records.health,
        state.records.finance,
        state.records.career,
      );
      if (!cancelled) mlModelTrainedRef.current = true;
    }
    trainModel();
    return () => { cancelled = true; };
  }, [state.records]);

  // Re-predict (debounced 400ms) when current habit values change
  useEffect(() => {
    clearTimeout(mlPredictTimerRef.current);
    mlPredictTimerRef.current = setTimeout(async () => {
      const userData = { health: state.health, finance: state.finance, career: state.career };
      try {
        const [scoreResult, cascadeResult] = await Promise.all([
          getMLDashboardScores(userData, state.records),
          getMLCascadeEffects(userData),
        ]);
        if (scoreResult?.predictions) setMlRawScores(scoreResult.predictions);
        if (cascadeResult?.pairs) setMlCascade(cascadeResult);
      } catch {
        // silently fall back to deterministic
      }
    }, 400);
    return () => clearTimeout(mlPredictTimerRef.current);
  }, [state.health, state.finance, state.career, state.records]);

  // Merge ML scores into computed — override the three domain scores + balance
  const computedWithML = useMemo(() => {
    if (!mlRawScores || !computed) return computed;
    const h = Math.round(Math.max(0, Math.min(100, mlRawScores.health_score  ?? computed.healthScore?.score  ?? 50)));
    const f = Math.round(Math.max(0, Math.min(100, mlRawScores.finance_score ?? computed.financeScore?.score ?? 50)));
    const c = Math.round(Math.max(0, Math.min(100, mlRawScores.career_score  ?? computed.careerScore?.score  ?? 50)));
    const burnoutPenalty = computed.penalties?.burnoutPenalty ?? 0;
    const sleepPenalty   = computed.penalties?.sleepPenalty   ?? 0;
    const mlBalance = Math.round(Math.max(0, Math.min(100, h * 0.35 + f * 0.30 + c * 0.35 - burnoutPenalty - sleepPenalty)));
    return {
      ...computed,
      healthScore:  { ...computed.healthScore,  score: h },
      financeScore: { ...computed.financeScore, score: f },
      careerScore:  { ...computed.careerScore,  score: c },
      balance: mlBalance,
      mlScoresActive: true,
    };
  }, [computed, mlRawScores]);

  // Computed sustainability — driven by real telemetry when sync is enabled
  const computedSustainability = useMemo(() => {
    if (!state.sustainabilitySyncEnabled) return null;
    try {
      return calculateRealSustainability({
        financeRecords: state.records?.finance || [],
        healthRecords:  state.records?.health  || [],
        ecoActions:     state.sustainability?.ecoActions || [],
      });
    } catch (e) {
      console.error('DataContext: Sustainability calculation error', e);
      return null;
    }
  }, [
    state.sustainabilitySyncEnabled,
    state.records?.finance,
    state.records?.health,
    state.sustainability?.ecoActions,
  ]);

  // Action dispatchers
  const actions = useMemo(() => ({
    setUserData: (userData, source = 'demo') => {
      dispatch({ type: ACTIONS.SET_USER_DATA, payload: { userData, source } });
    },

    updateDomain: (domain, data) => {
      dispatch({ type: ACTIONS.UPDATE_DOMAIN, payload: { domain, data } });
    },

    addRecords: (domain, records) => {
      dispatch({ type: ACTIONS.ADD_RECORDS, payload: { domain, records } });
    },

    setRecords: (domain, records) => {
      dispatch({ type: ACTIONS.SET_RECORDS, payload: { domain, records } });
    },

    updateGoals: (goals) => {
      dispatch({ type: ACTIONS.UPDATE_GOALS, payload: goals });
    },

    addGoal: (goal) => {
      dispatch({ type: ACTIONS.ADD_GOAL, payload: { ...goal, id: goal.id || `goal-${Date.now()}` } });
    },

    deleteGoal: (goalId) => {
      dispatch({ type: ACTIONS.DELETE_GOAL, payload: goalId });
    },

    addTimelineEvent: (event) => {
      dispatch({ type: ACTIONS.ADD_TIMELINE_EVENT, payload: { ...event, date: event.date || new Date().toISOString() } });
    },

    updateGamification: (data) => {
      dispatch({ type: ACTIONS.UPDATE_GAMIFICATION, payload: data });
    },

    refreshGamification: async () => {
      if (gamificationApi.isEnabled()) {
        try {
          const data = await gamificationApi.refresh();
          if (data && data.stats) {
            dispatch({
              type: ACTIONS.UPDATE_GAMIFICATION,
              payload: {
                xp: data.stats.xp,
                level: data.stats.level,
                streak: data.stats.currentStreak,
                badges: data.badges || [],
              }
            });
          }
        } catch (e) {
          console.warn('Failed to refresh gamification:', e);
        }
      }
    },

    updateAICache: (data) => {
      dispatch({ type: ACTIONS.UPDATE_AI_CACHE, payload: data });
    },

    updateSimulatorState: (data) => {
      dispatch({ type: ACTIONS.UPDATE_SIMULATOR_STATE, payload: data });
    },

    setSustainabilitySyncEnabled: async (enabled) => {
      dispatch({ type: ACTIONS.SET_SUSTAINABILITY_SYNC, payload: enabled });
      if (sustainabilityApi.isEnabled()) {
        try {
          await sustainabilityApi.updateSettings(enabled);
        } catch (e) {
          console.warn("Failed to sync sustainability settings to backend:", e);
        }
      }
    },

    logEcoAction: async (actionName, carbonSaved) => {
      if (sustainabilityApi.isEnabled()) {
        try {
          const saved = await sustainabilityApi.createEcoAction(actionName, carbonSaved);
          dispatch({ type: ACTIONS.ADD_ECO_ACTION, payload: saved });
          return saved;
        } catch (e) {
          console.warn("Failed to save eco action to backend, falling back to local:", e);
        }
      }
      // Demo / offline fallback
      const localEntry = { action: actionName, points: carbonSaved, date: new Date().toISOString(), id: `local-${Date.now()}` };
      dispatch({ type: ACTIONS.ADD_ECO_ACTION, payload: localEntry });
      return localEntry;
    },

    deleteEcoAction: async (idOrDate) => {
      dispatch({ type: ACTIONS.DELETE_ECO_ACTION, payload: idOrDate });
      if (sustainabilityApi.isEnabled() && typeof idOrDate === 'number') {
        try {
          await sustainabilityApi.deleteEcoAction(idOrDate);
        } catch (e) {
          console.warn("Failed to delete eco action from backend:", e);
        }
      }
    },

    reset: () => {
      dispatch({ type: ACTIONS.RESET });
    },
  }), []);

  const value = useMemo(() => ({
    // Raw state
    ...state,

    // Computed scores — ML (XGBoost) when ready, deterministic as fallback
    computed: computedWithML,
    // Raw ML cascade data (XGBoost cross-domain impact pairs)
    mlCascade,

    // Computed sustainability (from real telemetry when sync is enabled)
    computedSustainability,

    // Expose anomalies at the top level
    anomalies: computed?.anomalies || [],

    // Action dispatchers
    ...actions,

    // Convenience getters
    hasRealData: state.dataSource === 'imported' || state.dataSource === 'mixed',
    isDemo: state.dataSource === 'demo',
    isEmpty: state.dataSource === 'none',
  }), [state, computedWithML, computedSustainability, actions]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export default DataContext;

