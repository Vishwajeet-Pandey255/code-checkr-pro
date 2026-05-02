import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Pen, Check, X, HelpCircle,
  Undo2, Info, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RoleGate } from "@/components/role-gate";
import { getScript, saveScores, submitScript, rejectScript } from "@/lib/api/scripts";
import type { AnswerScript, QuestionScore } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/evaluate/$scriptId")({
  component: () => (
    <RoleGate allow={["faculty", "admin"]}>
      <Evaluate />
    </RoleGate>
  ),
});

type Tool = "pen" | "tick" | "cross" | "doubt";

const EVALUATION_RULES = [
  "Every question must be marked, set NA (Not Applicable) or NR (Not Required) before submission.",
  "Marks awarded cannot exceed the maximum marks defined for each question.",
  "Half marks are allowed in steps of 0.5 only.",
  "Use ✓ for correct, ✗ for wrong, ? for doubtful and the pen tool for remarks. No erasing of student content.",
  "Auto-save runs every 60 seconds. Always click Save before closing the window.",
  "Reject only if the script is blank, illegible, or belongs to a different subject — provide a reason.",
  "Once Submitted, the script is locked and forwarded for moderation. Re-evaluation needs admin approval.",
];

function Evaluate() {
  const { scriptId } = Route.useParams();
  const navigate = useNavigate();
  const [script, setScript] = useState<AnswerScript | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [scores, setScores] = useState<QuestionScore[]>([]);
  const [activeQ, setActiveQ] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    getScript(scriptId).then((s) => {
      setScript(s);
      setScores(s.scores);
      const first = s.scores.find((x) => x.marks === null);
      setActiveQ(first?.id ?? s.questions[0].id);
    });
  }, [scriptId]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // ----- auto-save every 60s -----
  useEffect(() => {
    if (!script) return;
    const t = setInterval(() => {
      saveScores(scriptId, scores).then(() => toast.message("Auto-saved"));
    }, 60000);
    return () => clearInterval(t);
  }, [script, scores, scriptId]);

  // ----- prompt rules on first open -----
  useEffect(() => {
    if (script && !acceptedRules) setShowRules(true);
  }, [script, acceptedRules]);

  // ----- annotation canvas -----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
  }, [page, scriptId]);

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    if (tool === "pen") {
      drawingRef.current = true;
      lastRef.current = { x, y };
      return;
    }
    ctx.font = "bold 48px Arial";
    ctx.lineWidth = 4;
    if (tool === "tick") { ctx.strokeStyle = "#16a34a"; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 4, y + 14); ctx.lineTo(x + 18, y - 16); ctx.stroke(); }
    if (tool === "cross") { ctx.strokeStyle = "#dc2626"; ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y - 14); ctx.lineTo(x - 14, y + 14); ctx.stroke(); }
    if (tool === "doubt") { ctx.fillStyle = "#ca8a04"; ctx.fillText("?", x - 10, y + 12); }
  };
  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool !== "pen") return;
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); if (lastRef.current) ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(x, y); ctx.stroke();
    lastRef.current = { x, y };
  };
  const onCanvasMouseUp = () => { drawingRef.current = false; lastRef.current = null; };
  const undoLast = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  // ----- scores -----
  const updateScore = (id: string, patch: Partial<QuestionScore>) => {
    setScores((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const totals = useMemo(() => {
    if (!script) return { obtained: 0, max: 0, answered: 0 };
    let obt = 0, ans = 0;
    for (const sc of scores) {
      if (sc.marks !== null || sc.na || sc.nr) ans++;
      obt += sc.marks ?? 0;
    }
    return { obtained: obt, max: script.maxMarks, answered: ans };
  }, [scores, script]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${ss}`;
  };

  const onSave = async () => {
    await saveScores(scriptId, scores);
    toast.success("Scores saved");
  };

  // Validate submission rules
  const validateSubmit = (): string | null => {
    if (!script) return "Script not loaded";
    if (!acceptedRules) return "Please read and accept the evaluation rules first.";
    const unmarked = scores.filter((s) => s.marks === null && !s.na && !s.nr);
    if (unmarked.length > 0)
      return `${unmarked.length} question(s) not marked: ${unmarked.map((u) => u.id).join(", ")}. Mark them or set NA / NR.`;
    for (const sc of scores) {
      const q = script.questions.find((x) => x.id === sc.id);
      if (!q) continue;
      if (sc.marks !== null) {
        if (sc.marks < 0) return `${q.id}: marks cannot be negative.`;
        if (sc.marks > q.maxMarks) return `${q.id}: exceeds maximum (${q.maxMarks}).`;
        if ((sc.marks * 2) % 1 !== 0) return `${q.id}: only steps of 0.5 are allowed.`;
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validateSubmit();
    if (err) {
      toast.error(err);
      setConfirmSubmit(false);
      return;
    }
    await saveScores(scriptId, scores);
    await submitScript(scriptId);
    toast.success("Submitted for moderation");
    navigate({ to: "/evaluate/$scriptId/summary", params: { scriptId } });
  };
  const onReject = async () => {
    if (rejectReason.trim().length < 10) {
      toast.error("Please provide a rejection reason (min 10 characters).");
      return;
    }
    await rejectScript(scriptId);
    toast.warning(`Script rejected · ${rejectReason}`);
    navigate({ to: "/my-scripts" });
  };

  if (!script) return <p>Loading…</p>;

  const submitError = validateSubmit();

  return (
    <div className="space-y-3">
      {/* Rules banner */}
      {acceptedRules && (
        <Alert className="py-2">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle className="text-sm">Evaluation in progress</AlertTitle>
          <AlertDescription className="text-xs flex items-center gap-2">
            Follow the rules &amp; regulations. Auto-save runs every 60s.
            <button
              className="text-primary underline ml-1"
              onClick={() => setShowRules(true)}
            >
              View rules
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Top bar */}
      <Card className="p-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span><span className="text-muted-foreground">Subject:</span> <strong>{script.subjectName}</strong></span>
        <span><span className="text-muted-foreground">Start:</span> {new Date(script.startedAt!).toLocaleString()}</span>
        <span><span className="text-muted-foreground">Time:</span> <strong>{fmtTime(elapsed)}</strong></span>
        <span><span className="text-muted-foreground">Pages:</span> {script.totalPages}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowRules(true)}>
            <Info className="h-4 w-4 mr-1" /> Rules
          </Button>
          <Button size="sm" variant="secondary">Question Paper</Button>
          <Button size="sm" variant="secondary">Answer Key</Button>
          <Button size="sm" onClick={onSave}>Save</Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        {/* Left: page viewer */}
        <Card className="p-3 flex flex-col">
          <div className="flex items-center gap-1 border-b pb-2 mb-2">
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="mx-2 h-5 w-px bg-border" />
            {([
              ["tick", Check, "text-green-600"],
              ["cross", X, "text-red-600"],
              ["pen", Pen, "text-blue-600"],
              ["doubt", HelpCircle, "text-yellow-600"],
            ] as const).map(([t, Icon, color]) => (
              <Button
                key={t}
                size="icon"
                variant={tool === t ? "default" : "ghost"}
                onClick={() => setTool(t as Tool)}
              >
                <Icon className={cn("h-4 w-4", tool !== t && color)} />
              </Button>
            ))}
            <Button size="icon" variant="ghost" onClick={undoLast}><Undo2 className="h-4 w-4" /></Button>
            <span className="ml-auto flex items-center gap-2 text-sm">
              <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span>Page {page} / {script.totalPages}</span>
              <Button size="icon" variant="ghost" disabled={page >= script.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </span>
          </div>
          <div className="flex-1 overflow-auto bg-muted/40 rounded p-4 flex items-start justify-center">
            <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <img src={script.pageImages[page - 1]} alt={`Page ${page}`} className="block max-w-[640px] shadow-md" />
              <canvas
                ref={canvasRef}
                width={800}
                height={1100}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
                onMouseLeave={onCanvasMouseUp}
              />
            </div>
          </div>
        </Card>

        {/* Right: marking pane */}
        <Card className="p-3 flex flex-col">
          <div className="flex items-center justify-between text-sm bg-muted px-3 py-2 rounded">
            <span>Marks: <strong>{totals.obtained} / {totals.max}</strong></span>
            <span>Questions: <strong>{totals.answered} / {script.questions.length}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {script.questions.map((q) => {
              const sc = scores.find((s) => s.id === q.id)!;
              const isActive = activeQ === q.id;
              const overMax = sc.marks !== null && sc.marks > q.maxMarks;
              const halfStepBad = sc.marks !== null && (sc.marks * 2) % 1 !== 0;
              const invalid = overMax || halfStepBad;
              return (
                <div
                  key={q.id}
                  className={cn(
                    "border rounded p-2 flex items-center gap-2 cursor-pointer text-xs",
                    isActive && "border-primary bg-accent/40",
                    invalid && "border-destructive bg-destructive/5",
                    sc.na && "bg-muted/60",
                    sc.nr && "bg-muted/60",
                  )}
                  onClick={() => setActiveQ(q.id)}
                >
                  <span className="font-medium w-10">{q.id}</span>
                  <Input
                    className="h-7 px-2 text-sm"
                    value={sc.marks ?? ""}
                    disabled={sc.na || sc.nr}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateScore(q.id, {
                        marks: v === "" ? null : Math.min(Number(v), q.maxMarks),
                        na: false,
                        nr: false,
                      });
                    }}
                    placeholder="—"
                    type="number"
                    step="0.5"
                    min={0}
                    max={q.maxMarks}
                  />
                  <span className="text-muted-foreground">/ {q.maxMarks}</span>
                  <div className="flex flex-col gap-0.5 ml-auto">
                    <button
                      className={cn(
                        "text-[9px] leading-none px-1 py-0.5 rounded border",
                        sc.na ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateScore(q.id, { na: !sc.na, nr: false, marks: null });
                      }}
                    >
                      NA
                    </button>
                    <button
                      className={cn(
                        "text-[9px] leading-none px-1 py-0.5 rounded border",
                        sc.nr ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateScore(q.id, { nr: !sc.nr, na: false, marks: null });
                      }}
                    >
                      NR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
            <span>NA: Not Applicable</span>
            <span>NR: Not Required</span>
            <span>Step: 0.5</span>
          </div>

          {submitError && (
            <Alert variant="destructive" className="mt-2 py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              className="flex-1"
              disabled={!!submitError}
              onClick={() => setConfirmSubmit(true)}
            >
              Submit
            </Button>
            <Button className="flex-1" variant="destructive" onClick={() => setConfirmReject(true)}>Reject</Button>
          </div>

          {activeQ && (
            <Card className="p-3 mt-3 text-xs bg-muted/30">
              <div className="flex items-start justify-between gap-2">
                <p>{script.questions.find((q) => q.id === activeQ)?.text}</p>
                <button className="text-muted-foreground" onClick={() => setActiveQ(null)}>✕</button>
              </div>
              <button className="text-primary text-xs mt-1">view…</button>
            </Card>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Input placeholder="Enter page number" type="number" min={1} max={script.totalPages}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number((e.target as HTMLInputElement).value);
                  if (n >= 1 && n <= script.totalPages) setPage(n);
                }
              }}
            />
            <Button variant="secondary" size="sm">Go</Button>
          </div>
        </Card>
      </div>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit evaluation?</DialogTitle>
            <DialogDescription>
              You scored {totals.obtained} / {totals.max}. This will mark the script as evaluated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Cancel</Button>
            <Button onClick={onSubmit}>Confirm Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReject} onOpenChange={setConfirmReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this script?</DialogTitle>
            <DialogDescription>
              The script will be returned for re-allocation. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Reason for rejection</label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Blank script / Wrong subject / Illegible handwriting"
            />
            <p className="text-[11px] text-muted-foreground">
              Minimum 10 characters. This is logged in the audit trail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules & regulations dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Evaluation Rules &amp; Regulations
            </DialogTitle>
            <DialogDescription>
              Please read carefully. By accepting, you confirm you will follow the
              IntelliExams Copy-Checking guidelines.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {EVALUATION_RULES.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">Confidential</Badge>
            <Badge variant="secondary">Audit-logged</Badge>
            <Badge variant="secondary">Auto-save 60s</Badge>
          </div>
          <DialogFooter>
            {!acceptedRules ? (
              <Button
                onClick={() => {
                  setAcceptedRules(true);
                  setShowRules(false);
                  toast.success("Rules accepted. You may begin evaluation.");
                }}
              >
                I have read &amp; accept
              </Button>
            ) : (
              <Button onClick={() => setShowRules(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}