import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../landing.css';

/* ─── Data ────────────────────────────────────────────────── */
const correlations = [
  { from: 'Sleep', to: 'Productivity', desc: 'Less sleep → 30% less study efficiency', type: 'negative', fromIcon: '😴', toIcon: '📚' },
  { from: 'Exercise', to: 'Focus', desc: 'Workout → 20% better concentration', type: 'positive', fromIcon: '💪', toIcon: '🧠' },
  { from: 'Stress', to: 'Spending', desc: 'High stress → emotional overspending', type: 'negative', fromIcon: '😰', toIcon: '💸' },
  { from: 'Learning', to: 'Income', desc: 'Consistent learning → career growth', type: 'positive', fromIcon: '📊', toIcon: '💰' },
];

const modules = [
  { icon: '🧠', title: 'Cross-Domain AI Intelligence', desc: 'Discovers hidden patterns between your sleep, stress, spending, and career — invisible to single-metric apps.', accent: '#6366f1', glow: 'rgba(99,102,241,0.15)', size: 'large' },
  { icon: '🔮', title: 'What-If Life Simulator', desc: 'Simulate a career change or 2-hour sleep increase — see how it reshapes your future in real time.', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', size: 'normal' },
  { icon: '🔥', title: 'Burnout Prediction Engine', desc: 'Detects burnout risk weeks before it happens by modeling stress, sleep, workload, and recovery.', accent: '#ef4444', glow: 'rgba(239,68,68,0.12)', size: 'normal' },
  { icon: '💬', title: 'Emotionally Intelligent Coach', desc: 'An AI that knows your full life context and gives holistic, honest advice — not just calorie counts.', accent: '#06b6d4', glow: 'rgba(6,182,212,0.15)', size: 'normal' },
  { icon: '⚖️', title: 'Life Balance Score', desc: 'A unified score that tells you whether your current pace is sustainable — or heading toward collapse.', accent: '#f59e0b', glow: 'rgba(245,158,11,0.12)', size: 'normal' },
  { icon: '🎯', title: 'SMART Goal System', desc: 'AI-generated goals with milestones tailored to your weakest domains. Progress that actually means something.', accent: '#22c55e', glow: 'rgba(34,197,94,0.12)', size: 'large' },
];

const personas = [
  { avatar: '🧑‍💻', name: 'Arjun', tag: 'Stressed Student', health: 38, finance: 62, career: 71, alert: '⚠️ Sleep deprivation cutting study efficiency by ~30%', alertType: 'warn' },
  { avatar: '💪', name: 'Priya', tag: 'Fitness Learner', health: 91, finance: 74, career: 63, alert: '✅ Exercise boosting focus by 20% — keep going!', alertType: 'success' },
  { avatar: '💸', name: 'Rahul', tag: 'Overspender', health: 55, finance: 18, career: 47, alert: '🚨 High stress linked to emotional overspending detected', alertType: 'danger' },
  { avatar: '🔥', name: 'Sneha', tag: 'Burnout Risk', health: 19, finance: 51, career: 88, alert: '🚨 Critical burnout risk: intervene before collapse', alertType: 'danger' },
];

const stats = [
  { value: '3', label: 'Life Domains Unified', icon: '🔗' },
  { value: '11+', label: 'AI Modules', icon: '🧠' },
  { value: '95%', label: 'Insight Confidence', icon: '📊' },
  { value: '0', label: 'Hustle Culture', icon: '🚫' },
];

/* ─── Score Bar ───────────────────────────────────────────── */
function ScoreBar({ value, color }) {
  return (
    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginTop: '6px' }}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color, borderRadius: '99px' }}
      />
    </div>
  );
}

/* ─── Alert color map ─────────────────────────────────────── */
const alertStyles = {
  danger: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', color: '#f87171' },
  warn: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
  success: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', color: '#4ade80' },
};

/* ─── Main Component ──────────────────────────────────────── */
export default function Landing() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="landing-root">
      {/* ── Global ambient background ── */}
      <div className="landing-bg-ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
        <div className="ambient-grid" />
      </div>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          {/* Logo */}
          <Link to="/" className="landing-logo">
            <div className="landing-logo-mark">
              <span>DT</span>
              <div className="landing-logo-glow" />
            </div>
            <div>
              <p className="landing-logo-name">Digital Twin</p>
              <p className="landing-logo-sub">AI Life Operating System</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#personas" className="landing-nav-link">Demo</a>
            <a href="#philosophy" className="landing-nav-link">Philosophy</a>
          </div>

          {/* CTA */}
          <div className="landing-nav-cta">
            {user ? (
              <Link to="/dashboard" className="landing-btn-primary landing-btn-sm">Open Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="landing-nav-link landing-nav-link-login">Sign In</Link>
                <Link to="/signup" className="landing-btn-primary landing-btn-sm">Get Started →</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section className="landing-hero" ref={heroRef} id="hero">
        <motion.div className="landing-hero-content" style={{ y: heroY, opacity: heroOpacity }}>
          {/* Badge */}
          <motion.div
            className="landing-badge"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="landing-badge-dot" />
            Emotionally Intelligent AI Life OS
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="landing-hero-headline"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Your Personal<br />
            <span className="landing-gradient-text">Digital Twin</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            className="landing-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
          >
            Most apps track <em>metrics</em>. We understand your <strong>life</strong>.<br />
            Health, finances, and career — unified into one intelligent system.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="landing-hero-ctas"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <Link to={user ? '/dashboard' : '/signup'} className="landing-btn-primary landing-btn-lg">
              {user ? 'Open Dashboard' : 'Start Your Digital Twin'} →
            </Link>
            <Link to="/login" className="landing-btn-ghost landing-btn-lg">
              Try Demo Account
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            className="landing-trust-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            No credit card required · Demo: arjun@demo.com / demo123
          </motion.p>
        </motion.div>

        {/* Hero Preview Card */}
        <motion.div
          className="landing-hero-preview"
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="landing-preview-card">
            {/* Card header */}
            <div className="landing-preview-header">
              <div>
                <p className="landing-preview-label">Your AI Life Overview</p>
                <p className="landing-preview-name">Arjun Mehta — Stressed Student</p>
              </div>
              <div className="landing-preview-status">
                <span className="landing-preview-status-dot" />
                AI Monitoring Active
              </div>
            </div>

            {/* Metric grid */}
            <div className="landing-preview-metrics">
              {[
                { label: 'Health', value: 38, color: '#ef4444', icon: '❤️', sub: 'Low' },
                { label: 'Finance', value: 62, color: '#f59e0b', icon: '💰', sub: 'Fair' },
                { label: 'Career', value: 71, color: '#6366f1', icon: '🎯', sub: 'Good' },
                { label: 'Balance', value: 47, color: '#8b5cf6', icon: '⚖️', sub: 'At Risk' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="landing-metric-card"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.85 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="landing-metric-icon">{item.icon}</span>
                  <p className="landing-metric-value" style={{ color: item.color }}>{item.value}</p>
                  <p className="landing-metric-label">{item.label}</p>
                  <p className="landing-metric-sub" style={{ color: item.color }}>{item.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* AI Alert */}
            <motion.div
              className="landing-preview-alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <p className="landing-preview-alert-title">🧠 AI Cross-Domain Alert</p>
              <p className="landing-preview-alert-body">
                Your <strong>5.2h sleep avg</strong> is reducing study efficiency by ~30%. Combined with a <strong>stress level of 8/10</strong>, burnout is predicted within <strong style={{ color: '#f87171' }}>2–3 weeks</strong> without intervention.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════════ */}
      <section className="landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="landing-stat-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="landing-stat-icon">{s.icon}</span>
                <p className="landing-stat-value landing-gradient-text">{s.value}</p>
                <p className="landing-stat-label">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROBLEM SECTION ═════════════════════════════════════ */}
      <section className="landing-section" id="problem">
        <div className="landing-container">
          <motion.div
            className="landing-section-header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="landing-eyebrow">The Problem</p>
            <h2 className="landing-section-heading">
              Your life is one system.<br />
              <span className="landing-gradient-text">Stop managing it in silos.</span>
            </h2>
            <p className="landing-section-body">
              Traditional apps see your steps. We see why you skipped a workout —
              and how it cascades into poor sleep, lower focus, and impulsive spending.
            </p>
          </motion.div>

          {/* Correlation cards */}
          <div className="landing-correlation-grid">
            {correlations.map((c, i) => (
              <motion.div
                key={i}
                className={`landing-correlation-card landing-correlation-${c.type}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="landing-correlation-row">
                  <span className="landing-correlation-node">{c.fromIcon} {c.from}</span>
                  <span className="landing-correlation-arrow">
                    {c.type === 'positive' ? '→' : '⚡'}
                  </span>
                  <span className="landing-correlation-node">{c.toIcon} {c.to}</span>
                </div>
                <p className="landing-correlation-desc">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES BENTO ══════════════════════════════════════ */}
      <section className="landing-section landing-features-section" id="features">
        <div className="landing-container">
          <motion.div
            className="landing-section-header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="landing-eyebrow">Intelligence</p>
            <h2 className="landing-section-heading">
              One AI. <span className="landing-gradient-text">Every Dimension</span> of Your Life.
            </h2>
            <p className="landing-section-body">
              Not three separate dashboards — one deeply connected intelligence
              that sees how everything is related.
            </p>
          </motion.div>

          <div className="landing-bento-grid">
            {modules.map((m, i) => (
              <motion.div
                key={m.title}
                className={`landing-bento-card ${m.size === 'large' ? 'landing-bento-large' : ''}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                style={{ '--card-accent': m.accent, '--card-glow': m.glow }}
              >
                <div className="landing-bento-icon-wrap">
                  <span className="landing-bento-icon">{m.icon}</span>
                  <div className="landing-bento-icon-bg" />
                </div>
                <h3 className="landing-bento-title">{m.title}</h3>
                <p className="landing-bento-desc">{m.desc}</p>
                <div className="landing-bento-accent-line" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PERSONAS ════════════════════════════════════════════ */}
      <section className="landing-section" id="personas">
        <div className="landing-container">
          <motion.div
            className="landing-section-header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="landing-eyebrow">Real People</p>
            <h2 className="landing-section-heading">
              See it work for <span className="landing-gradient-text">real lives</span>
            </h2>
            <p className="landing-section-body">
              Each persona has unique cross-domain patterns.
              Our AI finds the right intervention for each one.
            </p>
          </motion.div>

          <div className="landing-personas-grid">
            {personas.map((p, i) => {
              const aStyle = alertStyles[p.alertType];
              return (
                <motion.div
                  key={p.name}
                  className="landing-persona-card"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5, transition: { duration: 0.22 } }}
                >
                  {/* Avatar + info */}
                  <div className="landing-persona-header">
                    <div className="landing-persona-avatar">{p.avatar}</div>
                    <div>
                      <p className="landing-persona-name">{p.name}</p>
                      <p className="landing-persona-tag">{p.tag}</p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="landing-persona-scores">
                    {[
                      { l: 'Health', v: p.health, c: p.health < 40 ? '#ef4444' : '#22c55e' },
                      { l: 'Finance', v: p.finance, c: p.finance < 40 ? '#ef4444' : '#f59e0b' },
                      { l: 'Career', v: p.career, c: '#6366f1' },
                    ].map(s => (
                      <div key={s.l} className="landing-persona-score-item">
                        <div className="landing-persona-score-top">
                          <span className="landing-persona-score-label">{s.l}</span>
                          <span className="landing-persona-score-value" style={{ color: s.c }}>{s.v}</span>
                        </div>
                        <ScoreBar value={s.v} color={s.c} />
                      </div>
                    ))}
                  </div>

                  {/* Alert */}
                  <div
                    className="landing-persona-alert"
                    style={{
                      background: aStyle.bg,
                      border: `1px solid ${aStyle.border}`,
                      color: aStyle.color,
                    }}
                  >
                    {p.alert}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="landing-personas-cta"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link to="/login" className="landing-btn-ghost landing-btn-lg">
              Try any of these personas →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ PHILOSOPHY ══════════════════════════════════════════ */}
      <section className="landing-section landing-philosophy-section" id="philosophy">
        <div className="landing-container">
          <motion.div
            className="landing-philosophy-card"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
          >
            {/* Ambient glow inside card */}
            <div className="landing-philosophy-glow" aria-hidden="true" />

            <div className="landing-philosophy-header">
              <span className="landing-philosophy-icon">🚫</span>
              <h2 className="landing-philosophy-heading">
                We don't believe in <span style={{ color: '#f87171' }}>hustle culture.</span>
              </h2>
              <p className="landing-philosophy-body">
                Grinding 14 hours a day while sleeping 5 hours isn't ambition —
                it's a debt you'll pay with your health, relationships, and creativity.
                Our AI helps you succeed <em>sustainably</em>, not just fast.
              </p>
            </div>

            <div className="landing-philosophy-grid">
              {[
                { icon: '❌', label: 'Hustle Culture', desc: 'More hours = more success. Sleep is lazy. Push through burnout.', accent: '#ef4444', accentSoft: 'rgba(239,68,68,0.08)' },
                { icon: '✅', label: 'Balanced Success', desc: 'Right effort at the right time. Recovery is productive. Sustainability wins.', accent: '#22c55e', accentSoft: 'rgba(34,197,94,0.08)' },
                { icon: '🧬', label: 'Digital Twin Way', desc: 'AI-calibrated pacing. Cross-domain optimization. Sustainable peak performance.', accent: '#6366f1', accentSoft: 'rgba(99,102,241,0.08)' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="landing-philosophy-item"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{ '--philo-accent': item.accent, '--philo-soft': item.accentSoft }}
                >
                  <span className="landing-philosophy-item-icon">{item.icon}</span>
                  <p className="landing-philosophy-item-label">{item.label}</p>
                  <p className="landing-philosophy-item-desc">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
      <section className="landing-cta-section">
        <div className="landing-cta-glow-1" aria-hidden="true" />
        <div className="landing-cta-glow-2" aria-hidden="true" />

        <div className="landing-container">
          <motion.div
            className="landing-cta-content"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
          >
            <p className="landing-eyebrow" style={{ marginBottom: '20px' }}>Get Started</p>
            <h2 className="landing-cta-heading">
              Ready to meet your<br />
              <span className="landing-gradient-text">Digital Twin?</span>
            </h2>
            <p className="landing-cta-body">
              Stop managing life in disconnected apps. Start understanding it
              as the one intelligent system it actually is.
            </p>

            <Link to={user ? '/dashboard' : '/signup'} className="landing-btn-primary landing-btn-xl">
              Start for Free →
            </Link>

            <p className="landing-cta-footnote">
              No setup required · Try demo: arjun@demo.com / demo123
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-mark landing-logo-mark-sm">
              <span>DT</span>
            </div>
            <div>
              <p className="landing-logo-name">Personal Digital Twin</p>
              <p className="landing-logo-sub">Emotionally Intelligent AI Life OS</p>
            </div>
          </div>

          <div className="landing-footer-badges">
            <span className="landing-footer-badge">🔒 End-to-end encrypted</span>
            <span className="landing-footer-badge">🛡️ GDPR compliant</span>
            <span className="landing-footer-badge">💾 Local-first data</span>
          </div>

          <p className="landing-footer-copy">Wise Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
