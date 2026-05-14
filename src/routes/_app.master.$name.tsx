import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { listMaster, upsertMaster, deleteMaster, listOptions, type MasterExtras } from "@/lib/api/masters";
import type { MasterRecord } from "@/types";
import { SubjectPapersEditor } from "@/components/subject-papers-editor";

export const Route = createFileRoute("/_app/master/$name")({
  component: () => (
    <RoleGate allow={["admin", "manager"]}>
      <MasterPage />
    </RoleGate>
  ),
});

const TITLES: Record<string, string> = {
  degree: "Degree", branch: "Branch", program: "Program", batch: "Batch",
  subject: "Subject", college: "College", faculty: "Faculty", region: "Region",
  semester: "Semester", "exam-cycle": "Exam Cycle", "exam-series": "Exam Series",
  "question-paper": "Question Paper", "evaluation-type": "Evaluation Rule",
};

type ExtraField = { key: string; label: string; type: "text" | "number" | "textarea" | "ref"; refTable?: string };
const EXTRA_FIELDS: Record<string, ExtraField[]> = {
  faculty: [
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "college_id", label: "College", type: "ref", refTable: "colleges" },
  ],
  "question-paper": [
    { key: "subject_id", label: "Subject", type: "ref", refTable: "subjects" },
    { key: "exam_session_id", label: "Exam Session", type: "ref", refTable: "exam_sessions" },
    { key: "total_marks", label: "Total marks", type: "number" },
  ],
  "evaluation-type": [
    { key: "title", label: "Title", type: "text" },
    { key: "body", label: "Body / Description", type: "textarea" },
  ],
  subject: [
    { key: "branch_id", label: "Branch", type: "ref", refTable: "branches" },
    { key: "semester_id", label: "Semester", type: "ref", refTable: "semesters" },
  ],
  program: [
    { key: "branch_id", label: "Branch", type: "ref", refTable: "branches" },
    { key: "semester_id", label: "Semester", type: "ref", refTable: "semesters" },
  ],
  branch: [
    { key: "degree_id", label: "Degree", type: "ref", refTable: "degrees" },
  ],
  college: [
    { key: "region_id", label: "Region", type: "ref", refTable: "regions" },
  ],
};

type Editing = Partial<MasterRecord> & { extras?: MasterExtras };

function MasterPage() {
  const { name } = useParams({ from: "/_app/master/$name" });
  const title = TITLES[name] ?? name;
  const fields = EXTRA_FIELDS[name] ?? [];
  const [rows, setRows] = useState<(MasterRecord & { extras: MasterExtras })[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refOptions, setRefOptions] = useState<Record<string, { id: string; label: string }[]>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listMaster(name);
      setRows(r);
    } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [name]);

  useEffect(() => {
    const tables = fields.filter((f) => f.type === "ref" && f.refTable).map((f) => f.refTable!);
    const uniq = Array.from(new Set(tables));
    Promise.all(uniq.map((t) => listOptions(t).then((opts) => [t, opts] as const))).then((pairs) => {
      setRefOptions(Object.fromEntries(pairs));
    });
  }, [name]);

  const onSave = async () => {
    try {
      if (!editing?.code?.trim() || !editing?.name?.trim()) {
        return toast.error("Code and Name are required");
      }
      await upsertMaster(name, editing);
      toast.success(editing.id ? "Updated" : "Created");
      setOpen(false);
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteMaster(name, id);
      toast.success("Deleted");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const setExtra = (k: string, v: string | number) =>
    setEditing((cur) => ({ ...cur, extras: { ...(cur?.extras ?? {}), [k]: v } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title} Master</h1>
          <p className="text-sm text-muted-foreground">
            Manage {title.toLowerCase()} records used across the system.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ active: true, extras: {} })}>
              <Plus className="h-4 w-4 mr-1" /> Add {title}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit" : "Add"} {title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label>Code *</Label>
                <Input
                  value={editing?.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Name *</Label>
                <Input
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              {fields.map((f) => {
                const v = (editing?.extras?.[f.key] ?? "") as string | number;
                if (f.type === "ref") {
                  const opts = refOptions[f.refTable!] ?? [];
                  return (
                    <div key={f.key} className="grid gap-1">
                      <Label>{f.label}</Label>
                      <Select value={String(v || "")} onValueChange={(val) => setExtra(f.key, val)}>
                        <SelectTrigger><SelectValue placeholder={`Select ${f.label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                          {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                          {opts.length === 0 && <div className="p-2 text-xs text-muted-foreground">No records — create one first.</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <div key={f.key} className="grid gap-1">
                      <Label>{f.label}</Label>
                      <Textarea value={String(v)} onChange={(e) => setExtra(f.key, e.target.value)} />
                    </div>
                  );
                }
                return (
                  <div key={f.key} className="grid gap-1">
                    <Label>{f.label}</Label>
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(v)}
                      onChange={(e) => setExtra(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  </div>
                );
              })}
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={editing?.active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
                <Label>Active</Label>
              </div>
              {name === "subject" && (
                <SubjectPapersEditor subjectId={editing?.id} />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing({ id: r.id, code: r.code, name: r.name, active: r.active, extras: r.extras }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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
