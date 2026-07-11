"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PhonePhotoUploaderProps {
  phoneId: string;
  photoUrl: string | null;
  /** Rasm yo'q bo'lganda brend nomidan rangli placeholder yasash uchun */
  brand?: string;
  model?: string;
}

// Brend nomidan barqaror (deterministik) gradient tanlaydi — bir xil brend
// doim bir xil rangda chiqadi, bo'sh kulrang katak o'rniga.
const PLACEHOLDER_GRADIENTS = [
  "from-pink-500/30 to-purple-600/30",
  "from-violet-500/30 to-indigo-600/30",
  "from-fuchsia-500/30 to-pink-600/30",
  "from-blue-500/30 to-cyan-600/30",
  "from-purple-500/30 to-blue-600/30",
  "from-rose-500/30 to-orange-500/30",
];

function brandGradient(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = (hash * 31 + brand.charCodeAt(i)) | 0;
  }
  return PLACEHOLDER_GRADIENTS[Math.abs(hash) % PLACEHOLDER_GRADIENTS.length];
}

/**
 * Telefon kartochkasi ichida ishlatiladigan kichik rasm boshqaruvi:
 * rasm bo'lmasa — "+ Rasm" tugmasi, bo'lsa — ustiga bosib almashtirish
 * yoki o'chirish. Fayl tanlangan zahoti avtomatik yuklanadi (qo'shimcha
 * "Saqlash" tugmasi shart emas — tezroq va soddaroq).
 */
export function PhonePhotoUploader({ phoneId, photoUrl, brand, model }: PhonePhotoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/phones/${phoneId}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rasmni yuklashda xatolik");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("Rasmni o'chirishni tasdiqlaysizmi?")) return;

    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phones/${phoneId}/photo`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "O'chirishda xatolik");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/30">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Vercel Blob'dagi tashqi URL, next/image domeni sozlamasi shart emas
        <img
          src={photoUrl}
          alt="Telefon rasmi"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br ${
            brand ? brandGradient(brand) : "from-white/5 to-white/10"
          }`}
        >
          {brand ? (
            <>
              <span className="text-3xl font-bold text-white/40">
                {brand.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[90%] truncate text-xs font-medium text-white/50">
                {brand}{model ? ` ${model}` : ""}
              </span>
            </>
          ) : (
            <span className="text-4xl text-white/10">📱</span>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/80 to-transparent p-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
        >
          {uploading ? "..." : photoUrl ? "Almashtirish" : "+ Rasm"}
        </button>
        {photoUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300 backdrop-blur transition hover:bg-red-500/30 disabled:opacity-50"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <p className="absolute inset-x-0 top-0 bg-red-500/90 px-2 py-1 text-[10px] text-white">
          {error}
        </p>
      )}
    </div>
  );
}
