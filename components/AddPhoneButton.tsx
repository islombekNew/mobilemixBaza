"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { warrantyLabel } from "@/lib/i18n/dictionaries";

/** Nusxalashda oldindan to'ldiriladigan maydonlar (IMEI har doim bo'sh qoladi). */
export interface PhonePrefill {
  model: string;
  brand: string;
  color: string;
  storageGB: number;
  ramGB?: number | null;
  condition: string;
  costPrice?: string | number | null;
  salePrice: string | number;
  currency?: string;
  batteryHealth?: number | null;
  warrantyMonths?: number;
  supplier?: string | null;
  hasBox?: boolean;
  hasCharger?: boolean;
  hasDocuments?: boolean;
}

interface AddPhoneButtonProps {
  branchId: string;
  /** Berilsa — forma shu qiymatlar bilan ochiladi (bir xil telefon ko'p kelganda) */
  prefill?: PhonePrefill;
  /** true — modal darhol ochiq (tashqi boshqaruv, masalan "Nusxa" tugmasi) */
  forceOpen?: boolean;
  /** true — o'zining "+ Telefon qo'shish" tugmasi ko'rsatilmaydi */
  hideTrigger?: boolean;
  onClose?: () => void;
}

const WARRANTY_VALUES = [0, 1, 3, 6, 12, 24];

const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16];

const initialForm = {
  model: "",
  brand: "",
  color: "",
  storageGB: "128",
  ramGB: "",
  imei: "",
  condition: "NEW",
  batteryHealth: "",
  costPrice: "",
  salePrice: "",
  currency: "UZS" as "UZS" | "USD",
  hasBox: false,
  hasCharger: false,
  hasDocuments: false,
  warrantyMonths: "0",
  supplier: "",
};

/** Prefill'dan forma boshlang'ich holatini yasaydi (IMEI bo'sh). */
function formFromPrefill(prefill: PhonePrefill): typeof initialForm {
  return {
    ...initialForm,
    model: prefill.model,
    brand: prefill.brand,
    color: prefill.color,
    storageGB: String(prefill.storageGB),
    ramGB: prefill.ramGB ? String(prefill.ramGB) : "",
    condition: prefill.condition,
    batteryHealth: prefill.batteryHealth ? String(prefill.batteryHealth) : "",
    costPrice:
      prefill.costPrice !== null && prefill.costPrice !== undefined
        ? formatNumber(Number(prefill.costPrice))
        : "",
    salePrice: formatNumber(Number(prefill.salePrice)),
    currency: (prefill.currency === "USD" ? "USD" : "UZS") as "UZS" | "USD",
    warrantyMonths: String(prefill.warrantyMonths ?? 0),
    supplier: prefill.supplier ?? "",
    hasBox: prefill.hasBox ?? false,
    hasCharger: prefill.hasCharger ?? false,
    hasDocuments: prefill.hasDocuments ?? false,
  };
}

export function AddPhoneButton({
  branchId,
  prefill,
  forceOpen = false,
  hideTrigger = false,
  onClose,
}: AddPhoneButtonProps) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(forceOpen);
  const [form, setForm] = useState(prefill ? formFromPrefill(prefill) : initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function close() {
    setOpen(false);
    setForm(prefill ? formFromPrefill(prefill) : initialForm);
    onClose?.();
  }

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const currencyLabel = form.currency === "USD" ? "$" : "so'm";

  function handleNumberInput(field: "costPrice" | "salePrice", raw: string) {
    const digits = raw.replace(/\./g, "").replace(/\D/g, "");
    update(field, digits ? formatNumber(Number(digits)) : "");
  }

  const profit = useMemo(() => {
    const cost = Number(parseFormattedNumber(form.costPrice));
    const sale = Number(parseFormattedNumber(form.salePrice));
    if (!cost || !sale) return null;
    return sale - cost;
  }, [form.costPrice, form.salePrice]);

  const isUsed = form.condition === "USED" || form.condition === "REFURBISHED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        ...form,
        branchId,
        costPrice: Number(parseFormattedNumber(form.costPrice)) || undefined,
        salePrice: Number(parseFormattedNumber(form.salePrice)),
        ramGB: form.ramGB ? Number(form.ramGB) : null,
        batteryHealth: form.batteryHealth ? Number(form.batteryHealth) : null,
        warrantyMonths: Number(form.warrantyMonths),
        supplier: form.supplier || null,
      };

      const res = await fetch("/api/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);

      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon-pink transition hover:opacity-90"
        >
          {t.inventory.addPhone}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="my-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a0a2e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t.phoneForm.addTitle}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Model va Brend */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.phoneForm.model} value={form.model} onChange={(v) => update("model", v)} placeholder="iPhone 13" required />
                <Field label={t.phoneForm.brand} value={form.brand} onChange={(v) => update("brand", v)} placeholder="Apple" required />
              </div>

              {/* Rang va Holati */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.phoneForm.color} value={form.color} onChange={(v) => update("color", v)} required />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.condition}</label>
                  <select
                    value={form.condition}
                    onChange={(e) => update("condition", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    <option value="NEW">{t.phoneForm.conditionNew}</option>
                    <option value="USED">{t.phoneForm.conditionUsed}</option>
                    <option value="REFURBISHED">{t.phoneForm.conditionRefurb}</option>
                  </select>
                </div>
              </div>

              {/* Xotira va RAM */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.phoneForm.storage} value={form.storageGB} onChange={(v) => update("storageGB", v)} type="number" min={1} required />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.ram}</label>
                  <select
                    value={form.ramGB}
                    onChange={(e) => update("ramGB", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    <option value="">{t.phoneForm.notSelected}</option>
                    {RAM_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r} GB</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IMEI */}
              <Field
                label={t.phoneForm.imei}
                value={form.imei}
                onChange={(v) => update("imei", v)}
                placeholder="356789012345671"
                pattern="\d{15}"
                title="IMEI 15"
                required
              />

              {/* Batareya holati — faqat ishlatilgan/refurbished uchun */}
              {isUsed && (
                <Field
                  label={t.phoneForm.battery}
                  value={form.batteryHealth}
                  onChange={(v) => update("batteryHealth", v)}
                  type="number"
                  min={1}
                  max={100}
                  placeholder="85"
                />
              )}

              {/* Narx valyutasi */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.currency}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["UZS", "USD"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => update("currency", cur)}
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

              {/* Tan narxi va Sotuv narxi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.costPrice} ({currencyLabel})</label>
                  <input
                    type="text"
                    value={form.costPrice}
                    onChange={(e) => handleNumberInput("costPrice", e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.salePrice} ({currencyLabel})</label>
                  <input
                    type="text"
                    value={form.salePrice}
                    onChange={(e) => handleNumberInput("salePrice", e.target.value)}
                    placeholder="0"
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                  />
                </div>
              </div>

              {/* Avtomatik foyda hisoblash */}
              {profit !== null && (
                <div className={`rounded-lg px-3 py-2 text-sm ${profit >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {t.phoneForm.profit}: <span className="font-semibold">
                    {form.currency === "USD" ? `$${formatNumber(profit)}` : `${formatNumber(profit)} so'm`}
                  </span>
                </div>
              )}

              {/* Kafolat va Yetkazib beruvchi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.phoneForm.warranty}</label>
                  <select
                    value={form.warrantyMonths}
                    onChange={(e) => update("warrantyMonths", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    {WARRANTY_VALUES.map((w) => (
                      <option key={w} value={w}>{warrantyLabel(w, t)}</option>
                    ))}
                  </select>
                </div>
                <Field
                  label={t.phoneForm.supplier}
                  value={form.supplier}
                  onChange={(v) => update("supplier", v)}
                  placeholder={t.phoneForm.supplierPlaceholder}
                />
              </div>

              {/* Komplektatsiya */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-300">{t.phoneForm.complectation}</p>
                <div className="flex flex-wrap gap-3">
                  <Checkbox label={t.phoneForm.hasBox} checked={form.hasBox} onChange={(v) => update("hasBox", v)} />
                  <Checkbox label={t.phoneForm.hasCharger} checked={form.hasCharger} onChange={(v) => update("hasCharger", v)} />
                  <Checkbox label={t.phoneForm.hasDocs} checked={form.hasDocuments} onChange={(v) => update("hasDocuments", v)} />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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

function Field({
  label, value, onChange, type = "text", placeholder, required, min, max, pattern, title,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  title?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        pattern={pattern}
        title={title}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
      />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-[#ff4fd8]"
      />
      {label}
    </label>
  );
}
