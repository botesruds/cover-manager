import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server.ts";
import { academicYearStart, formatShort, isValidISO, todayISO, weekStart } from "@/lib/dates.ts";
import { PERIOD_LABEL, WEEKDAYS, type PeriodKey } from "@/lib/schedule.ts";
import type { Cover, Staff } from "@/lib/types.ts";

export default async function StaffHistory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const today = todayISO();
  const from = isValidISO(sp.from) ? sp.from : academicYearStart(today);
  const to = isValidISO(sp.to) ? sp.to : today;

  const supabase = await createClient();
  const { data: person } = await supabase
    .from("staff")
    .select("id, code, name, teaches, active, offer_as_extra, rota_slots(id, staff_id, kind, day, period, option)")
    .eq("id", id)
    .maybeSingle();
  if (!person) notFound();
  const s = person as Staff;
  const { data } = await supabase
    .from("covers")
    .select("*")
    .eq("staff_id", id)
    .gte("cover_date", from)
    .lte("cover_date", to)
    .order("cover_date", { ascending: false });
  const covers = (data ?? []) as Cover[];

  return (
    <div className="space-y-6">
      <Link href={`/history?from=${from}&to=${to}`} className="text-sm text-brand-700 hover:underline">
        ← All staff
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {s.name} <span className="text-base font-normal text-slate-500">{s.code}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {s.teaches ? `${s.teaches}. ` : ""}Rota:{" "}
          {s.rota_slots.length === 0
            ? "none"
            : s.rota_slots
                .slice()
                .sort((a, b) => (a.option ?? 9) - (b.option ?? 9) || a.day - b.day)
                .map(
                  (r) =>
                    `${WEEKDAYS[r.day - 1].name} ${PERIOD_LABEL[r.period as PeriodKey]}${
                      r.kind === "lesson" ? ` (${r.option === 1 ? "1st" : "2nd"})` : ""
                    }`,
                )
                .join(", ")}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {covers.length} cover{covers.length === 1 ? "" : "s"} from {formatShort(from)} to {formatShort(to)},
          across {new Set(covers.map((c) => weekStart(c.cover_date))).size} weeks.
        </p>
      </div>
      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Absent teacher</th>
              <th className="px-3 py-2 font-medium">Class</th>
              <th className="px-3 py-2 font-medium">On rota?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {covers.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-1.5">
                  <Link href={`/?date=${c.cover_date}`} className="hover:text-brand-700 hover:underline">
                    {formatShort(c.cover_date)}
                  </Link>
                </td>
                <td className="px-3 py-1.5">{PERIOD_LABEL[c.period]}</td>
                <td className="px-3 py-1.5">{c.absent_teacher ?? "—"}</td>
                <td className="px-3 py-1.5">{c.class_name ?? "—"}</td>
                <td className="px-3 py-1.5">{c.on_rota ? "Yes" : <span className="text-amber-700">No</span>}</td>
              </tr>
            ))}
            {covers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-slate-500">
                  No covers in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
