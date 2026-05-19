import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AnomalyBell } from '../ui/Components';
import {
  LayoutDashboard, Heart, Wallet, Target, Trophy, Sparkles,
  Brain, MessageSquare, Star, Leaf, Upload, Settings,
  ChevronLeft, ChevronRight, LogOut, Menu, X, Zap
} from 'lucide-react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Domains',
    items: [
      { path: '/health', label: 'Health', icon: Heart },
      { path: '/finance', label: 'Finance', icon: Wallet },
      { path: '/career', label: 'Career', icon: Target },
      { path: '/goals', label: 'Goals', icon: Trophy },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/simulator', label: 'Simulator', icon: Sparkles },
      { path: '/insights', label: 'Insights', icon: Brain },
      { path: '/coach', label: 'AI Coach', icon: MessageSquare },
      { path: '/gamification', label: 'Rewards', icon: Star },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/sustainability', label: 'Sustainability', icon: Leaf },
      { path: '/upload', label: 'Data Import', icon: Upload },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Flat list for mobile bottom nav
const mobileNavItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/health', label: 'Health', icon: Heart },
  { path: '/finance', label: 'Finance', icon: Wallet },
  { path: '/career', label: 'Career', icon: Target },
  { path: '/coach', label: 'Coach', icon: MessageSquare },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { computed, anomalies = [] } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const lifeBalance = computed?.lifeBalance?.balance || 0;

  const NavLink = ({ item, onClick }) => {
    const active = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[13px] group ${
          active
            ? 'bg-white/[0.08] text-white font-medium'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-500"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <Icon size={18} strokeWidth={active ? 2 : 1.75} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`${collapsed && !mobile ? 'px-3 py-5' : 'px-5 py-5'} border-b border-white/[0.06] flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <Zap size={18} className="text-white" />
            </div>
            {(!collapsed || mobile) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                <h1 className="text-sm font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>BeyondSelf</h1>
                <p className="text-[10px] text-zinc-600">AI Life Intelligence</p>
              </motion.div>
            )}
          </Link>
          {mobile && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Life Balance Indicator */}
      {(!collapsed || mobile) && (
        <div className="px-5 py-3 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
            <span className="uppercase tracking-wider font-medium">Life Balance</span>
            <span className="font-bold tabular-nums" style={{ color: lifeBalance >= 60 ? '#10b981' : '#f59e0b' }}>{lifeBalance}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lifeBalance}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: lifeBalance >= 60
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              }}
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {(!collapsed || mobile) && (
              <p className="section-label px-3 mb-1.5">{section.label}</p>
            )}
            {collapsed && !mobile && <div className="h-px bg-white/[0.04] mx-2 mb-1.5" />}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.path} item={item} onClick={mobile ? onClose : undefined} />
              ))}
            </div>
          </div>
        ))}
        <div className="pt-1 border-t border-white/[0.05]">
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-sm flex-shrink-0">
            {user?.avatar || '👤'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-zinc-200">{user?.name}</p>
              <p className="text-[10px] text-zinc-600 truncate">{user?.persona}</p>
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {(!collapsed || mobile) && (
            <>
              <button
                onClick={() => !mobile && setCollapsed(!collapsed)}
                className="flex-1 text-[11px] text-zinc-600 hover:text-zinc-300 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1.5"
              >
                {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> <span>Collapse</span></>}
              </button>
              <button
                onClick={handleLogout}
                className="text-[11px] text-zinc-600 hover:text-red-400 py-1.5 px-3 rounded-lg hover:bg-red-500/[0.06] transition-all flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          )}
          {collapsed && !mobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex-1 text-zinc-600 hover:text-zinc-300 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 text-zinc-400 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>BeyondSelf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/60 to-purple-600/60 flex items-center justify-center text-xs">
              {user?.avatar || '👤'}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[272px] z-50 bg-[#0c0c0f] border-r border-white/[0.06]"
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-[#0c0c0f]/95 backdrop-blur-xl border-r border-white/[0.06] transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex justify-around py-1.5 px-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                  active ? 'text-indigo-400' : 'text-zinc-600'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block ${collapsed ? 'w-[68px]' : 'w-[240px]'} flex-shrink-0 transition-all duration-300`} />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-[52px] flex-shrink-0" />
    </>
  );
}
