import Link from "next/link";
import { getCoverCounts, getStaff, getWeeklyTotals } from "@/lib/data.ts";
import { academicYearStart, formatShort, isValidISO, todayISO } from "@/lib/dates.ts";

type Sort = "most" | "least" | "name" | "recent";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const from = isValidISO(sp.from) ? sp.from : academicYearStart(today);
  const to = isValidISO(sp.to) ? sp.to : today;
  const sort = (["most", "least", "name", "recent"].includes(sp.sort ?? "") ? sp.sort : "most") as Sort;

  const [staff, counts, weeks] = await Promise.all([
    getStaff({ includeInactive: true }),
    getCoverCounts(from, to),
    getWeeklyTotals(from, to),
  ]);

  const rows = staff
    .filter((s) => s.active || counts.has(s.id))
    .map((s) => ({ s, c: counts.get(s.id) ?? { total: 0, weeks: 0, last_date: null } }));
  rows.sort((a, b) => {
    if (sort === "name") return a.s.name.localeCompare(b.s.name);
    if (sort === "least") return a.c.total - b.c.total || a.s.name.localeCompare(b.s.name);
    if (sort === "recent") return (b.c.last_date ?? "").localeCompare(a.c.last_date ?? "");
    return b.c.total - a.c.total || a.s.name.localeCompare(b.s.name);
  });

  const total = rows.reduce((n, r) => n + r.c.total, 0);
  const never = rows.filter((r) => r.c.total === 0 && r.s.rota_slots.length > 0).length;
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));
  const qs = (o: Record<string, string>) => new URLSearchParams({ from, to, sort, ...o }).toString();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} covers from {formatShort(from)} to {formatShort(to)}
            {never > 0 && <> · {never} rota staff not used yet</>}
          </p>
        </div>
        <a href={`/export?from=${from}&to=${to}`} className="btn-ghost">
          Download spreadsheet
        </a>
      </div>

      <details className="card group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm text-slate-600">
          <span className="mr-1.5 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
          Change dates
        </summary>
        <form className="flex flex-wrap items-end gap-2 px-4 pb-4">
          <div>
            <label className="label">From</label>
            <input type="date" name="from" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" name="to" defaultValue={to} className="input" />
          </div>
          <input type="hidden" name="sort" value={sort} />
          <button className="btn-primary">Show</button>
        </form>
      </details>

      {weeks.length > 0 && (
        <details className="card group">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-slate-600">
            <span className="mr-1.5 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
            Covers per week
          </summary>
          <div className="space-y-1 px-4 pb-4">
            {weeks.map((w) => (
              <div key={w.week} className="flex items-center gap-3 text-sm">
                <Link href={`/week?date=${w.week}`} className="w-20 shrink-0 text-slate-600 hover:text-brand-700">
                  {formatShort(w.week).replace(/^\w+ /, "")}
                </Link>
                <div className="h-3 flex-1 rounded bg-slate-100">
                  <div className="h-3 rounded bg-brand-600" style={{ width: `${(w.total / maxWeek) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-slate-500">{w.total}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <Th href={`?${qs({ sort: "name" })}`} on={sort === "name"}>Name</Th>
              <Th href={`?${qs({ sort: sort === "most" ? "least" : "most" })}`} on={sort === "most" || sort === "least"}>
                Covers {sort === "least" ? "↑" : "↓"}
              </Th>
              <Th href={`?${qs({ sort: "recent" })}`} on={sort === "recent"}>Last cover</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ s, c }) => (
              <tr key={s.id} className={s.active ? "" : "text-slate-400"}>
                <td className="px-3 py-1.5">
                  <Link href={`/history/${s.id}?from=${from}&to=${to}`} className="hover:text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                  {!s.active && <span className="ml-1 text-xs">(inactive)</span>}
                </td>
                <td className="px-3 py-1.5 font-medium tabular-nums">{c.total}</td>
                <td className="px-3 py-1.5 text-slate-600">{c.last_date ? formatShort(c.last_date) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Th({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-medium">
      <Link href={href} className={on ? "text-brand-700" : "hover:text-slate-800"}>
        {children}
      </Link>
    </th>
  );
}
