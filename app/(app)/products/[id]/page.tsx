import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatDisplayDate } from "@/lib/dates";
import { formatTonnes, toNumber } from "@/lib/utils";

export default async function ProductHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productionRecords: {
        include: { productionShift: { include: { shift: true, productionDay: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!product) notFound();
  const total = product.productionRecords.reduce((s, r) => s + toNumber(r.quantityTonnes), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">
        {product.name} ({product.itemCode})
      </h1>
      <p>Total recorded: {formatTonnes(total)} tonnes</p>
      {product.productionRecords.length === 0 ? (
        <p>No production history for this product.</p>
      ) : (
        <table className="min-w-full rounded-lg border bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Shift</th>
              <th className="px-3 py-2 text-right">Tonnes</th>
            </tr>
          </thead>
          <tbody>
            {product.productionRecords.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{formatDisplayDate(r.productionShift.productionDay.productionDate)}</td>
                <td className="px-3 py-2">{r.productionShift.shift.name}</td>
                <td className="px-3 py-2 text-right">{formatTonnes(toNumber(r.quantityTonnes))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
