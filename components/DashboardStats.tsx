interface DashboardStatsProps {
  stats: {
    inStockCount: number;
    incomingCount: number;
    incomingCostTotal: number;
    soldCount: number;
    soldRevenueTotal: number;
    monthProfit: number;
    topModel: string | null;
    topModelCount: number;
    bestDay: string | null;
    bestDayRevenue: number;
  };
}

function formatSum(value: number) {
  return value.toLocaleString("uz-UZ") + " so'm";
}

function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
  });
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Omborda qolgan" value={String(stats.inStockCount)} />
        <StatCard
          label="Shu oy kirgan"
          value={String(stats.incomingCount)}
          sub={formatSum(stats.incomingCostTotal)}
        />
        <StatCard
          label="Shu oy sotilgan"
          value={String(stats.soldCount)}
          sub={formatSum(stats.soldRevenueTotal)}
        />
        <StatCard
          label="Shu oy foyda"
          value={formatSum(stats.monthProfit)}
          accent
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Eng ko&apos;p sotilgan model</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {stats.topModel ?? "—"}
          </p>
          {stats.topModel && (
            <p className="text-xs text-gray-500">{stats.topModelCount} dona</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Eng yuqori sotuv kuni</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatDay(stats.bestDay)}
          </p>
          {stats.bestDay && (
            <p className="text-xs text-gray-500">{formatSum(stats.bestDayRevenue)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-[#ff4fd8]/30 bg-gradient-to-br from-[#ff4fd8]/10 to-[#a020c0]/10 p-4"
          : "rounded-xl border border-white/10 bg-white/5 p-4"
      }
    >
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
