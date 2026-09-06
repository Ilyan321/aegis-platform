"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, fetchCurrentUser, loginUser, registerUser, removeStoredToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, fullName?: string) => {
    const res = await registerUser(email, pass, fullName);
    setUser(res.user);
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
