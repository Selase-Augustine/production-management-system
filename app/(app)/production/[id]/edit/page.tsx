import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ShiftForm } from "@/components/production/shift-form";
import { formatDateISO } from "@/lib/dates";
import { toNumber } from "@/lib/utils";

export default async function EditProductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shift, products, shifts, reasons] = await Promise.all([
    prisma.productionShift.findUnique({
      where: { id },
      include: { productionDay: true, records: true },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { sequence: "asc" } }),
    prisma.noProductionReason.findMany({ where: { isActive: true } }),
  ]);
  if (!shift) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">Edit production</h1>
      <ShiftForm
        products={products}
        shifts={shifts}
        reasons={reasons}
        defaultDate={formatDateISO(shift.productionDay.productionDate)}
        defaultShiftId={shift.shiftId}
        defaultMode={shift.status === "NO_PRODUCTION" ? "NO_PRODUCTION" : "PRODUCED"}
        defaultReasonId={shift.noProductionReasonId ?? undefined}
        defaultRemarks={shift.remarks ?? ""}
        defaultLines={shift.records.map((r) => ({
          productId: r.productId,
          quantityTonnes: String(toNumber(r.quantityTonnes)),
          remarks: r.remarks ?? "",
        }))}
      />
    </div>
  );
}
