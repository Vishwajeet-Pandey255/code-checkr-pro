import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, FilePieChart } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { listFaculty } from "@/lib/api/faculty";
import type { Faculty } from "@/types";

export const Route = createFileRoute("/_app/reports")({
  component: () => (
    <RoleGate allow={["admin", "manager"]}>
      <ReportsPage />
    </RoleGate>
  ),
});

function ReportsPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [cycle, setCycle] = useState("Fall2025");
  const [type, setType] = useState("faculty-progress");

  useEffect(() => { listFaculty().then(setFaculty); }, []);

  const exportCsv = () => {
    const header = ["Faculty", "College", "Type", "Allocated", "Evaluated", "Partial", "Rejected", "Pending"];
    const rows = faculty.map((f) => [
      f.name, f.collegeName, f.type, f.allocated, f.evaluated, f.partial, f.rejected, f.pending,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${cycle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const totals = faculty.reduce(
    (acc, f) => ({
      allocated: acc.allocated + f.allocated,
      evaluated: acc.evaluated + f.evaluated,
      partial: acc.partial + f.partial,
      rejected: acc.rejected + f.rejected,
      pending: acc.pending + f.pending,
    }),
    { allocated: 0, evaluated: 0, partial: 0, rejected: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FilePieChart className="h-6 w-6" /> OSM Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate and export evaluation progress reports.
        </p>
      </div>

      <Card className="p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div className="grid gap-1">
          <label className="text-xs font-medium">Report type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="faculty-progress">Faculty Progress</SelectItem>
              <SelectItem value="evaluation-summary">Evaluation Summary</SelectItem>
              <SelectItem value="rejection-report">Rejection Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-medium">Exam cycle</label>
          <Select value={cycle} onValueChange={setCycle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Fall2025">Fall 2025</SelectItem>
              <SelectItem value="Spring2026">Spring 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(totals).map(([k, v]) => (
          <Card key={k} className="p-4">
            <div className="text-xs uppercase text-muted-foreground">{k}</div>
            <div className="text-2xl font-bold">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faculty</TableHead>
              <TableHead>College</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Evaluated</TableHead>
              <TableHead className="text-right">Partial</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.collegeName}</TableCell>
                <TableCell className="text-right">{f.allocated}</TableCell>
                <TableCell className="text-right">{f.evaluated}</TableCell>
                <TableCell className="text-right">{f.partial}</TableCell>
                <TableCell className="text-right">{f.rejected}</TableCell>
                <TableCell className="text-right">{f.pending}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}