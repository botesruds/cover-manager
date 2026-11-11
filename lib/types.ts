import type { PeriodKey } from "./schedule.ts";

export type Slot = {
  id: string;
  staff_id: string;
  kind: "lesson" | "tutor";
  day: number;
  period: PeriodKey;
  option: number | null;
};

export type Staff = {
  id: string;
  code: string;
  name: string;
  teaches: string | null;
  active: boolean;
  offer_as_extra: boolean;
  rota_slots: Slot[];
};

export type Cover = {
  id: string;
  staff_id: string;
  cover_date: string;
  period: PeriodKey;
  absent_teacher: string | null;
  class_name: string | null;
  notes: string | null;
  on_rota: boolean;
  created_at: string;
};

export type CoverCount = { staff_id: string; total: number; weeks: number; last_date: string | null };
