import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PROVIDERS } from '../services/integrationService';
import { GlassCard, PageHeader, SecurityBadge, showToast } from '../components/ui/Components';

export default function Settings() {
  const { user, logout } = useAuth();
  const { health, finance, career, goals, timeline, gamification, computed, aiCache, updateAICache, toggleIntegration, triggerIntegrationSync, integrations } = useData();
  const [notifications, setNotifications] = useState({ insights: true, goals: true, burnout: true, weekly: false });
  const [privacy, setPrivacy] = useState({ anonymizeAI: true, localOnly: true, shareData: false });
  const [dangerConfirm, setDangerConfirm] = useState(false);

  const exportAllData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { name: user?.name, email: user?.email, persona: user?.persona },
      health,
      finance,
      career,
      goals,
      timeline,
      gamification,
      computedScores: {
        healthScore: computed?.healthScore?.score,
        financeScore: computed?.financeScore?.score,
        careerScore: computed?.careerScore?.score,
        lifeBalance: computed?.balance,
        burnoutRisk: computed?.burnout?.risk,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beyondself_export_${new Date().toISOString().slice(0,10)}.json`;
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

  const toggleNotif = (key) => {
    setNotifications(p => ({ ...p, [key]: !p[key] }));
    showToast('Notification preference saved', 'success');
  };

  const togglePrivacy = (key) => {
    setPrivacy(p => ({ ...p, [key]: !p[key] }));
    showToast('Privacy setting updated', 'success');
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Settings & Privacy" subtitle="Control your data, notifications, and account security." icon="⚙️" />

      {/* Profile Card */}
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
            <p className="text-xs text-slate-300 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Active • JWT authenticated</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Account Type</p>
            <p className="text-xs text-slate-300">Demo Account • Full access</p>
          </div>
        </div>
      </GlassCard>

      {/* Connected Integrations */}
      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔌 Connected Integrations</h3>
        <p className="text-xs text-slate-400 mb-4">Connect external providers to automatically sync your real-world behavior.</p>
        <div className="space-y-3">
          {Object.values(PROVIDERS).map(provider => {
            const integration = integrations?.[provider.id] || {};
            const isConnected = integration.connected;
            const isSyncing = integration.syncing;
            
            return (
              <div key={provider.id} className={`p-4 rounded-xl border ${isConnected ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{provider.name}</h4>
                      <p className="text-[10px] text-slate-400 capitalize">{provider.category} Integration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <button 
                        onClick={() => triggerIntegrationSync(provider.id)} 
                        disabled={isSyncing}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-50"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    )}
                    <button 
                      onClick={() => toggleIntegration(provider.id, !isConnected)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${isConnected ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
                {isConnected && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      Last synced: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                    </span>
                    {integration.error ? (
                      <span className="text-red-400">⚠️ {integration.error}</span>
                    ) : (
                      <span className="text-emerald-400">🟢 Connected</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Security & Privacy */}
      <GlassCard className="mb-6" glow="glow-emerald">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔐 Security & Privacy</h3>
        <SecurityBadge />
        <div className="mt-4 space-y-3">
          {[
            { key: 'anonymizeAI', label: 'Anonymize data before AI analysis', desc: 'Personal identifiers are stripped before any AI processing', icon: '🤖' },
            { key: 'localOnly', label: 'Local-only data storage', desc: 'All data stays on your device — nothing sent to cloud', icon: '💾' },
            { key: 'shareData', label: 'Share anonymized insights', desc: 'Help improve AI models with anonymized patterns', icon: '🌐' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => togglePrivacy(item.key)}
                className={`w-11 h-6 rounded-full transition-all relative ${privacy[item.key] ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <motion.div animate={{ x: privacy[item.key] ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-md" />
              </button>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: '🔒', label: 'AES-256 Encrypted' },
            { icon: '🛡️', label: 'RBAC Protected' },
            { icon: '🔑', label: 'JWT Sessions' },
            { icon: '📋', label: 'GDPR Compliant' },
          ].map(badge => (
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
            { key: 'insights', label: 'AI Insight Alerts', desc: 'Get notified when AI detects important patterns' },
            { key: 'goals', label: 'Goal Reminders', desc: 'Deadline and milestone notifications' },
            { key: 'burnout', label: 'Burnout Warnings', desc: 'Critical alerts when burnout risk is high' },
            { key: 'weekly', label: 'Weekly Summary', desc: 'Receive a weekly life balance summary' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
              <button onClick={() => toggleNotif(item.key)}
                className={`w-11 h-6 rounded-full transition-all relative ${notifications[item.key] ? 'bg-blue-500' : 'bg-white/10'}`}>
                <motion.div animate={{ x: notifications[item.key] ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-md" />
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
            <div className="flex items-center gap-2"><span>🧹</span> Clear Cache</div>
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
