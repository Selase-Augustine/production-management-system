import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { generateReport } from "@/lib/reports/generate";
import { filtersFromSearch } from "@/lib/reports/filters-from-search";
import { toReportDocument } from "@/lib/reports/document";
import { loadPreparerName } from "@/lib/reports/preparer";
import { ReportConsole } from "@/components/reports/report-console";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [products, shifts] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { sequence: "asc" } }),
  ]);
  const filters = filtersFromSearch(sp);
  const session = await getSession();
  const preparedBy = session ? await loadPreparerName(session.id) : "";
  const report = filters ? toReportDocument(await generateReport(filters), preparedBy) : null;
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") query[k] = v;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f] print:hidden">Reports</h1>
      <ReportConsole products={products} shifts={shifts} initial={report} query={query} />
    </div>
  );
}
