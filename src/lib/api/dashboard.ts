import type { DashboardStats } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from("answer_scripts")
    .select("status");
  if (error) throw error;
  const counts = { evaluated: 0, partial: 0, pending: 0, allocated: 0, rejected: 0 };
  for (const r of data ?? []) {
    const s = r.status as string;
    if (s === "in_progress") counts.partial++;
    else if (s === "submitted" || s === "evaluated") counts.evaluated++;
    else if (s in counts) (counts as Record<string, number>)[s]++;
  }
  return counts;
}

export async function getDateWiseEvaluation() {
  const { data, error } = await supabase
    .from("answer_scripts")
    .select("submitted_at")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const d = new Date(r.submitted_at as string).toISOString().slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getTimeWiseEvaluation() {
  const { data, error } = await supabase
    .from("answer_scripts")
    .select("submitted_at")
    .not("submitted_at", "is", null);
  if (error) throw error;
  const buckets = new Array(24).fill(0);
  for (const r of data ?? []) {
    const h = new Date(r.submitted_at as string).getHours();
    buckets[h]++;
  }
  return buckets.map((count, h) => ({ hour: `${h}:00`, count })).filter((_, h) => h >= 8 && h <= 22);
}
