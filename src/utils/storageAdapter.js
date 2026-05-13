const STORAGE_KEY = 'digitaltwin_data';

export const storageAdapter = {
  save: (userId, state) => {
    if (!userId) return;
    let toStore = { ...state, aiCache: { ...state.aiCache, coachHistory: state.aiCache.coachHistory?.slice(-20) } };
    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(toStore));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('StorageAdapter: Storage quota exceeded. Compacting timeline and history...');
        toStore.timeline = toStore.timeline?.slice(0, 10) || [];
        toStore.aiCache = { dashboardNarrative: null, coachHistory: [] };
        toStore.importHistory = toStore.importHistory?.slice(0, 5) || [];
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(toStore));
      } else {
        throw e;
      }
    }
  },

  load: (userId) => {
    if (!userId) return null;
    return localStorage.getItem(`${STORAGE_KEY}_${userId}`);
  },

  remove: (userId) => {
    if (!userId) return;
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  },

  loadLegacy: () => {
    return localStorage.getItem(STORAGE_KEY);
  },

  removeLegacy: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getAuth: () => {
    return localStorage.getItem('dt_auth');
  },
  
  getKeyPrefix: () => {
    return STORAGE_KEY;
  }
};
