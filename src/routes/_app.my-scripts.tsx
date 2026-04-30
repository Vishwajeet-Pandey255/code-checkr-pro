import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleGate } from "@/components/role-gate";
import { listMyScripts } from "@/lib/api/scripts";
import type { AnswerScript } from "@/types";

export const Route = createFileRoute("/_app/my-scripts")({
  component: () => (<RoleGate allow={["faculty"]}><MyScripts /></RoleGate>),
});

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  allocated: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  partial: "bg-orange-100 text-orange-800",
  evaluated: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function MyScripts() {
  const [scripts, setScripts] = useState<AnswerScript[]>([]);
  useEffect(() => { listMyScripts().then(setScripts); }, []);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Allocated Scripts</h1>
        <p className="text-sm text-muted-foreground">Scripts assigned to you for evaluation</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Script ID</TableHead><TableHead>Subject</TableHead>
              <TableHead>Exam Cycle</TableHead><TableHead>Pages</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scripts.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">#{s.id}</TableCell>
                <TableCell>{s.subjectName}</TableCell>
                <TableCell>{s.examCycle}</TableCell>
                <TableCell>{s.totalPages}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLOR[s.status] ?? ""} variant="secondary">{s.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant={s.status === "evaluated" ? "outline" : "default"}>
                    <Link to="/evaluate/$scriptId" params={{ scriptId: s.id }}>
                      {s.status === "evaluated" ? "View" : s.status === "in_progress" ? "Resume" : "Start"}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}