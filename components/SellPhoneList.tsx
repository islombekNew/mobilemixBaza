"use client";

import { useState } from "react";
import { SellModal } from "@/components/SellModal";

interface PhoneRow {
  id: string;
  model: string;
  brand: string;
  color: string;
  storageGB: number;
  imei: string;
  salePrice: string | number;
}

interface SellPhoneListProps {
  phones: PhoneRow[];
  branchId: string;
}

function formatSum(value: string | number) {
  return Number(value).toLocaleString("uz-UZ") + " so'm";
}

export function SellPhoneList({ phones, branchId }: SellPhoneListProps) {
  const [selectedPhone, setSelectedPhone] = useState<PhoneRow | null>(null);

  if (phones.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        Omborda sotish uchun telefon yo&apos;q
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {phones.map((phone) => (
          <div
            key={phone.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div>
              <h3 className="font-medium text-white">{phone.model}</h3>
              <p className="text-xs text-gray-500">
                {phone.brand} · {phone.color} · {phone.storageGB}GB
              </p>
              <p className="mt-1 font-mono text-xs text-gray-500">
                IMEI: {phone.imei}
              </p>
              <p className="mt-2 font-medium text-white">
                {formatSum(phone.salePrice)}
              </p>
            </div>
            <button
              onClick={() => setSelectedPhone(phone)}
              className="mt-3 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon-pink transition hover:opacity-90"
            >
              Sotish
            </button>
          </div>
        ))}
      </div>

      {selectedPhone && (
        <SellModal
          phone={selectedPhone}
          branchId={branchId}
          onClose={() => setSelectedPhone(null)}
        />
      )}
    </>
  );
}
