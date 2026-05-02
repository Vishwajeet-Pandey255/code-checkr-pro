import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { listMaster, upsertMaster, deleteMaster } from "@/lib/api/masters";
import type { MasterRecord } from "@/types";

export const Route = createFileRoute("/_app/master/$name")({
  component: () => (
    <RoleGate allow={["admin", "manager"]}>
      <MasterPage />
    </RoleGate>
  ),
});

const TITLES: Record<string, string> = {
  degree: "Degree",
  branch: "Branch",
  program: "Program",
  batch: "Batch",
  subject: "Subject",
  college: "College",
  faculty: "Faculty",
  users: "Users",
  "exam-cycle": "Exam Cycle",
  "exam-series": "Exam Series",
  "question-paper": "Question Paper",
  "evaluation-type": "Evaluation Type",
};

function MasterPage() {
  const { name } = useParams({ from: "/_app/master/$name" });
  const title = TITLES[name] ?? name;
  const [rows, setRows] = useState<MasterRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MasterRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listMaster(name).then((r) => {
      setRows(r);
      setLoading(false);
    });
  };
  useEffect(refresh, [name]);

  const onSave = async () => {
    if (!editing?.code || !editing?.name) {
      toast.error("Code and Name are required");
      return;
    }
    await upsertMaster(name, editing);
    toast.success(editing.id ? "Updated" : "Created");
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const onDelete = async (id: string) => {
    await deleteMaster(name, id);
    toast.success("Deleted");
    refresh();
  };

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
            <Button onClick={() => setEditing({ active: true })}>
              <Plus className="h-4 w-4 mr-1" /> Add {title}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit" : "Add"} {title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label>Code</Label>
                <Input
                  value={editing?.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Name</Label>
                <Input
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Description</Label>
                <Input
                  value={editing?.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
                <Label>Active</Label>
              </div>
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
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "default" : "secondary"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setEditing(r); setOpen(true); }}
                  >
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