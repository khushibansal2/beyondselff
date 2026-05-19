import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  { avatar: '🧑‍💻', name: 'Arjun', tag: 'Stressed Student', health: 38, finance: 62, career: 71, alert: '⚠️ Sleep deprivation cutting study efficiency by ~30%' },
  { avatar: '💪', name: 'Priya', tag: 'Fitness Learner', health: 91, finance: 74, career: 63, alert: '✅ Exercise boosting focus by 20% — keep going!' },
  { avatar: '💸', name: 'Rahul', tag: 'Overspender', health: 55, finance: 18, career: 47, alert: '🚨 High stress linked to emotional overspending detected' },
  { avatar: '🔥', name: 'Sneha', tag: 'Burnout Risk', health: 19, finance: 51, career: 88, alert: '🚨 Critical burnout risk: intervene before collapse' },
];

const stats = [
  { value: '3', label: 'Life Domains Unified', icon: '🔗' },
  { value: '11+', label: 'AI Modules', icon: '🧠' },
  { value: '95%', label: 'Insight Confidence', icon: '📊' },
  { value: '0', label: 'Hustle Culture', icon: '🚫' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center text-lg font-bold flex-shrink-0 text-indigo-400">DT</div>
            <div>
              <span className="text-[15px] font-bold block text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin</span>
              <span className="text-[10px] text-zinc-500 block -mt-0.5">AI Life Operating System</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-[13px]">Open Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-[13px] text-zinc-400 hover:text-white transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary text-[13px]">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-zinc-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              Emotionally Intelligent AI Life Operating System
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.1] text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
            Your Personal <br />
            <span className="gradient-text">Digital Twin</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Most apps track <em>metrics</em>. We understand your <strong className="text-zinc-200">life</strong>.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="text-[13px] sm:text-[15px] text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Health, finances, and career aren't separate problems — they're one interconnected system.
            Our AI finds the hidden relationships before they derail you.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-[15px] px-8 py-3.5 rounded-xl font-medium">
              {user ? 'Open Dashboard' : 'Start Your Digital Twin'} →
            </Link>
            <Link to="/login" className="btn-secondary text-[15px] px-8 py-3.5 rounded-xl font-medium border border-white/[0.08] hover:bg-white/[0.04]">
              Try Demo Account
            </Link>
          </motion.div>

          {/* Hero Preview Card */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }}
            className="max-w-3xl mx-auto">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-left">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Your AI Life Overview</p>
                  <p className="text-[14px] text-zinc-300 font-medium mt-0.5">Arjun Mehta — Stressed Student</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/10 px-3 py-1.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI Monitoring Active
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Health Score', value: 38, color: '#ef4444', icon: '❤️', sub: '⬇️ Low' },
                  { label: 'Finance', value: 62, color: '#f59e0b', icon: '💰', sub: '📈 Ok' },
                  { label: 'Career', value: 71, color: '#6366f1', icon: '🎯', sub: '✅ Good' },
                  { label: 'Life Balance', value: 47, color: '#8b5cf6', icon: '⚖️', sub: '⚠️ At Risk' },
                ].map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.1 }}
                    className="text-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-xl block mb-2">{item.icon}</span>
                    <p className="text-2xl font-bold mt-1" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{item.value}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-medium">{item.label}</p>
                    <p className="text-[11px] mt-1 font-medium" style={{ color: item.color }}>{item.sub}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
                className="p-4 rounded-xl bg-red-500/[0.04] border border-red-500/10 text-left">
                <p className="text-[12px] font-semibold text-red-300 mb-1">🧠 AI Cross-Domain Alert</p>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  Your <strong className="text-zinc-200">5.2h sleep avg</strong> is reducing study efficiency by ~30%. Combined with a <strong className="text-zinc-200">stress level of 8/10</strong>, burnout is predicted within <strong className="text-red-400">2-3 weeks</strong> without intervention.
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
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <span className="text-3xl block mb-3">{s.icon}</span>
              <p className="text-4xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>{s.value}</p>
              <p className="text-[13px] text-zinc-500 mt-2 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
              Your life is one system.<br /><span className="gradient-text">Stop managing it in silos.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-[15px] leading-relaxed">
              Traditional apps see your steps. We see why you skipped a workout — and how it cascades into poor sleep, lower focus, and impulsive spending.
            </p>
          </motion.div>

          {/* Correlation Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {correlations.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`p-5 rounded-2xl border ${c.type === 'positive' ? 'border-emerald-500/15 bg-emerald-500/[0.03]' : 'border-red-500/15 bg-red-500/[0.03]'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[15px] font-medium text-zinc-200">{c.from}</span>
                  <span className={`text-lg ${c.type === 'positive' ? 'text-emerald-400' : 'text-red-400'}`}>{c.type === 'positive' ? '→' : '⚡'}</span>
                  <span className="text-[15px] font-medium text-zinc-200">{c.to}</span>
                </div>
                <p className={`text-[13px] ${c.type === 'positive' ? 'text-emerald-400/80' : 'text-red-400/80'}`}>{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
              One AI. <span className="gradient-text">Every Dimension</span> of Your Life.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-[15px]">
              Not three separate dashboards — one deeply connected intelligence that sees how everything is related.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m, i) => (
              <motion.div key={m.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass-card p-6 group hover:border-indigo-500/30 transition-all">
                <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform duration-300">{m.icon}</span>
                <h3 className="text-[15px] font-semibold mb-2 text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>{m.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Personas */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
              See it work for <span className="gradient-text">real people</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-[15px]">
              Each persona has unique cross-domain patterns. Our AI finds the right intervention for each one.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {personas.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-3xl flex-shrink-0">{p.avatar}</div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-200">{p.name}</p>
                    <p className="text-[12px] text-zinc-500 mt-0.5">{p.tag}</p>
                  </div>
                </div>
                <div className="flex gap-3 mb-5">
                  {[{ l: 'Health', v: p.health, c: p.health < 40 ? '#ef4444' : '#10b981' }, { l: 'Finance', v: p.finance, c: p.finance < 40 ? '#ef4444' : '#f59e0b' }, { l: 'Career', v: p.career, c: '#6366f1' }].map(s => (
                    <div key={s.l} className="flex-1 text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[15px] font-bold" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className={`p-3 rounded-xl text-[12px] font-medium ${p.alert.startsWith('🚨') ? 'bg-red-500/[0.04] border border-red-500/10 text-red-400' : p.alert.startsWith('⚠️') ? 'bg-amber-500/[0.04] border border-amber-500/10 text-amber-400' : 'bg-emerald-500/[0.04] border border-emerald-500/10 text-emerald-400'}`}>
                  {p.alert}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-10">
            <Link to="/login" className="btn-secondary text-[14px] px-6 py-3 rounded-xl border border-white/[0.08]">
              Try any of these personas →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-6 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-8 md:p-12 rounded-3xl text-center">
            <span className="text-4xl block mb-6">🚫</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
              We don't believe in <span className="text-red-400">hustle culture.</span>
            </h2>
            <p className="text-zinc-400 text-[14px] md:text-[15px] leading-relaxed max-w-2xl mx-auto mb-10">
              Grinding 14 hours a day while sleeping 5 hours isn't ambition — it's a debt you'll pay with your health, relationships, and creativity.
              Our AI is designed to help you succeed <em>sustainably</em>, not just fast.
            </p>
            <div className="grid md:grid-cols-3 gap-5 text-left">
              {[
                { icon: '❌', label: 'Hustle Culture', desc: 'More hours = more success. Sleep is lazy. Push through burnout.' },
                { icon: '✅', label: 'Balanced Success', desc: 'Right effort at the right time. Recovery is productive. Sustainability wins.' },
                { icon: '🧬', label: 'Digital Twin Way', desc: 'AI-calibrated pacing. Cross-domain optimization. Sustainable peak performance.' },
              ].map(item => (
                <div key={item.label} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-2xl block mb-3">{item.icon}</span>
                  <p className="text-[14px] font-semibold mb-2 text-zinc-200">{item.label}</p>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to meet your<br /><span className="gradient-text">Digital Twin?</span>
          </h2>
          <p className="text-zinc-400 mb-10 text-[15px] max-w-lg mx-auto leading-relaxed">
            Stop managing life in disconnected apps. Start understanding it as the one intelligent system it actually is.
          </p>
          <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-[15px] px-10 py-3.5 rounded-xl inline-block mb-6 font-medium">
            Start for Free →
          </Link>
          <p className="text-[12px] text-zinc-600">
            No setup required • Try demo: arjun@demo.com / demo123
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400">DT</div>
            <div>
              <span className="text-[13px] font-semibold block text-zinc-300">Personal Digital Twin</span>
              <span className="text-[10px] text-zinc-600">Emotionally Intelligent AI Life OS</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-zinc-500">
            <span>🔒 End-to-end encrypted</span>
            <span>🛡️ GDPR compliant</span>
            <span>💾 Local-first data</span>
          </div>
          <p className="text-[12px] text-zinc-600">Wise Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
