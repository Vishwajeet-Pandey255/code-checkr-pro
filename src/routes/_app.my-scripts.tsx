import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, FileText, ClipboardList, ClipboardCheck, FileWarning,
  CircleSlash, ArrowRight,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { listMyScripts } from "@/lib/api/scripts";
import type { AnswerScript } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/my-scripts")({
  component: () => (
    <RoleGate allow={["faculty"]}>
      <MyScripts />
    </RoleGate>
  ),
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  allocated: { label: "Allocated", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  in_progress: { label: "In Progress", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  partial: { label: "Partial", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  evaluated: { label: "Evaluated", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

function MyScripts() {
  const [scripts, setScripts] = useState<AnswerScript[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    listMyScripts().then(setScripts);
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      total: scripts.length,
      allocated: 0,
      in_progress: 0,
      evaluated: 0,
      partial: 0,
      rejected: 0,
    };
    for (const s of scripts) map[s.status] = (map[s.status] ?? 0) + 1;
    return map;
  }, [scripts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scripts.filter((s) => {
      const matchSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q) ||
        s.subjectCode.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [scripts, search, statusFilter]);

  const completionRate = scripts.length
    ? Math.round((counts.evaluated / scripts.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Allocated Scripts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Scripts assigned to you for evaluation. Click{" "}
          <strong className="text-foreground">Start</strong> /{" "}
          <strong className="text-foreground">Resume</strong> to begin marking.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total"
          value={counts.total}
          icon={FileText}
          tone="primary"
        />
        <StatCard
          label="Allocated"
          value={counts.allocated}
          icon={ClipboardList}
          tone="info"
        />
        <StatCard
          label="In Progress"
          value={counts.in_progress}
          icon={FileWarning}
          tone="warning"
        />
        <StatCard
          label="Evaluated"
          value={counts.evaluated}
          icon={ClipboardCheck}
          tone="success"
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          icon={CircleSlash}
          tone="danger"
        />
      </div>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Completion</div>
          <div className="text-sm font-bold tabular-nums text-primary">{completionRate}%</div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {counts.evaluated} of {counts.total} scripts evaluated
        </p>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, subject…"
              className="h-9 pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="allocated">Allocated</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-24">Script ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Exam Cycle</TableHead>
              <TableHead className="text-right">Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No scripts match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => {
              const meta = STATUS_META[s.status] ?? { label: s.status, cls: "" };
              const cta =
                s.status === "evaluated"
                  ? "View"
                  : s.status === "in_progress" || s.status === "partial"
                    ? "Resume"
                    : "Start";
              return (
                <TableRow key={s.id} className="group">
                  <TableCell className="font-mono text-xs font-medium">#{s.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{s.subjectName}</div>
                    <div className="text-xs text-muted-foreground">{s.subjectCode} · {s.examSeries}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.examCycle}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.totalPages}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] uppercase tracking-wider", meta.cls)} variant="secondary">
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      asChild
                      size="sm"
                      variant={s.status === "evaluated" ? "outline" : "default"}
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <Link to="/evaluate/$scriptId" params={{ scriptId: s.id }}>
                        {cta}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive",
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  tone: "primary" | "info" | "warning" | "success" | "danger";
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2.5">
        <div className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0", TONE_BG[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
            {label}
          </div>
          <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
        </div>
      </div>
    </Card>
  );
}
