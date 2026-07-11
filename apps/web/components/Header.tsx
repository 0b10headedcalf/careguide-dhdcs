import { CareGuideLogo } from "./CareGuideLogo";
import {
  ChevronDownIcon,
  GlobeIcon,
  PhoneIcon,
  UserIcon
} from "./icons";

function HeaderButton({
  children,
  ariaLabel
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="group relative inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold text-navy transition-colors hover:bg-skysoft hover:text-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary sm:min-h-12 sm:gap-2 sm:text-base"
    >
      {children}
      <span
        className="absolute bottom-1 left-2 right-2 h-px origin-left scale-x-0 rounded-full bg-primary transition-transform group-hover:scale-x-100"
        aria-hidden="true"
      />
    </button>
  );
}

export function Header() {
  return (
    <header className="border-b border-warmBorder bg-cream/90 px-5 pb-5 pt-5 sm:px-10 sm:pb-6 lg:px-16 lg:pt-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CareGuideLogo />

        <nav
          className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2"
          aria-label="CareGuide actions"
        >
          <HeaderButton ariaLabel="Change language">
            <GlobeIcon className="h-5 w-5" aria-hidden />
            <span>English</span>
            <ChevronDownIcon className="h-4 w-4" aria-hidden />
          </HeaderButton>
          <HeaderButton ariaLabel="Start with voice">
            <PhoneIcon className="h-5 w-5" aria-hidden />
            <span>Voice</span>
          </HeaderButton>
          <HeaderButton ariaLabel="Sign in to CareGuide">
            <UserIcon className="h-5 w-5" aria-hidden />
            <span>Sign in</span>
          </HeaderButton>
        </nav>
      </div>
    </header>
  );
}
