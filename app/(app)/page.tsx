import Link from "next/link";
import { CoverForm } from "@/components/CoverForm.tsx";
import { DatePicker } from "@/components/DatePicker.tsx";
import { candidatesFor, extrasFor, type Candidate } from "@/lib/candidates.ts";
import { getCoverCounts, getCovers, getSetting, getStaff, getTimetableFree } from "@/lib/data.ts";
import {
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
import { PERIOD_LABEL, periodsForDay, type PeriodKey, type Weekday } from "@/lib/schedule.ts";
import type { Cover, Staff } from "@/lib/types.ts";
import { deleteCover } from "../actions.ts";
import { setWeekLetter } from "./rota/actions.ts";

function prevSchoolDay(d: string) {
  let x = addDays(d, -1);
  while (isoWeekday(x) > 5) x = addDays(x, -1);
  return x;
}
function followingSchoolDay(d: string) {
  return nextSchoolDay(addDays(d, 1));
}

export default async function CoverPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();
  const date = nextSchoolDay(isValidISO(sp.date) ? sp.date : today);
  const day = isoWeekday(date) as Weekday;
  const ws = weekStart(date);

  const [staff, weekCovers, counts, free, weekAMonday] = await Promise.all([
    getStaff(),
    getCovers(ws, addDays(ws, 6)),
    getCoverCounts(academicYearStart(date), addDays(ws, 6)),
    getTimetableFree(day),
    getSetting("week_a_monday"),
  ]);
  const week = weekLetter(date, weekAMonday);
  const hasTimetable = free.size > 0;

  const staffById = new Map(staff.map((s) => [s.id, s]));
  const onRotaCount = staff.filter((s) => s.rota_slots.length > 0).length;
  const usedThisWeek = new Set(weekCovers.map((c) => c.staff_id)).size;
  const staffOptions = staff.map((s) => ({ id: s.id, name: s.name, code: s.code }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
            {formatLong(date)}
            <WeekBadge week={week} monday={ws} />
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Week of {formatShort(ws)}: {weekCovers.length} cover{weekCovers.length === 1 ? "" : "s"} set,{" "}
            {usedThisWeek} of {onRotaCount} rota staff used.{" "}
            <Link href={`/week?date=${date}`} className="text-brand-700 underline">
              See the week
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/?date=${prevSchoolDay(date)}`} className="btn-ghost" aria-label="Previous day">
            ←
          </Link>
          <DatePicker value={date} />
          <Link href={`/?date=${followingSchoolDay(date)}`} className="btn-ghost" aria-label="Next day">
            →
          </Link>
          {date !== nextSchoolDay(today) && (
            <Link href="/" className="btn-ghost">
              Today
            </Link>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Names in each period come from the rota. Anyone who has already covered this week is greyed
        out. The rest are in fairness order: fewest covers this year first.
        {hasTimetable &&
          ` Under each period, "More free staff" lists people off the rota who the master timetable shows as free ${
            week ? `in Week ${week}` : "in both Week A and Week B"
          }.`}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {periodsForDay(day).map(({ key, time }) => {
          const cands = candidatesFor(staff, day, key, date, weekCovers, counts);
          const here = weekCovers.filter((c) => c.cover_date === date && c.period === key);
          const offRota = here.filter((c) => !cands.some((x) => x.staff.id === c.staff_id));
          const extras = hasTimetable
            ? extrasFor(staff, free, week, day, key, date, weekCovers, counts).filter(
                (x) => !offRota.some((c) => c.staff_id === x.staff.id),
              )
            : null;
          return (
            <PeriodCard
              key={key}
              date={date}
              period={key}
              time={time}
              candidates={cands}
              offRota={offRota}
              extras={extras}
              staffById={staffById}
              staffOptions={staffOptions}
            />
          );
        })}
      </div>
    </div>
  );
}

function PeriodCard({
  date,
  period,
  time,
  candidates,
  offRota,
  extras,
  staffById,
  staffOptions,
}: {
  date: string;
  period: PeriodKey;
  time: string;
  candidates: Candidate[];
  offRota: Cover[];
  extras: Candidate[] | null;
  staffById: Map<string, Staff>;
  staffOptions: { id: string; name: string; code: string }[];
}) {
  const available = candidates.filter((c) => c.status === "available").length;
  const set = candidates.filter((c) => c.status === "covering").length + offRota.length;
  return (
    <section className="card flex flex-col">
      <header className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold">
          {PERIOD_LABEL[period]} <span className="font-normal text-slate-500">{time}</span>
        </h2>
        <span className="text-xs text-slate-500">
          {set > 0 && <span className="mr-2 font-medium text-emerald-700">{set} set</span>}
          {available} of {candidates.length} free to use
        </span>
      </header>
      <ul className="divide-y divide-slate-100">
        {candidates.map((c) => (
          <CandidateRow key={c.staff.id} c={c} date={date} period={period} />
        ))}
        {offRota.map((cv) => (
          <li key={cv.id} className="bg-emerald-50 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">{staffById.get(cv.staff_id)?.name ?? "Unknown"}</span>{" "}
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">off rota</span>
                <CoverDetail cover={cv} />
              </div>
              <UndoButton id={cv.id} />
            </div>
          </li>
        ))}
        {candidates.length === 0 && offRota.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">Nobody is on the rota for this period.</li>
        )}
      </ul>
      {extras && <ExtrasList extras={extras} date={date} period={period} />}
      <div className="mt-auto border-t border-slate-100 px-4 py-2.5">
        <CoverForm
          date={date}
          period={period}
          staffOptions={staffOptions}
          buttonLabel="Use someone else…"
          buttonClass="text-sm text-brand-700 hover:underline cursor-pointer"
        />
      </div>
    </section>
  );
}

function ExtrasList({ extras, date, period }: { extras: Candidate[]; date: string; period: PeriodKey }) {
  const free = extras.filter((c) => c.status === "available");
  const used = extras.length - free.length;
  return (
    <details className="group border-t border-slate-100">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>
        More free staff ({free.length})
        {used > 0 && <span className="text-xs text-slate-400"> · {used} already used this week</span>}
      </summary>
      <ul className="divide-y divide-slate-100 bg-slate-50/50">
        {free.map((c) => (
          <CandidateRow key={c.staff.id} c={c} date={date} period={period} extra />
        ))}
        {free.length === 0 && (
          <li className="px-4 py-2.5 text-sm text-slate-500">Nobody else is free and unused this period.</li>
        )}
      </ul>
    </details>
  );
}

function WeekBadge({ week, monday }: { week: "A" | "B" | null; monday: string }) {
  if (week) {
    const other = week === "A" ? "B" : "A";
    return (
      <form action={setWeekLetter} className="flex items-center gap-1.5 text-sm font-normal">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">Week {week}</span>
        <input type="hidden" name="monday" value={monday} />
        <input type="hidden" name="letter" value={other} />
        <button className="cursor-pointer text-xs text-slate-400 hover:text-slate-700 hover:underline">
          It&apos;s Week {other}
        </button>
      </form>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm font-normal text-slate-600">
      Which week is this?
      {(["A", "B"] as const).map((l) => (
        <form key={l} action={setWeekLetter}>
          <input type="hidden" name="monday" value={monday} />
          <input type="hidden" name="letter" value={l} />
          <button className="btn-ghost px-2 py-0.5 text-xs">Week {l}</button>
        </form>
      ))}
    </span>
  );
}

function CandidateRow({ c, date, period, extra }: { c: Candidate; date: string; period: PeriodKey; extra?: boolean }) {
  const optLabel = extra ? "Free" : c.option === 1 ? "1st" : c.option === 2 ? "2nd" : "Tutor";
  const here = c.weekCovers.find((x) => x.cover_date === date && x.period === period);
  const usedOn = c.weekCovers
    .filter((x) => x !== here)
    .map((x) => `${formatShort(x.cover_date)} ${PERIOD_LABEL[x.period]}`)
    .join(", ");

  return (
    <li
      className={`px-4 py-2.5 ${
        c.status === "covering" ? "bg-emerald-50" : c.status === "used" ? "bg-slate-50 text-slate-400" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className={`font-medium ${c.status === "used" ? "line-through decoration-slate-300" : ""}`}>
              {c.staff.name}
            </span>
            <span className="text-xs text-slate-400">{c.staff.code}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{optLabel}</span>
          </div>
          <div className="truncate text-xs text-slate-500">
            {c.status === "used" ? (
              <>Already covered this week: {usedOn}</>
            ) : (
              <>
                {c.yearTotal === 0
                  ? "No covers yet this year"
                  : `${c.yearTotal} cover${c.yearTotal === 1 ? "" : "s"} this year, last ${formatShort(c.lastDate!)}`}
                {c.staff.teaches ? ` · ${c.staff.teaches}` : ""}
              </>
            )}
          </div>
          {here && <CoverDetail cover={here} />}
        </div>
        <div className="shrink-0">
          {c.status === "covering" && here ? (
            <UndoButton id={here.id} />
          ) : c.status === "available" ? (
            <CoverForm
              date={date}
              period={period}
              staffId={c.staff.id}
              staffName={c.staff.name}
              buttonLabel="Use"
              buttonClass={extra ? "btn-ghost" : undefined}
              extra={extra}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

function CoverDetail({ cover }: { cover: Cover }) {
  const bits = [cover.absent_teacher && `for ${cover.absent_teacher}`, cover.class_name].filter(Boolean);
  return (
    <div className="text-xs font-medium text-emerald-700">
      Covering{bits.length ? ` ${bits.join(", ")}` : ""}
    </div>
  );
}

function UndoButton({ id }: { id: string }) {
  return (
    <form action={deleteCover}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-slate-500 underline hover:text-red-600">Undo</button>
    </form>
  );
}
