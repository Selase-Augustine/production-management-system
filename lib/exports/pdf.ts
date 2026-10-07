import PDFDocument from "pdfkit";
import { generateReport, reportTitle, type ReportFilters } from "@/lib/reports/generate";
import { formatDisplayDate, formatDateISO } from "@/lib/dates";

export async function buildReportPdf(filters: ReportFilters): Promise<{ buffer: Buffer; filename: string }> {
  const report = await generateReport(filters);
  const landscape = filters.kind === "yearly" || report.columnKeys.length > 5;
  const doc = new PDFDocument({
    margin: 36,
    size: "A4",
    layout: landscape ? "landscape" : "portrait",
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const factory = process.env.FACTORY_NAME ?? "Factory Production";
  doc.rect(0, 0, doc.page.width, 56).fill("#1E3A5F");
  doc.fillColor("#FFFFFF").fontSize(16).text(factory, 36, 18);
  doc.fillColor("#111827").fontSize(13).text(reportTitle(filters.kind), 36, 72);
  doc.fontSize(10).fillColor("#4B5563");
  doc.text(`Period: ${formatDisplayDate(filters.start)} – ${formatDisplayDate(filters.end)}`);
  doc.text(`Generated: ${formatDisplayDate(new Date())}`);
  doc.moveDown();

  const headers = ["Product", ...report.columnKeys, "Total"];
  const usable = doc.page.width - 72;
  const colW = usable / headers.length;

  const drawRow = (values: string[], bold = false, y?: number) => {
    const startY = y ?? doc.y;
    if (startY > doc.page.height - 48) {
      doc.addPage();
    }
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#111827");
    values.forEach((v, i) => {
      doc.text(v, 36 + i * colW, doc.y, { width: colW - 4, continued: i < values.length - 1 });
    });
    doc.text("");
  };

  drawRow(headers, true);
  for (const row of report.rows) {
    drawRow([
      row.productName,
      ...report.columnKeys.map((k) => (row.columns[k] ?? 0).toFixed(1)),
      row.total.toFixed(1),
    ]);
  }
  drawRow([
    "TOTAL",
    ...report.columnKeys.map((k) => (report.columnTotals[k] ?? 0).toFixed(1)),
    report.grandTotal.toFixed(1),
  ], true);

  doc.moveDown();
  doc.fontSize(10).font("Helvetica-Bold").text("Summary");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Total production: ${report.grandTotal.toFixed(3)} tonnes`);
  doc.text(`Production days: ${report.productionDays}`);
  doc.text(`Completed days: ${report.completedDays}`);
  doc.text(`Incomplete days: ${report.incompleteDays}`);
  doc.text(`No-production shifts: ${report.noProductionShifts}`);
  doc.text(`Average production per day: ${report.averagePerDay.toFixed(3)} tonnes`);
  doc.moveDown();
  doc.font("Helvetica-Bold").text("Shift totals");
  doc.font("Helvetica");
  for (const [name, qty] of Object.entries(report.shiftTotals)) {
    doc.text(`${name}: ${qty.toFixed(3)} tonnes`);
  }

  doc.end();
  const buffer = await done;
  return { buffer, filename: `${filters.kind}-production-${formatDateISO(filters.start)}.pdf` };
}
