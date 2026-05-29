import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader, ExplainableScorePanel } from '../components/ui/Components';
import { LifeAvatar } from '../components/ui/LifeAvatar';
// GhostTimeline and LifePlant kept for potential future use but not rendered in this layout
import { Link } from 'react-router-dom';
import { generateTrendData, generateCorrelations, generateInsights } from '../data/demoData';
import { computeHealthScore } from '../engines/healthScoreEngine';
import { computeFinanceScore } from '../engines/financeScoreEngine';
import { computeCareerScore } from '../engines/careerScoreEngine';
import { fetchGitHubProfile } from '../services/githubService';
import { CheckCircle, AlertTriangle, Activity, Landmark, Briefcase, Calendar, Check, ArrowRight, Loader2, Smartphone, Brain, Share2, X, Zap, Download, ShieldCheck, Lock, EyeOff } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function SecurityStatusBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="hidden md:flex flex-col gap-1 items-end select-none absolute top-4 right-48"
    >
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-mono text-emerald-400">
        <ShieldCheck size={10} /> JWT ACTIVE
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-mono text-blue-400">
        <Lock size={10} /> AES-256 E2E
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] font-mono text-purple-400">
        <EyeOff size={10} /> AI PRIVACY ON
      </div>
    </motion.div>
  );
}

// ─── DOOM SWITCH ─────────────────────────────────────────────────────────────
function DoomSwitch({ active, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 select-none ${
        active
          ? 'bg-red-950/40 border-red-700/40 doom-toggle-active'
          : 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.14]'
      }`}
    >
      <motion.span
        className="text-sm"
        animate={{ rotate: active ? [0, -10, 10, 0] : 0 }}
        transition={{ duration: 0.4 }}
      >
        {active ? '☠️' : '🌑'}
      </motion.span>
      <div className={`relative w-9 h-4.5 rounded-full transition-colors duration-300 ${active ? 'bg-red-600' : 'bg-white/10'}`} style={{ height: 18, width: 36 }}>
        <motion.div
          className="absolute top-0.5 w-3.5 h-3.5 rounded-full shadow"
          animate={{ left: active ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          style={{ background: active ? '#fca5a5' : '#475569' }}
        />
      </div>
      <span className={`text-[11px] font-bold tracking-wider transition-colors duration-300 ${active ? 'text-red-400' : 'text-slate-500'}`}>
        DOOM
      </span>
    </motion.button>
  );
}

// ─── DOOM REALITY PANEL ──────────────────────────────────────────────────────
function DoomRealityPanel({ stats, burnoutRisk, lifeBalance }) {
  const items = [
    { label: 'Projected Retirement Age', value: `${stats.retirementAge} yrs`, icon: '📅', bad: stats.retirementAge > 68 },
    { label: 'Burnout ETA (current trajectory)', value: `~${stats.burnoutETA} days`, icon: '🔥', bad: stats.burnoutETA < 25 },
    { label: 'Monthly Sleep Debt', value: `${stats.sleepDebt}h/mo`, icon: '😴', bad: stats.sleepDebt > 10 },
    { label: 'Career Lag vs Peers', value: `${stats.careerGap} weeks`, icon: '📉', bad: stats.careerGap > 4 },
    { label: 'Life System Score', value: `${lifeBalance}/100`, icon: '⚠️', bad: lifeBalance < 60 },
    ...(stats.debtFreeYears > 0 ? [{ label: 'Debt-Free Projection', value: `${stats.debtFreeYears} yrs`, icon: '💳', bad: stats.debtFreeYears > 3 }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-red-900/30 bg-gradient-to-br from-red-950/30 to-[#0d0208]/80 doom-flicker h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-lg flex-shrink-0 border border-red-500/20">☠️</div>
        <div>
          <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">Reality Report</h3>
          <p className="text-[10px] text-red-900">No filter. Cold hard data.</p>
        </div>
        <span className="ml-auto text-[10px] text-red-900/60 font-mono">DOOM MODE</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className={`p-3 rounded-xl border ${item.bad ? 'border-red-700/30 bg-red-950/20' : 'border-amber-800/20 bg-amber-950/10'}`}
          >
            <div className="text-sm mb-1">{item.icon}</div>
            <div className={`text-sm font-bold font-mono ${item.bad ? 'text-red-400' : 'text-amber-400'}`}>{item.value}</div>
            <div className="text-[9px] text-red-900/70 mt-0.5 leading-tight">{item.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 p-2 rounded-lg bg-red-900/10 border border-red-900/20">
        <p className="text-[10px] text-red-700/80 text-center">
          ⚡ These projections assume <strong className="text-red-600">current habits unchanged</strong>. Toggle off to see fixes.
        </p>
      </div>
    </motion.div>
  );
}

// ─── RIPPLE CONNECTOR ────────────────────────────────────────────────────────
const FALLBACK_CASCADES = {
  health:  [
    { to: 'career',  type: 'positive', label: 'Boosts Focus',    color: '#10b981' },
    { to: 'finance', type: 'positive', label: 'Discipline',      color: '#10b981' },
  ],
  finance: [
    { to: 'health',  type: 'negative', label: 'Stress Risk',     color: '#ef4444' },
    { to: 'career',  type: 'positive', label: 'Drives Ambition', color: '#10b981' },
  ],
  career:  [
    { to: 'health',  type: 'negative', label: 'Recovery Cost',   color: '#ef4444' },
    { to: 'finance', type: 'positive', label: 'Income Boost',    color: '#10b981' },
  ],
};

function buildDomainCascades(crossDomain = []) {
  if (!crossDomain.length) return FALLBACK_CASCADES;
  const result = { health: [], finance: [], career: [] };
  crossDomain.forEach(c => {
    const isNeg = c.type === 'negative';
    const color = c.severity === 'critical' ? '#ef4444' : isNeg ? '#f97316' : '#10b981';
    let label = c.effect?.split('.')[0] || (isNeg ? 'Negative impact' : 'Positive impact');
    if (c.computedImpact?.productivityLoss)  label = `-${c.computedImpact.productivityLoss}% Productivity`;
    if (c.computedImpact?.excessSpending)    label = `-₹${(c.computedImpact.excessSpending / 1000).toFixed(0)}K Spending`;
    if (c.computedImpact?.focusBoost)        label = `+${c.computedImpact.focusBoost}% Focus`;
    if (c.computedImpact?.alertnessReduction) label = `-${c.computedImpact.alertnessReduction}% Alertness`;
    if (result[c.from]) result[c.from].push({ to: c.to, type: c.type, label, color });
  });
  ['health', 'finance', 'career'].forEach(d => {
    if (!result[d].length) result[d] = FALLBACK_CASCADES[d];
  });
  return result;
}

const DOMAIN_COL = { health: 0, finance: 1, career: 2, life: 3, burnout: 4 };

function RippleConnector({ hoveredDomain, containerRef, cascades }) {
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setSvgSize({ w: r.width, h: r.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!hoveredDomain || !cascades?.[hoveredDomain] || svgSize.w === 0) return null;

  const { w, h } = svgSize;
  const colW = w / 5;
  const centerY = h / 2;
  const fromX = DOMAIN_COL[hoveredDomain] * colW + colW / 2;
  const conns = cascades[hoveredDomain];

  return (
    <svg className="absolute inset-0 pointer-events-none" width={w} height={h} style={{ zIndex: 20, overflow: 'visible' }}>
      <defs>
        <filter id="connGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <AnimatePresence>
        {conns.map((conn, i) => {
          const toX = DOMAIN_COL[conn.to] * colW + colW / 2;
          const midX = (fromX + toX) / 2;
          const midY = centerY * 0.2;
          const d = `M ${fromX} ${centerY} Q ${midX} ${midY} ${toX} ${centerY}`;
          const pathId = `rp-${conn.to}-${i}`;
          return (
            <motion.g key={conn.to}>
              <motion.path d={d} stroke={conn.color} strokeWidth="1.5" fill="none" filter="url(#connGlow)" strokeOpacity="0.7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }} transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }} />
              <path id={pathId} d={d} fill="none" stroke="none" />
              <motion.circle r="4" fill={conn.color} filter="url(#connGlow)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.7, delay: i * 0.12 + 0.2, repeat: Infinity, repeatDelay: 0.3 }}>
                <animateMotion dur="0.7s" repeatCount="indefinite" begin={`${i * 0.12 + 0.2}s`}>
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </motion.circle>
              <motion.text x={toX} y={centerY - 16} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)" fill={conn.color} filter="url(#connGlow)" initial={{ opacity: 0, y: centerY - 8 }} animate={{ opacity: 1, y: centerY - 16 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.12 + 0.4 }}>
                {conn.label}
              </motion.text>
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

// ─── ONBOARDING WIZARD ───────────────────────────────────────────────────────
function OnboardingWizard({ user, onComplete, updateDomain, career }) {
  const [step, setStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selections, setSelections] = useState({ finance: 'skipped', health: 'skipped', career: 'skipped', calendar: 'skipped' });
  const [inputs, setInputs] = useState({ bankName: '', upiId: '', healthToken: '', githubUsername: '', mobileNumber: '' });

  const nextStep = () => setStep(s => s + 1);
  const skipStep = (domain) => { setSelections(s => ({ ...s, [domain]: 'skipped' })); nextStep(); };
  const connectStep = async (domain) => {
    setIsConnecting(true);
    try {
      if (domain === 'career' && inputs.githubUsername) {
        const profile = await fetchGitHubProfile(inputs.githubUsername);
        const newSkills = profile.languages.map(l => l.lang);
        if (updateDomain) updateDomain('career', { skills: [...new Set([...(career?.skills || []), ...newSkills])], githubConnected: true, githubUsername: inputs.githubUsername });
      } else if (domain === 'finance' && updateDomain) {
        updateDomain('finance', { bankName: inputs.bankName, upiId: inputs.upiId, financeConnected: true });
      }
    } catch (e) { console.error('Failed to connect', e); }
    setTimeout(() => {
      setSelections(s => ({ ...s, [domain]: 'connected' }));
      setIsConnecting(false);
      nextStep();
    }, domain === 'career' ? 400 : 1200);
  };

  const steps = [
    {
      id: 1,
      content: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-3xl border border-white/10">🧬</div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>Set up your Digital Twin</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Connect your real-world data so the AI can build an accurate simulation of your life.</p>
          </div>
          <button onClick={nextStep} className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-slate-100 transition-colors w-full sm:w-auto">
            Get started <ArrowRight size={15} />
          </button>
        </div>
      ),
    },
    {
      id: 2,
      content: (
        <div className="space-y-5 w-full max-w-sm mx-auto">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Landmark className="text-amber-400" size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Connect Finance</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Link your bank to track transactions and financial health.</p>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="Bank Name (e.g. HDFC, Chase)" className="input-premium" value={inputs.bankName} onChange={e => setInputs(s => ({ ...s, bankName: e.target.value }))} />
            <input type="text" placeholder="UPI ID / Account Identity" className="input-premium" value={inputs.upiId} onChange={e => setInputs(s => ({ ...s, upiId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <button onClick={() => connectStep('finance')} disabled={isConnecting || !inputs.bankName || !inputs.upiId} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-50">
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />} {isConnecting ? 'Connecting...' : 'Sync Bank Details'}
            </button>
            <button onClick={() => skipStep('finance')} disabled={isConnecting} className="w-full flex items-center justify-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 font-semibold text-sm hover:text-white transition-colors">Skip for now</button>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      content: (
        <div className="space-y-5 w-full max-w-sm mx-auto">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Activity className="text-emerald-400" size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Connect Health</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Sync your wearables to feed sleep, stress, and activity data.</p>
          </div>
          <input type="text" placeholder="HealthKit / Google Fit API Token" className="input-premium" value={inputs.healthToken} onChange={e => setInputs(s => ({ ...s, healthToken: e.target.value }))} />
          <div className="space-y-2">
            <button onClick={() => connectStep('health')} disabled={isConnecting || !inputs.healthToken} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} {isConnecting ? 'Syncing...' : 'Connect Wearable'}
            </button>
            <button onClick={() => skipStep('health')} disabled={isConnecting} className="w-full flex items-center justify-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 font-semibold text-sm hover:text-white transition-colors">Skip for now</button>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
            <CheckCircle size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400">You can also log manually in the Health page later.</p>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      content: (
        <div className="space-y-5 w-full max-w-sm mx-auto">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Briefcase className="text-blue-400" size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Connect Career</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Link GitHub to calibrate career velocity and skill tracking.</p>
          </div>
          <input type="text" placeholder="GitHub Username" className="input-premium" value={inputs.githubUsername} onChange={e => setInputs(s => ({ ...s, githubUsername: e.target.value }))} />
          <div className="space-y-2">
            <button onClick={() => connectStep('career')} disabled={isConnecting || !inputs.githubUsername} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50">
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Briefcase size={14} />} {isConnecting ? 'Connecting...' : 'Connect GitHub'}
            </button>
            <button onClick={() => skipStep('career')} disabled={isConnecting} className="w-full flex items-center justify-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 font-semibold text-sm hover:text-white transition-colors">Skip for now</button>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      content: (
        <div className="space-y-5 w-full max-w-sm mx-auto">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Smartphone className="text-purple-400" size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>Notifications</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Add your mobile number for real-time SMS transaction alerts.</p>
          </div>
          <input type="tel" placeholder="Mobile Number (+91...)" className="input-premium" value={inputs.mobileNumber} onChange={e => setInputs(s => ({ ...s, mobileNumber: e.target.value }))} />
          <div className="space-y-2">
            <button onClick={() => connectStep('calendar')} disabled={isConnecting || !inputs.mobileNumber} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-sm hover:bg-purple-500/20 transition-colors disabled:opacity-50">
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />} {isConnecting ? 'Authenticating...' : 'Sync Mobile SMS'}
            </button>
            <button onClick={() => skipStep('calendar')} disabled={isConnecting} className="w-full flex items-center justify-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 font-semibold text-sm hover:text-white transition-colors">Skip for now</button>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      content: (
        <div className="space-y-5 w-full max-w-sm mx-auto text-center">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto"><CheckCircle className="text-emerald-400" size={20} /></div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>You're all set</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Your Digital Twin is initialized.</p>
          </div>
          <div className="space-y-2 text-left">
            {[
              { domain: 'Finance', status: selections.finance, color: 'text-amber-400' },
              { domain: 'Health',  status: selections.health,  color: 'text-emerald-400' },
              { domain: 'Career',  status: selections.career,  color: 'text-blue-400' },
              { domain: 'Notifications', status: selections.calendar, color: 'text-purple-400' },
            ].map(item => (
              <div key={item.domain} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-sm font-medium text-slate-300">{item.domain}</span>
                {item.status === 'connected'
                  ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 ${item.color} flex items-center gap-1`}><Check size={10} /> Connected</span>
                  : <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-slate-500">Skipped</span>}
              </div>
            ))}
          </div>
          <button onClick={onComplete} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 transition-colors">
            Launch Dashboard <ArrowRight size={15} />
          </button>
        </div>
      ),
    },
  ];

  const currentStep = steps.find(s => s.id === step);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f]/96 backdrop-blur-xl flex flex-col items-center justify-center p-6">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          {steps.map(s => (
            <div key={s.id} className={`rounded-full transition-all duration-300 ${step >= s.id ? 'w-6 h-1.5 bg-indigo-500' : 'w-1.5 h-1.5 bg-white/10'}`} />
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium">Step {step} of {steps.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          <GlassCard className="p-8 md:p-10 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/8 blur-[60px] rounded-full pointer-events-none" />
            {currentStep.content}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── SHARE CARD MODAL ────────────────────────────────────────────────────────
function ShareCard({ user, healthScore, financeScore, careerScore, lifeBalance, burnoutRisk, aiNarrative, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    const text = `My BeyondSelf AI Life Score 🧬\n\nLife Balance: ${lifeBalance}/100\nHealth: ${healthScore} · Finance: ${financeScore} · Career: ${careerScore}\nBurnout Risk: ${burnoutRisk}%\n\n${aiNarrative || 'Tracking all life domains with AI cross-domain intelligence.'}\n\nTry BeyondSelf — AI Life Operating System`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const domainColor = (v) => v >= 70 ? '#10b981' : v >= 45 ? '#f59e0b' : '#ef4444';
  const lifeColor = lifeBalance >= 70 ? '#10b981' : lifeBalance >= 45 ? '#f59e0b' : '#ef4444';
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* The card itself — this is what gets shared/screenshotted */}
        <div className="rounded-3xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, #0f1224 0%, #1a1040 50%, #0d0d1a 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 30px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">BeyondSelf AI</p>
              <p className="text-sm font-bold text-white">{user?.name || 'Digital Twin'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600">{date}</p>
              <p className="text-[10px] text-indigo-400 font-mono">Life Score</p>
            </div>
          </div>

          {/* Big life score */}
          <div className="px-6 py-5 text-center border-b border-white/[0.05]">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Life Balance Score</p>
            <p className="text-7xl font-black leading-none" style={{ color: lifeColor, fontFamily: 'var(--font-display)' }}>
              {lifeBalance}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: lifeColor }}>
              {lifeBalance >= 70 ? '✅ Balanced' : lifeBalance >= 45 ? '⚠️ At Risk' : '🚨 Needs Attention'}
            </p>
          </div>

          {/* Domain scores */}
          <div className="grid grid-cols-3 gap-px bg-white/[0.04] mx-6 mb-4 rounded-2xl overflow-hidden border border-white/[0.06]">
            {[
              { label: 'Health', v: healthScore, icon: '❤️' },
              { label: 'Finance', v: financeScore, icon: '💰' },
              { label: 'Career', v: careerScore, icon: '🎯' },
            ].map(d => (
              <div key={d.label} className="py-3 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-base mb-0.5">{d.icon}</p>
                <p className="text-lg font-black" style={{ color: domainColor(d.v) }}>{d.v}</p>
                <p className="text-[10px] text-slate-500">{d.label}</p>
              </div>
            ))}
          </div>

          {/* Burnout + AI quote */}
          <div className="px-6 pb-5 space-y-3">
            <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${burnoutRisk > 60 ? 'bg-red-500/10 border border-red-500/20 text-red-300' : burnoutRisk > 30 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'}`}>
              <span>{burnoutRisk > 60 ? '🚨' : burnoutRisk > 30 ? '⚠️' : '✅'}</span>
              <span className="font-medium">Burnout Risk: {burnoutRisk}%</span>
            </div>

            {aiNarrative && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[11px] text-slate-400 leading-relaxed italic">"{aiNarrative.slice(0, 120)}{aiNarrative.length > 120 ? '...' : ''}"</p>
              </div>
            )}

            {/* Branding footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-indigo-400" />
                <span className="text-[10px] text-indigo-400 font-semibold">BeyondSelf AI Life OS</span>
              </div>
              <span className="text-[9px] text-slate-600">AI-powered · Cross-domain</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={copyText}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] text-slate-200">
            {copied ? <><Check size={15} className="text-emerald-400" /> Copied!</> : <><Share2 size={15} /> Copy Score</>}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all">
            <Download size={15} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-3">Screenshot the card above to share on social media</p>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { health, finance, career, timeline, records, computed, aiCache, updateAICache, updateDomain, anomalies = [], goals = [] } = useData();
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [doomMode, setDoomMode] = useState(false);
  const [doomShake, setDoomShake] = useState(false);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [showExplain, setShowExplain] = useState(false);
  const [activityTab, setActivityTab] = useState('activity');
  const [showShare, setShowShare] = useState(false);
  const [engineTab, setEngineTab] = useState('time_travel');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (user?.id) {
      const isComplete = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!isComplete && user.persona === 'New User') setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(`onboarding_completed_${user?.id}`, 'true');
    setShowOnboarding(false);
  };

  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const c = { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0, ...(career || {}) };

  const healthScore  = computed?.healthScore?.score  || 84;
  const financeScore = computed?.financeScore?.score || 78;
  const careerScore  = computed?.careerScore?.score  || 82;
  const lifeBalance  = computed?.balance             || 81;
  const burnoutRisk  = computed?.burnout?.risk       || 24;
  const weakestDomain = computed?.weakestDomain?.name || 'health';
  const savingsRate  = f.income > 0 ? Math.max(0, Math.round(((f.income - f.expenses) / f.income) * 100)) : 0;

  const doomStats = useMemo(() => {
    const retirementAge = Math.min(85, Math.round(65 + Math.max(0, (0.2 - savingsRate / 100) * 50)));
    const burnoutETA    = Math.max(1, Math.round(30 * (100 - burnoutRisk) / 100));
    const sleepDebt     = Math.max(0, Math.round((7 - h.sleepAvg) * 30));
    const careerGap     = Math.max(0, Math.round((4 - (c.studyHoursDaily || 0)) * 5));
    const debtFreeYears = f.debt > 0 && (f.income - f.expenses) > 0
      ? Math.round(f.debt / ((f.income - f.expenses) * 12)) : 0;
    return { retirementAge, burnoutETA, sleepDebt, careerGap, debtFreeYears, savingsRate };
  }, [h, f, c, burnoutRisk, savingsRate]);

  const toggleDoom = useCallback(() => {
    setDoomMode(d => !d);
    setDoomShake(true);
    setTimeout(() => setDoomShake(false), 600);
  }, []);

  const domainCascades = useMemo(() => buildDomainCascades(computed?.crossDomain || []), [computed?.crossDomain]);

  const explainFactors = useMemo(() => ({
    health:  computeHealthScore(health  || {}, []).factors,
    finance: computeFinanceScore(finance || {}, []).factors,
    career:  computeCareerScore(career  || {}, []).factors,
  }), [health, finance, career]);

  const hasHealthData  = h.sleepAvg > 0 || h.stressLevel > 0 || h.workoutsPerWeek > 0 || h.waterIntake > 0;
  const hasFinanceData = f.income > 0 || f.expenses > 0;
  const hasCareerData  = c.studyHoursDaily > 0 || c.dsaPractice > 0 || c.skills.length > 0;

  const actionPlan = useMemo(() => {
    const tasks = [];
    if (h.sleepAvg > 0 && h.sleepAvg < 7)
      tasks.push({ id: 'sleep',   icon: '😴', text: `Go to bed ${Math.max(0.5, 7 - h.sleepAvg).toFixed(1)}h earlier tonight`,            domain: 'health',  color: '#8b5cf6', time: '0 min',   link: '/health' });
    if (h.workoutsPerWeek > 0 && h.workoutsPerWeek < 3)
      tasks.push({ id: 'workout', icon: '💪', text: `Add ${3 - h.workoutsPerWeek} more workout day${3 - h.workoutsPerWeek > 1 ? 's' : ''} this week`, domain: 'health', color: '#10b981', time: '20 min', link: '/health' });
    if (h.waterIntake > 0 && h.waterIntake < 7)
      tasks.push({ id: 'water',   icon: '💧', text: `Drink ${8 - Math.round(h.waterIntake)} more glasses of water today`,                 domain: 'health',  color: '#06b6d4', time: 'All day', link: '/health' });
    if (h.stressLevel > 6)
      tasks.push({ id: 'stress',  icon: '🧘', text: 'Take a 15-min meditation or walk break',                                             domain: 'health',  color: '#f43f5e', time: '15 min', link: '/health' });
    if (savingsRate < 20 && f.income > 0)
      tasks.push({ id: 'savings', icon: '💰', text: `Review subscriptions — cancel one unused service`,                                    domain: 'finance', color: '#f59e0b', time: '10 min', link: '/finance' });
    if (f.debt > 0)
      tasks.push({ id: 'debt',    icon: '🏦', text: 'Make a debt repayment transfer today',                                               domain: 'finance', color: '#ef4444', time: '5 min',  link: '/finance' });
    if (hasCareerData && c.dsaPractice < 3)
      tasks.push({ id: 'dsa',     icon: '🧩', text: `Solve ${Math.max(1, 3 - c.dsaPractice)} DSA problem${3 - c.dsaPractice > 1 ? 's' : ''} on LeetCode`, domain: 'career', color: '#3b82f6', time: '45 min', link: '/career' });
    if (hasCareerData && c.studyHoursDaily > 0 && c.studyHoursDaily < 4)
      tasks.push({ id: 'study',   icon: '📚', text: 'Block a 2-hour focused study session',                                               domain: 'career',  color: '#8b5cf6', time: '2 hours', link: '/career' });
    if (hasCareerData && c.skills.length < 5)
      tasks.push({ id: 'skill',   icon: '🎯', text: 'Add one new skill to your profile today',                                            domain: 'career',  color: '#06b6d4', time: '5 min',  link: '/career' });
    if (tasks.length === 0) {
      const empties = [];
      if (!hasHealthData)  empties.push({ id: 'log-health',  icon: '❤️',  text: 'Log your health data to unlock insights',  domain: 'health',  color: '#10b981', time: '2 min', link: '/health' });
      if (!hasFinanceData) empties.push({ id: 'log-finance', icon: '💰',  text: 'Log your income and expenses',             domain: 'finance', color: '#f59e0b', time: '2 min', link: '/finance' });
      if (!hasCareerData)  empties.push({ id: 'log-career',  icon: '📚',  text: 'Log your study hours and skills',          domain: 'career',  color: '#3b82f6', time: '2 min', link: '/career' });
      if (empties.length === 0)
        empties.push({ id: 'all-good', icon: '🏆', text: "All targets met — great work today!", domain: 'health', color: '#22c55e', time: '—', link: '/health' });
      return empties.slice(0, 3);
    }
    return tasks.slice(0, 3);
  }, [h, f, c, savingsRate, hasHealthData, hasFinanceData, hasCareerData]);

  // Goal plant progress
  const avgGoalProgress = useMemo(() => {
    if (!goals.length) return 0;
    const total = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(total / goals.length);
  }, [goals]);

  const urgentAlerts   = [...(computed?.urgentAlerts || []), ...anomalies.map(a => ({ icon: a.severity === 'critical' ? '🚨' : '⚠️', text: `${a.title}: ${a.description}` }))];
  const positiveSignals = computed?.positiveSignals || [];
  const crossDomain    = computed?.crossDomain || [];
  const currentState   = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline }), [user, h, f, c, timeline]);

  const trendData = useMemo(() => {
    const healthRecs = records?.health || [];
    if (healthRecs.length >= 3) {
      return [...healthRecs]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-14)
        .map(r => ({
          date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
          sleep: r.sleep ?? null, stress: r.stress ?? null, mood: r.mood ?? null,
          productivity: r.mood != null ? Math.max(1, 10 - (r.stress ?? 5)) : null,
          spending: null, studyHours: null, water: r.water ?? null,
        }));
    }
    return generateTrendData(currentState, 14);
  }, [records?.health, currentState]);

  const correlations = useMemo(() => generateCorrelations(trendData), [trendData]);

  const insights = useMemo(() => {
    const base = generateInsights(currentState);
    const cross = crossDomain.map(cd => ({
      type: cd.severity === 'critical' ? 'critical' : cd.severity === 'warning' ? 'alert' : 'positive',
      icon: cd.severity === 'positive' ? '✅' : '⚡',
      title: 'Pattern Detected',
      text: `${cd.effect}. ${cd.mechanism}`,
      domains: [cd.from, cd.to],
      confidence: 100,
    }));
    return [...cross, ...base].slice(0, 5);
  }, [currentState, crossDomain]);

  const sleepCascade = crossDomain.find(cd => cd.id === 'sleep-productivity');

  useEffect(() => {
    async function fetchNarrative() {
      const hash = `${lifeBalance}-${healthScore}-${financeScore}-${careerScore}-${burnoutRisk}`;
      if (aiCache.dashboardNarrative && aiCache.dashboardNarrativeHash === hash) {
        setAiNarrative(aiCache.dashboardNarrative); return;
      }
      if (!computed?.hasData) return;
      setNarrativeLoading(true);
      const res = await generateNarrative(computed, 'dashboard');
      setAiNarrative(res.narrative);
      updateAICache({ dashboardNarrative: res.narrative, dashboardNarrativeHash: hash });
      setNarrativeLoading(false);
    }
    fetchNarrative();
  }, [computed, aiCache.dashboardNarrative, aiCache.dashboardNarrativeHash, updateAICache, lifeBalance, healthScore, financeScore, careerScore, burnoutRisk]);

  const scoreRings = [
    { key: 'health',  score: healthScore,  label: doomMode ? 'Decay Rate'    : 'Health',       glow: 'glow-emerald', link: '/health' },
    { key: 'finance', score: financeScore, label: doomMode ? 'Fragility'     : 'Finance',      glow: 'glow-amber',   link: '/finance' },
    { key: 'career',  score: careerScore,  label: doomMode ? 'Obsolescence'  : 'Career',       glow: 'glow-blue',    link: '/career' },
    { key: 'life',    score: lifeBalance,  label: doomMode ? 'Failure Index' : 'Life Balance', glow: 'glow-purple',  link: '/insights' },
    { key: 'burnout', score: burnoutRisk,  label: doomMode ? 'Collapse Risk' : 'Burnout Risk',
      glow: burnoutRisk > 60 ? 'glow-rose' : '',
      color: burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f59e0b' : '#10b981',
      col2: true, link: '/health' },
  ];

  function getCascadeEffect(cardKey) {
    if (!hoveredDomain || hoveredDomain === cardKey) return null;
    const effects = domainCascades[hoveredDomain] || [];
    return effects.find(e => e.to === cardKey) || null;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';
  const doneCount = Object.values(checkedTasks).filter(Boolean).length;

  const scoreCards = [
    { key: 'health',  label: 'Health',       score: healthScore,  status: healthScore >= 70 ? 'Good' : healthScore >= 45 ? 'Average' : 'Low',    color: '#10b981', icon: '🤍', link: '/health' },
    { key: 'mindset', label: 'Mindset',      score: Math.max(0, 100 - burnoutRisk), status: burnoutRisk < 40 ? 'Good' : burnoutRisk < 70 ? 'High' : 'Critical', color: '#8b5cf6', icon: '🧠', link: '/health' },
    { key: 'finance', label: 'Finance',      score: financeScore, status: financeScore >= 70 ? 'Good' : financeScore >= 45 ? 'Attention' : 'Low', color: '#f59e0b', icon: '💰', link: '/finance' },
    { key: 'balance', label: 'Balance',      score: lifeBalance,  status: lifeBalance >= 70 ? 'Good' : lifeBalance >= 45 ? 'Average' : 'Low',     color: '#06b6d4', icon: '⚖️', link: '/insights' },
    { key: 'career',  label: 'Career',       score: careerScore,  status: careerScore >= 70 ? 'Good' : careerScore >= 45 ? 'On Track' : 'Low',    color: '#3b82f6', icon: '💼', link: '/career' },
    { key: 'purpose', label: 'Purpose',      score: Math.min(100, lifeBalance + 10), status: lifeBalance >= 60 ? 'Great' : 'Growing', color: '#ec4899', icon: '🎯', link: '/goals' },
  ];

  const trajectoryData = [
    { year: 'Now', opt: 62, cur: 62, risk: 62 },
    { year: '2026', opt: 70, cur: 58, risk: 45 },
    { year: '2027', opt: 76, cur: 55, risk: 38 },
    { year: '2028', opt: 82, cur: 52, risk: 31 },
    { year: '2029', opt: 87, cur: 48, risk: 25 },
    { year: '2030', opt: 94, cur: 44, risk: 20 },
    { year: '2031', opt: 94, cur: 42, risk: 18 },
    { year: '2032', opt: 94, cur: 40, risk: 15 },
    { year: '2035', opt: 94, cur: 38, risk: 12 },
  ];

  const todaysPlan = actionPlan.slice(0, 5).map((t, i) => ({
    ...t,
    time: ['6:00 AM','8:00 AM','1:00 PM','5:00 PM','9:00 PM','10:00 PM'][i] || '—',
    done: !!checkedTasks[t.id],
  }));

  const aiInterventions = [
    burnoutRisk > 40 ? { icon: '😴', text: `Sleep before ${h.sleepAvg < 6.5 ? '11 PM' : '12 AM'}`, sub: `Improve recovery by ${Math.round(burnoutRisk * 0.3)}%`, urgency: 'Tonight', color: '#8b5cf6' } : null,
    { icon: '🧘', text: 'Take a recovery break', sub: '10 min mindfulness session', urgency: 'Tomorrow', color: '#06b6d4' },
    h.stressLevel > 5 ? { icon: '☕', text: 'Avoid caffeine after 6 PM', sub: 'Better sleep, better tomorrow', urgency: 'Today', color: '#f59e0b' } : null,
  ].filter(Boolean).slice(0, 3);

  // Dynamically calculate outcomes based on current scores
  const baseScore = (healthScore + financeScore + careerScore) / 3;
  const dynOpt = Math.round(baseScore * 2.5);
  const dynCur = Math.round(baseScore * 1.5);
  const dynRisk = Math.round(baseScore * 0.4);

  // Sparkline data generator
  const genLine = (color) => {
    const points = Array.from({length: 10}, (_, i) => ({x: i*10, y: Math.random()*15+5}));
    const ptsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    return (
      <div className="group relative w-full h-[30px] cursor-pointer">
        <svg viewBox="0 -5 100 40" style={{width:'100%', height:30, overflow:'visible'}}>
          {/* Hidden line that appears on group hover */}
          <polyline points={ptsStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
            className="opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Always visible circles */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} className="group-hover:scale-125 transition-transform origin-center" style={{transformOrigin: `${p.x}px ${p.y}px`}} />
          ))}
        </svg>
      </div>
    );
  };

  const sparkCards = [
    { key:'health', label:'Health', val:`${healthScore}%`, trend:`${healthScore>70?'+':'-'}${Math.round(Math.abs(healthScore-75)/2)}%`, st:healthScore>=70?'Good':healthScore>=45?'Average':'Low', col:'#10b981', icon:'❤️' },
    { key:'finance', label:'Finance', val:`$${Math.round((f?.income||8450)/1000)}k`, trend:`${financeScore>70?'+':'-'}${Math.round(Math.abs(financeScore-70)/2)}%`, st:financeScore>=70?'Good':financeScore>=45?'Attention':'Low', col:'#f59e0b', icon:'💰' },
    { key:'career', label:'Career', val:`${careerScore}%`, trend:`${careerScore>60?'+':'-'}${Math.round(Math.abs(careerScore-60)/2)}%`, st:careerScore>=70?'On Track':careerScore>=45?'Average':'Low', col:'#3b82f6', icon:'💼' },
    { key:'mindset', label:'Mindset', val:`${Math.max(0,100-burnoutRisk)}%`, trend:`${burnoutRisk<40?'+':'-'}${Math.round(Math.abs(40-burnoutRisk)/2)}%`, st:burnoutRisk<40?'Great':burnoutRisk<70?'Good':'Low', col:'#8b5cf6', icon:'🧠' },
    { key:'balance', label:'Balance', val:`${lifeBalance}%`, trend:`${lifeBalance>70?'+':'-'}${Math.round(Math.abs(lifeBalance-75)/2)}%`, st:lifeBalance>=70?'Good':lifeBalance>=45?'Average':'Low', col:'#10b981', icon:'⚖️' }
  ];

  const futureNodes = [
    { key:'mind', label:'Mind', score:Math.max(0,100-burnoutRisk), st:burnoutRisk<40?'Good':'Average', col:'#10b981', icon:'🧠', pos:{top:'15%', left:'-10px'} },
    { key:'energy', label:'Energy', score:Math.min(100, Math.round((h?.sleepAvg||7.5)*10)), st:(h?.sleepAvg||7.5)>=7?'Good':'Low', col:'#f59e0b', icon:'⚡', pos:{top:'50%', left:'-30px'} },
    { key:'body', label:'Body', score:healthScore, st:healthScore>=70?'Good':'Low', col:'#f97316', icon:'🛡️', pos:{top:'85%', left:'-10px'} },
    { key:'heart', label:'Heart', score:Math.round(healthScore*0.8), st:healthScore>60?'Attention':'Critical', col:'#ef4444', icon:'❤️', pos:{top:'15%', right:'-10px'} },
    { key:'habits', label:'Habits', score:Math.round((actionPlan.length?Object.values(checkedTasks).filter(Boolean).length/actionPlan.length*100:80)), st:'Good', col:'#3b82f6', icon:'✓', pos:{top:'50%', right:'-30px'} },
    { key:'purpose', label:'Purpose', score:Math.min(100, lifeBalance+10), st:lifeBalance>=60?'Great':'Growing', col:'#8b5cf6', icon:'🎯', pos:{top:'85%', right:'-10px'} }
  ];

  const TY = [
    {y:'Now', o:baseScore*0.4, c:baseScore*0.4, r:baseScore*0.4},
    {y:'2025', o:baseScore*0.8, c:baseScore*0.6, r:baseScore*0.45},
    {y:'2028', o:baseScore*1.2, c:baseScore*0.8, r:baseScore*0.5},
    {y:'2030', o:baseScore*1.5, c:baseScore*0.9, r:baseScore*0.5},
    {y:'2035', o:baseScore*1.9, c:baseScore*1.0, r:baseScore*0.45},
    {y:'2040', o:baseScore*2.2, c:baseScore*1.2, r:baseScore*0.35},
    {y:'2045', o:baseScore*2.5, c:baseScore*1.5, r:baseScore*0.25}
  ];
  const pts = (key) => TY.map((d,i)=>`${i*(100/6)}%, ${100 - (d[key]/250)*100}%`).join(' L ');

  
  const C = {
    bg: theme === 'dark' ? '#07090e' : '#f8fafc',
    doomBg: theme === 'dark' ? '#0a0305' : '#fef2f2',
    panel: theme === 'dark' ? '#11131c' : '#ffffff',
    text: theme === 'dark' ? '#e2e8f0' : '#0f172a',
    textMuted: theme === 'dark' ? '#94a3b8' : '#475569',
    border: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    card: theme === 'dark' ? '#131722' : '#ffffff',
    cardHover: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  };

  const S = (bg = C.panel, border = C.border) => ({background: bg, border: `1px solid ${border}`, borderRadius: 16});


  const currentYear = new Date().getFullYear();
  const futureYear = currentYear + 5;
  const userAge = user?.age ? user.age + 5 : 31;
  const todayPlan = actionPlan.slice(0,6).map((t,i)=>({...t,time:['6:00 AM','8:00 AM','1:00 PM','5:00 PM','9:00 PM','10:00 PM'][i]||'—',done:!!checkedTasks[t.id]}));
  const planDoneCount = todayPlan.filter(t=>t.done).length;

  const dynamicSkill = c?.skills?.[0] || 'Learn New Skill';

  return (
    <div className={`min-h-screen ${doomMode?'doom-active':''} ${doomShake?'doom-shake':''}`} style={{background:doomMode?C.doomBg:C.bg, color:C.text, fontFamily:'Inter, sans-serif', height:'100vh', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      {showOnboarding&&<OnboardingWizard user={user} updateDomain={updateDomain} career={career} onComplete={handleOnboardingComplete}/>}
      <AnimatePresence>{showShare&&<ShareCard user={user} healthScore={healthScore} financeScore={financeScore} careerScore={careerScore} lifeBalance={lifeBalance} burnoutRisk={burnoutRisk} aiNarrative={aiNarrative} onClose={()=>setShowShare(false)}/>}</AnimatePresence>

      <div style={{display:'grid', gridTemplateColumns:'1fr 300px', gap:20, padding:'12px 24px', maxWidth:1600, margin:'0 auto', height:'100%', width:'100%', boxSizing:'border-box'}}>
        
        {/* LEFT MAIN CONTENT */}
        <div style={{display:'flex', flexDirection:'column', gap:12, height:'100%'}}>
          
          {/* HEADER ROW */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, zIndex:20, position:'relative', width:'100%'}}>
            
            {/* Left: Search */}
            <div style={{flex:1, display:'flex', justifyContent:'flex-start'}}>
              <div style={{position:'relative', width:'100%', maxWidth:280}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input placeholder="Search anything in your life..." style={{width:'100%', background:C.card, border:`1px solid ${C.border}`, padding:'8px 12px 8px 36px', borderRadius:20, color:C.text, fontSize:12, outline:'none', boxSizing:'border-box'}}/>
                <div style={{position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:4, fontSize:9, color:C.textMuted}}>⌘K</div>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{flex:1, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:12}}>
              <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} style={{background:C.card, border:`1px solid ${C.border}`, width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}} className="hover:scale-110 transition-transform">
                {theme==='dark' ? '☀️' : '🌙'}
              </button>
              <div style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', background:C.card, border:`1px solid ${C.border}`, padding:'4px 12px 4px 4px', borderRadius:24}} className="hover:bg-white/5 transition-colors">
                <div style={{width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff'}}>
                  {firstName[0]}
                </div>
                <span style={{fontSize:12, fontWeight:600, color:C.text}}>{firstName}</span>
                <span style={{fontSize:9, color:C.textMuted}}>▼</span>
              </div>
            </div>
          </div>

          {/* AVATAR SECTION */}
          <div style={{position:'relative', flex:1, minHeight:280, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
            
            {/* Central Avatar & Pill */}
            <div style={{position:'relative', zIndex:5, display:'flex', flexDirection:'column', alignItems:'center', gap:16}}>
              <div style={{transform:'scale(0.95)'}}>
                <LifeAvatar healthScore={healthScore} financeScore={financeScore} careerScore={careerScore} burnoutRisk={burnoutRisk} doomMode={doomMode}/>
              </div>
              
              {/* Feels Focused */}
              <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'6px 14px', display:'flex', alignItems:'center', gap:8, cursor:'pointer'}} className="hover:bg-black/5 transition-colors">
                <span style={{width:6, height:6, borderRadius:'50%', background:burnoutRisk>60?'#ef4444':'#10b981'}}></span>
                <span style={{fontSize:11, fontWeight:600, color:C.text}}>{burnoutRisk>60?'Feels Overwhelmed':'Feels Focused'}</span>
              </div>
            </div>

            {/* Nodes & Connecting SVG Lines */}
            <div style={{position:'absolute', inset:0, maxWidth:500, margin:'0 auto', pointerEvents:'none'}}>
              <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0}}>
                {futureNodes.map((n, i) => {
                  const isLeft = i < 3;
                  return (
                    <line key={'line-'+n.key}
                      x1={isLeft ? "15%" : "85%"} y1={n.pos.top}
                      x2="50%" y2="50%"
                      stroke={n.col}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity={hoveredNode === n.key ? 0.8 : 0}
                      style={{transition:'opacity 0.3s ease'}}
                    />
                  );
                })}
              </svg>
              {futureNodes.map((n, i) => {
                const isLeft = i < 3;
                return (
                  <div key={n.key} 
                       onMouseEnter={() => setHoveredNode(n.key)}
                       onMouseLeave={() => setHoveredNode(null)}
                       style={{position:'absolute', top:n.pos.top, [isLeft?'left':'right']:0, transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:12, flexDirection:isLeft?'row':'row-reverse', pointerEvents:'auto', cursor:'pointer', zIndex:10}}>
                    <div style={{textAlign:isLeft?'right':'left'}}>
                      <div style={{fontSize:10, color:C.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5}}>{n.label}</div>
                      <div style={{fontSize:16, fontWeight:800, color:C.text}}>{n.score}%</div>
                      <div style={{fontSize:9, color:n.col, fontWeight:500}}>{n.st}</div>
                    </div>
                    {/* Circle Node */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', width:44, height:44, background:C.card, border:`2px solid ${hoveredNode === n.key ? n.col : C.border}`, borderRadius:'50%', fontSize:18, boxShadow: hoveredNode === n.key ? `0 0 12px ${n.col}66` : 'none', transition:'all 0.3s ease'}}>
                      {n.icon}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SPARKLINE CARDS */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, flexShrink:0}}>
            {sparkCards.map(c=>{
              const rawVal = parseInt(c.val.replace(/[^0-9]/g, '')) || 0;
              const pct = c.val.includes('%') ? rawVal : Math.min(100, (rawVal/15)*100); // Hack for Finance $8k -> percentage
              const circ = 2 * Math.PI * 16;
              const offset = circ - (pct / 100) * circ;
              return (
              <div key={c.key} style={{...S(), padding:'12px 14px', display:'flex', alignItems:'center', gap:12, cursor:'pointer'}} className="hover:bg-white/5 transition-colors">
                <div style={{position:'relative', width:40, height:40, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{transform:'rotate(-90deg)'}}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke={c.col} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:'stroke-dashoffset 1s ease-out'}} />
                  </svg>
                  <span style={{position:'absolute', fontSize:12, zIndex:2}}>{c.icon}</span>
                </div>
                <div style={{display:'flex', flexDirection:'column', flex:1}}>
                  <span style={{fontSize:10, color:C.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5}}>{c.label}</span>
                  <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                    <span style={{fontSize:16, fontWeight:800, color:C.text}}>{c.val}</span>
                    <span style={{fontSize:9, color:c.trend.includes('↓')||c.trend.includes('-')?'#ef4444':'#10b981', fontWeight:600}}>{c.trend}</span>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* FUTURE ENGINE PANEL */}
          <div style={{...S('#11131c'), padding:'14px 20px', display:'flex', flexDirection:'column', flexShrink:0, height:240}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <h2 style={{fontSize:14, fontWeight:600, color:C.text, margin:0}}>Future Engine</h2>
              </div>
              <div style={{display:'flex', gap:4}}>
                {[
                  {id:'doom_mode', label:'Doom Mode', icon:'⚠️'},
                  {id:'time_travel', label:'Time Travel', icon:'🚀'},
                  {id:'simulator', label:'Simulator', icon:'⏳'}
                ].map((t)=>(
                  <div key={t.id} onClick={()=>setEngineTab(t.id)} style={{padding:'4px 10px', fontSize:10, fontWeight:600, borderRadius:6, background:engineTab===t.id?'rgba(139,92,246,0.15)':'transparent', color:engineTab===t.id?'#8b5cf6':'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:6, border:engineTab===t.id?'1px solid rgba(139,92,246,0.3)':'1px solid transparent'}} className="hover:bg-white/5 transition-all">
                    <span>{t.icon}</span> {t.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{flex:1, position:'relative'}}>
              {/* Doom Mode View */}
              {engineTab === 'doom_mode' && (
                <div style={{display:'flex', flexDirection:'column', gap:10, animation:'fadeIn 0.3s ease', height:'100%'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{width:24, height:24, background:'rgba(239,68,68,0.1)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', fontSize:12}}>⚠️</div>
                    <div>
                      <div style={{fontSize:12, fontWeight:600, color:C.text}}>Doom Mode - Immediate impact</div>
                    </div>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, flex:1}}>
                    <div style={{background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', padding:16, borderRadius:8, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                      <div style={{fontSize:18, marginBottom:6}}>🔥</div>
                      <div style={{fontSize:10, color:C.text, fontWeight:600}}>Burnout ETA</div>
                      <div style={{fontSize:20, fontWeight:800, color:'#ef4444'}}>{doomStats?.burnoutETA||30} days</div>
                    </div>
                    <div style={{background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)', padding:16, borderRadius:8, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                      <div style={{fontSize:18, marginBottom:6}}>💤</div>
                      <div style={{fontSize:10, color:C.text, fontWeight:600}}>Monthly Sleep Debt</div>
                      <div style={{fontSize:20, fontWeight:800, color:'#3b82f6'}}>{doomStats?.sleepDebt||14} hours</div>
                    </div>
                    <div style={{background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', padding:16, borderRadius:8, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                      <div style={{fontSize:18, marginBottom:6}}>⚡</div>
                      <div style={{fontSize:10, color:C.text, fontWeight:600}}>Stress Overload</div>
                      <div style={{fontSize:20, fontWeight:800, color:'#f59e0b'}}>{(h?.stressLevel||0)>6?'Critical':(h?.stressLevel||0)>3?'Elevated':'Stable'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Travel View */}
              {engineTab === 'time_travel' && (
                <div style={{display:'flex', gap:20, animation:'fadeIn 0.3s ease', height:'100%'}}>
                  <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:C.textMuted, marginBottom:8}}>
                      <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:2, background:'#10b981'}}/> Optimized</div>
                      <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:2, background:'#3b82f6'}}/> Current</div>
                      <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:2, background:'#ef4444'}}/> Risk</div>
                    </div>

                    <div style={{flex:1, position:'relative'}}>
                      <div style={{position:'absolute', left:0, top:0, bottom:16, width:16, display:'flex', flexDirection:'column', justifyContent:'space-between', fontSize:8, color:'#475569'}}>
                        <span>250</span><span>125</span><span>0</span>
                      </div>
                      <div style={{position:'absolute', left:20, right:0, top:4, bottom:16}}>
                        {[0,1,2].map(i=><div key={i} style={{position:'absolute', left:0, right:0, top:`${i*50}%`, height:1, background:'rgba(255,255,255,0.03)'}}/>)}
                        <svg style={{position:'absolute', inset:0, width:'100%', height:'100%'}} preserveAspectRatio="none">
                          <path d={`M 0,100% ${pts('o')}`} fill="none" stroke="#10b981" strokeWidth="2"/>
                          <path d={`M 0,100% ${pts('c')}`} fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
                          <path d={`M 0,100% ${pts('r')}`} fill="none" stroke="#ef4444" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div style={{position:'absolute', bottom:0, left:20, right:0, display:'flex', justifyContent:'space-between', fontSize:8, color:'#475569'}}>
                        <span>Now</span><span>{currentYear+5}</span><span>{currentYear+10}</span><span>2045</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{display:'flex', flexDirection:'column', justifyContent:'center', gap:10, width:160, borderLeft:`1px solid ${C.border}`, paddingLeft:16}}>
                    <div style={{fontSize:10, fontWeight:600, color:C.text, marginBottom:4}}>Explore Trajectories</div>
                    <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:C.text}}>
                       <input type="checkbox" defaultChecked style={{accentColor:'#10b981'}}/>
                       Optimized Timeline
                    </label>
                    <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:C.text}}>
                       <input type="checkbox" defaultChecked style={{accentColor:'#3b82f6'}}/>
                       Current Baseline
                    </label>
                    <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:10, color:C.text}}>
                       <input type="checkbox" defaultChecked style={{accentColor:'#ef4444'}}/>
                       High Risk Events
                    </label>
                    <div style={{fontSize:8, color:C.textMuted, marginTop:4, lineHeight:1.3}}>Toggle variables to instantly update your 2045 state projection.</div>
                  </div>
                </div>
              )}

              {/* Simulator View */}
              {engineTab === 'simulator' && (
                <div style={{display:'flex', flexDirection:'column', animation:'fadeIn 0.3s ease', height:'100%'}}>
                  <div style={{display:'flex', gap:30, flex:1}}>
                    {/* Sliders */}
                    <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:20}}>
                      <div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:C.text, marginBottom:6}}>
                          <span>If I sleep <span style={{color:'#8b5cf6', fontWeight:600}}>+1 hour</span>...</span>
                          <span style={{color:'#10b981'}}>Health +15%</span>
                        </div>
                        <div style={{height:4, background:C.border, borderRadius:2, position:'relative'}}>
                          <div style={{position:'absolute', left:0, top:0, bottom:0, width:'65%', background:'#8b5cf6', borderRadius:2}}/>
                          <div style={{position:'absolute', left:'65%', top:'50%', transform:'translate(-50%,-50%)', width:12, height:12, background:'#fff', border:'2px solid #8b5cf6', borderRadius:'50%', cursor:'pointer'}}/>
                        </div>
                      </div>
                      <div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:C.text, marginBottom:6}}>
                          <span>If I save <span style={{color:'#8b5cf6', fontWeight:600}}>5%</span>...</span>
                          <span style={{color:'#10b981'}}>Wealth +$120k</span>
                        </div>
                        <div style={{height:4, background:C.border, borderRadius:2, position:'relative'}}>
                          <div style={{position:'absolute', left:0, top:0, bottom:0, width:'40%', background:'#8b5cf6', borderRadius:2}}/>
                          <div style={{position:'absolute', left:'40%', top:'50%', transform:'translate(-50%,-50%)', width:12, height:12, background:'#fff', border:'2px solid #8b5cf6', borderRadius:'50%', cursor:'pointer'}}/>
                        </div>
                      </div>
                    </div>

                    {/* Butterfly Effect Map */}
                    <div style={{flex:1, position:'relative', borderLeft:`1px solid ${C.border}`}}>
                      <div style={{position:'absolute', inset:0}}>
                        <svg style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
                          <path d="M30 20 Q70 20 90 50 T110 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 2"/>
                          <path d="M30 100 Q70 100 90 70 T110 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 2"/>
                        </svg>
                        
                        <div style={{position:'absolute', top:'10%', left:'15%', transform:'translate(-50%,-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, textAlign:'center', color:'#c4b5fd'}}>{dynamicSkill.slice(0,10)}</div>
                        <div style={{position:'absolute', top:'80%', left:'15%', transform:'translate(-50%,-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, textAlign:'center', color:'#fcd34d'}}>Save 5%</div>
                        <div style={{position:'absolute', top:'10%', left:'65%', transform:'translate(-50%,-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, textAlign:'center', color:'#6ee7b7'}}>+30% Sal</div>
                        <div style={{position:'absolute', top:'80%', left:'65%', transform:'translate(-50%,-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, textAlign:'center', color:'#6ee7b7'}}>+$120k</div>
                        <div style={{position:'absolute', top:'45%', left:'90%', transform:'translate(-50%,-50%)', width:32, height:32, borderRadius:'50%', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, textAlign:'center', color:C.textMuted}}>-40% Stress</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div style={{display:'flex', flexDirection:'column', gap:12, height:'100%'}}>
          
          {/* Burnout Risk Card */}
          <div style={{...S(), padding:16, flexShrink:0}}>
            <h2 style={{fontSize:12, fontWeight:600, color:C.text, margin:'0 0 16px'}}>Burnout Risk</h2>
            
            <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:16}}>
              <div style={{position:'relative', width:50, height:50}}>
                <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%', transform:'rotate(-90deg)'}}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="44" fill="none" stroke={burnoutRisk>60?'#ef4444':'#f59e0b'} strokeWidth="8" strokeDasharray={`${(burnoutRisk/100)*276} 276`} strokeLinecap="round"/>
                </svg>
                <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              </div>
              <div>
                <div style={{fontSize:12, color:burnoutRisk>60?'#ef4444':'#f59e0b', fontWeight:600}}>{burnoutRisk>60?'High':burnoutRisk>30?'Medium':'Low'}</div>
                <div style={{fontSize:20, fontWeight:700, color:C.text, lineHeight:1.2}}>{burnoutRisk}%</div>
              </div>
            </div>

            <div style={{fontSize:10, color:C.text, fontWeight:500, marginBottom:2}}>{burnoutRisk>40?'Recovery needed':'On track'}</div>
            <div style={{fontSize:9, color:C.textMuted}}>{burnoutRisk>40?'Take a break.':'Maintain habits.'}</div>
          </div>

          
          {/* Today's Plan */}
          <div style={{...S(), padding:16, flex:1, display:'flex', flexDirection:'column', minHeight:0}}>
            <h2 style={{fontSize:12, fontWeight:600, color:C.text, margin:'0 0 6px'}}>Today's Plan</h2>
            <div style={{fontSize:10, color:C.textMuted, marginBottom:10}}>{planDoneCount} / {todayPlan.length} completed</div>
            
            <div style={{height:3, background:C.border, borderRadius:2, marginBottom:12, position:'relative', overflow:'hidden', flexShrink:0}}>
              <div style={{position:'absolute', left:0, top:0, bottom:0, width:`${todayPlan.length?(planDoneCount/todayPlan.length)*100:0}%`, background:'#8b5cf6', borderRadius:2, transition:'width 0.3s ease'}}/>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:8, overflowY:'auto', scrollbarWidth:'none', paddingRight:4}}>
              {todayPlan.length ? todayPlan.map((task,i)=>(
                <div key={i} onClick={()=>setCheckedTasks(p=>({...p,[task.id]:!p[task.id]}))} style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}} className="group">
                  <div style={{width:14, height:14, borderRadius:'50%', border:task.done?'none':'1px solid #475569', background:task.done?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}} className={!task.done?'group-hover:border-white/40 transition-colors':''}>
                    {task.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{flex:1, fontSize:10, color:task.done?C.text:C.textMuted, fontWeight:task.done?500:400, textDecoration:task.done?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{task.text}</span>
                  <span style={{fontSize:8, color:C.textMuted, flexShrink:0}}>{task.time}</span>
                </div>
              )) : (
                <div style={{fontSize:10, color:C.textMuted}}>No tasks scheduled.</div>
              )}
            </div>

            {/* Growth Gamification */}
            <div style={{marginTop:'auto', paddingTop:12, borderTop:`1px solid ${C.border}`}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                <div>
                  <div style={{fontSize:12, fontWeight:700, color:C.text, display:'flex', alignItems:'center', gap:6}}>
                    <span style={{fontSize:14}}>🌱</span> Life Tree
                  </div>
                  <div style={{fontSize:9, color:C.textMuted}}>Grows as you complete tasks</div>
                </div>
                <div style={{fontSize:14, fontWeight:800, color:planDoneCount===todayPlan.length&&todayPlan.length>0?'#10b981':C.textMuted}}>
                  {Math.round((todayPlan.length ? planDoneCount/todayPlan.length : 0)*100)}%
                </div>
              </div>
              <div style={{width:'100%', height:70, background:'rgba(0,0,0,0.2)', borderRadius:12, position:'relative', overflow:'hidden', display:'flex', alignItems:'flex-end', justifyContent:'center', border:`1px solid ${C.border}`}}>
                {/* Dirt */}
                <div style={{width:'100%', height:12, background:'#3f3f46', position:'absolute', bottom:0}} />
                <div style={{width:'100%', height:2, background:'#52525b', position:'absolute', bottom:12}} />
                
                {/* SVG Plant */}
                {(() => {
                  const percent = todayPlan.length ? planDoneCount/todayPlan.length : 0;
                  const blur = Math.max(0, 4 - (percent * 4));
                  const glow = percent * 10;
                  return (
                    <svg viewBox="0 0 100 100" style={{
                        width:90, height:90, zIndex:1, overflow:'visible', position:'absolute', bottom:4,
                        filter: `blur(${blur}px) drop-shadow(0 0 ${glow}px rgba(16,185,129,${percent}))`,
                        transition: 'filter 1s ease-out, opacity 1s ease-out',
                        opacity: 0.3 + (percent * 0.7)
                    }}>
                      <defs>
                        <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#064e3b" />
                        </linearGradient>
                        <linearGradient id="leafGrad1" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                        <linearGradient id="leafGrad2" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="leafGrad3" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#6ee7b7" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      
                      {/* Stem */}
                      <path d="M50 90 C 45 65, 55 45, 50 20" fill="none" stroke="url(#stemGrad)" strokeWidth="4.5" strokeLinecap="round" />
                      
                      {/* Branches */}
                      <path d="M51 60 C 65 55, 75 45, 80 30" fill="none" stroke="url(#stemGrad)" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M49 70 C 35 60, 25 50, 20 35" fill="none" stroke="url(#stemGrad)" strokeWidth="3" strokeLinecap="round" />
                      <path d="M50 40 C 40 30, 35 25, 30 15" fill="none" stroke="url(#stemGrad)" strokeWidth="2" strokeLinecap="round" />

                      {/* Leaves */}
                      <path d="M20 35 C 5 30, 5 50, 15 50 C 25 50, 30 40, 20 35 Z" fill="url(#leafGrad1)" opacity="0.95" />
                      <path d="M80 30 C 95 25, 95 45, 85 50 C 75 55, 70 40, 80 30 Z" fill="url(#leafGrad1)" opacity="0.95" />
                      <path d="M30 15 C 20 10, 15 25, 25 30 C 35 35, 40 25, 30 15 Z" fill="url(#leafGrad2)" />
                      
                      {/* Crown */}
                      <path d="M50 20 C 35 -5, 65 -5, 50 20 Z" fill="url(#leafGrad3)" />
                      <path d="M50 20 C 25 10, 75 10, 50 20 Z" fill="url(#leafGrad2)" opacity="0.8" />
                      <circle cx="50" cy="18" r="4" fill="#6ee7b7" opacity="0.5" />

                      {/* Glowing Seed */}
                      <ellipse cx="50" cy="90" rx="14" ry="4" fill="#10b981" opacity="0.15" />
                      <circle cx="50" cy="88" r="5" fill="#8b5cf6" />
                      <circle cx="50" cy="88" r="10" fill="#8b5cf6" opacity="0.4" className="animate-pulse" />
                      <circle cx="50" cy="88" r="15" fill="#8b5cf6" opacity="0.15" className="animate-pulse" style={{animationDelay:'0.5s'}} />
                    </svg>
                  );
                })()}
              </div>
            </div>
          </div>


          {/* Talk to Your Future Self */}
          <div style={{...S(theme === 'dark' ? 'linear-gradient(145deg, rgba(139,92,246,0.05) 0%, rgba(17,19,28,1) 100%)' : '#fafafa', 'rgba(139,92,246,0.2)'), padding:16, flexShrink:0, position: 'relative', overflow: 'hidden'}}>
            {/* Ambient Glow */}
            <div style={{position:'absolute', top:0, left:0, right:0, height:60, background:'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, transparent 100%)', pointerEvents:'none'}} />

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, position:'relative'}}>
              <h2 style={{fontSize:13, fontWeight:700, color:C.text, margin:0, display:'flex', alignItems:'center', gap:6}}>
                <span style={{color:'#8b5cf6'}}>✨</span> Future Self
              </h2>
              <span style={{fontSize:9, fontWeight:700, color:'#8b5cf6', background:'rgba(139,92,246,0.15)', padding:'3px 8px', borderRadius:10}}>AI BETA</span>
            </div>

            <div style={{display:'flex', gap:12, marginBottom:16, position:'relative'}}>
              <div style={{width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(139,92,246,0.2)'}}>
                <span style={{fontSize:16, color:'#fff'}}>🔮</span>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:700, color:'#a78bfa', marginBottom:4, letterSpacing:0.5}}>{futureYear} • AGE {userAge}</div>
                <div style={{fontSize:11, color:C.text, lineHeight:1.5, fontWeight:400}}>
                  {aiNarrative || `Hey! Thank you for starting those 6AM runs in ${currentYear}. We feel amazing.`}
                </div>
              </div>
            </div>

            <div style={{position:'relative'}}>
              <input placeholder="Ask your future self..." style={{width:'100%', background:theme === 'dark' ? 'rgba(0,0,0,0.3)' : '#fff', border:`1px solid ${C.border}`, padding:'10px 36px 10px 14px', borderRadius:24, color:C.text, fontSize:11, outline:'none', boxSizing:'border-box', transition:'border-color 0.3s'}} onFocus={(e)=>e.target.style.borderColor='#8b5cf6'} onBlur={(e)=>e.target.style.borderColor=C.border} />
              <button style={{position:'absolute', right:4, top:4, width:26, height:26, borderRadius:'50%', background:'#8b5cf6', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(139,92,246,0.3)'}} className="hover:scale-110 transition-transform">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
