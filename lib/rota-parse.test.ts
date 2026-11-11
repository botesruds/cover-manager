import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSlot, parseSlotList, rowsToRota } from "./rota-parse.ts";
import { weekStart, nextSchoolDay, academicYearStart } from "./dates.ts";

test("parses lesson and tutor slots", () => {
  assert.deepEqual(parseSlot("Monday P4 (11:10)"), { day: 1, period: "P4" });
  assert.deepEqual(parseSlot("Friday P2 (08:40)"), { day: 5, period: "P2" });
  assert.deepEqual(parseSlot("Thursday Tutor B (12:45)"), { day: 4, period: "TB" });
  assert.equal(parseSlot("Someday P9"), null);
});

test("parses a cell with two tutor sessions", () => {
  assert.deepEqual(parseSlotList("Wednesday Tutor A (12:10); Wednesday Tutor B (12:45)"), [
    { day: 3, period: "TA" },
    { day: 3, period: "TB" },
  ]);
  assert.deepEqual(parseSlotList(null), []);
});

test("reads the Staff Rota sheet layout", () => {
  const rows = [
    ["Cover rota title"],
    ["Intro text"],
    ["Staff name", "Code", "First likely cover", "Second likely cover", "Tutor cover"],
    ["Rudi Botes", "RUB", "Tuesday P5 (13:20)", "Wednesday P3 (10:10)", "Monday Tutor B (12:45)"],
    ["Doaa Abotabl", "DOB", "Monday P1 (07:50)", "Friday P3 (09:50)", null],
  ];
  const { rows: out, problems } = rowsToRota(rows);
  assert.equal(problems.length, 0);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].lesson, [
    { day: 2, period: "P5" },
    { day: 3, period: "P3" },
  ]);
  assert.deepEqual(out[0].tutor, [{ day: 1, period: "TB" }]);
  assert.deepEqual(out[1].tutor, []);
});

test("week resets on Monday", () => {
  assert.equal(weekStart("2026-11-11"), "2026-11-09"); // Wednesday
  assert.equal(weekStart("2026-11-09"), "2026-11-09"); // Monday
  assert.equal(weekStart("2026-11-15"), "2026-11-09"); // Sunday belongs to the same week
  assert.equal(nextSchoolDay("2026-11-14"), "2026-11-16"); // Saturday -> Monday
  assert.equal(academicYearStart("2026-11-11"), "2026-09-01");
  assert.equal(academicYearStart("2027-03-01"), "2026-09-01");
});
