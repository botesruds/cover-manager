// School day structure. Week A and Week B share one cover rota, so there is
// no week letter here: a slot is just a weekday plus a period.

export type PeriodKey = "P1" | "P2" | "P3" | "P4" | "TA" | "TB" | "P5" | "P6";
export type Weekday = 1 | 2 | 3 | 4 | 5; // Monday = 1

export const WEEKDAYS: { day: Weekday; name: string; short: string }[] = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
];

export const PERIOD_ORDER: PeriodKey[] = ["P1", "P2", "P3", "P4", "TA", "TB", "P5", "P6"];

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
  TA: "Tutor A",
  TB: "Tutor B",
  P5: "P5",
  P6: "P6",
};

const MON_THU: Partial<Record<PeriodKey, string>> = {
  P1: "07:50",
  P2: "08:50",
  P3: "10:10",
  P4: "11:10",
  TA: "12:10",
  TB: "12:45",
  P5: "13:20",
  P6: "14:20",
};

// Friday is a short day: P1–P4 only, with different start times.
const FRIDAY: Partial<Record<PeriodKey, string>> = {
  P1: "07:50",
  P2: "08:40",
  P3: "09:50",
  P4: "10:40",
};

export function periodsForDay(day: Weekday): { key: PeriodKey; time: string }[] {
  const table = day === 5 ? FRIDAY : MON_THU;
  return PERIOD_ORDER.filter((p) => table[p]).map((p) => ({ key: p, time: table[p]! }));
}

export function periodTime(day: Weekday, period: PeriodKey): string | undefined {
  return (day === 5 ? FRIDAY : MON_THU)[period];
}

export function isTutor(period: PeriodKey): boolean {
  return period === "TA" || period === "TB";
}

export function dayName(day: number): string {
  return WEEKDAYS.find((d) => d.day === day)?.name ?? "";
}

export function slotLabel(day: number, period: PeriodKey): string {
  const t = periodTime(day as Weekday, period);
  return `${dayName(day)} ${PERIOD_LABEL[period]}${t ? ` (${t})` : ""}`;
}
