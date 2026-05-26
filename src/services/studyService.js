const BASE = 'http://localhost:8080/api/study';

function getAuth() {
  return localStorage.getItem('dt_token') || localStorage.getItem('beyondself_token');
}

function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuth()}` };
}

// ── Local storage fallback helpers ──────────────────────────────────────────
const LS_KEY = 'study_sessions_local';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function saveLocal(sessions) {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions));
}

function calcXP(durationMinutes, focusQuality, mentalFatigue) {
  const focusMultiplier = 0.5 + (focusQuality / 5);
  const fatigueMultiplier = 1.0 - ((mentalFatigue - 1) * 0.05);
  return Math.round((durationMinutes / 5) * focusMultiplier * fatigueMultiplier);
}

function buildHeatmapLocal(sessions) {
  const minutesByDate = {};
  for (const s of sessions) {
    const d = (s.sessionDate || s.createdAt || new Date().toISOString()).split('T')[0];
    minutesByDate[d] = (minutesByDate[d] || 0) + (s.durationMinutes || 0);
  }
  const heatmap = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const mins = minutesByDate[dateStr] || 0;
    const level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
    heatmap.push({ date: dateStr, minutes: mins, level });
  }

  const totalXP = sessions.reduce((s, x) => s + (x.xpEarned || 0), 0);

  const envMap = {};
  for (const s of sessions) {
    const e = s.environment || 'HOME';
    if (!envMap[e]) envMap[e] = { sum: 0, count: 0 };
    envMap[e].sum += s.focusQuality || 3;
    envMap[e].count++;
  }
  const environmentData = Object.entries(envMap).map(([env, v]) => ({
    environment: env, avgFocus: (v.sum / v.count).toFixed(1), count: v.count,
  }));

  const topicMap = {};
  for (const s of sessions) {
    const t = s.topic || 'General';
    const d = (s.sessionDate || new Date().toISOString().split('T')[0]);
    if (!topicMap[t] || d > topicMap[t]) topicMap[t] = d;
  }
  const today = new Date().toISOString().split('T')[0];
  const forgettingCurve = Object.entries(topicMap).map(([topic, lastDate]) => {
    const daysSince = Math.floor((new Date(today) - new Date(lastDate)) / 86400000);
    const retention = Math.max(0, Math.round(100 - daysSince * 20));
    return { topic, daysSince, retention };
  }).sort((a, b) => a.retention - b.retention);

  return { heatmap, totalXP, environmentData, forgettingCurve };
}

function buildStatsLocal(sessions) {
  const totalMinutes = sessions.reduce((s, x) => s + (x.durationMinutes || 0), 0);
  const totalXP = sessions.reduce((s, x) => s + (x.xpEarned || 0), 0);
  const totalSessions = sessions.length;

  const studyDays = new Set(sessions.map(s => (s.sessionDate || s.createdAt || '').split('T')[0]));
  let streak = 0;
  const now = new Date();
  while (true) {
    const d = new Date(now);
    d.setDate(d.getDate() - streak);
    if (studyDays.has(d.toISOString().split('T')[0])) streak++;
    else break;
  }

  const topicMinutes = {};
  for (const s of sessions) {
    topicMinutes[s.topic] = (topicMinutes[s.topic] || 0) + (s.durationMinutes || 0);
  }
  const bestTopic = Object.entries(topicMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return { totalMinutes, totalXP, totalSessions, streak, bestTopic };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function logSession(payload) {
  try {
    const res = await fetch(`${BASE}/sessions`, {
      method: 'POST', headers: headers(), body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    // Offline fallback: save to localStorage
    const session = {
      id: Date.now(),
      userId: 'local',
      sessionDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      durationMinutes: payload.durationMinutes || 30,
      topic: payload.topic || 'General',
      category: payload.category || '',
      focusQuality: payload.focusQuality || 3,
      mentalFatigue: payload.mentalFatigue || 3,
      environment: payload.environment || 'HOME',
      xpEarned: calcXP(payload.durationMinutes || 30, payload.focusQuality || 3, payload.mentalFatigue || 3),
    };
    const all = loadLocal();
    all.unshift(session);
    saveLocal(all);
    return session;
  }
}

export async function getSessions() {
  try {
    const res = await fetch(`${BASE}/sessions`, { headers: headers() });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return loadLocal();
  }
}

export async function getHeatmap() {
  try {
    const res = await fetch(`${BASE}/heatmap`, { headers: headers() });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return buildHeatmapLocal(loadLocal());
  }
}

export async function getStats() {
  try {
    const res = await fetch(`${BASE}/stats`, { headers: headers() });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return buildStatsLocal(loadLocal());
  }
}

export async function deleteSession(id) {
  try {
    const res = await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE', headers: headers() });
    if (!res.ok) throw new Error(res.status);
  } catch {
    const all = loadLocal().filter(s => s.id !== id);
    saveLocal(all);
  }
}
