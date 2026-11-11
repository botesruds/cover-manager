"use client";

import { useActionState } from "react";
import { confirmImport, previewImport, type ImportPreview } from "./actions.ts";

export function ImportRota() {
  const [preview, previewAction, previewing] = useActionState<ImportPreview, FormData>(previewImport, {
    status: "idle",
  });
  const [result, confirmAction, saving] = useActionState<ImportPreview, FormData>(confirmImport, {
    status: "idle",
  });

  return (
    <section className="card space-y-3 p-4">
      <div>
        <h2 className="font-semibold">Upload a new rota</h2>
        <p className="mt-1 text-xs text-slate-500">
          Use the cover rota spreadsheet (.xlsx). It reads the Planner List tab, or the Staff Rota tab if there is no
          Planner List. You will see what changes before anything is saved. Cover history is never touched.
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
            Found <b>{preview.staff}</b> staff with <b>{preview.lessonSlots}</b> lesson slots and{" "}
            <b>{preview.tutorSlots}</b> tutor slots (from the {preview.source} tab).
          </p>
          {preview.added.length > 0 && <p>New: {preview.added.join(", ")}</p>}
          {preview.removed.length > 0 && (
            <p className="text-amber-800">
              No longer on the rota (will be set to inactive): {preview.removed.join(", ")}
            </p>
          )}
          {preview.problems.length > 0 && (
            <ul className="list-disc pl-5 text-amber-800">
              {preview.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <form action={confirmAction}>
            <input type="hidden" name="payload" value={preview.payload} />
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Replace the rota with this file"}
            </button>
          </form>
        </div>
      )}
      {result.status === "error" && <p className="text-sm text-red-600">{result.message}</p>}
      {result.status === "done" && <p className="text-sm text-emerald-700">{result.message}</p>}
    </section>
  );
}
