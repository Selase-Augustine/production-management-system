"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatTonnes } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#1e3a5f", "#2f6fed", "#1f7a4d", "#b45309", "#7c3aed", "#0f766e", "#be123c"];

export function DashboardView({
  data,
}: {
  data: {
    todayTotal: number;
    todayShiftCards: Array<{ name: string; status: string; quantity: number; reason: string | null }>;
    monthToDate: number;
    quarterToDate: number;
    yearToDate: number;
    productTotals: Array<{ name: string; total: number }>;
    shiftTotals: Array<{ name: string; total: number }>;
    noProduction: number;
    pendingShifts: number;
    trend: Array<[string, number]>;
    rangeTotal: number;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("preset") ?? "today";

  function setPreset(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("preset", value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Dashboard</h1>
          <p className="text-sm text-slate-600">How much did we produce, what did we produce, and which shifts are missing?</p>
        </div>
        <div>
          <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </Select>
        </div>
      </div>

      {preset === "custom" && (
        <form className="flex flex-wrap gap-2" action="/dashboard">
          <input type="hidden" name="preset" value="custom" />
          <input className="h-10 rounded-md border px-3" type="date" name="from" defaultValue={params.get("from") ?? ""} />
          <input className="h-10 rounded-md border px-3" type="date" name="to" defaultValue={params.get("to") ?? ""} />
          <button className="h-10 rounded-md bg-[#1e3a5f] px-4 text-white">Apply</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Total today" value={`${formatTonnes(data.todayTotal)} tonnes`} />
        <Stat title="Month to date" value={`${formatTonnes(data.monthToDate)} tonnes`} />
        <Stat title="Quarter to date" value={`${formatTonnes(data.quarterToDate)} tonnes`} />
        <Stat title="Year to date" value={`${formatTonnes(data.yearToDate)} tonnes`} />
        <Stat title="Pending shifts" value={String(data.pendingShifts)} tone="warn" />
        <Stat title="No production" value={String(data.noProduction)} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.todayShiftCards.map((shift) => (
          <Card key={shift.name}>
            <CardTitle>Today · {shift.name}</CardTitle>
            <div className="mt-3 flex items-center justify-between">
              <Badge status={statusBadge(shift.status)}>
                {shift.status === "PENDING" ? "Not entered" : shift.status.replaceAll("_", " ")}
              </Badge>
              <div className="text-xl font-semibold">
                {shift.status === "PRODUCED" ? `${formatTonnes(shift.quantity)} t` : shift.status === "NO_PRODUCTION" ? "—" : "⚠"}
              </div>
            </div>
            {shift.reason && <p className="mt-2 text-sm text-slate-600">{shift.reason}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Production by product</CardTitle>
          {data.productTotals.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No production has been recorded for this period.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.productTotals.map((p) => (
                <li key={p.name} className="flex justify-between border-b border-slate-100 py-1">
                  <span>{p.name}</span>
                  <span className="font-medium">{formatTonnes(p.total)} tonnes</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Production by shift</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {data.shiftTotals.map((s) => (
              <li key={s.name} className="flex justify-between border-b border-slate-100 py-1">
                <span>{s.name}</span>
                <span className="font-medium">{formatTonnes(s.total)} tonnes</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="h-80">
          <CardTitle>Production trend</CardTitle>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.trend.map(([date, total]) => ({ date, total }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#1e3a5f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="h-80">
          <CardTitle>Product distribution</CardTitle>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={data.productTotals} dataKey="total" nameKey="name" outerRadius={90} label>
                {data.productTotals.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="h-80">
        <CardTitle>Shift comparison</CardTitle>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data.shiftTotals}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#1e3a5f" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone?: "warn" | "danger" }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div
        className={`mt-2 text-3xl font-semibold ${tone === "warn" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-[#1e3a5f]"}`}
      >
        {value}
      </div>
    </Card>
  );
}
