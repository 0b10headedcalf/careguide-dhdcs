import Image from "next/image";

export function CareGuideLogo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
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
        <p className={`text-xl font-bold leading-tight tracking-normal sm:text-2xl ${inverse ? "text-cream" : "text-navy"}`}>
          CareGuide
        </p>
        <p className={`mt-1 text-sm font-medium leading-snug sm:text-base ${inverse ? "text-cream/70" : "text-slatecare"}`}>
          Your benefits. Your health. Your future.
        </p>
      </div>
    </div>
  );
}
