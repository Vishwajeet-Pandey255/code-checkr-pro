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
  question_papers: ["subject_id", "exam_session_id", "total_marks"],
  evaluation_rules: ["title", "body"],
  subjects: ["branch_id", "semester_id"],
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
export async function listOptions(table: string): Promise<{ id: string; label: string }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .select("id, code, name")
    .order("name");
  if (error) return [];
  return (data ?? []).map((r: { id: string; code: string; name: string }) => ({
    id: r.id, label: `${r.name} (${r.code})`,
  }));
}
