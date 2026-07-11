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
  primary: "bg-skysoft text-navy",
  secondary: "bg-beige text-navy",
  local: "bg-[#F5F7FD] text-navy"
};

const iconClasses = {
  primary: "rounded-md bg-white/70 text-primaryDark",
  secondary: "rounded-full bg-white/70 text-primaryDark",
  local: "rounded-md bg-skysoft text-primaryDark"
};

const arrowClasses = {
  primary: "text-primaryDark",
  secondary: "text-primaryDark",
  local: "text-primaryDark"
};

const descriptionClasses = {
  primary: "text-slatecare",
  secondary: "text-slatecare",
  local: "text-slatecare"
};

export function ActionCard({ title, text, ariaLabel, href, icon, variant }: ActionCardProps) {
  return (
    <article
      className={`group relative flex min-h-[16rem] flex-col overflow-hidden rounded-lg border border-[rgba(24,36,71,0.08)] p-7 shadow-soft transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#D9E3F8] hover:shadow-[0_12px_30px_rgba(24,36,71,0.07)] focus-within:outline focus-within:outline-4 focus-within:outline-offset-4 focus-within:outline-primary active:translate-y-0 active:shadow-soft sm:min-h-[17.5rem] sm:p-8 ${cardClasses[variant]}`}
    >
      <Link
        href={href}
        aria-label={ariaLabel}
        className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-none"
      />

      <div
        className={`flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14 ${iconClasses[variant]}`}
        aria-hidden
      >
        {icon}
      </div>

      <h3 className="mt-8 max-w-[12ch] text-2xl font-semibold leading-[1.12] tracking-normal sm:text-[1.7rem] lg:text-[1.85rem]">
        {title}
      </h3>

      <p className={`mt-4 max-w-[28ch] text-base leading-[1.55] sm:text-lg ${descriptionClasses[variant]}`}>
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
