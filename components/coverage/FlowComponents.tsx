import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  MicIcon
} from "@/components/icons";
import type {
  DocumentChecklistEntry,
  FormFieldValue,
  PathwayPreview,
  ResourceSearchResult,
  VoiceState
} from "@/lib/coverage/types";

export const workflowSteps = [
  { label: "About You", href: "/coverage/intake" },
  { label: "Coverage", href: "/coverage/results" },
  { label: "Household", href: "/coverage/intake" },
  { label: "Income", href: "/coverage/intake" },
  { label: "Documents", href: "/coverage/documents" },
  { label: "Application", href: "/coverage/application" },
  { label: "Review", href: "/coverage/review" },
  { label: "Help", href: "/coverage/help" }
];

const currentStepByPath: Record<string, number> = {
  "/coverage/intake": 0,
  "/coverage/results": 1,
  "/coverage/documents": 4,
  "/coverage/application": 5,
  "/coverage/review": 6,
  "/coverage/help": 7
};

export function getCurrentStep(pathname: string) {
  return currentStepByPath[pathname] ?? 0;
}

export function AppHeader() {
  return (
    <header className="border-b border-warmBorder bg-cream/95 px-5 py-4 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="Go to CareGuide home"
        >
          <Image
            src="/illustrations/logo.png"
            alt="CareGuide heart and Golden Gate Bridge logo"
            width={64}
            height={64}
            priority
            className="h-[72px] w-[72px] shrink-0 object-contain sm:h-[84px] sm:w-[84px]"
          />
          <span>
            <span className="block text-xl font-bold leading-tight text-navy">
              CareGuide
            </span>
            <span className="block text-sm font-medium text-slatecare">
              Healthcare benefits navigation
            </span>
          </span>
        </Link>

        <nav
          className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy"
          aria-label="Coverage flow controls"
        >
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 transition hover:bg-skysoft hover:text-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label="Change language"
          >
            English
            <ChevronDownIcon className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-md px-3 transition hover:bg-skysoft hover:text-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Voice mode
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-md border border-[#D9E3F8] bg-skysoft px-4 text-primaryDark transition hover:border-primary hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Save and exit
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function ProgressHeader({ pathname }: { pathname: string }) {
  const currentStep = getCurrentStep(pathname);
  const progressPercent = ((currentStep + 1) / workflowSteps.length) * 100;

  return (
    <div className="border-b border-warmBorder bg-cream px-5 py-4 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 md:hidden">
          <p className="text-sm font-semibold text-navy">
            Step {currentStep + 1} of {workflowSteps.length}: {workflowSteps[currentStep].label}
          </p>
          <p className="text-sm font-semibold text-slatecare">
            {Math.round(progressPercent)}%
          </p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white md:hidden">
          <div
            className="h-full rounded-full bg-primaryFill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ol className="hidden items-center gap-2 md:grid md:grid-cols-8">
          {workflowSteps.map((step, index) => {
            const state =
              index < currentStep ? "completed" : index === currentStep ? "current" : "upcoming";

            return (
              <li key={`${step.label}-${index}`}>
                <Link
                  href={step.href}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${
                    state === "current"
                      ? "bg-skysoft text-navy"
                      : state === "completed"
                        ? "text-primaryDark hover:bg-skysoft"
                        : "text-slatecare hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      state === "current"
                        ? "bg-primaryFill text-white"
                        : state === "completed"
                          ? "bg-skysoft text-primaryDark"
                          : "bg-beige text-navy"
                    }`}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span className="truncate">{step.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  href,
  onClick,
  disabled,
  type = "button"
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primaryFill px-6 text-base font-semibold text-white transition hover:bg-primaryDark active:bg-primaryActive disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  href,
  onClick,
  type = "button"
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex min-h-12 items-center justify-center rounded-md border border-[#D9E3F8] bg-skysoft px-6 text-base font-semibold text-primaryDark transition hover:border-primary hover:bg-white hover:text-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function VoiceOrb({ state = "idle" }: { state?: VoiceState }) {
  const statusByState: Record<VoiceState, string> = {
    idle: "Ready when you are",
    listening: "Listening...",
    processing: "Understanding your answer...",
    speaking: "CareGuide is responding",
    error: "Something needs your attention"
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="careguide-voice-orb relative flex h-28 w-28 items-center justify-center rounded-full bg-skysoft text-primaryDark sm:h-32 sm:w-32" data-state={state}>
        <span className="absolute inset-3 rounded-full bg-white/78" aria-hidden />
        <span className="absolute inset-0 rounded-full border border-[#D9E3F8]" aria-hidden />
        <MicIcon className="relative h-10 w-10" aria-hidden />
      </div>
      <p aria-live="polite" className="text-sm font-semibold text-navy">
        {statusByState[state]}
      </p>
    </div>
  );
}

export function VoiceTranscript({
  transcript,
  onChange,
  helper
}: {
  transcript: string;
  onChange?: (value: string) => void;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-[#D9E3F8] bg-skysoft p-4">
      <label htmlFor="voice-transcript" className="text-sm font-semibold text-navy">
        Live transcript
      </label>
      <textarea
        id="voice-transcript"
        value={transcript}
        onChange={(event) => onChange?.(event.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-[#D9E3F8] bg-white px-3 py-3 text-base leading-6 text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-describedby={helper ? "voice-transcript-helper" : undefined}
      />
      {helper ? (
        <p id="voice-transcript-helper" className="mt-2 text-sm leading-6 text-slatecare">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionCard({
  title,
  children,
  disclosure
}: {
  title: string;
  children: ReactNode;
  disclosure?: string;
}) {
  return (
    <section className="careguide-soft-card p-6 sm:p-9">
      <h1 className="font-editorial text-[2rem] font-medium leading-tight text-navy sm:text-[2.55rem]">
        {title}
      </h1>
      {disclosure ? (
        <details className="mt-5 rounded-md bg-bgsoft p-4 text-sm leading-6 text-slatecare">
          <summary className="cursor-pointer font-semibold text-navy">
            Why are we asking this?
          </summary>
          <p className="mt-2">{disclosure}</p>
        </details>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function OptionChip({
  children,
  selected,
  onClick
}: {
  children: ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-12 rounded-md border px-4 text-left text-base font-semibold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${
        selected
          ? "border-primary bg-skysoft text-navy"
          : "border-[rgba(24,36,71,0.14)] bg-white text-slatecare hover:border-primary hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

export function SourceDisclosure({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-md bg-bgsoft p-4 text-sm leading-6 text-slatecare">
      <p className="font-semibold text-navy">Source and decision note</p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}

export function ReviewFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center rounded-md border border-[#D9E3F8] bg-skysoft px-3 text-sm font-semibold text-navy">
      Needs review: {children}
    </span>
  );
}

export function SidebarProgress({
  currentSection,
  sections,
  completedCount
}: {
  currentSection: string;
  sections: string[];
  completedCount: number;
}) {
  return (
    <aside className="rounded-lg bg-bgsoft p-5 lg:sticky lg:top-6">
      <p className="text-sm font-semibold text-primaryDark">
        Application progress
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-navy">{currentSection}</h2>
      <ol className="mt-5 space-y-3">
        {sections.map((section, index) => {
          const completed = index < completedCount;
          const current = section === currentSection;
          return (
            <li key={section} className="flex items-center gap-3 text-sm font-medium">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  current
                    ? "bg-primaryFill text-white"
                    : completed
                      ? "bg-skysoft text-primaryDark"
                      : "bg-beige text-navy"
                }`}
                aria-hidden
              >
                {index + 1}
              </span>
              <span className={current ? "text-navy" : "text-slatecare"}>{section}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6">
        <VoiceOrb state="idle" />
      </div>
    </aside>
  );
}

export function PathwayCard({ preview }: { preview: PathwayPreview }) {
  return (
    <section className="rounded-lg border border-[#D9E3F8] bg-skysoft p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold text-primaryDark">
        Likely pathway
      </p>
      <h1 className="mt-3 font-editorial text-[2.2rem] font-medium leading-tight text-navy sm:text-[3rem]">
        {preview.label}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slatecare">
        {preview.supportingLine}
      </p>
    </section>
  );
}

export function DocumentChecklistItem({
  item,
  added,
  onAdd,
  onNeedHelp
}: {
  item: DocumentChecklistEntry;
  added?: boolean;
  onAdd: () => void;
  onNeedHelp: () => void;
}) {
  return (
    <article className="border-b border-[rgba(24,36,71,0.08)] bg-white px-1 py-5 last:border-b-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy">{item.title}</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slatecare">
            {item.explanation}
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center self-start rounded-md bg-skysoft px-3 text-sm font-semibold text-primaryDark">
          {added ? "Added" : item.status}
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton onClick={onAdd}>{added ? "Replace file" : "Upload file"}</SecondaryButton>
        <button
          type="button"
          onClick={onNeedHelp}
          className="inline-flex min-h-12 items-center justify-center rounded-md px-4 text-base font-semibold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          I don’t have this
        </button>
      </div>
    </article>
  );
}

export function OfficialQuestionDisclosure({
  officialLabel,
  sourceHref
}: {
  officialLabel: string;
  sourceHref: string;
}) {
  return (
    <details className="mt-5 rounded-md bg-bgsoft p-4">
      <summary className="cursor-pointer text-sm font-semibold text-navy">
        Official form wording
      </summary>
      <p className="mt-3 text-base leading-7 text-slatecare">{officialLabel}</p>
      <a
        href={sourceHref}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        View original government form
      </a>
    </details>
  );
}

export function FormQuestion({
  field,
  children
}: {
  field: FormFieldValue;
  children: ReactNode;
}) {
  return (
    <section className="careguide-soft-card p-6 sm:p-9">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primaryDark">
            Form question
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight text-navy sm:text-3xl">
            {field.plainLanguageLabel}
          </h1>
        </div>
        {field.needsReview ? <ReviewFlag>{field.id}</ReviewFlag> : null}
      </div>
      <div className="mt-6">{children}</div>
      <SourceDisclosure>
        <p>{field.explanation}</p>
        <p className="mt-2">
          Source: {field.sourceType.replace("_", " ")}. CareGuide will not overwrite a confirmed
          answer without your review.
        </p>
      </SourceDisclosure>
      <OfficialQuestionDisclosure
        officialLabel={field.officialFieldLabel}
        sourceHref="https://www.coveredca.com/apply/"
      />
    </section>
  );
}

export function ResourceCard({ resource }: { resource?: ResourceSearchResult }) {
  if (!resource) {
    return (
      <article className="rounded-lg border border-dashed border-[#D9E3F8] bg-white p-6 text-center">
        <h2 className="text-xl font-semibold text-navy">
          Enter your ZIP code to search verified resources.
        </h2>
        <p className="mt-2 text-base leading-7 text-slatecare">
          CareGuide will only show resource details when they come from a verified source.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-[rgba(24,36,71,0.08)] bg-white p-5">
      <h2 className="text-xl font-semibold text-navy">{resource.name}</h2>
      <p className="mt-2 text-base text-slatecare">{resource.type}</p>
    </article>
  );
}

export function PageIntro({
  eyebrow,
  title,
  text,
  children
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-10 sm:pt-14 lg:px-16">
      {eyebrow ? (
        <p className="text-sm font-semibold text-primaryDark">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-editorial mt-3 max-w-4xl text-[2.2rem] font-medium leading-tight text-navy sm:text-[2.85rem]">
        {title}
      </h1>
      {text ? (
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slatecare">{text}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export function InlineArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      {children}
      <ArrowRightIcon className="h-5 w-5" aria-hidden />
    </Link>
  );
}
