import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { demoUsers } from '../data/demoData';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
const AuthContext = createContext(null);

// ─── JWT helpers ─────────────────────────────────────────────────────────────

/** Decode payload from either a real JWT or a legacy dt_jwt_ token. */
function decodeTokenPayload(token) {
  try {
    if (token.startsWith('dt_jwt_')) {
      return JSON.parse(atob(token.replace('dt_jwt_', '')));
    }
    if (token.startsWith('DEMO_SESSION_')) {
      return null; // expiry tracked in localStorage, not in token
    }
    const base64url = token.split('.')[1];
    if (!base64url) return null;
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns true if a real signed JWT is still within its exp claim (exp is in seconds). */
function isRealJwtValid(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return false;
  // Legacy dt_jwt_ stores exp in ms; real JWTs store in seconds
  const expMs = token.startsWith('dt_jwt_') ? payload.exp : payload.exp * 1000;
  return expMs > Date.now();
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [token, setToken]               = useState(null);
  const [isDemo, setIsDemo]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [onAuthChange, setOnAuthChange] = useState(null);

  // Restore session on app load
  useEffect(() => {
    const saved = localStorage.getItem('dt_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const { user: u, token: t, isDemo: d, exp } = parsed;
        if (d) {
          // Demo sessions — validate the local expiry timestamp
          if (!exp || exp > Date.now()) {
            setUser(u); setToken(t); setIsDemo(true);
          } else {
            localStorage.removeItem('dt_auth');
          }
        } else {
          // Real sessions — validate the signed JWT's own exp claim
          if (isRealJwtValid(t)) {
            setUser(u); setToken(t); setIsDemo(false);
          } else {
            localStorage.removeItem('dt_auth');
          }
        }
      } catch {
        localStorage.removeItem('dt_auth');
      }
    }
    setLoading(false);
  }, []);

  // Notify DataContext on auth change
  useEffect(() => {
    if (!loading && onAuthChange) onAuthChange(user);
  }, [user, loading, onAuthChange]);

  // ── Demo login — purely frontend, never touches the backend ──────────────────
  const loginDemo = (email) => {
    const found = Object.values(demoUsers).find(u => u.email === email);
    if (!found) return { success: false, error: 'Demo user not found' };
    // A clearly-named placeholder token; JwtAuthFilter rejects it if it ever reaches the backend
    const demoToken = 'DEMO_SESSION_' + btoa(email);
    const exp = Date.now() + 86400000; // 24 h
    setUser(found); setToken(demoToken); setIsDemo(true);
    localStorage.setItem('dt_auth', JSON.stringify({ user: found, token: demoToken, isDemo: true, exp }));
    return { success: true, isDemo: true };
  };

  // ── Real login — calls backend, receives a signed JWT ───────────────────────
  const loginReal = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || data.message || 'Invalid credentials' };
      const userObj = { id: data.userId, email: data.email, name: data.name, role: 'user', avatar: '👤' };
      setUser(userObj); setToken(data.token); setIsDemo(false);
      localStorage.setItem('dt_auth', JSON.stringify({ user: userObj, token: data.token, isDemo: false }));
      return { success: true, isDemo: false };
    } catch {
      // Backend offline — fall through to localStorage custom users
    }

    return { success: false, error: 'Cannot connect to server. Please ensure the backend is running on port 8080.' };
  };

  // ── Unified login — picks demo or real path automatically ────────────────────
  const login = (email, password) => {
    const demoFound = Object.values(demoUsers).find(
      u => u.email === email && (u.password === password || password === 'demo123')
    );
    if (demoFound) return loginDemo(email);
    // Real login returns a Promise — callers must await or .then()
    return loginReal(email, password);
  };

  // ── Real signup — backend registers user & issues signed JWT ─────────────────
  const signup = async (name, email, password) => {
    if (Object.values(demoUsers).find(u => u.email === email))
      return { success: false, error: 'Email already exists' };

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || data.message || 'Signup failed' };
      const userObj = { id: data.userId, email: data.email, name: data.name, role: 'user', avatar: '👤' };
      setUser(userObj); setToken(data.token); setIsDemo(false);
      localStorage.setItem('dt_auth', JSON.stringify({ user: userObj, token: data.token, isDemo: false }));
      return { success: true, isNew: true };
    } catch {
      // Backend offline — save to localStorage
    }

    return { success: false, error: 'Signup requires the backend (port 8080). Please start the backend server and try again.' };
  };

  const logout = () => {
    setUser(null); setToken(null); setIsDemo(false);
    localStorage.removeItem('dt_auth');
    localStorage.removeItem('dt_custom_users'); // remove any legacy insecure offline user store
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    const saved = JSON.parse(localStorage.getItem('dt_auth') || '{}');
    localStorage.setItem('dt_auth', JSON.stringify({ ...saved, user: updated }));
  };

  const registerAuthCallback = useCallback((cb) => setOnAuthChange(() => cb), []);

  return (
    <AuthContext.Provider value={{ user, token, isDemo, loading, login, signup, logout, updateUser, registerAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
