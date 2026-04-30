import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ShieldCheck, UserCog, Users } from "lucide-react";
import type { Role } from "@/types";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const ROLES: { role: Role; title: string; desc: string; icon: typeof Users }[] = [
  { role: "admin", title: "Admin", desc: "Full system access", icon: ShieldCheck },
  { role: "manager", title: "Regional Manager", desc: "Allocation & reports", icon: UserCog },
  { role: "faculty", title: "Faculty", desc: "Evaluate answer scripts", icon: Users },
  { role: "student", title: "Student", desc: "View my results", icon: GraduationCap },
];

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<Role | null>(null);
  if (user) return <Navigate to="/" />;
  const signIn = async (role: Role) => {
    setBusy(role);
    await login(role);
    navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">iE</div>
            <div className="text-left">
              <h1 className="text-2xl font-bold">IntelliExams</h1>
              <p className="text-sm text-muted-foreground">Online Script Marking · Copy Checking</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold mt-6">Sign in to continue</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a demo role to explore the system</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(({ role, title, desc, icon: Icon }) => (
            <Card key={role} className="p-5 hover:shadow-lg transition-shadow flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Button className="w-full mt-2" disabled={busy !== null} onClick={() => signIn(role)}>
                {busy === role ? "Signing in…" : "Sign in"}
              </Button>
            </Card>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Frontend-only demo. Wire <code className="px-1 rounded bg-muted">src/lib/api/*</code> to your PHP/CodeIgniter API.
        </p>
      </div>
    </div>
  );
}