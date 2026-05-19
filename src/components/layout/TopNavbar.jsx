import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

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
  const pageName = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[rgba(255,255,255,0.04)] bg-[#191919]">
      <div className="flex items-center justify-between h-11 px-6">
        {/* Left: Breadcrumb-style page title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] text-[#5C5C5C]">BeyondSelf</span>
          <span className="text-[12px] text-[#5C5C5C]">/</span>
          <h2 className="text-[13px] font-medium text-[#EBEBEB] truncate">
            {pageName}
          </h2>
        </div>

        {/* Right: Minimal info */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2f2f2f] flex items-center justify-center text-[10px]">
              {user?.avatar || '👤'}
            </div>
            <span className="text-[12px] text-[#9B9B9B] truncate max-w-[120px]">{user?.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
