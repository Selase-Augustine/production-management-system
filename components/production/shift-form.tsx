"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveShiftProductionAction } from "@/lib/actions/production";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatTonnes } from "@/lib/utils";
import { describeProductionSave } from "@/lib/production/entry-rows";

type Product = { id: string; name: string; itemCode: string; isActive: boolean };
type Shift = { id: string; name: string };
type Reason = { id: string; name: string };
type Line = { productId: string; quantityTonnes: string; remarks: string };

export function ShiftForm({
  products,
  shifts,
  reasons,
  defaultDate,
  defaultShiftId,
  defaultMode = "PRODUCED",
  defaultLines,
  defaultReasonId,
  defaultRemarks,
}: {
  products: Product[];
  shifts: Shift[];
  reasons: Reason[];
  defaultDate?: string;
  defaultShiftId?: string;
  defaultMode?: "PRODUCED" | "NO_PRODUCTION";
  defaultLines?: Line[];
  defaultReasonId?: string;
  defaultRemarks?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [shiftId, setShiftId] = useState(defaultShiftId ?? shifts[0]?.id ?? "");
  const [mode, setMode] = useState<"PRODUCED" | "NO_PRODUCTION">(defaultMode);
  const [reasonId, setReasonId] = useState(defaultReasonId ?? "");
  const [remarks, setRemarks] = useState(defaultRemarks ?? "");
  const [lines, setLines] = useState<Line[]>(
    defaultLines?.length ? defaultLines : [{ productId: products.find((p) => p.isActive)?.id ?? "", quantityTonnes: "", remarks: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantityTonnes) || 0), 0),
    [lines],
  );

  function openConfirm() {
    setError(null);
    setConfirmOpen(true);
  }

  async function onSave() {
    setPending(true);
    setError(null);
    const result = await saveShiftProductionAction({
      date,
      shiftId,
      mode,
      remarks,
      noProductionReasonId: reasonId || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantityTonnes: Number(l.quantityTonnes),
        remarks: l.remarks,
      })),
    });
    setPending(false);
    if (result.error) {
      setConfirmOpen(false);
      setError(result.error);
      return;
    }
    setConfirmOpen(false);
    router.push("/production");
    router.refresh();
  }

  const confirmCopy = describeProductionSave({
    date,
    shiftName: shifts.find((s) => s.id === shiftId)?.name ?? "Shift",
    mode,
    reasonName: reasons.find((r) => r.id === reasonId)?.name,
    remarks,
    lines: lines.map((l) => ({
      productName: products.find((p) => p.id === l.productId)?.name ?? "Product",
      quantityTonnes: Number(l.quantityTonnes) || 0,
    })),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Shift</Label>
          <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Entry type</Label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as "PRODUCED" | "NO_PRODUCTION")}>
            <option value="PRODUCED">Production</option>
            <option value="NO_PRODUCTION">No Production</option>
          </Select>
        </div>
      </div>

      {mode === "PRODUCED" ? (
        <div className="space-y-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,2.2fr)_minmax(8.5rem,0.9fr)_minmax(0,1.4fr)_auto] md:items-end"
            >
              <div className="min-w-0">
                <Label>Product</Label>
                <Select
                  value={line.productId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...line, productId: e.target.value };
                    setLines(next);
                  }}
                >
                  <option value="">Select product</option>
                  {products.filter((p) => p.isActive || p.id === line.productId).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.itemCode})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label>Quantity (tonnes)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.quantityTonnes}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...line, quantityTonnes: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="min-w-0">
                <Label>Remarks</Label>
                <Input
                  value={line.remarks}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...line, remarks: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full whitespace-nowrap md:w-auto"
                  onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                  disabled={lines.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setLines([...lines, { productId: "", quantityTonnes: "", remarks: "" }])}
          >
            + Add Product
          </Button>
          <div className="text-sm font-semibold">Total: {formatTonnes(total)} tonnes</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Reason</Label>
            <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
              <option value="">Select reason</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Remarks (optional)</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
      )}

      {mode === "PRODUCED" && (
        <div>
          <Label>Shift remarks (optional)</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="w-full sm:w-auto" onClick={openConfirm} disabled={pending}>
          {mode === "PRODUCED" ? "Save Production" : "Save No Production"}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">{confirmCopy.title}</h3>
            <p className="mt-3 text-sm text-slate-600">{confirmCopy.summary}</p>
            {mode === "PRODUCED" ? (
              <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-sm text-slate-700">
                {lines.map((line, i) => (
                  <li key={i}>
                    {products.find((p) => p.id === line.productId)?.name ?? "Product"}: {formatTonnes(Number(line.quantityTonnes) || 0)} tonnes
                  </li>
                ))}
              </ul>
            ) : null}
            {remarks ? <p className="mt-2 text-sm text-slate-500">Remarks: {remarks}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={pending}>
                {pending ? "Saving..." : "Confirm and save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
