import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AnomalyBell } from '../ui/Components';
import {
  LayoutDashboard, Heart, Wallet, Target, Trophy, Sparkles,
  Brain, MessageSquare, Star, Leaf, Upload, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, X, Zap,
  Activity, Shield
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
  const { anomalies = [], gamification } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const handleLogout = () => { logout(); navigate('/'); };

  const toggleSection = (label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const xp = gamification?.xp || 0;
  const level = gamification?.level || 1;
  const xpForNext = level * 500;
  const xpProgress = Math.min((xp / xpForNext) * 100, 100);

  const NavLink = ({ item, onClick }) => {
    const active = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`sidebar-nav-item ${active ? 'active' : ''}`}
      >
        <Icon size={17} strokeWidth={active ? 2 : 1.5} className="sidebar-icon flex-shrink-0 transition-all duration-200" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="truncate"
          >
            {item.label}
          </motion.span>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo Area */}
      <div className={`${collapsed && !mobile ? 'px-4 py-5' : 'px-5 py-6'} flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 animate-glow-breathe">
              <Zap size={16} className="text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div>
                <h1 className="text-[15px] font-bold text-[#f0f0f3] tracking-tight group-hover:text-white transition-colors">
                  BeyondSelf
                </h1>
                <p className="text-[10px] text-[#3f3f46] font-medium tracking-wider uppercase">AI Life OS</p>
              </div>
            )}
          </Link>
          {mobile && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-[#52525b] hover:text-white transition-all">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label} className="mb-5">
              {(!collapsed || mobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 py-2 group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3f3f46] group-hover:text-[#52525b] transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-[#3f3f46] opacity-0 group-hover:opacity-100 transition-all duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {collapsed && !mobile && <div className="h-px bg-white/[0.04] mx-3 my-3" />}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-[3px]">
                      {section.items.map((item) => (
                        <NavLink key={item.path} item={item} onClick={mobile ? onClose : undefined} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <div className="pt-3 mt-3 border-t border-white/[0.04]">
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* AI Twin Status + XP + User Card */}
      <div className="px-4 py-4 border-t border-white/[0.06] flex-shrink-0 space-y-4">
        {/* AI Digital Twin Status */}
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/[0.06] to-purple-500/[0.04] border border-indigo-500/[0.08]">
            <div className="relative flex-shrink-0">
              <Activity size={14} className="text-indigo-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Digital Twin</p>
              <p className="text-[10px] text-[#52525b]">Active • Synced</p>
            </div>
          </div>
        )}

        {/* XP Progress */}
        {(!collapsed || mobile) && (
          <div className="px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Level {level}</span>
              <span className="text-[10px] text-[#3f3f46] tabular-nums">{xp}/{xpForNext} XP</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' }}
              />
            </div>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.08] flex items-center justify-center text-sm flex-shrink-0">
            {user?.avatar || '👤'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-[#f0f0f3]">{user?.name}</p>
              <p className="text-[10px] text-[#3f3f46] truncate">{user?.persona}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {(!collapsed || mobile) && (
            <>
              <button
                onClick={() => !mobile && setCollapsed(!collapsed)}
                className="flex-1 text-[11px] text-[#52525b] hover:text-[#a1a1aa] py-2 rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1.5"
              >
                {collapsed ? <ChevronRight size={13} /> : <><ChevronLeft size={13} /> <span>Collapse</span></>}
              </button>
              <button
                onClick={handleLogout}
                className="text-[11px] text-[#52525b] hover:text-[#ef4444] py-2 px-3 rounded-xl hover:bg-[rgba(239,68,68,0.06)] transition-all flex items-center gap-1.5"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </>
          )}
          {collapsed && !mobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex-1 text-[#52525b] hover:text-[#a1a1aa] py-2 rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-center"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-[#71717a] hover:text-white transition-colors">
              <Menu size={18} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-[13px] font-bold text-[#f0f0f3] tracking-tight">BeyondSelf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[11px]">
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
              className="lg:hidden fixed left-0 top-0 h-screen w-[280px] z-50 sidebar-glass"
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 sidebar-glass transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          collapsed ? 'w-[68px]' : 'w-[264px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex justify-around py-2 px-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                  active
                    ? 'text-indigo-400'
                    : 'text-[#3f3f46] hover:text-[#52525b]'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${active ? 'bg-indigo-500/10' : ''}`}>
                  <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block ${collapsed ? 'w-[68px]' : 'w-[264px]'} flex-shrink-0 transition-all duration-300`} />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-[49px] flex-shrink-0" />
    </>
  );
}
