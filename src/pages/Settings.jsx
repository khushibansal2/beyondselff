import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';

/* ── Reusable Toggle ─────────────────────────────────────────────────────── */
function Toggle({ value, onChange, color = '#3b82f6' }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? color : 'rgba(255,255,255,0.12)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

/* ── Section Card ────────────────────────────────────────────────────────── */
function SectionCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      marginBottom: 16,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Section Header ──────────────────────────────────────────────────────── */
function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '16px 20px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0', fontFamily: 'var(--font-display)' }}>{title}</span>
    </div>
  );
}

/* ── Row ─────────────────────────────────────────────────────────────────── */
function Row({ icon, label, desc, right, noBorder }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '13px 20px',
      borderBottom: noBorder ? 'none' : '1px solid rgba(255,255,255,0.04)',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', margin: 0 }}>{label}</p>
          {desc && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{desc}</p>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Settings() {
  const { user, logout } = useAuth();
  const { health, finance, career, goals, timeline, gamification, computed, aiCache, updateAICache } = useData();

  const [notifications, setNotifications] = useState({
    insights: true, goals: true, burnout: true, weekly: false,
  });
  const [privacy, setPrivacy] = useState({
    anonymizeAI: true, localOnly: true, shareData: false,
  });
  const [dangerConfirm, setDangerConfirm] = useState(false);

  const toggleNotif = (key) => {
    setNotifications(p => ({ ...p, [key]: !p[key] }));
    showToast('Notification preference saved', 'success');
  };

  const togglePrivacy = (key) => {
    setPrivacy(p => ({ ...p, [key]: !p[key] }));
    showToast('Privacy setting updated', 'success');
  };

  const exportAllData = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { name: user?.name, email: user?.email, persona: user?.persona },
      health, finance, career, goals, timeline, gamification,
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

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'YS';

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      background: 'transparent',
      color: '#e2e8f0',
      maxWidth: 860,
      margin: '0 auto',
      fontFamily: 'var(--font-primary)',
    }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f1f5f9', fontFamily: 'var(--font-display)' }}>
            Settings &amp; Privacy
          </h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Control your data, notifications, and account security.
        </p>
      </div>

      {/* ── Profile Card ── */}
      <SectionCard>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* Left: avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#f1f5f9', fontFamily: 'var(--font-display)' }}>
                {user?.name || 'YASH'}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 1px' }}>
                {user?.email || 'yash@gmail.com'}
              </p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                Persona: {user?.persona || '—'}
              </p>
            </div>
          </div>

          {/* Right: Account Type */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Account Type
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Demo Account • Full access
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Active • JWT authenticated</span>
        </div>
      </SectionCard>

      {/* ── Security & Privacy ── */}
      <SectionCard>
        <SectionHeader icon="🔐" title="Security & Privacy" />

        {/* Your data is secure banner */}
        <div style={{
          margin: '12px 20px',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.18)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', margin: 0 }}>
              Your data is secure
            </p>
            <p style={{ fontSize: 11, color: '#4ade80', margin: '2px 0 0', opacity: 0.75 }}>
              End-to-end encrypted • Private to you only • GDPR compliant
            </p>
          </div>
        </div>

        {/* Privacy toggles */}
        {[
          { key: 'anonymizeAI', icon: '🤖', label: 'Anonymize data before AI analysis', desc: 'Personal identifiers are stripped before any AI processing' },
          { key: 'localOnly',   icon: '💾', label: 'Local-only data storage',           desc: 'All data stays on your device — nothing sent to cloud' },
          { key: 'shareData',   icon: '🌐', label: 'Share anonymized insights',          desc: 'Help improve AI models with anonymized patterns' },
        ].map((item, i, arr) => (
          <Row
            key={item.key}
            icon={item.icon}
            label={item.label}
            desc={item.desc}
            noBorder={i === arr.length - 1}
            right={
              <Toggle
                value={privacy[item.key]}
                onChange={() => togglePrivacy(item.key)}
                color="#22c55e"
              />
            }
          />
        ))}

        {/* Trust badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {[
            { icon: '🔒', label: 'AES-256 Encrypted' },
            { icon: '🛡️', label: 'RBAC Protected' },
            { icon: '🔑', label: 'JWT Sessions' },
            { icon: '📋', label: 'GDPR Compliant' },
          ].map(b => (
            <div key={b.label} style={{
              padding: '8px 4px',
              borderRadius: 8,
              background: 'rgba(34,197,94,0.05)',
              border: '1px solid rgba(34,197,94,0.12)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 14 }}>{b.icon}</span>
              <p style={{ fontSize: 9.5, color: 'rgba(74,222,128,0.7)', margin: '4px 0 0', lineHeight: 1.2 }}>
                {b.label}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard>
        <SectionHeader icon="🔔" title="Notifications" />
        {[
          { key: 'insights', label: 'AI Insight Alerts',  desc: 'Get notified when AI detects important patterns' },
          { key: 'goals',    label: 'Goal Reminders',     desc: 'Deadline and milestone notifications' },
          { key: 'burnout',  label: 'Burnout Warnings',   desc: 'Critical alerts when burnout risk is high' },
          { key: 'weekly',   label: 'Weekly Summary',     desc: 'Receive a weekly life balance summary' },
        ].map((item, i, arr) => (
          <Row
            key={item.key}
            label={item.label}
            desc={item.desc}
            noBorder={i === arr.length - 1}
            right={
              <Toggle
                value={notifications[item.key]}
                onChange={() => toggleNotif(item.key)}
                color="#3b82f6"
              />
            }
          />
        ))}
      </SectionCard>

      {/* ── Data Management ── */}
      <SectionCard>
        <SectionHeader icon="🗃️" title="Data Management" />

        {/* Export */}
        <button
          onClick={exportAllData}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>Export All Data</span>
          <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            JSON <span style={{ fontSize: 10 }}>›</span>
          </span>
        </button>

        {/* Clear Cache */}
        <button
          onClick={clearCache}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>Clear Cache</span>
          <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            Remove temporary data <span style={{ fontSize: 10 }}>›</span>
          </span>
        </button>

        {/* Delete All Data */}
        {dangerConfirm ? (
          <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.05)' }}>
            <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 10px' }}>
              ⚠️ This will permanently delete all your data. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { localStorage.clear(); showToast('All data cleared', 'error'); setDangerConfirm(false); }}
                style={{
                  fontSize: 11, padding: '6px 14px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.2)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                }}
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setDangerConfirm(false)}
                style={{
                  fontSize: 11, padding: '6px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDangerConfirm(true)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 20px',
            }}
          >
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>Delete All Data</span>
            <span style={{ fontSize: 12, color: '#ef4444' }}>›</span>
          </button>
        )}
      </SectionCard>
    </div>
  );
}
