import type { PeriodKey, Weekday } from "./schedule.ts";

export type ParsedSlot = { day: Weekday; period: PeriodKey };

export type RotaRow = {
  name: string;
  code: string;
  teaches: string | null;
  lesson: ParsedSlot[]; // 1st and 2nd likely cover, in order
  tutor: ParsedSlot[];
};

const DAY_INDEX: Record<string, Weekday> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
};

/**
 * Parse one slot as written in the rota spreadsheet, e.g.
 *   "Monday P4 (11:10)"  or  "Wednesday Tutor B (12:45)".
 * The time in brackets is ignored: it follows from the day and period.
 */
export function parseSlot(text: string): ParsedSlot | null {
  const m = text
    .trim()
    .match(/^(monday|tuesday|wednesday|thursday|friday)\s+(p[1-6]|tutor\s*[ab])\b/i);
  if (!m) return null;
  const day = DAY_INDEX[m[1].toLowerCase()];
  const raw = m[2].toLowerCase().replace(/\s+/g, "");
  const period: PeriodKey =
    raw === "tutora" ? "TA" : raw === "tutorb" ? "TB" : (raw.toUpperCase() as PeriodKey);
  return { day, period };
}

/** A cell may hold several slots separated by ";" (some staff have two tutor sessions). */
export function parseSlotList(text: unknown): ParsedSlot[] {
  if (typeof text !== "string" || !text.trim()) return [];
  return text
    .split(/[;\n]/)
    .map((s) => parseSlot(s))
    .filter((s): s is ParsedSlot => s !== null);
}

export function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null) {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("").trim();
    if (typeof o.text === "string") return o.text.trim();
    if (o.result !== undefined) return cellText(o.result);
  }
  return String(v).trim();
}

/**
 * Turn the rows of the "Staff Rota" sheet into rota entries. The header row is
 * found by looking for "Staff name" and "Code", so title rows above it are fine.
 */
export function rowsToRota(
  rows: unknown[][],
  teachesByCode: Map<string, string> = new Map(),
): { rows: RotaRow[]; problems: string[] } {
  const problems: string[] = [];
  const headerIdx = rows.findIndex(
    (r) => cellText(r[0]).toLowerCase() === "staff name" && cellText(r[1]).toLowerCase() === "code",
  );
  if (headerIdx === -1) {
    return { rows: [], problems: ['Could not find the "Staff name / Code" header row.'] };
  }
  const header = rows[headerIdx].map((c) => cellText(c).toLowerCase());
  const col = (needle: string) => header.findIndex((h) => h.includes(needle));
  const cFirst = col("first");
  const cSecond = col("second");
  const cTutor = col("tutor");

  const out: RotaRow[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(headerIdx + 1)) {
    const name = cellText(r[0]);
    const code = cellText(r[1]).toUpperCase();
    if (!name && !code) continue;
    if (!name || !code) {
      problems.push(`Skipped a row with a missing name or code (${name || code}).`);
      continue;
    }
    if (seen.has(code)) {
      problems.push(`${name} (${code}) appears twice; only the first row was used.`);
      continue;
    }
    seen.add(code);
    const lesson: ParsedSlot[] = [];
    for (const c of [cFirst, cSecond]) {
      if (c < 0) continue;
      const txt = cellText(r[c]);
      if (!txt) continue;
      const s = parseSlot(txt);
      if (s) lesson.push(s);
      else problems.push(`${name}: could not read slot "${txt}".`);
    }
    const tutor = cTutor >= 0 ? parseSlotList(cellText(r[cTutor])) : [];
    out.push({ name, code, teaches: teachesByCode.get(code) ?? null, lesson, tutor });
  }
  return { rows: out, problems };
}

/** Optional: "Teaches" per staff code from the Planner List sheet. */
export function teachesFromPlannerList(rows: unknown[][]): Map<string, string> {
  const map = new Map<string, string>();
  const headerIdx = rows.findIndex((r) => r.some((c) => cellText(c).toLowerCase() === "teaches"));
  if (headerIdx === -1) return map;
  const header = rows[headerIdx].map((c) => cellText(c).toLowerCase());
  const cCode = header.indexOf("code");
  const cTeaches = header.indexOf("teaches");
  if (cCode < 0) return map;
  for (const r of rows.slice(headerIdx + 1)) {
    const code = cellText(r[cCode]).toUpperCase();
    const t = cellText(r[cTeaches]);
    if (code && t && !map.has(code)) map.set(code, t);
  }
  return map;
}

/**
 * Preferred source: the "Planner List" sheet has one row per person per slot,
 * including the tutor placements Rudi makes by hand for staff who are not on
 * the lesson rota (e.g. staff with no lessons in the timetable).
 */
export function plannerListToRota(rows: unknown[][]): { rows: RotaRow[]; problems: string[] } {
  const problems: string[] = [];
  const headerIdx = rows.findIndex((r) => {
    const h = r.map((c) => cellText(c).toLowerCase());
    return h.includes("day") && h.includes("period") && h.includes("code");
  });
  if (headerIdx === -1) return { rows: [], problems: ["No Planner List header row found."] };
  const header = rows[headerIdx].map((c) => cellText(c).toLowerCase());
  const cDay = header.indexOf("day");
  const cPeriod = header.indexOf("period");
  const cOption = header.indexOf("option");
  const cName = header.findIndex((h) => h.includes("name"));
  const cCode = header.indexOf("code");
  const cTeaches = header.indexOf("teaches");

  const byCode = new Map<string, RotaRow>();
  for (const r of rows.slice(headerIdx + 1)) {
    const dayTxt = cellText(r[cDay]);
    const periodTxt = cellText(r[cPeriod]);
    if (!DAY_INDEX[dayTxt.toLowerCase()]) continue; // blank or repeated header rows
    const slot = parseSlot(`${dayTxt} ${periodTxt}`);
    const code = cellText(r[cCode]).toUpperCase();
    const name = cellText(r[cName]);
    if (!slot || !code || !name) {
      problems.push(`Skipped row: ${[dayTxt, periodTxt, name, code].filter(Boolean).join(" ")}`);
      continue;
    }
    let entry = byCode.get(code);
    if (!entry) {
      const teaches = cTeaches >= 0 ? cellText(r[cTeaches]) : "";
      entry = {
        name,
        code,
        teaches: teaches && !/^no lessons/i.test(teaches) ? teaches : null,
        lesson: [],
        tutor: [],
      };
      byCode.set(code, entry);
    }
    const opt = cOption >= 0 ? cellText(r[cOption]).toLowerCase() : "";
    if (slot.period === "TA" || slot.period === "TB" || opt === "tutor") {
      entry.tutor.push(slot);
    } else if (opt.startsWith("2")) {
      entry.lesson[1] = slot;
    } else {
      entry.lesson[0] = slot;
    }
  }
  const out = [...byCode.values()].map((e) => ({ ...e, lesson: e.lesson.filter(Boolean) }));
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { rows: out, problems };
}

export type ImportSlot = { kind: "lesson" | "tutor"; day: number; period: string; option: number | null };
export type ImportStaff = { code: string; name: string; teaches: string | null; slots: ImportSlot[] };

export function toImportPayload(rows: RotaRow[]): ImportStaff[] {
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    teaches: r.teaches,
    slots: [
      ...r.lesson.map((s, i) => ({ kind: "lesson" as const, day: s.day, period: s.period, option: i + 1 })),
      ...r.tutor.map((s) => ({ kind: "tutor" as const, day: s.day, period: s.period, option: null })),
    ],
  }));
}
