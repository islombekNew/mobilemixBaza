"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export function CustomerFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

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

  const overdueOnly = searchParams.get("overdueOnly") === "true";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism yoki telefon raqami bo'yicha qidirish..."
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
        />
      </form>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        <option value="">Barcha statuslar</option>
        <option value="ACTIVE">Faol qarz</option>
        <option value="PAID">To&apos;liq to&apos;langan</option>
        <option value="OVERDUE">Muddati o&apos;tgan</option>
      </select>

      <button
        onClick={() => updateParam("overdueOnly", overdueOnly ? "" : "true")}
        className={clsx(
          "rounded-lg border px-3 py-2 text-sm font-medium transition",
          overdueOnly
            ? "border-red-500/40 bg-red-500/10 text-red-300"
            : "border-white/10 text-gray-300 hover:bg-white/5"
        )}
      >
        Faqat muddati o&apos;tganlar
      </button>
    </div>
  );
}
