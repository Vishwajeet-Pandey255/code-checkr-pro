import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { listAllocationFaculty, allocateScripts } from "@/lib/api/faculty";
import { uploadScriptPdfs } from "@/lib/api/scripts";
import { listOptions } from "@/lib/api/masters";
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
  const [busy, setBusy] = useState(false);
  const [papers, setPapers] = useState<{ id: string; label: string }[]>([]);
  const [paperId, setPaperId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => listAllocationFaculty().then(setFaculty).catch((e) => toast.error(e.message));
  useEffect(() => {
    refresh();
    listOptions("question_papers").then((opts) => {
      setPapers(opts);
      if (opts[0]) setPaperId(opts[0].id);
    });
  }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const onAllocate = async () => {
    if (selected.size === 0) return toast.error("Select at least one faculty");
    setBusy(true);
    try {
      const r = await allocateScripts([...selected]);
      toast.success(`Allocated ${r.allocated} scripts to ${selected.size} faculty`);
      setSelected(new Set());
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const onUpload = async () => {
    const files = fileRef.current?.files;
    if (!files || !files.length) return toast.error("Choose one or more PDFs");
    if (!paperId) return toast.error("Choose a Question Paper first");
    setBusy(true);
    try {
      const r = await uploadScriptPdfs(Array.from(files), paperId);
      toast.success(`Uploaded ${r.uploaded} script(s)${r.failed ? `, ${r.failed} failed` : ""}`);
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Answer Script Allocation</h1>
        <p className="text-sm text-muted-foreground">
          Upload scanned answer-script PDFs and distribute them to faculty for evaluation.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload Answer-Script PDFs
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-1">
            <Label>Question Paper</Label>
            <Select value={paperId} onValueChange={setPaperId}>
              <SelectTrigger><SelectValue placeholder="Pick a paper" /></SelectTrigger>
              <SelectContent>
                {papers.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                {papers.length === 0 && <div className="p-2 text-xs text-muted-foreground">Create a paper under Masters → Question Paper first.</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Choose PDFs</Label>
            <input ref={fileRef} type="file" accept="application/pdf" multiple
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:bg-muted" />
          </div>
          <div className="flex items-end">
            <Button onClick={onUpload} disabled={busy} className="w-full">
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">Allocate to Faculty</h2>
            <p className="text-xs text-muted-foreground">
              Tick faculty rows and allocate the next pending scripts (round-robin).
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
            {faculty.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                No faculty yet. Add one under Masters → Faculty (link it to a user account to enable allocation).
              </TableCell></TableRow>
            )}
            {faculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggle(f.id)} />
                </TableCell>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="text-muted-foreground">{f.collegeName}</TableCell>
                <TableCell>
                  <Badge variant={f.type === "Internal Faculty" ? "default" : "secondary"}>{f.type}</Badge>
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
