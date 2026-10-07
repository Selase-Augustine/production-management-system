import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { filtersFromSearch } from "@/lib/reports/filters-from-search";
import { buildReportWorkbook } from "@/lib/exports/excel";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const filters = filtersFromSearch(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!filters) return new Response("Invalid report parameters", { status: 400 });
  const { workbook, filename } = await buildReportWorkbook(filters);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
