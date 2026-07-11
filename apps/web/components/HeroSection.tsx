"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeroIllustration } from "./HeroIllustration";
import { VoiceTransitionWave } from "./VoiceTransitionWave";
import {
  VoiceInteractionPanel,
  type VoiceState
} from "./VoiceInteractionPanel";
import { useCase } from "@/lib/coverage/case-context";
import type { Language } from "@/lib/coverage/types";

const EXAMPLE_PROMPTS: Record<Language, string> = {
  en: "I lost my insurance and need help understanding my options.",
  es: "Perdí mi seguro y necesito ayuda para entender mis opciones."
};

export function HeroSection() {
  const router = useRouter();
  const { language, startOrResumeCase } = useCase();
  const [busy, setBusy] = useState(false);
  const voiceState: VoiceState = busy ? "processing" : "idle";

  const startConversation = async (mode: "voice" | "text") => {
    setBusy(true);
    try {
      // Creates a new case, or resumes the one already in this browser.
      await startOrResumeCase();
    } catch {
      // Backend unreachable: intake still works from local state and shows
      // a visible sync notice — never dead-click here.
    } finally {
      router.push(`/coverage/intake?mode=${mode}`);
    }
  };

  return (
    <section className="px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:px-10 lg:pb-16 lg:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(30rem,0.5fr)] lg:justify-between xl:gap-[5%]">
        <div>
          <div className="flex items-start gap-4">
            <h1 className="font-editorial max-w-2xl text-[2.1rem] font-semibold leading-[1.08] tracking-normal text-navy sm:text-[2.7rem] md:text-[3.05rem] lg:text-[3.25rem] xl:text-[3.5rem]">
              We’re here to help you get the care you deserve.
            </h1>
          </div>

          <p className="mt-5 max-w-[38.75rem] text-lg leading-8 text-slatecare sm:mt-6 sm:text-xl sm:leading-9">
            Answer a few simple questions. We’ll help you understand your
            options, prepare your forms, and connect you to local help.
          </p>

          <p className="mt-4 max-w-[38.75rem] text-sm leading-6 text-slatecare/80">
            Medi-Cal already covers more than one-third of Californians. The front door to
            that coverage — forms, documents, language, local help — lives in disconnected
            places. CareBridge CA turns that maze into a guided case file.{" "}
            <a
              href="https://www.dhcs.ca.gov/dataandstats/Pages/Medi-Cal-Eligibility-Statistics.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:no-underline"
            >
              Source: DHCS
            </a>
          </p>

          <VoiceInteractionPanel
            state={voiceState}
            busy={busy}
            errorMessage={null}
            examplePrompt={EXAMPLE_PROMPTS[language]}
            onStart={() => void startConversation("voice")}
            onTypeInstead={() => void startConversation("text")}
          />
        </div>

        <HeroIllustration />
      </div>
      <VoiceTransitionWave state={voiceState} />
    </section>
  );
}
