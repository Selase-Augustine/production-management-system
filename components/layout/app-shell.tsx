import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { LayoutDashboard, ClipboardList, Package, BarChart3, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/production", label: "Production", icon: ClipboardList },
  { href: "/production/calendar", label: "Calendar", icon: ClipboardList },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-slate-200 bg-[#1e3a5f] text-white print:hidden md:flex md:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-xs uppercase tracking-widest text-white/70">Factory</div>
          <div className="text-lg font-semibold">Production Records</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="print:pl-0 md:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <div className="font-semibold text-[#1e3a5f]">Production Records & Reporting</div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role.replaceAll("_", " ")}</div>
            </div>
            <form action={logoutAction}>
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Log out
              </button>
            </form>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 print:hidden md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md bg-slate-100 px-3 py-1 text-sm">
              {item.label}
            </Link>
          ))}
        </div>
        <main className="p-4 print:p-0 md:p-6">{children}</main>
      </div>
    </div>
  );
}
