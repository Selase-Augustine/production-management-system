import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/dashboard/queries";
import { parseDateOnly, rangeForPreset, type DashboardPreset } from "@/lib/dates";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]);
  const preset = (get("preset") as DashboardPreset) || "today";
  let range = rangeForPreset(preset);
  if (preset === "custom" && get("from") && get("to")) {
    range = { start: parseDateOnly(get("from")!), end: parseDateOnly(get("to")!) };
  }
  const data = await getDashboardData(range.start, range.end);
  return <DashboardView data={data} />;
}
