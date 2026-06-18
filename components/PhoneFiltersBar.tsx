"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PhoneFiltersBar() {
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

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Model, brend yoki IMEI bo'yicha qidirish..."
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
        />
      </form>

      <select
        value={searchParams.get("condition") ?? ""}
        onChange={(e) => updateParam("condition", e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        <option value="">Barcha holatlar</option>
        <option value="NEW">Yangi</option>
        <option value="USED">Ishlatilgan</option>
        <option value="REFURBISHED">Qayta tiklangan</option>
      </select>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        <option value="">Barcha statuslar</option>
        <option value="IN_STOCK">Omborda</option>
        <option value="SOLD">Sotilgan</option>
      </select>
    </div>
  );
}
