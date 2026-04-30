import type { MasterRecord } from "@/types";
import { delay, uid } from "./_mock";

const STORE: Record<string, MasterRecord[]> = {
  degree: [
    { id: "1", code: "BTECH", name: "Bachelor of Technology", active: true },
    { id: "2", code: "BCOM", name: "Bachelor of Commerce", active: true },
    { id: "3", code: "MBA", name: "Master of Business Admin", active: true },
  ],
  branch: [
    { id: "1", code: "CSE", name: "Computer Science", active: true },
    { id: "2", code: "ECE", name: "Electronics & Comm.", active: true },
    { id: "3", code: "MECH", name: "Mechanical", active: true },
  ],
  program: [
    { id: "1", code: "BTECH-CSE", name: "B.Tech CSE", active: true },
    { id: "2", code: "BCOM-GEN", name: "B.Com General", active: true },
  ],
  batch: [
    { id: "1", code: "2024-28", name: "Batch 2024-28", active: true },
    { id: "2", code: "2023-27", name: "Batch 2023-27", active: true },
  ],
  subject: [
    { id: "1", code: "DBMS", name: "Database Management Systems", active: true },
    { id: "2", code: "OS", name: "Operating Systems", active: true },
    { id: "3", code: "BCP504", name: "E-Commerce", active: true },
  ],
  college: [
    { id: "1", code: "001", name: "ARNI UNIVERSITY", active: true },
    { id: "2", code: "002", name: "DAV COLLEGE", active: true },
  ],
  faculty: [
    { id: "1", code: "F-001", name: "Shashi Karel", active: true },
    { id: "2", code: "F-002", name: "Anita Sharma", active: true },
  ],
  users: [{ id: "1", code: "admin", name: "Mr. Vinod (Admin)", active: true }],
  "exam-cycle": [
    { id: "1", code: "Fall2025", name: "Fall 2025", active: true },
    { id: "2", code: "Spring2026", name: "Spring 2026", active: true },
  ],
  "exam-series": [{ id: "1", code: "B.COM_05", name: "B.Com Series 5", active: true }],
  "question-paper": [{ id: "1", code: "QP-DBMS-01", name: "DBMS Mid Term", active: true }],
  "evaluation-type": [
    { id: "1", code: "MAIN1", name: "Main Evaluation 1", active: true },
    { id: "2", code: "MAIN2", name: "Main Evaluation 2", active: true },
  ],
};

export async function listMaster(name: string): Promise<MasterRecord[]> {
  return delay(STORE[name] ?? []);
}

export async function upsertMaster(name: string, rec: Partial<MasterRecord>): Promise<MasterRecord> {
  STORE[name] ??= [];
  if (rec.id) {
    const i = STORE[name].findIndex((r) => r.id === rec.id);
    if (i >= 0) STORE[name][i] = { ...STORE[name][i], ...rec } as MasterRecord;
    return delay(STORE[name][i]);
  }
  const created: MasterRecord = {
    id: uid(),
    code: rec.code ?? "",
    name: rec.name ?? "",
    description: rec.description,
    active: rec.active ?? true,
  };
  STORE[name].push(created);
  return delay(created);
}

export async function deleteMaster(name: string, id: string) {
  STORE[name] = (STORE[name] ?? []).filter((r) => r.id !== id);
  return delay({ ok: true });
}