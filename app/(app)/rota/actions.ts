"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server.ts";
import { readRotaWorkbook } from "@/lib/workbook.ts";
import { toImportPayload, type ImportStaff } from "@/lib/rota-parse.ts";
import { PERIOD_ORDER, isTutor, type PeriodKey } from "@/lib/schedule.ts";
import type { ActionState } from "@/app/actions.ts";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** "3-P2" -> { day: 3, period: "P2" } */
function parseSlotValue(v: string): { day: number; period: PeriodKey } | null {
  const m = v.match(/^([1-5])-(P[1-6]|TA|TB)$/);
  if (!m) return null;
  const period = m[2] as PeriodKey;
  if (!PERIOD_ORDER.includes(period)) return null;
  if (Number(m[1]) === 5 && !["P1", "P2", "P3", "P4"].includes(period)) return null;
  return { day: Number(m[1]), period };
}

export async function saveStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const code = str(fd, "code").toUpperCase();
  const teaches = str(fd, "teaches") || null;
  const active = str(fd, "active") === "on";
  if (!name || !code) return { status: "error", message: "Name and code are both needed." };

  const slots: { kind: "lesson" | "tutor"; day: number; period: PeriodKey; option: number | null }[] = [];
  for (const [i, key] of ["lesson1", "lesson2"].entries()) {
    const v = str(fd, key);
    if (!v) continue;
    const s = parseSlotValue(v);
    if (!s || isTutor(s.period)) return { status: "error", message: "A lesson slot is not valid." };
    slots.push({ kind: "lesson", ...s, option: i + 1 });
  }
  for (const v of fd.getAll("tutor")) {
    if (typeof v !== "string" || !v) continue;
    const s = parseSlotValue(v);
    if (!s || !isTutor(s.period)) return { status: "error", message: "A tutor slot is not valid." };
    slots.push({ kind: "tutor", ...s, option: null });
  }
  const keys = new Set(slots.map((s) => `${s.day}-${s.period}`));
  if (keys.size !== slots.length) return { status: "error", message: "The same slot is chosen twice." };

  const dupMsg = (code: string) => `Code ${code} is already used by someone else.`;
  let staffId = id;
  if (id) {
    const { error } = await supabase.from("staff").update({ name, code, teaches, active }).eq("id", id);
    if (error) return { status: "error", message: error.code === "23505" ? dupMsg(code) : error.message };
  } else {
    const { data, error } = await supabase
      .from("staff")
      .insert({ name, code, teaches, active })
      .select("id")
      .single();
    if (error || !data) {
      return {
        status: "error",
        message: error?.code === "23505" ? dupMsg(code) : (error?.message ?? "Could not add."),
      };
    }
    staffId = data.id;
  }

  const { error: delErr } = await supabase.from("rota_slots").delete().eq("staff_id", staffId);
  if (delErr) return { status: "error", message: delErr.message };
  if (slots.length) {
    const { error } = await supabase
      .from("rota_slots")
      .insert(slots.map((s) => ({ ...s, staff_id: staffId })));
    if (error) return { status: "error", message: error.message };
  }
  revalidatePath("/", "layout");
  return { status: "ok", message: `Saved ${name}.` };
}

export type ImportPreview =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "preview";
      source: string;
      payload: string;
      staff: number;
      lessonSlots: number;
      tutorSlots: number;
      added: string[];
      removed: string[];
      problems: string[];
    }
  | { status: "done"; message: string };

export async function previewImport(_prev: ImportPreview, fd: FormData): Promise<ImportPreview> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a spreadsheet first." };
  }
  let parsed;
  try {
    parsed = await readRotaWorkbook(await file.arrayBuffer());
  } catch {
    return { status: "error", message: "Could not read that file. Is it an .xlsx spreadsheet?" };
  }
  if (parsed.rows.length === 0) {
    return { status: "error", message: parsed.problems[0] ?? "No staff found in that file." };
  }
  const payload: ImportStaff[] = toImportPayload(parsed.rows);

  const supabase = await createClient();
  const { data: current } = await supabase.from("staff").select("code, name").eq("active", true);
  const now = new Set((current ?? []).map((s) => s.code));
  const next = new Set(payload.map((s) => s.code));

  return {
    status: "preview",
    source: parsed.source,
    payload: JSON.stringify(payload),
    staff: payload.length,
    lessonSlots: payload.reduce((n, s) => n + s.slots.filter((x) => x.kind === "lesson").length, 0),
    tutorSlots: payload.reduce((n, s) => n + s.slots.filter((x) => x.kind === "tutor").length, 0),
    added: payload.filter((s) => !now.has(s.code)).map((s) => `${s.name} (${s.code})`),
    removed: (current ?? []).filter((s) => !next.has(s.code)).map((s) => `${s.name} (${s.code})`),
    problems: parsed.problems,
  };
}

export async function confirmImport(_prev: ImportPreview, fd: FormData): Promise<ImportPreview> {
  let payload: unknown;
  try {
    payload = JSON.parse(str(fd, "payload"));
  } catch {
    return { status: "error", message: "The import data was lost. Please upload the file again." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_rota", { payload });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/", "layout");
  const r = data as { staff: number; slots: number; deactivated: number };
  return {
    status: "done",
    message:
      `Rota updated: ${r.staff} staff and ${r.slots} slots.` +
      (r.deactivated
        ? ` ${r.deactivated} staff no longer on the rota were set to inactive (their history is kept).`
        : ""),
  };
}
