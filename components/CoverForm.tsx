"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logCover, type ActionState } from "@/app/actions.ts";

type Props = {
  date: string;
  period: string;
  staffId?: string;
  staffName?: string;
  /** When given, the form shows a picker for anyone (off-rota cover). */
  staffOptions?: { id: string; name: string; code: string }[];
  buttonLabel: string;
  buttonClass?: string;
  /** Picked from the timetable's free staff, so no off-rota warning. */
  extra?: boolean;
};

export function CoverForm({ date, period, staffId, staffName, staffOptions, buttonLabel, buttonClass, extra }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(logCover, { status: "idle" });
  const forceRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button type="button" className={buttonClass ?? "btn-primary"} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-2 w-full space-y-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3"
      onSubmit={() => {
        if (forceRef.current && state.status !== "confirm") forceRef.current.value = "0";
      }}
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="force" ref={forceRef} defaultValue="0" />
      {extra && <input type="hidden" name="extra" value="1" />}
      {staffOptions ? (
        <div>
          <label className="label">Who is covering</label>
          <select name="staff_id" required className="input" defaultValue="">
            <option value="" disabled>
              Choose a member of staff…
            </option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <input type="hidden" name="staff_id" value={staffId} />
          <p className="text-sm font-medium">Use {staffName} for this lesson?</p>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Absent teacher <span className="font-normal text-slate-400">(optional)</span></label>
          <input name="absent_teacher" className="input" />
        </div>
        <div>
          <label className="label">Class <span className="font-normal text-slate-400">(optional)</span></label>
          <input name="class_name" className="input" />
        </div>
      </div>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "confirm" ? (
        <div className="space-y-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
          <p>{state.message}</p>
          <div className="flex gap-2">
            <button
              className="btn-warn"
              disabled={pending}
              onClick={() => {
                if (forceRef.current) forceRef.current.value = "1";
              }}
            >
              Log anyway
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Confirm"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
