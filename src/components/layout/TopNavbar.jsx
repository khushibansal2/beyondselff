import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Search, Command } from 'lucide-react';

const routeNames = {
  '/dashboard': 'Dashboard',
  '/health': 'Health & Wellness',
  '/finance': 'Financial Health',
  '/career': 'Career & Growth',
  '/goals': 'SMART Goals',
  '/neural-core': 'Neural Core',
  '/simulator': 'Life Simulator',
  '/insights': 'Cross-Domain Intelligence',
  '/coach': 'AI Life Coach',
  '/gamification': 'Rewards & Achievements',
  '/sustainability': 'Sustainability',
  '/upload': 'Data Import',
  '/settings': 'Settings & Integrations',
};

export default function TopNavbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { computed } = useData();
  const pageName = routeNames[location.pathname] || 'Dashboard';
  const balance = computed?.lifeBalance?.balance || computed?.balance || 0;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.05] bg-[#09090b]/70 backdrop-blur-xl">
      <div className="flex items-center justify-between h-12 px-6">
        {/* Left: Page title */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[13px] font-semibold text-zinc-200 truncate tracking-tight">
            {pageName}
          </h2>
        </div>

        {/* Right: Search + Status */}
        <div className="flex items-center gap-3">
          {/* Search (desktop only) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-600 text-xs cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.05] transition-all w-52">
            <Search size={13} />
            <span className="flex-1">Search...</span>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-zinc-500">
              <Command size={10} />K
            </div>
          </div>

          {/* Balance pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px]">
            <span className="text-zinc-500">Balance</span>
            <span className="font-bold tabular-nums" style={{ color: balance >= 60 ? '#10b981' : '#f59e0b' }}>
              {balance}
            </span>
          </div>

          {/* User avatar */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-xs">
              {user?.avatar || '👤'}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-zinc-300 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-zinc-600 truncate leading-tight">{user?.persona}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
