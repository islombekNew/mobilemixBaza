"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

interface DeleteBranchButtonProps {
  branchId: string;
  branchName: string;
}

/**
 * Filialni o'chirish/arxivlash tugmasi. Server o'zi hal qiladi:
 * bo'sh filial butunlay o'chadi, ma'lumoti bori arxivlanadi
 * (tarix saqlanadi) — lib/branches.ts: deleteOrArchiveBranch.
 */
export function DeleteBranchButton({ branchId, branchName }: DeleteBranchButtonProps) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`"${branchName}" — ${t.branches.deleteConfirm}`)) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/branches/${branchId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        onClick={handleDelete}
        disabled={busy}
        className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? "..." : t.common.delete}
      </button>
      {error && (
        <p className="mt-2 max-w-[220px] rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
