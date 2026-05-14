export type Role = "admin" | "manager" | "faculty" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  collegeCode?: string;
}

export type ScriptStatus =
  | "pending"
  | "allocated"
  | "in_progress"
  | "partial"
  | "evaluated"
  | "rejected";

export interface QuestionDef {
  id: string;        // e.g. "Q1A"
  parent?: string;   // e.g. "Q1"
  section: "A" | "B" | "C";
  maxMarks: number;
  text: string;
  pageHint?: number;
}

export interface QuestionScore {
  id: string;
  marks: number | null;   // null = not yet marked
  na?: boolean;
  nr?: boolean;
}

export interface AnswerScript {
  id: string;

  studentId: string;
  studentName: string;

  subjectCode: string;
  subjectName: string;
  subjectId?: string;

  examCycle: string;
  examSeries: string;

  totalPages: number;

  pageImages: string[]; // URLs to scan images

  pdfUrl?: string; // answer script PDF URL

  questionPaperUrl?: string; // REAL question paper PDF URL

  facultyId?: string;

  status: ScriptStatus;

  startedAt?: string;

  questions: QuestionDef[];

  scores: QuestionScore[];

  maxMarks: number;
}

export interface Faculty {
  id: string;
  name: string;
  collegeCode: string;
  collegeName: string;
  type: "Internal Faculty" | "External Faculty";
  experience: number;
  evaluated: number;
  allocated: number;
  partial: number;
  rejected: number;
  pending: number;
}

export interface DashboardStats {
  evaluated: number;
  partial: number;
  pending: number;
  allocated: number;
  rejected: number;
}

export interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
}