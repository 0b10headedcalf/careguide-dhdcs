"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "./types";

export type SpeechStatus =
  | "idle"
  | "unsupported"
  | "listening"
  | "transcribing"
  | "failed";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  es: "es-US"
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Real Web Speech recognition with graceful fallback.
 *
 * Support is only probed after user interaction (`start()`), never during
 * render, so server and first client render stay deterministic. When the
 * browser has no SpeechRecognition, status becomes "unsupported" and the
 * caller should switch to typing with a friendly message.
 */
export function useSpeechRecognition(language: Language, onFinal: (transcript: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new Ctor();
    recognition.lang = SPEECH_LANG[language];
    recognition.interimResults = true;
    recognition.continuous = false;
    finalRef.current = "";
    setInterim("");
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(finalRef.current + interimText);
      if (finalRef.current) setStatus("transcribing");
    };
    recognition.onerror = () => {
      setStatus("failed");
    };
    recognition.onend = () => {
      const transcript = finalRef.current.trim();
      if (transcript) {
        setStatus("idle");
        setInterim("");
        onFinalRef.current(transcript);
      } else {
        setStatus((current) => (current === "failed" ? "failed" : "idle"));
      }
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      setStatus("failed");
      recognitionRef.current = null;
    }
  }, [language]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { status, interim, start, stop };
}

/** True when this browser can do speech recognition. Client-only check. */
export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}
