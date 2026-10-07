import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatTonnes, toNumber } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";

export default async function ProductionShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shift = await prisma.productionShift.findUnique({
    where: { id },
    include: {
      shift: true,
      productionDay: true,
      noProductionReason: true,
      createdBy: true,
      records: { include: { product: true } },
    },
  });
  if (!shift) notFound();
  const total = shift.records.reduce((s, r) => s + toNumber(r.quantityTonnes), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">
          {formatDisplayDate(shift.productionDay.productionDate)} · {shift.shift.name}
        </h1>
        <Link className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm text-white" href={`/production/${shift.id}/edit`}>
          Edit
        </Link>
      </div>
      <Badge status={statusBadge(shift.status)}>{shift.status.replaceAll("_", " ")}</Badge>
      {shift.noProductionReason && <p>Reason: {shift.noProductionReason.name}</p>}
      {shift.remarks && <p>Remarks: {shift.remarks}</p>}
      <p className="text-sm text-slate-600">Entered by {shift.createdBy.name}</p>
      {shift.records.length === 0 ? (
        <p>No product quantities for this shift.</p>
      ) : (
        <table className="min-w-full rounded-lg border bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Tonnes</th>
            </tr>
          </thead>
          <tbody>
            {shift.records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.product.name} ({r.product.itemCode})
                </td>
                <td className="px-3 py-2 text-right">{formatTonnes(toNumber(r.quantityTonnes))}</td>
              </tr>
            ))}
            <tr className="border-t font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{formatTonnes(total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
