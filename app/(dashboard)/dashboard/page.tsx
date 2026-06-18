import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { getBranchDashboard } from "@/lib/reports";
import { resolveBranchId } from "@/lib/access-control";
import { DashboardStats } from "@/components/DashboardStats";

import type { Branch } from "@prisma/client";

interface DashboardHomePageProps {
  searchParams: Promise<{ branchId?: string }>;
}

export default async function DashboardHomePage({
  searchParams,
}: DashboardHomePageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const branches = await listBranches(user);
  const branchId = resolveBranchId(
    user,
    branches.map((b: Branch) => b.id),
    params.branchId
  );

  if (!branchId) {
    return (
      <div className="text-gray-400">
        Hali filial qo&apos;shilmagan. Avval &quot;Filiallar&quot; bo&apos;limidan
        filial qo&apos;shing.
      </div>
    );
  }

  const stats = await getBranchDashboard(user, branchId);
  const branchName = branches.find((b: Branch) => b.id === branchId)?.name ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Bosh sahifa</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">{branchName}</p>

      <DashboardStats stats={stats} />
    </div>
  );
}
