import type { AnswerScript, QuestionDef, QuestionScore } from "@/types";
import { delay } from "./_mock";

const PAGE_SVG = (n: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1100'>
      <rect width='800' height='1100' fill='#fdfcf6'/>
      <text x='40' y='60' font-family='Georgia' font-size='28' fill='#1a1a1a'>Page ${n}</text>
      <g font-family='Comic Sans MS, cursive' font-size='34' fill='#1a3b8c'>
        <text x='60' y='140'>internal level without</text>
        <text x='60' y='200'>effecting the logical or</text>
        <text x='60' y='260'>conceptual level.</text>
        <text x='60' y='340'>Logical data independence is harder to</text>
        <text x='60' y='400'>achieve. In a DBMS environment data is stored</text>
        <text x='60' y='460'>in form of tables, each table is related</text>
        <text x='60' y='520'>to another table in a database, it is</text>
        <text x='60' y='580'>more clean and structured, so finding</text>
        <text x='60' y='640'>data in particular entity is not hard.</text>
      </g>
      <path d='M 60 380 Q 350 420 640 360' stroke='#1f4ed8' stroke-width='3' fill='none'/>
    </svg>`
  )}`;

const QUESTIONS: QuestionDef[] = [
  { id: "Q1A", parent: "Q1", section: "A", maxMarks: 3, text: "(a) Explain why data independence is important in DBMS with suitable example." },
  { id: "Q1B", parent: "Q1", section: "A", maxMarks: 3, text: "(b) Differentiate logical vs physical data independence." },
  { id: "Q2A", parent: "Q2", section: "A", maxMarks: 2, text: "(a) Define entity and attribute." },
  { id: "Q2B", parent: "Q2", section: "A", maxMarks: 2, text: "(b) Give an example of weak entity." },
  { id: "Q2C", parent: "Q2", section: "A", maxMarks: 2, text: "(c) ER diagram for library." },
  { id: "Q3",  section: "A", maxMarks: 6, text: "Explain normalization with examples up to 3NF." },
  { id: "Q4",  section: "A", maxMarks: 6, text: "Difference between DBMS and RDBMS." },
  { id: "Q5",  section: "A", maxMarks: 6, text: "Write SQL for joins with examples." },
  { id: "Q6A", parent: "Q6", section: "B", maxMarks: 3, text: "(a) ACID properties." },
  { id: "Q6B", parent: "Q6", section: "B", maxMarks: 7, text: "(b) Concurrency control techniques." },
  { id: "Q7",  section: "B", maxMarks: 10, text: "Indexing in databases — types and use cases." },
  { id: "Q8A", parent: "Q8", section: "B", maxMarks: 5, text: "(a) Lossless decomposition." },
  { id: "Q8B", parent: "Q8", section: "B", maxMarks: 5, text: "(b) BCNF with example." },
  { id: "Q9A", parent: "Q9", section: "C", maxMarks: 6, text: "(a) Distributed databases." },
  { id: "Q9B", parent: "Q9", section: "C", maxMarks: 10, text: "(b) NoSQL databases — types, when to use." },
];

function makeScript(id: string, status: AnswerScript["status"], filled = false): AnswerScript {
  const seed = id.charCodeAt(0) % 5;
  const scores: QuestionScore[] = QUESTIONS.map((q, i) => ({
    id: q.id,
    marks: filled ? Math.round(q.maxMarks * (0.5 + ((seed + i) % 4) / 10) * 2) / 2 : null,
  }));
  return {
    id,
    studentId: `s-${id}`,
    studentName: "Anonymous Candidate",
    subjectCode: "DBMS",
    subjectName: "DBMS - Database Management Systems",
    examCycle: "Fall2025",
    examSeries: "B.COM_05",
    totalPages: 40,
    pageImages: Array.from({ length: 40 }, (_, i) => PAGE_SVG(i + 1)),
    status,
    startedAt: new Date().toISOString(),
    questions: QUESTIONS,
    scores,
    maxMarks: QUESTIONS.reduce((s, q) => s + q.maxMarks, 0),
  };
}

const SCRIPTS: AnswerScript[] = [
  makeScript("387", "in_progress"),
  makeScript("388", "allocated"),
  makeScript("389", "allocated"),
  makeScript("390", "evaluated", true),
  makeScript("391", "rejected"),
];

export async function getScript(id: string): Promise<AnswerScript> {
  const s = SCRIPTS.find((x) => x.id === id) ?? makeScript(id, "allocated");
  return delay({ ...s }, 200);
}

export async function listMyScripts(): Promise<AnswerScript[]> {
  return delay(SCRIPTS);
}

export async function saveScores(id: string, scores: QuestionScore[]) {
  const s = SCRIPTS.find((x) => x.id === id);
  if (s) s.scores = scores;
  return delay({ ok: true });
}

export async function submitScript(id: string) {
  const s = SCRIPTS.find((x) => x.id === id);
  if (s) s.status = "evaluated";
  return delay({ ok: true });
}

export async function rejectScript(id: string) {
  const s = SCRIPTS.find((x) => x.id === id);
  if (s) s.status = "rejected";
  return delay({ ok: true });
}

export async function getStudentResults(): Promise<AnswerScript[]> {
  return delay([makeScript("390", "evaluated", true)]);
}