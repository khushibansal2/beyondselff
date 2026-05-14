import { showToast } from '../components/ui/Components';

const API_BASE = 'http://localhost:8080/api';

let syncTimeout = null;
let isSyncing = false;
let pendingState = null;

// Helper to get Auth Header
const getAuthHeaders = () => {
  const auth = localStorage.getItem('dt_auth');
  if (auth) {
    try {
      const { token } = JSON.parse(auth);
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    } catch (e) {}
  }
  return { 'Content-Type': 'application/json' };
};

export async function fetchCloudState() {
  try {
    const res = await fetch(`${API_BASE}/state`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (res.status === 404) {
      return { isNew: true };
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Parse the stored JSON state payload
    const parsedState = JSON.parse(data.statePayload);
    parsedState._revision = data.revision; // Keep track of the backend revision
    return { success: true, state: parsedState };

  } catch (error) {
    console.error('Failed to fetch cloud state:', error);
    return { success: false, error: error.message };
  }
}

export function queueCloudSync(stateToSync, callback) {
  pendingState = stateToSync;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Debounce saving to prevent spamming the backend
  syncTimeout = setTimeout(async () => {
    if (isSyncing || !pendingState) {
      // If already syncing, wait for the next cycle
      queueCloudSync(pendingState, callback);
      return;
    }

    isSyncing = true;
    const stateSnapshot = { ...pendingState };
    pendingState = null;

    try {
      if (callback) callback({ status: 'saving' });

      const res = await fetch(`${API_BASE}/state`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          statePayload: JSON.stringify(stateSnapshot),
          revision: stateSnapshot._revision || 0
        }),
      });

      if (res.status === 409) {
        // Conflict - backend is newer
        const data = await res.json();
        console.warn('Sync conflict detected.', data);
        if (callback) callback({ status: 'conflict', latestState: JSON.parse(data.latestState.statePayload), newRevision: data.latestState.revision });
        isSyncing = false;
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (callback) callback({ status: 'success', newRevision: data.revision });

    } catch (error) {
      console.error('Cloud sync failed:', error);
      // Put it back in pending to retry later
      pendingState = stateSnapshot;
      if (callback) callback({ status: 'error', error: error.message });
    } finally {
      isSyncing = false;
    }
  }, 2000); // 2 second debounce
}

export function forceImmediateSync(stateToSync) {
  return new Promise(async (resolve) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    
    try {
      const res = await fetch(`${API_BASE}/state`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          statePayload: JSON.stringify(stateToSync),
          revision: stateToSync._revision || 0
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        resolve({ success: true, newRevision: data.revision });
      } else {
        resolve({ success: false });
      }
    } catch (e) {
      resolve({ success: false });
    }
  });
}
