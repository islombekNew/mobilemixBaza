"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import { useT } from "@/lib/i18n/client";

interface DashboardNavProps {
  role: Role;
}

const navItems = [
  { href: "/dashboard", key: "home", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/ombor", key: "inventory", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/sotuv", key: "sales", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/mijozlar", key: "customers", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/aksesuarlar", key: "accessories", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/hisobotlar", key: "reports", roles: ["OWNER"] as Role[] },
  { href: "/filiallar", key: "branches", roles: ["OWNER"] as Role[] },
  { href: "/xodimlar", key: "employees", roles: ["OWNER"] as Role[] },
] as const;

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const t = useT();

  return (
    <nav className="flex flex-col gap-1">
      {navItems
        .filter((item) => item.roles.includes(role))
        .map((item) => {
          const isActive = pathname === item.href;
          const href = branchId
            ? `${item.href}?branchId=${branchId}`
            : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className={clsx(
                "rounded-lg px-3 py-2 text-sm transition",
                isActive
                  ? "bg-brand-gradient text-white"
                  : "text-gray-300 hover:bg-white/5"
              )}
            >
              {t.nav[item.key]}
            </Link>
          );
        })}
    </nav>
  );
}
