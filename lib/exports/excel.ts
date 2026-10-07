import ExcelJS from "exceljs";
import { generateReport, reportTitle, type ReportFilters } from "@/lib/reports/generate";
import { formatDisplayDate, formatDateISO } from "@/lib/dates";
import { formatTonnes } from "@/lib/utils";

export async function buildReportWorkbook(filters: ReportFilters) {
  const report = await generateReport(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Production Records System";
  const sheet = workbook.addWorksheet("Report");
  const factory = process.env.FACTORY_NAME ?? "Factory Production";
  const navy = "1E3A5F";

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = factory;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = reportTitle(filters.kind);
  sheet.getCell("A2").font = { bold: true, size: 13 };

  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value = `Period: ${formatDisplayDate(filters.start)} – ${formatDisplayDate(filters.end)}`;

  sheet.mergeCells("A4:F4");
  sheet.getCell("A4").value = `Generated: ${formatDisplayDate(new Date())}`;

  const header = ["Product", "Item Code", ...report.columnKeys, "Total"];
  const headerRow = sheet.addRow(header);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
    cell.alignment = { horizontal: "center" };
  });

  for (const row of report.rows) {
    sheet.addRow([
      row.productName,
      row.itemCode,
      ...report.columnKeys.map((k) => Number((row.columns[k] ?? 0).toFixed(3))),
      Number(row.total.toFixed(3)),
    ]);
  }

  const totalRow = sheet.addRow([
    "TOTAL",
    "",
    ...report.columnKeys.map((k) => Number((report.columnTotals[k] ?? 0).toFixed(3))),
    Number(report.grandTotal.toFixed(3)),
  ]);
  totalRow.font = { bold: true };

  sheet.addRow([]);
  sheet.addRow(["Summary"]);
  sheet.addRow(["Total production (tonnes)", Number(report.grandTotal.toFixed(3))]);
  sheet.addRow(["Production days", report.productionDays]);
  sheet.addRow(["Completed days", report.completedDays]);
  sheet.addRow(["Incomplete days", report.incompleteDays]);
  sheet.addRow(["No-production shifts", report.noProductionShifts]);
  sheet.addRow(["Average production per day", Number(report.averagePerDay.toFixed(3))]);
  sheet.addRow([]);
  sheet.addRow(["Shift totals"]);
  for (const [name, qty] of Object.entries(report.shiftTotals)) {
    sheet.addRow([name, Number(qty.toFixed(3))]);
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });

  return { workbook, filename: `${filters.kind}-production-${formatDateISO(filters.start)}.xlsx`, report };
}

export { formatTonnes };
