import Link from "next/link";
import { getCalendarDays } from "@/lib/dashboard/queries";
import { startOfMonth, endOfMonth } from "date-fns";
import { formatDisplayDate, formatDateISO, toDateOnly } from "@/lib/dates";
import { Badge, statusBadge } from "@/components/ui/badge";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]);
  const now = new Date();
  const year = Number(get("year") || now.getFullYear());
  const month = Number(get("month") || now.getMonth() + 1);
  const start = toDateOnly(startOfMonth(new Date(year, month - 1, 1)));
  const end = toDateOnly(endOfMonth(new Date(year, month - 1, 1)));
  const days = await getCalendarDays(start, end);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1e3a5f]">Production calendar</h1>
      <form className="flex gap-2" method="get">
        <input className="h-10 rounded-md border px-3" name="year" defaultValue={year} />
        <input className="h-10 rounded-md border px-3" name="month" defaultValue={month} />
        <button className="h-10 rounded-md bg-[#1e3a5f] px-4 text-white">View</button>
      </form>
      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">No production has been recorded this month.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => (
            <div key={day.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{formatDisplayDate(day.date)}</div>
                <Badge status={statusBadge(day.status)}>{day.status.replaceAll("_", " ")}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {day.shifts.map((s) => (
                  <li key={s.name} className="flex justify-between">
                    <span>
                      {s.status === "PRODUCED" || s.status === "NO_PRODUCTION" ? "✓" : "⚠"} {s.name}
                    </span>
                    <span>
                      {s.status === "PRODUCED"
                        ? `${s.quantity} t`
                        : s.status === "NO_PRODUCTION"
                          ? "No production"
                          : "Not entered"}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                className="mt-3 inline-block text-sm text-[#1e3a5f] underline"
                href={`/production/new?date=${formatDateISO(day.date)}`}
              >
                Open details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
