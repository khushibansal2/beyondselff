import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/health', label: 'Health', icon: '❤️' },
  { path: '/finance', label: 'Finance', icon: '💰' },
  { path: '/career', label: 'Career', icon: '🎯' },
  { path: '/goals', label: 'Goals', icon: '🏆' },
  { path: '/simulator', label: 'Simulator', icon: '🔮' },
  { path: '/insights', label: 'Insights', icon: '🧠' },
  { path: '/coach', label: 'AI Coach', icon: '💬' },
  { path: '/gamification', label: 'Rewards', icon: '⭐' },
  { path: '/upload', label: 'Data Import', icon: '📂' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { computed, syncStatus } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const lifeBalance = computed?.lifeBalance?.balance || 0;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-xl">☰</button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">DT</div>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{user?.avatar}</span>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[280px] z-50 glass-strong flex flex-col">
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold">DT</div>
                    <div>
                      <h1 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin</h1>
                      <p className="text-[10px] text-slate-500">AI Life Intelligence</p>
                    </div>
                  </Link>
                  <button onClick={() => setMobileOpen(false)} className="text-slate-400 text-lg">✕</button>
                </div>
              </div>
              <nav className="flex-1 py-4 px-3 overflow-y-auto">
                {navItems.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-sm ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">{user?.avatar || '👤'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500">{user?.persona}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full text-xs text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-red-500/10 transition-all">Logout</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 glass-strong transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold flex-shrink-0">DT</div>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Digital Twin</h1>
                <p className="text-[10px] text-slate-500">AI Life Intelligence</p>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Quick Score Summary */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
              <span>Life Balance</span>
              <span className="font-bold" style={{ color: lifeBalance >= 60 ? '#10b981' : '#f59e0b' }}>{lifeBalance}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${lifeBalance}%` }} transition={{ duration: 1.5 }}
                className="h-full rounded-full" style={{ background: lifeBalance >= 60 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-sm ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {active && <motion.div layoutId="nav-active" className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">{user?.avatar || '👤'}</div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.persona}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCollapsed(!collapsed)} className="flex-1 text-xs text-slate-500 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition-all">
              {collapsed ? '→' : '← Collapse'}
            </button>
            {!collapsed && <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg hover:bg-red-500/10 transition-all">Logout</button>}
          </div>
          
          {/* Sync Status Indicator */}
          {!collapsed && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px]">
              {syncStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-blue-400">Saving...</span></>}
              {syncStatus === 'synced' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-emerald-400">Cloud Synced</span></>}
              {syncStatus === 'offline' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-amber-400">Offline</span></>}
              {syncStatus === 'error' && <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-red-400">Sync Error</span></>}
              {(syncStatus === 'idle' || !syncStatus) && <><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span className="text-slate-500">Local Only</span></>}
            </div>
          )}
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/[0.06]">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${active ? 'text-blue-400' : 'text-slate-500'}`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block ${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 transition-all duration-300`} />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-14 flex-shrink-0" />
    </>
  );
}
