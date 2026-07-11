import { getDict } from "@/lib/i18n/server";

interface DebtSummaryCardsProps {
  summary: {
    totalDebt: number;
    activeCount: number;
    overdueCount: number;
  };
}

// totalDebt aralash valyutali qarzlarning so'mga o'girilgan yig'indisi
// (lib/customers.ts: getDebtSummary) — shu sababli doim so'mda ko'rsatiladi.
function formatSum(value: number) {
  return Math.round(value).toLocaleString("uz-UZ") + " so'm";
}

export async function DebtSummaryCards({ summary }: DebtSummaryCardsProps) {
  const t = await getDict();
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-gray-400">{t.customers.totalActiveDebt}</p>
        <p className="mt-1 text-xl font-semibold text-white">
          {formatSum(summary.totalDebt)}
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-gray-400">{t.customers.activeDebtors}</p>
        <p className="mt-1 text-xl font-semibold text-white">
          {summary.activeCount}
        </p>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-xs text-red-300">{t.customers.overdue}</p>
        <p className="mt-1 text-xl font-semibold text-red-300">
          {summary.overdueCount}
        </p>
      </div>
    </div>
  );
}
