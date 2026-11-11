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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Week of {formatShort(ws)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Usage resets every Monday. Past weeks stay in the history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/week?date=${addDays(ws, -7)}`} className="btn-ghost">
            ← Previous week
          </Link>
          <DatePicker value={ws} />
          <Link href={`/week?date=${addDays(ws, 7)}`} className="btn-ghost">
            Next week →
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Covers set" value={covers.length} />
        <Stat label="Rota staff used" value={`${perStaff.size} of ${rotaStaff.length}`} />
        <Stat label="Used more than once" value={twice.length} warn={twice.length > 0} />
        <Stat label="Off-rota covers" value={offRota} warn={offRota > 0} />
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
                <td className="px-3 py-2 font-medium">{PERIOD_LABEL[p]}</td>
                {WEEKDAYS.map((d) => {
                  if (!periodTime(d.day as Weekday, p)) {
                    return <td key={d.day} className="bg-slate-50 px-3 py-2" />;
                  }
                  const date = addDays(ws, d.day - 1);
                  const here = covers.filter((c) => c.cover_date === date && c.period === p);
                  return (
                    <td key={d.day} className="px-3 py-2">
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {twice.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold text-amber-800">Used more than once this week</h2>
          <ul className="mt-2 text-sm">
            {twice.map(([id, n]) => (
              <li key={id}>
                {staffById.get(id)?.name}: {n} covers
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="font-semibold">Not used yet this week ({unused.length})</h2>
        <p className="mt-1 text-xs text-slate-500">Rota staff still available, with their slots.</p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {unused.map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span>{s.name}</span>
              <span className="text-xs text-slate-500">
                {s.rota_slots
                  .slice()
                  .sort((a, b) => a.day - b.day || PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period))
                  .map((r) => `${WEEKDAYS[r.day - 1].short} ${PERIOD_LABEL[r.period]}`)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${warn ? "text-amber-700" : ""}`}>{value}</div>
    </div>
  );
}
