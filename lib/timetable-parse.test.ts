import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimetable } from "./timetable-parse.ts";

test("reads free periods per week and skips placeholders", () => {
  const rows = [
    [null, "AMon", null, null, "BMon", null, null],
    [null, "Y03-13 P1", "Y07-13 R1", "Y05-13 P2", "Y03-13 P1", "Y07-13 R1", "Y05-13 P2"],
    [],
    ["CAN", "\n", "\n", "10/GCENG\n4111", "7X\n4101", "\n", "\n"],
    ["12D", "\n", "\n", "\n", "\n", "\n", "\n"],
    ["ZZZ", "\n", "\n", "9X\n1", "\n", "\n", "\n"],
    ["CAN - Carly Noonan", "12D - Study Period Y12 IBDP"],
  ];
  const { staff } = parseTimetable(rows);
  assert.equal(staff.length, 1);
  assert.deepEqual(staff[0], {
    code: "CAN",
    name: "Carly Noonan",
    lessons: 2,
    free: { A: ["1-P1", "1-TA"], B: ["1-TA", "1-P2"] },
  });
});
