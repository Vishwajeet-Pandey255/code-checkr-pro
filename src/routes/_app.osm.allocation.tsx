import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { listAllocationFaculty, allocateScripts, bulkUploadScripts } from "@/lib/api/faculty";
import type { Faculty } from "@/types";

export const Route = createFileRoute("/_app/osm/allocation")({
  component: () => (
    <RoleGate allow={["admin", "manager"]}>
      <AllocationPage />
    </RoleGate>
  ),
});

function AllocationPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(20);
  const [rule, setRule] = useState("round-robin");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listAllocationFaculty().then(setFaculty); }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const onAllocate = async () => {
    if (selected.size === 0) return toast.error("Select at least one faculty");
    setBusy(true);
    const r = await allocateScripts([...selected]);
    setBusy(false);
    toast.success(`Allocated ${r.allocated} scripts to ${selected.size} faculty`);
    setSelected(new Set());
  };

  const onBulkUpload = async () => {
    setBusy(true);
    const r = await bulkUploadScripts(count, rule);
    setBusy(false);
    toast.success(`Uploaded ${r.uploaded} scripts · auto-allocated via ${r.rule}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Answer Script Allocation</h1>
        <p className="text-sm text-muted-foreground">
          Bulk upload scanned scripts and distribute them to faculty for evaluation.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Bulk Upload &amp; Auto-Allocate
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-1">
            <Label>Number of scripts</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1">
            <Label>Allocation rule</Label>
            <Select value={rule} onValueChange={setRule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Round-robin</SelectItem>
                <SelectItem value="load-balanced">Load-balanced</SelectItem>
                <SelectItem value="college-match">College match</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={onBulkUpload} disabled={busy} className="w-full">
              <Upload className="h-4 w-4 mr-1" /> Upload &amp; Allocate
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">Manual Allocation</h2>
            <p className="text-xs text-muted-foreground">
              Select faculty rows and allocate the next pending scripts.
            </p>
          </div>
          <Button onClick={onAllocate} disabled={busy || selected.size === 0}>
            <Send className="h-4 w-4 mr-1" /> Allocate to {selected.size} faculty
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Evaluated</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(f.id)}
                    onCheckedChange={() => toggle(f.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.collegeName}</TableCell>
                <TableCell>
                  <Badge variant={f.type === "Internal Faculty" ? "default" : "secondary"}>
                    {f.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{f.allocated}</TableCell>
                <TableCell className="text-right">{f.evaluated}</TableCell>
                <TableCell className="text-right">{f.pending}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}