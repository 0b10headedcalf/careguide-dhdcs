import { MicIcon } from "./icons";

export type GuideAgentState =
  | "ready"
  | "requesting_microphone"
  | "listening"
  | "uploading_audio"
  | "transcribing"
  | "thinking"
  | "filling_field"
  | "needs_confirmation"
  | "saved"
  | "error"
  | "unsupported_browser";

const statusByState: Record<GuideAgentState, string> = {
  ready: "Ready",
  requesting_microphone: "Requesting microphone",
  listening: "Listening",
  uploading_audio: "Uploading audio",
  transcribing: "Transcribing",
  thinking: "Thinking",
  filling_field: "Preparing answer",
  needs_confirmation: "Needs confirmation",
  saved: "Saved",
  error: "Needs attention",
  unsupported_browser: "Voice unavailable"
};

function visualState(state: GuideAgentState) {
  if (state === "listening") return "listening";
  if (state === "thinking" || state === "transcribing" || state === "uploading_audio") {
    return "processing";
  }
  if (state === "filling_field" || state === "saved") return "speaking";
  if (state === "error" || state === "unsupported_browser") return "error";
  return "idle";
}

export function VoiceOrb({ state }: { state: GuideAgentState }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="careguide-voice-orb relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-primaryDark sm:h-16 sm:w-16"
        data-state={visualState(state)}
        aria-hidden="true"
      >
        <span className="absolute inset-2 rounded-full bg-skysoft" aria-hidden />
        <MicIcon className="relative h-6 w-6" aria-hidden />
      </div>
      <p aria-live="polite" className="text-sm font-semibold text-navy">
        {statusByState[state]}
      </p>
    </div>
  );
}
