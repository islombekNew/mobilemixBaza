import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { getTopModels, compareBranches, getProfitReport } from "@/lib/reports";
import { resolveBranchId } from "@/lib/access-control";
import { redirect } from "next/navigation";
import { TopModelsTable } from "@/components/TopModelsTable";
import { BranchComparisonTable } from "@/components/BranchComparisonTable";
import { ProfitReportTable } from "@/components/ProfitReportTable";
import type { Branch } from "@prisma/client";

interface HisobotlarPageProps {
  searchParams: Promise<{ branchId?: string }>;
}

export default async function HisobotlarPage({
  searchParams,
}: HisobotlarPageProps) {
  const user = await requireUser();

  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }

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
        Hali filial qo&apos;shilmagan.
      </div>
    );
  }

  const [topModels, branchComparison, profitReport] = await Promise.all([
    getTopModels(user, branchId),
    compareBranches(user),
    getProfitReport(user, branchId),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Hisobotlar</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Filiallar taqqoslash (shu oy)
        </h2>
        <BranchComparisonTable rows={branchComparison} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Eng ko&apos;p sotilgan modellar
        </h2>
        <TopModelsTable rows={topModels} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          Foyda hisobi —{" "}
          <span className="text-gray-400">
            jami {profitReport.totalProfit.toLocaleString("uz-UZ")} so&apos;m
          </span>
        </h2>
        <ProfitReportTable rows={profitReport.rows} />
      </section>
    </div>
  );
}
