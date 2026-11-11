import { test } from "node:test";
import assert from "node:assert/strict";
import { candidatesFor, extrasFor } from "./candidates.ts";
import type { Cover, Staff } from "./types.ts";

const mk = (id: string, name: string, day: number, period: string, option = 1): Staff => ({
  id,
  code: id.toUpperCase(),
  name,
  teaches: null,
  active: true,
  offer_as_extra: true,
  rota_slots: [{ id: id + "s", staff_id: id, kind: "lesson", day, period: period as never, option }],
});

const cover = (staff_id: string, cover_date: string, period: string): Cover => ({
  id: staff_id + cover_date + period,
  staff_id,
  cover_date,
  period: period as never,
  absent_teacher: null,
  class_name: null,
  notes: null,
  on_rota: true,
  created_at: "",
});

test("used-this-week people drop below available ones", () => {
  const staff = [mk("a", "Ann", 3, "P2"), mk("b", "Ben", 3, "P2"), mk("c", "Cal", 4, "P2")];
  const week = [cover("a", "2026-11-09", "P1")];
  const res = candidatesFor(staff, 3, "P2", "2026-11-11", week, new Map());
  assert.deepEqual(
    res.map((r) => [r.staff.name, r.status]),
    [
      ["Ben", "available"],
      ["Ann", "used"],
    ],
  );
});

test("fewest covers this year comes first", () => {
  const staff = [mk("a", "Ann", 1, "P1"), mk("b", "Ben", 1, "P1")];
  const counts = new Map([
    ["a", { staff_id: "a", total: 3, weeks: 3, last_date: "2026-11-02" }],
    ["b", { staff_id: "b", total: 1, weeks: 1, last_date: "2026-10-01" }],
  ]);
  const res = candidatesFor(staff, 1, "P1", "2026-11-09", [], counts);
  assert.deepEqual(res.map((r) => r.staff.name), ["Ben", "Ann"]);
});

test("the person already covering this slot is shown first", () => {
  const staff = [mk("a", "Ann", 1, "P1"), mk("b", "Ben", 1, "P1")];
  const res = candidatesFor(staff, 1, "P1", "2026-11-09", [cover("b", "2026-11-09", "P1")], new Map());
  assert.equal(res[0].staff.name, "Ben");
  assert.equal(res[0].status, "covering");
});

test("extras: free per timetable, not on the rota for this slot", () => {
  const staff = [mk("a", "Ann", 3, "P2"), mk("b", "Ben", 1, "P1"), mk("c", "Cal", 1, "P1"), mk("d", "Dee", 1, "P1")];
  staff[3].offer_as_extra = false;
  const free = new Map([
    ["a", new Set(["A-P2", "B-P2"])], // on the rota for Wed P2 already
    ["b", new Set(["A-P2", "B-P2"])], // free both weeks
    ["c", new Set(["A-P2"])], // free in Week A only
    ["d", new Set(["A-P2", "B-P2"])], // hidden from extras
  ]);
  const names = (w: "A" | "B" | null) =>
    extrasFor(staff, free, w, 3, "P2", "2026-11-11", [], new Map()).map((c) => c.staff.name);
  assert.deepEqual(names(null), ["Ben"]);
  assert.deepEqual(names("A"), ["Ben", "Cal"]);
  assert.deepEqual(names("B"), ["Ben"]);
});
