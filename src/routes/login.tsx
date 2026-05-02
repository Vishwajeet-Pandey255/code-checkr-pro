import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, ShieldCheck, UserCog, Users, ChevronRight,
  CheckCircle2, BarChart3, ClipboardList, FileCheck2, Sparkles,
} from "lucide-react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

interface RoleOption {
  role: Role;
  title: string;
  desc: string;
  icon: typeof Users;
  features: string[];
}

const ROLES: RoleOption[] = [
  {
    role: "admin",
    title: "Admin",
    desc: "Full system access",
    icon: ShieldCheck,
    features: ["Master data", "Configuration", "User management"],
  },
  {
    role: "manager",
    title: "Regional Manager",
    desc: "Allocation & reports",
    icon: UserCog,
    features: ["Script allocation", "Faculty oversight", "OSM reports"],
  },
  {
    role: "faculty",
    title: "Faculty",
    desc: "Evaluate answer scripts",
    icon: Users,
    features: ["Mark scripts", "Auto-save", "Submit & reject"],
  },
  {
    role: "student",
    title: "Student",
    desc: "View my results",
    icon: GraduationCap,
    features: ["View results", "Track progress", "Section breakdown"],
  },
];

const HIGHLIGHTS = [
  { icon: ClipboardList, text: "Centralized answer-script allocation" },
  { icon: FileCheck2, text: "Annotated on-screen evaluation with audit trail" },
  { icon: BarChart3, text: "Real-time dashboards & date/time analytics" },
  { icon: ShieldCheck, text: "Role-based access · auto-save · rule-driven submission" },
];

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<Role | null>(null);
  const [hovered, setHovered] = useState<Role | null>(null);

  if (user) return <Navigate to="/" />;

  const signIn = async (role: Role) => {
    setBusy(role);
    await login(role);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col bg-sidebar text-sidebar-foreground p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xl shadow-lg shadow-primary/30">
            iE
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">IntelliEXAMS</div>
            <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
              AI Ready · Online Script Marking
            </div>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-md py-10">
          <Badge
            variant="secondary"
            className="mb-5 w-fit bg-primary/15 text-primary border-primary/20 hover:bg-primary/15"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Copy Checking Suite
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance">
            The fastest way to evaluate &amp; moderate university answer scripts.
          </h1>
          <p className="mt-4 text-sidebar-foreground/70 leading-relaxed">
            Allocate, mark and publish results across colleges from one secure
            workspace. Built for examination cells, regional managers and faculty.
          </p>

          <ul className="mt-7 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-start gap-3 text-sm">
                <span className="h-7 w-7 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <h.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sidebar-foreground/85 leading-relaxed pt-0.5">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 pt-6 border-t border-sidebar-border/50">
          <Stat label="Universities" value="40+" />
          <Stat label="Scripts /mo" value="120K" />
          <Stat label="Avg accuracy" value="99.2%" />
        </div>
      </aside>

      {/* Right: sign-in */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
              iE
            </div>
            <div>
              <div className="font-bold tracking-tight">IntelliEXAMS</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                OSM · Copy Checking
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a role to enter the demo workspace
            </p>
          </div>

          <div className="space-y-2.5">
            {ROLES.map(({ role, title, desc, icon: Icon, features }) => {
              const isHovered = hovered === role;
              const isBusy = busy === role;
              return (
                <Card
                  key={role}
                  className={cn(
                    "p-4 cursor-pointer transition-all border-2",
                    isHovered ? "border-primary shadow-md shadow-primary/10" : "border-transparent",
                  )}
                  onMouseEnter={() => setHovered(role)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !busy && signIn(role)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-md flex items-center justify-center shrink-0 transition-colors",
                        isHovered ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-none">{title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={isHovered ? "default" : "outline"}
                      disabled={busy !== null}
                      className="shrink-0"
                    >
                      {isBusy ? "Signing in…" : "Sign in"}
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "grid grid-cols-3 gap-1.5 mt-3 transition-all overflow-hidden",
                      isHovered ? "max-h-20 opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    {features.map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-1 truncate"
                      >
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-7">
            Demo workspace · Wire{" "}
            <code className="px-1 rounded bg-muted text-foreground/80">src/lib/api/*</code> to your
            backend.
          </p>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 mt-0.5">
        {label}
      </div>
    </div>
  );
}
