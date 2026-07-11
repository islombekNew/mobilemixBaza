import { getDict } from "@/lib/i18n/server";
import { formatDate, formatSum } from "@/lib/format";

interface ProfitRow {
  id: string;
  model: string;
  saleDate: string | Date;
  salePrice: number;
  costPrice: number;
  profit: number;
}

interface ProfitReportTableProps {
  rows: ProfitRow[];
}

export async function ProfitReportTable({
  rows }: ProfitReportTableProps) {
  const t = await getDict();
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        {t.sales.noHistory}
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0">
          <tr className="border-b border-white/10 bg-[#1a0a2e] text-left text-gray-400">
            <th className="px-4 py-3 font-medium">{t.reports.model}</th>
            <th className="px-4 py-3 font-medium">{t.reports.date}</th>
            <th className="px-4 py-3 font-medium">{t.reports.costPrice}</th>
            <th className="px-4 py-3 font-medium">{t.reports.salePrice}</th>
            <th className="px-4 py-3 font-medium">{t.reports.profit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-white">{row.model}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDate(row.saleDate)}
              </td>
              <td className="px-4 py-3">{formatSum(row.costPrice)}</td>
              <td className="px-4 py-3">{formatSum(row.salePrice)}</td>
              <td className={row.profit >= 0 ? "px-4 py-3 font-medium text-green-400" : "px-4 py-3 font-medium text-red-400"}>
                {formatSum(row.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
