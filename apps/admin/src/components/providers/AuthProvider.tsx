"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = () =>
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005/api/v1')
    .replace(/\/api\/v1\/?$/, '') + '/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const headers: Record<string, string> = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE()}/auth/me`, {
          credentials: 'include',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const tk = storedToken || data.access_token;
          setToken(tk);
          setUser(data.user);
        } else {
          localStorage.removeItem('admin_token');
          setToken(null);
          setUser(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Auth: Could not verify session with server', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const response = await fetch(`${API_BASE()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Invalid credentials');
    }

    const data = await response.json();

    // Positive allowlist: Only allow specific high-privilege roles
    if (data.user.role !== 'SUPER_ADMIN' && data.user.role !== 'ADMIN' && data.user.role !== 'MANAGER') {
      throw new Error('Unauthorized: Admin or Manager access required');
    }

    // Store token in localStorage as Bearer fallback (works across ports in dev)
    localStorage.setItem('admin_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);

    router.push('/');
    router.refresh();
  };

  const logout = async () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);

    try {
      await fetch(`${API_BASE()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.error('Logout request failed');
    }

    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AuthProvider');
  }
  return context;
}
