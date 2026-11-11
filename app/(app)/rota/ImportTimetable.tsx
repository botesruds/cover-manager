"use client";

import { useActionState } from "react";
import { confirmTimetable, previewTimetable, type TimetablePreview } from "./actions.ts";

export function ImportTimetable() {
  const [preview, previewAction, previewing] = useActionState<TimetablePreview, FormData>(previewTimetable, {
    status: "idle",
  });
  const [result, confirmAction, saving] = useActionState<TimetablePreview, FormData>(confirmTimetable, {
    status: "idle",
  });

  return (
    <section className="card space-y-3 p-4">
      <div>
        <h2 className="font-semibold">Upload the master timetable</h2>
        <p className="mt-1 text-xs text-slate-500">
          The TimeTabler staff timetable export (.xlsx). It is used to suggest extra cover options: staff who are free
          in a period but not on the rota for it. Study periods and placeholder codes are skipped.
        </p>
      </div>
      <form action={previewAction} className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button className="btn-ghost" disabled={previewing}>
          {previewing ? "Reading…" : "Check file"}
        </button>
      </form>
      {preview.status === "error" && <p className="text-sm text-red-600">{preview.message}</p>}
      {preview.status === "preview" && result.status !== "done" && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <p>
            Found free periods for <b>{preview.staff}</b> teachers.
          </p>
          {preview.newStaff.length > 0 && (
            <p>
              Not yet in the app, will be added (not to the rota): {preview.newStaff.join(", ")}
            </p>
          )}
          {preview.problems.map((p) => (
            <p key={p} className="text-amber-800">
              {p}
            </p>
          ))}
          <form action={confirmAction}>
            <input type="hidden" name="payload" value={preview.payload} />
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Replace the timetable with this file"}
            </button>
          </form>
        </div>
      )}
      {result.status === "error" && <p className="text-sm text-red-600">{result.message}</p>}
      {result.status === "done" && <p className="text-sm text-emerald-700">{result.message}</p>}
    </section>
  );
}
