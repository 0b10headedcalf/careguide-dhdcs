"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CareGuideLogo } from "./CareGuideLogo";
import { CaseProgressRail } from "./CaseProgressRail";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { FormAssistantPanel } from "./FormAssistantPanel";
import { MicIcon, SendIcon } from "./icons";
import { useCase } from "@/lib/coverage/case-context";
import { friendlyApiMessage, getCase, sendAgentMessage, sendIntakeMessage, transcribeAudio } from "@/lib/coverage/api";
import { caseStateFromBackend, type CaseState } from "@/lib/coverage/state-machine";
import type { Language } from "@/lib/coverage/types";

type MissionStatus = "Ready" | "Requesting microphone" | "Listening" | "Uploading audio" | "Transcribing" | "Thinking" | "Filling form" | "Needs review";
type ExplanationLevel = "simple" | "standard" | "detailed";

export function VoiceMissionControl() {
  const voiceEnabled = process.env.NEXT_PUBLIC_ENABLE_VOICE !== "false";
  const router = useRouter();
  const { caseId, language, setLanguage, startOrResumeCase } = useCase();
  const [status, setStatus] = useState<MissionStatus>("Ready");
  const [caseState, setCaseState] = useState<CaseState>("STARTED");
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("simple");
  const [message, setMessage] = useState("");
  const [assistantMessage, setAssistantMessage] = useState(
    "I can help you understand this form and fill it step by step. You can speak naturally, upload documents, or ask me to explain any question in simpler words."
  );
  const [question, setQuestion] = useState("What would you like help understanding first?");
  const [answerSource, setAnswerSource] = useState("Not answered");
  const [candidate, setCandidate] = useState<{ label: string; value: string; confidence?: number; needsReview: boolean } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [transcriptNeedsConfirmation, setTranscriptNeedsConfirmation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const ensureActiveCase = async () => {
    const id = caseId ?? (await startOrResumeCase());
    const detail = await getCase(id);
    setCaseState(caseStateFromBackend(detail.status));
    return id;
  };

  const askAgent = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setStatus("Thinking");
    try {
      const id = await ensureActiveCase();
      await sendIntakeMessage(
        id,
        text.trim(),
        language,
        answerSource === "Voice transcript" ? "voice" : "text"
      );
      const result = await sendAgentMessage(id, text.trim(), language, explanationLevel, "CCFRM604");
      setAssistantMessage(result.assistant_message);
      setQuestion(result.next_question ?? result.next_action);
      setStatus(result.needs_confirmation ? "Needs review" : "Filling form");
      setAnswerSource(answerSource === "Voice transcript" ? "User voice" : "User typed");
      const firstCandidate = result.form_field_candidates[0];
      if (firstCandidate && typeof firstCandidate === "object") {
        const record = firstCandidate as Record<string, unknown>;
        setCandidate({
          label: String(record.official_label ?? record.canonical_name ?? "Suggested form field"),
          value: String(record.value ?? ""),
          confidence: typeof record.confidence === "number" ? record.confidence : undefined,
          needsReview: record.needs_review !== false
        });
      } else {
        setCandidate(null);
      }
      setMessage("");
      setTranscriptNeedsConfirmation(false);
    } catch (agentError) {
      setError(agentError);
      setStatus("Ready");
    }
  };

  const finishRecording = async (blob: Blob) => {
    setStatus("Transcribing");
    try {
      const id = await ensureActiveCase();
      const result = await transcribeAudio(id, blob, language);
      setMessage(result.text);
      setAnswerSource("Voice transcript");
      setTranscriptNeedsConfirmation(true);
      setStatus("Needs review");
      inputRef.current?.focus();
    } catch (voiceError) {
      setError(voiceError);
      setStatus("Ready");
    }
  };

  const toggleRecording = async () => {
    if (!voiceEnabled) {
      setError(new Error("Voice recording is not enabled for this deployment."));
      inputRef.current?.focus();
      return;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      return;
    }
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setError(new Error("Voice recording is not supported in this browser."));
      inputRef.current?.focus();
      return;
    }
    try {
      await ensureActiveCase();
      setStatus("Requesting microphone");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setStatus("Uploading audio");
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recorderRef.current = null;
        void finishRecording(blob);
      };
      recorder.start();
      setStatus("Listening");
    } catch (voiceError) {
      setError(voiceError);
      setStatus("Ready");
      inputRef.current?.focus();
    }
  };

  return (
    <section className="bg-[#151B1B] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <CareGuideLogo inverse />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-white/55">
              <span className="sr-only">Language</span>
              <select value={language} onChange={(event) => void setLanguage(event.target.value as Language).catch(setError)} className="min-h-10 border border-white/15 bg-[#202827] px-3 text-sm font-bold text-white">
                <option value="en">English</option>
                <option value="es">Espanol</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Explanation level</span>
              <select value={explanationLevel} onChange={(event) => setExplanationLevel(event.target.value as ExplanationLevel)} className="min-h-10 border border-white/15 bg-[#202827] px-3 text-sm font-bold text-white">
                <option value="simple">Simple</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
            <span className="rounded-full border border-[#67C7AD]/40 bg-[#19332D] px-3 py-2 text-xs font-bold text-[#BFE4D8]">Powered by DigitalOcean Gradient AI</span>
          </div>
        </header>

        <div className="py-5"><CaseProgressRail current={caseState} /></div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
          <div className="flex min-h-[36rem] flex-col items-center justify-center border border-white/10 bg-[#1B2221] px-5 py-10 text-center sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9FC8BC]">CareGuide Coverage Orchestrator</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Understand the form. Answer naturally. Review every detail.</h1>
            <button type="button" onClick={() => void toggleRecording()} disabled={!voiceEnabled} aria-label={status === "Listening" ? "Stop recording" : "Start voice recording"} className="mission-orb relative mt-9 flex h-44 w-44 items-center justify-center rounded-full border border-[#67C7AD]/60 bg-[#253B37] text-[#DDF6ED] shadow-[0_0_0_16px_rgba(103,199,173,0.06),0_0_0_32px_rgba(103,199,173,0.03)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-[#BFE4D8]" data-state={status.toLowerCase()}>
              <MicIcon className="h-12 w-12" aria-hidden />
            </button>
            <p className="mt-7 text-lg font-bold">{status}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">{assistantMessage}</p>
            {error ? <p role="alert" className="mt-4 text-sm text-[#FFB4A2]">{friendlyApiMessage(error)}</p> : null}

            <form className="mt-7 flex w-full max-w-2xl gap-2" onSubmit={(event) => { event.preventDefault(); void askAgent(message); }}>
              <input ref={inputRef} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type an answer or ask what a form question means" className="min-h-12 min-w-0 flex-1 border border-white/15 bg-[#111716] px-4 text-base text-white placeholder:text-white/35 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#67C7AD]" />
              <button type="submit" disabled={!message.trim() || status === "Thinking"} aria-label="Send message" className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#67C7AD] text-[#102A2B] disabled:opacity-50"><SendIcon className="h-5 w-5" aria-hidden /></button>
            </form>
            {transcriptNeedsConfirmation ? <p className="mt-3 text-sm font-semibold text-[#F1B89A]">Review the transcript, then send it to the form assistant.</p> : null}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => void askAgent("Help me start the CCFRM604 coverage form one question at a time.")} className="min-h-11 bg-[#3F6FF2] px-5 font-bold text-white">Start guided form help</button>
              <button type="button" onClick={() => inputRef.current?.focus()} className="min-h-11 border border-white/20 px-5 font-bold text-white">Ask about a form question</button>
              <button type="button" onClick={() => router.push("/coverage/intake?mode=text")} className="min-h-11 px-3 text-sm font-bold text-white/65 underline underline-offset-4">Use structured intake</button>
            </div>
          </div>

          <div className="space-y-6">
            <FormAssistantPanel question={question} answerSource={answerSource} status={status} candidate={candidate} />
            <DocumentUploadPanel caseId={caseId} ensureCase={ensureActiveCase} />
          </div>
        </div>
      </div>
    </section>
  );
}
