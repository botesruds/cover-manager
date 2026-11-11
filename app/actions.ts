"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server.ts";
import { addDays, formatShort, isoWeekday, isValidISO, weekStart } from "@/lib/dates.ts";
import { PERIOD_ORDER, slotLabel, type PeriodKey } from "@/lib/schedule.ts";

export type ActionState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "confirm"; message: string }
  | { status: "error"; message: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function logCover(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const staffId = str(fd, "staff_id");
  const date = str(fd, "date");
  const period = str(fd, "period") as PeriodKey;
  const force = str(fd, "force") === "1";
  // Chosen from the timetable's free list: being off-rota is expected there.
  const extra = str(fd, "extra") === "1";

  if (!staffId) return { status: "error", message: "Choose a member of staff." };
  if (!isValidISO(date)) return { status: "error", message: "That date is not valid." };
  if (!PERIOD_ORDER.includes(period)) return { status: "error", message: "That period is not valid." };
  const day = isoWeekday(date);
  if (day > 5) return { status: "error", message: "Cover can only be set on a school day." };

  const supabase = await createClient();
  const { data: person, error: pErr } = await supabase
    .from("staff")
    .select("id, name, rota_slots(day, period)")
    .eq("id", staffId)
    .single();
  if (pErr || !person) return { status: "error", message: "Could not find that member of staff." };

  const onRota = (person.rota_slots as { day: number; period: string }[]).some(
    (s) => s.day === day && s.period === period,
  );

  const ws = weekStart(date);
  const { data: already, error: cErr } = await supabase
    .from("covers")
    .select("cover_date, period")
    .eq("staff_id", staffId)
    .gte("cover_date", ws)
    .lte("cover_date", addDays(ws, 6));
  if (cErr) return { status: "error", message: cErr.message };

  if (!force) {
    const warnings: string[] = [];
    if (already && already.length > 0) {
      const when = already
        .map((c) => `${formatShort(c.cover_date)} ${c.period === "TA" ? "Tutor A" : c.period === "TB" ? "Tutor B" : c.period}`)
        .join(", ");
      warnings.push(`${person.name} has already covered this week (${when}).`);
    }
    if (!onRota && !extra) warnings.push(`${person.name} is not on the rota for ${slotLabel(day, period)}.`);
    if (warnings.length) return { status: "confirm", message: warnings.join(" ") };
  }

  const { error } = await supabase.from("covers").insert({
    staff_id: staffId,
    cover_date: date,
    period,
    absent_teacher: str(fd, "absent_teacher") || null,
    class_name: str(fd, "class_name") || null,
    notes: str(fd, "notes") || null,
    on_rota: onRota,
  });
  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: `${person.name} is already logged for this period.` };
    }
    return { status: "error", message: error.message };
  }
  refresh();
  return { status: "ok", message: `Logged ${person.name} for ${slotLabel(day, period)}.` };
}

export async function deleteCover(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("covers").delete().eq("id", id);
  refresh();
}

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(fd, "email"),
    password: str(fd, "password"),
  });
  if (error) return { status: "error", message: "Email or password is not right." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
