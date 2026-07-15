"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

const initialForm = {
  name: "",
  forModel: "",
  price: "",
  currency: "UZS" as "UZS" | "USD",
  quantity: "1",
};

/**
 * Aksesuar qo'shish: soni bilan (masalan bir xil g'ilofdan 15 ta).
 * Server tomonda bir xil nom+model mavjud bo'lsa, yangi yozuv ochilmaydi —
 * mavjudining soni oshiriladi.
 */
export function AddAccessoryButton() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handlePriceInput(raw: string) {
    const digits = raw.replace(/\./g, "").replace(/\D/g, "");
    setForm((p) => ({ ...p, price: digits ? formatNumber(Number(digits)) : "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          forModel: form.forModel || null,
          price: Number(parseFormattedNumber(form.price)),
          currency: form.currency,
          quantity: Number(form.quantity) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);

      if (data.merged) {
        // Yopmaymiz — foydalanuvchi soni oshganini ko'rsin
        setInfo(t.accessories.mergedNote);
        setForm(initialForm);
      } else {
        setOpen(false);
        setForm(initialForm);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon-pink transition hover:opacity-90"
      >
        {t.accessories.add}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t.accessories.addTitle}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.accessories.name}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t.accessories.namePlaceholder}
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.accessories.forModel}
                </label>
                <input
                  type="text"
                  value={form.forModel}
                  onChange={(e) => setForm((p) => ({ ...p, forModel: e.target.value }))}
                  placeholder={t.accessories.forModelPlaceholder}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.phoneForm.currency}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["UZS", "USD"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, currency: cur }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        form.currency === cur
                          ? "border-[#ff4fd8] bg-brand-gradient text-white"
                          : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {cur === "UZS" ? t.phoneForm.som : t.phoneForm.dollar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    {t.phoneForm.salePrice} ({form.currency === "USD" ? "$" : "so'm"})
                  </label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => handlePriceInput(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    {t.accessories.quantity}
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    min={1}
                    max={10000}
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  ✅ {info}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setForm(initialForm);
                    setInfo(null);
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
