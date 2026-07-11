import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { getBranchDashboard, type DashboardPeriod } from "@/lib/reports";
import { resolveBranchId } from "@/lib/access-control";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardPeriodFilter } from "@/components/DashboardPeriodFilter";
import { getDict } from "@/lib/i18n/server";

import type { Branch } from "@prisma/client";

interface DashboardHomePageProps {
  searchParams: Promise<{ branchId?: string; period?: string }>;
}

export default async function DashboardHomePage({
  searchParams,
}: DashboardHomePageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const t = await getDict();

  const branches = await listBranches(user);
  const branchId = resolveBranchId(
    user,
    branches.map((b: Branch) => b.id),
    params.branchId
  );

  if (!branchId) {
    return <div className="text-gray-400">{t.branches.empty}</div>;
  }

  const validPeriods: DashboardPeriod[] = ["today", "yesterday", "week", "month"];
  const period: DashboardPeriod = validPeriods.includes(params.period as DashboardPeriod)
    ? (params.period as DashboardPeriod)
    : "month";

  const stats = await getBranchDashboard(user, branchId, period);
  const branchName = branches.find((b: Branch) => b.id === branchId)?.name ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{t.dashboard.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{branchName}</p>

      <div className="mt-4 mb-6">
        <DashboardPeriodFilter current={period} />
      </div>

      <DashboardStats stats={stats} period={period} />
    </div>
  );
}
