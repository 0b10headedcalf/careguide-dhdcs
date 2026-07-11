export function CareGuideLogo({ inverse = false }: { inverse?: boolean }) {
  const ink = inverse ? "#F7F4EE" : "#10204F";
  return (
    <div className="inline-flex items-center gap-3" aria-label="CareGuide">
      <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" role="img" aria-hidden="true">
        <rect width="48" height="48" rx="8" fill="#3F6FF2" />
        <path d="M9 29c8-12 22-12 30 0" fill="none" stroke="#F7F4EE" strokeWidth="3" />
        <path d="M13 29v7M35 29v7M11 36h26" fill="none" stroke="#F7F4EE" strokeWidth="3" strokeLinecap="round" />
        <path d="m19 22 4 4 8-9" fill="none" stroke="#BFE4D8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17h3M37 17h3M7 12h5M36 12h5" stroke="#BFE4D8" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>
        <span className="block text-xl font-extrabold leading-none" style={{ color: ink }}>CareGuide</span>
        <span className="mt-1 block text-xs font-semibold text-current opacity-70">Voice Mission Control</span>
      </span>
    </div>
  );
}
