"use client";

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "paused"
  | "error";

type VoiceInteractionPanelProps = {
  state: VoiceState;
  busy: boolean;
  errorMessage: string | null;
  examplePrompt: string;
  onStart: () => void;
  onTypeInstead: () => void;
};

const waveformBars = [10, 16, 12, 18, 14, 20, 13, 17];

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
          className="voice-wave-bar w-1 rounded-full bg-[#3F6FF2]"
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
  busy,
  errorMessage,
  examplePrompt,
  onStart,
  onTypeInstead
}: VoiceInteractionPanelProps) {
  return (
    <section
      aria-labelledby="voice-panel-title"
      className="mt-6 w-full max-w-[36rem] rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-6 text-[#10204F] shadow-[0_8px_24px_rgba(63,111,242,0.08)] sm:mt-7 sm:p-7"
    >
      <div className="flex min-h-[150px] flex-col justify-between gap-5 sm:min-h-[162px]">
        <div className="flex min-w-0 items-center gap-3">
          <VoiceWaveform state={state} />
          <h2 id="voice-panel-title" className="text-base font-semibold text-[#10204F] sm:text-lg">
            Guide Agent
          </h2>
        </div>

        <p
          aria-live="polite"
          className="text-[1.1rem] leading-[1.4] text-[#10204F] sm:text-[1.25rem]"
        >
          {errorMessage ?? (
            <>
              Try saying: <em>“{examplePrompt}”</em>
            </>
          )}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-label="Start conversation"
            onClick={onStart}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#3B6BEC] px-6 text-base font-semibold text-white transition-colors hover:bg-[#315ED6] active:bg-[#274EB7] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#3F6FF2] sm:text-lg"
          >
            {busy ? "Starting…" : "Start conversation"}
          </button>
          <button
            type="button"
            aria-label="Type instead"
            onClick={onTypeInstead}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center text-base font-semibold text-[#315ED6] underline-offset-4 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#3F6FF2]"
          >
            Type instead
          </button>
        </div>
      </div>
    </section>
  );
}
