import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role, User } from "@/types";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const ROLE_PRIORITY: Role[] = ["admin", "manager", "faculty", "student"];

async function loadUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  const uid = session.user.id;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, college_code").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);
  const userRoles = (roles ?? []).map((r) => r.role as Role);
  const role =
    ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? ("student" as Role);
  return {
    id: uid,
    name: profile?.full_name ?? session.user.email ?? "User",
    email: profile?.email ?? session.user.email ?? "",
    role,
    collegeCode: profile?.college_code ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listener FIRST (synchronous state set; defer any supabase calls)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      if (sess) {
        setTimeout(() => {
          loadUser(sess).then(setUser);
        }, 0);
      } else {
        setUser(null);
      }
    });
    // 2. Then fetch existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUser(data.session)
        .then(setUser)
        .finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword: AuthCtx["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    setUser(await loadUser(session));
  };

  return (
    <Ctx.Provider
      value={{ user, session, loading, signIn, signUp, resetPassword, logout, refreshRoles }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}