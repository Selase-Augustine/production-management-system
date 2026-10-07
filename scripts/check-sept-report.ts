import { prisma } from "../lib/db/prisma";
import { generateReport } from "../lib/reports/generate";
import { toReportDocument } from "../lib/reports/document";

async function main() {
  const start = new Date(Date.UTC(2026, 8, 1));
  const end = new Date(Date.UTC(2026, 8, 30));
  const report = await generateReport({ kind: "monthly", start, end, year: 2026, month: 9 });
  const records = await prisma.productionRecord.findMany({
    where: {
      productionShift: {
        status: "PRODUCED",
        productionDay: { productionDate: { gte: start, lte: end } },
      },
    },
    select: { quantityTonnes: true, productionShift: { select: { productionDay: { select: { productionDate: true } } } } },
  });
  const dbTotal = records.reduce((sum, row) => sum + Number(row.quantityTonnes), 0);
  const dbDays = new Set(records.map((row) => row.productionShift.productionDay.productionDate.toISOString().slice(0, 10))).size;
  const user = await prisma.user.findUnique({
    where: { email: "manager@example.com" },
    select: { name: true },
  });
  const doc = toReportDocument(report, user?.name ?? "");
  const trendSum = doc.trend.reduce((sum, point) => sum + point.tonnes, 0);
  console.log(
    JSON.stringify(
      {
        reportTotal: report.grandTotal,
        dbTotal,
        match: Math.abs(report.grandTotal - dbTotal) < 0.001,
        productionDays: report.productionDays,
        dbDays,
        noProduction: report.noProductionShifts,
        average: report.averagePerDay,
        shifts: report.shiftTotals,
        products: report.rows.map((row) => ({ name: row.productName, total: row.total })),
        trendPoints: doc.trend.length,
        trendSum,
        preparedBy: doc.preparedBy,
        period: doc.period,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
