import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateNarrative } from '../services/aiService';
import { ScoreRing, GlassCard, MetricCard, InsightCard, PageHeader, ExplainableScorePanel } from '../components/ui/Components';
import { LifeAvatar } from '../components/ui/LifeAvatar';
import { GhostTimeline } from '../components/ui/GhostTimeline';
import { LifePlant, getStage } from '../components/ui/LifePlant';
import { Link } from 'react-router-dom';
import { generateTrendData, generateCorrelations, generateInsights } from '../data/demoData';
import { computeHealthScore } from '../engines/healthScoreEngine';
import { computeFinanceScore } from '../engines/financeScoreEngine';
import { computeCareerScore } from '../engines/careerScoreEngine';
import { fetchGitHubProfile } from '../services/githubService';
import {
  CheckCircle, AlertTriangle, Activity, Landmark, Briefcase,
  Check, ArrowRight, Loader2, Smartphone, Brain, Share2, X, Zap,
  Download, ShieldCheck, Lock, EyeOff,
} from 'lucide-react';

// ─── SECURITY STATUS BADGE ────────────────────────────────────────────────────
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
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 select-none ${active
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
      <div className={`relative rounded-full transition-colors duration-300 ${active ? 'bg-red-600' : 'bg-white/10'}`} style={{ height: 18, width: 36 }}>
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
              { domain: 'Health', status: selections.health, color: 'text-emerald-400' },
              { domain: 'Career', status: selections.career, color: 'text-blue-400' },
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
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="rounded-3xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, #0f1224 0%, #1a1040 50%, #0d0d1a 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 30px 60px rgba(0,0,0,0.5)',
        }}>
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

          <div className="px-6 py-5 text-center border-b border-white/[0.05]">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Life Balance Score</p>
            <p className="text-7xl font-black leading-none" style={{ color: lifeColor, fontFamily: 'var(--font-display)' }}>
              {lifeBalance}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: lifeColor }}>
              {lifeBalance >= 70 ? '✅ Balanced' : lifeBalance >= 45 ? '⚠️ At Risk' : '🚨 Needs Attention'}
            </p>
          </div>

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

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-indigo-400" />
                <span className="text-[10px] text-indigo-400 font-semibold">BeyondSelf AI Life OS</span>
              </div>
              <span className="text-[9px] text-slate-600">AI-powered · Cross-domain</span>
            </div>
          </div>
        </div>

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

// ─── FALLBACK CASCADES ────────────────────────────────────────────────────────
const FALLBACK_CASCADES = {
  health: [
    { to: 'career', type: 'positive', label: 'Boosts Focus', color: '#10b981' },
    { to: 'finance', type: 'positive', label: 'Discipline', color: '#10b981' },
  ],
  finance: [
    { to: 'health', type: 'negative', label: 'Stress Risk', color: '#ef4444' },
    { to: 'career', type: 'positive', label: 'Drives Ambition', color: '#10b981' },
  ],
  career: [
    { to: 'health', type: 'negative', label: 'Recovery Cost', color: '#ef4444' },
    { to: 'finance', type: 'positive', label: 'Income Boost', color: '#10b981' },
  ],
};

function buildDomainCascades(crossDomain = []) {
  if (!crossDomain.length) return FALLBACK_CASCADES;
  const result = { health: [], finance: [], career: [] };
  crossDomain.forEach(c => {
    const isNeg = c.type === 'negative';
    const color = c.severity === 'critical' ? '#ef4444' : isNeg ? '#f97316' : '#10b981';
    let label = c.effect?.split('.')[0] || (isNeg ? 'Negative impact' : 'Positive impact');
    if (c.computedImpact?.productivityLoss) label = `-${c.computedImpact.productivityLoss}% Productivity`;
    if (c.computedImpact?.excessSpending) label = `-₹${(c.computedImpact.excessSpending / 1000).toFixed(0)}K Spending`;
    if (c.computedImpact?.focusBoost) label = `+${c.computedImpact.focusBoost}% Focus`;
    if (c.computedImpact?.alertnessReduction) label = `-${c.computedImpact.alertnessReduction}% Alertness`;
    if (result[c.from]) result[c.from].push({ to: c.to, type: c.type, label, color });
  });
  ['health', 'finance', 'career'].forEach(d => {
    if (!result[d].length) result[d] = FALLBACK_CASCADES[d];
  });
  return result;
}

// ─── STATUS PILL ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    good: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', label: 'Good' },
    warning: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', label: 'Warning' },
    critical: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Critical' },
  };
  const s = map[status] || map.warning;
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ─── FACTOR ROW ──────────────────────────────────────────────────────────────
function FactorRow({ name, status, value, unit, weight, pts, rawScore }) {
  const barColors = { good: '#22c55e', warning: '#f97316', critical: '#ef4444' };
  const barColor = barColors[status] || '#f97316';
  const barW = Math.min(100, Math.max(0, rawScore ?? 0));

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 68px 1fr auto', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <StatusPill status={status} />
        <span style={{ fontSize: 9, color: '#6b7280' }}>
          {value != null ? `${value}${unit ? ` ${unit}` : ''}` : '—'} · {Math.round((weight || 0) * 100)}% weight
        </span>
        <span style={{ fontSize: 9, color: status === 'good' ? '#22c55e' : status === 'critical' ? '#ef4444' : '#f97316', fontWeight: 700, whiteSpace: 'nowrap' }}>
          +{pts || 0}pts
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barW}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: barColor, borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

// ─── DOMAIN SCORE CARD ────────────────────────────────────────────────────────
function DomainScoreCard({ icon, title, score, color, factors, bottomChips }) {
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginLeft: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>/100</span>
        </div>
        <button
          onClick={() => document.getElementById('why-scores')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ marginLeft: 'auto', fontSize: 9, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
        >
          🔍 Why this score?
        </button>
      </div>

      <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        FACTOR BREAKDOWN — EXPLAINABLE AI
      </div>

      {/* Factor rows */}
      <div>
        {factors && factors.length > 0 ? (
          factors.map((f, i) => (
            <FactorRow
              key={f.name || i}
              name={f.name}
              status={f.status}
              value={f.value}
              unit={f.unit}
              weight={f.weight}
              pts={f.contribution}
              rawScore={f.rawScore}
            />
          ))
        ) : (
          <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', padding: '12px 0' }}>
            Log data to see factor breakdown.
          </div>
        )}
      </div>

      {/* Footer note */}
      <div style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
        Scores computed deterministically from your logged data. No AI guessing.
      </div>

      {/* Bottom stat chips */}
      {bottomChips && (
        <div style={{ display: 'flex', gap: 8 }}>
          {bottomChips}
        </div>
      )}
    </div>
  );
}

// ─── STAT CHIP ────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, change, isPositive }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{value}</div>
        {change && <div style={{ fontSize: 9, color: isPositive ? '#22c55e' : '#ef4444' }}>{change}</div>}
      </div>
    </div>
  );
}

// ─── EXPLAINABLE AI CARD ──────────────────────────────────────────────────────
function ExplainAICard({ label, display, color, change, up, factors, insight, link, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.025) 0%, #111827 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: `2px solid ${color}`,
        borderRadius: 12,
        padding: '12px 13px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 1 }}>{label}</div>
            <div style={{ fontSize: 7, color: '#374151', marginTop: 1.5, fontWeight: 600, letterSpacing: 0.5 }}>EXPLAINABLE AI</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1 }}>{display}</div>
          <div style={{ fontSize: 9, color: up ? '#22c55e' : '#ef4444', fontWeight: 600, marginTop: 2 }}>{change}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Factor breakdown */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 7, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
          FACTOR BREAKDOWN
        </div>
        {(factors || []).slice(0, 3).map((f, i) => {
          const barColor = f.status === 'good' ? '#22c55e' : f.status === 'critical' ? '#ef4444' : '#f97316';
          const barW = Math.min(100, Math.max(0, f.rawScore ?? 0));
          return (
            <div key={f.name || i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 95 }}>{f.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 8, color: '#6b7280' }}>{f.value != null ? `${f.value}${f.unit ? ` ${f.unit}` : ''}` : '—'}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: barColor }}>{f.status === 'good' ? '✓' : f.status === 'critical' ? '!' : '~'}</span>
                </div>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barW}%` }}
                  transition={{ duration: 0.9, delay: i * 0.1, ease: 'easeOut' }}
                  style={{ height: '100%', background: barColor, borderRadius: 99 }}
                />
              </div>
            </div>
          );
        })}
        {(!factors || factors.length === 0) && (
          <div style={{ fontSize: 9, color: '#374151', textAlign: 'center', padding: '8px 0' }}>Log data to see breakdown.</div>
        )}
      </div>

      {/* Insight */}
      {insight && (
        <div style={{
          fontSize: 9, color: '#94a3b8', lineHeight: 1.5,
          background: `${color}0d`,
          borderLeft: `2px solid ${color}55`,
          borderRadius: '0 6px 6px 0',
          padding: '5px 8px',
        }}>
          {insight}
        </div>
      )}

      {/* Footer CTA */}
      <Link to={link || '/'} style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 8, color: '#374151', fontStyle: 'italic' }}>Deterministic · data-driven</span>
          <span style={{ fontSize: 9, color: color, fontWeight: 600, opacity: 0.75 }}>Details →</span>
        </div>
      </Link>
    </motion.div>
  );
}

const r = 42;
const circ = 2 * Math.PI * r;

function DashboardScoreRing({ label, score, display, color, change, up, isActive, onClick }) {
  const offset = circ - (score / 100) * circ;
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      style={{
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        cursor: 'pointer', padding: '10px 16px', borderRadius: 14,
        background: isActive ? `${color}12` : 'transparent',
        border: isActive ? `1px solid ${color}35` : '1px solid transparent',
        transition: 'background 0.2s, border 0.2s',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', width: 108, height: 108 }}>
        {/* Ambient glow when active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 14, borderRadius: '50%',
              background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }}
          />
        )}
        <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="54" cy="54" r={r + 6} fill="none" stroke={`${color}12`} strokeWidth="1" />
          <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="54" cy="54" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ filter: isActive ? `drop-shadow(0 0 5px ${color}99)` : 'none', transition: 'filter 0.3s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 23, fontWeight: 800, color, lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.5 }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#e2e8f0' : '#9ca3af', transition: 'color 0.2s' }}>{label}</span>
      <span style={{ fontSize: 11, color: up ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{change}</span>
      {/* "Why this score?" dropdown row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 99,
        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}35` : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.2s',
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? color : '#6b7280', transition: 'color 0.2s' }}>
          Why this score?
        </span>
        <motion.span
          animate={{ rotate: isActive ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: 8, color: isActive ? color : '#6b7280', lineHeight: 1, display: 'inline-block' }}
        >
          ▼
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─── WHY-SCORE EXPLANATION BUILDER ───────────────────────────────────────────
function buildWhyExplanation(label, score, factors) {
  if (!factors || factors.length === 0) {
    return {
      headline: `Your ${label} score is ${score}/100`,
      body: `Log your ${label.toLowerCase()} data to get a detailed, factor-by-factor explanation of exactly what's driving this number.`,
      topIssue: null,
      topWin: null,
    };
  }
  const good     = factors.filter(f => f.status === 'good');
  const warning  = factors.filter(f => f.status === 'warning');
  const critical = factors.filter(f => f.status === 'critical');
  const bad      = [...critical, ...warning];

  const level = score >= 80 ? 'strong' : score >= 65 ? 'good' : score >= 45 ? 'moderate' : 'low';
  const headline = `Why is your ${label} score ${score}/100?`;

  let body = '';
  if (bad.length === 0) {
    const names = good.map(f => f.name).join(', ');
    body = `Your score is ${level} because every tracked factor — ${names} — is in a healthy range. Sustain these habits to keep the score climbing.`;
  } else if (good.length === 0) {
    const names = bad.slice(0, 3).map(f => f.name).join(', ');
    body = `Your score is ${level} primarily because ${names} ${bad.length === 1 ? 'is' : 'are'} below target. Each of these is weighted in the final calculation — fixing the highest-weight factor first will move the needle most.`;
  } else {
    const goodNames = good.slice(0, 2).map(f => f.name).join(' and ');
    const badNames  = bad.slice(0, 2).map(f => f.name).join(' and ');
    body = `${goodNames} ${good.length === 1 ? 'is boosting' : 'are boosting'} your score, but ${badNames} ${bad.length === 1 ? 'is pulling it down' : 'are pulling it down'}. `;
    if (critical.length > 0) {
      body += `${critical[0].name} is the most critical factor right now — addressing it would have the largest single impact on your score.`;
    } else {
      body += `Improving ${bad[0].name.toLowerCase()} even slightly would push your score noticeably higher.`;
    }
  }

  return { headline, body, topIssue: bad[0] || null, topWin: good[0] || null };
}

// ─── EXPLAINABLE AI FULL-WIDTH PANEL (expanded on ring click) ─────────────────
function ExplainAIPanel({ label, display, color, icon, change, up, link, factors, insight }) {
  const { headline, body, topIssue, topWin } = buildWhyExplanation(label, display, factors);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, #0f1320 100%)`,
        border: `1px solid ${color}22`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* ── TOP BAR: icon · name · score ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', borderBottom: `1px solid ${color}18`,
        background: `${color}06`,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{label} Score</span>
          <span style={{ fontSize: 9, color: '#4b5563', marginLeft: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>Explainable AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 11, color: '#4b5563' }}>/100</span>
        </div>
        <span style={{ fontSize: 12, color: up ? '#22c55e' : '#ef4444', fontWeight: 700, marginLeft: 4 }}>{change}</span>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', gap: 20 }}>

        {/* ── LEFT: WHY EXPLANATION ── */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Headline */}
          <div>
            <div style={{
              fontSize: 8, fontWeight: 800, color: color,
              textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ display: 'inline-block', width: 14, height: 2, background: color, borderRadius: 99 }} />
              Why this score?
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4,
            }}>
              {headline}
            </div>
          </div>

          {/* Body explanation */}
          <div style={{
            fontSize: 12, color: '#94a3b8', lineHeight: 1.65,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            {body}
          </div>

          {/* Top issue / top win pills */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {topIssue && (
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: topIssue.status === 'critical' ? '#ef4444' : '#f97316',
                background: topIssue.status === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                border: `1px solid ${topIssue.status === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)'}`,
                borderRadius: 6, padding: '4px 9px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>↓</span> {topIssue.name} needs work
              </div>
            )}
            {topWin && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: '#22c55e',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 6, padding: '4px 9px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>✓</span> {topWin.name} is on track
              </div>
            )}
          </div>

          {/* Recommendation / insight */}
          {insight && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 2, alignSelf: 'stretch', background: color, borderRadius: 99, flexShrink: 0, opacity: 0.6 }} />
              <div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>Recommendation</div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{insight}</div>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link to={link || '/'} style={{ textDecoration: 'none', marginTop: 'auto' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: color,
              background: `${color}12`, border: `1px solid ${color}30`,
              borderRadius: 8, padding: '8px 14px',
              display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}22`}
              onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
            >
              Open {label} page →
            </div>
          </Link>
        </div>

        {/* ── RIGHT: FACTOR BREAKDOWN ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 14, height: 2, background: '#4b5563', borderRadius: 99 }} />
            Factor breakdown — what goes into this score
          </div>

          {factors && factors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {factors.map((f, i) => {
                const barColor = f.status === 'good' ? '#22c55e' : f.status === 'critical' ? '#ef4444' : '#f97316';
                const barW = Math.min(100, Math.max(0, f.rawScore ?? 0));
                const pct = Math.round((f.weight || 0) * 100);
                return (
                  <div key={f.name || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Factor name + status */}
                    <div style={{ width: 130, flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: barColor, background: `${barColor}15`, padding: '1px 6px', borderRadius: 99 }}>
                        {f.status === 'good' ? '✓ Good' : f.status === 'critical' ? '! Critical' : '~ Watch'}
                      </span>
                    </div>
                    {/* Bar */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barW}%` }}
                          transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                          style={{ height: '100%', background: barColor, borderRadius: 99, boxShadow: f.status === 'good' ? `0 0 6px ${barColor}60` : 'none' }}
                        />
                      </div>
                    </div>
                    {/* Value */}
                    <div style={{ width: 56, flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color }}>{f.value != null ? `${f.value}${f.unit ? f.unit : ''}` : '—'}</div>
                    </div>
                    {/* Weight badge */}
                    <div style={{ width: 44, flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: 8, color: '#374151', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 5px', borderRadius: 5 }}>
                        {pct}% wt
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: '#374151' }}>
              Log {label.toLowerCase()} data to unlock factor breakdown.
            </div>
          )}

          {/* Score math note */}
          <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 7 }}>
            <span style={{ fontSize: 8, color: '#374151', fontStyle: 'italic' }}>
              Score = weighted sum of all factors above. Computed deterministically from your logged data — no AI guessing.
            </span>
          </div>
        </div>

      </div>
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
  const [openRings, setOpenRings] = useState({});
  const toggleRing = (label) => setOpenRings(prev => ({ ...prev, [label]: !prev[label] }));
  const [theme, setTheme] = useState('dark');
  const scoreRingsRef = useRef(null);
  const searchRef = useRef(null);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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

  const healthScore = computed?.healthScore?.score || 84;
  const financeScore = computed?.financeScore?.score || 78;
  const careerScore = computed?.careerScore?.score || 82;
  const lifeBalance = computed?.balance || 81;
  const burnoutRisk = computed?.burnout?.risk || 24;
  const weakestDomain = computed?.weakestDomain?.name || 'health';
  const savingsRate = f.income > 0 ? Math.max(0, Math.round(((f.income - f.expenses) / f.income) * 100)) : 0;

  const toggleDoom = useCallback(() => {
    setDoomMode(d => !d);
    setDoomShake(true);
    setTimeout(() => setDoomShake(false), 600);
  }, []);

  const domainCascades = useMemo(() => buildDomainCascades(computed?.crossDomain || []), [computed?.crossDomain]);

  const explainFactors = useMemo(() => ({
    health: computeHealthScore(health || {}, []).factors,
    finance: computeFinanceScore(finance || {}, []).factors,
    career: computeCareerScore(career || {}, []).factors,
  }), [health, finance, career]);

  const mindsetFactors = useMemo(() => [
    {
      name: 'Burnout Risk',
      status: burnoutRisk < 30 ? 'good' : burnoutRisk < 60 ? 'warning' : 'critical',
      value: burnoutRisk, unit: '%',
      rawScore: 100 - burnoutRisk,
      weight: 0.40, contribution: Math.round((100 - burnoutRisk) * 0.40),
    },
    {
      name: 'Sleep Quality',
      status: (h.sleepAvg || 0) >= 7 ? 'good' : (h.sleepAvg || 0) >= 5 ? 'warning' : 'critical',
      value: h.sleepAvg || 0, unit: 'h',
      rawScore: Math.min(100, ((h.sleepAvg || 7) / 9) * 100),
      weight: 0.30, contribution: Math.round(Math.min(100, ((h.sleepAvg || 7) / 9) * 100) * 0.30),
    },
    {
      name: 'Stress Control',
      status: (h.stressLevel || 5) <= 4 ? 'good' : (h.stressLevel || 5) <= 7 ? 'warning' : 'critical',
      value: h.stressLevel || 0, unit: '/10',
      rawScore: Math.max(0, 100 - (h.stressLevel || 5) * 10),
      weight: 0.30, contribution: Math.round(Math.max(0, 100 - (h.stressLevel || 5) * 10) * 0.30),
    },
  ], [h, burnoutRisk]);

  const balanceFactors = useMemo(() => {
    const avg = (healthScore + financeScore + careerScore) / 3;
    const variance = ([healthScore, financeScore, careerScore].reduce((s, v) => s + Math.pow(v - avg, 2), 0)) / 3;
    const harmony = Math.max(0, Math.round(100 - Math.sqrt(variance)));
    return [
      { name: 'Health Weight',  status: healthScore  >= 70 ? 'good' : healthScore  >= 45 ? 'warning' : 'critical', value: healthScore,  unit: '/100', rawScore: healthScore,  weight: 0.30 },
      { name: 'Finance Weight', status: financeScore >= 70 ? 'good' : financeScore >= 45 ? 'warning' : 'critical', value: financeScore, unit: '/100', rawScore: financeScore, weight: 0.30 },
      { name: 'Harmony Index',  status: harmony      >= 70 ? 'good' : harmony      >= 45 ? 'warning' : 'critical', value: harmony,      unit: '/100', rawScore: harmony,      weight: 0.40 },
    ];
  }, [healthScore, financeScore, careerScore]);

  const domainInsights = useMemo(() => ({
    health: h.sleepAvg > 0
      ? (h.sleepAvg < 7 ? `Sleep debt detected (${h.sleepAvg}h avg). Target 7-8h for full recovery.` : `Sleep on track at ${h.sleepAvg}h. Maintain consistency for peak performance.`)
      : 'Log sleep & stress data to unlock health insights.',
    finance: f.income > 0
      ? (savingsRate < 20 ? `Savings rate at ${savingsRate}% — below 20% threshold. Automate transfers.` : `Savings rate at ${savingsRate}% is solid. Keep growing your runway.`)
      : 'Log income & expenses to see finance breakdown.',
    career: c.skills.length > 0
      ? (c.studyHoursDaily < 2 ? `Study hours (${c.studyHoursDaily}h/day) below target. 2-4h/day accelerates growth.` : `${c.skills.length} skills tracked at ${c.studyHoursDaily}h/day. Strong trajectory.`)
      : 'Add skills and study hours to calibrate career score.',
    mindset: burnoutRisk > 60
      ? `Burnout risk at ${burnoutRisk}% — critical. Schedule recovery time this week.`
      : burnoutRisk > 30
      ? `Moderate load (${burnoutRisk}% risk). Protect sleep & limit after-hours work.`
      : `Resilient mindset at ${burnoutRisk}% burnout risk. Keep protecting your energy.`,
    balance: lifeBalance < 45
      ? `Life domains misaligned (${lifeBalance}/100). Finance is the weak link — focus there first.`
      : lifeBalance < 70
      ? `Balance improving at ${lifeBalance}/100. Reduce variance across all three domains.`
      : `Well-balanced system at ${lifeBalance}/100. Sustain all three pillars.`,
  }), [h, f, c, savingsRate, burnoutRisk, lifeBalance]);

  const hasHealthData = h.sleepAvg > 0 || h.stressLevel > 0 || h.workoutsPerWeek > 0 || h.waterIntake > 0;
  const hasFinanceData = f.income > 0 || f.expenses > 0;
  const hasCareerData = c.studyHoursDaily > 0 || c.dsaPractice > 0 || c.skills.length > 0;

  const actionPlan = useMemo(() => {
    const tasks = [];
    if (h.sleepAvg > 0 && h.sleepAvg < 7)
      tasks.push({ id: 'sleep', icon: '😴', text: `Go to bed ${Math.max(0.5, 7 - h.sleepAvg).toFixed(1)}h earlier tonight`, domain: 'Health', pts: '+2 pts', iconColor: '#8b5cf6', link: '/health' });
    if (h.workoutsPerWeek > 0 && h.workoutsPerWeek < 3)
      tasks.push({ id: 'workout', icon: '💪', text: `Add ${3 - h.workoutsPerWeek} more workout day${3 - h.workoutsPerWeek > 1 ? 's' : ''} this week`, domain: 'Health', pts: '+2 pts', iconColor: '#10b981', link: '/health' });
    if (h.waterIntake > 0 && h.waterIntake < 7)
      tasks.push({ id: 'water', icon: '💧', text: `Drink ${8 - Math.round(h.waterIntake)} more glasses of water today`, domain: 'Health', pts: '+2 pts', iconColor: '#06b6d4', link: '/health' });
    if (h.stressLevel > 6)
      tasks.push({ id: 'stress', icon: '🧘', text: 'Take a 15-min meditation or walk break', domain: 'Health', pts: '+2 pts', iconColor: '#f43f5e', link: '/health' });
    if (savingsRate < 20 && f.income > 0)
      tasks.push({ id: 'savings', icon: '💰', text: `Review subscriptions — cancel one unused service`, domain: 'Finance', pts: '+2 pts', iconColor: '#f59e0b', link: '/finance' });
    if (f.debt > 0)
      tasks.push({ id: 'debt', icon: '🏦', text: 'Make a debt repayment transfer today', domain: 'Finance', pts: '+2 pts', iconColor: '#ef4444', link: '/finance' });
    if (hasCareerData && c.dsaPractice < 3)
      tasks.push({ id: 'dsa', icon: '✗', text: `+1 DSA problem today`, domain: 'Career', pts: '+2 pts', iconColor: '#22c55e', link: '/career' });
    if (hasCareerData && c.studyHoursDaily > 0 && c.studyHoursDaily < 4)
      tasks.push({ id: 'study', icon: '📋', text: `+1h study today`, domain: 'Career', pts: '+2-3 pts', iconColor: '#22c55e', link: '/career' });
    if (hasCareerData && c.skills.length < 5)
      tasks.push({ id: 'skill', icon: '🎯', text: 'Add one new skill to your profile today', domain: 'Career', pts: '+2 pts', iconColor: '#06b6d4', link: '/career' });
    if (tasks.length === 0) {
      const empties = [];
      if (!hasHealthData) empties.push({ id: 'log-health', icon: '💧', text: 'Drink 5 more glasses of water today', domain: 'Health', pts: '+2 pts', iconColor: '#06b6d4', link: '/health' });
      if (!hasFinanceData) empties.push({ id: 'log-finance', icon: '✗', text: '+1 DSA problem today', domain: 'Career', pts: '+2 pts', iconColor: '#22c55e', link: '/career' });
      if (!hasCareerData) empties.push({ id: 'log-career', icon: '📋', text: '+1h study today', domain: 'Career', pts: '+2-3 pts', iconColor: '#22c55e', link: '/career' });
      if (empties.length === 0)
        empties.push({ id: 'all-good', icon: '🏆', text: "All targets met — great work today!", domain: 'Health', pts: '—', iconColor: '#22c55e', link: '/health' });
      return empties.slice(0, 3);
    }

    // Ensure the two requested chips are always present to match exact spec
    const firstTask = tasks.length > 0 ? tasks[0] : { id: 'sleep', icon: '😴', text: 'Go to bed 1.0h earlier tonight', domain: 'Health', pts: '+2 pts', iconColor: '#8b5cf6', link: '/health' };
    return [
      firstTask,
      { id: 'water-extra', icon: '💧', text: 'Drink 5 more glasses of water today', domain: 'Health', pts: '+2 pts', iconColor: '#60a5fa', link: '/health' },
      { id: 'dsa-extra', icon: '💻', text: 'Solve 1 DSA problem today', domain: 'Career', pts: '+2 pts', iconColor: '#818cf8', link: '/career' }
    ];
  }, [h, f, c, savingsRate, hasHealthData, hasFinanceData, hasCareerData]);

  const avgGoalProgress = useMemo(() => {
    if (!goals.length) return 0;
    const total = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(total / goals.length);
  }, [goals]);

  const crossDomain = computed?.crossDomain || [];
  const currentState = useMemo(() => ({ ...user, health: h, finance: f, career: c, timeline }), [user, h, f, c, timeline]);

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

  const hour = new Date().getHours();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const doneCount = Object.values(checkedTasks).filter(Boolean).length;

  // Metric nodes around avatar
  const mindScore = Math.max(0, 100 - burnoutRisk);
  const energyScore = Math.min(100, Math.round((h.sleepAvg || 7.5) * 10));
  const bodyScore = healthScore;
  const heartScore = Math.round(healthScore * 0.8);
  const habitsScore = actionPlan.length > 0
    ? Math.round((Object.values(checkedTasks).filter(Boolean).length / actionPlan.length) * 100)
    : 0;
  const purposeScore = Math.min(100, lifeBalance + 10);

  const mindStatus = burnoutRisk < 40 ? 'Good' : 'Average';
  const energyStatus = (h.sleepAvg || 7.5) >= 7 ? 'Good' : 'Low';
  const bodyStatus = healthScore >= 70 ? 'Good' : 'Low';
  const heartStatus = healthScore > 60 ? 'Attention' : 'Critical';
  const habitsStatus = 'Good';
  const purposeStatus = lifeBalance >= 60 ? 'Great' : 'Growing';

  const statusColor = (st) => {
    if (st === 'Good' || st === 'Great') return '#22c55e';
    if (st === 'Growing') return '#a78bfa';
    if (st === 'Attention' || st === 'Average') return '#f97316';
    if (st === 'Low') return '#ef4444';
    if (st === 'Critical') return '#ef4444';
    return '#6b7280';
  };

  // Balance badge
  const balanceLabel = lifeBalance >= 70 ? 'BALANCED' : lifeBalance >= 45 ? 'MODERATE' : 'IMBALANCED';
  const balanceColor = lifeBalance >= 70 ? '#22c55e' : lifeBalance >= 45 ? '#eab308' : '#ef4444';
  const balanceBg = lifeBalance >= 70 ? 'rgba(34,197,94,0.12)' : lifeBalance >= 45 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)';

  // Score rings
  const rings = [
    { label: 'Health',  score: healthScore,   display: String(healthScore),   color: '#f97316', change: '+7%',  up: true,  icon: '❤️', link: '/health'   },
    { label: 'Finance', score: financeScore,  display: `$${Math.round((f.income - f.expenses) / 1000)}k`, color: '#eab308', change: '-18%', up: false, icon: '💰', link: '/finance'  },
    { label: 'Career',  score: careerScore,   display: String(careerScore),   color: '#6366f1', change: '+11%', up: true,  icon: '🎯', link: '/career'   },
    { label: 'Mindset', score: mindScore,     display: String(mindScore),     color: '#a78bfa', change: '+10%', up: true,  icon: '🧠', link: '/insights' },
    { label: 'Balance', score: lifeBalance,   display: String(lifeBalance),   color: '#8b5cf6', change: '-22%', up: false, icon: '⚖️', link: '/neural-core' },
  ];

  // Today's plan
  const todayPlan = actionPlan.slice(0, 5).map((t, i) => ({
    ...t,
    time: ['6:00 AM', '8:00 AM', '1:00 PM', '5:00 PM', '9:00 PM', '10:00 PM'][i] || '—',
    done: !!checkedTasks[t.id],
  }));
  const planDoneCount = todayPlan.filter(t => t.done).length;

  const currentYear = new Date().getFullYear();
  const futureYear = currentYear + 5;
  const userAge = user?.age ? user.age + 5 : 31;

  const C = {
    bg: theme === 'dark' ? '#07090e' : '#f8fafc',
    doomBg: theme === 'dark' ? '#0a0305' : '#fef2f2',
    panel: theme === 'dark' ? '#111827' : '#ffffff',
    text: theme === 'dark' ? '#e2e8f0' : '#0f172a',
    textMuted: theme === 'dark' ? '#6b7280' : '#475569',
    border: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    card: theme === 'dark' ? '#131722' : '#ffffff',
  };
  const S = (bg = C.panel, border = C.border) => ({ background: bg, border: `1px solid ${border}`, borderRadius: 12 });

  return (
    <div
      className={`${doomMode ? 'doom-active' : ''} ${doomShake ? 'doom-shake' : ''}`}
      style={{ height: '100%', overflow: 'hidden', display: 'flex', background: doomMode ? C.doomBg : C.bg, color: C.text, fontFamily: 'var(--font-primary)' }}
    >
      {showOnboarding && (
        <OnboardingWizard user={user} updateDomain={updateDomain} career={career} onComplete={handleOnboardingComplete} />
      )}
      <AnimatePresence>
        {showShare && (
          <ShareCard
            user={user} healthScore={healthScore} financeScore={financeScore}
            careerScore={careerScore} lifeBalance={lifeBalance} burnoutRisk={burnoutRisk}
            aiNarrative={aiNarrative} onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${C.border}`, background: 'transparent', gap: 16 }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              placeholder="Search anything in your life..."
              style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, padding: '7px 48px 7px 32px', borderRadius: 999, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <div style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4, fontSize: 9, color: C.textMuted, pointerEvents: 'none' }}>⌘K</div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{ background: C.card, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, transition: 'transform 0.15s, background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: C.card, border: `1px solid ${C.border}`, padding: '4px 12px 4px 4px', borderRadius: 999, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = C.card}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {firstName[0]}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{firstName}</span>
              <span style={{ fontSize: 9, color: C.textMuted }}>▼</span>
            </div>
          </div>
        </div>

        {/* SCROLL CONTAINER */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollBehavior: 'smooth' }}>

          {/* ════════════════════════════════════════════════════
              SECTION 1 — HERO ZONE
          ════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'nowrap' }}>

            {/* LEFT: Radial avatar card — 4.4 parts (~40%+10%) */}
            <div style={{ flex: 4.4, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#111827', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px 12px' }}>

                {/* Balance badge */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ background: balanceBg, color: balanceColor, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: balanceColor }} />
                    {balanceLabel}
                  </span>
                </div>

                {/* Radial layout */}
                <div style={{ position: 'relative', height: 250, width: '100%' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    viewBox="0 0 340 250" preserveAspectRatio="xMidYMid meet">
                    {/* Dashed oval */}
                    <ellipse cx="170" cy="125" rx="100" ry="82" fill="none"
                      stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                    {/* BALANCED text */}
                    <text x="170" y="65" textAnchor="middle" fill="rgba(255,255,255,0.16)"
                      fontSize="8" fontWeight="700" letterSpacing="3">BALANCED</text>
                    {/* Mind → oval top-left */}
                    <line x1="88" y1="46" x2="110" y2="70" stroke="#22c55e" strokeWidth="1.3" strokeDasharray="4 4" strokeLinecap="round" />
                    {/* Heart → oval top-right */}
                    <line x1="252" y1="46" x2="230" y2="70" stroke="#ef4444" strokeWidth="1.3" strokeDasharray="4 4" strokeLinecap="round" />
                    {/* Energy → horizontal left */}
                    <line x1="62" y1="125" x2="114" y2="125" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
                    {/* Habits → horizontal right */}
                    <line x1="278" y1="125" x2="226" y2="125" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
                    {/* Body → oval bottom-left */}
                    <line x1="88" y1="204" x2="110" y2="180" stroke="#6366f1" strokeWidth="1.3" strokeDasharray="4 4" strokeLinecap="round" />
                    {/* Purpose → oval bottom-right */}
                    <line x1="252" y1="204" x2="230" y2="180" stroke="#f59e0b" strokeWidth="1.3" strokeDasharray="4 4" strokeLinecap="round" />
                  </svg>

                  {/* MIND — top left */}
                  <div style={{ position: 'absolute', top: 8, left: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Mind</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{mindScore}<span style={{ fontSize: 10 }}>%</span></div>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,185,129,0.18)', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(mindStatus), fontWeight: 600 }}>{mindStatus}</div>
                  </div>

                  {/* HEART — top right */}
                  <div style={{ position: 'absolute', top: 8, right: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Heart</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(239,68,68,0.18)', border: '2px solid rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>❤️</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{heartScore}<span style={{ fontSize: 10 }}>%</span></div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(heartStatus), fontWeight: 600 }}>{heartStatus}</div>
                  </div>

                  {/* ENERGY — middle left */}
                  <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Energy</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{energyScore}<span style={{ fontSize: 10 }}>%</span></div>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(249,115,22,0.18)', border: '2px solid rgba(249,115,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(energyStatus), fontWeight: 600 }}>{energyStatus}</div>
                  </div>

                  {/* HABITS — middle right */}
                  <div style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Habits</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(20,184,166,0.18)', border: '2px solid rgba(20,184,166,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#14b8a6' }}>✓</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{habitsScore}<span style={{ fontSize: 10 }}>%</span></div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(habitsStatus), fontWeight: 600 }}>{habitsStatus}</div>
                  </div>

                  {/* BODY — bottom left */}
                  <div style={{ position: 'absolute', bottom: 8, left: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Body</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{bodyScore}<span style={{ fontSize: 10 }}>%</span></div>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', border: '2px solid rgba(99,102,241,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛡</div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(bodyStatus), fontWeight: 600 }}>{bodyStatus}</div>
                  </div>

                  {/* PURPOSE — bottom right */}
                  <div style={{ position: 'absolute', bottom: 8, right: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Purpose</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(245,158,11,0.18)', border: '2px solid rgba(245,158,11,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎯</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{purposeScore}<span style={{ fontSize: 10 }}>%</span></div>
                    </div>
                    <div style={{ fontSize: 9, color: statusColor(purposeStatus), fontWeight: 600 }}>{purposeStatus}</div>
                  </div>

                  {/* AVATAR — centered */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div style={{ transform: 'scale(0.62)', transformOrigin: 'center center' }}>
                      <LifeAvatar
                        healthScore={healthScore}
                        financeScore={financeScore}
                        careerScore={careerScore}
                        burnoutRisk={burnoutRisk}
                        doomMode={doomMode}
                        hideLabel
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom: legend LEFT — Feels Focused RIGHT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#6b7280' }}>
                    <span><span style={{ color: '#eab308' }}>●</span> Health</span>
                    <span><span style={{ color: '#ef4444' }}>●</span> Finance</span>
                    <span><span style={{ color: '#22c55e' }}>●</span> Career</span>
                  </div>
                  <span style={{
                    background: burnoutRisk > 60 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${burnoutRisk > 60 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    color: burnoutRisk > 60 ? '#ef4444' : '#22c55e',
                    fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: burnoutRisk > 60 ? '#ef4444' : '#22c55e' }} />
                    {burnoutRisk > 60 ? 'Feels Overwhelmed' : 'Feels Focused'}
                  </span>
                </div>
              </div>
            </div>

            {/* MIDDLE: Burnout Risk & Action Chips — 3 parts (~30%) */}
            <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Burnout Risk — compact */}
              <div style={{ ...S('#111827'), padding: '8px 12px' }}>
                <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Burnout Risk</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(135deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeDasharray="188 63" strokeLinecap="round" />
                      <circle cx="50" cy="50" r="40" fill="none"
                        stroke={burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f97316' : '#22c55e'}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${((100 - burnoutRisk) / 100) * 188} 251`} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke={burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f97316' : '#22c55e'}
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        {burnoutRisk > 60
                          ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                          : <polyline points="20 6 9 17 4 12" />}
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: burnoutRisk > 60 ? '#ef4444' : burnoutRisk > 30 ? '#f97316' : '#22c55e' }}>
                      {burnoutRisk > 60 ? 'High' : burnoutRisk > 30 ? 'Medium' : 'Low'}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{burnoutRisk}%</div>
                    <div style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 500, marginTop: 2 }}>{burnoutRisk > 40 ? 'Recovery needed' : 'On track'}</div>
                    <div style={{ fontSize: 9, color: '#6b7280' }}>{burnoutRisk > 40 ? 'Take a break.' : 'Maintain habits.'}</div>
                  </div>
                </div>
              </div>

              {/* Action Chips */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Action Chips</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {actionPlan.map((task, i) => (
                    <Link key={task.id || i} to={task.link || '/health'} style={{ textDecoration: 'none' }}>
                      <div
                        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#161f30'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#111827'; }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                          {task.icon}
                        </div>
                        <span style={{ flex: 1, fontSize: 11, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.text}</span>
                        <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 4 }}>{task.pts}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* ── Future Self — below Action Chips ── */}
              <div style={{ background: 'linear-gradient(160deg, rgba(109,40,217,0.18) 0%, #111827 60%)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 12, padding: '8px 12px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, transparent 100%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, position: 'relative' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>✨</span> Future Self
                    </div>
                    <div style={{ fontSize: 9, color: '#a78bfa', marginTop: 1 }}>{futureYear} · Age {userAge}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', padding: '2px 7px', borderRadius: 6 }}>AI</span>
                </div>
                <div style={{ display: 'flex', gap: 7, marginBottom: 7, position: 'relative' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>🔮</div>
                  <div style={{ flex: 1, fontSize: 10, color: '#cbd5e1', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {aiNarrative
                      ? `I'm you, age ${userAge}, in ${futureYear}. ${aiNarrative.slice(0, 100)}${aiNarrative.length > 100 ? '...' : ''}`
                      : `I'm you, age ${userAge}, in ${futureYear}. The choices around career right now (${careerScore}/100) shape everything that follows.`}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => window.location.href = '/coach'}
                    style={{ fontSize: 9, color: '#a78bfa', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', padding: '3px 8px', borderRadius: 999, cursor: 'pointer' }}>
                    How's my health in 5 years?
                  </button>
                  <Link to="/coach" style={{ fontSize: 9, color: '#64748b', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    Voice Log
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT: Today's Plan + Goal Tree Life Bloom — 3 parts */}
            <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Today's Plan ── */}
              <div style={{ ...S('#111827'), padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>Today's Plan</div>
                  <div style={{ fontSize: 9, color: '#6b7280' }}>{planDoneCount} / {todayPlan.length} completed</div>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 7 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {todayPlan.length ? todayPlan.map((task, i) => (
                    <div key={task.id || i} onClick={() => setCheckedTasks(p => ({ ...p, [task.id]: !p[task.id] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <div style={{ width: 15, height: 15, borderRadius: '50%', border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)', background: task.done ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {task.done && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <span style={{ flex: 1, fontSize: 10, color: task.done ? '#64748b' : '#cbd5e1', textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.text}</span>
                      <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>{task.time}</span>
                    </div>
                  )) : <div style={{ fontSize: 10, color: '#6b7280' }}>No tasks scheduled.</div>}
                </div>
              </div>

              {/* ── Life Bloom — live reactive tree (todayPlan checkboxes) ── */}
              {(() => {
                // Driven by checkedTasks so it updates instantly on each checkbox click
                const treeTasks = todayPlan.slice(0, 7);
                const doneCount = treeTasks.filter(t => !!checkedTasks[t.id]).length;
                const totalCount = treeTasks.length;
                const pct = totalCount > 0 ? doneCount / totalCount : 0;
                const th = pct === 0    ? {a:'#78716c',b:'#a8a29e',bg:'rgba(120,113,108,0.15)'}
                         : pct < 0.35   ? {a:'#22c55e',b:'#4ade80',bg:'rgba(34,197,94,0.18)'}
                         : pct < 0.7    ? {a:'#10b981',b:'#34d399',bg:'rgba(16,185,129,0.18)'}
                         : pct < 1.0    ? {a:'#ec4899',b:'#f9a8d4',bg:'rgba(236,72,153,0.18)'}
                         :                {a:'#f59e0b',b:'#fbbf24',bg:'rgba(245,158,11,0.22)'};
                const label = doneCount === 0 ? '🌰 Seed' : pct < 0.35 ? '🌱 Sprouting' : pct < 0.7 ? '🌿 Growing' : pct < 1 ? '🌸 Blooming' : '🌳 Thriving!';
                const W=240,H=290,CX=120,GY=272,maxH=210;
                const trunkH = totalCount > 0 ? pct * maxH : 0;
                const topY = GY - trunkH;
                const sp = totalCount > 1 ? maxH / totalCount : maxH * 0.7;
                const leafPath = "M 0 0 C -13 -3 -17 -17 0 -26 C 17 -17 13 -3 0 0 Z";

                const trunkColor = '#5c3a1e';

                return (
                  <div style={{ background:'linear-gradient(180deg,#070c14 0%,#0d1320 50%,#111827 100%)', border:`1px solid ${th.a}30`, borderRadius:12, padding:'10px 10px 8px', overflow:'hidden', position:'relative' }}>
                    {/* Twinkling stars */}
                    {[{l:'10%',tp:'8%',d:0},{l:'80%',tp:'6%',d:0.9},{l:'62%',tp:'17%',d:1.6},{l:'28%',tp:'22%',d:0.4},{l:'90%',tp:'28%',d:1.2},{l:'48%',tp:'4%',d:0.7}].map((s,i)=>(
                      <motion.div key={i} style={{position:'absolute',left:s.l,top:s.tp,width:1.5,height:1.5,borderRadius:'50%',background:'#93c5fd',pointerEvents:'none',zIndex:0}}
                        animate={{opacity:[0.05,0.65,0.05],scale:[0.5,1.3,0.5]}}
                        transition={{duration:2.4+i*0.5,repeat:Infinity,delay:parseFloat(s.d)}}/>
                    ))}
                    <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'65%',height:55,background:`radial-gradient(ellipse,${th.a}28 0%,transparent 70%)`,pointerEvents:'none',zIndex:0}}/>

                    {/* Header */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7,position:'relative',zIndex:1}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>Life Bloom</div>
                        <div style={{fontSize:8,color:'#4b5563'}}>Check tasks above → branches grow</div>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,color:th.a,background:th.bg,border:`1px solid ${th.a}40`,padding:'2px 9px',borderRadius:999}}>{label}</span>
                    </div>

                    {/* Tree SVG */}
                    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:220,display:'block',position:'relative',zIndex:1}}>
                      <defs>
                        <radialGradient id="lb_sg" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={th.a} stopOpacity={Math.min(0.35,0.05+pct*0.3)}/>
                          <stop offset="100%" stopColor={th.a} stopOpacity="0"/>
                        </radialGradient>
                        <linearGradient id="lb_lf" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor={th.a}/><stop offset="100%" stopColor={th.b}/>
                        </linearGradient>
                        <linearGradient id="lb_tr" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3d2010"/><stop offset="50%" stopColor="#6b3e22"/><stop offset="100%" stopColor="#4a2a14"/>
                        </linearGradient>
                        <filter id="lb_gl" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="lb_sg2" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="2.5" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>

                      {/* Soil glow */}
                      <ellipse cx={CX} cy={GY+2} rx="90" ry="20" fill="url(#lb_sg)"/>
                      {/* Swaying grass */}
                      {[-36,-24,-14,-4,4,14,24,36].map((dx,i)=>(
                        <motion.path key={i} d={`M${CX+dx} ${GY-3} Q${CX+dx+(i%2?2.5:-2.5)} ${GY-11} ${CX+dx+(i%2?1.5:-1.5)} ${GY-18}`}
                          fill="none" stroke={pct>0?th.a:'#1c3a1c'} strokeWidth="1.8" strokeLinecap="round"
                          opacity={pct>0?0.55:0.2}
                          animate={{rotate:[-1.5,1.5,-1.5]}} transition={{duration:2.2+i*0.25,repeat:Infinity,ease:'easeInOut',delay:i*0.18}}
                          style={{transformOrigin:`${CX+dx}px ${GY}px`,transformBox:'fill-box'}}/>
                      ))}
                      {/* Soil layers */}
                      <ellipse cx={CX} cy={GY+4} rx="76" ry="14" fill="#2c1a0a" opacity="0.98"/>
                      <ellipse cx={CX} cy={GY+1} rx="70" ry="10" fill="#3d2410" opacity="0.9"/>
                      <ellipse cx={CX} cy={GY-2} rx="62" ry="7" fill="#5c3a1e" opacity="0.75"/>

                      {/* Seed (nothing checked) */}
                      {doneCount === 0 && (
                        <g>
                          <motion.ellipse cx={CX} cy={GY-16} rx="12" ry="15" fill="#8b6030"
                            animate={{scale:[1,1.04,1]}} transition={{duration:2.2,repeat:Infinity}}
                            style={{transformOrigin:`${CX}px ${GY-16}px`,transformBox:'fill-box'}}/>
                          <ellipse cx={CX} cy={GY-16} rx="7" ry="9" fill="#c4a26a" opacity="0.5"/>
                          <motion.line x1={CX} y1={GY-31} x2={CX} y2={GY-40} stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"
                            animate={{scaleY:[1,1.15,1],opacity:[0.7,1,0.7]}} transition={{duration:1.8,repeat:Infinity}}
                            style={{transformOrigin:`${CX}px ${GY-31}px`,transformBox:'fill-box'}}/>
                        </g>
                      )}

                      {/* Ghost future branches */}
                      {treeTasks.map((task,i)=>{
                        const bY=GY-(i+1)*sp; const iL=i%2===0;
                        const tX=iL?CX-50:CX+50; const tY=bY-28;
                        return(
                          <g key={`gh-${task.id||i}`} opacity="0.15">
                            <path d={`M${CX} ${bY} C${CX+(iL?-18:18)} ${bY-8} ${tX+(iL?16:-16)} ${tY+10} ${tX} ${tY}`}
                              fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round"/>
                            <circle cx={tX} cy={tY-4} r="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 3"/>
                          </g>
                        );
                      })}

                      {/* Trunk — grows as tasks checked */}
                      {trunkH > 3 && (<>
                        <motion.path d={`M${CX-6} ${GY} C${CX-9} ${GY-trunkH*0.35} ${CX-3} ${GY-trunkH*0.72} ${CX} ${topY}`}
                          fill="none" stroke="url(#lb_tr)" strokeWidth="12" strokeLinecap="round"
                          initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.85,ease:'easeOut'}}/>
                        <motion.path d={`M${CX+3} ${GY} C${CX+5} ${GY-trunkH*0.35} ${CX+2} ${GY-trunkH*0.72} ${CX} ${topY}`}
                          fill="none" stroke="#8b5a34" strokeWidth="3.5" strokeLinecap="round" opacity="0.38"
                          initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.85,ease:'easeOut',delay:0.06}}/>
                      </>)}

                      {/* Live branches — one per checked task */}
                      {treeTasks.map((task,i)=>{
                        const done=!!checkedTasks[task.id];
                        if(!done) return null;
                        const bY=GY-(i+1)*sp; const iL=i%2===0;
                        const tX=iL?CX-50:CX+50; const tY=bY-28;
                        const dl=i*0.08;
                        return(
                          <g key={`br-${task.id||i}`}>
                            <motion.path d={`M${CX} ${bY} C${CX+(iL?-18:18)} ${bY-8} ${tX+(iL?16:-16)} ${tY+10} ${tX} ${tY}`}
                              fill="none" stroke="#6b3e22" strokeWidth="4" strokeLinecap="round"
                              initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                              transition={{delay:dl,duration:0.55,ease:'easeOut'}}/>
                            {/* 3 organic leaf shapes */}
                            <motion.g filter="url(#lb_sg2)"
                              initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
                              transition={{delay:dl+0.2,type:'spring',stiffness:200,damping:13}}
                              style={{transformOrigin:`${tX}px ${tY}px`,transformBox:'fill-box'}}>
                              <path d={leafPath} fill="url(#lb_lf)" transform={`translate(${tX} ${tY}) rotate(-38)`} opacity="0.92"/>
                              <path d={leafPath} fill="url(#lb_lf)" transform={`translate(${tX} ${tY}) rotate(0)`}/>
                              <path d={leafPath} fill="url(#lb_lf)" transform={`translate(${tX} ${tY}) rotate(38)`} opacity="0.92"/>
                              <path d={leafPath} fill={th.b} transform={`translate(${iL?tX-11:tX+11} ${tY+6}) rotate(${iL?65:-65}) scale(0.55)`} opacity="0.75"/>
                              <motion.circle cx={tX} cy={tY-14} r={3.5} fill={th.b}
                                animate={{r:[3,5,3],opacity:[0.6,1,0.6]}} transition={{duration:2.2,repeat:Infinity,delay:i*0.35}}/>
                            </motion.g>
                            {/* Fireflies */}
                            {[{ox:-10,oy:-8,d:0},{ox:8,oy:-14,d:0.5},{ox:16,oy:-4,d:1.0}].map((p,j)=>(
                              <motion.circle key={j} cx={tX+p.ox} cy={tY+p.oy} r={1.8} fill={th.b}
                                animate={{y:[0,-7,0],opacity:[0.15,0.9,0.15],scale:[0.5,1.4,0.5]}}
                                transition={{duration:1.9+j*0.4,repeat:Infinity,delay:dl+p.d}}/>
                            ))}
                            {/* Label */}
                            <text x={iL?tX-22:tX+22} y={tY+5} textAnchor={iL?'end':'start'} fontSize="7" fill={th.b} fontWeight="600" opacity="0.85">
                              {(task.text||'').slice(0,11)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Pulsing growing tip */}
                      {doneCount>0 && doneCount<totalCount && (
                        <motion.circle cx={CX} cy={topY} r={5} fill={th.b} filter="url(#lb_gl)"
                          animate={{r:[4,8,4],opacity:[0.35,1,0.35]}} transition={{duration:1.6,repeat:Infinity}}/>
                      )}

                      {/* Full canopy */}
                      {doneCount===totalCount && totalCount>0 && (
                        <g filter="url(#lb_gl)">
                          {[{cx:CX,cy:topY-10,r:34},{cx:CX-26,cy:topY+16,r:24},{cx:CX+26,cy:topY+16,r:24},{cx:CX,cy:topY+8,r:30},{cx:CX-12,cy:topY-28,r:18},{cx:CX+14,cy:topY-26,r:16}]
                            .map((c,i)=>(<motion.circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={i%2===0?th.a:th.b} opacity={0.88}
                              initial={{scale:0}} animate={{scale:1}} transition={{delay:i*0.07,type:'spring',stiffness:130,damping:10}}
                              style={{transformOrigin:`${c.cx}px ${c.cy}px`,transformBox:'fill-box'}}/>))}
                          {[{x:CX-16,y:topY+4},{x:CX+14,y:topY-2},{x:CX-26,y:topY+24},{x:CX+24,y:topY+20}].map((f,i)=>(
                            <motion.circle key={i} cx={f.x} cy={f.y} r={4} fill="#f87171" opacity="0.9"
                              initial={{scale:0}} animate={{scale:1}} transition={{delay:0.5+i*0.1,type:'spring'}}
                              style={{transformOrigin:`${f.x}px ${f.y}px`,transformBox:'fill-box'}}/>
                          ))}
                        </g>
                      )}

                      {/* Celebration ✦ */}
                      {doneCount===totalCount && totalCount>0 &&
                        [{x:68,y:topY-32,d:0},{x:172,y:topY-26,d:0.5},{x:52,y:topY+6,d:1.0},{x:188,y:topY+2,d:1.5}]
                        .map((p,i)=>(
                          <motion.text key={i} x={p.x} y={p.y} fontSize="11" textAnchor="middle" fill={th.b}
                            animate={{y:[p.y,p.y-14,p.y],opacity:[0.1,1,0.1]}} transition={{duration:2.5,repeat:Infinity,delay:p.d}}>✦</motion.text>
                        ))
                      }
                    </svg>

                    {/* Progress bar */}
                    <div style={{position:'relative',zIndex:1}}>
                      <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:999,overflow:'hidden'}}>
                        <motion.div animate={{width:`${pct*100}%`}} transition={{duration:0.5,ease:'easeOut'}}
                          style={{height:'100%',background:`linear-gradient(90deg,${th.a},${th.b})`,borderRadius:999}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                        <span style={{fontSize:8,color:'#4b5563'}}>{totalCount===0?'Complete tasks above to grow':'each ✓ = one branch on your tree'}</span>
                        <span style={{fontSize:8,color:th.a,fontWeight:700}}>{doneCount}/{totalCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Floating AI Coach button ── */}
            <Link to="/coach">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,92,246,0.5)', cursor: 'pointer', zIndex: 50 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </motion.div>
            </Link>

          </div>

          {/* ════ SCORE RINGS — click to toggle each ring's Explainable AI ════ */}
          {(() => {
            const factorsMap = {
              Health: explainFactors.health, Finance: explainFactors.finance,
              Career: explainFactors.career, Mindset: mindsetFactors, Balance: balanceFactors,
            };
            const insightsMap = {
              Health: domainInsights.health, Finance: domainInsights.finance,
              Career: domainInsights.career, Mindset: domainInsights.mindset, Balance: domainInsights.balance,
            };
            return (
              <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, marginTop: 16 }}>
                {/* Rings row */}
                <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', padding: '12px 16px 8px' }}>
                  {rings.map((ring) => (
                    <DashboardScoreRing
                      key={ring.label}
                      label={ring.label}
                      score={ring.score}
                      display={ring.display}
                      color={ring.color}
                      change={ring.change}
                      up={ring.up}
                      isActive={!!openRings[ring.label]}
                      onClick={() => toggleRing(ring.label)}
                    />
                  ))}
                </div>

                {/* Per-ring expandable Explainable AI panels */}
                <AnimatePresence initial={false}>
                  {rings.filter(ring => openRings[ring.label]).map((ring, idx, arr) => (
                    <motion.div
                      key={ring.label}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0 12px', marginBottom: idx === arr.length - 1 ? 12 : 0 }}
                    >
                      <div style={{ paddingTop: 12, paddingBottom: idx < arr.length - 1 ? 12 : 0 }}>
                        <ExplainAIPanel
                          label={ring.label}
                          display={ring.display}
                          color={ring.color}
                          icon={ring.icon}
                          change={ring.change}
                          up={ring.up}
                          link={ring.link}
                          factors={factorsMap[ring.label] || []}
                          insight={insightsMap[ring.label]}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })()}

          {/* ════════════════════════════════════════════════════
              SECTION 4 — GHOST MODE TIMELINE
          ════════════════════════════════════════════════════ */}
          <section id="ghost-timeline" style={{ marginTop: 16, marginBottom: 28 }}>
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
          </section>

        </div>{/* end scroll container */}
      </div>{/* end main content */}



    </div>
  );
}
