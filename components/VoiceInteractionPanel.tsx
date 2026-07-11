"use client";

import { useEffect, useState } from "react";

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "paused"
  | "error";

type VoiceInteractionPanelProps = {
  state: VoiceState;
  transcript: string;
  typingOpen: boolean;
  typedMessage: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry: () => void;
  onError: () => void;
  onTypeInstead: () => void;
  onTypedMessageChange: (value: string) => void;
};

const waveformBars = [10, 16, 12, 18, 14, 20, 13, 17];
const WORD_REVEAL_DELAY_MS = 270;
const SENTENCE_HOLD_MS = 2600;
const SENTENCE_FADE_MS = 320;
const transcriptExamples = [
  "I lost my insurance and need help understanding my options.",
  "Can you help me find affordable care nearby?",
  "I need help completing my application in Spanish."
];

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

function VoiceWaveform({ state }: { state: VoiceState }) {
  return (
    <div
      className="voice-wave flex h-7 items-center gap-1"
      data-state={state}
      aria-hidden="true"
    >
      {waveformBars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="voice-wave-bar w-1 rounded-full bg-primaryDark"
          style={
            {
              "--bar-height": `${height}px`,
              "--bar-delay": `${index * -0.09}s`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function VoiceInteractionPanel({
  state,
  onStart,
  onResume,
  onRetry,
  onTypeInstead
}: VoiceInteractionPanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [exampleIndex, setExampleIndex] = useState(0);
  const [wordCount, setWordCount] = useState(1);
  const [isFading, setIsFading] = useState(false);
  const activeTranscript = transcriptExamples[exampleIndex];
  const words = activeTranscript.split(" ");
  const transcriptText = reducedMotion
    ? transcriptExamples[0]
    : words.slice(0, wordCount).join(" ");

  useEffect(() => {
    if (reducedMotion) {
      setExampleIndex(0);
      setWordCount(transcriptExamples[0].split(" ").length);
      setIsFading(false);
      return;
    }

    const isSentenceComplete = wordCount >= words.length;
    let fadeTimer: number | undefined;
    const timer = window.setTimeout(
      () => {
        if (isSentenceComplete) {
          setIsFading(true);
          fadeTimer = window.setTimeout(() => {
            setExampleIndex((currentIndex) => (currentIndex + 1) % transcriptExamples.length);
            setWordCount(1);
            setIsFading(false);
          }, SENTENCE_FADE_MS);
          return;
        }

        setWordCount((currentWordCount) => currentWordCount + 1);
      },
      isSentenceComplete ? SENTENCE_HOLD_MS : WORD_REVEAL_DELAY_MS
    );

    return () => {
      window.clearTimeout(timer);
      if (fadeTimer) {
        window.clearTimeout(fadeTimer);
      }
    };
  }, [activeTranscript, reducedMotion, wordCount, words.length]);

  return (
    <section
      aria-labelledby="voice-panel-title"
      className="mt-7 w-full max-w-[35rem] rounded-lg border border-[#D9E3F8] bg-skysoft p-6 text-navy shadow-soft sm:mt-8 sm:p-7"
    >
      <div className="flex min-h-[148px] flex-col justify-between gap-5 sm:min-h-[158px]">
        <div className="flex min-w-0 items-center gap-3">
          <VoiceWaveform state={state} />
          <h2 id="voice-panel-title" className="text-base font-semibold text-navy sm:text-lg">
            Guide Agent
          </h2>
        </div>

        <p
          aria-live="polite"
          className={`text-[1.08rem] leading-[1.42] text-navy transition-opacity duration-300 sm:text-[1.18rem] ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {transcriptText}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-label="Start conversation"
            onClick={state === "paused" ? onResume : state === "speaking" ? onRetry : onStart}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primaryFill px-6 text-base font-semibold text-white transition-colors hover:bg-primaryDark active:bg-primaryActive focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary sm:text-[1.05rem]"
          >
            Start conversation
          </button>
          <button
            type="button"
            aria-label="Type instead"
            onClick={onTypeInstead}
            className="inline-flex min-h-11 items-center justify-center text-base font-semibold text-primaryDark underline-offset-4 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Type instead
          </button>
        </div>
      </div>
    </section>
  );
}
