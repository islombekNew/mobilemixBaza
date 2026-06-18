import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { listCustomers, syncOverdueStatuses, getDebtSummary } from "@/lib/customers";
import { resolveBranchId } from "@/lib/access-control";
import { CustomerFiltersBar } from "@/components/CustomerFiltersBar";
import { CustomerList } from "@/components/CustomerList";
import { DebtSummaryCards } from "@/components/DebtSummaryCards";
import type { Branch, CustomerStatus } from "@prisma/client";

interface MijozlarPageProps {
  searchParams: Promise<{
    branchId?: string;
    search?: string;
    status?: string;
    overdueOnly?: string;
  }>;
}

export default async function MijozlarPage({ searchParams }: MijozlarPageProps) {
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

  await syncOverdueStatuses(user, branchId);

  const [customers, debtSummary] = await Promise.all([
    listCustomers(user, branchId, {
      search: params.search,
      status: params.status as CustomerStatus | undefined,
      overdueOnly: params.overdueOnly === "true",
    }),
    getDebtSummary(user, branchId),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">
        Mijozlar va qarz hisobi
      </h1>

      <DebtSummaryCards summary={debtSummary} />

      <CustomerFiltersBar />
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      <CustomerList customers={customers as any} />
    </div>
  );
}
