import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { demoUsers } from '../data/demoData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  // Callback that DataContext will register to receive auth events
  const [onAuthChange, setOnAuthChange] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const saved = localStorage.getItem('dt_auth');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const { token: t, user: savedUser } = parsed;
          
          // Try the real backend first
          try {
            const res = await fetch('http://localhost:8080/api/auth/me', {
              headers: { 'Authorization': `Bearer ${t}` },
              signal: AbortSignal.timeout(3000) // 3s timeout — don't block forever
            });
            if (res.ok) {
              const u = await res.json();
              setUser(u);
              setToken(t);
              localStorage.setItem('dt_auth', JSON.stringify({ user: u, token: t }));
            } else {
              // Token invalid — clear it
              localStorage.removeItem('dt_auth');
            }
          } catch (networkErr) {
            // Backend is down — restore from localStorage so the app still works offline
            if (savedUser && t) {
              console.warn('[Auth] Backend unreachable — restoring from local cache (offline mode)');
              setUser(savedUser);
              setToken(t);
            } else {
              localStorage.removeItem('dt_auth');
            }
          }
        } catch (e) {
          console.error('[Auth] Restore failed:', e);
          localStorage.removeItem('dt_auth');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // When user changes, notify DataContext
  useEffect(() => {
    if (!loading && onAuthChange) {
      onAuthChange(user);
    }
  }, [user, loading, onAuthChange]);

  const login = async (email, password) => {
    // 1. Try demo users first (works even without backend)
    const demoMatch = Object.values(demoUsers).find(
      u => u.email === email && u.password === password
    );
    if (demoMatch) {
      const { password: _pw, ...safeUser } = demoMatch;
      const fakeToken = `demo_${safeUser.id}_${Date.now()}`;
      setUser(safeUser);
      setToken(fakeToken);
      localStorage.setItem('dt_auth', JSON.stringify({ user: safeUser, token: fakeToken }));
      return { success: true, isDemo: true };
    }

    // 2. Try real backend
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err || 'Invalid credentials' };
      }
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('dt_auth', JSON.stringify(data));
      return { success: true, isDemo: false };
    } catch (e) {
      return { success: false, error: 'Cannot reach server. Try demo accounts: arjun@demo.com / demo123' };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err || 'Signup failed' };
      }
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('dt_auth', JSON.stringify(data));
      return { success: true, isNew: true };
    } catch (e) {
      // Offline signup: create a local-only account
      const localUser = { id: `local_${Date.now()}`, name, email, persona: 'New User', avatar: '👤', role: 'user' };
      const fakeToken = `local_${localUser.id}`;
      setUser(localUser);
      setToken(fakeToken);
      localStorage.setItem('dt_auth', JSON.stringify({ user: localUser, token: fakeToken }));
      return { success: true, isNew: true, isOffline: true };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('dt_auth');
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('dt_auth', JSON.stringify({ user: updated, token }));
  };

  const registerAuthCallback = useCallback((cb) => {
    setOnAuthChange(() => cb);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser, registerAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
