import ExcelJS from "exceljs";
import {
  plannerListToRota,
  rowsToRota,
  teachesFromPlannerList,
  type RotaRow,
} from "./rota-parse.ts";
import { parseTimetable } from "./timetable-parse.ts";

function sheetRows(ws: ExcelJS.Worksheet): unknown[][] {
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const vals = row.values as unknown[]; // 1-based
    rows.push(vals.slice(1));
  });
  return rows;
}

/**
 * Read a cover rota workbook. Uses the "Planner List" sheet when present (it
 * includes hand-placed tutor cover), otherwise the "Staff Rota" sheet.
 */
export async function readRotaWorkbook(
  data: ArrayBuffer,
): Promise<{ rows: RotaRow[]; problems: string[]; source: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const find = (name: string) =>
    wb.worksheets.find((w) => w.name.trim().toLowerCase() === name.toLowerCase());

  const planner = find("Planner List");
  if (planner) {
    const res = plannerListToRota(sheetRows(planner));
    if (res.rows.length > 0) return { ...res, source: "Planner List" };
  }
  const rota = find("Staff Rota") ?? wb.worksheets[0];
  if (!rota) return { rows: [], problems: ["The workbook has no sheets."], source: "" };
  const teaches = planner ? teachesFromPlannerList(sheetRows(planner)) : new Map();
  return { ...rowsToRota(sheetRows(rota), teaches), source: rota.name };
}

/** Read the TimeTabler master staff timetable (first sheet, or "Staff Timetable"). */
export async function readTimetableWorkbook(data: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws =
    wb.worksheets.find((w) => w.name.trim().toLowerCase() === "staff timetable") ?? wb.worksheets[0];
  if (!ws) return { staff: [], problems: ["The workbook has no sheets."] };
  return parseTimetable(sheetRows(ws));
}
