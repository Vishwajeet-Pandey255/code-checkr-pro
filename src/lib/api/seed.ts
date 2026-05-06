import { supabase } from "@/integrations/supabase/client";

/**
 * One-click demo seeder. Idempotent: skips items that already exist by code.
 * Creates: 1 region, 1 college, 1 degree, 1 branch, 1 semester, 1 subject,
 * 1 exam session, 1 question paper with 8 questions, 5 pending answer scripts.
 */
export async function seedDemoData(): Promise<{ summary: string }> {
  const log: string[] = [];

  async function getOrCreate<T extends { id: string }>(
    table: string,
    matchCol: string,
    matchVal: string,
    insert: Record<string, unknown>,
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase.from(table as any) as any;
    const { data: existing } = await sb.select("*").eq(matchCol, matchVal).maybeSingle();
    if (existing) return existing as T;
    const { data, error } = await sb.insert(insert).select("*").single();
    if (error) throw new Error(`${table}: ${error.message}`);
    log.push(`+ ${table}`);
    return data as T;
  }

  const region = await getOrCreate<{ id: string }>("regions", "code", "NORTH", {
    code: "NORTH", name: "North Region",
  });
  const college = await getOrCreate<{ id: string }>("colleges", "code", "DEMO", {
    code: "DEMO", name: "Demo Engineering College", region_id: region.id,
  });
  const degree = await getOrCreate<{ id: string }>("degrees", "code", "BTECH", {
    code: "BTECH", name: "B.Tech",
  });
  const branch = await getOrCreate<{ id: string }>("branches", "code", "CSE", {
    code: "CSE", name: "Computer Science", degree_id: degree.id,
  });
  const sem = await getOrCreate<{ id: string }>("semesters", "code", "SEM5", {
    code: "SEM5", name: "Semester 5",
  });
  const subject = await getOrCreate<{ id: string }>("subjects", "code", "DBMS-501", {
    code: "DBMS-501", name: "Database Management Systems", branch_id: branch.id, semester_id: sem.id,
  });
  const exam = await getOrCreate<{ id: string }>("exam_sessions", "code", "FALL2025", {
    code: "FALL2025", name: "Fall 2025",
  });
  const paper = await getOrCreate<{ id: string }>("question_papers", "code", "DBMS-501-FALL2025", {
    code: "DBMS-501-FALL2025", name: "DBMS End-Sem Fall 2025",
    subject_id: subject.id, exam_session_id: exam.id, total_marks: 60,
  });

  // Seed a faculty profile linked to the current user so allocation can work
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existingFac } = await supabase
      .from("faculty_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!existingFac) {
      const { error } = await supabase.from("faculty_profiles").insert({
        code: `FAC-${user.id.slice(0, 6)}`,
        name: user.email?.split("@")[0] ?? "Demo Faculty",
        email: user.email, college_id: college.id, user_id: user.id,
      });
      if (!error) log.push("+ faculty (you)");
    }
  }

  // Seed questions if none exist for this paper
  const { data: existingQs } = await supabase.from("questions").select("id").eq("paper_id", paper.id).limit(1);
  if (!existingQs?.length) {
    const QS = [
      { q_no: "Q1A", section: "A", max_marks: 3, text: "Explain data independence with example.", sort_order: 1 },
      { q_no: "Q1B", section: "A", max_marks: 3, text: "Differentiate logical vs physical data independence.", sort_order: 2 },
      { q_no: "Q2",  section: "A", max_marks: 6, text: "Define entity, attribute and relationship.", sort_order: 3 },
      { q_no: "Q3",  section: "A", max_marks: 6, text: "Explain normalization up to 3NF.", sort_order: 4 },
      { q_no: "Q4",  section: "B", max_marks: 10, text: "Write SQL examples for inner, left and right joins.", sort_order: 5 },
      { q_no: "Q5",  section: "B", max_marks: 10, text: "ACID properties and concurrency control.", sort_order: 6 },
      { q_no: "Q6",  section: "C", max_marks: 10, text: "Indexing in databases — types and use cases.", sort_order: 7 },
      { q_no: "Q7",  section: "C", max_marks: 12, text: "NoSQL databases — types, when to use, examples.", sort_order: 8 },
    ].map((q) => ({ ...q, paper_id: paper.id }));
    const { error } = await supabase.from("questions").insert(QS);
    if (error) throw new Error(`questions: ${error.message}`);
    log.push(`+ 8 questions`);
  }

  // Seed 5 pending scripts if there are fewer than 5 for this paper
  const { count } = await supabase
    .from("answer_scripts")
    .select("id", { count: "exact", head: true })
    .eq("paper_id", paper.id);
  const needed = Math.max(0, 5 - (count ?? 0));
  if (needed > 0) {
    const scripts = Array.from({ length: needed }, (_, i) => ({
      script_code: `DEMO-${Date.now().toString(36)}-${i + 1}`,
      paper_id: paper.id,
      subject_id: subject.id,
      status: "pending" as const,
    }));
    const { error } = await supabase.from("answer_scripts").insert(scripts);
    if (error) throw new Error(`scripts: ${error.message}`);
    log.push(`+ ${needed} answer scripts`);
  }

  return { summary: log.length ? log.join(", ") : "All demo data already present" };
}
