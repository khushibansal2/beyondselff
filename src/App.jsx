import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { LoadingScreen, ToastContainer } from './components/ui/Components';
import Sidebar from './components/layout/Sidebar';
import TopNavbar from './components/layout/TopNavbar';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Health from './pages/Health';
import Finance from './pages/Finance';
import Career from './pages/Career';
import Goals from './pages/Goals';
import Simulator from './pages/Simulator';
import Insights from './pages/Insights';
import Coach from './pages/Coach';
import Gamification from './pages/Gamification';
import Sustainability from './pages/Sustainability';
import Upload from './pages/Upload';
import Settings from './pages/Settings';

import NeuralCore from './pages/NeuralCore';


function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-[#191919]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="hidden lg:block">
          <TopNavbar />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && window.location.pathname !== '/') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health" element={<Health />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/career" element={<Career />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/neural-core" element={<NeuralCore />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/gamification" element={<Gamification />} />
            <Route path="/sustainability" element={<Sustainability />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
