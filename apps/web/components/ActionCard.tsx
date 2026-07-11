import Link from "next/link";
import { ArrowRightIcon } from "./icons";

type ActionCardProps = {
  title: string;
  text: string;
  ariaLabel: string;
  href: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "local";
};

const cardClasses = {
  primary: "bg-[#EAF0FF] text-[#10204F]",
  secondary: "bg-[#E9E1D4] text-[#24182A]",
  local: "bg-[#BFD9D8] text-[#231526]"
};

const iconClasses = {
  primary: "rounded-[18px] bg-[#DCE6FF] text-[#3F6FF2]",
  secondary: "rounded-full bg-[#F4EEE5] text-[#3F6FF2]",
  local: "rounded-[18px] bg-[#DCEDEC] text-[#315ED6]"
};

const arrowClasses = {
  primary: "text-[#3F6FF2]",
  secondary: "text-[#3F6FF2]",
  local: "text-[#315ED6]"
};

const descriptionClasses = {
  primary: "text-[#10204F]/80",
  secondary: "text-[#24182A]/78",
  local: "text-[#231526]/80"
};

export function ActionCard({ title, text, ariaLabel, href, icon, variant }: ActionCardProps) {
  return (
    <article
      className={`group relative flex min-h-[17.5rem] flex-col overflow-hidden rounded-[18px] border border-[rgba(16,32,79,0.10)] p-7 shadow-[0_10px_28px_rgba(16,32,79,0.07)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(16,32,79,0.18)] hover:shadow-[0_14px_32px_rgba(16,32,79,0.10)] focus-within:outline focus-within:outline-4 focus-within:outline-offset-4 focus-within:outline-[#3F6FF2] active:translate-y-0 active:shadow-[0_8px_20px_rgba(16,32,79,0.07)] sm:min-h-[19rem] sm:p-8 ${cardClasses[variant]}`}
    >
      <Link
        href={href}
        aria-label={ariaLabel}
        className="absolute inset-0 z-10 cursor-pointer rounded-[18px] focus-visible:outline-none"
      />

      <div
        className={`flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16 ${iconClasses[variant]}`}
        aria-hidden
      >
        {icon}
      </div>

      <h3 className="mt-8 max-w-[11ch] text-2xl font-bold leading-[1.08] tracking-normal sm:text-[1.8rem] lg:text-[1.9rem] xl:text-[2rem]">
        {title}
      </h3>

      <p className={`mt-4 max-w-[28ch] text-base leading-[1.5] sm:text-lg ${descriptionClasses[variant]}`}>
        {text}
      </p>

      <div
        className={`mt-auto flex justify-end pt-8 transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-within:translate-x-1 ${arrowClasses[variant]}`}
        aria-hidden
      >
        <ArrowRightIcon className="h-7 w-7" />
      </div>
    </article>
  );
}
