import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  Language,
  PathwayPreview,
  ResourceSearchResult
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GUIDE_CASE_ID_KEY = "careguide.agent.caseId.v1";
const PRIMARY_FORM_ID = "CCFRM604";

export type CareGuideApiClient = {
  createCase: () => Promise<{ caseId: string }>;
  submitIntakeMessage: (message: string, draft: CaseDraft) => Promise<CaseDraft>;
  evaluatePathway: (draft: CaseDraft) => Promise<PathwayPreview>;
  routeForms: (draft: CaseDraft) => Promise<string[]>;
  mapFormFields: (draft: CaseDraft) => Promise<FormFieldValue[]>;
  verifyPacket: (fields: FormFieldValue[]) => Promise<{ ready: boolean; flags: string[] }>;
  getNearbyResources: (zip?: string) => Promise<ResourceSearchResult[]>;
  createHandoffPassport: (draft: CaseDraft) => Promise<{ summaryId: string }>;
};

function hasEnoughForMediCalPreview(draft: CaseDraft) {
  return Boolean(draft.zip && draft.householdSize && draft.incomeEstimate);
}

export const mockCareGuideApi: CareGuideApiClient = {
  async createCase() {
    return { caseId: "demo-case" };
  },

  async submitIntakeMessage(_message, draft) {
    return draft;
  },

  async evaluatePathway(draft) {
    return {
      label: hasEnoughForMediCalPreview(draft)
        ? "Likely pathway: Medi-Cal"
        : "Demo pathway preview",
      supportingLine: "Based on the household and income information you provided.",
      reasons: [
        "Your household details are enough to prepare a careful pathway preview.",
        draft.recentCoverageLoss
          ? "You shared that coverage may have changed recently."
          : "Coverage changes and current insurance status still need review.",
        "CareGuide keeps final eligibility language separate from this likely pathway preview."
      ],
      missingInformation: [
        "Proof of income",
        "Employer coverage details",
        "Identity and tax household information"
      ],
      reviewFlags: [
        "Income and household size should be reviewed before any official packet is sent."
      ],
      nextStep: "Prepare documents so the application packet can be reviewed."
    };
  },

  async routeForms() {
    return [
      "Applicant",
      "Household",
      "Coverage",
      "Income",
      "Employer coverage",
      "Documents",
      "Review"
    ];
  },

  async mapFormFields(draft) {
    return [
      {
        id: "zip",
        officialFieldLabel: "Residential ZIP code",
        plainLanguageLabel: "What ZIP code do you live in?",
        value: draft.zip ?? null,
        sourceType: "user",
        needsReview: !draft.confirmedFields.includes("zip"),
        explanation: "Used to identify the correct coverage pathway and local help options."
      },
      {
        id: "householdSize",
        officialFieldLabel: "Tax household size",
        plainLanguageLabel: "How many people live in your household?",
        value: draft.householdSize ?? null,
        sourceType: "user",
        needsReview: !draft.confirmedFields.includes("householdSize"),
        explanation: "Household size affects which pathway may fit."
      },
      {
        id: "incomeEstimate",
        officialFieldLabel: "Estimated household income",
        plainLanguageLabel: "What is your approximate household income?",
        value: draft.incomeEstimate ?? null,
        sourceType: "user",
        needsReview: !draft.confirmedFields.includes("incomeEstimate"),
        explanation: "Income must be reviewed before preparing the application packet."
      },
      {
        id: "employerCoverageOffer",
        officialFieldLabel: "Access to employer-sponsored health coverage",
        plainLanguageLabel: "Do you currently get health insurance through a job?",
        value: draft.employerCoverageOffer ?? null,
        sourceType: "user",
        needsReview: !draft.confirmedFields.includes("employerCoverageOffer"),
        explanation: "This maps to an official form question and should be confirmed."
      }
    ];
  },

  async verifyPacket(fields) {
    const flags = fields
      .filter((field) => field.needsReview || field.value === null)
      .map((field) => field.plainLanguageLabel);

    return {
      ready: flags.length === 0,
      flags
    };
  },

  async getNearbyResources() {
    return [];
  },

  async createHandoffPassport() {
    return { summaryId: "demo-handoff-summary" };
  }
};

export const careGuideApi = mockCareGuideApi;
export { API_BASE_URL, PRIMARY_FORM_ID };

export type ExplanationLevel = "simple" | "standard" | "detailed";
export type GuideVoiceSource = "voice" | "text";

export type GuideQuestion = {
  field_name: string;
  official_label: string;
  user_facing_question: string;
  why_needed: string;
  answer_type: "text" | "number" | "date" | "choice" | "file" | "confirmation";
};

export type GuideFieldCandidate = {
  field_name: string;
  official_label: string;
  value: string | number | boolean;
  source_type: "user_voice" | "user_text" | "document" | "rule" | "agent";
  confidence: number;
  needs_review: boolean;
  explanation: string;
};

export type GuideFormResponse = {
  assistant_message: string;
  language: string;
  current_form_id: string;
  current_section: string;
  next_question: GuideQuestion | null;
  field_candidate: GuideFieldCandidate | null;
  needs_confirmation: boolean;
  can_continue_to_next_section: boolean;
  missing_documents: Array<{ id: string; title: string; status: string; explanation: string }>;
  safety_flags: string[];
  next_action: string;
};

export type TranscriptionResult = {
  text: string;
  language_code?: string | null;
  language_probability?: number | null;
  words: unknown[];
  source: "elevenlabs";
  needs_user_confirmation: boolean;
};

export type UploadedDocument = {
  document_id: string;
  case_id: string;
  filename: string;
  document_type?: string | null;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  status: string;
  extraction_status: "pending" | "complete" | "unsupported" | "failed";
  extracted_text_preview?: string | null;
  needs_confirmation: boolean;
  confirmed_by_user: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

export class GuideApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GuideApiError";
    this.status = status;
  }
}

async function guideJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body || body.error) {
    throw new GuideApiError(body?.error?.message ?? `HTTP ${response.status}`, response.status);
  }
  return body.data as T;
}

async function guideMultipart<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body || body.error) {
    throw new GuideApiError(body?.error?.message ?? `HTTP ${response.status}`, response.status);
  }
  return body.data as T;
}

export function readStoredGuideCaseId() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(GUIDE_CASE_ID_KEY);
  } catch {
    return null;
  }
}

function writeStoredGuideCaseId(caseId: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(GUIDE_CASE_ID_KEY, caseId);
  } catch {
    // Continue without persistence when localStorage is unavailable.
  }
}

export async function ensureGuideCase(language: Language, explanationLevel: ExplanationLevel) {
  const existingCaseId = readStoredGuideCaseId();
  if (existingCaseId) {
    try {
      await guideJson(`/api/cases/${encodeURIComponent(existingCaseId)}`);
      await guideJson(`/api/cases/${encodeURIComponent(existingCaseId)}`, {
        method: "PATCH",
        body: JSON.stringify({ language })
      });
      return existingCaseId;
    } catch (error) {
      if (!(error instanceof GuideApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const created = await guideJson<{ case_id: string }>("/api/cases", {
    method: "POST",
    body: JSON.stringify({ language, explanation_style: explanationLevel })
  });
  writeStoredGuideCaseId(created.case_id);
  return created.case_id;
}

export async function getGuideNextQuestion(
  caseId: string,
  language: Language,
  explanationLevel: ExplanationLevel,
  formId = PRIMARY_FORM_ID
) {
  return guideJson<GuideFormResponse>("/api/forms/next-question", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      language,
      explanation_level: explanationLevel,
      form_id: formId
    })
  });
}

export async function sendGuideAnswer(
  caseId: string,
  answer: string,
  source: GuideVoiceSource,
  language: Language,
  explanationLevel: ExplanationLevel,
  fieldName?: string,
  formId = PRIMARY_FORM_ID
) {
  return guideJson<GuideFormResponse>("/api/forms/answer", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      form_id: formId,
      language,
      explanation_level: explanationLevel,
      field_name: fieldName,
      answer,
      input_mode: source
    })
  });
}

export async function confirmGuideField(
  caseId: string,
  candidate: GuideFieldCandidate,
  language: Language,
  explanationLevel: ExplanationLevel,
  formId = PRIMARY_FORM_ID
) {
  return guideJson<GuideFormResponse>("/api/forms/confirm-field", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      form_id: formId,
      language,
      explanation_level: explanationLevel,
      field_name: candidate.field_name,
      official_label: candidate.official_label,
      value: candidate.value,
      source_type: candidate.source_type,
      confidence: candidate.confidence,
      needs_review: candidate.needs_review,
      explanation: candidate.explanation,
      confirmed: true
    })
  });
}

export async function transcribeGuideAudio(caseId: string, audio: Blob, language: Language) {
  const formData = new FormData();
  formData.append("file", audio, "careguide-recording.webm");
  formData.append("case_id", caseId);
  formData.append("language_code", language);
  return guideMultipart<TranscriptionResult>("/api/voice/transcribe", formData);
}

export async function uploadGuideDocument(caseId: string, file: File, documentType = "supporting_document") {
  const formData = new FormData();
  formData.append("case_id", caseId);
  formData.append("document_type", documentType);
  formData.append("file", file);
  return guideMultipart<UploadedDocument>("/api/documents/upload", formData);
}

export async function listGuideDocuments(caseId: string) {
  const result = await guideJson<{ documents: UploadedDocument[] }>(
    `/api/documents/${encodeURIComponent(caseId)}`
  );
  return result.documents;
}
