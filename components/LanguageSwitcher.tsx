"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_META, LOCALE_COOKIE } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";

/**
 * Til almashtirish tugmasi (🇺🇿/🇷🇺/🇬🇧). Tanlangan til cookie'ga yoziladi
 * va router.refresh() bilan server komponentlar yangi tilda qayta render
 * qilinadi.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const current = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(code: string) {
    // 1 yil amal qiladigan cookie
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  const meta = LOCALE_META[current];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-gray-200 transition hover:bg-white/5"
        aria-label="Til / Язык / Language"
      >
        <span className="text-base leading-none">{meta.flag}</span>
        {!compact && <span className="text-xs">{meta.label}</span>}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-gray-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#1a0a2e] shadow-xl">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => choose(code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                code === current ? "text-[#ff4fd8]" : "text-gray-200"
              }`}
            >
              <span className="text-base leading-none">{LOCALE_META[code].flag}</span>
              {LOCALE_META[code].label}
              {code === current && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
