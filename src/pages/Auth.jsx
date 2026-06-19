import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null); // { attempt, max }
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRetryStatus(null);
    try {
      const result = await login(email, password, (attempt, max) => setRetryStatus({ attempt, max }));
      if (result.success) navigate('/dashboard');
      else setError(result.error || 'Invalid credentials');
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
      setRetryStatus(null);
    }
  };

  const demoAccounts = [
    { name: 'Stressed Student', email: 'arjun@demo.com',   icon: '🧑‍💻' },
    { name: 'Fitness Learner',  email: 'priya@demo.com',   icon: '💪'   },
    { name: 'Overspender',      email: 'rahul@demo.com',   icon: '💸'   },
    { name: 'Burnout Risk',     email: 'sneha@demo.com',   icon: '🔥'   },
    { name: 'Placement Coder',  email: 'karthik@demo.com', icon: '🎯'   },
  ];

  const handleDemoLogin = (email) => {
    setError('');
    // Demo login is synchronous (purely frontend — no network call)
    const result = login(email, 'demo123');
    if (result && result.success) navigate('/dashboard');
    else setError(result?.error || 'Demo login failed');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none">BeyondSelf</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Life OS</p>
            </div>
          </Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Welcome Back</h1>
          <p className="text-sm text-slate-400 mt-2">Sign in to your BeyondSelf account</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="••••••••" required />
            </div>
            {loading && !retryStatus && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⏳ Connecting to server — waking it up, please wait…
              </div>
            )}
            {retryStatus && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⏳ Server is waking up… retrying ({retryStatus.attempt}/{retryStatus.max}). Hang tight, this can take up to 90 seconds on first use.
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-3 text-center">One-click demo — no signup needed</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map(d => (
                <button key={d.email} onClick={() => handleDemoLogin(d.email)} disabled={loading}
                  className="text-left text-xs p-2.5 rounded-xl bg-white/[0.03] hover:bg-blue-500/10 border border-white/[0.06] hover:border-blue-500/20 transition-all flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>{d.icon}</span>
                    <span className="text-slate-300 font-medium">{d.name}</span>
                  </div>
                  <span className="text-blue-400 text-[10px]">Try →</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-slate-500">
          Don't have an account? <Link to="/signup" className="text-blue-400 hover:text-blue-300">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
}

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (age && (parseInt(age) < 10 || parseInt(age) > 120)) { setError('Please enter a valid age'); return; }
    setLoading(true);
    setRetryStatus(null);
    setError('');
    try {
      const result = await signup(name, email, password, age ? parseInt(age) : null, gender || null, (attempt, max) => setRetryStatus({ attempt, max }));
      if (result.success) navigate('/dashboard');
      else setError(result.error || 'Signup failed');
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
      setRetryStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none">BeyondSelf</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Life OS</p>
            </div>
          </Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Build Your Digital Twin</h1>
          <p className="text-sm text-slate-400 mt-2">Start your AI-powered life intelligence journey</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Your name" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="Min 6 characters" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} className="input-premium" placeholder="e.g. 22" min="10" max="120" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="input-premium w-full">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>
            </div>
            {loading && !retryStatus && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⏳ Connecting to server — waking it up, please wait…
              </div>
            )}
            {retryStatus && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⏳ Server is waking up… retrying ({retryStatus.attempt}/{retryStatus.max}). Hang tight, this can take up to 90 seconds on first use.
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
