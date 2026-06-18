"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddPaymentFormProps {
  customerId: string;
  maxAmount: number;
}

export function AddPaymentForm({ customerId, maxAmount }: AddPaymentFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note || undefined }),
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
      className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3"
    >
      <div className="flex-1 min-w-[120px]">
        <label className="mb-1 block text-xs text-gray-400">
          To&apos;lov summasi (max {maxAmount.toLocaleString("uz-UZ")})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0}
          max={maxAmount}
          required
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
        {submitting ? "..." : "To'lov qo'shish"}
      </button>

      {error && (
        <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
