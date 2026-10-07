import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { filtersFromSearch } from "@/lib/reports/filters-from-search";
import { buildReportPdf } from "@/lib/exports/pdf";
import { loadPreparerName } from "@/lib/reports/preparer";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const filters = filtersFromSearch(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!filters) return new Response("Invalid report parameters", { status: 400 });
  const preparedBy = await loadPreparerName(session.id);
  const { buffer, filename } = await buildReportPdf(filters, preparedBy);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
