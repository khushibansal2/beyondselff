import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { GlassCard, PageHeader, SecurityBadge, showToast } from '../components/ui/Components';
import {
  PROVIDERS,
  syncProviderData,
  normalizeAndMergeMetrics,
  loadProviderStates,
  disconnectProvider,
  saveIntegrationSettings,
  loadIntegrationSettings,
} from '../services/integrationService';

export default function Settings() {
  const { user, logout } = useAuth();
  const { health, finance, career, goals, timeline, gamification, computed, aiCache,
          updateAICache, updateDomain, addTimelineEvent, triggerIntegrationSync } = useData();

  const [notifications, setNotifications] = useState({ insights: true, goals: true, burnout: true, weekly: false });
  const [privacy, setPrivacy]             = useState({ anonymizeAI: true, localOnly: true, shareData: false });
  const [dangerConfirm, setDangerConfirm] = useState(false);

  // Integration state
  const [providerStates, setProviderStates] = useState({});
  const [syncingId,      setSyncingId]      = useState(null);
  const [githubUsername, setGithubUsername] = useState('');
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [syncLog, setSyncLog] = useState([]);   // per-session sync log

  // Load persisted provider states + settings on mount
  useEffect(() => {
    setProviderStates(loadProviderStates());
    const settings = loadIntegrationSettings();
    setGithubUsername(settings.githubUsername || '');
  }, []);

  // ── Sync a provider ────────────────────────────────────────────────────────
  const handleSync = async (provider) => {
    if (syncingId) return;
    setSyncingId(provider.id);

    try {
      const payload = await syncProviderData(provider.id, providerStates[provider.id]?.lastSync);

      // Merge into DataContext via integration sync
      const merged = normalizeAndMergeMetrics([], [payload]);
      if (typeof triggerIntegrationSync === 'function') {
        await triggerIntegrationSync(merged);
      } else {
        // Direct domain update as fallback
        if (payload.metrics.health)  updateDomain('health',  payload.metrics.health);
        if (payload.metrics.finance) updateDomain('finance', payload.metrics.finance);
        if (payload.metrics.career)  updateDomain('career',  payload.metrics.career);
      }

      addTimelineEvent?.({
        type: 'integration',
        title: `${provider.name} synced`,
        description: `${payload.meta?.recordCount || 'New'} records imported from ${provider.name}`,
        icon: provider.icon,
      });

      // Refresh provider states
      setProviderStates(loadProviderStates());
      setSyncLog(prev => [{
        providerId: provider.id,
        providerName: provider.name,
        time: new Date().toLocaleTimeString(),
        status: 'success',
        recordCount: payload.meta?.recordCount,
        source: payload.meta?.dataSource,
      }, ...prev.slice(0, 9)]);

      showToast(`${provider.name} synced successfully ✓`, 'success');
    } catch (err) {
      setProviderStates(loadProviderStates());
      setSyncLog(prev => [{
        providerId: provider.id,
        providerName: provider.name,
        time: new Date().toLocaleTimeString(),
        status: 'error',
        error: err.message,
      }, ...prev.slice(0, 9)]);
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = (provider) => {
    disconnectProvider(provider.id);
    setProviderStates(loadProviderStates());
    showToast(`${provider.name} disconnected`, 'success');
  };

  const saveGithubUsername = () => {
    if (!githubUsername.trim()) { showToast('Enter a GitHub username', 'error'); return; }
    saveIntegrationSettings({ githubUsername: githubUsername.trim() });
    setShowGithubInput(false);
    showToast(`GitHub username saved: ${githubUsername}`, 'success');
  };

  // ── Other helpers ──────────────────────────────────────────────────────────
  const exportAllData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { name: user?.name, email: user?.email, persona: user?.persona },
      health, finance, career, goals, timeline, gamification,
      computedScores: {
        healthScore:  computed?.healthScore?.score,
        financeScore: computed?.financeScore?.score,
        careerScore:  computed?.careerScore?.score,
        lifeBalance:  computed?.balance,
        burnoutRisk:  computed?.burnout?.risk,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `beyondself_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported as JSON', 'success');
  };

  const clearCache = () => {
    updateAICache({ dashboardNarrative: null, dashboardNarrativeHash: null, lastSimulation: null });
    showToast('AI cache cleared successfully', 'success');
  };

  const statusColor = (status) => {
    if (status === 'success')      return 'bg-emerald-400';
    if (status === 'error')        return 'bg-red-400';
    if (status === 'disconnected') return 'bg-slate-500';
    return 'bg-amber-400';
  };

  const providerList = Object.values(PROVIDERS);

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Settings & Integrations" subtitle="Connect providers, manage data, and control privacy." icon="⚙️" />

      {/* Profile */}
      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>👤 Profile</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl">{user?.avatar || '👤'}</div>
          <div>
            <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-1">Persona: {user?.persona}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Session</p>
            <p className="text-xs text-slate-300 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />Active • JWT authenticated</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Account Type</p>
            <p className="text-xs text-slate-300">{user?.email?.includes('demo') ? 'Demo Account' : 'Full Account'} • Full access</p>
          </div>
        </div>
      </GlassCard>

      {/* ── Integrations ─────────────────────────────────────────────────── */}
      <GlassCard className="mb-6" glow="glow-blue">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔌 Data Integrations</h3>
        <p className="text-[11px] text-slate-500 mb-4">Connect providers to sync real data into your intelligence engines.</p>

        {/* GitHub username input */}
        <AnimatePresence>
          {showGithubInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-blue-500/20">
              <p className="text-xs text-slate-400 mb-2">🐙 GitHub Username (for real commit sync)</p>
              <div className="flex gap-2">
                <input
                  id="github-username-input"
                  value={githubUsername}
                  onChange={e => setGithubUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGithubUsername()}
                  placeholder="e.g. octocat"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <button onClick={saveGithubUsername}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-all">
                  Save
                </button>
                <button onClick={() => setShowGithubInput(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs hover:bg-white/10 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {providerList.map(provider => {
            const ps      = providerStates[provider.id] || {};
            const syncing = syncingId === provider.id;
            const connected = ps.connected === true;
            const status  = ps.lastSyncStatus || 'never';

            return (
              <div key={provider.id} id={`provider-${provider.id}`}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{provider.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{provider.category} • {
                        status === 'never' ? 'Never synced' :
                        status === 'success' ? `Last sync: ${new Date(ps.lastSync).toLocaleString()}` :
                        status === 'error' ? `Error: ${ps.errorMessage?.slice(0, 40)}` :
                        'Disconnected'
                      }</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="text-[10px] text-slate-400">{connected ? 'Connected' : 'Not connected'}</span>
                  </div>
                </div>

                {/* Record count badge */}
                {ps.lastRecordCount > 0 && (
                  <p className="text-[10px] text-blue-400/70 mb-2">
                    {ps.lastRecordCount} records synced last time
                  </p>
                )}

                {/* GitHub notice */}
                {provider.id === PROVIDERS.CAREER.id && !githubUsername && (
                  <p className="text-[10px] text-amber-400/80 mb-2">
                    ⚠️ Set your GitHub username before syncing
                  </p>
                )}

                {/* Provider-specific notes */}
                {provider.id === PROVIDERS.HEALTH.id && (
                  <p className="text-[10px] text-slate-500 mb-2">Reads from your uploaded health CSVs or backend records</p>
                )}
                {provider.id === PROVIDERS.FINANCE.id && (
                  <p className="text-[10px] text-slate-500 mb-2">Reads from your uploaded bank statement CSVs or backend records</p>
                )}

                <div className="flex gap-2 mt-2">
                  {/* GitHub: show username button */}
                  {provider.id === PROVIDERS.CAREER.id && (
                    <button onClick={() => setShowGithubInput(v => !v)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
                      {githubUsername ? `@${githubUsername}` : '+ Set Username'}
                    </button>
                  )}

                  <button
                    id={`sync-btn-${provider.id}`}
                    onClick={() => handleSync(provider)}
                    disabled={!!syncingId || (provider.id === PROVIDERS.CAREER.id && !githubUsername)}
                    className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {syncing ? (
                      <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Syncing...</>
                    ) : (
                      '⟳ Sync Now'
                    )}
                  </button>

                  {connected && (
                    <button onClick={() => handleDisconnect(provider)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sync log */}
        {syncLog.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Sync History (this session)</p>
            <div className="space-y-1.5">
              {syncLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-slate-400">{entry.time}</span>
                  <span className="text-slate-300">{entry.providerName}</span>
                  {entry.status === 'success' ? (
                    <span className="text-emerald-400/70">{entry.recordCount ? `${entry.recordCount} records` : 'synced'} via {entry.source}</span>
                  ) : (
                    <span className="text-red-400/70 truncate">{entry.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-400">Health & Finance:</strong> Upload a CSV first via Data Import, then Sync here to re-pull the latest records into all engines.<br />
            💡 <strong className="text-slate-400">GitHub:</strong> Enter your GitHub username — the platform fetches your real repo count and commit activity.
          </p>
        </div>
      </GlassCard>

      {/* Security & Privacy */}
      <GlassCard className="mb-6" glow="glow-emerald">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔐 Security & Privacy</h3>
        <SecurityBadge />
        <div className="mt-4 space-y-3">
          {[
            { key: 'anonymizeAI', label: 'Anonymize data before AI analysis', desc: 'Personal identifiers stripped before AI processing', icon: '🤖' },
            { key: 'localOnly',   label: 'Local-only data storage',           desc: 'Data stays on device — not sent to cloud',          icon: '💾' },
            { key: 'shareData',   label: 'Share anonymized insights',          desc: 'Help improve AI with anonymized patterns',           icon: '🌐' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => { setPrivacy(p => ({ ...p, [item.key]: !p[item.key] })); showToast('Privacy setting updated', 'success'); }}
                className={`w-11 h-6 rounded-full transition-all relative ${privacy[item.key] ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <motion.div animate={{ x: privacy[item.key] ? 20 : 2 }} className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-md" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[{ icon: '🔒', label: 'AES-256 Encrypted' }, { icon: '🛡️', label: 'RBAC Protected' }, { icon: '🔑', label: 'JWT Sessions' }, { icon: '📋', label: 'GDPR Compliant' }].map(badge => (
            <div key={badge.label} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
              <span className="text-sm block">{badge.icon}</span>
              <p className="text-[9px] text-emerald-400/70 mt-1">{badge.label}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔔 Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'insights', label: 'AI Insight Alerts',  desc: 'Get notified when AI detects important patterns' },
            { key: 'goals',    label: 'Goal Reminders',      desc: 'Deadline and milestone notifications' },
            { key: 'burnout',  label: 'Burnout Warnings',    desc: 'Critical alerts when burnout risk is high' },
            { key: 'weekly',   label: 'Weekly Summary',      desc: 'Receive a weekly life balance summary' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
              <button onClick={() => { setNotifications(p => ({ ...p, [item.key]: !p[item.key] })); showToast('Notification preference saved', 'success'); }}
                className={`w-11 h-6 rounded-full transition-all relative ${notifications[item.key] ? 'bg-blue-500' : 'bg-white/10'}`}>
                <motion.div animate={{ x: notifications[item.key] ? 20 : 2 }} className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-md" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🗃️ Data Management</h3>
        <div className="space-y-3">
          <button onClick={exportAllData} className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-sm hover:bg-white/[0.04] transition-all flex items-center justify-between">
            <div className="flex items-center gap-2"><span>📥</span> Export All Data</div>
            <span className="text-xs text-slate-500">JSON</span>
          </button>
          <button onClick={clearCache} className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-sm hover:bg-white/[0.04] transition-all flex items-center justify-between">
            <div className="flex items-center gap-2"><span>🧹</span> Clear AI Cache</div>
            <span className="text-xs text-slate-500">Remove temporary data</span>
          </button>
          <div className="pt-3 border-t border-white/[0.06]">
            {dangerConfirm ? (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-sm text-red-400 mb-3">⚠️ This will permanently delete all your data. Are you sure?</p>
                <div className="flex gap-2">
                  <button onClick={() => { localStorage.clear(); showToast('All data cleared', 'error'); setDangerConfirm(false); }}
                    className="text-xs px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">Yes, Delete Everything</button>
                  <button onClick={() => setDangerConfirm(false)}
                    className="text-xs px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setDangerConfirm(true)} className="text-xs text-red-500/70 hover:text-red-400 transition-all">
                🗑️ Delete All Data
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
