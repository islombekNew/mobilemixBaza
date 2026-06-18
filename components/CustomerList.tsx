"use client";

import { useState } from "react";
import clsx from "clsx";
import { AddPaymentForm } from "@/components/AddPaymentForm";

interface Payment {
  id: string;
  amount: string | number;
  paymentDate: string | Date;
  note: string | null;
}

interface CustomerRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  totalAmount: string | number;
  paidAmount: string | number;
  dueDate: string | Date;
  paymentPlan: string;
  status: string;
  sale: {
    phone: { model: string; brand: string; imei: string };
  };
  payments: Payment[];
}

interface CustomerListProps {
  customers: CustomerRow[];
}

const statusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Faol qarz", className: "bg-blue-500/15 text-blue-300" },
  PAID: { label: "To'liq to'langan", className: "bg-green-500/15 text-green-400" },
  OVERDUE: { label: "Muddati o'tgan", className: "bg-red-500/15 text-red-300" },
};

const paymentPlanLabels: Record<string, string> = {
  ONE_TIME: "Bir martalik",
  MONTHLY: "Oylik",
};

function formatSum(value: string | number) {
  return Number(value).toLocaleString("uz-UZ") + " so'm";
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CustomerList({ customers }: CustomerListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        Mijozlar topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((customer) => {
        const remaining = Number(customer.totalAmount) - Number(customer.paidAmount);
        const isExpanded = expandedId === customer.id;
        const status = statusLabels[customer.status] ?? {
          label: customer.status,
          className: "bg-gray-500/15 text-gray-400",
        };

        return (
          <div
            key={customer.id}
            className="rounded-xl border border-white/10 bg-white/5"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : customer.id)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{customer.fullName}</h3>
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {customer.phoneNumber} · {customer.sale.phone.brand}{" "}
                  {customer.sale.phone.model}
                </p>
              </div>

              <div className="text-right">
                <p className="font-medium text-white">{formatSum(remaining)}</p>
                <p className="text-xs text-gray-500">
                  qolgan / {formatSum(customer.totalAmount)}
                </p>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-white/10 p-4">
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">To&apos;lov rejasi</p>
                    <p className="text-gray-200">
                      {paymentPlanLabels[customer.paymentPlan] ??
                        customer.paymentPlan}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Muddat</p>
                    <p className="text-gray-200">{formatDate(customer.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">To&apos;langan</p>
                    <p className="text-gray-200">{formatSum(customer.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">IMEI</p>
                    <p className="font-mono text-xs text-gray-200">
                      {customer.sale.phone.imei}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-gray-400">
                    To&apos;lov tarixi
                  </p>
                  {customer.payments.length === 0 ? (
                    <p className="text-sm text-gray-500">Hali to&apos;lov yo&apos;q</p>
                  ) : (
                    <div className="space-y-1.5">
                      {customer.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                        >
                          <span className="text-gray-300">
                            {formatDate(payment.paymentDate)}
                            {payment.note && (
                              <span className="ml-2 text-gray-500">
                                — {payment.note}
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-white">
                            {formatSum(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {customer.status !== "PAID" && (
                  <AddPaymentForm customerId={customer.id} maxAmount={remaining} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
