"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

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
  addedBy: { id: string; name: string };
}

interface PhoneTableProps {
  phones: PhoneRow[];
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

export function PhoneTable({ phones }: PhoneTableProps) {
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
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Rang / Xotira</th>
              <th className="px-4 py-3 font-medium">IMEI</th>
              <th className="px-4 py-3 font-medium">Holati</th>
              <th className="px-4 py-3 font-medium">Tan narxi</th>
              <th className="px-4 py-3 font-medium">Sotuv narxi</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Qo&apos;shgan</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {phones.map((phone) => (
              <tr
                key={phone.id}
                className="border-b border-white/5 text-gray-200 last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{phone.model}</div>
                  <div className="text-xs text-gray-500">{phone.brand}</div>
                </td>
                <td className="px-4 py-3">
                  {phone.color}, {phone.storageGB}GB
                </td>
                <td className="px-4 py-3 font-mono text-xs">{phone.imei}</td>
                <td className="px-4 py-3">
                  {conditionLabels[phone.condition] ?? phone.condition}
                </td>
                <td className="px-4 py-3">{formatSum(phone.costPrice)}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {formatSum(phone.salePrice)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      phone.status === "IN_STOCK"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-gray-500/15 text-gray-400"
                    )}
                  >
                    {phone.status === "IN_STOCK" ? "Omborda" : "Sotilgan"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {phone.addedBy.name}
                </td>
                <td className="px-4 py-3 text-right">
                  {phone.status === "IN_STOCK" && (
                    <button
                      onClick={() => handleDelete(phone.id)}
                      disabled={deletingId === phone.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === phone.id ? "..." : "O'chirish"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
