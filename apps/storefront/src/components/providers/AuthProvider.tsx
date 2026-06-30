"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Cookies from "js-cookie";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; googleClientId?: string }> = ({ 
  children, 
  googleClientId = "PLACEHOLDER_GOOGLE_CLIENT_ID" 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = Cookies.get("auth_token");
    const storedUser = localStorage.getItem("user");

    if (savedToken && storedUser && storedUser !== "undefined") {
      try {
        setToken(savedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const logout = React.useCallback(() => {
    Cookies.remove("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    window.location.href = "/sign-in";
  }, []);

  const getToken = React.useCallback(async () => {
    return Cookies.get("auth_token") || null;
  }, []);

  const value = {
    user,
    token,
    loading,
    logout,
    isAuthenticated: !!user,
    getToken,
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
