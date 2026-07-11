"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DashboardPeriod } from "@/lib/reports";
import { useT } from "@/lib/i18n/client";

const OPTIONS: DashboardPeriod[] = ["today", "yesterday", "week", "month"];

interface DashboardPeriodFilterProps {
  current: DashboardPeriod;
}

export function DashboardPeriodFilter({ current }: DashboardPeriodFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  function select(value: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => select(opt)}
          className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
            current === opt
              ? "border-[#ff4fd8]/50 bg-[#ff4fd8]/15 text-[#ff4fd8]"
              : "border-white/10 text-gray-400 hover:bg-white/5"
          }`}
        >
          {t.period[opt]}
        </button>
      ))}
    </div>
  );
}
