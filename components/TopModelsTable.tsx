interface TopModelRow {
  model: string;
  brand: string;
  count: number;
  revenue: number;
}

interface TopModelsTableProps {
  rows: TopModelRow[];
}

export function TopModelsTable({ rows }: TopModelsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        Hali sotuv ma&apos;lumotlari yo&apos;q
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium">Sotilgan soni</th>
            <th className="px-4 py-3 font-medium">Umumiy summa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.brand}-${row.model}`}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3">
                <span className="font-medium text-white">{row.brand}</span>{" "}
                {row.model}
              </td>
              <td className="px-4 py-3">{row.count}</td>
              <td className="px-4 py-3">{row.revenue.toLocaleString("uz-UZ")} so&apos;m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
