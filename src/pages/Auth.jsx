import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const result = login(email, password);
      if (result.success) navigate('/dashboard');
      else setError(result.error);
      setLoading(false);
    }, 800);
  };

  const demoAccounts = [
    { name: 'Stressed Student', email: 'arjun@demo.com' },
    { name: 'Fitness Learner', email: 'priya@demo.com' },
    { name: 'Overspender', email: 'rahul@demo.com' },
    { name: 'Burnout Risk', email: 'sneha@demo.com' },
    { name: 'Placement Coder', email: 'karthik@demo.com' },
  ];

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center text-xl font-bold text-indigo-400">DT</div>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>Welcome Back</h1>
          <p className="text-[13px] text-zinc-400 mt-2">Sign in to your Digital Twin</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">{error}</div>}
            <div>
              <label className="text-[12px] text-zinc-400 mb-1.5 block font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 mb-1.5 block font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <p className="text-[12px] text-zinc-500 mb-3 text-center">Quick Demo Access</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map(d => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword('demo123'); }}
                  className="text-left text-[12px] p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] transition-all flex justify-between items-center group">
                  <span className="text-zinc-300 group-hover:text-zinc-200 transition-colors">{d.name}</span>
                  <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-[13px] text-zinc-500">
          Don't have an account? <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
}

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      const result = signup(name, email, password);
      if (result.success) navigate('/dashboard');
      else setError(result.error);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 flex items-center justify-center text-xl font-bold text-indigo-400">DT</div>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>Create Your Digital Twin</h1>
          <p className="text-[13px] text-zinc-400 mt-2">Start your AI-powered life intelligence journey</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">{error}</div>}
            <div>
              <label className="text-[12px] text-zinc-400 mb-1.5 block font-medium">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Your name" required />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 mb-1.5 block font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-[12px] text-zinc-400 mb-1.5 block font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="Min 6 characters" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[13px] text-zinc-500">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
