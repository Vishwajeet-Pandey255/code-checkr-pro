import type { Faculty } from "@/types";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  name: string;
  email: string | null;
  code: string;
  is_active: boolean;
  user_id: string | null;
  college_id: string | null;
  colleges: { name: string; code: string } | null;
};

async function loadFacultyWithStats(): Promise<Faculty[]> {
  const { data: facs, error } = await supabase
    .from("faculty_profiles")
    .select("id, name, email, code, is_active, user_id, college_id, colleges(name, code)")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;

  const userIds = (facs ?? []).map((f) => f.user_id).filter((x): x is string => !!x);
  let scriptRows: { assigned_to: string | null; status: string }[] = [];
  if (userIds.length) {
    const { data: scripts } = await supabase
      .from("answer_scripts")
      .select("assigned_to, status")
      .in("assigned_to", userIds);
    scriptRows = scripts ?? [];
  }

  return (facs as Row[] ?? []).map((f) => {
    const mine = scriptRows.filter((s) => s.assigned_to === f.user_id);
    const by = (st: string) => mine.filter((s) => s.status === st).length;
    return {
      id: f.id,
      name: f.name,
      collegeCode: f.colleges?.code ?? "",
      collegeName: f.colleges?.name ?? "—",
      type: "Internal Faculty",
      experience: 0,
      allocated: mine.length,
      evaluated: by("submitted"),
      partial: by("in_progress"),
      rejected: by("rejected"),
      pending: by("allocated") + by("pending"),
    };
  });
}

export async function listAllocationFaculty(): Promise<Faculty[]> {
  return loadFacultyWithStats();
}
export async function listFaculty(): Promise<Faculty[]> {
  return loadFacultyWithStats();
}

export async function allocateScripts(facultyIds: string[]): Promise<{ ok: boolean; allocated: number }> {
  // Map faculty_profile.id -> user_id
  const { data: facs, error: fe } = await supabase
    .from("faculty_profiles")
    .select("id, user_id")
    .in("id", facultyIds);
  if (fe) throw fe;
  const userIds = (facs ?? []).map((f) => f.user_id).filter((x): x is string => !!x);
  if (userIds.length === 0) return { ok: true, allocated: 0 };

  // Pull next pending scripts (round-robin)
  const { data: pending, error: pe } = await supabase
    .from("answer_scripts")
    .select("id")
    .eq("status", "pending")
    .is("assigned_to", null)
    .limit(userIds.length * 5);
  if (pe) throw pe;

  let allocated = 0;
  for (let i = 0; i < (pending ?? []).length; i++) {
    const row = pending![i];
    const uid = userIds[i % userIds.length];
    const { error } = await supabase
      .from("answer_scripts")
      .update({ assigned_to: uid, assigned_at: new Date().toISOString(), status: "allocated" })
      .eq("id", row.id);
    if (!error) allocated++;
  }
  return { ok: true, allocated };
}

export async function bulkUploadScripts(count: number, rule: string) {
  // Find first active paper, then create N pending scripts
  const { data: papers } = await supabase
    .from("question_papers")
    .select("id, subject_id")
    .eq("is_active", true)
    .limit(1);
  const paper = papers?.[0];
  if (!paper) throw new Error("Create a Question Paper first under Masters → Question Paper.");

  const rows = Array.from({ length: count }, (_, i) => ({
    script_code: `SCR-${Date.now().toString(36)}-${i + 1}`,
    paper_id: paper.id,
    subject_id: paper.subject_id,
    status: "pending" as const,
  }));
  const { error } = await supabase.from("answer_scripts").insert(rows);
  if (error) throw error;
  return { uploaded: count, rule, allocated: 0 };
}
