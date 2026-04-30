import { Link, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap, GitBranch, BookOpen, Layers, BookMarked, Building2,
  CalendarRange, FileQuestion, Users, BarChart3, Settings, ClipboardList,
  ClipboardCheck, FileCheck2, ScrollText, FilePieChart,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";

interface NavItem { title: string; url: string; icon: typeof GraduationCap; roles: Role[]; }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/dashboard", icon: BarChart3, roles: ["admin", "manager"] },
    { title: "My Allocated Scripts", url: "/my-scripts", icon: ClipboardCheck, roles: ["faculty"] },
    { title: "My Results", url: "/results", icon: ScrollText, roles: ["student"] },
  ]},
  { label: "Master Data", items: [
    { title: "Degree", url: "/master/degree", icon: GraduationCap, roles: ["admin"] },
    { title: "Branch", url: "/master/branch", icon: GitBranch, roles: ["admin"] },
    { title: "Program", url: "/master/program", icon: BookOpen, roles: ["admin"] },
    { title: "Batch", url: "/master/batch", icon: Layers, roles: ["admin"] },
    { title: "Subject", url: "/master/subject", icon: BookMarked, roles: ["admin"] },
    { title: "College", url: "/master/college", icon: Building2, roles: ["admin"] },
    { title: "Exam Cycle", url: "/master/exam-cycle", icon: CalendarRange, roles: ["admin"] },
    { title: "Question Paper", url: "/master/question-paper", icon: FileQuestion, roles: ["admin"] },
    { title: "Faculty", url: "/master/faculty", icon: Users, roles: ["admin"] },
    { title: "Users", url: "/master/users", icon: Users, roles: ["admin"] },
  ]},
  { label: "OSM", items: [
    { title: "Evaluation Type", url: "/master/evaluation-type", icon: FileCheck2, roles: ["admin", "manager"] },
    { title: "Allocation", url: "/osm/allocation", icon: ClipboardList, roles: ["admin", "manager"] },
    { title: "Reports", url: "/reports", icon: FilePieChart, roles: ["admin", "manager"] },
  ]},
  { label: "System", items: [
    { title: "Configuration", url: "/master/exam-series", icon: Settings, roles: ["admin"] },
  ]},
];

export function AppSidebar() {
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const role = user?.role;
  if (!role) return null;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">iE</div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">IntelliExams</span>
            <span className="text-[10px] text-sidebar-foreground/60">OSM · Copy Checking</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = path === item.url || path.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.url as string} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}