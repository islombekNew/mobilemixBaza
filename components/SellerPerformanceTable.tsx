interface SellerPerformanceRow {
  sellerId: string;
  sellerName: string;
  count: number;
  revenue: number;
  profit: number;
}

interface SellerPerformanceTableProps {
  rows: SellerPerformanceRow[];
}

/** Xodimlar (sotuvchilar) bo'yicha shu oylik hisobot jadvali. */
export function SellerPerformanceTable({ rows }: SellerPerformanceTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
        Shu oy hali sotuv bo&apos;lmagan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <th className="px-4 py-3 font-medium">Sotuvchi</th>
            <th className="px-4 py-3 font-medium">Sotilgan soni</th>
            <th className="px-4 py-3 font-medium">Tushum</th>
            <th className="px-4 py-3 font-medium">Foyda</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.sellerId}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-white">{row.sellerName}</td>
              <td className="px-4 py-3">{row.count}</td>
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
