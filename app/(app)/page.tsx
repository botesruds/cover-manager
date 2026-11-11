import Link from "next/link";
import { CoverForm } from "@/components/CoverForm.tsx";
import { DatePicker } from "@/components/DatePicker.tsx";
import { candidatesFor, extrasFor, type Candidate } from "@/lib/candidates.ts";
import { getCoverCounts, getCovers, getSetting, getStaff, getTimetableFree } from "@/lib/data.ts";
import {
  SCHOOL_TIMEZONE,
  academicYearStart,
  addDays,
  formatLong,
  formatShort,
  isoWeekday,
  isValidISO,
  nextSchoolDay,
  todayISO,
  weekLetter,
  weekStart,
} from "@/lib/dates.ts";
import { PERIOD_LABEL, PERIOD_ORDER, periodsForDay, type PeriodKey, type Weekday } from "@/lib/schedule.ts";
import type { Cover, Staff } from "@/lib/types.ts";
import { deleteCover } from "../actions.ts";
import { setWeekLetter } from "./rota/actions.ts";

/** How many of the fairest choices to show before "Show more". */
const TOP = 3;

function prevSchoolDay(d: string) {
  let x = addDays(d, -1);
  while (isoWeekday(x) > 5) x = addDays(x, -1);
  return x;
}
function followingSchoolDay(d: string) {
  return nextSchoolDay(addDays(d, 1));
}

/** Current time at school as "HH:MM". */
function nowHHMM() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export default async function CoverPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; p?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const date = nextSchoolDay(isValidISO(sp.date) ? sp.date : today);
  const day = isoWeekday(date) as Weekday;
  const ws = weekStart(date);
  const periods = periodsForDay(day);

  // Which period to show: the one asked for, else (today) the one running
  // now or next, else the first of the day.
  let period: PeriodKey = periods[0].key;
  if (PERIOD_ORDER.includes(sp.p as PeriodKey) && periods.some((x) => x.key === sp.p)) {
    period = sp.p as PeriodKey;
  } else if (date === today) {
    const now = nowHHMM();
    const idx = periods.findIndex((x, i) => (periods[i + 1]?.time ?? "99:99") > now);
    if (idx >= 0) period = periods[idx].key;
  }
  const time = periods.find((x) => x.key === period)!.time;

  const [staff, weekCovers, counts, free, weekAMonday] = await Promise.all([
    getStaff(),
    getCovers(ws, addDays(ws, 6)),
    getCoverCounts(academicYearStart(date), addDays(ws, 6)),
    getTimetableFree(day),
    getSetting("week_a_monday"),
  ]);
  const week = weekLetter(date, weekAMonday);
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const staffOptions = staff.map((s) => ({ id: s.id, name: s.name, code: s.code }));

  const cands = candidatesFor(staff, day, period, date, weekCovers, counts);
  const extras =
    free.size > 0 ? extrasFor(staff, free, week, day, period, date, weekCovers, counts) : [];
  const setHere = weekCovers.filter((c) => c.cover_date === date && c.period === period);
  const rotaFree = cands.filter((c) => c.status === "available");
  const rotaUsed = cands.filter((c) => c.status === "used").length;
  const extraFree = extras.filter((c) => c.status === "available" && !setHere.some((s) => s.staff_id === c.staff.id));
  const best = rotaFree.slice(0, TOP);
  const moreRota = rotaFree.slice(TOP);

  const setCount = (p: PeriodKey) => weekCovers.filter((c) => c.cover_date === date && c.period === p).length;
  const href = (o: { date?: string; p?: PeriodKey }) => {
    const q = new URLSearchParams({ date: o.date ?? date });
    if (o.p) q.set("p", o.p);
    return `/?${q}`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Day */}
      <div className="flex items-center justify-between gap-2">
        <Link href={href({ date: prevSchoolDay(date) })} className="btn-ghost h-10 w-10 p-0" aria-label="Previous day">
          ←
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-xl font-semibold sm:text-2xl">{formatLong(date)}</h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <WeekBadge week={week} monday={ws} />
            {date !== nextSchoolDay(today) && (
              <Link href="/" className="text-brand-700 hover:underline">
                Back to today
              </Link>
            )}
            <DatePicker value={date} compact />
          </div>
        </div>
        <Link href={href({ date: followingSchoolDay(date) })} className="btn-ghost h-10 w-10 p-0" aria-label="Next day">
          →
        </Link>
      </div>

      {/* Period */}
      <nav className="grid grid-cols-4 gap-1.5 sm:grid-cols-8" aria-label="Period">
        {periods.map(({ key, time: t }) => {
          const on = key === period;
          const n = setCount(key);
          return (
            <Link
              key={key}
              href={href({ p: key })}
              className={`relative rounded-lg border px-1 py-2 text-center leading-tight transition ${
                on
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="text-sm font-semibold">{PERIOD_LABEL[key].replace("Tutor ", "Tut ")}</div>
              <div className={`text-[11px] ${on ? "text-brand-100" : "text-slate-400"}`}>{t}</div>
              {n > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-semibold text-white"
                  title={`${n} cover${n === 1 ? "" : "s"} set`}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <section className="card">
        <header className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-lg font-semibold">
            {PERIOD_LABEL[period]} <span className="font-normal text-slate-400">{time}</span>
          </h2>
        </header>

        {setHere.length > 0 && (
          <div className="border-b border-slate-100 bg-emerald-50 px-4 py-3">
            <div className="mb-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase">Covering</div>
            <ul className="space-y-1.5">
              {setHere.map((cv) => (
                <SetRow key={cv.id} cover={cv} person={staffById.get(cv.staff_id)} />
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 pt-3 pb-1">
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {best.length ? "Best choices" : "On the rota"}
          </div>
        </div>
        <ul>
          {best.map((c, i) => (
            <PersonRow key={c.staff.id} c={c} date={date} period={period} highlight={i === 0} />
          ))}
        </ul>
        {best.length === 0 && (
          <p className="px-4 pb-3 text-sm text-slate-500">
            {cands.length === 0
              ? "Nobody is on the rota for this period."
              : "Everyone on the rota for this period has already covered this week."}
          </p>
        )}

        {moreRota.length > 0 && (
          <More label={`${moreRota.length} more on the rota`}>
            {moreRota.map((c) => (
              <PersonRow key={c.staff.id} c={c} date={date} period={period} />
            ))}
          </More>
        )}
        {extraFree.length > 0 && (
          <More label={`${extraFree.length} other staff free this period`} hint="Not on the rota, but free on the timetable">
            {extraFree.map((c) => (
              <PersonRow key={c.staff.id} c={c} date={date} period={period} extra />
            ))}
          </More>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm">
          <CoverForm
            date={date}
            period={period}
            staffOptions={staffOptions}
            buttonLabel="Pick someone else…"
            buttonClass="cursor-pointer text-brand-700 hover:underline"
          />
          {rotaUsed > 0 && (
            <span className="text-xs text-slate-400">
              {rotaUsed} on the rota already used this week
            </span>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Fairest first: nobody who has covered this week, then fewest covers this year.{" "}
        <Link href={`/week?date=${date}`} className="underline hover:text-slate-600">
          See the whole week
        </Link>
      </p>
    </div>
  );
}

function More({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-slate-100">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
        <span className="mr-1.5 inline-block text-slate-400 transition group-open:rotate-90">▸</span>
        Show {label}
        {hint && <span className="block pl-4 text-xs text-slate-400">{hint}</span>}
      </summary>
      <ul className="bg-slate-50/60">{children}</ul>
    </details>
  );
}

function WeekBadge({ week, monday }: { week: "A" | "B" | null; monday: string }) {
  if (week) {
    const other = week === "A" ? "B" : "A";
    return (
      <form action={setWeekLetter} className="inline-flex items-center gap-1.5">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">Week {week}</span>
        <input type="hidden" name="monday" value={monday} />
        <input type="hidden" name="letter" value={other} />
        <button
          className="cursor-pointer text-xs text-slate-400 hover:text-slate-700 hover:underline"
          title={`Change this week to Week ${other}`}
        >
          change
        </button>
      </form>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-700">
      Which week?
      {(["A", "B"] as const).map((l) => (
        <form key={l} action={setWeekLetter}>
          <input type="hidden" name="monday" value={monday} />
          <input type="hidden" name="letter" value={l} />
          <button className="btn-ghost px-2 py-0.5 text-xs">{l}</button>
        </form>
      ))}
    </span>
  );
}

function fairness(c: Candidate) {
  return c.yearTotal === 0
    ? "No covers yet this year"
    : `${c.yearTotal} cover${c.yearTotal === 1 ? "" : "s"} this year · last ${formatShort(c.lastDate!)}`;
}

function PersonRow({
  c,
  date,
  period,
  extra,
  highlight,
}: {
  c: Candidate;
  date: string;
  period: PeriodKey;
  extra?: boolean;
  highlight?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
      <div className="min-w-0">
        <div className="font-medium">{c.staff.name}</div>
        <div className="text-xs text-slate-500">{fairness(c)}</div>
      </div>
      <div className="shrink-0 has-[form]:basis-full">
        <CoverForm
          date={date}
          period={period}
          staffId={c.staff.id}
          staffName={c.staff.name}
          buttonLabel="Use"
          buttonClass={highlight ? "btn-primary px-4" : "btn-ghost px-4"}
          extra={extra}
        />
      </div>
    </li>
  );
}

function SetRow({ cover, person }: { cover: Cover; person: Staff | undefined }) {
  const bits = [cover.absent_teacher && `for ${cover.absent_teacher}`, cover.class_name].filter(Boolean);
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium">{person?.name ?? "Unknown"}</span>
        {bits.length > 0 && <span className="text-sm text-emerald-800"> · {bits.join(", ")}</span>}
        {!cover.on_rota && <span className="ml-1 text-xs text-amber-700">(off rota)</span>}
      </div>
      <form action={deleteCover}>
        <input type="hidden" name="id" value={cover.id} />
        <button className="cursor-pointer text-xs text-slate-500 underline hover:text-red-600">Undo</button>
      </form>
    </li>
  );
}
