import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const correlations = [
  { from: '😴 Sleep', to: '📚 Productivity', desc: 'Less sleep → 30% less study efficiency', type: 'negative' },
  { from: '😰 Stress', to: '💸 Spending', desc: 'High stress → emotional overspending', type: 'negative' },
  { from: '💪 Exercise', to: '🧠 Focus', desc: 'Workout → 20% better concentration', type: 'positive' },
  { from: '📊 Study', to: '💰 Income', desc: 'Consistent learning → career growth', type: 'positive' },
  { from: '💤 Poor sleep', to: '😰 Stress', desc: 'Sleep debt amplifies stress response', type: 'negative' },
  { from: '🧘 Recovery', to: '⚡ Performance', desc: 'Rest → sustainable peak output', type: 'positive' },
];

const modules = [
  { icon: '🧠', title: 'Cross-Domain AI Intelligence', desc: 'Discovers hidden patterns between your sleep, stress, spending, and career — invisible to single-metric apps.' },
  { icon: '🔮', title: 'What-If Life Simulator', desc: 'Simulate a career change, a 2-hour sleep increase, or cutting subscriptions — and see how it reshapes your future.' },
  { icon: '🔥', title: 'Burnout Prediction Engine', desc: 'Detects burnout risk weeks before it happens by modeling your stress, sleep, workload, and recovery patterns.' },
  { icon: '💬', title: 'Emotionally Intelligent AI Coach', desc: 'An AI that knows your full life context — not just your steps or calories — and gives holistic, honest advice.' },
  { icon: '⚖️', title: 'Life Balance Score', desc: 'A single, unified score that tells you whether your current pace is sustainable — or heading toward collapse.' },
  { icon: '🎯', title: 'SMART Goal System', desc: 'AI-generated goals with milestones tailored to your weakest domains. Progress that actually means something.' },
];

const personas = [
  { avatar: '🧑‍💻', name: 'Arjun', tag: 'Stressed Student', health: 38, finance: 62, career: 71, alert: '⚠️ Sleep deprivation cutting study efficiency by ~30%', email: 'arjun@demo.com' },
  { avatar: '💪', name: 'Priya', tag: 'Fitness Learner', health: 91, finance: 74, career: 63, alert: '✅ Exercise boosting focus by 20% — keep going!', email: 'priya@demo.com' },
  { avatar: '💸', name: 'Rahul', tag: 'Overspender', health: 55, finance: 18, career: 47, alert: '🚨 High stress linked to emotional overspending detected', email: 'rahul@demo.com' },
  { avatar: '🔥', name: 'Sneha', tag: 'Burnout Risk', health: 19, finance: 51, career: 88, alert: '🚨 Critical burnout risk: intervene before collapse', email: 'sneha@demo.com' },
];

const stats = [
  { value: '3', label: 'Life Domains Unified', icon: '🔗' },
  { value: '11+', label: 'AI Modules', icon: '🧠' },
  { value: '95%', label: 'Insight Confidence', icon: '📊' },
  { value: '0', label: 'Hustle Culture', icon: '🚫' },
];

export default function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const tryAsPersona = (email) => {
    const result = login(email, 'demo123');
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold flex-shrink-0">DT</div>
            <div>
              <span className="text-base font-bold block" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin</span>
              <span className="text-[9px] text-slate-500 block -mt-0.5">AI Life Operating System</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm">Open Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              Emotionally Intelligent AI Life Operating System
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
            Your Personal <br />
            <span className="gradient-text">Digital Twin</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Most apps track <em>metrics</em>. We understand your <strong className="text-white">life</strong>.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Health, finances, and career aren't separate problems — they're one interconnected system.
            Our AI finds the hidden relationships before they derail you.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-base px-8 py-4 rounded-2xl">
              {user ? 'Open Dashboard' : 'Start Your Digital Twin'} →
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-4 rounded-2xl">
              Try Demo Account
            </Link>
          </motion.div>

          {/* Hero Preview Card */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }}
            className="max-w-3xl mx-auto">
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-5">
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Your AI Life Overview</p>
                  <p className="text-sm text-slate-300 font-medium mt-0.5">Arjun Mehta — Stressed Student</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI Monitoring Active
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Health Score', value: 38, color: '#ef4444', icon: '❤️', sub: '⬇️ Low' },
                  { label: 'Finance', value: 62, color: '#f59e0b', icon: '💰', sub: '📈 Ok' },
                  { label: 'Career', value: 71, color: '#3b82f6', icon: '🎯', sub: '✅ Good' },
                  { label: 'Life Balance', value: 47, color: '#8b5cf6', icon: '⚖️', sub: '⚠️ At Risk' },
                ].map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.1 }}
                    className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-2xl font-bold mt-1" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{item.value}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{item.label}</p>
                    <p className="text-[9px] mt-1" style={{ color: item.color }}>{item.sub}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
                className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-left">
                <p className="text-xs font-semibold text-red-300 mb-1">🧠 AI Cross-Domain Alert</p>
                <p className="text-xs text-slate-400">
                  Your <strong className="text-white">5.2h sleep avg</strong> is reducing study efficiency by ~30%. Combined with a <strong className="text-white">stress level of 8/10</strong>, burnout is predicted within <strong className="text-red-300">2-3 weeks</strong> without intervention.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-14 px-6 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="text-3xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Your life is one system.<br /><span className="gradient-text">Stop managing it in silos.</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
              Traditional apps see your steps. We see why you skipped a workout — and how it cascades into poor sleep, lower focus, and impulsive spending.
            </p>
          </motion.div>

          {/* Correlation Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {correlations.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`p-5 rounded-2xl border ${c.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-base font-medium">{c.from}</span>
                  <span className={`text-lg ${c.type === 'positive' ? 'text-emerald-400' : 'text-red-400'}`}>{c.type === 'positive' ? '→' : '⚡'}</span>
                  <span className="text-base font-medium">{c.to}</span>
                </div>
                <p className={`text-xs ${c.type === 'positive' ? 'text-emerald-400/80' : 'text-red-400/80'}`}>{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              One AI. <span className="gradient-text">Every Dimension</span> of Your Life.
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Not three separate dashboards — one deeply connected intelligence that sees how everything is related.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m, i) => (
              <motion.div key={m.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass-card p-6 group hover:border-blue-500/30 transition-all">
                <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">{m.icon}</span>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{m.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Personas */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              See it work for <span className="gradient-text">real people</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Each persona has unique cross-domain patterns. Our AI finds the right intervention for each one.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {personas.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">{p.avatar}</div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.tag}</p>
                  </div>
                </div>
                <div className="flex gap-3 mb-4">
                  {[{ l: 'Health', v: p.health, c: p.health < 40 ? '#ef4444' : '#10b981' }, { l: 'Finance', v: p.finance, c: p.finance < 40 ? '#ef4444' : '#f59e0b' }, { l: 'Career', v: p.career, c: '#3b82f6' }].map(s => (
                    <div key={s.l} className="flex-1 text-center p-2 rounded-xl bg-white/[0.02]">
                      <p className="text-sm font-bold" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-[9px] text-slate-500">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className={`p-3 rounded-xl text-xs mb-3 ${p.alert.startsWith('🚨') ? 'bg-red-500/5 border border-red-500/20 text-red-300/80' : p.alert.startsWith('⚠️') ? 'bg-amber-500/5 border border-amber-500/20 text-amber-300/80' : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-300/80'}`}>
                  {p.alert}
                </div>
                <button onClick={() => tryAsPersona(p.email)}
                  className="w-full text-xs px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-medium">
                  Try as {p.name} →
                </button>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-6 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-8 md:p-12 rounded-3xl text-center">
            <span className="text-4xl block mb-6">🚫</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              We don't believe in <span className="text-red-400">hustle culture.</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8">
              Grinding 14 hours a day while sleeping 5 hours isn't ambition — it's a debt you'll pay with your health, relationships, and creativity.
              Our AI is designed to help you succeed <em>sustainably</em>, not just fast.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              {[
                { icon: '❌', label: 'Hustle Culture', desc: 'More hours = more success. Sleep is lazy. Push through burnout.' },
                { icon: '✅', label: 'Balanced Success', desc: 'Right effort at the right time. Recovery is productive. Sustainability wins.' },
                { icon: '🧬', label: 'Digital Twin Way', desc: 'AI-calibrated pacing. Cross-domain optimization. Sustainable peak performance.' },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-xl block mb-2">{item.icon}</span>
                  <p className="text-sm font-semibold mb-1">{item.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to meet your<br /><span className="gradient-text">Digital Twin?</span>
          </h2>
          <p className="text-slate-400 mb-10 text-base max-w-lg mx-auto leading-relaxed">
            Stop managing life in disconnected apps. Start understanding it as the one intelligent system it actually is.
          </p>
          <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-lg px-10 py-4 rounded-2xl inline-block mb-6">
            Start for Free →
          </Link>
          <p className="text-xs text-slate-600">
            No setup required
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">DT</div>
            <div>
              <span className="text-sm font-semibold block">Personal Digital Twin</span>
              <span className="text-[10px] text-slate-600">Emotionally Intelligent AI Life OS</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span>🔒 End-to-end encrypted</span>
            <span>🛡️ GDPR compliant</span>
            <span>💾 Local-first data</span>
          </div>
          <p className="text-xs text-slate-600">Wise Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
