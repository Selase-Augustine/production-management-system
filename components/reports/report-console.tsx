"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { formatTonnes } from "@/lib/utils";

type Report = {
  columnKeys: string[];
  rows: Array<{ productName: string; itemCode: string; columns: Record<string, number>; total: number }>;
  columnTotals: Record<string, number>;
  grandTotal: number;
  shiftTotals: Record<string, number>;
  noProductionShifts: number;
  productionDays: number;
  completedDays: number;
  incompleteDays: number;
  averagePerDay: number;
};

export function ReportConsole({
  products,
  shifts,
  initial,
  query,
}: {
  products: Array<{ id: string; name: string }>;
  shifts: Array<{ id: string; name: string }>;
  initial: Report | null;
  query: Record<string, string>;
}) {
  const [kind, setKind] = useState(query.kind ?? "daily");
  const [exporting, setExporting] = useState<string | null>(null);
  const qs = new URLSearchParams(query).toString();

  async function exportFile(type: "excel" | "pdf") {
    setExporting(type);
    const res = await fetch(`/api/reports/${type}?${qs}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "excel" ? "production-report.xlsx" : "production-report.pdf";
    a.click();
    setExporting(null);
  }

  return (
    <div className="space-y-5">
      <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-6" method="get">
        <div>
          <Label>Report</Label>
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom range</option>
          </Select>
        </div>
        {kind === "daily" && (
          <div>
            <Label>Date</Label>
            <input className="h-10 w-full rounded-md border px-3" type="date" name="date" defaultValue={query.date} />
          </div>
        )}
        {kind === "monthly" && (
          <>
            <Field name="year" label="Year" defaultValue={query.year} />
            <Field name="month" label="Month (1-12)" defaultValue={query.month} />
          </>
        )}
        {kind === "quarterly" && (
          <>
            <Field name="year" label="Year" defaultValue={query.year} />
            <div>
              <Label>Quarter</Label>
              <Select name="quarter" defaultValue={query.quarter ?? "1"}>
                <option value="1">Q1 Jan–Mar</option>
                <option value="2">Q2 Apr–Jun</option>
                <option value="3">Q3 Jul–Sep</option>
                <option value="4">Q4 Oct–Dec</option>
              </Select>
            </div>
          </>
        )}
        {kind === "yearly" && <Field name="year" label="Year" defaultValue={query.year} />}
        {kind === "custom" && (
          <>
            <div>
              <Label>From</Label>
              <input className="h-10 w-full rounded-md border px-3" type="date" name="from" defaultValue={query.from} />
            </div>
            <div>
              <Label>To</Label>
              <input className="h-10 w-full rounded-md border px-3" type="date" name="to" defaultValue={query.to} />
            </div>
          </>
        )}
        <div>
          <Label>Product</Label>
          <Select name="productId" defaultValue={query.productId ?? ""}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Shift</Label>
          <Select name="shiftId" defaultValue={query.shiftId ?? ""}>
            <option value="">All shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit">Generate report</Button>
        </div>
      </form>

      {initial ? (
        <>
          <div className="flex gap-2">
            <Button onClick={() => exportFile("excel")} disabled={!!exporting}>
              {exporting === "excel" ? "Exporting Excel..." : "Export Excel"}
            </Button>
            <Button variant="outline" onClick={() => exportFile("pdf")} disabled={!!exporting}>
              {exporting === "pdf" ? "Exporting PDF..." : "Export PDF"}
            </Button>
          </div>
          {initial.rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">No production records found for this period.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    {initial.columnKeys.map((k) => (
                      <th key={k} className="px-3 py-2 text-right">
                        {k}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {initial.rows.map((row) => (
                    <tr key={row.itemCode} className="border-t">
                      <td className="px-3 py-2">{row.productName}</td>
                      {initial.columnKeys.map((k) => (
                        <td key={k} className="px-3 py-2 text-right">
                          {formatTonnes(row.columns[k] ?? 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">{formatTonnes(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-slate-50 font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    {initial.columnKeys.map((k) => (
                      <td key={k} className="px-3 py-2 text-right">
                        {formatTonnes(initial.columnTotals[k] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">{formatTonnes(initial.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Summary label="Total production" value={`${formatTonnes(initial.grandTotal)} tonnes`} />
            <Summary label="Production days" value={String(initial.productionDays)} />
            <Summary label="Completed days" value={String(initial.completedDays)} />
            <Summary label="Incomplete days" value={String(initial.incompleteDays)} />
            <Summary label="No-production shifts" value={String(initial.noProductionShifts)} />
            <Summary label="Average per day" value={`${formatTonnes(initial.averagePerDay)} tonnes`} />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-semibold">Shift totals</h3>
            <ul className="mt-2 text-sm">
              {Object.entries(initial.shiftTotals).map(([name, qty]) => (
                <li key={name} className="flex justify-between py-1">
                  <span>{name}</span>
                  <span>{formatTonnes(qty)} tonnes</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-slate-600">Select a report type and generate to view production totals.</p>
      )}
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input className="h-10 w-full rounded-md border px-3" name={name} defaultValue={defaultValue} />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
