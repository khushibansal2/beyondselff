import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.06]" style={{ background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between h-12 px-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] text-[#6b7280]">BeyondSelf</span>
          <span className="text-[12px] text-[#6b7280]">/</span>
          <h2 className="text-[13px] font-medium text-[#f0f0f3] truncate">{pageName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px]">
              {user?.avatar || '👤'}
            </div>
            <span className="text-[12px] text-[#71717a] truncate max-w-[120px]">{user?.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
