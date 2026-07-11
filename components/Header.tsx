import {
  ChevronDownIcon,
  GlobeIcon,
  HeartIcon,
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
      className="group relative inline-flex min-h-11 items-center justify-center gap-1.5 px-1 text-sm font-bold text-navy transition-colors hover:text-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary sm:min-h-12 sm:gap-2 sm:text-base"
    >
      {children}
      <span
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-primary transition-transform group-hover:scale-x-100"
        aria-hidden="true"
      />
    </button>
  );
}

export function Header() {
  return (
    <header className="border-b border-warmBorder px-4 pb-5 pt-5 sm:px-8 sm:pb-6 lg:px-10 lg:pt-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft sm:h-14 sm:w-14">
            <HeartIcon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-tight tracking-normal text-navy sm:text-2xl">
              CareGuide
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slatecare sm:text-base">
              Your benefits. Your health. Your future.
            </p>
          </div>
        </div>

        <nav
          className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3"
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
