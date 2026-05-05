import type { AnswerScript, QuestionDef, QuestionScore, ScriptStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const PLACEHOLDER_PAGE = (n: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1100'>
      <rect width='800' height='1100' fill='#fdfcf6'/>
      <text x='40' y='60' font-family='Georgia' font-size='24' fill='#1a1a1a'>Page ${n}</text>
      <text x='40' y='560' font-family='Arial' font-size='18' fill='#888'>(scanned answer page placeholder)</text>
    </svg>`
  )}`;

function mapStatus(s: string): ScriptStatus {
  if (s === "submitted") return "evaluated";
  if (s === "in_progress") return "in_progress";
  if (s === "allocated") return "allocated";
  if (s === "rejected") return "rejected";
  if (s === "pending") return "pending";
  return "pending";
}

export async function getScript(id: string): Promise<AnswerScript> {
  const { data: script, error } = await supabase
    .from("answer_scripts")
    .select("id, script_code, status, assigned_at, paper_id, pdf_url, student_id, subject_id, question_papers(name, code, total_marks), subjects(name, code)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!script) throw new Error("Script not found");

  const { data: questions } = await supabase
    .from("questions")
    .select("id, q_no, parent_id, max_marks, text, section, sort_order")
    .eq("paper_id", script.paper_id)
    .order("sort_order");

  const qs = (questions ?? []) as Array<{
    id: string; q_no: string; parent_id: string | null; max_marks: number; text: string | null; section: string;
  }>;
  const idToQNo = new Map(qs.map((q) => [q.id, q.q_no]));

  const questionDefs: QuestionDef[] = qs.map((q) => ({
    id: q.q_no,
    parent: q.parent_id ? idToQNo.get(q.parent_id) : undefined,
    section: (["A", "B", "C"].includes(q.section) ? q.section : "A") as "A" | "B" | "C",
    maxMarks: Number(q.max_marks),
    text: q.text ?? "",
  }));

  const { data: scoresRows } = await supabase
    .from("script_scores")
    .select("question_id, marks, is_na, is_nr")
    .eq("script_id", id);

  const qNoByQuestionId = new Map(qs.map((q) => [q.id, q.q_no]));
  const scoresByQ = new Map<string, { marks: number | null; na?: boolean; nr?: boolean }>();
  for (const r of scoresRows ?? []) {
    const qno = qNoByQuestionId.get(r.question_id);
    if (qno) scoresByQ.set(qno, { marks: r.marks === null ? null : Number(r.marks), na: r.is_na, nr: r.is_nr });
  }
  const scores: QuestionScore[] = questionDefs.map((q) =>
    scoresByQ.get(q.id) ? { id: q.id, ...scoresByQ.get(q.id)! } : { id: q.id, marks: null }
  );

  const totalPages = 6;
  const paper = (script as unknown as { question_papers: { name: string; code: string; total_marks: number } | null }).question_papers;
  const subj = (script as unknown as { subjects: { name: string; code: string } | null }).subjects;

  return {
    id: script.id,
    studentId: script.student_id ?? "",
    studentName: "Anonymous Candidate",
    subjectCode: subj?.code ?? "",
    subjectName: subj?.name ?? paper?.name ?? "Subject",
    examCycle: "",
    examSeries: script.script_code,
    totalPages,
    pageImages: Array.from({ length: totalPages }, (_, i) => PLACEHOLDER_PAGE(i + 1)),
    status: mapStatus(script.status),
    startedAt: script.assigned_at ?? new Date().toISOString(),
    questions: questionDefs,
    scores,
    maxMarks: questionDefs.reduce((s, q) => s + q.maxMarks, 0) || Number(paper?.total_marks ?? 0),
  };
}

export async function listMyScripts(): Promise<AnswerScript[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("answer_scripts")
    .select("id, script_code, status, assigned_at, question_papers(name), subjects(name, code)")
    .eq("assigned_to", user.id)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => {
    const subj = (s as unknown as { subjects: { name: string; code: string } | null }).subjects;
    const paper = (s as unknown as { question_papers: { name: string } | null }).question_papers;
    return {
      id: s.id,
      studentId: "",
      studentName: "Anonymous",
      subjectCode: subj?.code ?? "",
      subjectName: subj?.name ?? paper?.name ?? "Subject",
      examCycle: "",
      examSeries: s.script_code,
      totalPages: 6,
      pageImages: [],
      status: mapStatus(s.status),
      startedAt: s.assigned_at ?? undefined,
      questions: [],
      scores: [],
      maxMarks: 0,
    };
  });
}

export async function saveScores(scriptId: string, scores: QuestionScore[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Need question UUIDs by q_no. Get paper_id then questions.
  const { data: script } = await supabase.from("answer_scripts").select("paper_id, status").eq("id", scriptId).single();
  if (!script) throw new Error("Script missing");
  const { data: qs } = await supabase.from("questions").select("id, q_no").eq("paper_id", script.paper_id);
  const idByQNo = new Map((qs ?? []).map((q) => [q.q_no, q.id]));

  // Delete existing then insert. Simpler than upsert with composite key.
  await supabase.from("script_scores").delete().eq("script_id", scriptId);
  const rows = scores
    .map((s) => {
      const qid = idByQNo.get(s.id);
      if (!qid) return null;
      return {
        script_id: scriptId,
        question_id: qid,
        marks: s.marks,
        is_na: !!s.na,
        is_nr: !!s.nr,
        evaluated_by: user.id,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (rows.length) {
    const { error } = await supabase.from("script_scores").insert(rows);
    if (error) throw error;
  }

  if (script.status === "allocated") {
    await supabase.from("answer_scripts").update({ status: "in_progress" }).eq("id", scriptId);
  }

  await supabase.from("evaluation_audit").insert({
    script_id: scriptId, actor_id: user.id, action: "save_scores", payload: { count: rows.length },
  });
  return { ok: true };
}

export async function submitScript(scriptId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const total = await calcTotal(scriptId);
  const { error } = await supabase
    .from("answer_scripts")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), total_awarded: total })
    .eq("id", scriptId);
  if (error) throw error;
  await supabase.from("evaluation_audit").insert({
    script_id: scriptId, actor_id: user.id, action: "submit", payload: { total },
  });
  return { ok: true };
}

export async function rejectScript(scriptId: string, reason = "Rejected by faculty") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("script_rejections").insert({ script_id: scriptId, reason, rejected_by: user.id });
  const { error } = await supabase
    .from("answer_scripts")
    .update({ status: "rejected", rejected_reason: reason })
    .eq("id", scriptId);
  if (error) throw error;
  await supabase.from("evaluation_audit").insert({
    script_id: scriptId, actor_id: user.id, action: "reject", payload: { reason },
  });
  return { ok: true };
}

async function calcTotal(scriptId: string): Promise<number> {
  const { data } = await supabase.from("script_scores").select("marks").eq("script_id", scriptId);
  return (data ?? []).reduce((s, r) => s + (r.marks ? Number(r.marks) : 0), 0);
}

export async function getStudentResults(): Promise<AnswerScript[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: stu } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
  if (!stu) return [];
  const { data: scripts } = await supabase
    .from("answer_scripts")
    .select("id")
    .eq("student_id", stu.id)
    .eq("status", "submitted");
  const out: AnswerScript[] = [];
  for (const s of scripts ?? []) out.push(await getScript(s.id));
  return out;
}
