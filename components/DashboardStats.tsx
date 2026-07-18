import type { DashboardPeriod } from "@/lib/reports";
import { formatSum as libFormatSum, formatDate } from "@/lib/format";
import { DashboardCharts } from "@/components/DashboardCharts";
import { getDict } from "@/lib/i18n/server";

interface DashboardStatsProps {
  stats: {
    inStockCount: number;
    accessoryCount: number;
    incomingCount: number;
    incomingCostTotal: number;
    soldCount: number;
    soldRevenueTotal: number;
    monthProfit: number;
    topModel: string | null;
    topModelCount: number;
    bestDay: string | null;
    bestDayRevenue: number;
    dailySeries: { date: string; revenue: number; profit: number; count: number }[];
    topModels: { model: string; count: number; revenue: number }[];
    conditionStats: { condition: string; label: string; count: number }[];
  };
  period?: DashboardPeriod;
}

function formatSum(value: number) {
  return libFormatSum(value);
}

function formatDay(value: string | null) {
  if (!value) return "—";
  return formatDate(value);
}

export async function DashboardStats({ stats }: DashboardStatsProps) {
  const t = await getDict();
  return (
    <div className="space-y-6">
      {/* Statistika kartalar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t.dashboard.inStock} value={String(stats.inStockCount)} icon="📦" />
        <StatCard label={t.nav.accessories} value={String(stats.accessoryCount)} icon="🎧" />
        <StatCard
          label={t.dashboard.incoming}
          value={String(stats.incomingCount)}
          sub={formatSum(stats.incomingCostTotal)}
          icon="📥"
        />
        <StatCard
          label={t.dashboard.sold}
          value={String(stats.soldCount)}
          sub={formatSum(stats.soldRevenueTotal)}
          icon="🛒"
        />
        <StatCard
          label={t.dashboard.profit}
          value={formatSum(stats.monthProfit)}
          icon="💰"
          accent
        />
      </div>

      {/* Qo'shimcha ma'lumot */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">🏅 {t.dashboard.topModel}</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.topModel ?? "—"}
          </p>
          {stats.topModel && (
            <p className="text-xs text-gray-500">
              {stats.topModelCount} {t.common.pieces}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">📅 {t.dashboard.bestDay}</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatDay(stats.bestDay)}
          </p>
          {stats.bestDay && (
            <p className="text-xs text-gray-500">{formatSum(stats.bestDayRevenue)}</p>
          )}
        </div>
      </div>

      {/* Chartlar */}
      <DashboardCharts
        dailySeries={stats.dailySeries}
        topModels={stats.topModels}
        conditionStats={stats.conditionStats}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: string;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-[#ff4fd8]/30 bg-gradient-to-br from-[#ff4fd8]/10 to-[#a020c0]/10 p-4"
          : "rounded-xl border border-white/10 bg-white/5 p-4"
      }
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
