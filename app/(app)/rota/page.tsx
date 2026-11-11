import { getStaff } from "@/lib/data.ts";
import { PERIOD_LABEL, PERIOD_ORDER, WEEKDAYS, periodTime, type PeriodKey, type Weekday } from "@/lib/schedule.ts";
import type { Slot } from "@/lib/types.ts";
import { ImportRota } from "./ImportRota.tsx";
import { ImportTimetable } from "./ImportTimetable.tsx";
import { NameFilter } from "./NameFilter.tsx";
import { StaffEditor } from "./StaffEditor.tsx";

function fmt(s: Slot | undefined) {
  return s ? `${WEEKDAYS[s.day - 1].short} ${PERIOD_LABEL[s.period as PeriodKey]}` : "—";
}

export default async function RotaPage() {
  const staff = await getStaff({ includeInactive: true });
  const onRota = staff.filter((s) => s.active && s.rota_slots.length > 0);
  const others = staff.filter((s) => s.active && s.rota_slots.length === 0);
  const inactive = staff.filter((s) => !s.active);
  const active = onRota;

  // How many names sit on each slot, to spot thin periods.
  const load = new Map<string, number>();
  for (const s of active) {
    for (const r of s.rota_slots) {
      const k = `${r.day}-${r.period}`;
      load.set(k, (load.get(k) ?? 0) + 1);
    }
  }

  const row = (s: (typeof staff)[number]) => {
    const l1 = s.rota_slots.find((r) => r.kind === "lesson" && r.option === 1);
    const l2 = s.rota_slots.find((r) => r.kind === "lesson" && r.option === 2);
    const tutor = s.rota_slots.filter((r) => r.kind === "tutor");
    return (
      <tr key={s.id} data-name={s.name.toLowerCase()} className={`align-top ${s.active ? "" : "text-slate-400"}`}>
        <td className="px-3 py-1.5">
          {s.name}
          {!s.active && <span className="ml-1 text-xs">(left)</span>}
          {s.active && !s.offer_as_extra && <span className="ml-1 text-xs text-slate-400">(not suggested)</span>}
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap">{fmt(l1)}</td>
        <td className="px-3 py-1.5 whitespace-nowrap">{fmt(l2)}</td>
        <td className="px-3 py-1.5 whitespace-nowrap">{tutor.length ? tutor.map((t) => fmt(t)).join(", ") : "—"}</td>
        <td className="px-3 py-1.5 text-right">
          <StaffEditor staff={s} />
        </td>
      </tr>
    );
  };
  const head = (
    <thead>
      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
        <th className="px-3 py-2 font-medium">Name</th>
        <th className="px-3 py-2 font-medium">1st option</th>
        <th className="px-3 py-2 font-medium">2nd option</th>
        <th className="px-3 py-2 font-medium">Tutor</th>
        <th className="px-3 py-2" />
      </tr>
    </thead>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rota</h1>
          <p className="mt-1 text-sm text-slate-600">
            {onRota.length} staff on the rota, used for both Week A and Week B.
          </p>
        </div>
        <StaffEditor />
      </div>

      <Fold title="Update from a spreadsheet">
        <div className="grid gap-4 lg:grid-cols-2">
          <ImportRota />
          <ImportTimetable />
        </div>
      </Fold>

      <Fold title="How many names each period has">
        <table className="text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pr-4 font-medium" />
              {WEEKDAYS.map((d) => (
                <th key={d.day} className="px-3 text-center font-medium">
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIOD_ORDER.map((p) => (
              <tr key={p}>
                <td className="pr-4 font-medium whitespace-nowrap">{PERIOD_LABEL[p]}</td>
                {WEEKDAYS.map((d) => {
                  if (!periodTime(d.day as Weekday, p)) return <td key={d.day} />;
                  const n = load.get(`${d.day}-${p}`) ?? 0;
                  return (
                    <td key={d.day} className={`px-3 text-center ${n === 0 ? "text-slate-300" : ""}`}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Fold>

      <div className="space-y-2">
        <NameFilter />
        <section className="card overflow-x-auto">
          <table className="w-full text-sm">
            {head}
            <tbody className="divide-y divide-slate-100">{onRota.map(row)}</tbody>
          </table>
        </section>
      </div>

      {(others.length > 0 || inactive.length > 0) && (
        <Fold title={`Other staff (${others.length + inactive.length}): timetable only, or left`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {head}
              <tbody className="divide-y divide-slate-100">{[...others, ...inactive].map(row)}</tbody>
            </table>
          </div>
        </Fold>
      )}
    </div>
  );
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700">
        <span className="mr-1.5 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
