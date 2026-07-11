"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AppHeader,
  DocumentChecklistItem,
  FormQuestion,
  OptionChip,
  PageIntro,
  PathwayCard,
  PrimaryButton,
  QuestionCard,
  ResourceCard,
  ReviewFlag,
  SecondaryButton,
  SidebarProgress,
  SourceDisclosure,
  VoiceOrb,
  VoiceTranscript
} from "./FlowComponents";
import { careGuideApi } from "@/lib/coverage/api";
import {
  emptyCaseDraft,
  readCaseDraft,
  useCaseDraft,
  writeCaseDraft
} from "@/lib/coverage/storage";
import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  PathwayPreview,
  VoiceState
} from "@/lib/coverage/types";

type IntakeQuestion = {
  id: keyof Omit<CaseDraft, "confirmedFields">;
  title: string;
  disclosure: string;
  kind: "text" | "number" | "options";
  options?: string[];
  demoAnswer: string;
  sensitive?: boolean;
};

const intakeQuestions: IntakeQuestion[] = [
  {
    id: "language",
    title: "What language would you like to use?",
    disclosure: "Language helps us present the next steps clearly. You can change it later.",
    kind: "options",
    options: ["English", "Spanish"],
    demoAnswer: "English"
  },
  {
    id: "zip",
    title: "What ZIP code do you live in?",
    disclosure: "ZIP code helps identify the right coverage pathway and local support area.",
    kind: "text",
    demoAnswer: "95814",
    sensitive: true
  },
  {
    id: "coverageNeed",
    title: "Who needs health coverage?",
    disclosure: "This helps us understand whether the application is for you, family members, or both.",
    kind: "options",
    options: ["Just me", "Me and family", "A family member"],
    demoAnswer: "Me and family"
  },
  {
    id: "currentInsurance",
    title: "Do you currently have health insurance?",
    disclosure: "Current coverage can affect which steps should be reviewed next.",
    kind: "options",
    options: ["Yes", "No", "Not sure"],
    demoAnswer: "No"
  },
  {
    id: "recentCoverageLoss",
    title: "Did you recently lose coverage?",
    disclosure: "A recent coverage change may affect timing and next steps.",
    kind: "options",
    options: ["Yes", "No", "Not sure"],
    demoAnswer: "Yes"
  },
  {
    id: "householdSize",
    title: "How many people live in your household?",
    disclosure: "Household size is a sensitive field and must be confirmed before it is used.",
    kind: "number",
    demoAnswer: "3",
    sensitive: true
  },
  {
    id: "incomeEstimate",
    title: "What is your approximate household income?",
    disclosure: "Income is only used for a pathway preview. It must be reviewed before any official packet.",
    kind: "number",
    demoAnswer: "2100",
    sensitive: true
  },
  {
    id: "incomeFrequency",
    title: "How often do you receive that income?",
    disclosure: "Frequency helps CareGuide interpret the estimate in the right time period.",
    kind: "options",
    options: ["Weekly", "Every two weeks", "Monthly", "Yearly"],
    demoAnswer: "Monthly"
  },
  {
    id: "employerCoverageOffer",
    title: "Are you offered health insurance through an employer?",
    disclosure: "Employer coverage is an official application topic and must be confirmed.",
    kind: "options",
    options: ["Yes", "No", "Unknown"],
    demoAnswer: "Unknown",
    sensitive: true
  },
  {
    id: "needsCareNow",
    title: "Would you like help finding care while your coverage is being reviewed?",
    disclosure: "This does not contact anyone automatically. It only prepares options for you to review.",
    kind: "options",
    options: ["Yes", "No"],
    demoAnswer: "Yes"
  }
];

const documentChecklist: DocumentChecklistEntry[] = [
  {
    id: "income",
    title: "Proof of income",
    status: "Needed",
    explanation: "Recent pay stubs or income records may be requested during review."
  },
  {
    id: "employer",
    title: "Employer coverage information",
    status: "Needed",
    explanation: "If job-based coverage is available, those details should be reviewed."
  },
  {
    id: "identity",
    title: "Identification",
    status: "May be requested",
    explanation: "Identity documents may be needed before an official decision is made."
  },
  {
    id: "tax",
    title: "Tax household information",
    status: "Needed",
    explanation: "Household and tax filing details help prepare the application packet."
  },
  {
    id: "additional",
    title: "Additional document if needed",
    status: "Need help",
    explanation: "A counselor can review whether anything else is needed."
  }
];

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

function useWordReveal(text: string, enabled: boolean, onDone: () => void) {
  const [revealed, setRevealed] = useState("");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const words = text.split(" ");
    let index = 0;
    setRevealed("");

    const timer = window.setInterval(() => {
      index += 1;
      setRevealed(words.slice(0, index).join(" "));

      if (index >= words.length) {
        window.clearInterval(timer);
        window.setTimeout(onDone, 420);
      }
    }, 260);

    return () => window.clearInterval(timer);
  }, [enabled, onDone, text]);

  return revealed;
}

export function IntakeFlowPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CaseDraft>(emptyCaseDraft);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceActive, setVoiceActive] = useState(false);
  const question = intakeQuestions[questionIndex];
  const handleVoiceDone = useCallback(() => {
    setAnswer(question.demoAnswer);
    setVoiceActive(false);
    setVoiceState("processing");
    window.setTimeout(() => setVoiceState("idle"), 650);
  }, [question.demoAnswer]);
  const transcript = useWordReveal(question.demoAnswer, voiceActive, handleVoiceDone);

  useEffect(() => {
    const storedDraft = readCaseDraft() ?? emptyCaseDraft;
    setDraft(storedDraft);
    setAnswer(getDraftDisplayValue(storedDraft, intakeQuestions[0]));
  }, []);

  useEffect(() => {
    setAnswer(getDraftDisplayValue(draft, question));
    setConfirming(false);
    setVoiceState("idle");
    setVoiceActive(false);
  }, [draft, question, questionIndex]);

  const saveCurrentAnswer = (confirmed: boolean) => {
    const confirmedFields = confirmed
      ? Array.from(new Set([...draft.confirmedFields, question.id]))
      : draft.confirmedFields;
    const nextDraft = {
      ...draft,
      ...parseIntakeAnswer(question, answer),
      confirmedFields
    };

    writeCaseDraft(nextDraft);
    setDraft(nextDraft);

    if (questionIndex >= intakeQuestions.length - 1) {
      router.push("/coverage/results");
      return;
    }

    setQuestionIndex((currentIndex) => currentIndex + 1);
  };

  const startVoice = () => {
    setVoiceState("listening");
    setVoiceActive(true);
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-16">
      <div className="space-y-8">
        <QuestionCard title={question.title} disclosure={question.disclosure}>
          {question.kind === "options" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options?.map((option) => (
                <OptionChip
                  key={option}
                  selected={answer === option}
                  onClick={() => setAnswer(option)}
                >
                  {option}
                </OptionChip>
              ))}
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold text-navy">Your answer</span>
              <input
                value={answer}
                inputMode={question.kind === "number" ? "numeric" : "text"}
                onChange={(event) => setAnswer(event.target.value)}
                className="careguide-field mt-2"
              />
            </label>
          )}

          {confirming ? (
            <div className="mt-6 rounded-lg border border-[#D9E3F8] bg-skysoft p-4">
              <p className="text-base font-semibold text-navy">
                You said: {answer}. Is that correct?
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton onClick={() => saveCurrentAnswer(true)}>
                  Yes, that’s correct
                </PrimaryButton>
                <SecondaryButton onClick={() => setConfirming(false)}>Edit answer</SecondaryButton>
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SecondaryButton
              onClick={() => setQuestionIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
            >
              Back
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
              {questionIndex === intakeQuestions.length - 1 ? "See likely path" : "Continue"}
            </PrimaryButton>
          </div>
        </QuestionCard>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg bg-bgsoft p-5">
          <VoiceOrb state={voiceState} />
          <button
            type="button"
            onClick={startVoice}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primaryFill px-4 text-base font-semibold text-white transition hover:bg-primaryDark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Answer with voice
          </button>
        </div>
        <VoiceTranscript
          transcript={voiceActive ? transcript : answer}
          onChange={setAnswer}
          helper="This is a frontend demo transcript. You can edit it before continuing."
        />
      </aside>
    </section>
  );
}

export function ResultsPage() {
  const { draft, loaded } = useCaseDraft();
  const [preview, setPreview] = useState<PathwayPreview | null>(null);

  useEffect(() => {
    if (!loaded || !draft) {
      return;
    }

    careGuideApi.evaluatePathway(draft).then(setPreview);
  }, [draft, loaded]);

  if (!loaded) {
    return <PageIntro title="Loading your pathway preview" />;
  }

  if (!draft || !preview) {
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

  return (
    <>
      <PageIntro
        eyebrow="Likely pathway"
        title="Your likely coverage path"
        text="CareGuide uses careful language because the state or county makes the official eligibility decision."
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-16">
        <div className="space-y-8">
          <PathwayCard preview={preview} />
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            <InfoPanel title="Why this may fit" items={preview.reasons} />
            <InfoPanel title="What we still need" items={preview.missingInformation} />
            <InfoPanel title="What happens next" items={[preview.nextStep]} />
            <SourceDisclosure>
              The state or county makes the official eligibility decision. This is a demo pathway
              preview, not a final decision.
            </SourceDisclosure>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href="/coverage/documents">Continue to documents</PrimaryButton>
            <SecondaryButton href="/coverage/help">Talk to a counselor</SecondaryButton>
          </div>
        </div>
        <aside className="rounded-lg bg-bgsoft p-5">
          <h2 className="text-xl font-semibold text-navy">Review flags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.reviewFlags.map((flag) => (
              <ReviewFlag key={flag}>{flag}</ReviewFlag>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-navy">{title}</h2>
      <ul className="mt-4 space-y-3 text-base leading-7 text-slatecare">
        {items.map((item) => (
          <li key={item} className="border-l-2 border-[#D9E3F8] pl-4">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentsPage() {
  const [addedDocuments, setAddedDocuments] = useState<string[]>([]);
  const [helpItems, setHelpItems] = useState<string[]>([]);

  return (
    <>
      <PageIntro
        eyebrow="Documents"
        title="Let’s prepare your documents"
        text="This checklist is frontend mock state only. Files are not uploaded to a server yet."
      />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-10 lg:px-16">
        <div className="careguide-soft-card px-5 py-2 sm:px-7">
          {documentChecklist.map((item) => (
            <DocumentChecklistItem
              key={item.id}
              item={item}
              added={addedDocuments.includes(item.id)}
              onAdd={() =>
                setAddedDocuments((current) => Array.from(new Set([...current, item.id])))
              }
              onNeedHelp={() =>
                setHelpItems((current) => Array.from(new Set([...current, item.id])))
              }
            />
          ))}
        </div>
        {helpItems.length > 0 ? (
          <div className="mt-5">
            <SourceDisclosure>
              You marked {helpItems.length} item{helpItems.length === 1 ? "" : "s"} for help.
              CareGuide can prepare questions for a counselor, but it will not contact anyone
              automatically.
            </SourceDisclosure>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <PrimaryButton href="/coverage/application">Continue to application</PrimaryButton>
          <SecondaryButton href="/dashboard">Save and return later</SecondaryButton>
        </div>
      </section>
    </>
  );
}

export function ApplicationPage() {
  const router = useRouter();
  const { draft, loaded } = useCaseDraft();
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [voiceSuggestion, setVoiceSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (!draft?.zip) {
      router.replace("/coverage/intake");
      return;
    }

    careGuideApi.mapFormFields(draft).then((mappedFields) => {
      setFields(mappedFields);
      setAnswer(mappedFields[0]?.value === null ? "" : String(mappedFields[0]?.value ?? ""));
    });
  }, [draft, loaded, router]);

  const currentField = fields[fieldIndex];
  const currentSection = formSections[Math.min(fieldIndex, formSections.length - 1)];

  useEffect(() => {
    if (!currentField) {
      return;
    }

    setAnswer(currentField.value === null ? "" : String(currentField.value));
    setVoiceSuggestion(null);
  }, [currentField]);

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
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-16">
      <SidebarProgress
        currentSection={currentSection}
        sections={formSections}
        completedCount={fieldIndex}
      />

      <div className="space-y-6">
        <div className="rounded-md bg-bgsoft p-4 text-sm font-medium text-slatecare">
          Coverage application / {currentSection}
        </div>

        <FormQuestion field={currentField}>
          <label className="block">
            <span className="text-sm font-semibold text-navy">Answer</span>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="careguide-field mt-2"
            />
          </label>

          {voiceSuggestion ? (
            <div className="mt-5 rounded-lg border border-[#D9E3F8] bg-skysoft p-4">
              <p className="text-base font-semibold text-navy">
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

        <section className="rounded-lg border border-[#D9E3F8] bg-skysoft p-5">
          <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
            <VoiceOrb state={voiceSuggestion ? "processing" : "idle"} />
            <div>
              <h2 className="text-xl font-semibold text-navy">Voice help for this question</h2>
              <p className="mt-2 text-base leading-7 text-slatecare">
                CareGuide can read the question, listen to an answer, and suggest a value. It will
                not overwrite a confirmed value or submit a form.
              </p>
              <button
                type="button"
                onClick={() =>
                  setVoiceSuggestion(
                    currentField.id === "incomeEstimate" ? "$2,100 per month" : String(answer || "Not sure")
                  )
                }
                className="mt-4 inline-flex min-h-12 items-center rounded-md bg-white px-4 text-base font-semibold text-primaryDark transition hover:text-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                Listen for answer
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

export function ReviewPage() {
  const { draft, loaded } = useCaseDraft();
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [flags, setFlags] = useState<string[]>([]);

  useEffect(() => {
    if (!loaded || !draft) {
      return;
    }

    careGuideApi.mapFormFields(draft).then(async (mappedFields) => {
      setFields(mappedFields);
      const verification = await careGuideApi.verifyPacket(mappedFields);
      setFlags(verification.flags);
    });
  }, [draft, loaded]);

  if (!loaded) {
    return <PageIntro title="Preparing your review" />;
  }

  const ready = flags.length === 0 && fields.length > 0;

  return (
    <>
      <PageIntro
        eyebrow="Review"
        title="Review your information"
        text="This page prepares a review packet. It does not submit an application."
      >
        <div className="rounded-lg border border-[#D9E3F8] bg-skysoft p-5">
          <p className="text-2xl font-semibold text-navy">
            Application packet: {ready ? "Ready for review" : `${flags.length || 3} items need attention`}
          </p>
        </div>
      </PageIntro>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-10 lg:px-16">
        <div className="overflow-hidden rounded-lg border border-[rgba(24,36,71,0.08)] bg-white shadow-soft">
          <div className="grid grid-cols-1 border-b border-[rgba(24,36,71,0.08)] bg-bgsoft px-5 py-3 text-sm font-semibold text-navy md:grid-cols-4">
            <span>Section</span>
            <span>Answer</span>
            <span>Source</span>
            <span>Status</span>
          </div>
          {fields.map((field) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 border-b border-[rgba(24,36,71,0.08)] px-5 py-4 text-base md:grid-cols-4"
            >
              <span className="font-semibold text-navy">{field.plainLanguageLabel}</span>
              <span className="text-slatecare">{field.value === null ? "Missing" : String(field.value)}</span>
              <span className="text-slatecare">{field.sourceType.replace("_", " ")}</span>
              <span className="font-semibold text-primaryDark">
                {field.needsReview ? "Needs review" : "Reviewed"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <SecondaryButton href="/coverage/application">Fix missing items</SecondaryButton>
          <PrimaryButton href="/coverage/help">Continue to local help</PrimaryButton>
          <SecondaryButton onClick={() => window.print()}>Download review summary</SecondaryButton>
        </div>
      </section>
    </>
  );
}

export function HelpPage() {
  const { draft } = useCaseDraft();
  const [zip, setZip] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (draft?.zip) {
      setZip(draft.zip);
    }
  }, [draft]);

  return (
    <>
      <PageIntro
        eyebrow="Human help"
        title="Find trusted help nearby"
        text="CareGuide does not call, book, or contact anyone automatically. You choose each next action."
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-16">
        <div className="space-y-8">
          <section className="careguide-soft-card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-navy">Enrollment help</h2>
            <p className="mt-2 text-base leading-7 text-slatecare">
              Search verified resources when a backend source is connected.
            </p>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-navy">ZIP code</span>
              <input
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                className="careguide-field mt-2"
              />
            </label>
            <PrimaryButton onClick={() => setSearched(true)}>Search verified resources</PrimaryButton>
          </section>

          <section className="rounded-lg bg-bgsoft p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-navy">Care while coverage is pending</h2>
            <p className="mt-2 text-base leading-7 text-slatecare">
              CareGuide can prepare a handoff summary for you to review and share.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Show phone numbers",
                "Prepare a call script",
                "Connect me to a counselor",
                "Share my reviewed summary"
              ].map((action) => (
                <OptionChip key={action} onClick={() => undefined}>
                  {action}
                </OptionChip>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ResourceCard />
          {searched ? (
            <SourceDisclosure>
              No resources are shown because no verified resource backend is connected yet. This
              avoids displaying invented clinics, phone numbers, or addresses.
            </SourceDisclosure>
          ) : null}
        </aside>
      </section>
    </>
  );
}

export function DashboardPage() {
  const { draft, loaded } = useCaseDraft();
  const intakeComplete = Boolean(draft?.zip && draft?.householdSize);
  const documentsAdded = draft ? 2 : 0;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageIntro
        eyebrow="Saved plan"
        title="Your CareGuide plan"
        text="A calm place to return to your likely pathway, documents, application packet, and help options."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-10 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
        <DashboardStatus title="Likely pathway" value="Demo pathway preview" href="/coverage/results" />
        <DashboardStatus
          title="Application progress"
          value={intakeComplete ? "Ready for review" : "Intake not complete"}
          href={intakeComplete ? "/coverage/review" : "/coverage/intake"}
        />
        <DashboardStatus
          title="Missing documents"
          value={loaded && draft ? `Documents ${documentsAdded} of 4` : "Not started"}
          href="/coverage/documents"
        />
        <DashboardStatus
          title="Counselor handoff"
          value="Not started"
          href="/coverage/help"
        />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-10 lg:px-16">
        <div className="careguide-soft-card p-6">
          <h2 className="text-2xl font-semibold text-navy">Next action</h2>
          <p className="mt-2 text-base leading-7 text-slatecare">
            Continue the guided flow or prepare a handoff summary for human review. CareGuide does
            not claim that anything has been filed or sent.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton href={intakeComplete ? "/coverage/documents" : "/coverage/intake"}>
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
      className="group rounded-lg border border-[rgba(24,36,71,0.08)] bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[#D9E3F8] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <p className="text-sm font-semibold text-primaryDark">
        {title}
      </p>
      <p className="mt-4 text-2xl font-semibold text-navy">{value}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primaryDark">
        Open
        <span className="transition group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}
