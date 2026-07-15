import { requireUser } from "@/lib/session";
import { listAccessories } from "@/lib/accessories";
import { getUsdRate } from "@/lib/exchange-rate";
import { getDict } from "@/lib/i18n/server";
import { AccessoryTable } from "@/components/AccessoryTable";
import { AddAccessoryButton } from "@/components/AddAccessoryButton";

interface AksesuarlarPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function AksesuarlarPage({ searchParams }: AksesuarlarPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const t = await getDict();

  const [accessories, usdRate] = await Promise.all([
    listAccessories(user, { search: params.search }),
    getUsdRate(),
  ]);

  // Decimal -> number (client komponentga faqat oddiy qiymatlar o'tadi)
  const rows = accessories.map((a) => ({
    id: a.id,
    name: a.name,
    forModel: a.forModel,
    price: Number(a.price),
    currency: (a.currency === "USD" ? "USD" : "UZS") as "USD" | "UZS",
    quantity: a.quantity,
    description: a.description,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">{t.accessories.title}</h1>
        <AddAccessoryButton />
      </div>

      <AccessoryTable accessories={rows} usdRate={usdRate} />
    </div>
  );
}
