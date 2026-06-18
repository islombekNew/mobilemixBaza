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

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProfitReportTable({ rows }: ProfitReportTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        Hali sotuv amalga oshirilmagan
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0">
          <tr className="border-b border-white/10 bg-[#1a0a2e] text-left text-gray-400">
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium">Sana</th>
            <th className="px-4 py-3 font-medium">Tan narxi</th>
            <th className="px-4 py-3 font-medium">Sotuv narxi</th>
            <th className="px-4 py-3 font-medium">Foyda</th>
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
              <td className="px-4 py-3">{row.costPrice.toLocaleString("uz-UZ")}</td>
              <td className="px-4 py-3">{row.salePrice.toLocaleString("uz-UZ")}</td>
              <td
                className={
                  row.profit >= 0
                    ? "px-4 py-3 font-medium text-green-400"
                    : "px-4 py-3 font-medium text-red-400"
                }
              >
                {row.profit.toLocaleString("uz-UZ")} so&apos;m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
