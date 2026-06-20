"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, parseFormattedNumber } from "@/lib/format";

interface AddPaymentFormProps {
  customerId: string;
  maxAmount: number;
}

export function AddPaymentForm({ customerId, maxAmount }: AddPaymentFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/\./g, "").replace(/\D/g, "");
    setAmount(digits ? formatNumber(Number(digits)) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const numAmount = Number(parseFormattedNumber(amount));
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          paymentType,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi");

      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 border-t border-white/10 pt-3"
    >
      {/* To'lov turi */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPaymentType("CASH")}
          className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            paymentType === "CASH"
              ? "border-green-500/50 bg-green-500/15 text-green-400"
              : "border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          💵 Naqd
        </button>
        <button
          type="button"
          onClick={() => setPaymentType("CARD")}
          className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            paymentType === "CARD"
              ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
              : "border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          💳 Karta
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-xs text-gray-400">
            Summa (maks: {formatNumber(maxAmount)} so&apos;m)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            required
            placeholder="0"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-xs text-gray-400">Izoh (ixtiyoriy)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-gradient px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "..." : "Qo'shish"}
        </button>
      </div>

      {error && (
        <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
