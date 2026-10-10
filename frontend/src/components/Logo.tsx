export function DashWinLogo({ size = 28, withWord = true, dark = false }: { size?: number; withWord?: boolean; dark?: boolean }) {
  const bubble = dark ? "#050505" : "#ffffff";
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-label="DashWin logo">
        <polygon points="62,30 108,30 94,170 48,170" fill="#2E4BFF" />
        <rect x="92" y="30" width="58" height="140" rx="69" fill="#2E4BFF" />
        <rect x="70" y="66" width="72" height="68" rx="24" fill={bubble} />
        <polygon points="70,112 70,146 92,118" fill={bubble} />
        <rect x="84" y="86" width="44" height="11" rx="5.5" fill="#2E4BFF" />
        <rect x="84" y="104" width="28" height="11" rx="5.5" fill="#2E4BFF" />
      </svg>
      {withWord && (
        <span className={`font-bold tracking-tight ${dark ? "text-white" : "text-[#0B0B14]"}`} style={{ fontSize: size * 0.62 }}>
          DashWin
        </span>
      )}
    </span>
  );
}
