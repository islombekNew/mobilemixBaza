"use client";

import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  name?: string;
  id?: string;
}

/**
 * Ko'rsatish/yashirish (👁) tugmali parol maydoni — login sahifasi va
 * xodim formalari uchun umumiy komponent.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  required,
  minLength,
  autoComplete,
  name,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 pr-11 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#ff4fd8] focus:ring-1 focus:ring-[#ff4fd8]/50"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 transition hover:text-gray-300"
      >
        {visible ? (
          // Ko'z ochiq — bosilsa yashiradi
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Ko'z yopiq holatda oddiy ko'z — bosilsa ko'rsatadi
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
