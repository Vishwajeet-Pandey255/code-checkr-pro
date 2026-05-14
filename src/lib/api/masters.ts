import type { MasterRecord } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const TABLE_MAP: Record<string, string> = {
  degree: "degrees",
  branch: "branches",
  program: "subjects",
  batch: "semesters",
  semester: "semesters",
  subject: "subjects",
  college: "colleges",
  region: "regions",
  faculty: "faculty_profiles",
  "exam-cycle": "exam_sessions",
  "exam-series": "exam_sessions",
  "question-paper": "question_papers",
  "evaluation-type": "evaluation_rules",
};

function tableFor(name: string): string {
  const t = TABLE_MAP[name];
  if (!t) throw new Error(`Unknown master module: ${name}`);
  return t;
}

export type MasterExtras = Record<string, string | number | boolean | null | undefined>;

type Row = { id: string; code: string; name: string; is_active: boolean } & MasterExtras;

function toRecord(r: Row): MasterRecord & { extras: MasterExtras } {
  const { id, code, name, is_active, ...extras } = r;
  return { id, code, name, active: is_active, extras };
}

export async function listMaster(name: string): Promise<(MasterRecord & { extras: MasterExtras })[]> {
  const table = tableFor(name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toRecord);
}

// Allowed extra columns per table (whitelist; unknown keys are dropped)
const EXTRA_COLS: Record<string, string[]> = {
  faculty_profiles: ["email", "phone", "college_id"],
  question_papers: ["subject_id", "exam_session_id", "total_marks","pdf_url",],
  evaluation_rules: ["title", "body"],
  subjects: ["branch_id", "semester_id", "marking_scheme"],
  branches: ["degree_id"],
  colleges: ["region_id"],
  exam_sessions: ["starts_on", "ends_on"],
};

export async function upsertMaster(
  name: string,
  rec: Partial<MasterRecord> & { extras?: MasterExtras },
): Promise<void> {
  const table = tableFor(name);
  const code = (rec.code ?? "").trim();
  const recName = (rec.name ?? "").trim();
  if (!code) throw new Error("Code is required");
  if (!recName) throw new Error("Name is required");

  const payload: Record<string, unknown> = {
    code,
    name: recName,
    is_active: rec.active ?? true,
  };

  // evaluation_rules requires title + body NOT NULL
  if (table === "evaluation_rules") {
    payload.title = (rec.extras?.title as string) || recName;
    payload.body = (rec.extras?.body as string) || recName;
  }

  const allowed = EXTRA_COLS[table] ?? [];
  for (const k of allowed) {
    const v = rec.extras?.[k];
    if (v === undefined || v === "" || v === null) continue;
    payload[k] = v;
  }

  if (rec.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table as any) as any).update(payload).eq("id", rec.id);
    if (error) throw new Error(error.message);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteMaster(name: string, id: string) {
  const table = tableFor(name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Lightweight reference loader for select dropdowns
export async function listOptions(
  table: string
): Promise<{ id: string; label: string }[]> {

  // SPECIAL CASE FOR QUESTION PAPERS
  if (table === "question_papers") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from(table as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []).map((p: any) => ({
      id: p.id,
      label: `${p.name} (${p.code})`,
    }));
  }

  // DEFAULT FOR OTHER TABLES
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from(table as any) as any)
    .select("id, code, name")
    .order("name");

  if (error) return [];

  return (data ?? []).map(
    (r: { id: string; code: string; name: string }) => ({
      id: r.id,
      label: `${r.name} (${r.code})`,
    })
  );
}

/* =========================================================
   Subject Question Paper + Marking Scheme helpers
========================================================= */

export type MarkingSchemeRow = { q_no: string; max_marks: number; notes?: string };

export type SubjectPaperBundle = {
  questionPaperUrl: string | null;
  markingSchemeUrl: string | null;
  markingScheme: MarkingSchemeRow[];
  questionPaperPath: string | null;
  markingSchemePath: string | null;
};

const PAPER_BUCKET = "answer-scripts";

async function uploadSubjectPdf(
  subjectId: string,
  kind: "qp" | "ms",
  file: File,
): Promise<string> {
  if (!subjectId) throw new Error("Save the subject first, then upload the file.");
  if (file.type !== "application/pdf") throw new Error("Only PDF files are allowed.");
  const path = `subject-papers/${subjectId}/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from(PAPER_BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (upErr) throw new Error(upErr.message);

  const col = kind === "qp" ? "question_paper_url" : "marking_scheme_url";
  const tsCol = kind === "qp" ? "question_paper_uploaded_at" : "marking_scheme_uploaded_at";
  const patch: Record<string, unknown> = { [col]: path, [tsCol]: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("subjects" as any) as any).update(patch).eq("id", subjectId);
  if (error) throw new Error(error.message);
  return path;
}

export async function uploadSubjectQuestionPaper(subjectId: string, file: File) {
  return uploadSubjectPdf(subjectId, "qp", file);
}

export async function uploadSubjectMarkingScheme(subjectId: string, file: File) {
  return uploadSubjectPdf(subjectId, "ms", file);
}

export async function removeSubjectPaper(subjectId: string, kind: "qp" | "ms") {
  const col = kind === "qp" ? "question_paper_url" : "marking_scheme_url";
  const tsCol = kind === "qp" ? "question_paper_uploaded_at" : "marking_scheme_uploaded_at";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase.from("subjects" as any) as any)
    .select(`${col}`).eq("id", subjectId).maybeSingle();
  const path = row?.[col] as string | undefined;
  if (path) {
    await supabase.storage.from(PAPER_BUCKET).remove([path]);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("subjects" as any) as any)
    .update({ [col]: null, [tsCol]: null }).eq("id", subjectId);
  if (error) throw new Error(error.message);
}

export async function saveSubjectMarkingScheme(subjectId: string, rows: MarkingSchemeRow[]) {
  const clean = rows
    .filter((r) => r && r.q_no && String(r.q_no).trim())
    .map((r) => ({
      q_no: String(r.q_no).trim(),
      max_marks: Number(r.max_marks) || 0,
      notes: r.notes ?? "",
    }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("subjects" as any) as any)
    .update({ marking_scheme: clean }).eq("id", subjectId);
  if (error) throw new Error(error.message);
}

export async function getSubjectPaperBundle(subjectId: string): Promise<SubjectPaperBundle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("subjects" as any) as any)
    .select("question_paper_url, marking_scheme_url, marking_scheme")
    .eq("id", subjectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const qpPath = (data?.question_paper_url as string | null) ?? null;
  const msPath = (data?.marking_scheme_url as string | null) ?? null;
  let qpSigned: string | null = null;
  let msSigned: string | null = null;
  if (qpPath) {
    const { data: s } = await supabase.storage.from(PAPER_BUCKET).createSignedUrl(qpPath, 60 * 60);
    qpSigned = s?.signedUrl ?? null;
  }
  if (msPath) {
    const { data: s } = await supabase.storage.from(PAPER_BUCKET).createSignedUrl(msPath, 60 * 60);
    msSigned = s?.signedUrl ?? null;
  }
  const scheme = Array.isArray(data?.marking_scheme) ? (data!.marking_scheme as MarkingSchemeRow[]) : [];
  return {
    questionPaperUrl: qpSigned,
    markingSchemeUrl: msSigned,
    markingScheme: scheme,
    questionPaperPath: qpPath,
    markingSchemePath: msPath,
  };
}
