import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user, logout } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const crumbs = path.split("/").filter(Boolean);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3">
      <SidebarTrigger />
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/">OSM</Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <span className={i === crumbs.length - 1 ? "text-foreground capitalize" : "capitalize"}>
              {decodeURIComponent(c).replace(/-/g, " ")}
            </span>
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium">{user?.name}</span>
          <span className="text-xs uppercase text-muted-foreground">{user?.role}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}