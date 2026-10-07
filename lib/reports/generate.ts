import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { formatDateISO, monthName, quarterMonths } from "@/lib/dates";
import { Prisma } from "@prisma/client";

export type ReportKind = "daily" | "monthly" | "quarterly" | "yearly" | "custom";

export type ReportFilters = {
  kind: ReportKind;
  start: Date;
  end: Date;
  productId?: string;
  shiftId?: string;
  year?: number;
  month?: number;
  quarter?: 1 | 2 | 3 | 4;
};

export type PivotRow = {
  productId: string;
  productName: string;
  itemCode: string;
  columns: Record<string, number>;
  total: number;
};

async function loadRecords(filters: ReportFilters) {
  const where: Prisma.ProductionRecordWhereInput = {
    productionShift: {
      status: "PRODUCED",
      productionDay: {
        productionDate: { gte: filters.start, lte: filters.end },
      },
      ...(filters.shiftId ? { shiftId: filters.shiftId } : {}),
    },
    ...(filters.productId ? { productId: filters.productId } : {}),
  };

  return prisma.productionRecord.findMany({
    where,
    include: {
      product: true,
      productionShift: {
        include: {
          shift: true,
          productionDay: true,
        },
      },
    },
  });
}

async function loadNoProduction(filters: ReportFilters) {
  return prisma.productionShift.count({
    where: {
      status: "NO_PRODUCTION",
      ...(filters.shiftId ? { shiftId: filters.shiftId } : {}),
      productionDay: {
        productionDate: { gte: filters.start, lte: filters.end },
      },
    },
  });
}

function emptyColumns(keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

export async function generateReport(filters: ReportFilters) {
  const [records, products, shifts, noProductionShifts] = await Promise.all([
    loadRecords(filters),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { sequence: "asc" } }),
    loadNoProduction(filters),
  ]);

  const columnKeys =
    filters.kind === "yearly"
      ? monthNameKeys()
      : filters.kind === "quarterly"
        ? quarterMonthKeys(filters.year ?? filters.start.getUTCFullYear(), filters.quarter ?? 1)
        : shifts.map((s) => s.name);

  const byProduct = new Map<string, PivotRow>();
  for (const product of products) {
    if (filters.productId && product.id !== filters.productId) continue;
    byProduct.set(product.id, {
      productId: product.id,
      productName: product.name,
      itemCode: product.itemCode,
      columns: emptyColumns(columnKeys),
      total: 0,
    });
  }

  const shiftTotals = Object.fromEntries(shifts.map((s) => [s.name, 0])) as Record<string, number>;
  const dailyTotals = new Map<string, number>();

  for (const rec of records) {
    const qty = toNumber(rec.quantityTonnes);
    const row = byProduct.get(rec.productId);
    if (!row) continue;
    const col =
      filters.kind === "yearly"
        ? monthName(rec.productionShift.productionDay.productionDate.getUTCMonth()).slice(0, 3)
        : filters.kind === "quarterly"
          ? monthName(rec.productionShift.productionDay.productionDate.getUTCMonth())
          : rec.productionShift.shift.name;
    row.columns[col] = (row.columns[col] ?? 0) + qty;
    row.total += qty;
    shiftTotals[rec.productionShift.shift.name] =
      (shiftTotals[rec.productionShift.shift.name] ?? 0) + qty;
    const dayKey = formatDateISO(rec.productionShift.productionDay.productionDate);
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + qty);
  }

  const rows = [...byProduct.values()].filter((r) => r.total > 0 || filters.kind !== "custom");
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const columnTotals = emptyColumns(columnKeys);
  for (const row of rows) {
    for (const key of columnKeys) {
      columnTotals[key] += row.columns[key] ?? 0;
    }
  }

  const productionDays = await prisma.productionDay.findMany({
    where: { productionDate: { gte: filters.start, lte: filters.end } },
    include: { shifts: true },
  });

  const expectedShifts = await prisma.shift.count({ where: { isActive: true } });
  let completedDays = 0;
  let incompleteDays = 0;
  for (const day of productionDays) {
    const recorded = day.shifts.filter((s) => s.status !== "PENDING").length;
    if (recorded >= expectedShifts) completedDays += 1;
    else incompleteDays += 1;
  }

  const uniqueProducedDays = new Set(
    records.map((r) => formatDateISO(r.productionShift.productionDay.productionDate)),
  );

  return {
    filters,
    columnKeys,
    rows,
    columnTotals,
    grandTotal,
    shiftTotals,
    noProductionShifts,
    productionDays: uniqueProducedDays.size,
    completedDays,
    incompleteDays,
    averagePerDay: uniqueProducedDays.size ? grandTotal / uniqueProducedDays.size : 0,
    dailyTotals: [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}

function monthNameKeys() {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}

function quarterMonthKeys(year: number, quarter: 1 | 2 | 3 | 4) {
  const { start } = quarterMonths(year, quarter);
  return [0, 1, 2].map((i) => monthName(start.getUTCMonth() + i));
}

export function reportTitle(kind: ReportKind) {
  switch (kind) {
    case "daily":
      return "Daily Production Report";
    case "monthly":
      return "Monthly Production Report";
    case "quarterly":
      return "Quarterly Production Report";
    case "yearly":
      return "Yearly Production Report";
    default:
      return "Custom Date Range Production Report";
  }
}
