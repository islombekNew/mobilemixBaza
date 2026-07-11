import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { listPhones } from "@/lib/phones";
import { listSales } from "@/lib/sales";
import { listActiveSellersForBranch } from "@/lib/users";
import { resolveBranchId } from "@/lib/access-control";
import { SellPhoneList } from "@/components/SellPhoneList";
import { SalesHistory } from "@/components/SalesHistory";
import { getDict } from "@/lib/i18n/server";
import type { Branch } from "@prisma/client";

interface SotuvPageProps {
  searchParams: Promise<{ branchId?: string }>;
}

export default async function SotuvPage({ searchParams }: SotuvPageProps) {
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

  const [phones, sales, sellers] = await Promise.all([
    listPhones(user, branchId, { status: "IN_STOCK" }),
    listSales(user, branchId),
    // "Kim sotyapti"ni faqat OWNER tanlaydi; seller doim o'zi nomidan sotadi
    user.role === "OWNER"
      ? listActiveSellersForBranch(user, branchId)
      : Promise.resolve([]),
  ]);
return (
  <div className="space-y-8">
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-white">
        {t.sales.title}
      </h1>
      <SellPhoneList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phones={phones as unknown as any}
        branchId={branchId}
        sellers={sellers}
        currentUserId={user.id}
      />
    </div>

    <div>
      <h2 className="mb-4 text-lg font-semibold text-white">
        {t.sales.history}
      </h2>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SalesHistory sales={sales as any} isOwner={user.role === "OWNER"} />
    </div>
  </div>
);}