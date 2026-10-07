import { formatDateISO, formatDisplayDate, monthName, parseDateOnly } from "@/lib/dates";
import type { ReportFilters, ReportKind } from "@/lib/reports/generate";
import { reportTitle } from "@/lib/reports/generate";

export type GeneratedReport = {
  filters: ReportFilters;
  columnKeys: string[];
  rows: Array<{
    productName: string;
    columns: Record<string, number>;
    total: number;
  }>;
  columnTotals: Record<string, number>;
  grandTotal: number;
  shiftTotals: Record<string, number>;
  noProductionShifts: number;
  productionDays: number;
  completedDays: number;
  incompleteDays: number;
  averagePerDay: number;
  dailyTotals: Array<[string, number]>;
};

export type ReportDocumentModel = {
  factory: string;
  title: string;
  period: string;
  generated: string;
  preparedBy: string;
  kpis: Array<{ label: string; value: string }>;
  columns: string[];
  tableRows: Array<{ product: string; cells: Array<number | null>; total: number }>;
  columnTotals: number[];
  grandTotal: number;
  productBars: Array<{ name: string; tonnes: number }>;
  shiftBars: Array<{ name: string; tonnes: number; status: "Produced" | "No production" }>;
  trendTitle: string;
  trend: Array<{ label: string; tonnes: number }>;
  summary: Array<{ label: string; value: string }>;
};

const ZERO = 1e-9;

export function formatReportTonnes(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatReportCell(value: number | null): string {
  if (value === null || Math.abs(value) < ZERO) return "—";
  return formatReportTonnes(value);
}

export function formatGeneratedDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseDateOnly(iso));
}

function eachUtcDay(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(formatDateISO(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (days.length > 400) break;
  }
  return days;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${monthName(month - 1).slice(0, 3)} ${year}`;
}

function eachMonth(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor.getTime() <= last.getTime()) {
    keys.push(formatDateISO(cursor).slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function usesMonthlyTrend(kind: ReportKind, dayCount: number): boolean {
  if (kind === "yearly" || kind === "quarterly") return true;
  if (kind === "custom" && dayCount > 92) return true;
  return false;
}

export function buildTrend(report: GeneratedReport): { title: string; points: Array<{ label: string; tonnes: number }> } {
  const { filters, dailyTotals, columnKeys, columnTotals } = report;
  const days = eachUtcDay(filters.start, filters.end);
  if (usesMonthlyTrend(filters.kind, days.length)) {
    if (filters.kind === "yearly" || filters.kind === "quarterly") {
      return {
        title: "Monthly Production Trend",
        points: columnKeys.map((key) => ({ label: key, tonnes: columnTotals[key] ?? 0 })),
      };
    }
    const totals = new Map<string, number>();
    for (const [iso, qty] of dailyTotals) {
      const key = monthKey(iso);
      totals.set(key, (totals.get(key) ?? 0) + qty);
    }
    return {
      title: "Monthly Production Trend",
      points: eachMonth(filters.start, filters.end).map((key) => ({
        label: monthLabel(key),
        tonnes: totals.get(key) ?? 0,
      })),
    };
  }
  const byDay = new Map(dailyTotals);
  return {
    title: "Daily Production Trend",
    points: days.map((iso) => ({ label: dayLabel(iso), tonnes: byDay.get(iso) ?? 0 })),
  };
}

export function toReportDocument(
  report: GeneratedReport,
  preparedBy: string,
  generatedAt = new Date(),
): ReportDocumentModel {
  const trend = buildTrend(report);
  const tableRows = report.rows.map((row) => ({
    product: row.productName,
    cells: report.columnKeys.map((key) => {
      const value = row.columns[key] ?? 0;
      return Math.abs(value) < ZERO ? null : value;
    }),
    total: row.total,
  }));

  return {
    factory: process.env.FACTORY_NAME?.trim() || "Factory Production",
    title: reportTitle(report.filters.kind),
    period: `${formatDisplayDate(report.filters.start)} – ${formatDisplayDate(report.filters.end)}`,
    generated: formatGeneratedDate(generatedAt),
    preparedBy: preparedBy.trim() || "—",
    kpis: [
      { label: "Total production (tonnes)", value: formatReportTonnes(report.grandTotal) },
      { label: "Production days", value: String(report.productionDays) },
      { label: "No-production shifts", value: String(report.noProductionShifts) },
      { label: "Average / day (tonnes)", value: formatReportTonnes(report.averagePerDay) },
    ],
    columns: report.columnKeys,
    tableRows,
    columnTotals: report.columnKeys.map((key) => report.columnTotals[key] ?? 0),
    grandTotal: report.grandTotal,
    productBars: report.rows
      .filter((row) => row.total > ZERO)
      .map((row) => ({ name: row.productName, tonnes: row.total }))
      .sort((a, b) => b.tonnes - a.tonnes),
    shiftBars: Object.entries(report.shiftTotals).map(([name, tonnes]) => ({
      name,
      tonnes,
      status: tonnes > ZERO ? "Produced" : "No production",
    })),
    trendTitle: trend.title,
    trend: trend.points,
    summary: [
      { label: "Total production", value: `${formatReportTonnes(report.grandTotal)} tonnes` },
      { label: "Production days", value: String(report.productionDays) },
      { label: "Completed days", value: String(report.completedDays) },
      { label: "Incomplete days", value: String(report.incompleteDays) },
      { label: "No-production shifts", value: String(report.noProductionShifts) },
      { label: "Average production per day", value: `${formatReportTonnes(report.averagePerDay)} tonnes` },
    ],
  };
}
