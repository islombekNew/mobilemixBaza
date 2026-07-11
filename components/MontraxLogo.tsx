interface MontraxLogoProps {
  className?: string;
  /** Belgi yonida "Montrax" yozuvini ham ko'rsatish (login sahifasi uchun) */
  showWordmark?: boolean;
}

/**
 * Montrax brend belgisi. Rasm public/montrax-logo.png'da saqlanadi.
 * `className` balandlikni beradi (masalan "h-10 w-auto"), rasm shunga moslashadi.
 */
export function MontraxLogo({ className = "", showWordmark = false }: MontraxLogoProps) {
  if (showWordmark) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/montrax-logo.png"
          alt="Montrax"
          className="h-full w-auto rounded-xl"
        />
        <span
          className="bg-gradient-to-br from-[#ff4fd8] to-[#a020c0] bg-clip-text text-4xl font-bold italic text-transparent"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Montrax
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/montrax-logo.png"
      alt="Montrax"
      className={`rounded-lg ${className}`}
    />
  );
}
