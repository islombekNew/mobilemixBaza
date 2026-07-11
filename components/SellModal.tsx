"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

interface PhoneRow {
  id: string;
  model: string;
  brand: string;
  salePrice: string | number;
  currency?: string;
}

export interface SellerOption {
  id: string;
  name: string;
  role: string;
}

interface SellModalProps {
  phone: PhoneRow;
  branchId: string;
  onClose: () => void;
  /** Faqat OWNER uchun to'ldiriladi — "kim sotyapti"ni tanlash ro'yxati */
  sellers?: SellerOption[];
  currentUserId?: string;
}

type PaymentType = "CASH" | "CARD" | "CREDIT";
type PaymentPlan = "ONE_TIME" | "MONTHLY";

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SellModal({
  phone,
  branchId,
  onClose,
  sellers = [],
  currentUserId,
}: SellModalProps) {
  const router = useRouter();
  const t = useT();
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  // Kim sotyapti — sukut bo'yicha hozir kirgan foydalanuvchi
  const [sellerId, setSellerId] = useState(currentUserId ?? "");
  const [finalPrice, setFinalPrice] = useState(String(phone.salePrice));
  // Sotuv valyutasi — sukut bo'yicha telefon narxi kiritilgan valyuta
  const [currency, setCurrency] = useState<"UZS" | "USD">(
    phone.currency === "USD" ? "USD" : "UZS"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kredit uchun maydonlar
  const [fullName, setFullName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("MONTHLY");
  const [dueDate, setDueDate] = useState(todayPlus(30));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        phoneId: phone.id,
        branchId,
        paymentType,
        finalPrice,
        currency,
      };
      if (sellerId) {
        body.sellerId = sellerId;
      }

      if (paymentType === "CREDIT") {
        body.customer = {
          fullName,
          phoneNumber: customerPhone,
          totalAmount: finalPrice,
          paidAmount,
          dueDate,
          paymentPlan,
        };
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-semibold text-white">
          {t.sellModal.title}: {phone.brand} {phone.model}
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {t.sellModal.subtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kim sotyapti — faqat OWNER'ga ko'rinadi (sotuvchi doim o'zi) */}
          {sellers.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">{t.sellModal.whoSells}</label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.role === "OWNER" ? t.sellModal.ownerSuffix : ""}
                    {s.id === currentUserId ? t.sellModal.meSuffix : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PRD 3.5: To'lov turi - Naqd / Karta / Kredit */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.sellModal.paymentType}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "CARD", "CREDIT"] as PaymentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentType(type)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    paymentType === type
                      ? "border-[#ff4fd8] bg-brand-gradient text-white"
                      : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {type === "CASH" ? t.sellModal.cash : type === "CARD" ? t.sellModal.card : t.sellModal.credit}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.sellModal.currency}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["UZS", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    currency === cur
                      ? "border-[#ff4fd8] bg-brand-gradient text-white"
                      : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {cur === "UZS" ? t.sellModal.som : t.sellModal.dollar}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.sellModal.amount} ({currency === "USD" ? "$" : "so'm"})
            </label>
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              min={0}
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
            />
          </div>

          {/* PRD 3.5: Kredit tanlanganda mijoz ma'lumotlari */}
          {paymentType === "CREDIT" && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-medium text-gray-400">
                {t.sellModal.customerInfo}
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.sellModal.fullName}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.sellModal.phoneNumber}
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998901234567"
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.sellModal.initialPayment}
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  min={0}
                  max={finalPrice || undefined}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.sellModal.plan}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("ONE_TIME")}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      paymentPlan === "ONE_TIME"
                        ? "border-[#ff4fd8] bg-white/10 text-white"
                        : "border-white/10 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    {t.sellModal.oneTime}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("MONTHLY")}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      paymentPlan === "MONTHLY"
                        ? "border-[#ff4fd8] bg-white/10 text-white"
                        : "border-white/10 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    {t.sellModal.monthly}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.sellModal.dueDate}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? t.common.saving : t.sellModal.finish}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
