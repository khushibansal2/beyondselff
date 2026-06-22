import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingScreen, ToastContainer } from './components/ui/Components';
import Sidebar from './components/layout/Sidebar';
import TopNavbar from './components/layout/TopNavbar';
import VoiceLogger from './components/VoiceLogger';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import Dashboard, { OnboardingWizard } from './pages/Dashboard';

// Returns true while a real (non-demo) user still needs to complete the
// data-entry onboarding. Once they finish, a flag is written to localStorage.
function needsOnboarding(user, isDemo) {
  if (!user || isDemo) return false;
  return !localStorage.getItem(`onboarding_completed_${user.id}`);
}

// Full-screen gate: blocks the entire app (sidebar + every route) until the
// new user has entered their data. Nothing else mounts behind it.
function OnboardingGate({ children }) {
  const { user, isDemo } = useAuth();
  const { updateDomain, career } = useData();
  const [gated, setGated] = useState(() => needsOnboarding(user, isDemo));

  const complete = useCallback(() => {
    if (user?.id) localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    setGated(false);
  }, [user]);

  if (gated && needsOnboarding(user, isDemo)) {
    return <OnboardingWizard user={user} updateDomain={updateDomain} career={career} onComplete={complete} />;
  }
  return children;
}

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
const StressTest    = lazy(() => import('./pages/StressTest'));
const FutureYou     = lazy(() => import('./pages/FutureYou'));
const CascadeMap    = lazy(() => import('./pages/CascadeMap'));
const DigitalTwin   = lazy(() => import('./pages/DigitalTwin'));


const pageVariants = {
  initial: { opacity: 0, y: 18, filter: 'blur(3px)' },
  enter:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, filter: 'blur(2px)', transition: { duration: 0.18, ease: [0.36, 0, 0.66, 0] } },
};

function AnimatedPages() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="flex-1 min-w-0 overflow-y-auto"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <OnboardingGate>
      <div className="flex min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="hidden lg:block">
            <TopNavbar />
          </div>
          <AnimatedPages />
        </div>
      </div>
      <VoiceLogger />
    </OnboardingGate>
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
            <Route path="/stress-test"   element={<Suspense fallback={<LoadingScreen />}><StressTest /></Suspense>} />
            <Route path="/future-you"    element={<Suspense fallback={<LoadingScreen />}><FutureYou /></Suspense>} />
            <Route path="/cascade-map"   element={<Suspense fallback={<LoadingScreen />}><CascadeMap /></Suspense>} />
            <Route path="/digital-twin"  element={<Suspense fallback={<LoadingScreen />}><DigitalTwin /></Suspense>} />
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
