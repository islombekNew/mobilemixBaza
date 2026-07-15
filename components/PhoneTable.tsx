"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PhonePhotoUploader } from "@/components/PhonePhotoUploader";
import { TransferPhoneButton } from "@/components/TransferPhoneButton";
import { EditPhoneModal } from "@/components/EditPhoneModal";
import { AddPhoneButton } from "@/components/AddPhoneButton";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { useT } from "@/lib/i18n/client";
import { conditionLabel } from "@/lib/i18n/dictionaries";

const PAGE_SIZE = 20;

interface PhoneRow {
  id: string;
  model: string;
  brand: string;
  color: string;
  storageGB: number;
  ramGB?: number | null;
  imei: string;
  condition: string;
  costPrice: string | number | null;
  salePrice: string | number;
  currency?: string;
  status: string;
  photoUrl: string | null;
  branchId: string;
  addedBy: { id: string; name: string };
  batteryHealth?: number | null;
  hasBox?: boolean;
  hasCharger?: boolean;
  hasDocuments?: boolean;
  warrantyMonths?: number;
  supplier?: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

interface PhoneTableProps {
  phones: PhoneRow[];
  branches?: BranchOption[];
  isOwner?: boolean;
  /** Joriy USD/UZS kursi — ikkinchi valyutani qavsda ko'rsatish uchun */
  usdRate?: number;
}

function phoneCurrency(phone: { currency?: string }): CurrencyCode {
  return phone.currency === "USD" ? "USD" : "UZS";
}

/**
 * Ombor ro'yxati — mobil ekranda ham qulay bo'lishi uchun jadval o'rniga
 * moslashuvchan kartochkalar (grid) ishlatiladi: kichik ekranda 1 ustun,
 * o'rtacha ekranda 2, kattada 3-4 ustun. Har bir kartochka rasm, narx,
 * status va amallarni (rasm qo'shish, filialga ko'chirish, o'chirish) o'z
 * ichiga oladi.
 */
export function PhoneTable({ phones, branches = [], isOwner = false, usdRate = 0 }: PhoneTableProps) {
  const router = useRouter();
  const t = useT();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState<PhoneRow | null>(null);
  // "Nusxa": bir xil telefondan ko'p kelganda boshidan yozmaslik uchun —
  // qo'shish formasi shu telefon ma'lumotlari bilan (IMEI'siz) ochiladi
  const [copyPhone, setCopyPhone] = useState<PhoneRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(phones.length / PAGE_SIZE);
  const paged = phones.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(id: string) {
    if (!confirm(t.inventory.deleteConfirm)) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/phones/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.common.error);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setDeletingId(null);
    }
  }

  if (phones.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        {t.inventory.empty}
      </div>
    );
  }

  return (
    <div>
      {editPhone && (
        <EditPhoneModal phone={editPhone} onClose={() => setEditPhone(null)} />
      )}

      {copyPhone && (
        <AddPhoneButton
          branchId={copyPhone.branchId}
          prefill={copyPhone}
          forceOpen
          hideTrigger
          onClose={() => setCopyPhone(null)}
        />
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paged.map((phone) => (
          <div
            key={phone.id}
            className={clsx(
              "overflow-hidden rounded-xl border bg-white/5 transition",
              phone.status === "SOLD"
                ? "border-white/5 opacity-50 saturate-50"
                : "border-white/10"
            )}
          >
            <PhonePhotoUploader
              phoneId={phone.id}
              photoUrl={phone.photoUrl}
              brand={phone.brand}
              model={phone.model}
            />

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
                  {phone.status === "IN_STOCK" ? t.inventory.inStockBadge : t.inventory.soldBadge}
                </span>
              </div>

              <div className="text-sm text-gray-300">
                {phone.color},{" "}
                {phone.ramGB ? `${phone.ramGB}/${phone.storageGB}GB` : `${phone.storageGB}GB`}
                {" "}· {conditionLabel(phone.condition, t)}
                {phone.batteryHealth ? ` · 🔋${phone.batteryHealth}%` : ""}
              </div>

              <div className="font-mono text-xs text-gray-500">{phone.imei}</div>

              <div className="space-y-0.5 border-t border-white/10 pt-2">
                <div className="text-xs text-gray-500">
                  {t.inventory.costPrice}:{" "}
                  {phone.costPrice === null
                    ? "—"
                    : formatMoney(Number(phone.costPrice), phoneCurrency(phone))}
                </div>
                <div className="font-semibold text-white">
                  {formatMoney(Number(phone.salePrice), phoneCurrency(phone))}
                </div>
                {usdRate > 0 && (
                  <div className="text-xs text-gray-500">
                    ≈{" "}
                    {phoneCurrency(phone) === "USD"
                      ? formatMoney(Number(phone.salePrice) * usdRate, "UZS")
                      : formatMoney(Number(phone.salePrice) / usdRate, "USD")}
                  </div>
                )}
              </div>

              {/* Komplektatsiya */}
              {(phone.hasBox || phone.hasCharger || phone.hasDocuments) && (
                <div className="flex flex-wrap gap-1">
                  {phone.hasBox && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">📦 {t.phoneForm.hasBox}</span>}
                  {phone.hasCharger && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">🔌 {t.phoneForm.hasCharger}</span>}
                  {phone.hasDocuments && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">📄 {t.phoneForm.hasDocs}</span>}
                </div>
              )}

              {/* Kafolat va Yetkazib beruvchi */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {phone.warrantyMonths ? (
                  <span>🛡 {phone.warrantyMonths >= 12 ? `${phone.warrantyMonths / 12} ${t.inventory.year}` : `${phone.warrantyMonths} ${t.inventory.months}`} {t.inventory.warranty}</span>
                ) : (
                  <span>{t.inventory.noWarranty}</span>
                )}
                {phone.supplier && <span>· {phone.supplier}</span>}
              </div>

              <div className="text-xs text-gray-500">{t.inventory.addedBy}: {phone.addedBy.name}</div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {isOwner && phone.status === "IN_STOCK" && (
                    <TransferPhoneButton
                      phoneId={phone.id}
                      currentBranchId={phone.branchId}
                      branches={branches}
                    />
                  )}
                  <button
                    onClick={() => setEditPhone(phone)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {t.common.edit}
                  </button>
                  <button
                    onClick={() => setCopyPhone(phone)}
                    title={t.inventory.copy}
                    className="text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    {t.inventory.copy}
                  </button>
                </div>
                {phone.status === "IN_STOCK" && (
                  <button
                    onClick={() => handleDelete(phone.id)}
                    disabled={deletingId === phone.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === phone.id ? "..." : t.common.delete}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sahifalash */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
          >
            ← {t.common.prev}
          </button>
          <span className="text-sm text-gray-400">
            {page} / {totalPages} ({phones.length} {t.common.pieces})
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
          >
            {t.common.next} →
          </button>
        </div>
      )}
    </div>
  );
}
