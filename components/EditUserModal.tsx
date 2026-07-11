"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { useT } from "@/lib/i18n/client";
import type { UserRow } from "@/components/UserTable";

interface BranchOption {
  id: string;
  name: string;
}

interface EditUserModalProps {
  user: UserRow;
  branches: BranchOption[];
  /** O'zini tahrirlayaptimi — rolni pasaytirish taqiqlanadi */
  isSelf: boolean;
  onClose: () => void;
}

/**
 * Xodimni tahrirlash: ism, login, rol, filial va (ixtiyoriy) yangi parol.
 * Parol maydoni bo'sh qolsa — eski parol o'zgarmaydi.
 */
export function EditUserModal({ user, branches, isSelf, onClose }: EditUserModalProps) {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({
    name: user.name,
    login: user.login,
    role: user.role,
    branchId: user.branch?.id ?? "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        login: form.login,
        role: form.role,
        branchId: form.role === "SELLER" ? form.branchId || null : null,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a0a2e] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {t.employees.editTitle}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.employees.name}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.employees.login}
            </label>
            <input
              type="text"
              value={form.login}
              onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
              required
              minLength={3}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-[#ff4fd8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                {t.employees.role}
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                disabled={isSelf}
                title={isSelf ? t.employees.cannotChangeSelfRole : undefined}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8] disabled:opacity-50"
              >
                <option value="OWNER">{t.roles.OWNER}</option>
                <option value="SELLER">{t.roles.SELLER}</option>
              </select>
            </div>
            {form.role === "SELLER" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.employees.branch}
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff4fd8]"
                >
                  <option value="">{t.employees.selectBranch}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.employees.newPassword}{" "}
              <span className="font-normal text-gray-500">
                {t.employees.passwordKeepHint}
              </span>
            </label>
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
