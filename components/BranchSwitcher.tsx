"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Branch } from "@prisma/client";

interface BranchSwitcherProps {
  branches: Branch[];
  className?: string;
}

export function BranchSwitcher({ branches, className = "" }: BranchSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBranchId = searchParams.get("branchId") ?? branches[0]?.id ?? "";

  function handleChange(branchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branchId", branchId);
    router.push(`?${params.toString()}`);
  }

  if (branches.length === 0) {
    return (
      <p className={`text-xs text-gray-500 ${className}`}>
        Hali filial qo&apos;shilmagan
      </p>
    );
  }

  return (
    <div className={className}>
      <label htmlFor="branch-switcher" className="mb-1.5 block text-xs text-gray-400">
        Filial
      </label>
      <select
        id="branch-switcher"
        value={currentBranchId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
