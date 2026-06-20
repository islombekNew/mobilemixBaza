interface ExportExcelButtonProps {
  branchId: string;
}

/**
 * Statik havola — server route'i (/api/reports/export) faylni to'g'ridan-to'g'ri
 * "Content-Disposition: attachment" bilan qaytaradi, shuning uchun bu yerda
 * client-side JS shart emas, oddiy <a> orqali brauzer o'zi yuklab oladi.
 * Server komponent ekanligi sababli "use client" kerak emas.
 */
export function ExportExcelButton({ branchId }: ExportExcelButtonProps) {
  return (
    <a
      href={`/api/reports/export?branchId=${encodeURIComponent(branchId)}`}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/5"
    >
      📊 Excel&apos;ga eksport
    </a>
  );
}
