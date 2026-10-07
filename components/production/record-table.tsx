"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteRecordAction } from "@/lib/actions/production";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTonnes } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";

export type RecordRow = {
  id: string;
  date: string;
  shift: string;
  product: string;
  itemCode: string;
  quantity: number;
  status: string;
  enteredBy: string;
  updatedAt: string;
  shiftRecordId: string;
};

export function RecordTable({ rows }: { rows: RecordRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<RecordRow | null>(null);

  async function onDelete() {
    if (!confirm) return;
    setPendingId(confirm.id);
    await deleteRecordAction(confirm.id);
    setPendingId(null);
    setConfirm(null);
    window.location.reload();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
        No production records found for this period.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {["Date", "Shift", "Product", "Quantity", "Status", "Entered By", "Last Updated", "Actions"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-3 py-2">{formatDisplayDate(new Date(row.date))}</td>
                <td className="px-3 py-2">{row.shift}</td>
                <td className="px-3 py-2">
                  {row.product} <span className="text-slate-500">({row.itemCode})</span>
                </td>
                <td className="px-3 py-2 text-right">{formatTonnes(row.quantity)}</td>
                <td className="px-3 py-2">
                  <Badge status={statusBadge(row.status)}>{row.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-3 py-2">{row.enteredBy}</td>
                <td className="whitespace-nowrap px-3 py-2">{new Date(row.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link className="text-[#1e3a5f] underline" href={`/production/${row.shiftRecordId}`}>
                      View
                    </Link>
                    <Link className="text-[#1e3a5f] underline" href={`/production/${row.shiftRecordId}/edit`}>
                      Edit
                    </Link>
                    <button className="text-red-700 underline" onClick={() => setConfirm(row)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Delete this production record?</h3>
            <p className="mt-3 text-sm text-slate-600">
              Product: {confirm.product}
              <br />
              Quantity: {formatTonnes(confirm.quantity)} tonnes
              <br />
              Date: {formatDisplayDate(new Date(confirm.date))}
              <br />
              Shift: {confirm.shift}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onDelete} disabled={pendingId === confirm.id}>
                {pendingId === confirm.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
