import { ShiftStatus } from "@prisma/client";

export type DayStatus = "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED";

export function dayStatusFromShifts(
  statuses: Array<ShiftStatus | "MISSING">,
  expectedShiftCount = 3,
): DayStatus {
  const recorded = statuses.filter((s) => s === "PRODUCED" || s === "NO_PRODUCTION").length;
  if (recorded === 0) return "NOT_STARTED";
  if (recorded >= expectedShiftCount) return "COMPLETE";
  return "IN_PROGRESS";
}

export function calendarLabel(statuses: Array<{ name: string; status: ShiftStatus | "MISSING" }>) {
  const produced = statuses.filter((s) => s.status === "PRODUCED").length;
  const noProd = statuses.filter((s) => s.status === "NO_PRODUCTION").length;
  const pending = statuses.filter((s) => s.status === "PENDING" || s.status === "MISSING").length;
  if (pending === 0 && noProd === statuses.length) return "NO_PRODUCTION" as const;
  if (pending === 0) return "COMPLETE" as const;
  if (produced + noProd === 0) return "INCOMPLETE" as const;
  return "INCOMPLETE" as const;
}
