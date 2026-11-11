// Date helpers. All dates are plain "YYYY-MM-DD" strings in school-local time,
// so there is no timezone drift between the browser, the server and Postgres.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISO(s: string | undefined | null): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISO(parseISO(s)) === s;
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** ISO weekday: Monday = 1 ... Sunday = 7 */
export function isoWeekday(s: string): number {
  const wd = parseISO(s).getDay();
  return wd === 0 ? 7 : wd;
}

/** The Monday of the week containing this date. Usage resets on this day. */
export function weekStart(s: string): string {
  return addDays(s, 1 - isoWeekday(s));
}

/** Snap a weekend date forward to the next Monday. */
export function nextSchoolDay(s: string): string {
  const wd = isoWeekday(s);
  if (wd === 6) return addDays(s, 2);
  if (wd === 7) return addDays(s, 1);
  return s;
}

/** Academic year starts 1 September. */
export function academicYearStart(s: string): string {
  const d = parseISO(s);
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-09-01`;
}

export function formatLong(s: string): string {
  return parseISO(s).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShort(s: string): string {
  return parseISO(s).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const SCHOOL_TIMEZONE = process.env.NEXT_PUBLIC_SCHOOL_TIMEZONE || "Asia/Dubai";

export function todayISO(): string {
  // Use the school's own timezone regardless of where the server runs.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
