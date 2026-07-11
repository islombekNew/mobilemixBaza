"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import { useT } from "@/lib/i18n/client";

const navItems = [
  {
    href: "/dashboard",
    key: "home" as const,
    roles: ["OWNER", "SELLER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/ombor",
    key: "inventory" as const,
    roles: ["OWNER", "SELLER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/sotuv",
    key: "sales" as const,
    roles: ["OWNER", "SELLER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    href: "/mijozlar",
    key: "customers" as const,
    roles: ["OWNER", "SELLER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/hisobotlar",
    key: "reports" as const,
    roles: ["OWNER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/filiallar",
    key: "branches" as const,
    roles: ["OWNER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    href: "/xodimlar",
    key: "employees" as const,
    roles: ["OWNER"] as Role[],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const t = useT();

  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="no-scrollbar flex overflow-x-auto">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const href = branchId ? `${item.href}?branchId=${branchId}` : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            className={clsx(
              "flex min-w-[52px] flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
              isActive ? "text-[#ff4fd8]" : "text-gray-500"
            )}
          >
            <span
              className={clsx(
                "rounded-xl p-1 transition-colors",
                isActive ? "bg-[#ff4fd8]/10" : ""
              )}
            >
              {item.icon}
            </span>
            <span>{t.nav[item.key]}</span>
          </Link>
        );
      })}
    </div>
  );
}
