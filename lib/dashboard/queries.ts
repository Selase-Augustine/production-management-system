import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { formatDateISO, toDateOnly } from "@/lib/dates";
import { dayStatusFromShifts } from "@/lib/production/status";
import { startOfMonth, startOfQuarter, startOfYear, endOfDay } from "date-fns";

export async function getDashboardData(start: Date, end: Date, now = new Date()) {
  const today = toDateOnly(now);
  const shifts = await prisma.shift.findMany({ where: { isActive: true }, orderBy: { sequence: "asc" } });

  const [todayDay, rangeRecords, rangeShifts, products, pendingInRange, noProdInRange] =
    await Promise.all([
      prisma.productionDay.findUnique({
        where: { productionDate: today },
        include: {
          shifts: {
            include: { shift: true, records: true, noProductionReason: true },
          },
        },
      }),
      prisma.productionRecord.findMany({
        where: {
          productionShift: {
            status: "PRODUCED",
            productionDay: { productionDate: { gte: start, lte: end } },
          },
        },
        include: {
          product: true,
          productionShift: { include: { shift: true, productionDay: true } },
        },
      }),
      prisma.productionShift.findMany({
        where: { productionDay: { productionDate: { gte: start, lte: end } } },
        include: { shift: true, productionDay: true, records: true },
      }),
      prisma.product.findMany({ orderBy: { name: "asc" } }),
      prisma.productionShift.count({
        where: {
          status: "PENDING",
          productionDay: { productionDate: { gte: start, lte: end } },
        },
      }),
      prisma.productionShift.count({
        where: {
          status: "NO_PRODUCTION",
          productionDay: { productionDate: { gte: start, lte: end } },
        },
      }),
    ]);

  const todayShiftCards = shifts.map((shift) => {
    const found = todayDay?.shifts.find((s) => s.shiftId === shift.id);
    const qty = found?.records.reduce((sum, r) => sum + toNumber(r.quantityTonnes), 0) ?? 0;
    return {
      id: shift.id,
      name: shift.name,
      status: found?.status ?? ("PENDING" as const),
      quantity: qty,
      reason: found?.noProductionReason?.name ?? null,
    };
  });

  const todayTotal = todayShiftCards.reduce((s, c) => s + c.quantity, 0);

  const mtdStart = startOfMonth(now);
  const qtdStart = startOfQuarter(now);
  const ytdStart = startOfYear(now);
  const nowEnd = endOfDay(now);

  const periodTotals = await Promise.all(
    [mtdStart, qtdStart, ytdStart].map((from) =>
      prisma.productionRecord.aggregate({
        _sum: { quantityTonnes: true },
        where: {
          productionShift: {
            status: "PRODUCED",
            productionDay: { productionDate: { gte: toDateOnly(from), lte: toDateOnly(nowEnd) } },
          },
        },
      }),
    ),
  );

  const productTotals = products.map((p) => ({
    id: p.id,
    name: p.name,
    itemCode: p.itemCode,
    total: rangeRecords
      .filter((r) => r.productId === p.id)
      .reduce((s, r) => s + toNumber(r.quantityTonnes), 0),
  })).filter((p) => p.total > 0);

  const shiftTotals = shifts.map((shift) => ({
    name: shift.name,
    total: rangeRecords
      .filter((r) => r.productionShift.shiftId === shift.id)
      .reduce((s, r) => s + toNumber(r.quantityTonnes), 0),
  }));

  const dailyMap = new Map<string, number>();
  for (const rec of rangeRecords) {
    const key = formatDateISO(rec.productionShift.productionDay.productionDate);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + toNumber(rec.quantityTonnes));
  }

  const daysInRange = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  );
  const missingShifts = Math.max(0, daysInRange * shifts.length - rangeShifts.filter((s) => s.status !== "PENDING").length);
  const pendingShifts = pendingInRange + missingShifts;

  return {
    todayTotal,
    todayShiftCards,
    monthToDate: toNumber(periodTotals[0]._sum.quantityTonnes),
    quarterToDate: toNumber(periodTotals[1]._sum.quantityTonnes),
    yearToDate: toNumber(periodTotals[2]._sum.quantityTonnes),
    productTotals,
    shiftTotals,
    noProduction: noProdInRange,
    pendingShifts,
    trend: [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)),
    rangeTotal: rangeRecords.reduce((s, r) => s + toNumber(r.quantityTonnes), 0),
  };
}

export async function getCalendarDays(start: Date, end: Date) {
  const shifts = await prisma.shift.findMany({ where: { isActive: true }, orderBy: { sequence: "asc" } });
  const days = await prisma.productionDay.findMany({
    where: { productionDate: { gte: start, lte: end } },
    include: {
      shifts: { include: { shift: true, records: true, noProductionReason: true } },
    },
  });
  return days.map((day) => {
    const mapped = shifts.map((shift) => {
      const found = day.shifts.find((s) => s.shiftId === shift.id);
      return {
        name: shift.name,
        status: found?.status ?? ("MISSING" as const),
        quantity: found?.records.reduce((s, r) => s + toNumber(r.quantityTonnes), 0) ?? 0,
        reason: found?.noProductionReason?.name ?? null,
        shiftId: shift.id,
        productionShiftId: found?.id ?? null,
      };
    });
    return {
      id: day.id,
      date: day.productionDate,
      shifts: mapped,
      status: dayStatusFromShifts(mapped.map((s) => s.status)),
    };
  });
}
