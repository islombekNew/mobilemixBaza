import clsx from "clsx";

interface SaleRow {
  id: string;
  finalPrice: string | number;
  paymentType: string;
  saleDate: string | Date;
  phone: { model: string; brand: string; imei: string };
  seller: { name: string };
  customer: { fullName: string; status: string } | null;
}

interface SalesHistoryProps {
  sales: SaleRow[];
}

const paymentTypeLabels: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  CREDIT: "Kredit",
};

function formatSum(value: string | number) {
  return Number(value).toLocaleString("uz-UZ") + " so'm";
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SalesHistory({ sales }: SalesHistoryProps) {
  if (sales.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        Hali sotuv amalga oshirilmagan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <th className="px-4 py-3 font-medium">Telefon</th>
            <th className="px-4 py-3 font-medium">Summa</th>
            <th className="px-4 py-3 font-medium">To&apos;lov turi</th>
            <th className="px-4 py-3 font-medium">Mijoz</th>
            <th className="px-4 py-3 font-medium">Sotuvchi</th>
            <th className="px-4 py-3 font-medium">Sana</th>
            <th className="px-4 py-3 font-medium">Chek</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.id}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-white">
                  {sale.phone.brand} {sale.phone.model}
                </div>
                <div className="font-mono text-xs text-gray-500">
                  {sale.phone.imei}
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-white">
                {formatSum(sale.finalPrice)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    sale.paymentType === "CREDIT"
                      ? "bg-purple-500/15 text-purple-300"
                      : "bg-green-500/15 text-green-400"
                  )}
                >
                  {paymentTypeLabels[sale.paymentType] ?? sale.paymentType}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">
                {sale.customer ? sale.customer.fullName : "—"}
              </td>
              <td className="px-4 py-3 text-gray-400">{sale.seller.name}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDate(sale.saleDate)}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/api/sales/${sale.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-300 hover:text-cyan-200"
                >
                  🧾 Chek
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
