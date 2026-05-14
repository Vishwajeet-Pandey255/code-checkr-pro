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

// 🔥 YOUR ADMIN EMAIL
const FORCE_ADMIN_EMAIL = "pandeyvishwajeet61@gmail.com";

async function loadUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;

  const uid = session.user.id;
  const email = session.user.email ?? "";

  // get roles from DB
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid);

  const userRoles = (roles ?? []).map((r) => r.role as Role);

  // force correct priority
  let role: Role = "student";

  if (userRoles.includes("admin")) role = "admin";
  else if (userRoles.includes("manager")) role = "manager";
  else if (userRoles.includes("faculty")) role = "faculty";

  return {
    id: uid,
    name: email,
    email,
    role,
    collegeCode: undefined,
  };
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);

      if (sess) {
        setTimeout(async () => {
          const u = await loadUser(sess);
          setUser(u);
        }, 0);
      } else {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);

      const u = await loadUser(data.session);
      setUser(u);

      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
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
    if (!session) return;
    const u = await loadUser(session);
    setUser(u);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        resetPassword,
        logout,
        refreshRoles,
      }}
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