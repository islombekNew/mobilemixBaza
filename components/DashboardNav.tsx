"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import clsx from "clsx";

interface DashboardNavProps {
  role: Role;
}

const navItems = [
  { href: "/dashboard", label: "Bosh sahifa", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/ombor", label: "Ombor", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/sotuv", label: "Sotuv", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/mijozlar", label: "Mijozlar", roles: ["OWNER", "SELLER"] as Role[] },
  { href: "/hisobotlar", label: "Hisobotlar", roles: ["OWNER"] as Role[] },
  { href: "/filiallar", label: "Filiallar", roles: ["OWNER"] as Role[] },
  { href: "/xodimlar", label: "Xodimlar", roles: ["OWNER"] as Role[] },
];

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");

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
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
