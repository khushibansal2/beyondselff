import { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import {
  ArrowRight, Sparkles, Brain, Heart, Wallet, Briefcase,
  Activity, Zap, ChevronDown, Cpu, Orbit,
} from 'lucide-react';
import { Particles } from '../components/ui/Particles';

// ─── Magnetic holographic button ─────────────────────────────────────────────
function HoloButton({ children, primary, icon: Icon, to, onClick }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 150, damping: 15 });
  const y = useSpring(my, { stiffness: 150, damping: 15 });

  const inner = (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left - r.width / 2) * 0.25);
        my.set((e.clientY - r.top - r.height / 2) * 0.25);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-all ${primary ? 'text-white' : 'text-cyan-100'}`}
    >
      <span className={`absolute inset-0 rounded-full ${primary ? 'bg-gradient-to-r from-cyan-400/90 via-indigo-500/90 to-fuchsia-500/90' : 'glass border border-cyan-300/30'}`} />
      {primary && (
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-70" />
      )}
      <span className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: '0 0 40px rgba(99,180,255,0.6), inset 0 0 30px rgba(168,85,247,0.3)' }} />
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {Icon && <Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </span>
    </motion.button>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionLabel({ children, n }) {
  return (
    <div className="mb-6 flex items-center gap-3 text-xs font-mono uppercase tracking-[0.3em] text-cyan-300/80">
      <span className="text-cyan-400/60">[{n}]</span>
      <span className="h-px w-10 bg-gradient-to-r from-cyan-400/60 to-transparent" />
      {children}
    </div>
  );
}

// ─── Holographic avatar SVG ───────────────────────────────────────────────────
function HoloAvatar() {
  return (
    <div className="relative h-[520px] w-[360px] anim-breath">
      <div className="absolute inset-0 anim-pulse-glow rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.45), rgba(99,102,241,0.2) 50%, transparent 75%)' }} />
      <div className="absolute -inset-10 anim-spin-slow">
        <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
        <div className="absolute inset-6 rounded-full border border-fuchsia-300/15" style={{ borderStyle: 'dashed' }} />
      </div>
      <svg viewBox="0 0 200 320" className="relative h-full w-full">
        <defs>
          <linearGradient id="holo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#67e8f9" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#c084fc" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="holoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="1" stopColor="#a855f7" stopOpacity="0.08" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" /></filter>
        </defs>
        <circle cx="100" cy="60" r="32" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1.2" filter="url(#glow)" />
        <circle cx="88" cy="58" r="2.4" fill="#67e8f9" className="anim-flicker">
          <animate attributeName="r" values="2.4;3.2;2.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="112" cy="58" r="2.4" fill="#67e8f9">
          <animate attributeName="r" values="2.4;3.2;2.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <path d="M88 90 L88 105 L112 105 L112 90 Z" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1" />
        <path d="M55 110 Q100 100 145 110 L155 200 Q100 215 45 200 Z" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1.2" />
        <path d="M55 110 L35 200 L42 210 L66 130" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1" />
        <path d="M145 110 L165 200 L158 210 L134 130" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1" />
        <path d="M70 200 L65 310 L85 310 L92 205" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1" />
        <path d="M130 200 L135 310 L115 310 L108 205" fill="url(#holoFill)" stroke="url(#holo)" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i}
            x1={50 + i * 9} y1={120 + (i % 3) * 30}
            x2={70 + ((i * 17) % 60)} y2={150 + (i % 4) * 20}
            stroke="#67e8f9" strokeWidth="0.4" opacity="0.5">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
          </line>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="anim-scan absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent blur-sm" />
      </div>
      <div className="absolute -left-24 top-12 glass rounded-lg px-3 py-1.5 text-[10px] font-mono text-cyan-200 anim-float">CORE.SYNC 99.8%</div>
      <div className="absolute -right-20 top-32 glass rounded-lg px-3 py-1.5 text-[10px] font-mono text-fuchsia-200 anim-float" style={{ animationDelay: '-2s' }}>NEURAL.LINK</div>
      <div className="absolute -right-28 bottom-32 glass rounded-lg px-3 py-1.5 text-[10px] font-mono text-cyan-200 anim-float" style={{ animationDelay: '-4s' }}>HR · 64bpm</div>
      <div className="absolute -left-28 bottom-20 glass rounded-lg px-3 py-1.5 text-[10px] font-mono text-indigo-200 anim-float" style={{ animationDelay: '-3s' }}>MOOD · stable</div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const avatarScale = useTransform(scrollYProgress, [0, 1], [1, 1.6]);
  const avatarY     = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textY       = useTransform(scrollYProgress, [0, 0.6], [0, -120]);
  const bgScale     = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const bgY         = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <section ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">

        {/* ── Layer 0: bg + particles ── */}
        <motion.div style={{ scale: bgScale, y: bgY }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 grid-bg opacity-50" />
          <div className="absolute inset-x-0 bottom-0 h-2/3">
            <svg viewBox="0 0 1200 400" className="absolute bottom-0 h-full w-full opacity-50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="city" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0e1a3a" />
                  <stop offset="1" stopColor="#020112" />
                </linearGradient>
              </defs>
              {Array.from({ length: 40 }).map((_, i) => {
                const h = 60 + ((i * 53) % 220);
                return <rect key={i} x={i * 30} y={400 - h} width={26} height={h} fill="url(#city)" stroke="rgba(120,180,255,0.25)" />;
              })}
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-[#07060f] via-[#07060f]/60 to-transparent" />
          </div>
          {/* particles only in the bottom 70% so they never reach the hero text area */}
          <div className="absolute inset-x-0 bottom-0" style={{ top: '30%' }}>
            <Particles density={70} color="#7dd3fc" speed={0.25} interactive={false} />
          </div>
        </motion.div>

        {/* ── Layer 1: fog blobs ── */}
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <div className="anim-drift absolute -left-40 top-1/3 h-[500px] w-[700px] rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="anim-drift absolute -right-40 top-10 h-[500px] w-[700px] rounded-full bg-fuchsia-500/20 blur-[120px]" style={{ animationDelay: '-7s' }} />
          <div className="anim-drift absolute bottom-0 left-1/3 h-[400px] w-[600px] rounded-full bg-indigo-500/20 blur-[120px]" style={{ animationDelay: '-3s' }} />
        </div>

        {/* ── Layer 2: avatar ── */}
        <motion.div style={{ scale: avatarScale, y: avatarY }} className="absolute inset-0 z-[2] flex items-center justify-center">
          <HoloAvatar />
        </motion.div>

        {/* ── Layer 10: text — always wins ── */}
        <motion.div style={{ opacity: textOpacity, y: textY }} className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-mono uppercase tracking-[0.25em] text-cyan-200/90">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 anim-flicker" />
            BeyondSelf · Neural Twin Online
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.4 }}
            className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-8xl">
            <span className="holo-text text-glow">Meet Your</span>
            <br />
            <span className="text-white text-glow-violet anim-breath inline-block">Future Self.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1 }}
            className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-cyan-100/70 md:text-lg">
            An AI-powered digital twin that evolves with your habits, health, finances, and ambitions — a living simulation of who you&apos;re becoming.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <HoloButton primary icon={Sparkles} to="/signup">Begin Simulation</HoloButton>
            <HoloButton icon={ArrowRight} to="/login">Sign In</HoloButton>
          </motion.div>

          {/* Demo hint */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            className="mt-5 text-xs font-mono text-cyan-300/50">
            Demo: arjun@demo.com · demo123
          </motion.p>
        </motion.div>

        {/* Scroll hint */}
        <motion.div style={{ opacity: textOpacity }}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-cyan-300/60">
          <span>Scroll to explore</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Evolution split ──────────────────────────────────────────────────────────
function Evolution() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const split = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden py-40">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-2xl">
          <SectionLabel n="02">Avatar evolution</SectionLabel>
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Two futures.<br /><span className="holo-text">One decision a day.</span>
          </h2>
          <p className="mt-5 max-w-lg text-cyan-100/60">
            Each habit ripples through your twin&apos;s body, mind, and environment. Watch your decisions sculpt the person you become.
          </p>
        </div>

        <div className="relative grid grid-cols-2 overflow-hidden rounded-[2rem] glass-strong">
          {/* Left: stressed path */}
          <div className="relative aspect-square overflow-hidden border-r border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-zinc-900 to-black" />
            <Particles density={50} color="#f87171" speed={0.15} interactive={false} />
            <div className="absolute inset-0 anim-flicker bg-red-500/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ filter: 'hue-rotate(-30deg) saturate(0.8) brightness(0.7)', transform: 'scale(0.5)', transformOrigin: 'center' }}>
                <HoloAvatar />
              </div>
            </div>
            <div className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-widest text-red-300/80">PATH A · drift</div>
            <div className="absolute bottom-5 left-5 right-5 space-y-1.5">
              {[['sleep debt', '−42%'], ['finance stress', 'high'], ['aura stability', 'unstable']].map(([k, v]) => (
                <div key={k} className="glass flex items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-red-200/80">
                  <span>{k}</span><span className="text-red-300">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: optimized path */}
          <div className="relative aspect-square overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-indigo-950 to-fuchsia-950/40" />
            <Particles density={80} color="#67e8f9" speed={0.3} interactive={false} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 anim-pulse-glow rounded-full bg-cyan-400/40 blur-3xl" />
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}>
                  <HoloAvatar />
                </div>
              </div>
            </div>
            {/* Skill constellation */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400">
              {[[60,80],[120,40],[200,70],[280,50],[340,110],[330,220],[280,310],[180,340],[80,300],[40,200]].map(([px, py], i, arr) => (
                <g key={i}>
                  <circle cx={px} cy={py} r="2" fill="#67e8f9">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                  </circle>
                  {i > 0 && <line x1={arr[i-1][0]} y1={arr[i-1][1]} x2={px} y2={py} stroke="#67e8f9" strokeWidth="0.4" opacity="0.4" />}
                </g>
              ))}
            </svg>
            <div className="absolute right-5 top-5 font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">PATH B · ascend</div>
            <div className="absolute bottom-5 left-5 right-5 space-y-1.5">
              {[['sleep streak', '21 days'], ['finance flow', '+38%'], ['aura stability', 'luminous']].map(([k, v]) => (
                <div key={k} className="glass flex items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-200/80">
                  <span>{k}</span><span className="text-cyan-300">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Animated divider */}
          <motion.div style={{ scaleY: split }}
            className="pointer-events-none absolute left-1/2 top-0 h-full w-px origin-top bg-gradient-to-b from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white/80">today</div>
        </div>
      </div>
    </section>
  );
}

// ─── Orbit dashboard ──────────────────────────────────────────────────────────
function Orbits() {
  const orbits = [
    { Icon: Activity,  label: 'Wellness',  color: 'from-emerald-400 to-cyan-500',   r: 120, dur: 10, size: 44 },
    { Icon: Heart,     label: 'Health',    color: 'from-rose-400 to-fuchsia-500',   r: 165, dur: 16, size: 52 },
    { Icon: Wallet,    label: 'Finance',   color: 'from-cyan-400 to-indigo-500',    r: 215, dur: 24, size: 58 },
    { Icon: Briefcase, label: 'Career',    color: 'from-indigo-400 to-violet-500',  r: 270, dur: 34, size: 64 },
  ];

  return (
    <section className="relative overflow-hidden py-40">
      <div className="absolute inset-0 grid-bg opacity-30" />
      {/* flex col + items-center guarantees everything is truly centred */}
      <div className="flex flex-col items-center px-6">
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3 text-xs font-mono uppercase tracking-[0.3em] text-cyan-300/80">
            <span className="text-cyan-400/60">[03]</span>
            <span className="h-px w-10 bg-gradient-to-r from-cyan-400/60 to-transparent" />
            Life orbit
            <span className="h-px w-10 bg-gradient-to-l from-cyan-400/60 to-transparent" />
          </div>
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            <span className="text-white">Your life,</span><br /><span className="holo-text">in orbit.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-cyan-100/60">
            Every system around your twin moves at its own pace — and they all bend toward the same gravity: you.
          </p>
        </div>

        {/* Orbit arena — inline-block so items-center can centre it */}
        <div className="relative" style={{ width: 620, height: 620 }}>
          {/* Nebula glow */}
          <div className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28), rgba(168,85,247,0.1) 55%, transparent 75%)' }} />

          {/* Static orbit ring tracks */}
          {orbits.map((o, i) => (
            <div key={i}
              className="absolute rounded-full border border-cyan-300/12"
              style={{
                width: o.r * 2,
                height: o.r * 2,
                left: '50%',
                top: '50%',
                marginLeft: -o.r,
                marginTop: -o.r,
              }}
            />
          ))}

          {/* Spinning orbit containers — centering via margin, NOT transform ──
              so Framer Motion rotate doesn't fight with translate         */}
          {orbits.map((o) => (
            <motion.div
              key={o.label}
              animate={{ rotate: 360 }}
              transition={{ duration: o.dur, repeat: Infinity, ease: 'linear' }}
              className="absolute"
              style={{
                width: o.r * 2,
                height: o.r * 2,
                left: '50%',
                top: '50%',
                marginLeft: -o.r,
                marginTop: -o.r,
              }}
            >
              {/* Planet — sits at the top-center of the orbit ring */}
              <div
                className="absolute left-1/2"
                style={{ top: 0, transform: 'translateX(-50%) translateY(-50%)' }}
              >
                {/* Counter-rotate the body so the label/icon stays upright */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: o.dur, repeat: Infinity, ease: 'linear' }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`flex items-center justify-center rounded-2xl bg-gradient-to-br ${o.color} shadow-2xl`}
                    style={{ width: o.size, height: o.size, boxShadow: '0 0 28px rgba(99,180,255,0.35)' }}
                  >
                    <o.Icon className="text-white" style={{ width: o.size * 0.36, height: o.size * 0.36 }} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/80">{o.label}</span>
                </motion.div>
              </div>
            </motion.div>
          ))}

          {/* Center twin */}
          <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%,-50%)' }}>
            <div className="relative" style={{ width: 112, height: 112 }}>
              <div className="absolute inset-0 anim-pulse-glow rounded-full bg-cyan-400/50 blur-2xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full glass-strong neon-border">
                <Brain className="h-10 w-10 text-cyan-200" />
              </div>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-cyan-300/70">YOUR TWIN</div>
          </div>

          {/* Corner stats */}
          <div className="absolute glass rounded-xl p-3 anim-float" style={{ bottom: 0, left: 0 }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/70">Daily delta</div>
            <div className="holo-text text-2xl font-semibold">+1.4%</div>
          </div>
          <div className="absolute glass rounded-xl p-3 anim-float" style={{ bottom: 0, right: 0, animationDelay: '-2s' }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/70">Alignment</div>
            <div className="holo-text text-2xl font-semibold">92%</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature strip ────────────────────────────────────────────────────────────
function Features() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionLabel n="04">What&apos;s inside</SectionLabel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { Icon: Brain,     color: 'text-cyan-300',   title: 'AI Life Coach',    desc: 'Voice + chat, full context' },
            { Icon: Zap,       color: 'text-fuchsia-300', title: 'Cross-domain AI',  desc: 'Sleep → spending detected' },
            { Icon: Cpu,       color: 'text-indigo-300',  title: 'Digital Twin',     desc: 'Your avatar evolves live' },
            { Icon: Activity,  color: 'text-emerald-300', title: 'Neural Engine',    desc: 'Composite life analytics' },
          ].map(({ Icon, color, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-5">
              <Icon className={`h-5 w-5 ${color}`} />
              <div className="mt-3 text-sm font-semibold text-white">{title}</div>
              <div className="mt-1 text-xs text-cyan-100/50">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final Reveal / CTA ───────────────────────────────────────────────────────
function Reveal() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale   = useTransform(scrollYProgress, [0, 1], [1.2, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [0, 1, 1, 0.6]);
  const rays    = useTransform(scrollYProgress, [0.2, 0.7], [0, 1]);

  return (
    <section ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div style={{ scale }} className="absolute inset-0">
          <Particles density={120} color="#a5f3fc" speed={0.4} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-indigo-950/40 to-transparent" />
          <svg viewBox="0 0 1200 400" className="absolute inset-x-0 bottom-0 w-full opacity-60" preserveAspectRatio="none">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 80 + ((i * 71) % 260);
              return <rect key={i} x={i * 20} y={400 - h} width={18} height={h} fill="rgba(120,180,255,0.15)" stroke="rgba(120,200,255,0.4)" strokeWidth="0.4" />;
            })}
          </svg>
          <motion.div style={{ opacity: rays }} className="absolute inset-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}
                className="absolute left-1/2 top-1/2 h-[180vh] w-2 origin-top bg-gradient-to-b from-cyan-300/40 via-fuchsia-300/20 to-transparent blur-md"
                style={{ transform: `translate(-50%, -50%) rotate(${i * 22.5}deg)` }} />
            ))}
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity }} className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 anim-pulse-glow rounded-full bg-cyan-300/40 blur-3xl" />
            <div style={{ transform: 'scale(1.1)' }}><HoloAvatar /></div>
          </div>
        </motion.div>

        {/* Floating achievement pills */}
        <div className="pointer-events-none absolute inset-0">
          {[
            { l: '1,247 days aligned', t: '10%', side: 'left' },
            { l: 'Mastery · Polyglot', t: '22%', side: 'right' },
            { l: 'Net wealth ×4.2',    t: '70%', side: 'left' },
            { l: 'Calm · 96 percentile', t: '78%', side: 'right' },
          ].map((a, i) => (
            <div key={i}
              className="anim-float glass-strong absolute rounded-full px-4 py-2 text-xs font-mono uppercase tracking-widest text-cyan-200/90"
              style={{ top: a.t, [a.side]: '6%', animationDelay: `-${i}s` }}>
              {a.l}
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <SectionLabel n="05">Your journey starts</SectionLabel>
          <h2 className="text-6xl font-semibold leading-[1.02] tracking-tight md:text-8xl">
            <span className="text-white text-glow">Your future is</span><br />
            <span className="holo-text">programmable.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base text-cyan-100/70 md:text-lg">
            Every habit, every hour, every honest decision — they all compile into the person you become.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <HoloButton primary icon={Sparkles} to="/signup">Start Your Journey</HoloButton>
            <HoloButton icon={Orbit} to="/login">Sign In</HoloButton>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Cursor halo ──────────────────────────────────────────────────────────────
function CursorHalo() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 120, damping: 18 });
  const sy = useSpring(y, { stiffness: 120, damping: 18 });

  useEffect(() => {
    const onMove = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  return (
    <motion.div style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-50 -ml-40 -mt-40 h-80 w-80 rounded-full">
      <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute inset-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const navigate = useNavigate();
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full px-5 py-2.5"
        style={{ background: 'rgba(7,6,15,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative h-7 w-7">
            <div className="absolute inset-0 rounded-full holo-gradient anim-pulse-glow" />
            <div className="absolute inset-1 rounded-full bg-[#07060f]" />
            <div className="absolute inset-2 rounded-full holo-gradient" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Beyond<span className="text-cyan-300">Self</span>
          </span>
        </div>
        <nav className="hidden gap-2 md:flex">
          <Link to="/login"
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-white/90 transition-all hover:text-white hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
            Sign In
          </Link>
          <Link to="/signup"
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #6366f1)' }}>
            Sign Up
          </Link>
        </nav>
        <button onClick={() => navigate('/login')}
          className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-black transition-transform hover:scale-105 md:hidden">
          Enter
        </button>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs font-mono uppercase tracking-widest text-cyan-200/40 md:flex-row">
        <div>© 2026 · BeyondSelf</div>
        <div className="flex gap-6">
          <Link to="/login"  className="hover:text-cyan-300 transition-colors">Sign In</Link>
          <Link to="/signup" className="hover:text-cyan-300 transition-colors">Sign Up</Link>
        </div>
        <div>built for the next you</div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <main className="relative" style={{ background: '#07060f', color: '#f1f5f9' }}>
      <CursorHalo />
      <Nav />
      <Hero />
      <Evolution />
      <Orbits />
      <Features />
      <Reveal />
      <Footer />
    </main>
  );
}
