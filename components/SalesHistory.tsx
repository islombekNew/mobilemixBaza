"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import { useT } from "@/lib/i18n/client";
import { paymentTypeLabel } from "@/lib/i18n/dictionaries";

interface SaleRow {
  id: string;
  finalPrice: string | number;
  currency?: string;
  paymentType: string;
  saleDate: string | Date;
  returnedAt?: string | Date | null;
  returnReason?: string | null;
  phone: { model: string; brand: string; imei: string };
  seller: { id?: string; name: string };
  customer: { fullName: string; status: string } | null;
}

interface SalesHistoryProps {
  sales: SaleRow[];
  /** Qaytarish tugmasi faqat egasiga ko'rinadi */
  isOwner?: boolean;
}

function formatDateTime(value: string | Date) {
  const d = new Date(value);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()} ${hour}:${min}`;
}

function saleCurrency(sale: SaleRow): "USD" | "UZS" {
  return sale.currency === "USD" ? "USD" : "UZS";
}

/**
 * Sotuvlar tarixi: qidiruv + sotuvchi/to'lov turi filtrlari, qaytarish
 * tugmasi (faqat owner). Desktopda jadval, mobilda kartochkalar —
 * yon scroll yo'q.
 */
export function SalesHistory({ sales, isOwner = false }: SalesHistoryProps) {
  const router = useRouter();
  const t = useT();
  const [search, setSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [returningSale, setReturningSale] = useState<SaleRow | null>(null);

  // Filtr uchun sotuvchilar ro'yxati sotuvlarning o'zidan yig'iladi
  const sellerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sales) {
      map.set(s.seller.id ?? s.seller.name, s.seller.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (q) {
        const hay =
          `${s.phone.brand} ${s.phone.model} ${s.phone.imei} ${s.customer?.fullName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sellerFilter && (s.seller.id ?? s.seller.name) !== sellerFilter) {
        return false;
      }
      if (paymentFilter && s.paymentType !== paymentFilter) return false;
      return true;
    });
  }, [sales, search, sellerFilter, paymentFilter]);

  if (sales.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        {t.sales.noHistory}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtrlar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.sales.searchPlaceholder}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8] sm:flex-1"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
          >
            <option value="">{t.sales.allSellers}</option>
            {sellerOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
          >
            <option value="">{t.sales.allPayments}</option>
            <option value="CASH">{t.sellModal.cash}</option>
            <option value="CARD">{t.sellModal.card}</option>
            <option value="CREDIT">{t.sellModal.credit}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          {t.sales.noFilterMatch}
        </div>
      ) : (
        <>
          {/* Mobil: kartochkalar */}
          <div className="space-y-3 md:hidden">
            {filtered.map((sale) => (
              <div
                key={sale.id}
                className={clsx(
                  "rounded-xl border bg-white/5 p-4",
                  sale.returnedAt
                    ? "border-red-500/20 opacity-60"
                    : "border-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">
                      {sale.phone.brand} {sale.phone.model}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {sale.phone.imei}
                    </div>
                  </div>
                  <span className="font-semibold text-white">
                    {formatMoney(Number(sale.finalPrice), saleCurrency(sale))}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <SaleBadges sale={sale} />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    🧑‍💼 {sale.seller.name}
                    {sale.customer ? ` · 👤 ${sale.customer.fullName}` : ""}
                  </span>
                  <span>{formatDateTime(sale.saleDate)}</span>
                </div>

                <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-2.5">
                  <a
                    href={`/api/sales/${sale.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    {t.sales.receipt}
                  </a>
                  {isOwner && !sale.returnedAt && (
                    <button
                      onClick={() => setReturningSale(sale)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t.sales.returnBtn}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: jadval */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">{t.sales.phone}</th>
                  <th className="px-4 py-3 font-medium">{t.sales.amount}</th>
                  <th className="px-4 py-3 font-medium">{t.common.status}</th>
                  <th className="px-4 py-3 font-medium">{t.sales.customer}</th>
                  <th className="px-4 py-3 font-medium">{t.sales.seller}</th>
                  <th className="px-4 py-3 font-medium">{t.common.date}</th>
                  <th className="px-4 py-3 font-medium">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr
                    key={sale.id}
                    className={clsx(
                      "border-b border-white/5 text-gray-200 last:border-0",
                      sale.returnedAt && "opacity-50"
                    )}
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
                      {formatMoney(Number(sale.finalPrice), saleCurrency(sale))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <SaleBadges sale={sale} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {sale.customer ? sale.customer.fullName : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{sale.seller.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDateTime(sale.saleDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/api/sales/${sale.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          {t.sales.receipt}
                        </a>
                        {isOwner && !sale.returnedAt && (
                          <button
                            onClick={() => setReturningSale(sale)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            {t.sales.returnBtn}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {returningSale && (
        <ReturnSaleModal
          sale={returningSale}
          onClose={() => setReturningSale(null)}
          onDone={() => {
            setReturningSale(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SaleBadges({ sale }: { sale: SaleRow }) {
  const t = useT();
  return (
    <>
      <span
        className={clsx(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          sale.paymentType === "CREDIT"
            ? "bg-purple-500/15 text-purple-300"
            : "bg-green-500/15 text-green-400"
        )}
      >
        {paymentTypeLabel(sale.paymentType, t)}
      </span>
      {sale.returnedAt && (
        <span
          className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400"
          title={sale.returnReason ?? undefined}
        >
          {t.sales.returned}
        </span>
      )}
    </>
  );
}

/** Qaytarishni tasdiqlash oynasi — sabab kiritish ixtiyoriy. */
function ReturnSaleModal({
  sale,
  onClose,
  onDone,
}: {
  sale: SaleRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${sale.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
        <h3 className="mb-1 text-lg font-semibold text-white">
          {t.returnModal.title}
        </h3>
        <p className="mb-4 text-sm text-gray-400">
          {sale.phone.brand} {sale.phone.model} {t.returnModal.note}
          {sale.customer ? t.returnModal.noteCredit : ""}
          {t.returnModal.noteTail}
        </p>

        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {t.returnModal.reason}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={t.returnModal.reasonPlaceholder}
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
        />

        {error && (
          <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleReturn}
            disabled={submitting}
            className="flex-1 rounded-lg bg-red-500/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {submitting ? t.returnModal.returning : t.returnModal.doReturn}
          </button>
        </div>
      </div>
    </div>
  );
}
