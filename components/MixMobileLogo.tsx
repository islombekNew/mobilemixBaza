export function MixMobileLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mix Mobile"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4fd8" />
          <stop offset="100%" stopColor="#a020c0" />
        </linearGradient>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Telefon korpusi belgisi - "i" harfi o'rnida */}
      <g filter="url(#neonGlow)">
        <rect
          x="108"
          y="22"
          width="20"
          height="56"
          rx="6"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="3"
        />
        <circle cx="118" cy="68" r="2.5" fill="url(#logoGradient)" />
      </g>

      <text
        x="160"
        y="68"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="46"
        fontWeight="700"
        fontStyle="italic"
        letterSpacing="1"
        fill="url(#logoGradient)"
        filter="url(#neonGlow)"
      >
        M
        <tspan dx="2">x</tspan>
      </text>

      <text
        x="160"
        y="92"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontWeight="400"
        letterSpacing="6"
        fill="#e8d5f5"
        opacity="0.85"
      >
        MOBILE
      </text>
    </svg>
  );
}
