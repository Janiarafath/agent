export function DashWinLogo({ size = 30, withWord = true, dark = false }: { size?: number; withWord?: boolean; dark?: boolean }) {
  // Blue "D" carrying a chat bubble. Bubble is ink on light, near-black on dark.
  const bubble = dark ? "#0B0B14" : "#0B0B14";
  const line = "#2E4BFF";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="DashWin logo">
        {/* D body */}
        <path d="M14 8h18a20 20 0 0 1 0 40H14l4.5-13L14 8z" fill="#2E4BFF" />
        <rect x="28" y="8" width="16" height="40" rx="20" fill="#2E4BFF" />
        {/* chat bubble */}
        <rect x="19" y="21" width="26" height="24" rx="9" fill={bubble} />
        <polygon points="19,38 19,50 28,41" fill={bubble} />
        {/* signal lines */}
        <rect x="24" y="28" width="16" height="4.6" rx="2.3" fill={line} />
        <rect x="24" y="35" width="10" height="4.6" rx="2.3" fill={line} />
      </svg>
      {withWord && (
        <span className={`font-extrabold tracking-tight ${dark ? "text-white" : "text-[#0B0B14]"}`} style={{ fontSize: size * 0.66, letterSpacing: "-0.02em" }}>
          DashWin
        </span>
      )}
    </span>
  );
}
