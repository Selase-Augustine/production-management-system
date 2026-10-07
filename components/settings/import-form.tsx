"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImportForm() {
  const [summary, setSummary] = useState<{
    recordsFound: number;
    recordsImported: number;
    recordsSkipped: number;
    recordsWithErrors: number;
    errors: Array<{ row: string; message: string }>;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 rounded-lg border bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
        if (!file) {
          setError("Choose an Excel workbook.");
          return;
        }
        setPending(true);
        setError(null);
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/import/excel", { method: "POST", body: fd });
        const json = await res.json();
        setPending(false);
        if (!res.ok) {
          setError(json.error ?? "Import failed.");
          return;
        }
        setSummary(json);
      }}
    >
      <input name="file" type="file" accept=".xlsx,.xls" />
      <Button type="submit" disabled={pending}>
        {pending ? "Importing..." : "Import workbook"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {summary && (
        <div className="text-sm">
          <p>Records found: {summary.recordsFound}</p>
          <p>Records imported: {summary.recordsImported}</p>
          <p>Records skipped: {summary.recordsSkipped}</p>
          <p>Records with errors: {summary.recordsWithErrors}</p>
          {summary.errors.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-auto text-red-700">
              {summary.errors.map((err, i) => (
                <li key={i}>
                  {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
