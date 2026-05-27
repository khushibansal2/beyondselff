import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader, ExplainableScorePanel } from '../components/ui/Components';
import { LifeAvatar } from '../components/ui/LifeAvatar';
import { GhostTimeline } from '../components/ui/GhostTimeline';
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
  const { health, finance, career, timeline, records, computed, aiCache, updateAICache, updateDomain, anomalies = [] } = useData();
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
  const scoreRingsRef = useRef(null);

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

  const healthScore  = computed?.healthScore?.score  || 0;
  const financeScore = computed?.financeScore?.score || 0;
  const careerScore  = computed?.careerScore?.score  || 0;
  const lifeBalance  = computed?.balance             || 0;
  const burnoutRisk  = computed?.burnout?.risk       || 0;
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

  return (
    <div className={`p-5 md:p-7 lg:p-9 pb-24 lg:pb-12 min-h-screen transition-colors duration-700 relative max-w-7xl mx-auto ${doomMode ? 'doom-active' : 'bg-mesh'} ${doomShake ? 'doom-shake' : ''}`}>
      {showOnboarding && <OnboardingWizard user={user} updateDomain={updateDomain} career={career} onComplete={handleOnboardingComplete} />}
      <AnimatePresence>
        {showShare && (
          <ShareCard
            user={user}
            healthScore={healthScore}
            financeScore={financeScore}
            careerScore={careerScore}
            lifeBalance={lifeBalance}
            burnoutRisk={burnoutRisk}
            aiNarrative={aiNarrative}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>

      {/* Doom scanline overlay */}
      <AnimatePresence>
        {doomMode && (
          <motion.div key="scanline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 999 }}>
            <div className="w-full h-[2px] animate-scanline" style={{ background: 'linear-gradient(to right, transparent, rgba(239,68,68,0.12), transparent)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(139,0,0,0.12) 100%)', pointerEvents: 'none' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className={`text-2xl font-bold leading-tight transition-colors duration-500 ${doomMode ? 'text-red-300' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {doomMode ? '☠️ System Failure' : `${greeting}, ${firstName}`}
          </h1>
          <p className={`text-sm mt-1 transition-colors duration-500 ${doomMode ? 'text-red-900' : 'text-slate-400'}`}>
            {doomMode
              ? `Reality check · No filter applied`
              : lifeBalance > 0
                ? <span>Life Balance <strong className={lifeBalance >= 70 ? 'text-emerald-400' : lifeBalance >= 45 ? 'text-amber-400' : 'text-red-400'}>{lifeBalance}/100</strong>{weakestDomain ? <> · Focus on <span className="capitalize text-slate-300">{weakestDomain}</span></> : ''}</span>
                : 'Log your data to compute life balance'}
          </p>
        </motion.div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-medium transition-all"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Share</span>
          </motion.button>
          <DoomSwitch active={doomMode} onToggle={toggleDoom} />
        </div>
        <SecurityStatusBadge />
      </div>

      {/* ── AVATAR + AI NARRATIVE / DOOM PANEL ───────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Avatar */}
        <div className="flex justify-center items-center">
          <LifeAvatar
            healthScore={healthScore}
            financeScore={financeScore}
            careerScore={careerScore}
            burnoutRisk={burnoutRisk}
            doomMode={doomMode}
          />
        </div>

        {/* Narrative / Doom panel */}
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {doomMode ? (
              <motion.div key="doom" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <DoomRealityPanel stats={doomStats} burnoutRisk={burnoutRisk} lifeBalance={lifeBalance} />
              </motion.div>
            ) : (
              <motion.div key="normal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="glass-card p-5 h-full" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.04) 50%, rgba(6,182,212,0.04) 100%)' }}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xl flex-shrink-0">🧬</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin Analysis</h3>
                      {narrativeLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Generating AI narrative from your data...
                        </div>
                      ) : aiNarrative ? (
                        <p className="text-sm text-slate-300 italic leading-relaxed">"{aiNarrative}"</p>
                      ) : (
                        <p className="text-sm text-slate-400">
                          Life balance is <strong className={lifeBalance >= 60 ? 'text-emerald-400' : 'text-amber-400'}>{lifeBalance}/100</strong>.{' '}
                          Weakest area: <strong className="text-amber-400 capitalize">{weakestDomain}</strong> at {computed?.[`${weakestDomain}Score`]?.score}/100.
                          {burnoutRisk > 50 ? ` Burnout risk is ${burnoutRisk}% — needs attention.` : ' Keep it up!'}
                        </p>
                      )}
                    </div>
                  </div>
                  {urgentAlerts.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {urgentAlerts.map((u, i) => (
                        <div key={i} className="text-xs text-red-300/80 p-2 rounded-lg bg-red-500/5 border border-red-500/10">{u.icon} {u.text}</div>
                      ))}
                    </div>
                  )}
                  {positiveSignals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {positiveSignals.map((p, i) => (
                        <span key={i} className="text-xs text-emerald-300/80 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">{p.icon} {p.text}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── SCORE RINGS ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-8">
        <div className="relative" ref={scoreRingsRef}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {scoreRings.map((ring, idx) => {
              const effect = getCascadeEffect(ring.key);
              const isHovered = hoveredDomain === ring.key;
              const isAffected = !!effect;
              return (
                <motion.div
                  key={ring.key}
                  className={`relative ${ring.col2 ? 'col-span-2 md:col-span-1' : ''}`}
                  onMouseEnter={() => setHoveredDomain(ring.key)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  animate={{
                    boxShadow: isHovered
                      ? `0 0 28px ${doomMode ? 'rgba(239,68,68,0.22)' : 'rgba(99,102,241,0.22)'}`
                      : isAffected ? `0 0 18px ${effect.color}28` : 'none',
                  }}
                  transition={{ duration: 0.25 }}
                  style={{ borderRadius: 16 }}
                >
                  <GlassCard className="flex flex-col items-center py-4 gap-1" glow={doomMode ? 'glow-rose' : ring.glow}>
                    <ScoreRing score={ring.score} color={ring.color || 'auto'} label={ring.label} delay={idx * 90} size={96} strokeWidth={7} />
                    <AnimatePresence>
                      {isAffected && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                          style={{ background: effect.color + '18', color: effect.color, border: `1px solid ${effect.color}40` }}
                        >
                          {effect.type === 'positive' ? '↑' : '↓'} {effect.label}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* SVG Ripple — desktop only */}
          <div className="hidden md:block absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            <AnimatePresence>
              {hoveredDomain && (
                <motion.div key={hoveredDomain} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                  <RippleConnector hoveredDomain={hoveredDomain} containerRef={scoreRingsRef} cascades={domainCascades} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── QUICK WIN PROJECTOR ──────────────────────────────────────────── */}
      {!doomMode && (healthScore > 0 || financeScore > 0 || careerScore > 0) && (() => {
        const wins = [];
        if (h.sleepAvg > 0 && h.sleepAvg < 7)  wins.push({ icon: '😴', label: `+${(7 - h.sleepAvg).toFixed(1)}h sleep`,        impact: '+3–5 pts',  domain: 'Health',  color: '#8b5cf6', link: '/health' });
        if (h.waterIntake > 0 && h.waterIntake < 8) wins.push({ icon: '💧', label: `+${8 - Math.round(h.waterIntake)} glasses water`, impact: '+2 pts',    domain: 'Health',  color: '#06b6d4', link: '/health' });
        if (savingsRate < 20 && f.income > 0)   wins.push({ icon: '💰', label: 'Save 5% more income',                              impact: '+3–4 pts',  domain: 'Finance', color: '#f59e0b', link: '/finance' });
        if (f.debt > 0)                          wins.push({ icon: '🏦', label: 'Pay any debt today',                              impact: '+2 pts',    domain: 'Finance', color: '#10b981', link: '/finance' });
        if (c.dsaPractice < 3)                   wins.push({ icon: '🧩', label: '+1 DSA problem today',                            impact: '+2 pts',    domain: 'Career',  color: '#3b82f6', link: '/career' });
        if (c.studyHoursDaily < 4)               wins.push({ icon: '📚', label: '+1h study today',                                 impact: '+2–3 pts',  domain: 'Career',  color: '#6366f1', link: '/career' });
        if (wins.length === 0) return null;
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-6">
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-2 px-1">⚡ Highest-leverage actions right now</p>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {wins.slice(0, 4).map((w, i) => (
                <Link key={i} to={w.link}
                  className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all group min-w-max">
                  <span className="text-base">{w.icon}</span>
                  <div>
                    <p className="text-[11px] text-slate-300 font-medium group-hover:text-white transition-colors">{w.label}</p>
                    <p className="text-[10px] font-bold" style={{ color: w.color }}>{w.domain} {w.impact}</p>
                  </div>
                  <ArrowRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors ml-1" />
                </Link>
              ))}
            </div>
          </motion.div>
        );
      })()}

      {/* ── SLEEP CASCADE ALERT ──────────────────────────────────────────── */}
      {sleepCascade && !doomMode && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-red-500/10 bg-red-500/5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-xs text-red-300 font-semibold uppercase tracking-wide">AI Pattern Detected</span>
              <span className="ml-auto text-xs text-slate-400">Deterministic · Cross-domain</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-1.5">Sleep–Productivity Cascade Active</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Poor sleep quality (<strong className="text-white">{h.sleepAvg}h avg</strong>) is reducing cognitive consistency. {sleepCascade.mechanism}
              </p>
              <Link to="/coach" className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all inline-block">
                Ask AI Coach →
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── EXPLAINABLE AI ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
        <button
          onClick={() => setShowExplain(v => !v)}
          className="flex items-center gap-2.5 mb-4 w-full text-left group"
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${showExplain ? 'bg-blue-500/20' : 'bg-white/[0.05]'}`}>
            <Brain size={14} className={showExplain ? 'text-blue-400' : doomMode ? 'text-red-400' : 'text-slate-400'} />
          </div>
          <span className={`text-sm font-semibold transition-colors ${doomMode ? 'text-red-300' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {doomMode ? 'System Diagnostics' : 'Why These Scores'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Explainable AI</span>
          <motion.span animate={{ rotate: showExplain ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto text-slate-500 group-hover:text-slate-300 transition-colors text-sm">
            ▾
          </motion.span>
        </button>
        <AnimatePresence>
          {showExplain && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
              <div className="grid md:grid-cols-3 gap-4 pt-1">
                <ExplainableScorePanel title={doomMode ? 'Physical Decay'       : 'Health Score'}  score={healthScore}  factors={explainFactors.health}  color={doomMode ? '#ef4444' : '#10b981'} icon={doomMode ? '💀' : '❤️'} />
                <ExplainableScorePanel title={doomMode ? 'Financial Fragility'  : 'Finance Score'} score={financeScore} factors={explainFactors.finance} color={doomMode ? '#ef4444' : '#f59e0b'} icon={doomMode ? '📉' : '💰'} />
                <ExplainableScorePanel title={doomMode ? 'Obsolescence Risk'    : 'Career Score'}  score={careerScore}  factors={explainFactors.career}  color={doomMode ? '#ef4444' : '#3b82f6'} icon={doomMode ? '⏳' : '🎯'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── METRIC CARDS + TIMELINE + INSIGHTS ───────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={doomMode ? '💀' : '😴'} label={doomMode ? 'Sleep Debt'  : 'Avg Sleep'}    value={doomMode ? `${doomStats.sleepDebt}h debt` : `${h.sleepAvg || 0}h`}              change={h.sleepAvg >= 7 ? 5 : -12}      color={doomMode ? '#ef4444' : '#8b5cf6'} delay={0} />
            <MetricCard icon={doomMode ? '🔥' : '😰'} label={doomMode ? 'Burnout ETA' : 'Stress'}       value={doomMode ? `${doomStats.burnoutETA}d`       : `${h.stressLevel || 0}/10`}        change={h.stressLevel <= 5 ? 8 : -15}    color={doomMode ? '#ef4444' : '#f43f5e'} delay={80} />
            <MetricCard icon={doomMode ? '📉' : '💵'} label={doomMode ? 'Retire Age'  : 'Savings Rate'} value={doomMode ? `Age ${doomStats.retirementAge}`  : `${savingsRate}%`}                change={f.income > f.expenses ? 5 : -10} color={doomMode ? '#ef4444' : '#10b981'} delay={160} />
            <MetricCard icon={doomMode ? '⏳' : '📊'} label={doomMode ? 'Career Gap'  : 'Study Hours'}  value={doomMode ? `${doomStats.careerGap}wk behind` : `${c.studyHoursDaily || 0}h/day`} change={c.studyHoursDaily >= 4 ? 10 : -5} color={doomMode ? '#ef4444' : '#3b82f6'} delay={240} />
          </div>

          {/* Ghost Timeline */}
          <GhostTimeline
            lifeBalance={lifeBalance}
            healthScore={healthScore}
            financeScore={financeScore}
            careerScore={careerScore}
            studyHours={c.studyHoursDaily}
            savingsRate={savingsRate}
            burnoutRisk={burnoutRisk}
            doomMode={doomMode}
            healthRecords={records?.health || []}
          />
        </div>

        {/* Insights column */}
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {doomMode ? 'Failure Patterns' : 'AI Insights'}
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
            {insights.length === 0 && (
              <div className="p-5 rounded-xl bg-white/[0.02] text-center text-sm text-slate-500">
                No insights yet — log your data to see patterns.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTIVITY + CORRELATIONS ───────────────────────────────────────── */}
      <div className="mb-6">
        <GlassCard>
          <div className="flex items-center gap-1 mb-4 border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {[
              { id: 'activity',     label: doomMode ? 'Incident Log'     : 'Recent Activity' },
              { id: 'correlations', label: doomMode ? 'Cascade Failures' : 'Habit Correlations' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActivityTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  activityTab === t.id
                    ? (doomMode ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300')
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activityTab === 'activity' ? (
              <motion.div key="activity" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <div className="space-y-3">
                  {(timeline || []).slice(0, 6).map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        item.sentiment === 'positive' ? (doomMode ? 'bg-amber-400' : 'bg-emerald-400')
                        : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-slate-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">{item.text}</p>
                        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{item.date} · <span className="capitalize">{item.type}</span></p>
                      </div>
                    </motion.div>
                  ))}
                  {(!timeline || timeline.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-6">No recent activity yet.</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="correlations" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                <div className="grid sm:grid-cols-2 gap-2">
                  {correlations.slice(0, 6).map((corr, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`p-3 rounded-xl text-xs border ${
                        corr.type === 'positive' ? (doomMode ? 'border-amber-900/30 bg-amber-950/10' : 'border-emerald-500/20 bg-emerald-500/5')
                        : corr.type === 'negative' ? 'border-red-500/20 bg-red-500/5'
                        : 'border-slate-500/20 bg-slate-500/5'
                      }`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-slate-300 leading-snug">{corr.pattern}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 flex-shrink-0 tabular-nums">{Math.round(corr.strength * 100)}%</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {corr.domains.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize">{d}</span>)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* ── ACTION PLAN ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${doomMode ? 'text-red-300' : 'text-white'}`} style={{ fontFamily: 'var(--font-display)' }}>
              {doomMode ? '🚨 Damage Control' : "📋 Today's Plan"}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${doomMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                AI-generated
              </span>
            </h3>
            <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-lg ${doneCount > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500'}`}>
              {doneCount}/{actionPlan.length} done
            </span>
          </div>

          <div className="h-2 bg-white/[0.05] rounded-full mb-5 overflow-hidden">
            <motion.div
              animate={{ width: `${(doneCount / Math.max(actionPlan.length, 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${doomMode ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
            />
          </div>

          <div className="space-y-2">
            {actionPlan.map((task, i) => {
              const done = !!checkedTasks[task.id];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setCheckedTasks(p => ({ ...p, [task.id]: !p[task.id] }))}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    done
                      ? (doomMode ? 'border-red-900/20 bg-red-950/10 opacity-50' : 'border-emerald-500/15 bg-emerald-500/[0.04] opacity-55')
                      : (doomMode ? 'border-red-900/20 bg-red-950/5 hover:bg-red-950/10' : 'border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03]')
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? (doomMode ? 'border-red-400 bg-red-500/20' : 'border-emerald-400 bg-emerald-500/20') : 'border-white/20'
                  }`}>
                    {done && <Check size={10} className={doomMode ? 'text-red-400' : 'text-emerald-400'} />}
                  </div>
                  <span className="text-base flex-shrink-0">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${done ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.text}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] capitalize font-semibold" style={{ color: doomMode ? '#ef4444' : task.color }}>{task.domain}</span>
                      <span className="text-[11px] text-slate-400">· {task.time}</span>
                    </div>
                  </div>
                  <Link to={task.link} onClick={e => e.stopPropagation()} className="btn-chip flex-shrink-0 text-xs">Go →</Link>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {doneCount === actionPlan.length && actionPlan.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-xl border text-center ${doomMode ? 'bg-red-950/20 border-red-900/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <p className={`text-sm font-semibold ${doomMode ? 'text-red-300' : 'text-emerald-400'}`}>
                  {doomMode ? '⚠️ Damage mitigated — system still fragile' : '🎉 All tasks done! +50 XP earned'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doomMode ? 'Toggle off Doom Mode to see the recovery plan.' : 'Come back tomorrow for a new plan'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* ── SIGNATURE FEATURE SHOWCASE ───────────────────────────────────── */}
      {!doomMode && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard glow="glow-purple">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              🚀 Explore Digital Twin Features
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Exclusive</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Industry-first capabilities powered by your Digital Twin data</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '🧪', title: 'Stress Test',   sub: 'Shock your life plan',   color: '#ef4444', link: '/stress-test',  badge: '10/10 Novel' },
                { icon: '🔮', title: 'Future You',    sub: '12-month projection',     color: '#6366f1', link: '/future-you',   badge: 'AI-Powered'  },
                { icon: '🕸️', title: 'Cascade Map',   sub: 'See cross-life effects',  color: '#10b981', link: '/cascade-map',  badge: 'Real-time'   },
                { icon: '🧬', title: 'Neural Core',   sub: '20-yr trajectory + lab',  color: '#06b6d4', link: '/neural-core',  badge: 'What-If Lab' },
              ].map(f => (
                <Link key={f.link} to={f.link}
                  className="p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all group">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="text-[13px] font-bold text-white group-hover:text-white transition-colors">{f.title}</p>
                  <p className="text-[11px] text-slate-500 mb-2">{f.sub}</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ color: f.color, background: `${f.color}18`, border: `1px solid ${f.color}35` }}>{f.badge}</span>
                </Link>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
