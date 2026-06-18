"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddPhoneButtonProps {
  branchId: string;
}

const initialForm = {
  model: "",
  brand: "",
  color: "",
  storageGB: "128",
  imei: "",
  condition: "NEW",
  costPrice: "",
  salePrice: "",
};

export function AddPhoneButton({ branchId }: AddPhoneButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, branchId }),
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a0a2e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Yangi telefon qo&apos;shish
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Model"
                  value={form.model}
                  onChange={(v) => update("model", v)}
                  placeholder="iPhone 13"
                  required
                />
                <Field
                  label="Brend"
                  value={form.brand}
                  onChange={(v) => update("brand", v)}
                  placeholder="Apple"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Rang"
                  value={form.color}
                  onChange={(v) => update("color", v)}
                  placeholder="Qora"
                  required
                />
                <Field
                  label="Xotira (GB)"
                  value={form.storageGB}
                  onChange={(v) => update("storageGB", v)}
                  type="number"
                  min={1}
                  required
                />
              </div>

              <Field
                label="IMEI"
                value={form.imei}
                onChange={(v) => update("imei", v)}
                placeholder="356789012345671"
                pattern="\d{15}"
                title="IMEI 15 xonali raqamdan iborat bo'lishi kerak"
                required
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Holati
                </label>
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

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Tan narxi"
                  value={form.costPrice}
                  onChange={(v) => update("costPrice", v)}
                  type="number"
                  min={0}
                  required
                />
                <Field
                  label="Sotuv narxi"
                  value={form.salePrice}
                  onChange={(v) => update("salePrice", v)}
                  type="number"
                  min={0}
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  min,
  pattern,
  title,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  pattern?: string;
  title?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        pattern={pattern}
        title={title}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
      />
    </div>
  );
}
