"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppHeader,
  DocumentChecklistItem,
  FormQuestion,
  OptionChip,
  PageIntro,
  PathwayCard,
  PrimaryButton,
  QuestionCard,
  ReviewFlag,
  SecondaryButton,
  SidebarProgress,
  SourceDisclosure,
  VoiceOrb,
  VoiceTranscript
} from "./FlowComponents";
import { ErrorNotice } from "./ErrorNotice";
import { NearbyResourcesMap } from "@/components/maps/NearbyResourcesMap";
import { AddressAutocomplete } from "@/components/maps/AddressAutocomplete";
import { OfficialResourcesList } from "@/components/coverage/OfficialResourcesList";
import {
  ensureCase,
  evaluateEligibility,
  exportPacket,
  handoffPacketHtmlUrl,
  getCase,
  getDocumentChecklist,
  getFormFields,
  pathwayToPreview,
  PRIMARY_FORM_ID,
  routeForms,
  saveIntakeAnswer,
  searchNearbyResources,
  syncDraftFacts,
  verifyPacket
} from "@/lib/coverage/api";
import { useCase } from "@/lib/coverage/case-context";
import { caseStateFromBackend, nextRouteForState } from "@/lib/coverage/state-machine";
import { useGeocoder } from "@/lib/coverage/geocode";
import { useSpeechRecognition } from "@/lib/coverage/speech";
import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  Language,
  PathwayPreview,
  ResourceSearchResult,
  VoiceState
} from "@/lib/coverage/types";

/* ------------------------------ intake model ----------------------------- */

type IntakeQuestion = {
  id: keyof Omit<CaseDraft, "confirmedFields" | "docStatus">;
  title: string;
  titleEs: string;
  disclosure: string;
  disclosureEs: string;
  kind: "text" | "number" | "options";
  options?: string[];
  /** Backend canonical fact name; local-only questions have none. */
  canonicalName?: string;
  sensitive?: boolean;
};

const intakeQuestions: IntakeQuestion[] = [
  {
    id: "language",
    title: "What language would you like to use?",
    titleEs: "¿Qué idioma le gustaría usar?",
    disclosure: "Language helps us present the next steps clearly. You can change it later.",
    disclosureEs: "El idioma nos ayuda a presentar los pasos con claridad. Puede cambiarlo después.",
    kind: "options",
    options: ["English", "Spanish"]
  },
  {
    id: "zip",
    title: "What ZIP code do you live in?",
    titleEs: "¿En qué código postal vive?",
    disclosure: "ZIP code helps identify the right coverage pathway and local support area.",
    disclosureEs: "El código postal ayuda a identificar la vía de cobertura y la ayuda local adecuadas.",
    kind: "text",
    canonicalName: "location.zip",
    sensitive: true
  },
  {
    id: "coverageNeed",
    title: "Who needs health coverage?",
    titleEs: "¿Quién necesita cobertura de salud?",
    disclosure: "This helps us understand whether the application is for you, family members, or both.",
    disclosureEs: "Esto nos ayuda a saber si la solicitud es para usted, su familia o ambos.",
    kind: "options",
    options: ["Just me", "Me and family", "A family member"]
  },
  {
    id: "currentInsurance",
    title: "Do you currently have health insurance?",
    titleEs: "¿Tiene seguro de salud actualmente?",
    disclosure: "Current coverage can affect which steps should be reviewed next.",
    disclosureEs: "La cobertura actual puede afectar los próximos pasos a revisar.",
    kind: "options",
    options: ["Yes", "No", "Not sure"]
  },
  {
    id: "recentCoverageLoss",
    title: "Did you recently lose coverage?",
    titleEs: "¿Perdió cobertura recientemente?",
    disclosure: "A recent coverage change may affect timing and next steps.",
    disclosureEs: "Un cambio reciente de cobertura puede afectar los plazos y los próximos pasos.",
    kind: "options",
    options: ["Yes", "No", "Not sure"],
    canonicalName: "insurance.recent_coverage_loss"
  },
  {
    id: "householdSize",
    title: "How many people live in your household?",
    titleEs: "¿Cuántas personas viven en su hogar?",
    disclosure: "Household size is a sensitive field and must be confirmed before it is used.",
    disclosureEs: "El tamaño del hogar es un dato sensible y debe confirmarse antes de usarse.",
    kind: "number",
    canonicalName: "household.size",
    sensitive: true
  },
  {
    id: "incomeEstimate",
    title: "What is your approximate household income?",
    titleEs: "¿Cuál es el ingreso aproximado de su hogar?",
    disclosure: "Income is only used for a pathway preview. It must be reviewed before any official packet.",
    disclosureEs: "El ingreso solo se usa para una vista previa. Debe revisarse antes de cualquier paquete oficial.",
    kind: "number",
    canonicalName: "income.estimate",
    sensitive: true
  },
  {
    id: "incomeFrequency",
    title: "How often do you receive that income?",
    titleEs: "¿Con qué frecuencia recibe ese ingreso?",
    disclosure: "Frequency helps CareGuide interpret the estimate in the right time period.",
    disclosureEs: "La frecuencia ayuda a CareGuide a interpretar el estimado en el período correcto.",
    kind: "options",
    options: ["Weekly", "Every two weeks", "Monthly", "Yearly"],
    canonicalName: "income.frequency"
  },
  {
    id: "employerCoverageOffer",
    title: "Are you offered health insurance through an employer?",
    titleEs: "¿Le ofrecen seguro de salud a través de un empleador?",
    disclosure: "Employer coverage is an official application topic and must be confirmed.",
    disclosureEs: "La cobertura del empleador es un tema oficial de la solicitud y debe confirmarse.",
    kind: "options",
    options: ["Yes", "No", "Unknown"],
    canonicalName: "employer.coverage_offer",
    sensitive: true
  },
  {
    id: "needsCareNow",
    title: "Would you like help finding care while your coverage is being reviewed?",
    titleEs: "¿Quiere ayuda para encontrar atención mientras se revisa su cobertura?",
    disclosure: "This does not contact anyone automatically. It only prepares options for you to review.",
    disclosureEs: "Esto no contacta a nadie automáticamente. Solo prepara opciones para que las revise.",
    kind: "options",
    options: ["Yes", "No"]
  }
];

const OPTION_LABELS_ES: Record<string, string> = {
  English: "English",
  Spanish: "Español",
  "Just me": "Solo yo",
  "Me and family": "Mi familia y yo",
  "A family member": "Un familiar",
  Yes: "Sí",
  No: "No",
  "Not sure": "No estoy seguro",
  Weekly: "Semanal",
  "Every two weeks": "Cada dos semanas",
  Monthly: "Mensual",
  Yearly: "Anual",
  Unknown: "No sé"
};

function t(language: Language, en: string, es: string) {
  return language === "es" ? es : en;
}

function optionLabel(language: Language, option: string) {
  return language === "es" ? OPTION_LABELS_ES[option] ?? option : option;
}

const formSections = [
  "Applicant",
  "Household",
  "Coverage",
  "Income",
  "Employer coverage",
  "Documents",
  "Review"
];

function parseIntakeAnswer(question: IntakeQuestion, rawAnswer: string): Partial<CaseDraft> {
  switch (question.id) {
    case "language":
      return { language: rawAnswer === "Spanish" ? "es" : "en" };
    case "zip":
      return { zip: rawAnswer.trim() };
    case "coverageNeed":
      return { coverageNeed: rawAnswer };
    case "currentInsurance":
      return { currentInsurance: rawAnswer };
    case "recentCoverageLoss":
      return { recentCoverageLoss: rawAnswer === "Yes" };
    case "householdSize":
      return { householdSize: Number(rawAnswer) };
    case "incomeEstimate":
      return { incomeEstimate: Number(rawAnswer) };
    case "incomeFrequency":
      return { incomeFrequency: rawAnswer };
    case "employerCoverageOffer":
      return {
        employerCoverageOffer:
          rawAnswer === "Yes" ? "yes" : rawAnswer === "No" ? "no" : "unknown"
      };
    case "needsCareNow":
      return { needsCareNow: rawAnswer === "Yes" };
    default:
      return {};
  }
}

/** Backend value for a question, from the draft the answer was just merged into. */
function canonicalValue(question: IntakeQuestion, draft: CaseDraft): unknown {
  switch (question.canonicalName) {
    case "location.zip":
      return draft.zip;
    case "household.size":
      return draft.householdSize;
    case "income.estimate":
      return draft.incomeEstimate;
    case "income.frequency":
      return draft.incomeFrequency;
    case "employer.coverage_offer":
      return draft.employerCoverageOffer;
    case "insurance.recent_coverage_loss":
      return draft.recentCoverageLoss;
    default:
      return undefined;
  }
}

function getDraftDisplayValue(draft: CaseDraft, question: IntakeQuestion) {
  const value = draft[question.id];
  if (value === undefined || value === null) {
    return "";
  }

  if (question.id === "language") {
    return value === "es" ? "Spanish" : "English";
  }

  if (question.id === "recentCoverageLoss" || question.id === "needsCareNow") {
    return value ? "Yes" : "No";
  }

  if (question.id === "employerCoverageOffer") {
    return value === "yes" ? "Yes" : value === "no" ? "No" : "Unknown";
  }

  return String(value);
}

/** ?mode=voice|text from the URL, read client-side only (deterministic SSR). */
function useEntryMode(): "voice" | "text" | null {
  const [mode, setMode] = useState<"voice" | "text" | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("mode");
    if (value === "voice" || value === "text") setMode(value);
  }, []);
  return mode;
}

export function IntakeFlowPage() {
  const router = useRouter();
  const { draft, loaded, language, updateDraft } = useCase();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "offline">("idle");
  const caseIdRef = useRef<string | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const entryMode = useEntryMode();
  const question = intakeQuestions[questionIndex];

  const speech = useSpeechRecognition(language, (transcript) => {
    setAnswer(transcript);
  });

  // Create or resume the backend case once local state is hydrated.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    ensureCase((draft ?? { language: "en" }).language as Language)
      .then((id) => {
        if (!cancelled) caseIdRef.current = id;
      })
      .catch(() => {
        if (!cancelled) setSyncState("offline");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !draft) return;
    setAnswer(getDraftDisplayValue(draft, intakeQuestions[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!draft) return;
    setAnswer(getDraftDisplayValue(draft, question));
    setConfirming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, questionIndex]);

  useEffect(() => {
    if (entryMode === "text") {
      answerInputRef.current?.focus();
    }
  }, [entryMode, questionIndex]);

  const saveCurrentAnswer = (confirmed: boolean) => {
    const base = draft ?? { language: "en", confirmedFields: [] };
    const confirmedFields = confirmed
      ? Array.from(new Set([...base.confirmedFields, question.id]))
      : base.confirmedFields;
    const nextDraft = updateDraft({
      ...parseIntakeAnswer(question, answer),
      confirmedFields
    });

    // Persist the fact on the backend case. Failure never blocks the flow —
    // answers stay in the local draft and are re-synced before evaluation.
    if (question.canonicalName && caseIdRef.current) {
      const value = canonicalValue(question, nextDraft);
      if (value !== undefined) {
        setSyncState("saving");
        saveIntakeAnswer(caseIdRef.current, question.canonicalName, value, true)
          .then(() => setSyncState("idle"))
          .catch(() => setSyncState("offline"));
      }
    }

    if (questionIndex >= intakeQuestions.length - 1) {
      router.push("/coverage/results");
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex + 1);
  };

  const voiceState: VoiceState =
    speech.status === "listening"
      ? "listening"
      : speech.status === "transcribing"
        ? "processing"
        : speech.status === "failed"
          ? "error"
          : "idle";

  const voiceHelper =
    speech.status === "unsupported"
      ? t(
          language,
          "Voice isn’t supported in this browser — you can type your answer instead.",
          "Este navegador no admite voz — puede escribir su respuesta."
        )
      : speech.status === "failed"
        ? t(
            language,
            "We couldn’t hear that. Try again, or type your answer.",
            "No pudimos escucharlo. Intente de nuevo o escriba su respuesta."
          )
        : t(
            language,
            "Speak your answer, then review and edit it before continuing.",
            "Diga su respuesta, luego revísela y edítela antes de continuar."
          );

  if (!loaded) {
    return <PageIntro title={t(language, "Loading your intake", "Cargando su información")} />;
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-10">
      <div className="space-y-6">
        {syncState === "offline" ? (
          <div
            role="status"
            className="rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"
          >
            {t(
              language,
              "Your answers are saved in this browser. Syncing with the CareBridge service is unavailable right now — we’ll retry when you see your likely pathway.",
              "Sus respuestas se guardan en este navegador. La sincronización con CareBridge no está disponible ahora — lo intentaremos de nuevo al mostrar su vía probable."
            )}
          </div>
        ) : null}
        <QuestionCard
          title={t(language, question.title, question.titleEs)}
          disclosure={t(language, question.disclosure, question.disclosureEs)}
        >
          {question.kind === "options" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options?.map((option) => (
                <OptionChip
                  key={option}
                  selected={answer === option}
                  onClick={() => setAnswer(option)}
                >
                  {optionLabel(language, option)}
                </OptionChip>
              ))}
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-extrabold text-navy">
                {t(language, "Your answer", "Su respuesta")}
              </span>
              <input
                ref={answerInputRef}
                value={answer}
                inputMode={question.kind === "number" ? "numeric" : "text"}
                onChange={(event) => setAnswer(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-4 text-base text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
              />
            </label>
          )}

          {confirming ? (
            <div className="mt-6 rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-4">
              <p className="text-base font-extrabold text-navy">
                {t(language, "You said", "Usted dijo")}: {answer}.{" "}
                {t(language, "Is that correct?", "¿Es correcto?")}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton onClick={() => saveCurrentAnswer(true)}>
                  {t(language, "Yes, that’s correct", "Sí, es correcto")}
                </PrimaryButton>
                <SecondaryButton onClick={() => setConfirming(false)}>
                  {t(language, "Edit answer", "Editar respuesta")}
                </SecondaryButton>
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SecondaryButton
              onClick={() => setQuestionIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
            >
              {t(language, "Back", "Atrás")}
            </SecondaryButton>
            <PrimaryButton
              disabled={!answer}
              onClick={() => {
                if (question.sensitive) {
                  setConfirming(true);
                  return;
                }

                saveCurrentAnswer(false);
              }}
            >
              {questionIndex === intakeQuestions.length - 1
                ? t(language, "See likely path", "Ver vía probable")
                : t(language, "Continue", "Continuar")}
            </PrimaryButton>
          </div>
        </QuestionCard>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card">
          <VoiceOrb state={voiceState} />
          <button
            type="button"
            onClick={() => (speech.status === "listening" ? speech.stop() : speech.start())}
            disabled={speech.status === "unsupported"}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primaryFill px-4 text-base font-extrabold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {speech.status === "listening"
              ? t(language, "Stop listening", "Dejar de escuchar")
              : t(language, "Answer with voice", "Responder con voz")}
          </button>
        </div>
        <VoiceTranscript
          transcript={speech.status === "listening" || speech.status === "transcribing" ? speech.interim : answer}
          onChange={setAnswer}
          helper={voiceHelper}
        />
      </aside>
    </section>
  );
}

/* -------------------------------- results -------------------------------- */

export function ResultsPage() {
  const { draft, loaded, language } = useCase();
  const [preview, setPreview] = useState<PathwayPreview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loaded || !draft) return;
    if (!draft.zip && !draft.householdSize) return;
    let cancelled = false;
    setError(null);
    setPreview(null);
    (async () => {
      const caseId = await ensureCase(draft.language);
      // Idempotent re-sync: guarantees the engine sees every local answer,
      // including any that failed to save while the backend was unreachable.
      await syncDraftFacts(caseId, draft);
      const result = await evaluateEligibility(caseId);
      if (!cancelled) setPreview(pathwayToPreview(result));
    })().catch((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, attempt]);

  if (!loaded) {
    return <PageIntro title={t(language, "Loading your pathway preview", "Cargando su vista previa")} />;
  }

  if (!draft || (!draft.zip && !draft.householdSize)) {
    return (
      <PageIntro
        eyebrow="Coverage"
        title="Start with a short intake"
        text="CareGuide needs a few details before it can prepare a likely pathway preview."
      >
        <PrimaryButton href="/coverage/intake">Start intake</PrimaryButton>
      </PageIntro>
    );
  }

  if (error) {
    return (
      <>
        <PageIntro
          eyebrow="Likely pathway"
          title="Your likely coverage path"
          text="CareGuide uses careful language because the state or county makes the official eligibility decision."
        />
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-8 lg:px-10">
          <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
        </section>
      </>
    );
  }

  if (!preview) {
    return <PageIntro title={t(language, "Preparing your pathway preview…", "Preparando su vista previa…")} />;
  }

  return (
    <>
      <PageIntro
        eyebrow="Likely pathway"
        title="Your likely coverage path"
        text="CareGuide uses careful language because the state or county makes the official eligibility decision."
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-10">
        <div className="space-y-6">
          <PathwayCard preview={preview} />
          <div className="grid gap-4 md:grid-cols-2">
            <InfoPanel title="Why this may fit" items={preview.reasons} />
            <InfoPanel title="What we still need" items={preview.missingInformation} />
            <InfoPanel title="What happens next" items={[preview.nextStep]} />
            <SourceDisclosure>
              The state or county makes the official eligibility decision. This is a pathway
              preview, not a final decision.
            </SourceDisclosure>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href="/coverage/documents">Continue to documents</PrimaryButton>
            <SecondaryButton href="/coverage/help">Talk to a counselor</SecondaryButton>
          </div>
        </div>
        <aside className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card">
          <h2 className="text-xl font-extrabold text-navy">Review flags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.reviewFlags.length ? (
              preview.reviewFlags.map((flag) => <ReviewFlag key={flag}>{flag}</ReviewFlag>)
            ) : (
              <p className="text-sm font-semibold text-slatecare">
                No review flags from the rule engine yet.
              </p>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-[0_10px_28px_rgba(16,32,79,0.06)]">
      <h2 className="text-xl font-extrabold text-navy">{title}</h2>
      <ul className="mt-4 space-y-3 text-base leading-7 text-slatecare">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>Nothing yet.</li>}
      </ul>
    </section>
  );
}

/* ------------------------------- documents ------------------------------- */

export function DocumentsPage() {
  const { draft, loaded, updateDraft } = useCase();
  const [checklist, setChecklist] = useState<DocumentChecklistEntry[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setError(null);
    (async () => {
      const caseId = await ensureCase(draft?.language ?? "en");
      if (draft) await syncDraftFacts(caseId, draft);
      const entries = await getDocumentChecklist(caseId, draft);
      if (!cancelled) setChecklist(entries);
    })().catch((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, attempt, draft?.docStatus]);

  const attest = (id: string, status: "have" | "need_help") => {
    updateDraft({ docStatus: { ...(draft?.docStatus ?? {}), [id]: status } });
  };

  const helpCount = Object.values(draft?.docStatus ?? {}).filter((s) => s === "need_help").length;

  return (
    <>
      <PageIntro
        eyebrow="Documents"
        title="Let’s prepare your documents"
        text="This checklist comes from the forms your answers triggered. Marking an item only records your note — nothing is uploaded or sent."
      />
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-8 lg:px-10">
        {error ? (
          <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : checklist === null ? (
          <p className="rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-5 text-base font-semibold text-navy">
            Preparing your document checklist…
          </p>
        ) : (
          checklist.map((item) => (
            <DocumentChecklistItem
              key={item.id}
              item={item}
              added={draft?.docStatus?.[item.id] === "have"}
              onAdd={() => attest(item.id, "have")}
              onNeedHelp={() => attest(item.id, "need_help")}
            />
          ))
        )}
        {helpCount > 0 ? (
          <SourceDisclosure>
            You marked {helpCount} item{helpCount === 1 ? "" : "s"} for help. CareGuide can
            prepare questions for a counselor, but it will not contact anyone automatically.
          </SourceDisclosure>
        ) : null}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <PrimaryButton href="/coverage/application">Continue to application</PrimaryButton>
          <SecondaryButton href="/dashboard">Save and return later</SecondaryButton>
        </div>
      </section>
    </>
  );
}

/* ------------------------------ application ------------------------------ */

/** Coerce a typed answer back to the canonical value shape the backend stores. */
function coerceFieldValue(canonicalName: string, raw: string): unknown {
  if (canonicalName === "household.size" || canonicalName === "income.estimate") {
    const numeric = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : raw;
  }
  if (canonicalName.startsWith("insurance.")) {
    const lowered = raw.trim().toLowerCase();
    if (["yes", "true", "sí", "si"].includes(lowered)) return true;
    if (["no", "false"].includes(lowered)) return false;
  }
  return raw;
}

export function ApplicationPage() {
  const router = useRouter();
  const { draft, loaded, language } = useCase();
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [formId, setFormId] = useState(PRIMARY_FORM_ID);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [voiceSuggestion, setVoiceSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saveError, setSaveError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const caseIdRef = useRef<string | null>(null);

  const speech = useSpeechRecognition(language, (transcript) => {
    setVoiceSuggestion(transcript);
  });

  useEffect(() => {
    if (!loaded) return;
    if (!draft?.zip) {
      router.replace("/coverage/intake");
      return;
    }
    let cancelled = false;
    setError(null);
    (async () => {
      const caseId = await ensureCase(draft.language);
      caseIdRef.current = caseId;
      await syncDraftFacts(caseId, draft);
      const forms = await routeForms(caseId);
      const primary =
        forms.find((form) => form.form_id === PRIMARY_FORM_ID)?.form_id ??
        forms[0]?.form_id ??
        PRIMARY_FORM_ID;
      const mappedFields = await getFormFields(caseId, primary);
      if (cancelled) return;
      setFormId(primary);
      setFields(mappedFields);
      setAnswer(mappedFields[0]?.value === null ? "" : String(mappedFields[0]?.value ?? ""));
    })().catch((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, attempt]);

  const currentField = fields[fieldIndex];
  const currentSection = formSections[Math.min(fieldIndex, formSections.length - 1)];

  useEffect(() => {
    if (!currentField) {
      return;
    }

    setAnswer(currentField.value === null ? "" : String(currentField.value));
    setVoiceSuggestion(null);
  }, [currentField]);

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-8 lg:px-10">
        <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
      </section>
    );
  }

  if (!loaded || !currentField) {
    return <PageIntro title="Preparing your form workspace" />;
  }

  const updateCurrentField = (value: string) => {
    setFields((currentFields) =>
      currentFields.map((field, index) =>
        index === fieldIndex
          ? {
              ...field,
              value,
              sourceType: "user",
              needsReview: false,
              explanation: `${field.explanation} You reviewed this answer in CareGuide.`
            }
          : field
      )
    );
    // Persist the reviewed value as a confirmed fact on the case.
    if (caseIdRef.current) {
      setSaveError(false);
      saveIntakeAnswer(
        caseIdRef.current,
        currentField.id,
        coerceFieldValue(currentField.id, value),
        true
      ).catch(() => setSaveError(true));
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-10">
      <SidebarProgress
        currentSection={currentSection}
        sections={formSections}
        completedCount={fieldIndex}
      />

      <div className="space-y-5">
        <div className="rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-4 text-sm font-bold text-slatecare">
          Coverage application ({formId}) / {currentSection}
        </div>

        {saveError ? (
          <div
            role="status"
            className="rounded-[18px] border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"
          >
            This answer is saved in your browser, but syncing to the CareBridge service failed.
            It will retry when the packet is verified.
          </div>
        ) : null}

        <FormQuestion field={currentField}>
          {currentField.id === "location.zip" ? (
            <AddressAutocomplete
              label="Your address"
              defaultValue={answer}
              onSelect={(selected) => {
                const value = selected.zip ?? "";
                setAnswer(value);
                updateCurrentField(value);
              }}
            />
          ) : (
            <label className="block">
              <span className="text-sm font-extrabold text-navy">Answer</span>
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-4 text-base text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
              />
            </label>
          )}

          {voiceSuggestion ? (
            <div className="mt-5 rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-4">
              <p className="text-base font-extrabold text-navy">
                You said: {voiceSuggestion}. Use this answer?
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton
                  onClick={() => {
                    setAnswer(voiceSuggestion);
                    updateCurrentField(voiceSuggestion);
                    setVoiceSuggestion(null);
                  }}
                >
                  Use this answer
                </PrimaryButton>
                <SecondaryButton onClick={() => setVoiceSuggestion(null)}>Edit</SecondaryButton>
              </div>
            </div>
          ) : null}
        </FormQuestion>

        <section className="rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-5">
          <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
            <VoiceOrb
              state={
                speech.status === "listening"
                  ? "listening"
                  : speech.status === "transcribing" || voiceSuggestion
                    ? "processing"
                    : speech.status === "failed"
                      ? "error"
                      : "idle"
              }
            />
            <div>
              <h2 className="text-xl font-extrabold text-navy">Voice help for this question</h2>
              <p className="mt-2 text-base leading-7 text-slatecare">
                {speech.status === "unsupported"
                  ? "Voice isn’t supported in this browser — you can type the answer instead."
                  : "CareGuide can listen to an answer and suggest a value. It will not overwrite a confirmed value or submit a form."}
              </p>
              <button
                type="button"
                onClick={() => (speech.status === "listening" ? speech.stop() : speech.start())}
                disabled={speech.status === "unsupported"}
                className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-white px-4 text-base font-extrabold text-primaryDark transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                {speech.status === "listening" ? "Stop listening" : "Listen for answer"}
              </button>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <SecondaryButton
            onClick={() => setFieldIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
          >
            Back
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              updateCurrentField(answer);
              if (fieldIndex >= fields.length - 1) {
                router.push("/coverage/review");
                return;
              }

              setFieldIndex((currentIndex) => currentIndex + 1);
            }}
          >
            {fieldIndex >= fields.length - 1 ? "Review packet" : "Next"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- review -------------------------------- */

export function ReviewPage() {
  const { draft, loaded } = useCase();
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [blockingFlags, setBlockingFlags] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [reviewedByUser, setReviewedByUser] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const caseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setError(null);
    setStatus("loading");
    (async () => {
      const caseId = await ensureCase(draft?.language ?? "en");
      caseIdRef.current = caseId;
      if (draft) await syncDraftFacts(caseId, draft);
      const forms = await routeForms(caseId);
      const primary =
        forms.find((form) => form.form_id === PRIMARY_FORM_ID)?.form_id ??
        forms[0]?.form_id ??
        PRIMARY_FORM_ID;
      const [mappedFields, verification] = await Promise.all([
        getFormFields(caseId, primary),
        verifyPacket(caseId, primary)
      ]);
      if (cancelled) return;
      setFields(mappedFields);
      setBlockingFlags(verification.blocking_flags);
      setWarnings(verification.warnings);
      setReady(verification.ready_for_handoff);
      setStatus("done");
    })().catch((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, attempt]);

  const downloadPacket = async () => {
    if (!caseIdRef.current || !reviewedByUser) return;
    setExporting(true);
    setExportError(null);
    try {
      const packet = await exportPacket(caseIdRef.current);
      // The backend serves the packet as printable HTML; open that directly.
      window.open(handoffPacketHtmlUrl(packet.packet_id), "_blank", "noopener");
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  };

  if (!loaded || (status === "loading" && !error)) {
    return <PageIntro title="Preparing your review" />;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-8 lg:px-10">
        <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
      </section>
    );
  }

  const attentionCount = blockingFlags.length + warnings.length;

  return (
    <>
      <PageIntro
        eyebrow="Review"
        title="Review your information"
        text="This page prepares a review packet. It does not submit an application."
      >
        <div className="rounded-[18px] border border-[#B9C9F8] bg-[#EAF0FF] p-5">
          <p className="text-2xl font-extrabold text-navy">
            Application packet:{" "}
            {ready
              ? "Ready for review"
              : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`}
          </p>
          {blockingFlags.length || warnings.length ? (
            <ul className="mt-3 space-y-1 text-sm font-semibold leading-6 text-slatecare">
              {blockingFlags.map((flag) => (
                <li key={flag}>Blocking: {flag}</li>
              ))}
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white shadow-card">
          <div className="grid grid-cols-1 border-b border-[rgba(16,32,79,0.08)] bg-[#F4EEE5] px-5 py-3 text-sm font-extrabold text-navy md:grid-cols-4">
            <span>Section</span>
            <span>Answer</span>
            <span>Source</span>
            <span>Status</span>
          </div>
          {fields.map((field) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 border-b border-[rgba(16,32,79,0.08)] px-5 py-4 text-base md:grid-cols-4"
            >
              <span className="font-extrabold text-navy">{field.plainLanguageLabel}</span>
              <span className="text-slatecare">{field.value === null ? "Missing" : String(field.value)}</span>
              <span className="text-slatecare">
                {field.sourceType.replace("_", " ")}
                {typeof field.confidence === "number" ? ` · ${Math.round(field.confidence * 100)}%` : ""}
              </span>
              <span className="font-extrabold text-primaryDark">
                {field.needsReview ? "Needs review" : "Reviewed"}
              </span>
            </div>
          ))}
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-4 text-base leading-7 text-navy">
          <input
            type="checkbox"
            checked={reviewedByUser}
            onChange={(event) => setReviewedByUser(event.target.checked)}
            className="mt-1.5 h-5 w-5 accent-[#3F6FF2]"
          />
          <span className="font-bold">
            I reviewed this information. CareGuide prepares a packet for a counselor — it does not
            submit an application.
          </span>
        </label>

        {exportError ? (
          <div className="mt-4">
            <ErrorNotice error={exportError} onRetry={() => void downloadPacket()} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <SecondaryButton href="/coverage/application">Fix missing items</SecondaryButton>
          <PrimaryButton href="/coverage/help">Continue to local help</PrimaryButton>
          <SecondaryButton onClick={() => void downloadPacket()}>
            {exporting
              ? "Preparing packet…"
              : reviewedByUser
                ? "Download review summary"
                : "Review to enable download"}
          </SecondaryButton>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------- help --------------------------------- */

type ResourceStatus = "idle" | "loading" | "empty" | "error" | "success";

export function HelpPage() {
  const router = useRouter();
  const { draft, language } = useCase();
  const geocode = useGeocoder();
  const [zip, setZip] = useState("");
  const [resources, setResources] = useState<ResourceSearchResult[]>([]);
  const [resourceStatus, setResourceStatus] = useState<ResourceStatus>("idle");
  const [resourceError, setResourceError] = useState<unknown>(null);
  const [activePanel, setActivePanel] = useState<"phones" | "script" | null>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const zipInitialized = useRef(false);

  useEffect(() => {
    if (draft?.zip && !zipInitialized.current) {
      zipInitialized.current = true;
      setZip(draft.zip);
    }
  }, [draft]);

  const runSearch = useCallback(
    async (targetZip: string, signal?: AbortSignal) => {
      if (!targetZip.trim()) {
        setResources([]);
        setResourceStatus("idle");
        return;
      }
      setResourceStatus("loading");
      setResourceError(null);
      try {
        // The backend needs coordinates; geocode the ZIP in the browser when
        // the Maps key is available. Without it, the ZIP-only call returns an
        // honest empty result rather than fabricated entries.
        const geo = geocode ? await geocode(targetZip) : null;
        const list = await searchNearbyResources(
          {
            zip: targetZip,
            lat: geo?.lat,
            lng: geo?.lng,
            language
          },
          signal
        );
        setResources(list);
        setResourceStatus(list.length === 0 ? "empty" : "success");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResourceError(err);
        setResourceStatus("error");
      }
    },
    [geocode, language]
  );

  // Debounced live search as the ZIP changes.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void runSearch(zip, controller.signal), 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [zip, runSearch]);

  const phonesAvailable = resources.filter((resource) => resource.phone);

  const callScript = buildCallScript(draft, language);

  const chipActions: Array<{ label: string; onClick: () => void; pressed?: boolean }> = [
    {
      label: "Show phone numbers",
      onClick: () => setActivePanel((p) => (p === "phones" ? null : "phones")),
      pressed: activePanel === "phones"
    },
    {
      label: "Prepare a call script",
      onClick: () => setActivePanel((p) => (p === "script" ? null : "script")),
      pressed: activePanel === "script"
    },
    {
      label: "Connect me to a counselor",
      onClick: () => {
        setActivePanel("phones");
        resourcesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    {
      label: "Share my reviewed summary",
      onClick: () => router.push("/coverage/review")
    }
  ];

  return (
    <>
      <PageIntro
        eyebrow="Human help"
        title="Find trusted help nearby"
        text="CareGuide does not call, book, or contact anyone automatically. You choose each next action."
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-10">
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card sm:p-7">
            <h2 className="text-2xl font-extrabold text-navy">Enrollment help</h2>
            <p className="mt-2 text-base leading-7 text-slatecare">
              Verified results come from official public sources through the CareBridge backend.
            </p>
            <label className="mt-5 block">
              <span className="text-sm font-extrabold text-navy">ZIP code</span>
              <input
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                inputMode="numeric"
                className="mt-2 min-h-12 w-full rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-4 text-base text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
              />
            </label>
            <div className="mt-4">
              <NearbyResourcesMap zip={zip} />
            </div>
          </section>

          <section className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-card sm:p-7">
            <h2 className="text-2xl font-extrabold text-navy">Care while coverage is pending</h2>
            <p className="mt-2 text-base leading-7 text-slatecare">
              CareGuide can prepare a handoff summary for you to review and share.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {chipActions.map((action) => (
                <OptionChip key={action.label} selected={action.pressed} onClick={action.onClick}>
                  {action.label}
                </OptionChip>
              ))}
            </div>

            {activePanel === "phones" ? (
              <div className="mt-5 rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-[#F9FAFF] p-4">
                <h3 className="text-base font-extrabold text-navy">Phone numbers from verified results</h3>
                {phonesAvailable.length ? (
                  <ul className="mt-3 space-y-2 text-base leading-7 text-slatecare">
                    {phonesAvailable.map((resource) => (
                      <li key={`${resource.name}-${resource.phone}`}>
                        <span className="font-bold text-navy">{resource.name}</span>:{" "}
                        <a
                          href={`tel:${resource.phone}`}
                          className="font-bold text-primaryDark underline-offset-4 hover:underline"
                        >
                          {resource.phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm font-semibold leading-6 text-slatecare">
                    {resourceStatus === "success" || resourceStatus === "empty"
                      ? "None of the verified results for this ZIP include a phone number. Try the source links on each card."
                      : "Search a ZIP code first — phone numbers come only from verified results."}
                  </p>
                )}
              </div>
            ) : null}

            {activePanel === "script" ? (
              <div className="mt-5 rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-[#F9FAFF] p-4">
                <h3 className="text-base font-extrabold text-navy">Call script from your answers</h3>
                <p className="mt-3 whitespace-pre-line text-base leading-7 text-slatecare">
                  {callScript}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4" ref={resourcesRef}>
          <h3 className="text-lg font-extrabold text-navy">Verified official sources</h3>
          <OfficialResourcesList
            zip={zip}
            status={resourceStatus}
            resources={resources}
            error={resourceError}
            onRetry={() => void runSearch(zip)}
          />
          <SourceDisclosure>
            Verified results come from HRSA and DataSF (official public sources) through the
            CareBridge backend. The map above adds supplemental Google Places markers for public
            offices and hospitals. Always confirm hours and services before visiting.
          </SourceDisclosure>
        </aside>
      </section>
    </>
  );
}

/** Built only from the user's own answers — no invented details. */
function buildCallScript(draft: CaseDraft | null, language: Language): string {
  const lines: string[] = [];
  if (language === "es") {
    lines.push("Hola, llamo porque necesito ayuda para solicitar cobertura de salud.");
    if (draft?.zip) lines.push(`Vivo en el código postal ${draft.zip}.`);
    if (draft?.householdSize) lines.push(`Somos ${draft.householdSize} personas en mi hogar.`);
    if (draft?.recentCoverageLoss) lines.push("Perdí mi cobertura recientemente.");
    lines.push("¿Puede ayudarme a entender mis opciones y qué documentos necesito?");
  } else {
    lines.push("Hi, I'm calling because I need help applying for health coverage.");
    if (draft?.zip) lines.push(`I live in ZIP code ${draft.zip}.`);
    if (draft?.householdSize) lines.push(`There are ${draft.householdSize} people in my household.`);
    if (draft?.recentCoverageLoss) lines.push("I recently lost my coverage.");
    lines.push("Can you help me understand my options and which documents I need?");
  }
  return lines.join("\n");
}

/* -------------------------------- dashboard ------------------------------ */

const PATHWAY_SHORT_LABELS: Record<string, string> = {
  medi_cal_likely: "Medi-Cal (likely)",
  covered_ca_likely: "Covered California (likely)",
  mixed_household: "Needs counselor review",
  human_review: "Needs counselor review"
};

export function DashboardPage() {
  const { draft, loaded, caseId } = useCase();
  const [detail, setDetail] = useState<{
    pathway: string | null;
    intakeComplete: boolean | null;
    nextAction: string | null;
    userReviewed: boolean;
    status: string;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loaded || !caseId) return;
    let cancelled = false;
    setError(null);
    getCase(caseId)
      .then((caseDetail) => {
        if (cancelled) return;
        setDetail({
          pathway: caseDetail.latest_pathway_result?.pathway ?? null,
          intakeComplete: caseDetail.progress_summary?.intake_complete ?? null,
          nextAction: caseDetail.progress_summary?.next_action ?? null,
          userReviewed: caseDetail.user_reviewed ?? false,
          status: caseDetail.status
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, caseId, attempt]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <PageIntro title="Loading your plan" />
      </div>
    );
  }

  const hasAnyCase = Boolean(caseId || draft?.zip || draft?.householdSize);

  if (!hasAnyCase) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <PageIntro
          eyebrow="Saved plan"
          title="No saved case yet"
          text="Your case stays in this browser. Start a short intake and CareGuide will keep your progress here."
        >
          <PrimaryButton href="/coverage/intake">Start a new case</PrimaryButton>
        </PageIntro>
      </div>
    );
  }

  const intakeCompleteLocal = Boolean(draft?.zip && draft?.householdSize);
  const intakeComplete = detail?.intakeComplete ?? intakeCompleteLocal;
  const pathwayValue = detail?.pathway
    ? PATHWAY_SHORT_LABELS[detail.pathway] ?? detail.pathway
    : "Not evaluated yet";
  const docsMarkedReady = Object.values(draft?.docStatus ?? {}).filter((s) => s === "have").length;
  const docsValue =
    docsMarkedReady > 0
      ? `${docsMarkedReady} marked ready`
      : draft?.docStatus && Object.keys(draft.docStatus).length
        ? "In progress"
        : "Not started";

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageIntro
        eyebrow="Saved plan"
        title="Your CareBridge plan"
        text="A calm place to return to your likely pathway, documents, application packet, and help options."
      />
      {error ? (
        <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-8 lg:px-10">
          <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
        </section>
      ) : null}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <DashboardStatus title="Likely pathway" value={pathwayValue} href="/coverage/results" />
        <DashboardStatus
          title="Application progress"
          value={intakeComplete ? "Ready for review" : "Intake not complete"}
          href={intakeComplete ? "/coverage/review" : "/coverage/intake"}
        />
        <DashboardStatus title="Missing documents" value={docsValue} href="/coverage/documents" />
        <DashboardStatus
          title="Counselor handoff"
          value={detail?.userReviewed ? "Packet reviewed" : "Not started"}
          href="/coverage/help"
        />
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-8 lg:px-10">
        <div className="rounded-[20px] border border-[rgba(16,32,79,0.10)] bg-white p-6 shadow-card">
          <h2 className="text-2xl font-extrabold text-navy">Next action</h2>
          <p className="mt-2 text-base leading-7 text-slatecare">
            {detail?.nextAction ??
              "Continue the guided flow or prepare a handoff summary for human review. CareGuide does not claim that anything has been filed or sent."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton
              href={
                detail
                  ? nextRouteForState(caseStateFromBackend(detail.status))
                  : intakeComplete
                    ? "/coverage/documents"
                    : "/coverage/intake"
              }
            >
              Continue plan
            </PrimaryButton>
            <SecondaryButton href="/coverage/help">Find help</SecondaryButton>
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardStatus({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="group rounded-[18px] border border-[rgba(16,32,79,0.10)] bg-white p-5 shadow-[0_10px_28px_rgba(16,32,79,0.06)] transition hover:-translate-y-0.5 hover:border-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-primaryDark">
        {title}
      </p>
      <p className="mt-4 text-2xl font-extrabold text-navy">{value}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primaryDark">
        Open
        <span className="transition group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}
