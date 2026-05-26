import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingScreen, ToastContainer } from './components/ui/Components';
import Sidebar from './components/layout/Sidebar';
import TopNavbar from './components/layout/TopNavbar';
import VoiceLogger from './components/VoiceLogger';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import Dashboard from './pages/Dashboard';

// Heavy pages — lazy-loaded to reduce initial bundle
const Health        = lazy(() => import('./pages/Health'));
const Finance       = lazy(() => import('./pages/Finance'));
const Career        = lazy(() => import('./pages/Career'));
const Goals         = lazy(() => import('./pages/Goals'));
const Simulator     = lazy(() => import('./pages/Simulator'));
const Insights      = lazy(() => import('./pages/Insights'));
const Coach         = lazy(() => import('./pages/Coach'));
const Gamification  = lazy(() => import('./pages/Gamification'));
const Sustainability= lazy(() => import('./pages/Sustainability'));
const Upload        = lazy(() => import('./pages/Upload'));
const Settings      = lazy(() => import('./pages/Settings'));
const NeuralCore    = lazy(() => import('./pages/NeuralCore'));
const Integrations  = lazy(() => import('./pages/Integrations'));
const LifeMarket    = lazy(() => import('./pages/LifeMarket'));


function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <div className="flex min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
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
      <VoiceLogger />
    </>
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
      <ThemeProvider>
      <AuthProvider>
        <DataProvider>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health"        element={<Suspense fallback={<LoadingScreen />}><Health /></Suspense>} />
            <Route path="/finance"       element={<Suspense fallback={<LoadingScreen />}><Finance /></Suspense>} />
            <Route path="/career"        element={<Suspense fallback={<LoadingScreen />}><Career /></Suspense>} />
            <Route path="/goals"         element={<Suspense fallback={<LoadingScreen />}><Goals /></Suspense>} />
            <Route path="/neural-core"   element={<Suspense fallback={<LoadingScreen />}><NeuralCore /></Suspense>} />
            <Route path="/simulator"     element={<Suspense fallback={<LoadingScreen />}><Simulator /></Suspense>} />
            <Route path="/insights"      element={<Suspense fallback={<LoadingScreen />}><Insights /></Suspense>} />
            <Route path="/coach"         element={<Suspense fallback={<LoadingScreen />}><Coach /></Suspense>} />
            <Route path="/gamification"  element={<Suspense fallback={<LoadingScreen />}><Gamification /></Suspense>} />
            <Route path="/sustainability" element={<Suspense fallback={<LoadingScreen />}><Sustainability /></Suspense>} />
            <Route path="/upload"        element={<Suspense fallback={<LoadingScreen />}><Upload /></Suspense>} />
            <Route path="/integrations"  element={<Suspense fallback={<LoadingScreen />}><Integrations /></Suspense>} />
            <Route path="/market"        element={<Suspense fallback={<LoadingScreen />}><LifeMarket /></Suspense>} />
            <Route path="/settings"      element={<Suspense fallback={<LoadingScreen />}><Settings /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </DataProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
