"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";

interface ImportSummary {
  created: number;
  skipped: { row: number; reason: string }[];
}

interface ImportPhonesButtonProps {
  branchId: string;
}

/**
 * Excel (.xlsx) yoki CSV orqali ulgurji telefon qo'shish. Foydalanuvchi
 * avval shablonni yuklab olishi, to'ldirib, qayta yuklashi mumkin.
 * Natija (necha ta qo'shildi, qaysi qatorlarda xato) shu yerda ko'rsatiladi.
 */
export function ImportPhonesButton({ branchId }: ImportPhonesButtonProps) {
  const router = useRouter();
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("branchId", branchId);

      const res = await fetch("/api/phones/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tr.inventory.importErr);

      setSummary(data.summary);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.common.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/5"
      >
        {tr.inventory.importExcel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
            <h2 className="mb-1 text-lg font-semibold text-white">
              {tr.inventory.importTitle}
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              {tr.inventory.importSubtitle}
            </p>

            <Link
              href="/api/phones/import"
              className="mb-4 block w-full rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-cyan-300 hover:bg-white/5"
            >
              {tr.inventory.downloadTemplate}
            </Link>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {uploading ? tr.inventory.uploading : tr.inventory.selectFile}
            </button>

            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            {summary && (
              <div className="mt-3 space-y-2">
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  ✅ {summary.created} {tr.inventory.createdMsg}
                </p>
                {summary.skipped.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                    <p className="mb-1 font-medium">
                      ⚠️ {summary.skipped.length} {tr.inventory.skippedMsg}
                    </p>
                    {summary.skipped.map((s, i) => (
                      <div key={i}>
                        {s.row}-{tr.inventory.rowLabel}: {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSummary(null);
                setError(null);
              }}
              className="mt-4 w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              {tr.common.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
