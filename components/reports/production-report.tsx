"use client";

import { CalendarDays, CalendarOff, Factory, Gauge } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatReportCell, formatReportTonnes, type ReportDocumentModel } from "@/lib/reports/document";

const ICONS = [Factory, CalendarDays, CalendarOff, Gauge];

export function ProductionReport({ model }: { model: ReportDocumentModel }) {
  const tickEvery = Math.max(1, Math.ceil(model.trend.length / 10));

  return (
    <article className="report-sheet bg-white text-[#1a2332]">
      <header className="border-b border-[#d7dee8] pb-4">
        <div className="border-l-4 border-[#1e3a5f] pl-4">
          <p className="text-2xl font-semibold tracking-tight text-[#1e3a5f]">{model.factory}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1e3a5f]">{model.title}</h2>
          <div className="mt-3 flex flex-col gap-1 text-sm text-[#5b6778] sm:flex-row sm:flex-wrap sm:gap-x-8">
            <p>Period: {model.period}</p>
            <p>Generated: {model.generated}</p>
            <p>Prepared by: {model.preparedBy}</p>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((kpi, index) => {
            const Icon = ICONS[index] ?? Factory;
            return (
              <div key={kpi.label} className="rounded-md border border-[#d7dee8] bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#5b6778]">
                  <Icon size={14} strokeWidth={1.75} className="text-[#2f6fed]" />
                  {kpi.label}
                </div>
                <div className="mt-1 text-2xl font-semibold text-[#1e3a5f]">{kpi.value}</div>
              </div>
            );
          })}
        </div>
      </section>

      <Section title="Production by Product">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#1e3a5f] text-left text-[#1e3a5f]">
                <th className="px-3 py-2 font-semibold">Product</th>
                {model.columns.map((column) => (
                  <th key={column} className="px-3 py-2 text-right font-semibold">
                    {column}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {model.tableRows.map((row) => (
                <tr key={row.product} className="border-b border-[#e6ebf1]">
                  <td className="px-3 py-2">{row.product}</td>
                  {row.cells.map((cell, index) => (
                    <td key={model.columns[index]} className="px-3 py-2 text-right tabular-nums text-[#1a2332]">
                      {formatReportCell(cell)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatReportTonnes(row.total)}</td>
                </tr>
              ))}
              <tr className="border-t border-[#1e3a5f] font-semibold">
                <td className="px-3 py-2">Total</td>
                {model.columnTotals.map((value, index) => (
                  <td key={model.columns[index]} className="px-3 py-2 text-right tabular-nums">
                    {formatReportTonnes(value)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{formatReportTonnes(model.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Section title="Production by Product">
          {model.productBars.length === 0 ? (
            <p className="text-sm text-[#5b6778]">No production in this period.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={model.productBars} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#e6ebf1" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#5b6778" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#1a2332" }} />
                  <Tooltip formatter={(value) => [`${formatReportTonnes(Number(value))} t`, "Tonnes"]} />
                  <Bar dataKey="tonnes" fill="#1e3a5f" radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
        <Section title="Production by Shift">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={model.shiftBars} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e6ebf1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#1a2332" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6778" }} />
                <Tooltip formatter={(value) => [`${formatReportTonnes(Number(value))} t`, "Tonnes"]} />
                <Bar dataKey="tonnes" fill="#2f6fed" radius={[3, 3, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title={model.trendTitle}>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.trend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid stroke="#e6ebf1" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#5b6778" }}
                interval={tickEvery - 1}
                minTickGap={12}
              />
              <YAxis tick={{ fontSize: 11, fill: "#5b6778" }} />
              <Tooltip formatter={(value) => [`${formatReportTonnes(Number(value))} t`, "Tonnes"]} />
              <Line type="monotone" dataKey="tonnes" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 2, fill: "#2f6fed" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Production Summary">
        <dl className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {model.summary.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-[#e6ebf1] py-2 text-sm">
              <dt className="text-[#5b6778]">{item.label}</dt>
              <dd className="font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Shift Summary">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#1e3a5f] text-left text-[#1e3a5f]">
              <th className="px-3 py-2 font-semibold">Shift</th>
              <th className="px-3 py-2 text-right font-semibold">Total production</th>
              <th className="px-3 py-2 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {model.shiftBars.map((shift) => (
              <tr key={shift.name} className="border-b border-[#e6ebf1]">
                <td className="px-3 py-2">{shift.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatReportTonnes(shift.tonnes)} tonnes</td>
                <td className="px-3 py-2 text-right">
                  <Badge status={shift.status === "Produced" ? "produced" : "no_production"}>{shift.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <footer className="mt-8 border-t border-[#d7dee8] pt-3 text-xs text-[#5b6778]">
        Generated from Production Management System • Designed by Selase I.T. Solutions
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="border-b border-[#d7dee8] pb-2 text-base font-semibold text-[#1e3a5f]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
