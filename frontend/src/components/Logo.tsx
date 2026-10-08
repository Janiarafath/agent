export function DashWinLogo({ size = 28, withWord = true, dark = false }: { size?: number; withWord?: boolean; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="DashWin logo">
        <defs>
          <linearGradient id="dwg" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="#7c6cff" />
            <stop offset="1" stopColor="#5951ff" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#dwg)" />
        <path d="M11 8h6.5c4.1 0 7 2.7 7 8s-2.9 8-7 8H11V8zm3.4 3v10h2.9c2.4 0 3.9-1.6 3.9-5s-1.5-5-3.9-5h-2.9z" fill="#fff" />
        <circle cx="23.5" cy="23.5" r="3.2" fill="#22c55e" stroke="#fff" strokeWidth="1.6" />
        <path d="M22.2 23.5l1 1 1.8-2" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withWord && (
        <span className={`font-bold tracking-tight ${dark ? "text-white" : "text-[#120044]"}`} style={{ fontSize: size * 0.62 }}>
          DashWin
        </span>
      )}
    </span>
  );
}
