import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import {
  getTopModels,
  compareBranches,
  getProfitReport,
  getDailyRevenueSeries,
  getSellerPerformance,
} from "@/lib/reports";
import { resolveBranchId } from "@/lib/access-control";
import { redirect } from "next/navigation";
import { TopModelsTable } from "@/components/TopModelsTable";
import { BranchComparisonTable } from "@/components/BranchComparisonTable";
import { ProfitReportTable } from "@/components/ProfitReportTable";
import { SellerPerformanceTable } from "@/components/SellerPerformanceTable";
import { RevenueChart } from "@/components/RevenueChart";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { getDict } from "@/lib/i18n/server";
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

  const [topModels, branchComparison, profitReport, revenueSeries, sellerPerformance] =
    await Promise.all([
      getTopModels(user, branchId),
      compareBranches(user),
      getProfitReport(user, branchId),
      getDailyRevenueSeries(user, branchId, 30),
      getSellerPerformance(user, branchId),
    ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">{t.reports.title}</h1>
        <ExportExcelButton branchId={branchId} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          {t.reports.revenue30}
        </h2>
        <RevenueChart data={revenueSeries} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          {t.reports.branchCompare}
        </h2>
        <BranchComparisonTable rows={branchComparison} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          {t.reports.sellerReport}
        </h2>
        <SellerPerformanceTable rows={sellerPerformance} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          {t.reports.topModels}
        </h2>
        <TopModelsTable rows={topModels} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">
          {t.reports.profitReport} —{" "}
          <span className="text-gray-400">
            {t.reports.total} {profitReport.totalProfit.toLocaleString("uz-UZ")} so&apos;m
          </span>
        </h2>
        <ProfitReportTable rows={profitReport.rows} />
      </section>
    </div>
  );
}
