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
    const saved = localStorage.getItem('dt_auth');
    if (saved) {
      try {
        const { user: u, token: t } = JSON.parse(saved);
        // Check token expiry
        const payload = JSON.parse(atob(t.replace('dt_jwt_', '')));
        if (payload.exp > Date.now()) {
          setUser(u);
          setToken(t);
        } else {
          localStorage.removeItem('dt_auth');
        }
      } catch {
        localStorage.removeItem('dt_auth');
      }
    }
    setLoading(false);
  }, []);

  // When user changes, notify DataContext
  useEffect(() => {
    if (!loading && onAuthChange) {
      onAuthChange(user);
    }
  }, [user, loading, onAuthChange]);

  const login = (email, password) => {
    const found = Object.values(demoUsers).find(u => u.email === email && (u.password === password || password === 'demo123'));
    if (found) {
      const jwt = 'dt_jwt_' + btoa(JSON.stringify({ id: found.id, email: found.email, exp: Date.now() + 86400000 }));
      setUser(found);
      setToken(jwt);
      localStorage.setItem('dt_auth', JSON.stringify({ user: found, token: jwt }));
      return { success: true, isDemo: true };
    }
    // Custom signup
    const customUsers = JSON.parse(localStorage.getItem('dt_custom_users') || '[]');
    const customFound = customUsers.find(u => u.email === email && u.password === password);
    if (customFound) {
      const jwt = 'dt_jwt_' + btoa(JSON.stringify({ id: customFound.id, email, exp: Date.now() + 86400000 }));
      setUser(customFound);
      setToken(jwt);
      localStorage.setItem('dt_auth', JSON.stringify({ user: customFound, token: jwt }));
      return { success: true, isDemo: false };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const signup = (name, email, password) => {
    const exists = Object.values(demoUsers).find(u => u.email === email);
    const customUsers = JSON.parse(localStorage.getItem('dt_custom_users') || '[]');
    if (exists || customUsers.find(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }
    const newUser = {
      id: 'user-' + Date.now(), name, email, password, avatar: '👤', role: 'user', persona: 'New User',
      health: {},
      finance: {},
      career: {},
      goals: [], timeline: []
    };
    customUsers.push(newUser);
    localStorage.setItem('dt_custom_users', JSON.stringify(customUsers));
    const jwt = 'dt_jwt_' + btoa(JSON.stringify({ id: newUser.id, email, exp: Date.now() + 86400000 }));
    setUser(newUser);
    setToken(jwt);
    localStorage.setItem('dt_auth', JSON.stringify({ user: newUser, token: jwt }));
    return { success: true, isNew: true };
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
