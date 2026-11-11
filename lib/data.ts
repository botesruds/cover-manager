import { createClient } from "./supabase/server.ts";
import type { Cover, CoverCount, Staff } from "./types.ts";

export async function getStaff(opts: { includeInactive?: boolean } = {}): Promise<Staff[]> {
  const supabase = await createClient();
  let q = supabase
    .from("staff")
    .select("id, code, name, teaches, active, rota_slots(id, staff_id, kind, day, period, option)")
    .order("name");
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Staff[];
}

export async function getCovers(from: string, to: string): Promise<Cover[]> {
  const supabase = await createClient();
  const out: Cover[] = [];
  // Page through so long date ranges are not cut off at the API row limit.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("covers")
      .select("*")
      .gte("cover_date", from)
      .lte("cover_date", to)
      .order("cover_date")
      .order("period")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Cover[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function getCoverCounts(from: string, to: string): Promise<Map<string, CoverCount>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cover_counts", { from_date: from, to_date: to });
  if (error) throw new Error(error.message);
  const map = new Map<string, CoverCount>();
  for (const r of (data ?? []) as CoverCount[]) {
    map.set(r.staff_id, { ...r, total: Number(r.total), weeks: Number(r.weeks) });
  }
  return map;
}

export async function getWeeklyTotals(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("weekly_totals", { from_date: from, to_date: to });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { week: string; total: number; people: number }[]).map((r) => ({
    week: r.week,
    total: Number(r.total),
    people: Number(r.people),
  }));
}

export async function getSessionInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data } = await supabase.from("allowed_users").select("email").limit(1);
  return { user, allowed: (data ?? []).length > 0 };
}
