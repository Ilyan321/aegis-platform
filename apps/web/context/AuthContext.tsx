"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, fetchCurrentUser, loginUser, registerUser, logoutUser } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
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

    // Cross-tab session sync: listen for storage modifications
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "aegis_auth_token") {
        if (!e.newValue) {
          setUser(null);
        } else {
          refreshUser();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, fullName?: string) => {
    const res = await registerUser(email, pass, fullName);
    setUser(res.user);
  };

  const logout = async () => {
    setUser(null);
    await logoutUser();
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
