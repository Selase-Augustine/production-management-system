"use client";

import { useState } from "react";
import { ProductionReport } from "@/components/reports/production-report";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { ReportDocumentModel } from "@/lib/reports/document";
import { cn } from "@/lib/utils";

export function ReportConsole({
  products,
  shifts,
  initial,
  query,
}: {
  products: Array<{ id: string; name: string }>;
  shifts: Array<{ id: string; name: string }>;
  initial: ReportDocumentModel | null;
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
      <form
        className="flex flex-col gap-3 rounded-lg border bg-white p-4 print:hidden sm:flex-row sm:flex-wrap sm:items-end"
        method="get"
      >
        <FilterField>
          <Label>Report</Label>
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom range</option>
          </Select>
        </FilterField>
        {kind === "daily" && (
          <FilterField wide>
            <Label>Date</Label>
            <Input type="date" name="date" defaultValue={query.date} />
          </FilterField>
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
            <FilterField>
              <Label>Quarter</Label>
              <Select name="quarter" defaultValue={query.quarter ?? "1"}>
                <option value="1">Q1 Jan–Mar</option>
                <option value="2">Q2 Apr–Jun</option>
                <option value="3">Q3 Jul–Sep</option>
                <option value="4">Q4 Oct–Dec</option>
              </Select>
            </FilterField>
          </>
        )}
        {kind === "yearly" && <Field name="year" label="Year" defaultValue={query.year} />}
        {kind === "custom" && (
          <>
            <FilterField wide>
              <Label>From</Label>
              <Input type="date" name="from" defaultValue={query.from} />
            </FilterField>
            <FilterField wide>
              <Label>To</Label>
              <Input type="date" name="to" defaultValue={query.to} />
            </FilterField>
          </>
        )}
        <FilterField wide>
          <Label>Product</Label>
          <Select name="productId" defaultValue={query.productId ?? ""}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField>
          <Label>Shift</Label>
          <Select name="shiftId" defaultValue={query.shiftId ?? ""}>
            <option value="">All shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <div className="flex w-full shrink-0 items-end sm:w-auto">
          <Button type="submit" className="w-full whitespace-nowrap sm:w-auto">
            Generate report
          </Button>
        </div>
      </form>

      {initial ? (
        <>
          <div className="flex flex-col gap-2 print:hidden sm:flex-row">
            <Button type="button" variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
              Print
            </Button>
            <Button type="button" variant="outline" onClick={() => exportFile("pdf")} disabled={!!exporting} className="w-full sm:w-auto">
              {exporting === "pdf" ? "Downloading PDF..." : "Download PDF"}
            </Button>
            <Button type="button" onClick={() => exportFile("excel")} disabled={!!exporting} className="w-full sm:w-auto">
              {exporting === "excel" ? "Downloading Excel..." : "Download Excel"}
            </Button>
          </div>
          <div className="rounded-lg border border-[#d7dee8] bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none md:p-8">
            <ProductionReport model={initial} />
          </div>
        </>
      ) : (
        <p className="text-slate-600">Select a report type and generate to view production totals.</p>
      )}
    </div>
  );
}

function FilterField({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("w-full min-w-0 sm:flex-1", wide ? "sm:min-w-[13.5rem]" : "sm:min-w-[11rem]")}>
      {children}
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <FilterField>
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue} />
    </FilterField>
  );
}
