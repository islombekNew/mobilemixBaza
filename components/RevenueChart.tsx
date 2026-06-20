"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface RevenueChartPoint {
  date: string; // "2026-06-20"
  revenue: number;
  profit: number;
}

interface RevenueChartProps {
  data: RevenueChartPoint[];
}

function formatDayLabel(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${day}.${month}`;
}

function formatTooltipValue(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

/** Oxirgi 30 kunlik tushum/foyda grafigi (hisobotlar sahifasi). */
export function RevenueChart({ data }: RevenueChartProps) {
  const hasAnyData = data.some((d) => d.revenue > 0);

  if (!hasAnyData) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        Oxirgi 30 kunda hali sotuv bo&apos;lmagan
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            stroke="#9ca3af"
            fontSize={11}
            interval={Math.ceil(data.length / 10)}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={11}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a0a2e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDayLabel(String(label))}
            formatter={(value, name) => [
              formatTooltipValue(Number(value)),
              name === "revenue" ? "Tushum" : "Foyda",
            ]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#ff4fd8"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#a020c0"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ff4fd8]" /> Tushum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#a020c0]" /> Foyda
        </span>
      </div>
    </div>
  );
}
