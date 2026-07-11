"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BranchOption {
  id: string;
  name: string;
}

interface TransferPhoneButtonProps {
  phoneId: string;
  currentBranchId: string;
  branches: BranchOption[];
}

/**
 * Faqat OWNER ko'radi (ombor/page.tsx shunday tekshiradi) — telefonni
 * boshqa filialga ko'chirish uchun kichik modal. lib/phones.ts'dagi
 * transferPhone funksiyasi qaytadan SELLER ekanini tekshiradi, bu
 * komponent shunchaki UI qulayligi uchun.
 */
export function TransferPhoneButton({
  phoneId,
  currentBranchId,
  branches,
}: TransferPhoneButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherBranches = branches.filter((b) => b.id !== currentBranchId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetBranchId) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/phones/${phoneId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBranchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ko'chirishda xatolik");

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (otherBranches.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-cyan-300 hover:text-cyan-200"
      >
        🔁 Ko&apos;chirish
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
            <h2 className="mb-1 text-lg font-semibold text-white">
              Filialga ko&apos;chirish
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Telefon tanlangan filialning omboriga o&apos;tkaziladi.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
              >
                <option value="">Filial tanlang...</option>
                {otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

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
                  disabled={submitting || !targetBranchId}
                  className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Ko'chirilmoqda..." : "Ko'chirish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
