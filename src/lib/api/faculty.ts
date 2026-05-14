import type { Faculty } from "@/types";
import { supabase } from "@/integrations/supabase/client";

type FacultyRow = {
  id: string;
  name: string;
  email: string | null;
  code: string;
  is_active: boolean;
  user_id: string | null;
  college_id: string | null;
};

type CollegeRow = {
  id: string;
  name: string;
  code: string;
};

type PendingScriptRow = {
  id: string;
  assigned_to: string | null;
  status: string;
};

async function loadFacultyWithStats(): Promise<Faculty[]> {
  const { data: facs, error } = await supabase
    .from("faculty_profiles")
    .select("id, name, email, code, is_active, user_id, college_id")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  const facultyRows = (facs ?? []) as FacultyRow[];

  const collegeIds = Array.from(
    new Set(
      facultyRows
        .map((f) => f.college_id)
        .filter((x): x is string => !!x),
    ),
  );

  const userIds = Array.from(
    new Set(
      facultyRows
        .map((f) => f.user_id)
        .filter((x): x is string => !!x),
    ),
  );

  let colleges: CollegeRow[] = [];
  if (collegeIds.length > 0) {
    const { data: collegeData, error: collegeError } = await supabase
      .from("colleges")
      .select("id, name, code")
      .in("id", collegeIds);

    if (collegeError) throw collegeError;
    colleges = (collegeData ?? []) as CollegeRow[];
  }

  let scriptRows: PendingScriptRow[] = [];
  if (userIds.length > 0) {
    const { data: scripts, error: scriptError } = await supabase
      .from("answer_scripts")
      .select("id, assigned_to, status")
      .in("assigned_to", userIds);

    if (scriptError) throw scriptError;
    scriptRows = (scripts ?? []) as PendingScriptRow[];
  }

  const collegeById = new Map(colleges.map((c) => [c.id, c]));

  return facultyRows.map((f) => {
    const college = f.college_id ? collegeById.get(f.college_id) : undefined;
    const mine = f.user_id
      ? scriptRows.filter((s) => s.assigned_to === f.user_id)
      : [];

    const countByStatus = (status: string) =>
      mine.filter((s) => s.status === status).length;

    return {
      id: f.id,
      name: f.name,
      collegeCode: college?.code ?? "",
      collegeName: college?.name ?? "—",
      type: "Internal Faculty",
      experience: 0,
      allocated: countByStatus("allocated"),
      evaluated: countByStatus("submitted"),
      partial: countByStatus("in_progress"),
      rejected: countByStatus("rejected"),
      pending: countByStatus("pending") + countByStatus("allocated"),
    };
  });
}

export async function listAllocationFaculty(): Promise<Faculty[]> {
  return loadFacultyWithStats();
}

export async function listFaculty(): Promise<Faculty[]> {
  return loadFacultyWithStats();
}

export async function allocateScripts(
  facultyIds: string[],
): Promise<{ ok: boolean; allocated: number }> {
  if (!facultyIds.length) {
    return { ok: true, allocated: 0 };
  }

  const { data: facs, error: facultyError } = await supabase
    .from("faculty_profiles")
    .select("id, user_id, name")
    .in("id", facultyIds);

  if (facultyError) throw facultyError;

  const selectedFaculty = (facs ?? []) as Array<{
    id: string;
    user_id: string | null;
    name: string;
  }>;

  const userIds = Array.from(
    new Set(
      selectedFaculty
        .map((f) => f.user_id)
        .filter((x): x is string => !!x),
    ),
  );

  if (userIds.length === 0) {
    throw new Error(
      "Selected faculty must be linked to a user account before allocation.",
    );
  }

  const { data: pending, error: pendingError } = await supabase
    .from("answer_scripts")
    .select("id")
    .eq("status", "pending")
    .is("assigned_to", null)
    .order("created_at", { ascending: true });

  if (pendingError) throw pendingError;

  if (!pending || pending.length === 0) {
    return { ok: true, allocated: 0 };
  }

  let allocated = 0;

  for (let i = 0; i < pending.length; i++) {
    const script = pending[i];
    const uid = userIds[i % userIds.length];

    const { error: updateError } = await supabase
      .from("answer_scripts")
      .update({
        assigned_to: uid,
        assigned_at: new Date().toISOString(),
        status: "allocated",
      })
      .eq("id", script.id);

    if (updateError) throw updateError;
    allocated++;
  }

  return { ok: true, allocated };
}

export async function bulkUploadScripts(count: number, rule: string) {
  const { data: papers, error: paperError } = await supabase
    .from("question_papers")
    .select("id, subject_id")
    .eq("is_active", true)
    .limit(1);

  if (paperError) throw paperError;

  const paper = papers?.[0];
  if (!paper) {
    throw new Error("Create a Question Paper first under Masters → Question Paper.");
  }

  const rows = Array.from({ length: count }, (_, i) => ({
    script_code: `SCR-${Date.now().toString(36)}-${i + 1}`,
    paper_id: paper.id,
    subject_id: paper.subject_id,
    status: "pending" as const,
    assigned_to: null,
    assigned_at: null,
  }));

  const { error } = await supabase.from("answer_scripts").insert(rows);
  if (error) throw error;

  return { uploaded: count, rule, allocated: 0 };
}