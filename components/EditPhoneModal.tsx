"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { warrantyLabel } from "@/lib/i18n/dictionaries";

interface EditPhoneModalProps {
  phone: {
    id: string;
    model: string;
    brand: string;
    color: string;
    storageGB: number;
    ramGB?: number | null;
    condition: string;
    costPrice: string | number | null;
    salePrice: string | number;
    currency?: string;
    batteryHealth?: number | null;
    warrantyMonths?: number;
    supplier?: string | null;
    hasBox?: boolean;
    hasCharger?: boolean;
    hasDocuments?: boolean;
  };
  onClose: () => void;
}

const WARRANTY_VALUES = [0, 1, 3, 6, 12, 24];

const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16];

export function EditPhoneModal({ phone, onClose }: EditPhoneModalProps) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({
    model: phone.model,
    brand: phone.brand,
    color: phone.color,
    storageGB: String(phone.storageGB),
    ramGB: phone.ramGB ? String(phone.ramGB) : "",
    condition: phone.condition,
    costPrice: phone.costPrice !== null ? formatNumber(Number(phone.costPrice)) : "",
    salePrice: formatNumber(Number(phone.salePrice)),
    currency: (phone.currency === "USD" ? "USD" : "UZS") as "UZS" | "USD",
    batteryHealth: phone.batteryHealth ? String(phone.batteryHealth) : "",
    warrantyMonths: String(phone.warrantyMonths ?? 0),
    supplier: phone.supplier ?? "",
    hasBox: phone.hasBox ?? false,
    hasCharger: phone.hasCharger ?? false,
    hasDocuments: phone.hasDocuments ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const profit = useMemo(() => {
    const cost = Number(parseFormattedNumber(form.costPrice));
    const sale = Number(parseFormattedNumber(form.salePrice));
    if (!cost || !sale) return null;
    return sale - cost;
  }, [form.costPrice, form.salePrice]);

  const isUsed = form.condition === "USED" || form.condition === "REFURBISHED";

  function handleNumberInput(field: keyof typeof form, raw: string) {
    const digits = raw.replace(/\./g, "").replace(/\D/g, "");
    const formatted = digits ? formatNumber(Number(digits)) : "";
    setForm((p) => ({ ...p, [field]: formatted }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        model: form.model,
        brand: form.brand,
        color: form.color,
        storageGB: Number(form.storageGB),
        ramGB: form.ramGB ? Number(form.ramGB) : null,
        condition: form.condition,
        costPrice: Number(parseFormattedNumber(form.costPrice)),
        salePrice: Number(parseFormattedNumber(form.salePrice)),
        currency: form.currency,
        batteryHealth: form.batteryHealth ? Number(form.batteryHealth) : null,
        warrantyMonths: Number(form.warrantyMonths),
        supplier: form.supplier || null,
        hasBox: form.hasBox,
        hasCharger: form.hasCharger,
        hasDocuments: form.hasDocuments,
      };
      const res = await fetch(`/api/phones/${phone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a0a2e] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{t.phoneForm.editTitle}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label={t.phoneForm.model} value={form.model} onChange={(v) => setForm(p => ({ ...p, model: v }))} required />
            <F label={t.phoneForm.brand} value={form.brand} onChange={(v) => setForm(p => ({ ...p, brand: v }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label={t.phoneForm.color} value={form.color} onChange={(v) => setForm(p => ({ ...p, color: v }))} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.condition}</label>
              <select value={form.condition} onChange={(e) => setForm(p => ({ ...p, condition: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]">
                <option value="NEW">{t.phoneForm.conditionNew}</option>
                <option value="USED">{t.phoneForm.conditionUsed}</option>
                <option value="REFURBISHED">{t.phoneForm.conditionRefurb}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label={t.phoneForm.storage} value={form.storageGB} onChange={(v) => setForm(p => ({ ...p, storageGB: v }))} type="number" min={1} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.ram}</label>
              <select value={form.ramGB} onChange={(e) => setForm(p => ({ ...p, ramGB: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]">
                <option value="">{t.phoneForm.notSelected}</option>
                {RAM_OPTIONS.map((r) => <option key={r} value={r}>{r} GB</option>)}
              </select>
            </div>
          </div>

          {isUsed && (
            <F label={t.phoneForm.battery} value={form.batteryHealth}
              onChange={(v) => setForm(p => ({ ...p, batteryHealth: v }))} type="number" min={1} max={100} placeholder="85" />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.currency}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["UZS", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, currency: cur }))}
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
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.costPrice} ({form.currency === "USD" ? "$" : "so'm"})</label>
              <input type="text" value={form.costPrice} onChange={(e) => handleNumberInput("costPrice", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                placeholder="0" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.salePrice} ({form.currency === "USD" ? "$" : "so'm"})</label>
              <input type="text" value={form.salePrice} onChange={(e) => handleNumberInput("salePrice", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                placeholder="0" required />
            </div>
          </div>

          {profit !== null && (
            <div className={`rounded-lg px-3 py-2 text-sm ${profit >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {t.phoneForm.profit}: <span className="font-semibold">
                {form.currency === "USD" ? `$${formatNumber(profit)}` : `${formatNumber(profit)} so'm`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.warranty}</label>
              <select value={form.warrantyMonths} onChange={(e) => setForm(p => ({ ...p, warrantyMonths: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]">
                {WARRANTY_VALUES.map((w) => <option key={w} value={w}>{warrantyLabel(w, t)}</option>)}
              </select>
            </div>
            <F label={t.phoneForm.supplier} value={form.supplier} onChange={(v) => setForm(p => ({ ...p, supplier: v }))} placeholder={t.phoneForm.supplierPlaceholder} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-300">{t.phoneForm.complectation}</p>
            <div className="flex flex-wrap gap-3">
              <CB label={t.phoneForm.hasBox} checked={form.hasBox} onChange={(v) => setForm(p => ({ ...p, hasBox: v }))} />
              <CB label={t.phoneForm.hasCharger} checked={form.hasCharger} onChange={(v) => setForm(p => ({ ...p, hasCharger: v }))} />
              <CB label={t.phoneForm.hasDocs} checked={form.hasDocuments} onChange={(v) => setForm(p => ({ ...p, hasDocuments: v }))} />
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required, min, max }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required} min={min} max={max}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]" />
    </div>
  );
}

function CB({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-[#ff4fd8]" />
      {label}
    </label>
  );
}
