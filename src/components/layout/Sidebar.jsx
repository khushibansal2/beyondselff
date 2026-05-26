import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { AnomalyBell } from '../ui/Components';
import {
  LayoutDashboard, Heart, Wallet, Target, Trophy, Sparkles,
  Brain, MessageSquare, Star, Leaf, Upload, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, X, Zap,
  Activity, Link2, ArrowLeftRight, Dna
} from 'lucide-react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
    ],
  },
  {
    label: 'My Life',
    items: [
      { path: '/health',  label: 'Health',  icon: Heart,   color: '#10b981' },
      { path: '/finance', label: 'Finance', icon: Wallet,  color: '#f59e0b' },
      { path: '/career',  label: 'Career',  icon: Target,  color: '#3b82f6' },
      { path: '/goals',   label: 'Goals',   icon: Trophy,  color: '#8b5cf6' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/simulator',   label: 'Simulator',   icon: Sparkles,       color: '#06b6d4' },
      { path: '/insights',    label: 'Insights',    icon: Brain,          color: '#8b5cf6' },
      { path: '/neural-core', label: 'Neural Core', icon: Dna,            color: '#10b981' },
      { path: '/coach',       label: 'AI Coach',    icon: MessageSquare,  color: '#6366f1' },
      { path: '/gamification',label: 'Rewards',     icon: Star,           color: '#f59e0b' },
      { path: '/market',      label: 'Life Market', icon: ArrowLeftRight, color: '#f43f5e' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/sustainability', label: 'Sustainability', icon: Leaf,     color: '#10b981' },
      { path: '/upload',         label: 'Data Import',   icon: Upload,   color: '#06b6d4' },
      { path: '/integrations',   label: 'Integrations',  icon: Link2,    color: '#8b5cf6' },
      { path: '/settings',       label: 'Settings',      icon: Settings, color: '#94a3b8' },
    ],
  },
];

const mobileNavItems = [
  { path: '/dashboard', label: 'Home',    icon: LayoutDashboard, color: '#6366f1' },
  { path: '/health',    label: 'Health',  icon: Heart,           color: '#10b981' },
  { path: '/finance',   label: 'Finance', icon: Wallet,          color: '#f59e0b' },
  { path: '/career',    label: 'Career',  icon: Target,          color: '#3b82f6' },
  { path: '/coach',     label: 'Coach',   icon: MessageSquare,   color: '#6366f1' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { anomalies = [], gamification } = useData();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const sidebarBg = isLight
    ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    : 'linear-gradient(180deg, #0f1224 0%, #111827 100%)';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const handleLogout = () => { logout(); navigate('/'); };
  const toggleSection = (label) => setCollapsedSections(p => ({ ...p, [label]: !p[label] }));

  const xp = gamification?.xp || 0;
  const level = gamification?.level || 1;
  const xpForNext = level * 500;
  const xpProgress = Math.min((xp / xpForNext) * 100, 100);

  const NavItem = ({ item, onClick }) => {
    const active = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        style={active ? { background: item.color + '18', borderColor: item.color + '50' } : {}}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group border
          ${active
            ? 'border-transparent text-white'
            : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }
        `}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-150"
          style={{
            background: active ? item.color + '25' : 'transparent',
            color: active ? item.color : 'inherit',
          }}
        >
          <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[13.5px] font-medium truncate"
          >
            {item.label}
          </motion.span>
        )}
        {active && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`${collapsed && !mobile ? 'px-4 py-5' : 'px-5 py-5'} flex-shrink-0 border-b border-white/[0.07]`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
              <Zap size={17} className="text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div>
                <h1 className="text-[15px] font-bold text-white tracking-tight">BeyondSelf</h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">AI Life OS</p>
              </div>
            )}
          </Link>
          {mobile && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-1">
        {navSections.map((section) => {
          const isSectionCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label} className="mb-2">
              {(!collapsed || mobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 mb-1 group"
                >
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500 group-hover:text-slate-400 transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-600 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isSectionCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {collapsed && !mobile && <div className="h-px bg-white/[0.06] mx-2 my-2" />}

              <AnimatePresence initial={false}>
                {!isSectionCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {section.items.map((item) => (
                      <NavItem key={item.path} item={item} onClick={mobile ? onClose : undefined} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="pt-2 mt-2 border-t border-white/[0.06]">
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/[0.07] p-4 space-y-3">

        {/* Twin Status */}
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
            <div className="relative flex-shrink-0">
              <Activity size={14} className="text-indigo-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-[10.5px] font-semibold text-indigo-300 uppercase tracking-wider">Digital Twin</p>
              <p className="text-[10px] text-slate-500">Active · Synced</p>
            </div>
          </div>
        )}

        {/* XP Bar */}
        {(!collapsed || mobile) && (
          <div className="px-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Level {level}</span>
              <span className="text-[11px] text-slate-500 tabular-nums">{xp} / {xpForNext} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
          </div>
        )}

        {/* User card */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.1] flex items-center justify-center text-base flex-shrink-0 shadow-sm">
            {user?.avatar || '👤'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-slate-100">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.persona || 'User'}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {(!collapsed || mobile) && (
            <>
              <button
                onClick={() => !mobile && setCollapsed(!collapsed)}
                className="flex-1 text-[12px] font-medium text-slate-400 hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={14} />
                <span>Collapse</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-[12px] font-medium text-slate-400 hover:text-red-400 py-2.5 px-3 rounded-xl hover:bg-red-500/[0.07] border border-white/[0.06] hover:border-red-500/20 transition-all flex items-center gap-2"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          )}
          {collapsed && !mobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex-1 text-slate-500 hover:text-slate-300 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all flex items-center justify-center"
            >
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50"
        style={{
          background: isLight ? 'rgba(248,250,252,0.95)' : 'rgba(15,18,36,0.95)',
          borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
              <Menu size={19} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Zap size={13} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-white tracking-tight">BeyondSelf</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-700/60 border border-white/[0.1] flex items-center justify-center text-sm">
            {user?.avatar || '👤'}
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
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[280px] z-50"
              style={{
                background: sidebarBg,
                borderRight: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          collapsed ? 'w-[70px]' : 'w-[268px]'
        }`}
        style={{
          background: sidebarBg,
          borderRight: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: isLight ? 'rgba(248,250,252,0.97)' : 'rgba(15,18,36,0.97)',
          borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}>
        <div className="flex justify-around py-1.5 px-1">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all"
                style={{ color: active ? item.color : '#64748b' }}
              >
                <div className="p-1.5 rounded-lg transition-all" style={{ background: active ? item.color + '20' : 'transparent' }}>
                  <Icon size={19} strokeWidth={active ? 2.2 : 1.6} />
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacers */}
      <div className={`hidden lg:block ${collapsed ? 'w-[70px]' : 'w-[268px]'} flex-shrink-0 transition-all duration-300`} />
      <div className="lg:hidden h-[52px] flex-shrink-0" />
    </>
  );
}
