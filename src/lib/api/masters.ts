import type { MasterRecord } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Maps sidebar slug -> Postgres table name
const TABLE_MAP: Record<string, string> = {
  degree: "degrees",
  branch: "branches",
  program: "subjects", // alias
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

type Row = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

function toRecord(r: Row): MasterRecord {
  return { id: r.id, code: r.code, name: r.name, active: r.is_active };
}

export async function listMaster(name: string): Promise<MasterRecord[]> {
  const table = tableFor(name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .select("id, code, name, is_active")
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toRecord);
}

export async function upsertMaster(
  name: string,
  rec: Partial<MasterRecord>,
): Promise<MasterRecord> {
  const table = tableFor(name);
  const payload: Record<string, unknown> = {
    code: rec.code ?? "",
    name: rec.name ?? "",
    is_active: rec.active ?? true,
  };
  if (rec.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table as any) as any)
      .update(payload)
      .eq("id", rec.id)
      .select("id, code, name, is_active")
      .single();
    if (error) throw error;
    return toRecord(data as Row);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .insert(payload)
    .select("id, code, name, is_active")
    .single();
  if (error) throw error;
  return toRecord(data as Row);
}

export async function deleteMaster(name: string, id: string) {
  const table = tableFor(name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}