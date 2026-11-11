import { cellText } from "./rota-parse.ts";
import type { PeriodKey } from "./schedule.ts";

export type WeekLetter = "A" | "B";

export type TimetableStaff = {
  code: string;
  name: string;
  lessons: number; // timetabled lessons across Week A and Week B
  /** Free slots as "day-period" (e.g. "3-P2"), per week. */
  free: Record<WeekLetter, string[]>;
};

const DAYS: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };

/** Codes in the timetable that are not people: study periods, placeholder teachers, departments. */
const NOT_A_PERSON = /study|teacher|department|departme/i;

/**
 * Read the TimeTabler "Staff Timetable" export.
 * Row 1 holds the day headings ("AMon", "BTue"...), row 2 the periods
 * ("Y03-13 P1", "Y07-13 R1"...). R1/R2 are the tutor sessions (Tutor A/B).
 * Each later row is one staff code; a blank cell means free. The legend at
 * the bottom ("CAN - Carly Noonan") gives names.
 */
export function parseTimetable(rows: unknown[][]): { staff: TimetableStaff[]; problems: string[] } {
  const problems: string[] = [];
  const names = new Map<string, string>();
  for (const r of rows) {
    for (const c of r) {
      const m = cellText(c).match(/^([A-Z0-9]{3}) - (.+)$/);
      if (m) names.set(m[1], m[2].replace(/\s+/g, " ").trim());
    }
  }

  const headerIdx = rows.findIndex((r) => r.some((c) => /^[AB](Mon|Tue|Wed|Thu|Fri)$/i.test(cellText(c))));
  if (headerIdx === -1 || !rows[headerIdx + 1]) {
    return { staff: [], problems: ["Could not find the day headings (AMon, ATue …) in the timetable."] };
  }
  const dayRow = rows[headerIdx];
  const periodRow = rows[headerIdx + 1];
  const cols: { i: number; week: WeekLetter; day: number; period: PeriodKey }[] = [];
  let cur: { week: WeekLetter; day: number } | null = null;
  const width = Math.max(dayRow.length, periodRow.length);
  for (let i = 0; i < width; i++) {
    const d = cellText(dayRow[i]).match(/^([AB])(Mon|Tue|Wed|Thu|Fri)$/i);
    if (d) cur = { week: d[1].toUpperCase() as WeekLetter, day: DAYS[d[2].toLowerCase()] };
    const p = cellText(periodRow[i]).match(/\b(P[1-6]|R[12])$/i);
    if (!cur || !p) continue;
    const raw = p[1].toUpperCase();
    const period = (raw === "R1" ? "TA" : raw === "R2" ? "TB" : raw) as PeriodKey;
    cols.push({ i, ...cur, period });
  }
  if (cols.length === 0) return { staff: [], problems: ["No period columns found in the timetable."] };

  const staff: TimetableStaff[] = [];
  for (const r of rows.slice(headerIdx + 2)) {
    const code = cellText(r[0]);
    if (!/^[A-Z0-9]{3}$/.test(code)) continue; // blank rows and the legend
    const name = names.get(code);
    if (!name) continue; // codes with no name in the legend are placeholders
    if (NOT_A_PERSON.test(name)) continue;
    const free: Record<WeekLetter, string[]> = { A: [], B: [] };
    let lessons = 0;
    for (const c of cols) {
      if (cellText(r[c.i])) {
        if (!c.period.startsWith("T")) lessons++;
      } else {
        free[c.week].push(`${c.day}-${c.period}`);
      }
    }
    if (lessons === 0) continue; // nothing timetabled: not a teacher, or a duplicate code
    staff.push({ code, name, lessons, free });
  }
  if (staff.length === 0) problems.push("No staff with lessons were found in the timetable.");
  return { staff, problems };
}
