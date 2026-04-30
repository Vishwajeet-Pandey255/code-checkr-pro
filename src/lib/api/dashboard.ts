import type { DashboardStats } from "@/types";
import { delay } from "./_mock";

export async function getDashboardStats(): Promise<DashboardStats> {
  return delay({ evaluated: 10, partial: 2, pending: 0, allocated: 28, rejected: 0 });
}

export async function getDateWiseEvaluation() {
  const dates = [
    "2026-03-03","2026-03-10","2026-03-12","2026-04-01","2026-04-06",
    "2026-04-10","2026-04-15","2026-04-20","2026-04-21","2026-04-24","2026-04-29",
  ];
  const counts = [1,1,1,1,1,1,1,2,2,1,1];
  return delay(dates.map((d, i) => ({ date: d, count: counts[i] })));
}

export async function getTimeWiseEvaluation() {
  const data = [0,1,2,3,2,3,1,2,1,2,3,2,1,2].map((c, i) => ({
    hour: `${9 + i}:00`,
    count: c,
  }));
  return delay(data);
}