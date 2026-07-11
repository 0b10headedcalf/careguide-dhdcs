"use client";

import { useEffect, useRef, useState } from "react";
import { HeroIllustration } from "./HeroIllustration";
import { VoiceTransitionWave } from "./VoiceTransitionWave";
import {
  VoiceInteractionPanel,
  type VoiceState
} from "./VoiceInteractionPanel";

const userTranscript =
  "I recently lost my insurance and need help understanding my options.";

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

export function HeroSection() {
  const reducedMotion = usePrefersReducedMotion();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [typingOpen, setTypingOpen] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  const resumeTarget = useRef<VoiceState>("listening");

  const startVoice = () => {
    setTypingOpen(false);
    setTranscript(reducedMotion ? userTranscript : "");
    setVoiceState("listening");
  };

  const pauseVoice = () => {
    if (voiceState !== "paused") {
      resumeTarget.current = voiceState === "idle" || voiceState === "error" ? "listening" : voiceState;
    }
    setVoiceState("paused");
  };

  const resumeVoice = () => {
    setVoiceState(resumeTarget.current);
  };

  const stopVoice = () => {
    setVoiceState("idle");
    setTranscript("");
  };

  const showError = () => {
    setVoiceState("error");
  };

  const openTyping = () => {
    setTypingOpen(true);
  };

  useEffect(() => {
    if (voiceState !== "listening") {
      return;
    }

    const words = userTranscript.split(" ");
    const currentWordCount = transcript.length > 0 ? transcript.split(" ").length : 0;

    if (reducedMotion) {
      setTranscript(userTranscript);
    } else if (currentWordCount < words.length) {
      let index = currentWordCount;
      const transcriptTimer = window.setInterval(() => {
        index += 1;
        setTranscript(words.slice(0, index).join(" "));

        if (index >= words.length) {
          window.clearInterval(transcriptTimer);
        }
      }, 260);

      const processingTimer = window.setTimeout(() => {
        setVoiceState("processing");
      }, 4200);

      return () => {
        window.clearInterval(transcriptTimer);
        window.clearTimeout(processingTimer);
      };
    }

    const processingTimer = window.setTimeout(() => {
      setVoiceState("processing");
    }, reducedMotion ? 700 : 1200);

    return () => window.clearTimeout(processingTimer);
  }, [reducedMotion, transcript, voiceState]);

  useEffect(() => {
    if (voiceState !== "processing") {
      return;
    }

    const speakingTimer = window.setTimeout(() => {
      setVoiceState("speaking");
    }, reducedMotion ? 600 : 1500);

    return () => window.clearTimeout(speakingTimer);
  }, [reducedMotion, voiceState]);

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
            transcript={transcript}
            typingOpen={typingOpen}
            typedMessage={typedMessage}
            onStart={startVoice}
            onPause={pauseVoice}
            onResume={resumeVoice}
            onStop={stopVoice}
            onRetry={startVoice}
            onError={showError}
            onTypeInstead={openTyping}
            onTypedMessageChange={setTypedMessage}
          />
        </div>

        <HeroIllustration />
      </div>
      <VoiceTransitionWave state={voiceState} />
    </section>
  );
}
