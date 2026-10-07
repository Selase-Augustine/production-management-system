"use client";

import { useState } from "react";
import Link from "next/link";
import { createProductAction, setProductActiveAction, updateProductAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: string;
  name: string;
  itemCode: string;
  isActive: boolean;
  _count: { productionRecords: number };
};

export function ProductManager({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.itemCode.toLowerCase().includes(q.toLowerCase()),
  );

  function startCreate() {
    setEditing(null);
    setName("");
    setItemCode("");
    setError(null);
    setOpen(true);
  }
  function startEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setItemCode(p.itemCode);
    setError(null);
    setOpen(true);
  }

  async function save() {
    setPending(true);
    setError(null);
    const payload = { name, itemCode, isActive: editing?.isActive ?? true };
    const result = editing
      ? await updateProductAction(editing.id, payload)
      : await createProductAction(payload);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input className="max-w-sm" placeholder="Search name or item code" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={startCreate}>Add product</Button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-slate-600">
          No products have been added yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Item code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">History</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{p.itemCode}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">
                    <Badge status={p.isActive ? "produced" : "inactive"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-3 py-2">{p._count.productionRecords} records</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="text-[#1e3a5f] underline" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <Link className="text-[#1e3a5f] underline" href={`/products/${p.id}`}>
                        History
                      </Link>
                      <button
                        className="underline"
                        onClick={async () => {
                          await setProductActiveAction(p.id, !p.isActive);
                          window.location.reload();
                        }}
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <h3 className="text-lg font-semibold">{editing ? "Edit product" : "Add product"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <Label>Product name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Item code</Label>
                <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
