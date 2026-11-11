import { NextResponse, type NextRequest } from "next/server";
import { getCovers, getSessionInfo, getStaff } from "@/lib/data.ts";
import { academicYearStart, isValidISO, todayISO, weekStart } from "@/lib/dates.ts";
import { PERIOD_LABEL, dayName, periodTime, type Weekday } from "@/lib/schedule.ts";
import { isoWeekday } from "@/lib/dates.ts";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const { user, allowed } = await getSessionInfo();
  if (!user || !allowed) return new NextResponse("Not allowed", { status: 403 });

  const today = todayISO();
  const fromP = req.nextUrl.searchParams.get("from");
  const toP = req.nextUrl.searchParams.get("to");
  const from = isValidISO(fromP) ? fromP : academicYearStart(today);
  const to = isValidISO(toP) ? toP : today;

  const [staff, covers] = await Promise.all([getStaff({ includeInactive: true }), getCovers(from, to)]);
  const byId = new Map(staff.map((s) => [s.id, s]));

  const header = ["Week starting", "Date", "Day", "Period", "Time", "Staff name", "Code", "Absent teacher", "Class", "On rota", "Notes"];
  const lines = [header.map(csvCell).join(",")];
  for (const c of covers) {
    const s = byId.get(c.staff_id);
    const wd = isoWeekday(c.cover_date) as Weekday;
    lines.push(
      [
        weekStart(c.cover_date),
        c.cover_date,
        dayName(wd),
        PERIOD_LABEL[c.period],
        periodTime(wd, c.period) ?? "",
        s?.name ?? "",
        s?.code ?? "",
        c.absent_teacher ?? "",
        c.class_name ?? "",
        c.on_rota ? "Yes" : "No",
        c.notes ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cover-history-${from}-to-${to}.csv"`,
    },
  });
}
