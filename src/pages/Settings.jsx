import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { showToast } from '../components/ui/Components';

/* ─── Cyber Corners Accent ────────────────────────────────────────── */
function CyberCorners({ color = '#6366f1' }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, pointerEvents: 'none', zIndex: 5 }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, pointerEvents: 'none', zIndex: 5 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, pointerEvents: 'none', zIndex: 5 }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, pointerEvents: 'none', zIndex: 5 }} />
    </>
  );
}

/* ── Reusable Toggle ─────────────────────────────────────────────────────── */
function Toggle({ value, onChange, color = '#3b82f6' }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        background: value ? `linear-gradient(135deg, ${color}cc 0%, ${color} 100%)` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${value ? color : 'rgba(255,255,255,0.08)'}`,
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'all 0.2s ease',
        boxShadow: value ? `0 0 10px ${color}30` : 'none',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: value ? '#fff' : '#94a3b8',
          boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
          position: 'absolute',
          top: 2,
        }}
      />
    </button>
  );
}

/* ── Section Card ────────────────────────────────────────────────────────── */
function SectionCard({ children, style, glowColor = 'rgba(255,255,255,0.05)' }) {
  return (
    <div 
      className="glass-card"
      style={{
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(13, 20, 35, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
        ...style,
      }}
    >
      <CyberCorners color={glowColor} />
      {children}
    </div>
  );
}

/* ── Section Header ──────────────────────────────────────────────────────── */
function SectionHeader({ icon, title, color = '#6366f1' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '18px 24px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      borderLeft: `4px solid ${color}`,
      background: `linear-gradient(90deg, ${color}08 0%, transparent 100%)`
    }}>
      <span style={{ fontSize: 18, filter: `drop-shadow(0 0 4px ${color})` }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 14.5, color: '#f1f5f9', letterSpacing: '0.02em', fontFamily: 'var(--font-display)' }}>{title}</span>
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
      padding: '16px 24px',
      borderBottom: noBorder ? 'none' : '1px solid rgba(255,255,255,0.04)',
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
            color: '#94a3b8'
          }}>
            {icon}
          </div>
        )}
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#cbd5e1', margin: 0 }}>{label}</p>
          {desc && <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>{desc}</p>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Settings() {
  const { user } = useAuth();
  const { health, finance, career, goals, timeline, gamification, computed, updateAICache } = useData();

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
      color: '#cbd5e1',
      maxWidth: 860,
      margin: '0 auto',
      paddingBottom: 60,
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>
      
      {/* Custom Styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.1; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes hazard-pulse {
          0%, 100% { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03); }
          50% { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.06); }
        }
        .cyber-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
        }
        .glass-card {
          background: rgba(13, 20, 35, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .settings-action-row {
          transition: all 0.2s ease;
        }
        .settings-action-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .settings-action-row:hover span:first-child {
          color: #fff !important;
        }
      `}</style>

      {/* Cyber Grid Pattern Background */}
      <div className="cyber-grid" style={{ position: 'absolute', inset: -20, opacity: 0.6, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '10%', right: '-10%', width: 260, height: 260, background: 'rgba(99,102,241,0.06)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '-10%', width: 280, height: 280, background: 'rgba(6,182,212,0.05)', filter: 'blur(110px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)'
          }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
            Settings &amp; Privacy
          </h1>
        </div>
        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, paddingLeft: 50 }}>
          Manage your neural core encryption, telemetry exports, and device privacy logs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>

        {/* ── Profile Card ── */}
        <SectionCard glowColor="rgba(99,102,241,0.3)">
          <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            {/* Left: avatar + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              
              {/* Pulsing rotating avatar frame */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: '2px dashed rgba(99, 102, 241, 0.4)',
                  animation: 'spin 15s linear infinite'
                }} />
                <div style={{
                  width: 58, height: 58, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 850, color: '#fff',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {initials}
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
                  borderRadius: '50%', background: '#10b981', border: '2.5px solid #090d16',
                  boxShadow: '0 0 8px #10b981'
                }} />
              </div>

              <div>
                <p style={{ fontSize: 16.5, fontWeight: 800, margin: 0, color: '#f1f5f9', letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
                  {user?.name || 'YASH'}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 2px' }}>
                  {user?.email || 'yash@gmail.com'}
                </p>
                <span style={{ 
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 
                }}>
                  Persona: {user?.persona || '—'}
                </span>
              </div>
            </div>

            {/* Right: Account Type */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Authorization Tier
              </p>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#06b6d4', margin: 0, textShadow: '0 0 8px rgba(6,182,212,0.2)' }}>
                Demo User • Full Decrypt
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            padding: '11px 24px',
            background: 'rgba(0,0,0,0.15)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>Quantum Sync Channel Secure</span>
            </div>
            <span style={{ fontSize: 10.5, color: '#475569', fontWeight: 600 }}>AES-256 GCM SHIELDED</span>
          </div>
        </SectionCard>

        {/* ── Security & Privacy ── */}
        <SectionCard glowColor="rgba(16,185,129,0.3)">
          <SectionHeader icon="🔐" title="Cybersecurity & Telemetry Privacy" color="#10b981" />

          {/* Core encryption statement */}
          <div style={{
            margin: '16px 24px 12px',
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(16,185,129,0.03)',
            border: '1px solid rgba(16,185,129,0.18)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 4px #10b981)' }}>🛡️</span>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 850, color: '#10b981', margin: 0 }}>
                Data Lock Encryption Active
              </p>
              <p style={{ fontSize: 11.5, color: '#34d399', margin: '3px 0 0', lineHeight: 1.4 }}>
                Variables undergo immediate client-side token stripping. E2E sealed, local storage prioritised, and GDPR compliant.
              </p>
            </div>
          </div>

          {/* Privacy toggles */}
          {[
            { key: 'anonymizeAI', icon: '🤖', label: 'Anonymize telemetry prior to AI feedback', desc: 'Strips identity variables from prompts before Groq/OpenAI ingestion' },
            { key: 'localOnly',   icon: '💾', label: 'Enforce local storage constraints',           desc: 'Pins database logs within local system parameters — bypasses cloud storage' },
            { key: 'shareData',   icon: '🌐', label: 'Allow generic telemetry sharing',              desc: 'Submits anonymous metrics to baseline twin model matrices' },
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
                  color="#10b981"
                />
              }
            />
          ))}

          {/* Trust badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
            padding: '16px 24px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            {[
              { icon: '🔒', label: 'AES-256 Encrypted' },
              { icon: '🛡️', label: 'RBAC Access' },
              { icon: '🔑', label: 'JWT Authentication' },
              { icon: '📋', label: 'GDPR Certified' },
            ].map(b => (
              <div 
                key={b.label} 
                className="glass-card" 
                style={{
                  padding: '12px 6px',
                  borderRadius: 12,
                  background: 'rgba(16,185,129,0.01)',
                  border: '1px solid rgba(16,185,129,0.08)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(16,185,129,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: 16, filter: 'drop-shadow(0 0 4px rgba(16,197,94,0.4))' }}>{b.icon}</span>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.8)', margin: '6px 0 0', lineHeight: 1.2, letterSpacing: '0.01em' }}>
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard glowColor="rgba(59,130,246,0.3)">
          <SectionHeader icon="🔔" title="Telemetry Reminders & Alert Filters" color="#3b82f6" />
          {[
            { key: 'insights', label: 'AI Diagnostic Insights',  desc: 'Pushes real-time alerts when crucial habit anomalies are analyzed' },
            { key: 'goals',    label: 'Milestone Threshold Logs',  desc: 'Alerts when goal timeline deadlines approach constraint boundaries' },
            { key: 'burnout',  label: 'Exertion & Burnout Alarms', desc: 'Immediate notification when cumulative stress spikes exceed safe ranges' },
            { key: 'weekly',   label: 'Weekly Sync Report',       desc: 'Compile comprehensive weekly life balance trend charts' },
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
        <SectionCard glowColor="rgba(239,68,68,0.3)">
          <SectionHeader icon="🗃️" title="Telemetry Management Core" color="#ef4444" />

          {/* Export */}
          <button
            onClick={exportAllData}
            className="settings-action-row"
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <span style={{ fontSize: 13.5, color: '#cbd5e1', fontWeight: 600, transition: 'all 0.2s' }}>Export All Data Matrix</span>
            <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              JSON SCHEMA <span style={{ fontSize: 12 }}>›</span>
            </span>
          </button>

          {/* Clear Cache */}
          <button
            onClick={clearCache}
            className="settings-action-row"
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <span style={{ fontSize: 13.5, color: '#cbd5e1', fontWeight: 600, transition: 'all 0.2s' }}>Clear Client AI Cache</span>
            <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              Purge temporary variables <span style={{ fontSize: 12 }}>›</span>
            </span>
          </button>

          {/* Delete All Data */}
          {dangerConfirm ? (
            <div style={{ padding: '16px 24px', background: 'rgba(239,68,68,0.02)', borderTop: '1px solid rgba(239,68,68,0.15)', animation: 'hazard-pulse 3s infinite' }}>
              <p style={{ fontSize: 12.5, fontWeight: 800, color: '#f87171', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🚨</span> Permanent Core Overwrite Triggered
              </p>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.4 }}>
                This routine permanently purges local databases. Abandons all neural maps, transactions, habit records, and active sync settings. Action is irrevocable.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { localStorage.clear(); showToast('All data cleared', 'error'); setDangerConfirm(false); }}
                  style={{
                    fontSize: 11.5, padding: '8px 16px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 800,
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(239,68,68,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)'; }}
                >
                  Purge Core
                </button>
                <button
                  onClick={() => setDangerConfirm(false)}
                  style={{
                    fontSize: 11.5, padding: '8px 16px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 700,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  Abort Protocol
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDangerConfirm(true)}
              className="settings-action-row"
              style={{
                width: '100%', background: 'rgba(239, 68, 68, 0.01)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.01)'; }}
            >
              <span style={{ fontSize: 13.5, color: '#f87171', fontWeight: 800, transition: 'all 0.2s' }}>Purge Core Local Database</span>
              <span style={{ fontSize: 14, color: '#f87171', fontWeight: 800 }}>⚠️</span>
            </button>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
