import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { listPhones } from "@/lib/phones";
import { listSales } from "@/lib/sales";
import { resolveBranchId } from "@/lib/access-control";
import { SellPhoneList } from "@/components/SellPhoneList";
import { SalesHistory } from "@/components/SalesHistory";
import type { Branch } from "@prisma/client";

interface SotuvPageProps {
  searchParams: Promise<{ branchId?: string }>;
}

export default async function SotuvPage({ searchParams }: SotuvPageProps) {
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

  const [phones, sales] = await Promise.all([
    listPhones(user, branchId, { status: "IN_STOCK" }),
    listSales(user, branchId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-white">
          Sotuv — omborda mavjud telefonlar
        </h1>
        <SellPhoneList phones={phones} branchId={branchId} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Sotuvlar tarixi
        </h2>
        <SalesHistory sales={sales} />
      </div>
    </div>
  );
}
