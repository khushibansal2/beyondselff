import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatarUtils';

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
  '/integrations': 'Integrations',
  '/market': 'Life Market',
  '/settings': 'Settings',
};

export default function TopNavbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pageName = routeNames[location.pathname] || 'Dashboard';
  const isLight = theme === 'light';

  return (
    <header
      className="sticky top-0 z-30 w-full"
      style={{
        background: isLight ? 'rgba(240,244,248,0.92)' : 'rgba(6,11,20,0.88)',
        borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(139,92,246,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between h-12 px-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px]" style={{ color: isLight ? '#94a3b8' : '#6b7280' }}>BeyondSelf</span>
          <span className="text-[12px]" style={{ color: isLight ? '#94a3b8' : '#6b7280' }}>/</span>
          <h2 className="text-[13px] font-semibold truncate" style={{ color: isLight ? '#0f172a' : '#f0f0f3' }}>{pageName}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
              border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
              color: isLight ? '#334155' : '#94a3b8',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
              e.currentTarget.style.color = isLight ? '#0f172a' : '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = isLight ? '#334155' : '#94a3b8';
            }}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* User */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden"
              style={{ border: isLight ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.08)' }}>
              <img src={getAvatarUrl(user)} alt={user?.name || 'User'} className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] truncate max-w-[120px]" style={{ color: isLight ? '#64748b' : '#71717a' }}>
              {user?.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
