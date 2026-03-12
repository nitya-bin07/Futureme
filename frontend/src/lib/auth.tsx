'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  letter_credits: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('fm_token');
    const storedUser = localStorage.getItem('fm_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Refresh from server to get latest credits
      authApi.me().then(res => {
        const fresh = res.data.user;
        localStorage.setItem('fm_user', JSON.stringify(fresh));
        setUser(fresh);
      }).catch(() => {});
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      const fresh = res.data.user;
      localStorage.setItem('fm_user', JSON.stringify(fresh));
      setUser(fresh);
    } catch {}
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('fm_token', t);
    localStorage.setItem('fm_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authApi.register({ name, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('fm_token', t);
    localStorage.setItem('fm_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('fm_token');
    localStorage.removeItem('fm_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, refreshUser,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
