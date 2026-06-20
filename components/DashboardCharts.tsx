"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailySeries {
  date: string;
  revenue: number;
  profit: number;
  count: number;
}

interface TopModel {
  model: string;
  count: number;
  revenue: number;
}

interface ConditionStat {
  condition: string;
  label: string;
  count: number;
}

interface DashboardChartsProps {
  dailySeries: DailySeries[];
  topModels: TopModel[];
  conditionStats: ConditionStat[];
}

const PIE_COLORS = ["#a78bfa", "#ff4fd8", "#34d399"];

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatK(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a0a2e] p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-gray-300">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()} so&apos;m
        </p>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a0a2e] p-3 text-xs shadow-lg">
      <p className="font-semibold text-white">{payload[0]?.payload?.model}</p>
      <p className="text-[#ff4fd8]">{payload[0]?.value} dona sotilgan</p>
    </div>
  );
}

export function DashboardCharts({ dailySeries, topModels, conditionStats }: DashboardChartsProps) {
  const hasRevenue = dailySeries.some((d) => d.revenue > 0);
  const hasModels = topModels.length > 0;
  const hasConditions = conditionStats.length > 0;

  return (
    <div className="space-y-6">
      {/* Area Chart — Kunlik daromad trendi */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">
          📈 Kunlik daromad va foyda
        </h3>
        {!hasRevenue ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">
            Bu davrda sotuv amalga oshirilmagan
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailySeries} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4fd8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff4fd8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatK}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-400">
                    {value === "revenue" ? "Daromad" : "Foyda"}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#a78bfa"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                dot={false}
                activeDot={{ r: 4, fill: "#a78bfa" }}
                animationDuration={1200}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="profit"
                stroke="#ff4fd8"
                strokeWidth={2}
                fill="url(#colorProfit)"
                dot={false}
                activeDot={{ r: 4, fill: "#ff4fd8" }}
                animationDuration={1400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart — Eng ko'p sotilgan modellar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">
            🏆 Eng ko&apos;p sotilgan modellar
          </h3>
          {!hasModels ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
              Bu davrda sotuv yo&apos;q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topModels}
                layout="vertical"
                margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="model"
                  tick={{ fill: "#d1d5db", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  animationDuration={1200}
                >
                  {topModels.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#ff4fd8" : index === 1 ? "#a78bfa" : "#6366f1"}
                      opacity={1 - index * 0.12}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart — Ombordagi telefonlar holati */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">
            📦 Ombor holati taqsimoti
          </h3>
          {!hasConditions ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
              Ombor bo&apos;sh
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={conditionStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="label"
                    paddingAngle={3}
                    animationBegin={200}
                    animationDuration={1200}
                  >
                    {conditionStats.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [`${value} dona`, name]}
                    contentStyle={{
                      background: "#1a0a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#d1d5db" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-col gap-3">
                {conditionStats.map((c, i) => (
                  <div key={c.condition} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-200">{c.label}</p>
                      <p className="text-xs text-gray-500">{c.count} dona</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
