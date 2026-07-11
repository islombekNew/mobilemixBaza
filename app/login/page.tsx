"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginResult } from "./actions";
import { MixMobileLogo } from "@/components/MixMobileLogo";
import { PasswordInput } from "@/components/PasswordInput";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { looksLikePhone } from "@/lib/login-format";
import { useT } from "@/lib/i18n/client";

const initialState: LoginResult = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const t = useT();

  // Telefon raqami kiritilsa "+998" avtomatik qo'yiladi; matnli login
  // (masalan "namangan_sotuvchi") esa o'zgarmasdan qoladi.
  function handleLoginChange(value: string) {
    if (looksLikePhone(value)) {
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("998")) digits = digits.slice(3);
      digits = digits.slice(0, 9);
      setLogin(digits ? `+998${digits}` : "");
    } else {
      setLogin(value);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Ambient orbs - to'q binafsha-qora fon ustida yumshoq nur dog'lari */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #ff4fd8 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #a020c0 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <MixMobileLogo className="h-20 w-auto" />
          <p className="text-sm tracking-wide text-gray-400">{t.login.tagline}</p>
        </div>

        <form
          action={formAction}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm"
        >
          <div className="mb-4">
            <label
              htmlFor="login"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              {t.login.login}
            </label>
            <input
              id="login"
              name="login"
              type="text"
              inputMode="tel"
              autoComplete="username"
              required
              value={login}
              onChange={(e) => handleLoginChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#ff4fd8] focus:ring-1 focus:ring-[#ff4fd8]/50"
              placeholder={t.login.loginPlaceholder}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              {t.login.password}
            </label>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </div>

          {state?.error && (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error === "required" ? t.login.required : t.login.invalid}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-neon-pink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t.login.entering : t.login.enter}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          {t.login.forgot}
        </p>
      </div>
    </main>
  );
}
