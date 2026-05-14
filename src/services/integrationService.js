// src/services/integrationService.js

// Mock provider data generators simulating real-world APIs
export const PROVIDERS = {
  HEALTH: { id: 'health_fitbit', name: 'Fitbit', category: 'health', icon: '🏃' },
  FINANCE: { id: 'finance_plaid', name: 'Bank (via Plaid)', category: 'finance', icon: '🏦' },
  CAREER: { id: 'career_github', name: 'GitHub', category: 'career', icon: '🐙' }
};

export const syncProviderData = async (providerId, lastSyncTime) => {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 800 + Math.random() * 500));
  
  // Simulate random failure (5% chance)
  if (Math.random() < 0.05) {
    throw new Error(`Provider ${providerId} is currently unreachable.`);
  }

  const today = new Date().toISOString().split('T')[0];
  let metrics = {};

  if (providerId === PROVIDERS.HEALTH.id) {
    metrics = {
      health: {
        sleepAvg: parseFloat((6.5 + Math.random() * 2).toFixed(1)), // Realistic sleep
        workoutsPerWeek: Math.floor(Math.random() * 2), // 0 or 1 workout today
        stressLevel: Math.floor(4 + Math.random() * 4),
        steps: Math.floor(4000 + Math.random() * 8000)
      }
    };
  } else if (providerId === PROVIDERS.FINANCE.id) {
    metrics = {
      finance: {
        expenses: Math.floor(20 + Math.random() * 150),
        savings: Math.floor(10 + Math.random() * 50),
        recurringSubscriptionsDetected: Math.random() > 0.8
      }
    };
  } else if (providerId === PROVIDERS.CAREER.id) {
    metrics = {
      career: {
        codingHoursDaily: parseFloat((1 + Math.random() * 4).toFixed(1)),
        dsaPractice: Math.floor(Math.random() * 3),
        commitCount: Math.floor(Math.random() * 10)
      }
    };
  }

  return {
    date: today,
    source: providerId,
    timestamp: Date.now(),
    metrics
  };
};

export const normalizeAndMergeMetrics = (existingHistory, newPayloads) => {
  let mergedHistory = [...(existingHistory || [])];
  
  newPayloads.forEach(payload => {
    const { date, source, metrics } = payload;
    
    // Find if an entry for this date already exists
    const existingIndex = mergedHistory.findIndex(m => m.date === date);
    
    if (existingIndex >= 0) {
      let existing = mergedHistory[existingIndex];
      
      // Deduplication: Deep merge metrics, prefer real-world payload if conflicts exist
      const h = { ...existing.health, ...metrics.health };
      const f = { ...existing.finance, ...metrics.finance };
      const c = { ...existing.career, ...metrics.career };
      
      // Clean up NaNs or undefined
      Object.keys(h).forEach(k => h[k] === undefined && delete h[k]);
      Object.keys(f).forEach(k => f[k] === undefined && delete f[k]);
      Object.keys(c).forEach(k => c[k] === undefined && delete c[k]);

      mergedHistory[existingIndex] = {
        ...existing,
        sources: Array.from(new Set([...(existing.sources || []), source])),
        health: h,
        finance: f,
        career: c,
      };
    } else {
      mergedHistory.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date,
        sources: [source],
        ...metrics
      });
    }
  });

  // Sort chronologically and deduplicate strictly by date just in case
  const uniqueDates = {};
  mergedHistory.forEach(m => {
    uniqueDates[m.date] = m;
  });
  
  return Object.values(uniqueDates).sort((a, b) => new Date(a.date) - new Date(b.date));
};
