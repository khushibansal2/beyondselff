import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, Brain, TrendingUp, Shield, Sparkles, ArrowRight,
  Heart, Wallet, Target, BarChart2, Activity, Star,
  ChevronRight, Check, Play
} from 'lucide-react';

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 28, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, speed);
      return () => clearInterval(iv);
    }, startDelay);
    return () => clearTimeout(t);
  }, [text, speed, startDelay]);
  return displayed;
}

// ── Animated count-up ────────────────────────────────────────────────────────
function CountUp({ target, duration = 1200, delay = 0 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round(p * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [inView, target, duration, delay]);
  return <span ref={ref}>{val}</span>;
}

// ── Animated SVG score ring ──────────────────────────────────────────────────
function AnimRing({ score, color, label, size = 88, delay = 0 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - score / 100) }}
            transition={{ delay: delay + 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-lg font-black" style={{ color }}>{score}</span>
        </motion.div>
      </div>
      <p className="text-[11px] text-slate-400 font-medium text-center">{label}</p>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const personas = [
  { avatar: '🧑‍💻', name: 'Arjun', tag: 'Stressed Student', health: 38, finance: 62, career: 71,
    alert: 'Sleep deprivation cutting study efficiency by ~30%', alertType: 'warning', email: 'arjun@demo.com' },
  { avatar: '💪', name: 'Priya', tag: 'Fitness Learner', health: 91, finance: 74, career: 63,
    alert: 'Exercise boosting focus by 20% — keep it up!', alertType: 'success', email: 'priya@demo.com' },
  { avatar: '💸', name: 'Rahul', tag: 'Overspender', health: 55, finance: 18, career: 47,
    alert: 'High stress linked to emotional overspending detected', alertType: 'danger', email: 'rahul@demo.com' },
  { avatar: '🔥', name: 'Sneha', tag: 'Burnout Risk', health: 19, finance: 51, career: 88,
    alert: 'Critical burnout risk — intervene before collapse', alertType: 'danger', email: 'sneha@demo.com' },
];

const features = [
  { icon: Brain, color: '#8b5cf6', title: 'Cross-Domain AI', desc: 'Discovers hidden patterns between sleep, stress, spending, and career that single-metric apps miss entirely.' },
  { icon: Sparkles, color: '#06b6d4', title: 'Life Simulator', desc: 'Simulate habit changes — sleeping 1h more, cutting ₹5k/mo — and see the 90-day ripple effect across all domains.' },
  { icon: Activity, color: '#f43f5e', title: 'Burnout Prediction', desc: 'Detects burnout risk 2–3 weeks before it happens by modeling stress, workload, sleep debt, and recovery.' },
  { icon: TrendingUp, color: '#f59e0b', title: 'Finance AI', desc: 'Reads your SMS transactions, builds an investment plan, and flags emotional overspending before it compounds.' },
  { icon: Target, color: '#3b82f6', title: 'Career Twin', desc: 'Tracks study sessions, skill gaps, and cognitive load — then generates a personalised placement roadmap.' },
  { icon: Star, color: '#10b981', title: 'Gamified Goals', desc: 'XP, streaks, and social challenges make sustainable habit-building feel like a game you actually want to play.' },
];

const cascades = [
  { from: '😴 Poor Sleep', to: '📚 Study Retention', pct: -40, dir: 'negative' },
  { from: '😰 High Stress', to: '💸 Spending', pct: +60, dir: 'negative' },
  { from: '💪 Exercise', to: '🧠 Focus', pct: +20, dir: 'positive' },
  { from: '📊 Consistent Study', to: '💰 Career Score', pct: +35, dir: 'positive' },
  { from: '💤 Sleep Debt', to: '😰 Stress', pct: +45, dir: 'negative' },
  { from: '🧘 Recovery', to: '⚡ Performance', pct: +28, dir: 'positive' },
];

const techBadges = [
  'Google Gemini 2.0', 'Deterministic Scoring', 'Cross-Domain Cascade AI',
  'Real-time Burnout Engine', 'SMS Transaction Parser', 'Forgetting Curve Tracking',
  'PWA Ready', 'Local-first Privacy',
];

// ── Scrolling Ticker ─────────────────────────────────────────────────────────
function Ticker() {
  const items = [...techBadges, ...techBadges];
  return (
    <div className="overflow-hidden py-3 border-y border-white/[0.05]">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 flex-shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Hero preview ─────────────────────────────────────────────────────────────
function HeroPreview() {
  const insight = useTypewriter(
    'Sleep debt of 2.8h/day is reducing your study efficiency by ~40%. Combined with a stress score of 8/10, burnout is predicted within 18 days. Recommend: +1h sleep tonight, reduce screen time by 30 min.',
    22, 1600
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative max-w-2xl mx-auto"
    >
      {/* Glow */}
      <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-blue-500/20 via-violet-500/10 to-transparent blur-xl pointer-events-none" />

      {/* Window chrome */}
      <div className="relative rounded-3xl overflow-hidden" style={{
        background: 'linear-gradient(145deg, rgba(15,18,36,0.97) 0%, rgba(10,10,20,0.99) 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
      }}>
        {/* Titlebar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <div className="w-3 h-3 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap size={7} className="text-white" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">BeyondSelf AI · Dashboard</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">Live Demo</span>
        </div>

        <div className="p-5">
          {/* Score rings row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Life OS · Arjun Mehta</p>
              <p className="text-base font-bold text-white">Good morning, Arjun 👋</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Twin Active
            </div>
          </div>

          <div className="flex justify-around mb-5">
            <AnimRing score={38} color="#ef4444" label="Health" delay={0.8} />
            <AnimRing score={62} color="#f59e0b" label="Finance" delay={1.0} />
            <AnimRing score={71} color="#3b82f6" label="Career" delay={1.2} />
            <AnimRing score={47} color="#8b5cf6" label="Life Balance" delay={1.4} />
          </div>

          {/* Cascade bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-3"
          >
            <span className="text-sm">😴</span>
            <span className="text-[11px] text-amber-300 font-medium">Sleep debt cascading into career performance</span>
            <span className="text-[10px] text-amber-400 ml-auto font-mono">-40%</span>
          </motion.div>

          {/* AI alert with typewriter */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}
            className="p-3.5 rounded-xl border border-red-500/25 bg-red-500/[0.06]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Brain size={12} className="text-red-400 flex-shrink-0" />
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-wider">AI Cross-Domain Alert</p>
              <span className="ml-auto text-[9px] text-red-400/60 font-mono">95% confidence</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {insight}
              {insight.length < 160 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="inline-block w-0.5 h-3 bg-red-400 ml-0.5 align-middle"
                />
              )}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [activePerson, setActivePerson] = useState(null);

  const tryAsPersona = (email) => {
    const result = login(email, 'demo123');
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#06060f] overflow-x-hidden text-white">

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50" style={{
        background: 'rgba(6,6,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight leading-none">BeyondSelf</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">AI Life OS</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Demo</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm px-5 py-2">Open Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">Login</Link>
                <Link to="/signup" className="btn-primary text-sm px-5 py-2">Start Free →</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/5 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-300 mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Hackathon 2026 · AI Life Operating System · 10,000+ participants
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight"
          >
            Your Life Has<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              Hidden Patterns.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed"
          >
            BeyondSelf is the first AI that sees your health, finances, and career as <strong className="text-white">one interconnected system</strong> — and acts on it before you even notice a problem.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-sm text-slate-500 mb-10"
          >
            Poor sleep → low focus → missed deadlines → financial stress. We find these chains. You break them.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <button
              onClick={() => tryAsPersona('arjun@demo.com')}
              className="btn-primary text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2 group"
            >
              <Play size={16} className="group-hover:scale-110 transition-transform" />
              Try Live Demo — No Signup
            </button>
            <Link to="/signup" className="btn-secondary text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2">
              Build My Digital Twin <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Hero preview */}
          <HeroPreview />

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
            className="mt-10 flex flex-col items-center gap-2 text-slate-600"
          >
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              <ChevronRight size={18} className="rotate-90" />
            </motion.div>
            <span className="text-xs">Scroll to explore</span>
          </motion.div>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────────────── */}
      <Ticker />

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: 3, suffix: '', label: 'Life Domains Unified', icon: '🔗' },
            { value: 11, suffix: '+', label: 'AI Intelligence Modules', icon: '🧠' },
            { value: 95, suffix: '%', label: 'Insight Accuracy', icon: '🎯' },
            { value: 0, suffix: '', label: 'Hustle Culture', icon: '🚫' },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            >
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent mb-1">
                <CountUp target={s.value} delay={i * 100} />{s.suffix}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs text-indigo-400 uppercase tracking-widest font-semibold mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From data to insight in <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">30 seconds</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">No lengthy setup. Log your first session and your Digital Twin starts building immediately.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connector lines */}
            <div className="hidden md:block absolute top-12 left-[35%] right-[35%] h-px bg-gradient-to-r from-indigo-500/40 via-violet-500/40 to-indigo-500/40" />

            {[
              { step: '01', icon: '📊', title: 'Input Your Life Data', desc: 'Log sessions, upload bank statements, connect GitHub, or paste health metrics. Or just pick a demo persona and start in 5 seconds.' },
              { step: '02', icon: '🧠', title: 'AI Builds Your Twin', desc: 'Our deterministic cross-domain engine finds hidden patterns between your domains — sleep debt cascading into career readiness, stress driving emotional spending.' },
              { step: '03', icon: '⚡', title: 'Act Before It Compounds', desc: 'Get pinpoint interventions, burnout warnings 2–3 weeks early, and a personalised roadmap — not generic advice.' },
            ].map((item, i) => (
              <motion.div key={item.step}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] text-center"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-300 mx-auto mb-4">
                  {item.step}
                </div>
                <span className="text-3xl block mb-3">{item.icon}</span>
                <h3 className="text-sm font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROSS-DOMAIN CASCADE ───────────────────────────────────────── */}
      <section className="py-20 px-6 border-y border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs text-rose-400 uppercase tracking-widest font-semibold mb-3">The Hidden Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your life is one system.<br />
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">Stop managing it in silos.</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Traditional apps see your steps. We see why you skipped a workout — and how it cascades into poor sleep, lower focus, and impulsive spending.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cascades.map((c, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`p-5 rounded-2xl border flex items-start gap-4 ${c.dir === 'positive' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{c.from}</span>
                    <ChevronRight size={12} className={c.dir === 'positive' ? 'text-emerald-400' : 'text-red-400'} />
                    <span className="text-sm font-medium">{c.to}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.dir === 'positive' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {c.pct > 0 ? '+' : ''}{c.pct}% impact
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs text-violet-400 uppercase tracking-widest font-semibold mb-3">Intelligence Stack</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One AI. <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Every Dimension</span> of Your Life.
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">Not three separate dashboards — one deeply connected intelligence that sees how everything is related.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: f.color + '18', border: `1px solid ${f.color}30` }}>
                    <Icon size={20} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-bold mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DEMO PERSONAS ──────────────────────────────────────────────── */}
      <section id="demo" className="py-20 px-6 border-y border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-semibold mb-3">Live Demo</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See it work for <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">real people</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">Each persona has real cross-domain patterns. Click any card to instantly enter their Digital Twin — no account needed.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {personas.map((p, i) => (
              <motion.div key={p.name}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                onClick={() => tryAsPersona(p.email)}
                className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center text-2xl flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.tag}</p>
                  </div>
                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Try now <ArrowRight size={12} />
                  </span>
                </div>

                <div className="flex gap-3 mb-4">
                  {[
                    { l: 'Health', v: p.health, c: p.health < 40 ? '#ef4444' : p.health < 70 ? '#f59e0b' : '#10b981' },
                    { l: 'Finance', v: p.finance, c: p.finance < 40 ? '#ef4444' : p.finance < 70 ? '#f59e0b' : '#10b981' },
                    { l: 'Career', v: p.career, c: p.career < 40 ? '#ef4444' : p.career < 70 ? '#f59e0b' : '#3b82f6' },
                  ].map(s => (
                    <div key={s.l} className="flex-1 text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <p className="text-sm font-black" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
                  p.alertType === 'danger' ? 'bg-red-500/[0.07] border border-red-500/20 text-red-300' :
                  p.alertType === 'warning' ? 'bg-amber-500/[0.07] border border-amber-500/20 text-amber-300' :
                  'bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-300'
                }`}>
                  <Brain size={12} className="flex-shrink-0" />
                  {p.alert}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-xs text-slate-500 mt-6">
            All demo data is synthetic and stored locally. No account required.
          </motion.p>
        </div>
      </section>

      {/* ── PHILOSOPHY ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="p-8 md:p-12 rounded-3xl text-center border border-white/[0.07] bg-white/[0.02]"
          >
            <span className="text-4xl block mb-5">🚫</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-5">
              We don't believe in <span className="text-red-400">hustle culture.</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8">
              Grinding 14 hours while sleeping 5 isn't ambition — it's debt you'll pay with your health and relationships.
              BeyondSelf helps you succeed <em className="text-white">sustainably</em>, not just fast.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              {[
                { icon: '❌', label: 'Hustle Culture', desc: 'More hours = more success. Sleep is for the weak. Push through burnout.' },
                { icon: '✅', label: 'Balanced Success', desc: 'Right effort at the right time. Recovery is productive. Sustainability wins.' },
                { icon: '🧬', label: 'BeyondSelf Way', desc: 'AI-calibrated pacing. Cross-domain optimization. Sustainable peak performance.' },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-xl block mb-2">{item.icon}</span>
                  <p className="text-sm font-semibold mb-1">{item.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TECH CREDIBILITY ───────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-8">Built With</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Google Gemini 2.0 Flash', color: '#4285f4' },
              { label: 'React + Vite', color: '#61dafb' },
              { label: 'Deterministic AI Engines', color: '#8b5cf6' },
              { label: 'Spring Boot Backend', color: '#6db33f' },
              { label: 'Framer Motion', color: '#ff0055' },
              { label: 'Cross-Domain Cascade Math', color: '#f59e0b' },
              { label: 'PostgreSQL', color: '#336791' },
              { label: 'Local-first Privacy', color: '#10b981' },
            ].map(t => (
              <span key={t.label} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
            <Zap size={28} className="text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Meet your<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">Digital Twin</span>
          </h2>
          <p className="text-slate-400 mb-10 text-base max-w-lg mx-auto leading-relaxed">
            Stop managing your life in disconnected apps. Start understanding it as the one intelligent system it actually is.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => tryAsPersona('arjun@demo.com')}
              className="btn-primary text-base px-10 py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Try Instantly — No Signup
            </button>
            <Link to="/signup" className="btn-secondary text-base px-10 py-4 rounded-2xl flex items-center justify-center gap-2">
              Create Free Account <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-6">No credit card · No setup · Works offline with demo data</p>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">BeyondSelf</p>
              <p className="text-[10px] text-slate-500">AI Life Operating System</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Check size={11} className="text-emerald-400" /> Local-first data</span>
            <span className="flex items-center gap-1.5"><Check size={11} className="text-emerald-400" /> No tracking</span>
            <span className="flex items-center gap-1.5"><Check size={11} className="text-emerald-400" /> Open for demo</span>
          </div>
          <p className="text-xs text-slate-600">Hackathon 2026 · BeyondSelf</p>
        </div>
      </footer>
    </div>
  );
}
