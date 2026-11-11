import { createClient } from "./supabase/server.ts";
import type { Cover, CoverCount, Staff } from "./types.ts";

export async function getStaff(opts: { includeInactive?: boolean } = {}): Promise<Staff[]> {
  const supabase = await createClient();
  let q = supabase
    .from("staff")
    .select("id, code, name, teaches, active, offer_as_extra, rota_slots(id, staff_id, kind, day, period, option)")
    .order("name");
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Staff[];
}

// Page through results so nothing is cut off at the API's 1000-row limit.
async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await page(offset, offset + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function getCovers(from: string, to: string): Promise<Cover[]> {
  const supabase = await createClient();
  return allRows<Cover>((a, b) =>
    supabase
      .from("covers")
      .select("*")
      .gte("cover_date", from)
      .lte("cover_date", to)
      .order("cover_date")
      .order("period")
      .order("id")
      .range(a, b),
  );
}

/**
 * Who is free on this weekday according to the master timetable.
 * Returns staff_id -> set of "WEEK-PERIOD" keys, e.g. "A-P3".
 */
export async function getTimetableFree(day: number): Promise<Map<string, Set<string>>> {
  const supabase = await createClient();
  const rows = await allRows<{ staff_id: string; week: string; period: string }>((a, b) =>
    supabase
      .from("timetable_free")
      .select("staff_id, week, period")
      .eq("day", day)
      .order("staff_id")
      .order("week")
      .order("period")
      .range(a, b),
  );
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = map.get(r.staff_id) ?? new Set<string>();
    set.add(`${r.week}-${r.period}`);
    map.set(r.staff_id, set);
  }
  return map;
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
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
