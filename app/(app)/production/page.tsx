import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { RecordTable } from "@/components/production/record-table";
import { Button } from "@/components/ui/button";
import { toNumber } from "@/lib/utils";
import { parseDateOnly } from "@/lib/dates";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const [shifts, products] = await Promise.all([
    prisma.shift.findMany({ orderBy: { sequence: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  const from = get("from") ? parseDateOnly(get("from")) : undefined;
  const to = get("to") ? parseDateOnly(get("to")) : undefined;
  const q = get("q").toLowerCase();

  const records = await prisma.productionRecord.findMany({
    where: {
      productionShift: {
        ...(get("shift") ? { shiftId: get("shift") } : {}),
        ...(get("status") ? { status: get("status") as "PRODUCED" } : {}),
        ...(from || to
          ? {
              productionDay: {
                productionDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              },
            }
          : {}),
      },
      ...(get("product") ? { productId: get("product") } : {}),
    },
    include: {
      product: true,
      createdBy: true,
      productionShift: { include: { shift: true, productionDay: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const rows = records
    .filter(
      (r) =>
        !q ||
        r.product.name.toLowerCase().includes(q) ||
        r.product.itemCode.toLowerCase().includes(q),
    )
    .map((r) => ({
      id: r.id,
      date: r.productionShift.productionDay.productionDate.toISOString(),
      shift: r.productionShift.shift.name,
      product: r.product.name,
      itemCode: r.product.itemCode,
      quantity: toNumber(r.quantityTonnes),
      status: r.productionShift.status,
      enteredBy: r.createdBy.name,
      updatedAt: r.updatedAt.toISOString(),
      shiftRecordId: r.productionShiftId,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Production</h1>
          <p className="text-sm text-slate-600">Record, edit, and review shift production.</p>
        </div>
        <Link href="/production/new">
          <Button>Record production</Button>
        </Link>
      </div>
      <form className="grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-6" method="get">
        <input className="h-10 rounded-md border px-3" type="date" name="from" defaultValue={get("from")} />
        <input className="h-10 rounded-md border px-3" type="date" name="to" defaultValue={get("to")} />
        <select className="h-10 rounded-md border px-3" name="shift" defaultValue={get("shift")}>
          <option value="">All shifts</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border px-3" name="product" defaultValue={get("product")}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border px-3" name="status" defaultValue={get("status")}>
          <option value="">All statuses</option>
          <option value="PRODUCED">Produced</option>
          <option value="NO_PRODUCTION">No production</option>
          <option value="PENDING">Pending</option>
        </select>
        <input className="h-10 rounded-md border px-3" name="q" placeholder="Search product / code" defaultValue={get("q")} />
        <button className="h-10 rounded-md bg-[#1e3a5f] px-4 text-white md:col-span-6">Filter</button>
      </form>
      <RecordTable rows={rows} />
    </div>
  );
}
