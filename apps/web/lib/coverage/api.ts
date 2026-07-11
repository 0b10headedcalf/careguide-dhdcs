import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  Language,
  PathwayPreview,
  ResourceSearchResult
} from "./types";
import {
  ApiValidationError,
  caseCreatedSchema,
  caseDetailSchema,
  handoffPacketSchema,
  intakeConfirmSchema,
  intakeMessageSchema,
  mappedFieldsSchema,
  nearbyResourcesSchema,
  pathwayResultSchema,
  triggeredFormsSchema,
  verifyPacketSchema,
  type CaseDetail,
  type HandoffPacket,
  type IntakeMessageResult,
  type PathwayResult,
  type Validator,
  type VerifyPacketResult
} from "./schemas";

/**
 * Base URL for the CareBridge backend. An empty string means same-origin
 * (relative /api/... requests). No mock fallback exists: if the backend is
 * unreachable the caller must show an honest error state.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const CASE_ID_KEY = "careguide.caseId.v1";
const API_TIMEOUT_MS = 10000;

/** CCFRM604 is the primary coverage application path. */
export const PRIMARY_FORM_ID = "CCFRM604";

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

export { ApiValidationError };

/** User-facing message for any API failure. Never exposes internals. */
export function friendlyApiMessage(error: unknown): string {
  if (error instanceof ApiValidationError) {
    return "CareGuide received an unexpected response from the service. Please try again.";
  }
  if (error instanceof ApiError && error.status === 404) {
    return "We couldn't find that case. You can start a new one.";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The service took too long to respond. Please try again.";
  }
  return "CareGuide can't reach the coverage service right now. Please try again in a moment.";
}

/** Developer-visible detail, shown only outside production builds. */
export function devApiDetail(error: unknown): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

async function apiFetch<T>(
  path: string,
  validate: Validator<T>,
  init: RequestInit = {},
  externalSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: controller.signal
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(`HTTP ${response.status}: response was not JSON`, {
        status: response.status
      });
    }
    const record = body as { data?: unknown; error?: { code?: string; message?: string } };
    if (!response.ok || record.error) {
      throw new ApiError(record.error?.message ?? `HTTP ${response.status}`, {
        status: response.status,
        code: record.error?.code
      });
    }
    return validate(record.data, "data");
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

/* ------------------------- case id persistence ------------------------- */
/* localStorage may be unavailable (private mode, blocked). Fall back to
   in-memory state without surfacing an error to the user. */

let memoryCaseId: string | null = null;

export function readStoredCaseId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CASE_ID_KEY) ?? memoryCaseId;
  } catch {
    return memoryCaseId;
  }
}

function writeStoredCaseId(id: string) {
  memoryCaseId = id;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CASE_ID_KEY, id);
  } catch {
    /* in-memory fallback already set */
  }
}

export function clearStoredCaseId() {
  memoryCaseId = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CASE_ID_KEY);
  } catch {
    /* nothing else to clear */
  }
}

/* ------------------------------ API methods ----------------------------- */

export async function createCase(language: Language): Promise<{ caseId: string }> {
  const created = await apiFetch("/api/cases", caseCreatedSchema, {
    method: "POST",
    body: JSON.stringify({ language, explanation_style: "simple" })
  });
  writeStoredCaseId(created.case_id);
  return { caseId: created.case_id };
}

export async function getCase(caseId: string, signal?: AbortSignal): Promise<CaseDetail> {
  return apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, caseDetailSchema, {}, signal);
}

/**
 * Return the active case id, creating a case when none exists. A stored id
 * the backend no longer recognizes (404) is discarded and replaced.
 */
export async function ensureCase(language: Language): Promise<string> {
  const cached = readStoredCaseId();
  if (cached) {
    try {
      await getCase(cached);
      return cached;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        clearStoredCaseId();
      } else {
        // Backend unreachable — keep the id; calls will surface their own errors.
        return cached;
      }
    }
  }
  const created = await createCase(language);
  return created.caseId;
}

export async function sendIntakeMessage(
  caseId: string,
  message: string,
  language: Language,
  inputMode: "voice" | "text" = "text"
): Promise<IntakeMessageResult> {
  return apiFetch("/api/intake/message", intakeMessageSchema, {
    method: "POST",
    body: JSON.stringify({ case_id: caseId, message, language, input_mode: inputMode })
  });
}

export async function saveIntakeAnswer(
  caseId: string,
  canonicalName: string,
  value: unknown,
  confirmed: boolean
) {
  return apiFetch("/api/intake/confirm", intakeConfirmSchema, {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      canonical_name: canonicalName,
      value,
      confirmed
    })
  });
}

export async function evaluateEligibility(caseId: string, signal?: AbortSignal): Promise<PathwayResult> {
  return apiFetch(
    "/api/eligibility/evaluate",
    pathwayResultSchema,
    { method: "POST", body: JSON.stringify({ case_id: caseId }) },
    signal
  );
}

export async function routeForms(caseId: string, signal?: AbortSignal): Promise<Array<{ form_id: string; official_url?: string }>> {
  const result = await apiFetch(
    "/api/forms/route",
    triggeredFormsSchema,
    { method: "POST", body: JSON.stringify({ case_id: caseId }) },
    signal
  );
  return result.triggered_forms;
}

export async function getFormFields(
  caseId: string,
  formId: string,
  signal?: AbortSignal
): Promise<FormFieldValue[]> {
  const result = await apiFetch(
    "/api/forms/map-fields",
    mappedFieldsSchema,
    { method: "POST", body: JSON.stringify({ case_id: caseId, form_id: formId }) },
    signal
  );
  return result.fields.map((field) => ({
    id: field.canonical_field_name,
    officialFieldLabel: field.official_field_label,
    plainLanguageLabel: PLAIN_LABELS[field.canonical_field_name] ?? field.official_field_label,
    value: normalizeFieldValue(field.value),
    sourceType: normalizeSourceType(field.source_type),
    confidence: field.confidence,
    needsReview: field.needs_review,
    explanation: field.explanation_simple
  }));
}

export async function verifyPacket(
  caseId: string,
  formId: string,
  signal?: AbortSignal
): Promise<VerifyPacketResult> {
  return apiFetch(
    "/api/forms/verify",
    verifyPacketSchema,
    { method: "POST", body: JSON.stringify({ case_id: caseId, form_id: formId }) },
    signal
  );
}

export async function searchNearbyResources(
  query: { zip: string; lat?: number; lng?: number; language?: Language },
  signal?: AbortSignal
): Promise<ResourceSearchResult[]> {
  const params = new URLSearchParams({ zip: query.zip.trim() });
  // The backend has no server-side ZIP geocoder, so the browser geocodes the
  // ZIP (Google key permitting) and passes coordinates explicitly.
  if (query.lat !== undefined && query.lng !== undefined) {
    params.set("lat", String(query.lat));
    params.set("lng", String(query.lng));
  }
  if (query.language) params.set("language", query.language);
  const result = await apiFetch(
    `/api/resources/nearby?${params.toString()}`,
    nearbyResourcesSchema,
    {},
    signal
  );
  return result.resources.map((record) => ({
    name: record.name,
    type: record.type,
    address: record.address ?? undefined,
    phone: record.phone ?? undefined,
    distance:
      record.distance_miles !== undefined ? `${record.distance_miles.toFixed(1)} mi` : undefined,
    officialSource: record.url || record.source_url,
    retrievedDate: record.retrieved_at,
    languageSupport: record.verified_language_support,
    isCached: record.is_cached,
    sourceId: record.source_id,
    sourceUrl: record.source_url,
    reasonRecommended: record.reason_recommended
  }));
}

/**
 * Create the counselor handoff packet. The backend requires the user to have
 * reviewed their information first; callers must gate on an explicit review.
 */
export async function exportPacket(caseId: string): Promise<HandoffPacket> {
  return apiFetch("/api/handoff-passport", handoffPacketSchema, {
    method: "POST",
    body: JSON.stringify({ case_id: caseId, user_reviewed: true })
  });
}

/** Printable HTML view of a created handoff packet, served by the backend. */
export function handoffPacketHtmlUrl(packetId: string): string {
  return `${API_BASE_URL}/api/handoff-passport/${encodeURIComponent(packetId)}/html`;
}

/* --------------------- composite frontend operations --------------------- */

/** Push every fact present in the local draft to the backend (idempotent). */
export async function syncDraftFacts(caseId: string, draft: CaseDraft): Promise<void> {
  for (const [canonicalName, value] of draftToConfirmations(draft)) {
    await saveIntakeAnswer(caseId, canonicalName, value, true);
  }
}

export function draftToConfirmations(draft: CaseDraft): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  // The user is in the coverage flow, so assert the coverage need itself.
  pairs.push(["insurance.needs_health_coverage", true]);
  if (draft.zip) pairs.push(["location.zip", draft.zip]);
  if (draft.householdSize !== undefined) pairs.push(["household.size", draft.householdSize]);
  if (draft.incomeEstimate !== undefined) pairs.push(["income.estimate", draft.incomeEstimate]);
  if (draft.incomeFrequency) pairs.push(["income.frequency", draft.incomeFrequency]);
  if (draft.employerCoverageOffer) pairs.push(["employer.coverage_offer", draft.employerCoverageOffer]);
  if (draft.recentCoverageLoss !== undefined) {
    pairs.push(["insurance.recent_coverage_loss", draft.recentCoverageLoss]);
  }
  return pairs;
}

/**
 * Document checklist derived from real form routing: which forms the rule
 * engine triggered for this case decides which documents may be requested.
 * Status comes only from the user's own attestation stored in the draft —
 * nothing is marked "uploaded" because no upload exists.
 */
export async function getDocumentChecklist(
  caseId: string,
  draft: CaseDraft | null
): Promise<DocumentChecklistEntry[]> {
  const forms = await routeForms(caseId);
  const formIds = new Set(forms.map((form) => form.form_id));
  const entries: DocumentChecklistEntry[] = [
    {
      id: "income",
      title: "Proof of income",
      status: "Needed",
      explanation: "Recent pay stubs or income records may be requested during review."
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
    }
  ];
  if (formIds.has("EMPLOYER_COVERAGE_PREVIEW")) {
    entries.splice(1, 0, {
      id: "employer",
      title: "Employer coverage information",
      status: "Needed",
      explanation: "Job-based coverage was flagged for this case, so those details should be reviewed."
    });
  }
  if (formIds.has("income_attestation")) {
    entries.push({
      id: "income_attestation",
      title: "Income attestation",
      status: "May be requested",
      explanation: "Irregular or hard-to-prove income can be covered by a signed attestation."
    });
  }
  const attestations = draft?.docStatus ?? {};
  return entries.map((entry) => {
    const attested = attestations[entry.id];
    if (attested === "have") return { ...entry, status: "Added" as const };
    if (attested === "need_help") return { ...entry, status: "Need help" as const };
    return entry;
  });
}

/* ------------------------------ UI mapping ------------------------------ */

const PATHWAY_LABELS: Record<string, string> = {
  medi_cal_likely: "Your likely pathway: Medi-Cal",
  covered_ca_likely: "Your likely pathway: Covered California",
  mixed_household: "Mixed-status household — a counselor should review this",
  human_review: "A counselor should review your intake"
};

export function pathwayToPreview(payload: PathwayResult): PathwayPreview {
  const label = PATHWAY_LABELS[payload.likely_pathway] ?? "Likely pathway preview";
  const reasons: string[] = [];
  if (payload.triggered_rule_ids?.length) {
    reasons.push(`Rule: ${payload.triggered_rule_ids[0]}`);
  }
  reasons.push("CareBridge keeps final eligibility language separate from this preview.");
  if (payload.human_review_required) {
    reasons.push("This preview should be reviewed by a certified counselor.");
  }
  return {
    label,
    supportingLine: payload.explanation_simple.trim(),
    reasons,
    missingInformation: payload.missing_questions ?? [],
    reviewFlags: payload.verification_flags ?? [],
    nextStep: payload.next_best_action ?? "Continue intake."
  };
}

const PLAIN_LABELS: Record<string, string> = {
  "location.zip": "What ZIP code do you live in?",
  "household.size": "How many people live in your household?",
  "income.estimate": "What is your approximate household income?",
  "income.frequency": "How often do you receive that income?",
  "employer.coverage_offer": "Do you currently get health insurance through a job?",
  "insurance.recent_coverage_loss": "Did you recently lose coverage?",
  "insurance.needs_health_coverage": "Do you need health coverage?"
};

function normalizeSourceType(sourceType: string): FormFieldValue["sourceType"] {
  if (
    sourceType === "user" ||
    sourceType === "document" ||
    sourceType === "rule" ||
    sourceType === "agent_suggestion" ||
    sourceType === "agent_auto_confirmed" ||
    sourceType === "official_api"
  ) {
    return sourceType;
  }
  return "rule";
}

function normalizeFieldValue(value: unknown): FormFieldValue["value"] {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

export { API_BASE_URL };
