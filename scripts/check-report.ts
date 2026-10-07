import { generateReport } from "../lib/reports/generate";

async function main() {
  const date = new Date("2026-09-02T00:00:00.000Z");
  const report = await generateReport({ kind: "daily", start: date, end: date });
  console.log({
    total: report.grandTotal,
    rows: report.rows.map((r) => ({ name: r.productName, total: r.total, cols: r.columns })),
    shifts: report.shiftTotals,
  });
}

main();
