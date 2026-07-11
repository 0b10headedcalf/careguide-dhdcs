"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LanguageMenu } from "@/components/Header";
import { ArrowRightIcon, HeartIcon, MicIcon } from "@/components/icons";
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
  const router = useRouter();
  return (
    <header className="border-b border-[rgba(16,32,79,0.10)] bg-cream/95 px-4 py-4 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="Go to CareGuide home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
            <HeartIcon className="h-6 w-6" aria-hidden />
          </span>
          <span>
            <span className="block text-xl font-extrabold leading-tight text-navy">
              CareGuide
            </span>
            <span className="block text-sm font-semibold text-slatecare">
              Healthcare benefits navigation
            </span>
          </span>
        </Link>

        <nav
          className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy"
          aria-label="Coverage flow controls"
        >
          <LanguageMenu align="right" />
          <button
            type="button"
            onClick={() => router.push("/coverage/intake?mode=voice")}
            className="inline-flex min-h-11 items-center rounded-xl px-3 transition hover:bg-white/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Voice mode
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-xl border border-[rgba(16,32,79,0.12)] bg-white px-4 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
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
    <div className="border-b border-[rgba(16,32,79,0.08)] bg-cream px-4 py-4 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 md:hidden">
          <p className="text-sm font-extrabold text-navy">
            Step {currentStep + 1} of {workflowSteps.length}: {workflowSteps[currentStep].label}
          </p>
          <p className="text-sm font-semibold text-slatecare">
            {Math.round(progressPercent)}%
          </p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white md:hidden">
          <div
            className="h-full rounded-full bg-primary"
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
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${
                    state === "current"
                      ? "bg-primary text-white"
                      : state === "completed"
                        ? "bg-[#EAF0FF] text-primaryDark hover:bg-[#DCE6FF]"
                        : "bg-white/70 text-slatecare hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      state === "current"
                        ? "bg-white text-primary"
                        : state === "completed"
                          ? "bg-primary text-white"
                          : "bg-[#E9E1D4] text-navy"
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
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primaryFill px-5 text-base font-extrabold text-white transition hover:bg-primaryDark active:bg-primaryActive disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary";

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
    "inline-flex min-h-12 items-center justify-center rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-5 text-base font-extrabold text-navy transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary";

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
      <div className="careguide-voice-orb relative flex h-28 w-28 items-center justify-center rounded-full bg-[#EAF0FF] text-primary sm:h-32 sm:w-32" data-state={state}>
        <span className="absolute inset-3 rounded-full bg-white/80" aria-hidden />
        <span className="absolute inset-0 rounded-full border border-[#B9C9F8]" aria-hidden />
        <MicIcon className="relative h-10 w-10" aria-hidden />
      </div>
      <p aria-live="polite" className="text-sm font-extrabold text-navy">
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
    <div className="rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-4">
      <label htmlFor="voice-transcript" className="text-sm font-extrabold text-navy">
        Live transcript
      </label>
      <textarea
        id="voice-transcript"
        value={transcript}
        onChange={(event) => onChange?.(event.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-xl border border-[#B9C9F8] bg-white px-3 py-3 text-base leading-6 text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
    <section className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card sm:p-7">
      <h1 className="font-editorial text-[2rem] font-semibold leading-tight text-navy sm:text-[2.7rem]">
        {title}
      </h1>
      {disclosure ? (
        <details className="mt-4 rounded-xl bg-[#F4EEE5] p-4 text-sm leading-6 text-[#24182A]">
          <summary className="cursor-pointer font-extrabold text-navy">
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
      className={`min-h-12 rounded-xl border px-4 text-left text-base font-bold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${
        selected
          ? "border-primary bg-[#EAF0FF] text-navy"
          : "border-[rgba(16,32,79,0.14)] bg-white text-slatecare hover:border-primary hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

export function SourceDisclosure({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-[16px] border border-[rgba(16,32,79,0.10)] bg-[#F4EEE5] p-4 text-sm leading-6 text-[#24182A]">
      <p className="font-extrabold text-navy">Source and decision note</p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}

export function ReviewFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center rounded-full border border-[#B9C9F8] bg-[#EAF0FF] px-3 text-sm font-extrabold text-navy">
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
    <aside className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card lg:sticky lg:top-6">
      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-primaryDark">
        Application progress
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-navy">{currentSection}</h2>
      <ol className="mt-5 space-y-3">
        {sections.map((section, index) => {
          const completed = index < completedCount;
          const current = section === currentSection;
          return (
            <li key={section} className="flex items-center gap-3 text-sm font-bold">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  current
                    ? "bg-primary text-white"
                    : completed
                      ? "bg-[#EAF0FF] text-primaryDark"
                      : "bg-[#E9E1D4] text-navy"
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
    <section className="rounded-[22px] border border-[#B9C9F8] bg-[#EAF0FF] p-6 shadow-card sm:p-8">
      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-primaryDark">
        Likely pathway preview
      </p>
      <h1 className="mt-3 font-editorial text-[2.2rem] font-semibold leading-tight text-navy sm:text-[3rem]">
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
    <article className="rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-[0_10px_28px_rgba(16,32,79,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-navy">{item.title}</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slatecare">
            {item.explanation}
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center self-start rounded-full bg-[#EAF0FF] px-3 text-sm font-extrabold text-primaryDark">
          {added ? "Ready" : item.status}
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <SecondaryButton onClick={onAdd}>
          {added ? "Marked as ready" : "I have this ready"}
        </SecondaryButton>
        <button
          type="button"
          onClick={onNeedHelp}
          className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-extrabold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
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
    <details className="mt-5 rounded-[16px] border border-[rgba(16,32,79,0.10)] bg-[#F4EEE5] p-4">
      <summary className="cursor-pointer text-sm font-extrabold text-navy">
        Official form wording
      </summary>
      <p className="mt-3 text-base leading-7 text-[#24182A]">{officialLabel}</p>
      <a
        href={sourceHref}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-extrabold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
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
    <section className="rounded-[22px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-primaryDark">
            Form question
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
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

export function SourceBadge({
  isCached,
  sourceId,
  sourceUrl,
  retrievedDate
}: {
  isCached?: boolean;
  sourceId?: string;
  sourceUrl?: string;
  retrievedDate?: string;
}) {
  if (!sourceId && !sourceUrl) return null;
  const label = sourceId ? sourceIdToLabel(sourceId) : "Official source";
  const dateText = retrievedDate ? retrievedDate.split("T")[0] : null;

  if (isCached) {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-900">
        <span aria-hidden>◆</span>
        <span>
          Cached from {label}
          {dateText ? ` · ${dateText}` : ""}
        </span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:no-underline"
          >
            source
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-900">
      <span aria-hidden>●</span>
      <span>
        Live from {label}
        {dateText ? ` · ${dateText}` : ""}
      </span>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:no-underline"
        >
          source
        </a>
      ) : null}
    </div>
  );
}

function sourceIdToLabel(sourceId: string): string {
  switch (sourceId) {
    case "hrsa_health_centers":
      return "HRSA";
    case "datasf_health_care_facilities":
      return "DataSF";
    case "google_maps":
      return "Google Maps";
    case "covered_ca_forms":
    case "covered_ca_local_help":
      return "Covered California";
    case "carebridge_preview":
      return "CareBridge worksheet";
    default:
      return sourceId;
  }
}

export function ResourceCard({ resource }: { resource?: ResourceSearchResult }) {
  if (!resource) {
    return (
      <article className="rounded-[18px] border border-dashed border-[#B9C9F8] bg-white p-6 text-center">
        <h2 className="text-xl font-extrabold text-navy">
          Enter your ZIP code to search verified resources.
        </h2>
        <p className="mt-2 text-base leading-7 text-slatecare">
          CareGuide will only show resource details when they come from a verified source.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-5">
      <h2 className="text-xl font-extrabold text-navy">{resource.name}</h2>
      <p className="mt-2 text-base text-slatecare">{resource.type}</p>
      {resource.address ? (
        <p className="mt-2 text-sm text-slatecare">{resource.address}</p>
      ) : null}
      {resource.phone ? (
        <p className="mt-1 text-sm text-slatecare">{resource.phone}</p>
      ) : null}
      {resource.distance ? (
        <p className="mt-1 text-sm text-slatecare">{resource.distance}</p>
      ) : null}
      {resource.reasonRecommended ? (
        <p className="mt-2 text-sm leading-6 text-slatecare">{resource.reasonRecommended}</p>
      ) : null}
      {resource.languageSupport?.length ? (
        <p className="mt-1 text-sm text-slatecare">
          Verified language support: {resource.languageSupport.join(", ")}
        </p>
      ) : null}
      <div className="mt-3">
        <SourceBadge
          isCached={resource.isCached}
          sourceId={resource.sourceId}
          sourceUrl={resource.sourceUrl ?? resource.officialSource}
          retrievedDate={resource.retrievedDate}
        />
      </div>
      {resource.isCached ? (
        <p className="mt-2 text-xs text-slatecare">
          Live source is temporarily unavailable. Showing the most recent cached snapshot from
          the official source.
        </p>
      ) : null}
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
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      {eyebrow ? (
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-primaryDark">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-editorial mt-3 max-w-4xl text-[2.25rem] font-semibold leading-tight text-navy sm:text-[3rem]">
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
      className="inline-flex min-h-11 items-center gap-2 text-base font-extrabold text-primaryDark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      {children}
      <ArrowRightIcon className="h-5 w-5" aria-hidden />
    </Link>
  );
}
