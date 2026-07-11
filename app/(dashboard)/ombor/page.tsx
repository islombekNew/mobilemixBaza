import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { listPhones } from "@/lib/phones";
import { resolveBranchId } from "@/lib/access-control";
import { PhoneTable } from "@/components/PhoneTable";
import { AddPhoneButton } from "@/components/AddPhoneButton";
import { ImportPhonesButton } from "@/components/ImportPhonesButton";
import { PhoneFiltersBar } from "@/components/PhoneFiltersBar";
import { getUsdRate } from "@/lib/exchange-rate";
import { formatMoney } from "@/lib/currency";
import type { Branch, PhoneCondition, PhoneStatus } from "@prisma/client";

interface OmborPageProps {
  searchParams: Promise<{
    branchId?: string;
    search?: string;
    brand?: string;
    condition?: string;
    status?: string;
    arxiv?: string;
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

  const showArchive = params.arxiv === "1";

  const [phones, usdRate] = await Promise.all([
    listPhones(user, branchId, {
      search: params.search,
      brand: params.brand,
      condition: params.condition as PhoneCondition | undefined,
      status: params.status as PhoneStatus | undefined,
      archived: showArchive,
    }),
    getUsdRate(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {showArchive ? "Arxiv — o'tgan oylarda sotilganlar" : "Ombor"}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {showArchive
              ? "Bu telefonlar o'tgan oylarda sotilgan va arxivga o'tkazilgan. Ma'lumot o'chirilmagan — hisobotlarda to'liq saqlanadi."
              : `Kurs (CBU): 1$ = ${formatMoney(usdRate, "UZS")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!showArchive && (
            <>
              <ImportPhonesButton branchId={branchId} />
              <AddPhoneButton branchId={branchId} />
            </>
          )}
        </div>
      </div>

      <PhoneFiltersBar />
      <PhoneTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phones={phones as any}
        branches={branches.map((b: Branch) => ({ id: b.id, name: b.name }))}
        isOwner={user.role === "OWNER"}
        usdRate={usdRate}
      />
    </div>
  );
}
