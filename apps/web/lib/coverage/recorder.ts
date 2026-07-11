"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./api";
import type { SpeechStatus } from "./speech";
import type { Language } from "./types";

/** Hard stop so an abandoned mic never records forever. */
const MAX_RECORDING_MS = 30_000;
const TRANSCRIBE_TIMEOUT_MS = 45_000;

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

async function transcribeAudio(blob: Blob, language: Language): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  form.append("language", language);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: "POST",
      body: form,
      signal: controller.signal
    });
    const body = (await response.json()) as {
      data?: { transcript?: string };
      error?: { message?: string };
    };
    if (!response.ok || body.error || typeof body.data?.transcript !== "string") {
      throw new Error(body.error?.message ?? `HTTP ${response.status}`);
    }
    return body.data.transcript;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Voice input via MediaRecorder + backend ElevenLabs transcription.
 *
 * Drop-in replacement for useSpeechRecognition: same { status, interim,
 * start, stop } shape. Unlike the Web Speech API this works in every
 * browser with a microphone and never depends on Google's speech service.
 * "listening" = recording, "transcribing" = waiting on the backend.
 */
export function useVoiceRecorder(language: Language, onFinal: (transcript: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const cleanup = useCallback(() => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    if (recorderRef.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Mic permission denied or no capture device.
      setStatus("failed");
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      cleanup();
      setStatus("failed");
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      cleanup();
      if (blob.size === 0) {
        setStatus("failed");
        return;
      }
      setStatus("transcribing");
      transcribeAudio(blob, language)
        .then((transcript) => {
          setStatus("idle");
          setInterim("");
          if (transcript) onFinalRef.current(transcript);
        })
        .catch(() => {
          setStatus("failed");
        });
    };
    recorderRef.current = recorder;
    streamRef.current = stream;
    setInterim("");
    setStatus("listening");
    recorder.start();
    maxTimerRef.current = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_RECORDING_MS);
  }, [language, cleanup]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  return { status, interim, start, stop };
}
