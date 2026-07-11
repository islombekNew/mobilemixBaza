"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { EditUserModal } from "@/components/EditUserModal";
import { formatAxisMoney } from "@/lib/currency";
import { useT } from "@/lib/i18n/client";

export interface UserRow {
  id: string;
  name: string;
  login: string;
  role: string;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  branch: { id: string; name: string } | null;
}

interface BranchOption {
  id: string;
  name: string;
}

interface MonthlyStat {
  count: number;
  revenue: number;
  profit: number;
}

interface UserTableProps {
  users: UserRow[];
  branches: BranchOption[];
  /** userId -> shu oy sotuv statistikasi (so'mda) */
  monthlyStats?: Record<string, MonthlyStat>;
  currentUserId: string;
}

/**
 * Xodimlar ro'yxati: tahrirlash, bloklash/blokdan chiqarish va har birining
 * shu oylik sotuv ko'rsatkichi. Desktopda jadval, mobilda kartochkalar.
 */
export function UserTable({
  users,
  branches,
  monthlyStats = {},
  currentUserId,
}: UserTableProps) {
  const router = useRouter();
  const t = useT();
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock(u: UserRow) {
    const blocked = !u.deletedAt;
    const question = blocked
      ? `${u.name} — ${t.employees.blockConfirm}`
      : `${u.name} — ${t.employees.unblockConfirm}`;
    if (!confirm(question)) return;

    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        {t.employees.empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          branches={branches}
          isSelf={editUser.id === currentUserId}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* Mobil: kartochkalar */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => {
          const stat = monthlyStats[u.id];
          return (
            <div
              key={u.id}
              className={clsx(
                "rounded-xl border bg-white/5 p-4",
                u.deletedAt ? "border-red-500/20 opacity-60" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{u.name}</div>
                  <div className="font-mono text-xs text-gray-500">{u.login}</div>
                </div>
                <UserBadges user={u} />
              </div>

              <div className="mt-2 text-xs text-gray-400">
                {u.branch?.name ?? t.employees.allBranches}
              </div>

              {stat && stat.count > 0 && (
                <div className="mt-2 flex gap-4 rounded-lg bg-black/20 px-3 py-2 text-xs">
                  <span className="text-gray-300">
                    {t.employees.thisMonth}: <b className="text-white">{stat.count} {t.common.pieces}</b>
                  </span>
                  <span className="text-gray-300">
                    {t.dashboard.revenue}: <b className="text-white">{formatAxisMoney(stat.revenue)}</b>
                  </span>
                  <span className="text-gray-300">
                    {t.phoneForm.profit}:{" "}
                    <b className={stat.profit >= 0 ? "text-green-400" : "text-red-400"}>
                      {formatAxisMoney(stat.profit)}
                    </b>
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-2.5">
                <button
                  onClick={() => setEditUser(u)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {t.common.edit}
                </button>
                {u.id !== currentUserId && (
                  <button
                    onClick={() => toggleBlock(u)}
                    disabled={busyId === u.id}
                    className={clsx(
                      "text-xs disabled:opacity-50",
                      u.deletedAt
                        ? "text-green-400 hover:text-green-300"
                        : "text-red-400 hover:text-red-300"
                    )}
                  >
                    {busyId === u.id
                      ? "..."
                      : u.deletedAt
                        ? t.employees.unblock
                        : t.employees.block}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: jadval */}
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
              <th className="px-4 py-3 font-medium">{t.employees.name}</th>
              <th className="px-4 py-3 font-medium">{t.employees.login}</th>
              <th className="px-4 py-3 font-medium">{t.employees.role}</th>
              <th className="px-4 py-3 font-medium">{t.employees.branch}</th>
              <th className="px-4 py-3 font-medium">{t.employees.thisMonth}</th>
              <th className="px-4 py-3 font-medium">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const stat = monthlyStats[u.id];
              return (
                <tr
                  key={u.id}
                  className={clsx(
                    "border-b border-white/5 text-gray-200 last:border-0",
                    u.deletedAt && "opacity-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{u.name}</span>
                      <UserBadges user={u} />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.login}</td>
                  <td className="px-4 py-3">{t.roles[u.role as "OWNER" | "SELLER"] ?? u.role}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.branch?.name ?? `— ${t.employees.allBranches}`}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {stat && stat.count > 0 ? (
                      <div className="space-y-0.5">
                        <div className="text-white">{stat.count} {t.employees.salesCount}</div>
                        <div className="text-gray-500">
                          {t.phoneForm.profit}:{" "}
                          <span
                            className={
                              stat.profit >= 0 ? "text-green-400" : "text-red-400"
                            }
                          >
                            {formatAxisMoney(stat.profit)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditUser(u)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {t.common.edit}
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => toggleBlock(u)}
                          disabled={busyId === u.id}
                          className={clsx(
                            "text-xs disabled:opacity-50",
                            u.deletedAt
                              ? "text-green-400 hover:text-green-300"
                              : "text-red-400 hover:text-red-300"
                          )}
                        >
                          {busyId === u.id
                            ? "..."
                            : u.deletedAt
                              ? t.employees.unblock
                              : t.employees.block}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserBadges({ user }: { user: UserRow }) {
  const t = useT();
  return (
    <span className="flex flex-wrap gap-1.5">
      <span
        className={clsx(
          "rounded-full px-2 py-0.5 text-[10px] font-medium",
          user.role === "OWNER"
            ? "bg-[#ff4fd8]/15 text-[#ff4fd8]"
            : "bg-blue-500/15 text-blue-300"
        )}
      >
        {t.roles[user.role as "OWNER" | "SELLER"] ?? user.role}
      </span>
      {user.deletedAt && (
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
          {t.employees.blocked}
        </span>
      )}
    </span>
  );
}
