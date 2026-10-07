import { endOfMonth, endOfYear } from "date-fns";
import { parseDateOnly, quarterMonths, toDateOnly } from "@/lib/dates";
import type { ReportFilters, ReportKind } from "@/lib/reports/generate";

export function filtersFromSearch(sp: Record<string, string | string[] | undefined>): ReportFilters | null {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const kind = (get("kind") as ReportKind | undefined) ?? undefined;
  if (!kind) return null;
  const productId = get("productId") || undefined;
  const shiftId = get("shiftId") || undefined;
  const year = Number(get("year") || new Date().getFullYear());

  if (kind === "daily") {
    const date = parseDateOnly(get("date") || new Date().toISOString().slice(0, 10));
    return { kind, start: date, end: date, productId, shiftId };
  }
  if (kind === "monthly") {
    const month = Number(get("month") || new Date().getMonth() + 1);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = toDateOnly(endOfMonth(new Date(year, month - 1, 1)));
    return { kind, start, end, productId, shiftId, year, month };
  }
  if (kind === "quarterly") {
    const quarter = Number(get("quarter") || 1) as 1 | 2 | 3 | 4;
    const { start, end } = quarterMonths(year, quarter);
    return { kind, start, end, productId, shiftId, year, quarter };
  }
  if (kind === "yearly") {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = toDateOnly(endOfYear(new Date(year, 0, 1)));
    return { kind, start, end, productId, shiftId, year };
  }
  const from = get("from");
  const to = get("to");
  if (!from || !to) return null;
  return { kind: "custom", start: parseDateOnly(from), end: parseDateOnly(to), productId, shiftId };
}
