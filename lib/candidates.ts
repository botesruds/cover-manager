import type { PeriodKey } from "./schedule.ts";
import type { Cover, CoverCount, Staff } from "./types.ts";

export type CandidateStatus = "covering" | "used" | "available";

export type Candidate = {
  staff: Staff;
  option: number | null; // 1st / 2nd lesson option, null for tutor
  status: CandidateStatus;
  weekCovers: Cover[]; // this week's covers for this person
  yearTotal: number;
  lastDate: string | null;
};

/**
 * Who is on the rota for this weekday + period, and can they be used?
 * The rule: each person covers at most once per week (Monday to Sunday).
 * Available people come first, fewest covers this year first, then the
 * person who covered longest ago.
 */
export function candidatesFor(
  staff: Staff[],
  day: number,
  period: PeriodKey,
  date: string,
  weekCovers: Cover[],
  counts: Map<string, CoverCount>,
): Candidate[] {
  const byStaff = new Map<string, Cover[]>();
  for (const c of weekCovers) {
    const list = byStaff.get(c.staff_id) ?? [];
    list.push(c);
    byStaff.set(c.staff_id, list);
  }

  const out: Candidate[] = [];
  for (const s of staff) {
    const slot = s.rota_slots.find((r) => r.day === day && r.period === period);
    if (!slot) continue;
    const mine = byStaff.get(s.id) ?? [];
    const here = mine.some((c) => c.cover_date === date && c.period === period);
    out.push({
      staff: s,
      option: slot.option,
      status: here ? "covering" : mine.length > 0 ? "used" : "available",
      weekCovers: mine,
      yearTotal: counts.get(s.id)?.total ?? 0,
      lastDate: counts.get(s.id)?.last_date ?? null,
    });
  }

  const rank: Record<CandidateStatus, number> = { covering: 0, available: 1, used: 2 };
  out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.yearTotal - b.yearTotal ||
      (a.lastDate ?? "").localeCompare(b.lastDate ?? "") ||
      (a.option ?? 9) - (b.option ?? 9) ||
      a.staff.name.localeCompare(b.staff.name),
  );
  return out;
}
