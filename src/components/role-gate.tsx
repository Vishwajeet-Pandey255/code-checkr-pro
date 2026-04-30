import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";

export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!allow.includes(user.role))
    return (
      <div className="p-8 text-center text-muted-foreground">
        You don't have access to this section.
      </div>
    );
  return <>{children}</>;
}