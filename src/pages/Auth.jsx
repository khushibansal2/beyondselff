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
    <div className="min-h-screen bg-[#191919] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-md bg-[#2383E2] flex items-center justify-center text-sm font-bold text-white">B</div>
            <span className="text-[14px] font-semibold text-[#EBEBEB]">BeyondSelf</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#EBEBEB]">Welcome Back</h1>
          <p className="text-[13px] text-[#9B9B9B] mt-2">Sign in to your workspace</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-[rgba(224,62,62,0.1)] border border-red-500/20 text-[13px] text-[#E03E3E]">{error}</div>}
            <div>
              <label className="text-[12px] text-[#9B9B9B] mb-1.5 block font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-[12px] text-[#9B9B9B] mb-1.5 block font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.055)]">
            <p className="text-[12px] text-[#9B9B9B] mb-3 text-center">Quick Demo Access</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map(d => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword('demo123'); }}
                  className="text-left text-[12px] p-2.5 rounded-xl bg-[#252525] hover:bg-[#2b2b2b] border border-[rgba(255,255,255,0.055)] hover:border-[rgba(255,255,255,0.09)] transition-all flex justify-between items-center group">
                  <span className="text-[#EBEBEB] group-hover:text-[#EBEBEB] transition-colors">{d.name}</span>
                  <span className="text-[#5C5C5C] group-hover:text-[#9B9B9B] transition-colors">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-[13px] text-[#9B9B9B]">
          Don't have an account? <Link to="/signup" className="text-[#2383E2] hover:underline transition-colors">Sign Up</Link>
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
    <div className="min-h-screen bg-[#191919] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-md bg-[#2383E2] flex items-center justify-center text-sm font-bold text-white">B</div>
            <span className="text-[14px] font-semibold text-[#EBEBEB]">BeyondSelf</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#EBEBEB]">Create Your Account</h1>
          <p className="text-[13px] text-[#9B9B9B] mt-2">Start your AI-powered life intelligence journey</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-[rgba(224,62,62,0.1)] border border-red-500/20 text-[13px] text-[#E03E3E]">{error}</div>}
            <div>
              <label className="text-[12px] text-[#9B9B9B] mb-1.5 block font-medium">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-premium" placeholder="Your name" required />
            </div>
            <div>
              <label className="text-[12px] text-[#9B9B9B] mb-1.5 block font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-premium" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="text-[12px] text-[#9B9B9B] mb-1.5 block font-medium">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-premium" placeholder="Min 6 characters" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2">
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[13px] text-[#9B9B9B]">
          Already have an account? <Link to="/login" className="text-[#2383E2] hover:underline transition-colors">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
