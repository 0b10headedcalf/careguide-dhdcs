"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCase } from "@/lib/coverage/case-context";
import type { Language } from "@/lib/coverage/types";
import {
  ChevronDownIcon,
  GlobeIcon,
  HeartIcon,
  PhoneIcon,
  UserIcon
} from "./icons";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español"
};

function HeaderButton({
  children,
  ariaLabel,
  onClick,
  ariaExpanded,
  ariaHasPopup
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  ariaExpanded?: boolean;
  ariaHasPopup?: "menu" | "dialog";
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      onClick={onClick}
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

export function LanguageMenu({ align = "left" }: { align?: "left" | "right" }) {
  const { language, setLanguage } = useCase();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <HeaderButton
        ariaLabel="Change language"
        ariaExpanded={open}
        ariaHasPopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeIcon className="h-5 w-5" aria-hidden />
        <span>{LANGUAGE_LABELS[language]}</span>
        <ChevronDownIcon className="h-4 w-4" aria-hidden />
      </HeaderButton>
      {open ? (
        <div
          role="menu"
          aria-label="Language options"
          className={`absolute top-full z-30 mt-2 min-w-40 rounded-xl border border-[rgba(16,32,79,0.12)] bg-white p-1.5 shadow-[0_14px_32px_rgba(16,32,79,0.14)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              onClick={() => {
                setLanguage(option);
                setOpen(false);
              }}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold transition hover:bg-[#EAF0FF] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                language === option ? "text-primaryDark" : "text-navy"
              }`}
            >
              {LANGUAGE_LABELS[option]}
              {language === option ? <span aria-hidden>✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,79,0.18)] sm:p-7"
      >
        <h2 id="sign-in-title" className="text-2xl font-extrabold text-navy">
          Sign in
        </h2>
        <p className="mt-3 text-base leading-7 text-slatecare">
          Sign in will let you save and continue your case. For this version, your case stays in
          this browser.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primaryFill px-5 text-base font-extrabold text-white transition hover:bg-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Continue in this browser
        </button>
      </div>
    </div>
  );
}

export function Header() {
  const router = useRouter();
  const [signInOpen, setSignInOpen] = useState(false);

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
          <LanguageMenu />
          <HeaderButton
            ariaLabel="Start with voice"
            onClick={() => router.push("/coverage/intake?mode=voice")}
          >
            <PhoneIcon className="h-5 w-5" aria-hidden />
            <span>Voice</span>
          </HeaderButton>
          <HeaderButton
            ariaLabel="Sign in to CareGuide"
            ariaHasPopup="dialog"
            onClick={() => setSignInOpen(true)}
          >
            <UserIcon className="h-5 w-5" aria-hidden />
            <span>Sign in</span>
          </HeaderButton>
        </nav>
      </div>
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  );
}
