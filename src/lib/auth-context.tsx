import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "@/types";
import { getStoredUser, login as apiLogin, storeUser } from "@/lib/api/auth";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (role: Role) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const login = async (role: Role) => {
    const u = await apiLogin(role);
    storeUser(u);
    setUser(u);
  };
  const logout = () => {
    storeUser(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}