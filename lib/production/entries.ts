import { ShiftStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { rowsFromProductionShifts, type ProductionListRow } from "@/lib/production/entry-rows";

export type { ProductionListRow } from "@/lib/production/entry-rows";
export { rowsFromProductionShifts, describeProductionSave } from "@/lib/production/entry-rows";

export async function listProductionEntries(filters: {
  from?: Date;
  to?: Date;
  shiftId?: string;
  productId?: string;
  status?: string;
  q?: string;
  take?: number;
}): Promise<ProductionListRow[]> {
  const statusValues: ShiftStatus[] = ["PRODUCED", "NO_PRODUCTION", "PENDING"];
  const status = statusValues.includes(filters.status as ShiftStatus)
    ? (filters.status as ShiftStatus)
    : undefined;
  const q = filters.q?.trim().toLowerCase() ?? "";

  const shifts = await prisma.productionShift.findMany({
    where: {
      status: status ?? { not: "PENDING" },
      ...(filters.shiftId ? { shiftId: filters.shiftId } : {}),
      ...(filters.from || filters.to
        ? {
            productionDay: {
              productionDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            },
          }
        : {}),
      ...(filters.productId ? { records: { some: { productId: filters.productId } } } : {}),
    },
    include: {
      createdBy: true,
      shift: true,
      productionDay: true,
      noProductionReason: true,
      records: {
        where: filters.productId ? { productId: filters.productId } : undefined,
        include: { product: true, createdBy: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: filters.take ?? 500,
  });

  return rowsFromProductionShifts(shifts).filter((row) => {
    if (!q) return true;
    return (
      row.product.toLowerCase().includes(q) ||
      row.itemCode.toLowerCase().includes(q) ||
      (row.reason ?? "").toLowerCase().includes(q) ||
      row.shift.toLowerCase().includes(q)
    );
  });
}
