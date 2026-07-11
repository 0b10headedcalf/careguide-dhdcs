import Image from "next/image";

export function CareGuideLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <Image
        src="/illustrations/logo.png"
        alt="CareGuide heart and Golden Gate Bridge logo"
        width={64}
        height={64}
        priority
        className={`shrink-0 object-contain ${compact ? "h-14 w-14 sm:h-16 sm:w-16" : "h-[72px] w-[72px] sm:h-[84px] sm:w-[84px]"}`}
      />
      <div>
        <p className="text-xl font-bold leading-tight tracking-normal text-navy sm:text-2xl">
          CareGuide
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-slatecare sm:text-base">
          Your benefits. Your health. Your future.
        </p>
      </div>
    </div>
  );
}
