import PDFDocument from "pdfkit";
import { generateReport, type ReportFilters } from "@/lib/reports/generate";
import { formatDateISO } from "@/lib/dates";
import { formatReportCell, formatReportTonnes, toReportDocument, type ReportDocumentModel } from "@/lib/reports/document";

const NAVY = "#1E3A5F";
const MUTED = "#5B6778";
const LINE = "#D7DEE8";
const INK = "#1A2332";
const ACCENT = "#2F6FED";
const FOOTER = "Generated from Production Management System • Designed by Selase I.T. Solutions";

export async function buildReportPdf(
  filters: ReportFilters,
  preparedBy: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const report = await generateReport(filters);
  const model = toReportDocument(report, preparedBy);
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 36, bottom: 46, left: 36, right: 36 },
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  drawHeader(doc, model);
  drawKpis(doc, model);
  drawProductTable(doc, model);
  drawCharts(doc, model);
  drawSummary(doc, model);
  drawShiftTable(doc, model);
  stampFooters(doc);

  doc.end();
  const buffer = await done;
  return { buffer, filename: `${filters.kind}-production-${formatDateISO(filters.start)}.pdf` };
}

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function bottomLimit(doc: PDFKit.PDFDocument) {
  return doc.page.height - doc.page.margins.bottom;
}

function ensure(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed <= bottomLimit(doc)) return;
  doc.addPage();
  doc.y = doc.page.margins.top;
}

function drawHeader(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.rect(left, 28, 4, 62).fill(NAVY);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(18).text(model.factory, left + 14, 28, { width: width - 14 });
  doc.fontSize(13).text(model.title, left + 14, 50, { width: width - 14 });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  doc.text(`Period: ${model.period}`, left + 14, 70, { width: width * 0.55 });
  doc.text(`Generated: ${model.generated}`, left + width * 0.55, 70, { width: width * 0.45, align: "right" });
  doc.text(`Prepared by: ${model.preparedBy}`, left + 14, 84, { width: width - 14 });
  doc.y = 108;
}

function drawKpis(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  const left = doc.page.margins.left;
  const gap = 10;
  const width = (contentWidth(doc) - gap * 3) / 4;
  const y = doc.y;
  model.kpis.forEach((kpi, index) => {
    const x = left + index * (width + gap);
    doc.roundedRect(x, y, width, 48, 4).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(kpi.label.toUpperCase(), x + 10, y + 8, { width: width - 20 });
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14).text(kpi.value, x + 10, y + 22, { width: width - 20 });
  });
  doc.y = y + 62;
}

function drawProductTable(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  sectionTitle(doc, "Production by Product");
  const headers = ["Product", ...model.columns, "Total"];
  const values = model.tableRows.map((row) => [
    row.product,
    ...row.cells.map((cell) => formatReportCell(cell)),
    formatReportTonnes(row.total),
  ]);
  values.push(["Total", ...model.columnTotals.map((value) => formatReportTonnes(value)), formatReportTonnes(model.grandTotal)]);
  drawTable(doc, headers, values, values.length - 1);
}

function drawCharts(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const gap = 16;
  const col = (width - gap) / 2;
  const productHeight = Math.max(120, 28 + model.productBars.length * 16);
  const shiftHeight = Math.max(120, 28 + model.shiftBars.length * 22);
  const block = Math.max(productHeight, shiftHeight) + 28;
  ensure(doc, block + 8);
  const y = doc.y;
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("Production by Product", left, y, { width: col });
  drawHorizontalBars(doc, left, y + 18, col, model.productBars);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("Production by Shift", left + col + gap, y, { width: col });
  drawShiftBars(doc, left + col + gap, y + 18, col, model.shiftBars);
  doc.y = y + block;

  const trendHeight = 150;
  ensure(doc, trendHeight + 24);
  sectionTitle(doc, model.trendTitle);
  drawLineChart(doc, doc.page.margins.left, doc.y, contentWidth(doc), 128, model.trend);
  doc.y += 140;
}

function drawSummary(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  sectionTitle(doc, "Production Summary");
  const left = doc.page.margins.left;
  const colW = contentWidth(doc) / 2;
  ensure(doc, 18 * model.summary.length);
  const start = doc.y;
  model.summary.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = left + col * colW;
    const y = start + row * 18;
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(item.label, x, y, { width: colW * 0.62 });
    doc.fillColor(INK).font("Helvetica-Bold").text(item.value, x + colW * 0.62, y, { width: colW * 0.34, align: "right" });
  });
  doc.y = start + Math.ceil(model.summary.length / 2) * 18 + 12;
}

function drawShiftTable(doc: PDFKit.PDFDocument, model: ReportDocumentModel) {
  sectionTitle(doc, "Shift Summary");
  const rows = model.shiftBars.map((shift) => [shift.name, `${formatReportTonnes(shift.tonnes)} tonnes`, shift.status]);
  drawTable(doc, ["Shift", "Total production", "Status"], rows);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensure(doc, 28);
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12).text(title, doc.page.margins.left, doc.y);
  doc.moveDown(0.35);
  const y = doc.y;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + contentWidth(doc), y).lineWidth(0.6).strokeColor(LINE).stroke();
  doc.y = y + 8;
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], boldRow = -1) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const productShare = headers.length > 8 ? 0.16 : 0.22;
  const firstW = width * productShare;
  const otherW = (width - firstW) / (headers.length - 1);
  const rowH = headers.length > 10 ? 15 : 17;
  const fontSize = headers.length > 10 ? 7 : 8;

  const paintHeader = () => {
    ensure(doc, rowH + 4);
    const y = doc.y;
    doc.rect(left, y, width, rowH).fill(NAVY);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(fontSize);
    headers.forEach((header, index) => {
      const x = index === 0 ? left : left + firstW + (index - 1) * otherW;
      const cellW = index === 0 ? firstW : otherW;
      doc.text(header, x + 4, y + 4, {
        width: cellW - 8,
        align: index === 0 ? "left" : "right",
        lineBreak: false,
      });
    });
    doc.y = y + rowH;
  };

  paintHeader();
  rows.forEach((row, rowIndex) => {
    if (doc.y + rowH > bottomLimit(doc)) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      paintHeader();
    }
    const y = doc.y;
    const bold = rowIndex === boldRow;
    if (bold) doc.rect(left, y, width, rowH).fill("#F4F6F8");
    doc.rect(left, y, width, rowH).lineWidth(0.4).strokeColor(LINE).stroke();
    doc.fillColor(INK).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    row.forEach((cell, index) => {
      const x = index === 0 ? left : left + firstW + (index - 1) * otherW;
      const cellW = index === 0 ? firstW : otherW;
      doc.text(cell, x + 4, y + 4, {
        width: cellW - 8,
        align: index === 0 ? "left" : "right",
        lineBreak: false,
        ellipsis: true,
      });
    });
    doc.y = y + rowH;
  });
  doc.y += 14;
}

function drawHorizontalBars(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  items: Array<{ name: string; tonnes: number }>,
) {
  if (items.length === 0) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("No production in this period.", x, y, { width });
    return;
  }
  const max = Math.max(...items.map((item) => item.tonnes), 0.1);
  const labelW = Math.min(130, width * 0.34);
  const valueW = 48;
  const barMax = width - labelW - valueW - 8;
  items.forEach((item, index) => {
    const rowY = y + index * 16;
    doc.fillColor(INK).font("Helvetica").fontSize(8).text(item.name, x, rowY, { width: labelW - 6, ellipsis: true, lineBreak: false });
    const barW = Math.max(2, (item.tonnes / max) * barMax);
    doc.roundedRect(x + labelW, rowY + 1, barW, 9, 2).fill(NAVY);
    doc.fillColor(MUTED).fontSize(7).text(formatReportTonnes(item.tonnes), x + labelW + barMax + 6, rowY, {
      width: valueW,
      lineBreak: false,
    });
  });
}

function drawShiftBars(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  items: Array<{ name: string; tonnes: number }>,
) {
  if (items.length === 0) return;
  const max = Math.max(...items.map((item) => item.tonnes), 0.1);
  const slot = width / items.length;
  const barW = Math.min(36, slot * 0.45);
  const chartH = 78;
  items.forEach((item, index) => {
    const barH = Math.max(item.tonnes > 0 ? 3 : 0, (item.tonnes / max) * chartH);
    const bx = x + index * slot + (slot - barW) / 2;
    doc.roundedRect(bx, y + chartH - barH, barW, barH, 2).fill(index === 1 ? ACCENT : NAVY);
    doc.fillColor(INK).font("Helvetica").fontSize(8).text(item.name, x + index * slot, y + chartH + 6, {
      width: slot,
      align: "center",
    });
    doc.fillColor(MUTED).fontSize(7).text(formatReportTonnes(item.tonnes), x + index * slot, y + chartH + 18, {
      width: slot,
      align: "center",
    });
  });
}

function drawLineChart(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  points: Array<{ label: string; tonnes: number }>,
) {
  if (points.length === 0) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("No days in this period.", x, y);
    return;
  }
  const max = Math.max(...points.map((point) => point.tonnes), 0.1);
  const padL = 36;
  const padB = 22;
  const plotW = width - padL - 8;
  const plotH = height - padB - 8;
  doc.moveTo(x + padL, y).lineTo(x + padL, y + plotH).lineTo(x + padL + plotW, y + plotH).lineWidth(0.6).strokeColor(LINE).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(7).text(formatReportTonnes(max), x, y - 2, { width: padL - 4, align: "right" });
  doc.text("0.0", x, y + plotH - 4, { width: padL - 4, align: "right" });

  const coords = points.map((point, index) => {
    const px = x + padL + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
    const py = y + plotH - (point.tonnes / max) * plotH;
    return { ...point, px, py };
  });
  if (coords.length > 1) {
    doc.moveTo(coords[0].px, coords[0].py);
    for (const point of coords.slice(1)) doc.lineTo(point.px, point.py);
    doc.lineWidth(1.4).strokeColor(NAVY).stroke();
  }
  for (const point of coords) {
    doc.circle(point.px, point.py, 2).fill(ACCENT);
  }
  const step = Math.max(1, Math.ceil(points.length / 8));
  coords.forEach((point, index) => {
    if (index % step !== 0 && index !== coords.length - 1) return;
    doc.fillColor(MUTED).fontSize(6).text(point.label, point.px - 18, y + plotH + 4, { width: 36, align: "center" });
  });
}

function stampFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const y = doc.page.height - 28;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text(FOOTER, 36, y, { width: doc.page.width - 160, lineBreak: false });
    doc.text(`Page ${index + 1} of ${range.count}`, doc.page.width - 130, y, { width: 94, align: "right", lineBreak: false });
  }
}
