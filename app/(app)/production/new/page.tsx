import { prisma } from "@/lib/db/prisma";
import { ShiftForm } from "@/components/production/shift-form";

export default async function NewProductionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]);
  const [products, shifts, reasons] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { sequence: "asc" } }),
    prisma.noProductionReason.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">Record production</h1>
      <ShiftForm
        products={products}
        shifts={shifts}
        reasons={reasons}
        defaultDate={get("date")}
        defaultShiftId={get("shiftId")}
      />
    </div>
  );
}
