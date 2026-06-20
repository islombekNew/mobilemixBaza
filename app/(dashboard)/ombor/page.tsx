import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { listPhones } from "@/lib/phones";
import { resolveBranchId } from "@/lib/access-control";
import { PhoneTable } from "@/components/PhoneTable";
import { AddPhoneButton } from "@/components/AddPhoneButton";
import { ImportPhonesButton } from "@/components/ImportPhonesButton";
import { PhoneFiltersBar } from "@/components/PhoneFiltersBar";
import type { Branch, PhoneCondition, PhoneStatus } from "@prisma/client";

interface OmborPageProps {
  searchParams: Promise<{
    branchId?: string;
    search?: string;
    brand?: string;
    condition?: string;
    status?: string;
  }>;
}

export default async function OmborPage({ searchParams }: OmborPageProps) {
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

  const phones = await listPhones(user, branchId, {
    search: params.search,
    brand: params.brand,
    condition: params.condition as PhoneCondition | undefined,
    status: params.status as PhoneStatus | undefined,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Ombor</h1>
        <div className="flex flex-wrap gap-2">
          <ImportPhonesButton branchId={branchId} />
          <AddPhoneButton branchId={branchId} />
        </div>
      </div>

      <PhoneFiltersBar />
      <PhoneTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phones={phones as any}
        branches={branches.map((b: Branch) => ({ id: b.id, name: b.name }))}
        isOwner={user.role === "OWNER"}
      />
    </div>
  );
}
