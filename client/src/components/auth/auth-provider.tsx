"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken } from "@/lib/api";
import type { AuthUser, LoginResponse, Role } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isOwner: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<AuthUser>("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const data = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = React.useCallback(() => {
    clearToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isOwner: user?.role === ("OWNER" satisfies Role),
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
