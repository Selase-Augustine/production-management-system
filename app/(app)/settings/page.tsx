import { prisma } from "@/lib/db/prisma";
import { ImportForm } from "@/components/settings/import-form";
import { createNoProductionReasonAction } from "@/lib/actions/production";

export default async function SettingsPage() {
  const reasons = await prisma.noProductionReason.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">Settings</h1>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">No-production reasons</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {reasons.map((r) => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
        <form
          className="mt-4 flex gap-2"
          action={async (fd) => {
            "use server";
            await createNoProductionReasonAction(String(fd.get("name") ?? ""));
          }}
        >
          <input className="h-10 flex-1 rounded-md border px-3" name="name" placeholder="Add reason" />
          <button className="h-10 rounded-md bg-[#1e3a5f] px-4 text-white">Add</button>
        </form>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Import historical Excel data</h2>
        <p className="mb-3 text-sm text-slate-600">
          Upload a workbook with columns Date, Shift, Product, Item Code, Quantity, Status, Reason. Duplicate
          shift+product rows are skipped and listed.
        </p>
        <ImportForm />
      </section>
    </div>
  );
}
