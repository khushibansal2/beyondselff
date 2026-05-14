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
          const { token: t } = JSON.parse(saved);
          const res = await fetch('http://localhost:8080/api/auth/me', {
            headers: { 'Authorization': `Bearer ${t}` }
          });
          
          if (res.ok) {
            const u = await res.json();
            setUser(u);
            setToken(t);
            localStorage.setItem('dt_auth', JSON.stringify({ user: u, token: t }));
          } else {
            localStorage.removeItem('dt_auth');
          }
        } catch (e) {
          console.error("Auth restore failed:", e);
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
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
      return { success: false, error: 'Network error. Backend down?' };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
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
      return { success: false, error: 'Network error. Backend down?' };
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
