"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { useT } from "@/lib/i18n/client";

interface BranchOption {
  id: string;
  name: string;
}

interface AddUserButtonProps {
  branches: BranchOption[];
}

const initialForm = {
  name: "",
  login: "",
  password: "",
  role: "SELLER" as "OWNER" | "SELLER",
  branchId: "",
};

export function AddUserButton({ branches }: AddUserButtonProps) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    branchId: branches[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          branchId: form.role === "SELLER" ? form.branchId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.common.error);

      setOpen(false);
      setForm({ ...initialForm, branchId: branches[0]?.id ?? "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon-pink transition hover:opacity-90"
      >
        {t.employees.add}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a0a2e] p-6 sm:rounded-2xl">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t.employees.addTitle}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.employees.name}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Aziz Karimov"
                  required
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.employees.login}
                </label>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="seller2 / +998901234567"
                  required
                  minLength={3}
                  pattern="\+?[a-zA-Z0-9_.\-]+"
                  title="Faqat harf, raqam, '+', '_', '.', '-' belgilari"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#ff4fd8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.employees.tempPassword}
                </label>
                <PasswordInput
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  placeholder={t.common.min6}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t.employees.role}
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as "OWNER" | "SELLER" })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                >
                  <option value="SELLER">{t.roles.SELLER}</option>
                  <option value="OWNER">{t.employees.ownerOption}</option>
                </select>
              </div>

              {form.role === "SELLER" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    {t.employees.branch}
                  </label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white outline-none focus:border-[#ff4fd8]"
                  >
                    {branches.length === 0 && (
                      <option value="">{t.branches.empty}</option>
                    )}
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
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
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || (form.role === "SELLER" && !form.branchId)}
                  className="flex-1 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
