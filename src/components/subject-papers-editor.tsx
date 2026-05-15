import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Upload, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import {
  uploadOwnerQuestionPaper,
  uploadOwnerMarkingScheme,
  removeOwnerPaper,
  saveOwnerMarkingScheme,
  getOwnerPaperBundle,
  type MarkingSchemeRow,
} from "@/lib/api/masters";

type Owner = "subject" | "paper";

export function SubjectPapersEditor({
  subjectId,
  owner = "subject",
  ownerId,
}: {
  subjectId?: string;
  owner?: Owner;
  ownerId?: string;
}) {
  const id = ownerId ?? subjectId;
  const [qpUrl, setQpUrl] = useState<string | null>(null);
  const [msUrl, setMsUrl] = useState<string | null>(null);
  const [qpPath, setQpPath] = useState<string | null>(null);
  const [msPath, setMsPath] = useState<string | null>(null);
  const [scheme, setScheme] = useState<MarkingSchemeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const qpRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const b = await getOwnerPaperBundle(owner, id);
      setQpUrl(b.questionPaperUrl);
      setMsUrl(b.markingSchemeUrl);
      setQpPath(b.questionPaperPath);
      setMsPath(b.markingSchemePath);
      setScheme(b.markingScheme);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [id, owner]);

  if (!id) {
    return (
      <Card className="p-3 text-xs text-muted-foreground">
        Save the record first to enable Question Paper & Marking Scheme uploads.
      </Card>
    );
  }

  const onUpload = async (kind: "qp" | "ms", file: File) => {
    try {
      if (kind === "qp") await uploadOwnerQuestionPaper(owner, id, file);
      else await uploadOwnerMarkingScheme(owner, id, file);
      toast.success("Uploaded");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onRemove = async (kind: "qp" | "ms") => {
    try {
      await removeOwnerPaper(owner, id, kind);
      toast.success("Removed");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onSaveScheme = async () => {
    try {
      await saveOwnerMarkingScheme(owner, id, scheme);
      toast.success("Marking scheme saved");
    } catch (e) { toast.error((e as Error).message); }
  };

  const updateRow = (i: number, patch: Partial<MarkingSchemeRow>) =>
    setScheme((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3 border rounded p-3 bg-muted/20">
      <div className="text-sm font-semibold">Question Paper & Marking Scheme</div>

      {/* QP */}
      <div className="grid gap-2">
        <Label className="text-xs">Question Paper (PDF)</Label>
        <div className="flex items-center gap-2">
          <input ref={qpRef} type="file" accept="application/pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload("qp", f); e.target.value = ""; }} />
          <Button type="button" size="sm" variant="outline" onClick={() => qpRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> {qpPath ? "Replace" : "Upload"}
          </Button>
          {qpUrl && (
            <a href={qpUrl} target="_blank" rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> View
            </a>
          )}
          {qpPath && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onRemove("qp")}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {!qpPath && <span className="text-xs text-muted-foreground">No file</span>}
        </div>
      </div>

      {/* MS PDF */}
      <div className="grid gap-2">
        <Label className="text-xs">Marking Scheme (PDF)</Label>
        <div className="flex items-center gap-2">
          <input ref={msRef} type="file" accept="application/pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload("ms", f); e.target.value = ""; }} />
          <Button type="button" size="sm" variant="outline" onClick={() => msRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> {msPath ? "Replace" : "Upload"}
          </Button>
          {msUrl && (
            <a href={msUrl} target="_blank" rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> View
            </a>
          )}
          {msPath && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onRemove("ms")}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {!msPath && <span className="text-xs text-muted-foreground">No file</span>}
        </div>
      </div>

      {/* Structured scheme */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Per-Question Marking Scheme</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline"
              onClick={() => setScheme((s) => [...s, { q_no: "", max_marks: 0, notes: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add row
            </Button>
            <Button type="button" size="sm" onClick={onSaveScheme}>Save scheme</Button>
          </div>
        </div>
        {scheme.length === 0 && (
          <p className="text-xs text-muted-foreground">No rows yet. Click "Add row" to define max marks per question.</p>
        )}
        {scheme.map((r, i) => (
          <div key={i} className="grid grid-cols-[80px_90px_1fr_auto] gap-2 items-center">
            <Input className="h-8 text-xs" placeholder="Q No" value={r.q_no}
              onChange={(e) => updateRow(i, { q_no: e.target.value })} />
            <Input className="h-8 text-xs" type="number" step="0.5" placeholder="Max" value={r.max_marks}
              onChange={(e) => updateRow(i, { max_marks: Number(e.target.value) })} />
            <Input className="h-8 text-xs" placeholder="Notes (optional)" value={r.notes ?? ""}
              onChange={(e) => updateRow(i, { notes: e.target.value })} />
            <Button type="button" size="icon" variant="ghost"
              onClick={() => setScheme((s) => s.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}