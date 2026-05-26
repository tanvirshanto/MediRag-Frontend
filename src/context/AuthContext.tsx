"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin } from "@/lib/api";
import type { AuthUser, LoginRequest, UserRole } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (creds: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function loadStoredAuth(): { user: AuthUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const token = localStorage.getItem("auth_token");
    const raw = localStorage.getItem("auth_user");
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

function clearStoredAuth() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

function decodeRole(token: string): UserRole {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "maintainer" ? "maintainer" : "user";
  } catch {
    return "user";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored.token && stored.user) {
      setToken(stored.token);
      setUser(stored.user);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
      clearStoredAuth();
    };
    window.addEventListener("auth-expired", handler);
    return () => window.removeEventListener("auth-expired", handler);
  }, []);

  const login = useCallback(async (creds: LoginRequest) => {
    const res = await apiLogin(creds);
    const token = res.access_token;
    const role = decodeRole(token);
    const authUser: AuthUser = {
      username: creds.username,
      role,
    };

    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setToken(token);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireRole(...roles: UserRole[]): AuthUser {
  const { user, loading } = useAuth();
  if (loading) throw new Promise(() => {});
  if (!user || !roles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return user;
}
