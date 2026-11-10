import { toNumber } from "@/lib/utils";

export type ProductionListRow = {
  id: string;
  date: string;
  shift: string;
  product: string;
  itemCode: string;
  quantity: number;
  status: string;
  reason: string | null;
  remarks: string | null;
  enteredBy: string;
  updatedAt: string;
  shiftRecordId: string;
  recordId: string | null;
};

export type ProductionShiftForList = {
  id: string;
  status: "PENDING" | "PRODUCED" | "NO_PRODUCTION";
  remarks: string | null;
  updatedAt: Date;
  createdBy: { name: string };
  shift: { name: string };
  productionDay: { productionDate: Date };
  noProductionReason: { name: string } | null;
  records: Array<{
    id: string;
    quantityTonnes: { toString(): string } | number | string;
    updatedAt: Date;
    product: { name: string; itemCode: string };
    createdBy: { name: string };
  }>;
};

export function rowsFromProductionShifts(shifts: ProductionShiftForList[]): ProductionListRow[] {
  const rows: ProductionListRow[] = [];
  for (const shift of shifts) {
    if (shift.status === "NO_PRODUCTION") {
      rows.push({
        id: shift.id,
        date: shift.productionDay.productionDate.toISOString(),
        shift: shift.shift.name,
        product: shift.noProductionReason?.name ?? "No production",
        itemCode: "NO-PROD",
        quantity: 0,
        status: shift.status,
        reason: shift.noProductionReason?.name ?? null,
        remarks: shift.remarks,
        enteredBy: shift.createdBy.name,
        updatedAt: shift.updatedAt.toISOString(),
        shiftRecordId: shift.id,
        recordId: null,
      });
      continue;
    }

    if (shift.records.length === 0) {
      rows.push({
        id: shift.id,
        date: shift.productionDay.productionDate.toISOString(),
        shift: shift.shift.name,
        product: "—",
        itemCode: "—",
        quantity: 0,
        status: shift.status,
        reason: null,
        remarks: shift.remarks,
        enteredBy: shift.createdBy.name,
        updatedAt: shift.updatedAt.toISOString(),
        shiftRecordId: shift.id,
        recordId: null,
      });
      continue;
    }

    for (const record of shift.records) {
      rows.push({
        id: record.id,
        date: shift.productionDay.productionDate.toISOString(),
        shift: shift.shift.name,
        product: record.product.name,
        itemCode: record.product.itemCode,
        quantity: toNumber(record.quantityTonnes),
        status: shift.status,
        reason: null,
        remarks: shift.remarks,
        enteredBy: record.createdBy.name,
        updatedAt: record.updatedAt.toISOString(),
        shiftRecordId: shift.id,
        recordId: record.id,
      });
    }
  }
  return rows;
}

export function describeProductionSave(input: {
  date: string;
  shiftName: string;
  mode: "PRODUCED" | "NO_PRODUCTION";
  reasonName?: string;
  remarks?: string;
  lines: Array<{ productName: string; quantityTonnes: number }>;
}) {
  if (input.mode === "NO_PRODUCTION") {
    return {
      title: "Save no production for this shift?",
      summary: `${input.date} · ${input.shiftName} · ${input.reasonName ?? "No production"}`,
    };
  }
  const total = input.lines.reduce((s, l) => s + (Number(l.quantityTonnes) || 0), 0);
  return {
    title: "Save production for this shift?",
    summary: `${input.date} · ${input.shiftName} · ${input.lines.length} product${input.lines.length === 1 ? "" : "s"} · ${total} tonnes`,
  };
}
