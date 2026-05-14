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

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { computeLifeBalance } from '../engines/lifeBalanceEngine';
import { evaluateAnomalies } from '../engines/anomalyEngine';

const DataContext = createContext(null);

// Initial empty state shape
const EMPTY_STATE = {
  _version: 2,
  userId: null,
  // Domain data (from user input, uploads, or demo seed)
  health: {},
  finance: {},
  career: {},
  goals: [],
  timeline: [],
  anomalies: [],
  metricHistory: [],
  feedbackHistory: [],
  _revision: 0,

  // Records from backend (imported data)
  records: {
    health: [],
    finance: [],
    career: [],
  },

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
  RECORD_FEEDBACK: 'RECORD_FEEDBACK',
  RESET: 'RESET',
  HYDRATE: 'HYDRATE',
};

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
      console.log(`[DataContext] UPDATE_DOMAIN: ${domain}`, data);
      
      const newDomainState = { ...state[domain], ...data };
      const historyEntry = { date: Date.now(), domain, oldState: state[domain] || {}, newState: newDomainState };
      
      console.log(`[DataContext] Previous Anomalies Count: ${state.anomalies?.length || 0}`);
      const newAnomalies = evaluateAnomalies(state, domain, data, state.anomalies || [], state.metricHistory || []);
      console.log(`[DataContext] Next Anomalies Count: ${newAnomalies.length}`);
      
      return {
        ...state,
        [domain]: newDomainState,
        anomalies: newAnomalies,
        metricHistory: [...(state.metricHistory || []), historyEntry].slice(-50), // keep last 50 events
        dataSource: state.dataSource === 'demo' ? 'mixed' : (state.dataSource === 'none' ? 'imported' : state.dataSource),
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
        // Invalidate AI cache on data change
        aiCache: { ...state.aiCache, dashboardNarrative: null, dashboardNarrativeHash: null },
      };
    }

    case ACTIONS.ADD_RECORDS: {
      const { domain, records } = action.payload;
      return {
        ...state,
        records: {
          ...state.records,
          [domain]: [...(state.records[domain] || []), ...records],
        },
        dataSource: state.dataSource === 'none' || state.dataSource === 'demo' ? 'imported' : state.dataSource,
        lastUpdated: new Date().toISOString(),
        _revision: (state._revision || 0) + 1,
        aiCache: { ...state.aiCache, dashboardNarrative: null, dashboardNarrativeHash: null },
      };
    }

    case ACTIONS.SET_RECORDS: {
      const { domain, records } = action.payload;
      return {
        ...state,
        records: {
          ...state.records,
          [domain]: records,
        },
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

    case ACTIONS.RECORD_FEEDBACK: {
      const { recId, action: feedbackAction, category } = action.payload;
      const historyEntry = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        recId,
        action: feedbackAction,
        category,
        timestamp: Date.now()
      };
      
      console.log(`[DataContext] RECORD_FEEDBACK: ${feedbackAction} for ${recId}`);
      
      return {
        ...state,
        feedbackHistory: [historyEntry, ...(state.feedbackHistory || [])],
        lastUpdated: new Date().toISOString(),
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
  if (!migrated.anomalies) migrated.anomalies = [];
  if (!migrated.metricHistory) migrated.metricHistory = [];

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

export function DataProvider({ children }) {
  const { registerAuthCallback } = useAuth();
  const [state, dispatch] = useReducer(dataReducer, EMPTY_STATE, () => {
    return loadPersistedState() || EMPTY_STATE;
  });

  // Sync with AuthContext on login/logout
  useEffect(() => {
    registerAuthCallback((authUser) => {
      if (!authUser) {
        dispatch({ type: ACTIONS.RESET });
      } else {
        dispatch({ 
          type: ACTIONS.SET_USER_DATA, 
          payload: { userData: authUser, source: authUser.persona === 'New User' ? 'none' : 'demo' } 
        });
      }
    });
  }, [registerAuthCallback]);

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

  // Computed scores — derived from engines (deterministic, memoized)
  const computed = useMemo(() => {
    const userData = {
      health: state.health,
      finance: state.finance,
      career: state.career,
    };

    // Only compute if there's data
    const hasData = Object.keys(state.health).length > 0 ||
                    Object.keys(state.finance).length > 0 ||
                    Object.keys(state.career).length > 0;

    if (!hasData) {
      return {
        lifeBalance: null,
        hasData: false,
      };
    }

    try {
      const lifeBalance = computeLifeBalance(userData, state.records);
      return {
        ...lifeBalance,
        lifeBalance,
        hasData: true,
        anomalies: state.anomalies || [],
        feedbackHistory: state.feedbackHistory || [],
      };
    } catch (e) {
      console.error('DataContext: Score computation error', e);
      return { lifeBalance: null, hasData: false };
    }
  }, [state.health, state.finance, state.career, state.records, state.anomalies, state.feedbackHistory]);

  const addTimelineEvent = useCallback((event) => {
    dispatch({ type: ACTIONS.ADD_TIMELINE_EVENT, payload: event });
  }, []);

  const recordFeedback = useCallback((recId, action, category) => {
    dispatch({ type: ACTIONS.RECORD_FEEDBACK, payload: { recId, action, category } });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);

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

    addTimelineEvent,
    recordFeedback,

    updateGamification: (data) => {
      dispatch({ type: ACTIONS.UPDATE_GAMIFICATION, payload: data });
    },

    updateAICache: (data) => {
      dispatch({ type: ACTIONS.UPDATE_AI_CACHE, payload: data });
    },

    updateSimulatorState: (data) => {
      dispatch({ type: ACTIONS.UPDATE_SIMULATOR_STATE, payload: data });
    },

    reset: () => {
      dispatch({ type: ACTIONS.RESET });
    },
  }), []);

  const value = useMemo(() => ({
    // Raw state
    ...state,

    // Computed scores (from deterministic engines)
    computed,

    // Action dispatchers
    ...actions,

    // Convenience getters
    hasRealData: state.dataSource === 'imported' || state.dataSource === 'mixed',
    isDemo: state.dataSource === 'demo',
    isEmpty: state.dataSource === 'none',
  }), [state, computed, actions]);

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
