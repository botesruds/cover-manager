import Link from "next/link";
import { DatePicker } from "@/components/DatePicker.tsx";
import { getCovers, getStaff } from "@/lib/data.ts";
import { addDays, formatShort, isValidISO, todayISO, weekStart } from "@/lib/dates.ts";
import { PERIOD_LABEL, PERIOD_ORDER, WEEKDAYS, periodTime, type Weekday } from "@/lib/schedule.ts";

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const ws = weekStart(isValidISO(sp.date) ? sp.date : todayISO());
  const [staff, covers] = await Promise.all([getStaff({ includeInactive: true }), getCovers(ws, addDays(ws, 6))]);
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const perStaff = new Map<string, number>();
  for (const c of covers) perStaff.set(c.staff_id, (perStaff.get(c.staff_id) ?? 0) + 1);
  const twice = [...perStaff.entries()].filter(([, n]) => n > 1);
  const rotaStaff = staff.filter((s) => s.active && s.rota_slots.length > 0);
  const unused = rotaStaff.filter((s) => !perStaff.has(s.id));
  const offRota = covers.filter((c) => !c.on_rota).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/week?date=${addDays(ws, -7)}`} className="btn-ghost h-10 w-10 p-0" aria-label="Previous week">
          ←
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-xl font-semibold sm:text-2xl">Week of {formatShort(ws)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {covers.length} cover{covers.length === 1 ? "" : "s"} set · {perStaff.size} of {rotaStaff.length} rota staff
            used
            {twice.length > 0 && (
              <span className="text-amber-700">
                {" "}
                · {twice.length} used more than once
              </span>
            )}
            {offRota > 0 && <span className="text-amber-700"> · {offRota} off rota</span>}
          </p>
          <div className="mt-1 text-sm">
            <DatePicker value={ws} compact />
          </div>
        </div>
        <Link href={`/week?date=${addDays(ws, 7)}`} className="btn-ghost h-10 w-10 p-0" aria-label="Next week">
          →
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="w-24 px-3 py-2 font-medium">Period</th>
              {WEEKDAYS.map((d) => (
                <th key={d.day} className="px-3 py-2 font-medium">
                  <Link href={`/?date=${addDays(ws, d.day - 1)}`} className="hover:text-brand-700">
                    {d.name} {formatShort(addDays(ws, d.day - 1)).split(" ").slice(1).join(" ")}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERIOD_ORDER.map((p) => (
              <tr key={p} className="align-top">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{PERIOD_LABEL[p]}</td>
                {WEEKDAYS.map((d) => {
                  if (!periodTime(d.day as Weekday, p)) {
                    return <td key={d.day} className="bg-slate-50 px-3 py-2" />;
                  }
                  const date = addDays(ws, d.day - 1);
                  const here = covers.filter((c) => c.cover_date === date && c.period === p);
                  return (
                    <td key={d.day} className="group px-3 py-2">
                      {here.map((c) => {
                        const s = staffById.get(c.staff_id);
                        const repeat = (perStaff.get(c.staff_id) ?? 0) > 1;
                        return (
                          <div key={c.id} className="mb-1">
                            <span className={repeat ? "font-medium text-amber-700" : "font-medium"}>{s?.name}</span>
                            {!c.on_rota && <span className="ml-1 text-xs text-amber-700">(off rota)</span>}
                            {(c.absent_teacher || c.class_name) && (
                              <div className="text-xs text-slate-500">
                                {[c.absent_teacher && `for ${c.absent_teacher}`, c.class_name].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Link
                        href={`/?date=${date}&p=${p}`}
                        className="text-xs text-brand-700 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Set cover ${d.name} ${PERIOD_LABEL[p]}`}
                      >
                        + add
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="card group">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold">
          <span className="mr-1.5 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
          Not used yet this week ({unused.length})
        </summary>
        <ul className="grid gap-x-6 gap-y-1 px-4 pb-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {unused.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
