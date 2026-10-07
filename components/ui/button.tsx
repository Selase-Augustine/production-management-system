import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-[#1e3a5f] text-white hover:bg-[#16304d]",
        variant === "secondary" && "bg-slate-200 text-slate-900 hover:bg-slate-300",
        variant === "ghost" && "bg-transparent hover:bg-slate-100",
        variant === "outline" && "border border-slate-300 bg-white hover:bg-slate-50",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
      {...props}
    />
  );
}
