import { cn } from "@/lib/utils";

const styles = {
  produced: "bg-emerald-100 text-emerald-800",
  complete: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  no_production: "bg-red-100 text-red-800",
  inactive: "bg-slate-200 text-slate-600",
  info: "bg-slate-100 text-slate-700",
};

export function Badge({
  status,
  children,
  className,
}: {
  status: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[status], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  if (status === "PRODUCED" || status === "COMPLETE") return "produced" as const;
  if (status === "PENDING" || status === "IN_PROGRESS" || status === "MISSING") return "pending" as const;
  if (status === "NO_PRODUCTION") return "no_production" as const;
  return "info" as const;
}
