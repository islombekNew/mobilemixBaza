"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { useT } from "@/lib/i18n/client";

interface AccessoryRow {
  id: string;
  name: string;
  forModel: string | null;
  price: number;
  currency: CurrencyCode;
  quantity: number;
  description: string | null;
}

interface AccessoryTableProps {
  accessories: AccessoryRow[];
  usdRate: number;
}

/**
 * Aksesuarlar ro'yxati: har birida SONI ko'rinadi, +/- tugmalari bilan
 * tez o'zgartiriladi (sotildi -> minus, yangi keldi -> plus).
 * Mobilda kartochka, desktopda ham kartochka grid (rasmsiz ixcham).
 */
export function AccessoryTable({ accessories, usdRate }: AccessoryTableProps) {
  const router = useRouter();
  const t = useT();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accessories;
    return accessories.filter((a) =>
      `${a.name} ${a.forModel ?? ""}`.toLowerCase().includes(q)
    );
  }, [accessories, search]);

  async function adjustQuantity(id: string, delta: number) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/accessories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityDelta: delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.accessories.deleteConfirm)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/accessories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusyId(null);
    }
  }

  if (accessories.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        {t.accessories.empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.accessories.search}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8] sm:max-w-sm"
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((a) => {
          const out = a.quantity <= 0;
          return (
            <div
              key={a.id}
              className={clsx(
                "rounded-xl border bg-white/5 p-4",
                out ? "border-red-500/20 opacity-60" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{a.name}</div>
                  {a.forModel && (
                    <div className="text-xs text-gray-500">📱 {a.forModel}</div>
                  )}
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    out
                      ? "bg-red-500/15 text-red-400"
                      : "bg-green-500/15 text-green-400"
                  )}
                >
                  {out ? t.accessories.outOfStock : `${a.quantity} ${t.accessories.inStockCount}`}
                </span>
              </div>

              <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
                <div className="font-semibold text-white">
                  {formatMoney(a.price, a.currency)}
                </div>
                {usdRate > 0 && (
                  <div className="text-xs text-gray-500">
                    ≈{" "}
                    {a.currency === "USD"
                      ? formatMoney(a.price * usdRate, "UZS")
                      : formatMoney(a.price / usdRate, "USD")}
                  </div>
                )}
              </div>

              {/* Soni boshqaruvi: - 1 + */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjustQuantity(a.id, -1)}
                    disabled={busyId === a.id || a.quantity <= 0}
                    className="h-8 w-8 rounded-lg border border-white/10 text-lg leading-none text-gray-300 hover:bg-white/5 disabled:opacity-40"
                    aria-label="-1"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold text-white">
                    {busyId === a.id ? "..." : a.quantity}
                  </span>
                  <button
                    onClick={() => adjustQuantity(a.id, 1)}
                    disabled={busyId === a.id}
                    className="h-8 w-8 rounded-lg border border-white/10 text-lg leading-none text-gray-300 hover:bg-white/5 disabled:opacity-40"
                    aria-label="+1"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={busyId === a.id}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
