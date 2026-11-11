"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStaff } from "./actions.ts";
import type { ActionState } from "@/app/actions.ts";
import { PERIOD_LABEL, WEEKDAYS, periodsForDay } from "@/lib/schedule.ts";
import type { Staff } from "@/lib/types.ts";

const LESSON_OPTIONS = WEEKDAYS.flatMap((d) =>
  periodsForDay(d.day)
    .filter((p) => p.key !== "TA" && p.key !== "TB")
    .map((p) => ({ value: `${d.day}-${p.key}`, label: `${d.name} ${p.key} (${p.time})` })),
);
const TUTOR_OPTIONS = WEEKDAYS.filter((d) => d.day < 5).flatMap((d) =>
  (["TA", "TB"] as const).map((p) => ({ value: `${d.day}-${p}`, label: `${d.short} ${PERIOD_LABEL[p]}` })),
);

export function StaffEditor({ staff }: { staff?: Staff }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveStaff, { status: "idle" });

  useEffect(() => {
    if (state.status === "ok") setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        className={staff ? "cursor-pointer text-xs text-brand-700 hover:underline" : "btn-primary"}
        onClick={() => setOpen(true)}
      >
        {staff ? "Edit" : "Add staff"}
      </button>
    );
  }

  const slot = (opt: number) => {
    const s = staff?.rota_slots.find((r) => r.kind === "lesson" && r.option === opt);
    return s ? `${s.day}-${s.period}` : "";
  };
  const tutor = new Set(staff?.rota_slots.filter((r) => r.kind === "tutor").map((r) => `${r.day}-${r.period}`));

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/30 p-4 pt-20 text-left">
      <form action={action} className="card w-full max-w-lg space-y-3 p-5 text-slate-900">
        <h3 className="text-lg font-semibold">{staff ? `Edit ${staff.name}` : "Add a member of staff"}</h3>
        {staff && <input type="hidden" name="id" value={staff.id} />}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label">Name</label>
            <input name="name" required defaultValue={staff?.name} className="input" />
          </div>
          <div>
            <label className="label">Code</label>
            <input name="code" required defaultValue={staff?.code} className="input uppercase" />
          </div>
        </div>
        <div>
          <label className="label">Teaches</label>
          <input name="teaches" defaultValue={staff?.teaches ?? ""} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((n) => (
            <div key={n}>
              <label className="label">{n === 1 ? "First" : "Second"} likely cover</label>
              <select name={`lesson${n}`} defaultValue={slot(n)} className="input">
                <option value="">None</option>
                {LESSON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <fieldset>
          <legend className="label">Tutor cover</legend>
          <div className="grid grid-cols-4 gap-1 text-sm">
            {TUTOR_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-1.5">
                <input type="checkbox" name="tutor" value={o.value} defaultChecked={tutor.has(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="offer_as_extra" defaultChecked={staff ? staff.offer_as_extra : true} />
          Suggest as an extra option when the timetable shows them free
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={staff ? staff.active : true} />
          Still at the school (untick when someone leaves; their history is kept)
        </label>
        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
