import type { Faculty } from "@/types";
import { delay } from "./_mock";

const FACULTY: Faculty[] = [
  { id: "f-shashi", name: "Shashi Karel", collegeCode: "001", collegeName: "ARNI UNIVERSITY", type: "Internal Faculty", experience: 3, evaluated: 0, allocated: 0, partial: 0, rejected: 0, pending: 0 },
  { id: "f-anita", name: "Anita Sharma", collegeCode: "002", collegeName: "DAV COLLEGE", type: "Internal Faculty", experience: 7, evaluated: 12, allocated: 15, partial: 1, rejected: 0, pending: 2 },
  { id: "f-rakesh", name: "Rakesh Mehta", collegeCode: "003", collegeName: "GNDU", type: "External Faculty", experience: 12, evaluated: 8, allocated: 10, partial: 0, rejected: 1, pending: 1 },
  { id: "f-priya", name: "Priya Singh", collegeCode: "004", collegeName: "PU CHANDIGARH", type: "Internal Faculty", experience: 5, evaluated: 5, allocated: 6, partial: 1, rejected: 0, pending: 0 },
  { id: "f-amit", name: "Amit Kumar", collegeCode: "005", collegeName: "LPU", type: "External Faculty", experience: 9, evaluated: 3, allocated: 5, partial: 0, rejected: 0, pending: 2 },
];

export async function listAllocationFaculty(): Promise<Faculty[]> {
  return delay(FACULTY);
}

export async function listFaculty(): Promise<Faculty[]> {
  return delay(FACULTY);
}

export async function allocateScripts(facultyIds: string[]): Promise<{ ok: boolean; allocated: number }> {
  return delay({ ok: true, allocated: facultyIds.length * 5 });
}

export async function bulkUploadScripts(count: number, rule: string) {
  return delay({ uploaded: count, rule, allocated: count }, 800);
}