"use client";

import { useRef, useState } from "react";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { FieldConfirmationCard } from "./FieldConfirmationCard";
import { FormQuestionPanel } from "./FormQuestionPanel";
import { VoiceOrb, type GuideAgentState } from "./VoiceOrb";
import { VoiceTranscriptReview } from "./VoiceTranscriptReview";
import {
  confirmGuideField,
  ensureGuideCase,
  getGuideNextQuestion,
  sendGuideAnswer,
  transcribeGuideAudio,
  type ExplanationLevel,
  type GuideFieldCandidate,
  type GuideQuestion
} from "@/lib/coverage/guide-api";
import type { Language } from "@/lib/coverage/types";

const INTRO_MESSAGE =
  "I can help you fill this form step by step. I’ll ask one question at a time, explain anything that is confusing, and save answers only after you confirm.";

const languageLabels: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" }
];

const explanationLabels: Array<{ value: ExplanationLevel; label: string }> = [
  { value: "simple", label: "Simple" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" }
];

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

export function GuideAgentCard() {
  const voiceEnabled = process.env.NEXT_PUBLIC_ENABLE_VOICE !== "false";
  const [language, setLanguage] = useState<Language>("en");
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("simple");
  const [state, setState] = useState<GuideAgentState>("ready");
  const [assistantMessage, setAssistantMessage] = useState(INTRO_MESSAGE);
  const [section, setSection] = useState("Applicant");
  const [question, setQuestion] = useState<GuideQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState("");
  const [candidate, setCandidate] = useState<GuideFieldCandidate | null>(null);
  const [error, setError] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setResponse = (response: Awaited<ReturnType<typeof getGuideNextQuestion>>) => {
    setAssistantMessage(response.assistant_message || INTRO_MESSAGE);
    setSection(response.current_section || "Applicant");
    setQuestion(response.next_question);
    setCandidate(response.field_candidate);
  };

  const ensureActiveCase = async () => ensureGuideCase(language, explanationLevel);

  const startConversation = async () => {
    setError("");
    setState("thinking");
    try {
      const caseId = await ensureActiveCase();
      const response = await getGuideNextQuestion(caseId, language, explanationLevel);
      setResponse(response);
      setState(response.next_question ? "ready" : "saved");
    } catch (startError) {
      setState("error");
      setError(startError instanceof Error ? startError.message : "CareGuide could not start the conversation.");
    }
  };

  const submitAnswer = async (value: string, source: "voice" | "text") => {
    if (!value.trim()) {
      return;
    }
    setError("");
    setState("filling_field");
    try {
      const caseId = await ensureActiveCase();
      const response = await sendGuideAnswer(
        caseId,
        value.trim(),
        source,
        language,
        explanationLevel,
        question?.field_name
      );
      setResponse(response);
      setCandidate(response.field_candidate);
      setTranscript("");
      setAnswer("");
      setState(response.field_candidate ? "needs_confirmation" : "ready");
    } catch (submitError) {
      setState("error");
      setError(submitError instanceof Error ? submitError.message : "CareGuide could not prepare that answer.");
    }
  };

  const confirmCandidate = async () => {
    if (!candidate) {
      return;
    }
    setError("");
    setState("thinking");
    try {
      const caseId = await ensureActiveCase();
      const response = await confirmGuideField(caseId, candidate, language, explanationLevel);
      setResponse(response);
      setCandidate(null);
      setState(response.next_question ? "saved" : "saved");
    } catch (confirmError) {
      setState("error");
      setError(confirmError instanceof Error ? confirmError.message : "CareGuide could not save that field.");
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (!voiceEnabled) {
      setState("unsupported_browser");
      setError("Voice is not supported in this browser. You can type instead.");
      return;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setState("unsupported_browser");
      setError("Voice is not supported in this browser. You can type instead.");
      return;
    }

    setError("");
    setState("requesting_microphone");
    try {
      await ensureActiveCase();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recorderRef.current = null;
        stopTracks();
        void transcribeRecording(audio);
      };
      recorder.start();
      setState("listening");
    } catch (recordError) {
      stopTracks();
      setState("error");
      setError(recordError instanceof Error ? recordError.message : "Microphone access failed.");
    }
  };

  const transcribeRecording = async (audio: Blob) => {
    if (!audio.size) {
      setState("error");
      setError("No audio was captured. You can record again or type instead.");
      return;
    }
    setState("uploading_audio");
    try {
      const caseId = await ensureActiveCase();
      setState("transcribing");
      const result = await transcribeGuideAudio(caseId, audio, language);
      setTranscript(result.text);
      setState("needs_confirmation");
    } catch (transcribeError) {
      setState("error");
      setError(transcribeError instanceof Error ? transcribeError.message : "Transcription failed.");
    }
  };

  const busy = ["thinking", "filling_field", "uploading_audio", "transcribing"].includes(state);

  return (
    <section
      aria-labelledby="guide-agent-title"
      className="mt-7 w-full max-w-[35rem] rounded-lg border border-[#D9E3F8] bg-skysoft p-6 text-navy shadow-soft sm:mt-8 sm:p-7"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <VoiceOrb state={state} />
              <h2 id="guide-agent-title" className="text-base font-semibold text-navy sm:text-lg">
                Guide Agent
              </h2>
            </div>
            <p className="mt-3 text-base leading-7 text-navy">{assistantMessage}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="careguide-field mt-2 min-h-11 rounded-md py-0 text-sm"
            >
              {languageLabels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">
            Explanation level
            <select
              value={explanationLevel}
              onChange={(event) => setExplanationLevel(event.target.value as ExplanationLevel)}
              className="careguide-field mt-2 min-h-11 rounded-md py-0 text-sm"
            >
              {explanationLabels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FormQuestionPanel
          question={question}
          section={section}
          explanationLevel={explanationLevel}
        />

        {candidate ? (
          <FieldConfirmationCard
            candidate={candidate}
            onConfirm={confirmCandidate}
            onEdit={() => {
              setAnswer(String(candidate.value));
              setCandidate(null);
              setState("ready");
            }}
            disabled={busy}
          />
        ) : null}

        {transcript ? (
          <VoiceTranscriptReview
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onUse={() => void submitAnswer(transcript, "voice")}
            onRecordAgain={() => {
              setTranscript("");
              void startRecording();
            }}
            disabled={busy}
          />
        ) : null}

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAnswer(answer, "text");
          }}
        >
          <label className="text-sm font-semibold text-navy">
            Type an answer or ask for help
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="careguide-field mt-2"
              placeholder="Type here"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              aria-label="Start conversation"
              onClick={startConversation}
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primaryFill px-6 text-base font-semibold text-white transition-colors hover:bg-primaryDark active:bg-primaryActive disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary sm:text-[1.05rem]"
            >
              Start conversation
            </button>
            <button
              type="button"
              aria-label={state === "listening" ? "Stop recording" : "Answer with voice"}
              onClick={startRecording}
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#D9E3F8] bg-white px-4 text-base font-semibold text-primaryDark transition hover:bg-bgsoft disabled:cursor-not-allowed disabled:opacity-55"
            >
              {state === "listening" ? "Stop recording" : "Answer with voice"}
            </button>
            <button
              type="submit"
              disabled={!answer.trim() || busy}
              className="inline-flex min-h-12 items-center justify-center text-base font-semibold text-primaryDark underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-55"
            >
              Send typed answer
            </button>
          </div>
        </form>

        <DocumentUploadPanel
          ensureCase={ensureActiveCase}
          onUploaded={(document) => {
            setDocumentStatus(`${document.filename}: ${document.extraction_status.replace("_", " ")}`);
          }}
        />

        {documentStatus ? (
          <p className="text-sm font-semibold text-slatecare">Latest document: {documentStatus}</p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#A84234]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
