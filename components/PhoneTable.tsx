"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PhonePhotoUploader } from "@/components/PhonePhotoUploader";
import { TransferPhoneButton } from "@/components/TransferPhoneButton";

interface PhoneRow {
  id: string;
  model: string;
  brand: string;
  color: string;
  storageGB: number;
  imei: string;
  condition: string;
  costPrice: string | number | null;
  salePrice: string | number;
  status: string;
  photoUrl: string | null;
  branchId: string;
  addedBy: { id: string; name: string };
}

interface BranchOption {
  id: string;
  name: string;
}

interface PhoneTableProps {
  phones: PhoneRow[];
  branches?: BranchOption[];
  isOwner?: boolean;
}

const conditionLabels: Record<string, string> = {
  NEW: "Yangi",
  USED: "Ishlatilgan",
  REFURBISHED: "Qayta tiklangan",
};

function formatSum(value: string | number | null) {
  if (value === null) return "—";
  return Number(value).toLocaleString("uz-UZ") + " so'm";
}

/**
 * Ombor ro'yxati — mobil ekranda ham qulay bo'lishi uchun jadval o'rniga
 * moslashuvchan kartochkalar (grid) ishlatiladi: kichik ekranda 1 ustun,
 * o'rtacha ekranda 2, kattada 3-4 ustun. Har bir kartochka rasm, narx,
 * status va amallarni (rasm qo'shish, filialga ko'chirish, o'chirish) o'z
 * ichiga oladi.
 */
export function PhoneTable({ phones, branches = [], isOwner = false }: PhoneTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Bu telefonni o'chirishni tasdiqlaysizmi?")) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/phones/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "O'chirishda xatolik");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setDeletingId(null);
    }
  }

  if (phones.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        Bu filialda hali telefon yo&apos;q
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {phones.map((phone) => (
          <div
            key={phone.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            <PhonePhotoUploader phoneId={phone.id} photoUrl={phone.photoUrl} />

            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{phone.model}</div>
                  <div className="text-xs text-gray-500">{phone.brand}</div>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    phone.status === "IN_STOCK"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-gray-500/15 text-gray-400"
                  )}
                >
                  {phone.status === "IN_STOCK" ? "Omborda" : "Sotilgan"}
                </span>
              </div>

              <div className="text-sm text-gray-300">
                {phone.color}, {phone.storageGB}GB ·{" "}
                {conditionLabels[phone.condition] ?? phone.condition}
              </div>

              <div className="font-mono text-xs text-gray-500">{phone.imei}</div>

              <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                <div className="text-xs text-gray-500">
                  Tan narxi: {formatSum(phone.costPrice)}
                </div>
                <div className="font-semibold text-white">
                  {formatSum(phone.salePrice)}
                </div>
              </div>

              <div className="text-xs text-gray-500">Qo&apos;shgan: {phone.addedBy.name}</div>

              {phone.status === "IN_STOCK" && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>
                    {isOwner && (
                      <TransferPhoneButton
                        phoneId={phone.id}
                        currentBranchId={phone.branchId}
                        branches={branches}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(phone.id)}
                    disabled={deletingId === phone.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === phone.id ? "..." : "O'chirish"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
