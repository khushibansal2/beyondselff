import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AnomalyBell } from '../ui/Components';
import {
  LayoutDashboard, Heart, Wallet, Target, Trophy, Sparkles,
  Brain, MessageSquare, Star, Leaf, Upload, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, X, Zap
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
  const { anomalies = [] } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const handleLogout = () => { logout(); navigate('/'); };

  const toggleSection = (label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavLink = ({ item, onClick }) => {
    const active = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-[13px] group ${
          active
            ? 'bg-white/[0.06] text-[#f0f0f3] font-medium'
            : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.03]'
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2 : 1.5} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`${collapsed && !mobile ? 'px-4 py-5' : 'px-5 py-5'} flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div>
                <h1 className="text-[14px] font-semibold text-[#f0f0f3] tracking-tight">BeyondSelf</h1>
              </div>
            )}
          </Link>
          {mobile && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-[#52525b] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label} className="mb-4">
              {(!collapsed || mobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 py-2 group"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3f3f46] group-hover:text-[#52525b] transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-[#3f3f46] opacity-0 group-hover:opacity-100 transition-all duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {collapsed && !mobile && <div className="h-px bg-white/[0.04] mx-3 my-2" />}
              {!isCollapsed && (
                <div className="space-y-[2px]">
                  {section.items.map((item) => (
                    <NavLink key={item.path} item={item} onClick={mobile ? onClose : undefined} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="pt-2 mt-2 border-t border-white/[0.04]">
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm flex-shrink-0">
            {user?.avatar || '👤'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-[#f0f0f3]">{user?.name}</p>
              <p className="text-[11px] text-[#52525b] truncate">{user?.persona}</p>
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {(!collapsed || mobile) && (
            <>
              <button
                onClick={() => !mobile && setCollapsed(!collapsed)}
                className="flex-1 text-[11px] text-[#52525b] hover:text-[#a1a1aa] py-2 rounded-lg hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1.5"
              >
                {collapsed ? <ChevronRight size={13} /> : <><ChevronLeft size={13} /> <span>Collapse</span></>}
              </button>
              <button
                onClick={handleLogout}
                className="text-[11px] text-[#52525b] hover:text-[#ef4444] py-2 px-3 rounded-lg hover:bg-[rgba(239,68,68,0.06)] transition-all flex items-center gap-1.5"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </>
          )}
          {collapsed && !mobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex-1 text-[#52525b] hover:text-[#a1a1aa] py-2 rounded-lg hover:bg-white/[0.04] transition-all flex items-center justify-center"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-[#71717a] hover:text-white transition-colors">
              <Menu size={18} />
            </button>
            <div className="w-6 h-6 rounded-md bg-[#3b82f6] flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold text-[#f0f0f3]">BeyondSelf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[11px]">
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
              className="lg:hidden fixed left-0 top-0 h-screen w-[272px] z-50 bg-[#0f0f11] border-r border-white/[0.04]"
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-[#0f0f11] border-r border-white/[0.04] transition-all duration-200 ${
          collapsed ? 'w-[64px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-t border-white/[0.04]">
        <div className="flex justify-around py-2 px-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all ${
                  active ? 'text-[#3b82f6]' : 'text-[#3f3f46]'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block ${collapsed ? 'w-[64px]' : 'w-[260px]'} flex-shrink-0 transition-all duration-200`} />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-[49px] flex-shrink-0" />
    </>
  );
}
