import { getDict } from "@/lib/i18n/server";
interface BranchComparisonRow {
  branchId: string;
  branchName: string;
  inStockCount: number;
  salesCount: number;
  revenue: number;
  profit: number;
}

interface BranchComparisonTableProps {
  rows: BranchComparisonRow[];
}

export async function BranchComparisonTable({
  rows }: BranchComparisonTableProps) {
  const t = await getDict();
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        {t.branches.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <th className="px-4 py-3 font-medium">{t.reports.branch}</th>
            <th className="px-4 py-3 font-medium">{t.reports.inStock}</th>
            <th className="px-4 py-3 font-medium">{t.reports.sold}</th>
            <th className="px-4 py-3 font-medium">{t.reports.revenue}</th>
            <th className="px-4 py-3 font-medium">{t.reports.profit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.branchId}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-white">
                {row.branchName}
              </td>
              <td className="px-4 py-3">{row.inStockCount}</td>
              <td className="px-4 py-3">{row.salesCount}</td>
              <td className="px-4 py-3">{row.revenue.toLocaleString("uz-UZ")} so&apos;m</td>
              <td className="px-4 py-3 font-medium text-white">
                {row.profit.toLocaleString("uz-UZ")} so&apos;m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
