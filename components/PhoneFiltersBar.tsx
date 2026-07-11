"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export function PhoneFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const t = useT();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.sales.searchPlaceholder}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
        />
      </form>

      <select
        value={searchParams.get("condition") ?? ""}
        onChange={(e) => updateParam("condition", e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        <option value="">{t.phoneForm.condition} · {t.common.all}</option>
        <option value="NEW">{t.phoneForm.conditionNew}</option>
        <option value="USED">{t.phoneForm.conditionUsed}</option>
        <option value="REFURBISHED">{t.phoneForm.conditionRefurb}</option>
      </select>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        <option value="">{t.common.status} · {t.common.all}</option>
        <option value="IN_STOCK">{t.inventory.inStockBadge}</option>
        <option value="SOLD">{t.inventory.soldBadge}</option>
      </select>

      <button
        type="button"
        onClick={() => updateParam("arxiv", searchParams.get("arxiv") === "1" ? "" : "1")}
        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
          searchParams.get("arxiv") === "1"
            ? "border-[#ff4fd8] bg-brand-gradient text-white"
            : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/5"
        }`}
      >
        {t.inventory.archive}
      </button>
    </div>
  );
}
