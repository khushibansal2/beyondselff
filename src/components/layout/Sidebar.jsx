import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { AnomalyBell } from '../ui/Components';
import { getAvatarUrl } from '../../utils/avatarUtils';
import {
  LayoutDashboard, Heart, Wallet, Target, Trophy, Sparkles,
  Brain, MessageSquare, Star, Leaf, Upload, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, X, Zap,
  Link2, ArrowLeftRight, Dna, AlertTriangle, TrendingUp, GitBranch, Cpu
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
      { path: '/gamification',label: 'Rewards',     icon: Star,           color: '#818cf8' },
      { path: '/market',      label: 'Life Market', icon: ArrowLeftRight, color: '#f43f5e' },
      { path: '/stress-test', label: 'Stress Test',  icon: AlertTriangle, color: '#ef4444' },
      { path: '/future-you',   label: 'Future You',    icon: TrendingUp,    color: '#6366f1' },
      { path: '/cascade-map',  label: 'Cascade Map',   icon: GitBranch,     color: '#10b981' },
      { path: '/digital-twin', label: 'Digital Twin',  icon: Cpu,           color: '#a855f7' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/sustainability', label: 'Sustainability', icon: Leaf,     color: '#10b981' },
      { path: '/upload',         label: 'Data Import',   icon: Upload,   color: '#06b6d4' },
      { path: '/integrations',   label: 'Integrations',  icon: Link2,    color: '#8b5cf6' },
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
  const { anomalies = [], gamification, computed } = useData();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const sidebarBg = isLight ? '#ffffff' : '#07090e';
  const borderColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,216,182,0.08)';
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
        style={{
          background: active ? `${item.color}15` : 'transparent',
          border: `1px solid ${active ? `${item.color}30` : 'transparent'}`,
        }}
        className={`
          relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group
          ${active
            ? 'text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
          }
        `}
      >
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{
            background: active ? item.color : 'transparent',
            color: active ? '#fff' : 'inherit',
          }}
        >
          <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-[12px] truncate tracking-wide ${active ? 'font-bold' : 'font-medium'}`}
          >
            {item.label}
          </motion.span>
        )}
        {active && !collapsed && (
          <motion.div
            layoutId="nav-active-dot"
            className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
          />
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`${collapsed && !mobile ? 'px-4 py-5' : 'px-5 py-5'} flex-shrink-0`} style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/20">
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
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        {navSections.map((section) => {
          const isSectionCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label} className="mb-4">
              {(!collapsed || mobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 py-1 mb-1 group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 group-hover:text-slate-300 transition-colors">
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

        <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 space-y-3.5">
        
        {(!collapsed || mobile) ? (
          <div className="flex flex-col gap-3.5">
            {/* User Profile Card */}
            <div className="bg-[#1b1e32]/45 border border-white/[0.04] rounded-[20px] p-4 flex flex-col gap-3" style={{ backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-[13px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
                  {(user?.name || 'Yash')[0].toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-black text-white tracking-wide truncate">{(user?.name || 'YASH').toUpperCase()}</span>
                  <span className="text-[10.5px] text-slate-500 font-medium">Level {level}</span>
                </div>
              </div>

              {/* Progress bar to next level */}
              <div className="flex flex-col gap-2 mt-1.5">
                <div className="w-full h-1.5 rounded-full bg-slate-950/80 border border-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', boxShadow: '0 0 6px rgba(99,102,241,0.5)' }}
                  />
                </div>
                <span className="text-[10.5px] text-slate-500 font-bold tracking-wide">{xpForNext - xp} XP to Level {level + 1}</span>
              </div>
            </div>

            {/* Life Streak Calendar Block */}
            <div className="bg-[#1b1e32]/25 border border-white/[0.03] rounded-[20px] p-4 flex flex-col gap-3" style={{ backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12px] font-black text-white">
                  <span>🔥 Life Streak</span>
                </div>
                <span className="text-[12.5px] font-black text-slate-300">{gamification?.streak || 1} day</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500 px-0.5 mt-0.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  const today = new Date();
                  const currentDayIdx = (today.getDay() + 6) % 7; // Monday = 0
                  const isActive = idx === currentDayIdx;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                      <span className={isActive ? 'text-slate-300' : 'text-slate-500'}>{day}</span>
                      <div className="h-1.5 flex items-center justify-center">
                        {isActive ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] shadow-[0_0_8px_#f97316]" />
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-slate-800" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed View */
          <div className="flex flex-col gap-3 items-center">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-[13px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              {(user?.name || 'Yash')[0].toUpperCase()}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold">L1</span>
              <span className="text-[10px] text-orange-400 font-black">🔥 1d</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 pt-2">
          {(!collapsed || mobile) ? (
            <button
              onClick={handleLogout}
              className="text-[12px] font-semibold text-slate-400 hover:text-white py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-all flex items-center gap-2.5 w-full cursor-pointer"
            >
              <LogOut size={14} className="text-slate-400" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full text-slate-500 hover:text-slate-300 py-2 rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-center"
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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center shadow-sm">
              <Zap size={13} className="text-white" />
            </div>
            <span className="text-[14px] font-bold text-white tracking-tight">BeyondSelf</span>
          </div>
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.1]">
            <img src={getAvatarUrl(user)} alt={user?.name || 'User'} className="w-full h-full object-cover" />
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
