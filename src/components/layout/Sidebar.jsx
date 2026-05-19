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
        className={`flex items-center gap-2.5 px-2 py-[6px] rounded-md transition-all duration-150 text-[13px] ${
          active
            ? 'bg-[#2f2f2f] text-white font-medium'
            : 'text-[#9B9B9B] hover:text-[#EBEBEB] hover:bg-[#2b2b2b]'
        }`}
      >
        <Icon size={16} strokeWidth={active ? 2 : 1.75} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false, onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`${collapsed && !mobile ? 'px-3 py-4' : 'px-4 py-4'} flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 rounded-md bg-[#2383E2] flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div>
                <h1 className="text-[13px] font-semibold text-[#EBEBEB] tracking-tight">BeyondSelf</h1>
              </div>
            )}
          </Link>
          {mobile && (
            <button onClick={onClose} className="p-1 rounded-md hover:bg-[#2b2b2b] text-[#5C5C5C] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label} className="mb-1">
              {(!collapsed || mobile) && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-2 py-1.5 group"
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#5C5C5C] group-hover:text-[#9B9B9B] transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-[#5C5C5C] opacity-0 group-hover:opacity-100 transition-all duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {collapsed && !mobile && <div className="h-px bg-[rgba(255,255,255,0.04)] mx-2 my-1.5" />}
              {!isCollapsed && (
                <div className="space-y-[1px]">
                  {section.items.map((item) => (
                    <NavLink key={item.path} item={item} onClick={mobile ? onClose : undefined} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="pt-1 mt-1 border-t border-[rgba(255,255,255,0.04)]">
          <AnomalyBell anomalies={anomalies} collapsed={collapsed && !mobile} />
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded-md bg-[#2f2f2f] flex items-center justify-center text-xs flex-shrink-0">
            {user?.avatar || '👤'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate text-[#EBEBEB]">{user?.name}</p>
              <p className="text-[10px] text-[#5C5C5C] truncate">{user?.persona}</p>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {(!collapsed || mobile) && (
            <>
              <button
                onClick={() => !mobile && setCollapsed(!collapsed)}
                className="flex-1 text-[11px] text-[#5C5C5C] hover:text-[#9B9B9B] py-1.5 rounded-md hover:bg-[#2b2b2b] transition-all flex items-center justify-center gap-1"
              >
                {collapsed ? <ChevronRight size={13} /> : <><ChevronLeft size={13} /> <span>Collapse</span></>}
              </button>
              <button
                onClick={handleLogout}
                className="text-[11px] text-[#5C5C5C] hover:text-[#E03E3E] py-1.5 px-2.5 rounded-md hover:bg-[rgba(224,62,62,0.08)] transition-all flex items-center gap-1"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </>
          )}
          {collapsed && !mobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex-1 text-[#5C5C5C] hover:text-[#9B9B9B] py-1.5 rounded-md hover:bg-[#2b2b2b] transition-all flex items-center justify-center"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#191919] border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 text-[#9B9B9B] hover:text-white transition-colors">
              <Menu size={18} />
            </button>
            <div className="w-6 h-6 rounded-md bg-[#2383E2] flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold text-[#EBEBEB]">BeyondSelf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2f2f2f] flex items-center justify-center text-[10px]">
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
              className="lg:hidden fixed inset-0 z-50 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -272 }}
              animate={{ x: 0 }}
              exit={{ x: -272 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[260px] z-50 bg-[#202020] border-r border-[rgba(255,255,255,0.04)]"
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-[#202020] border-r border-[rgba(255,255,255,0.04)] transition-all duration-200 ${
          collapsed ? 'w-[60px]' : 'w-[230px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#191919] border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex justify-around py-1.5 px-2">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-md transition-all ${
                  active ? 'text-[#2383E2]' : 'text-[#5C5C5C]'
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
      <div className={`hidden lg:block ${collapsed ? 'w-[60px]' : 'w-[230px]'} flex-shrink-0 transition-all duration-200`} />
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-[49px] flex-shrink-0" />
    </>
  );
}
