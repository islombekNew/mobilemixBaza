"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface AddPhoneButtonProps {
  branchId: string;
}

const WARRANTY_OPTIONS = [
  { value: 0,  label: "Kafolatsiz" },
  { value: 1,  label: "1 oy" },
  { value: 3,  label: "3 oy" },
  { value: 6,  label: "6 oy" },
  { value: 12, label: "1 yil" },
  { value: 24, label: "2 yil" },
];

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
  hasBox: false,
  hasCharger: false,
  hasDocuments: false,
  warrantyMonths: "0",
  supplier: "",
};

export function AddPhoneButton({ branchId }: AddPhoneButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const profit = useMemo(() => {
    const cost = Number(form.costPrice);
    const sale = Number(form.salePrice);
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
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi");

      setOpen(false);
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
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
        + Telefon qo&apos;shish
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="my-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a0a2e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Yangi telefon qo&apos;shish
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Model va Brend */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Model" value={form.model} onChange={(v) => update("model", v)} placeholder="iPhone 13" required />
                <Field label="Brend" value={form.brand} onChange={(v) => update("brand", v)} placeholder="Apple" required />
              </div>

              {/* Rang va Holati */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rang" value={form.color} onChange={(v) => update("color", v)} placeholder="Qora" required />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Holati</label>
                  <select
                    value={form.condition}
                    onChange={(e) => update("condition", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    <option value="NEW">Yangi</option>
                    <option value="USED">Ishlatilgan</option>
                    <option value="REFURBISHED">Qayta tiklangan</option>
                  </select>
                </div>
              </div>

              {/* Xotira va RAM */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Xotira (GB)" value={form.storageGB} onChange={(v) => update("storageGB", v)} type="number" min={1} required />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">RAM (GB)</label>
                  <select
                    value={form.ramGB}
                    onChange={(e) => update("ramGB", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    <option value="">— tanlanmagan</option>
                    {RAM_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r} GB</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IMEI */}
              <Field
                label="IMEI"
                value={form.imei}
                onChange={(v) => update("imei", v)}
                placeholder="356789012345671"
                pattern="\d{15}"
                title="IMEI 15 xonali raqamdan iborat bo'lishi kerak"
                required
              />

              {/* Batareya holati — faqat ishlatilgan/refurbished uchun */}
              {isUsed && (
                <Field
                  label="Batareya holati (%)"
                  value={form.batteryHealth}
                  onChange={(v) => update("batteryHealth", v)}
                  type="number"
                  min={1}
                  max={100}
                  placeholder="85"
                />
              )}

              {/* Tan narxi va Sotuv narxi */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tan narxi" value={form.costPrice} onChange={(v) => update("costPrice", v)} type="number" min={0} required />
                <Field label="Sotuv narxi" value={form.salePrice} onChange={(v) => update("salePrice", v)} type="number" min={0} required />
              </div>

              {/* Avtomatik foyda hisoblash */}
              {profit !== null && (
                <div className={`rounded-lg px-3 py-2 text-sm ${profit >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  Foyda: <span className="font-semibold">{profit.toLocaleString("uz-UZ")} so&apos;m</span>
                </div>
              )}

              {/* Kafolat va Yetkazib beruvchi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Kafolat</label>
                  <select
                    value={form.warrantyMonths}
                    onChange={(e) => update("warrantyMonths", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    {WARRANTY_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Yetkazib beruvchi"
                  value={form.supplier}
                  onChange={(v) => update("supplier", v)}
                  placeholder="Hamkor nomi"
                />
              </div>

              {/* Komplektatsiya */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-300">Komplektatsiya</p>
                <div className="flex flex-wrap gap-3">
                  <Checkbox label="Karobka bor" checked={form.hasBox} onChange={(v) => update("hasBox", v)} />
                  <Checkbox label="Zaryadchik bor" checked={form.hasCharger} onChange={(v) => update("hasCharger", v)} />
                  <Checkbox label="Hujjat bor" checked={form.hasDocuments} onChange={(v) => update("hasDocuments", v)} />
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
                  onClick={() => { setOpen(false); setForm(initialForm); }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Saqlanmoqda..." : "Saqlash"}
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
