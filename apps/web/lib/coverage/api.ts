import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  CaseCreateRequest,
  IntakeConfirmRequest,
  IntakeMessageRequest
} from "@carebridge/schemas";
import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  PathwayPreview,
  ResourceSearchResult
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const CASE_ID_KEY = "careguide.caseId.v1";

export type {
  ApiEnvelope,
  ApiErrorEnvelope,
  CaseCreateRequest,
  IntakeConfirmRequest,
  IntakeMessageRequest
};

/** Raw shape of a resource returned by GET /api/resources/nearby. */
type BackendResource = {
  resource_id?: string;
  name: string;
  type: string;
  address?: string | null;
  phone?: string | null;
  url?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_miles?: number | null;
  verified_language_support?: string[];
  source_id: string;
  source_url: string;
  retrieved_at: string;
  is_cached: boolean;
  reason_recommended?: string;
};

/**
 * Fetch ranked verified resources for a ZIP directly from the backend.
 * Returns [] on any failure so the caller can render an honest empty state
 * rather than a crash.
 */
export type HandoffPassportResult = {
  packetId: string;
  htmlViewUrl: string;
};

/**
 * Generate a handoff passport for the current case. POSTs to the backend to
 * create the packet, then returns the URL where the raw HTML can be opened
 * and printed. Assumes the user has already reviewed the packet contents on
 * the review screen — the backend refuses to generate without user_reviewed
 * = true.
 */
export async function generateHandoffPassport(): Promise<HandoffPassportResult | null> {
  const caseId = typeof window !== "undefined" ? window.localStorage.getItem(CASE_ID_KEY) : null;
  if (!caseId) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/handoff-passport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, user_reviewed: true }),
      signal: controller.signal
    });
    const body = (await response.json()) as
      | { data: { packet_id: string } }
      | { error: { message: string } };
    if (!response.ok || "error" in body) return null;
    return {
      packetId: body.data.packet_id,
      htmlViewUrl: `${API_BASE_URL}/api/handoff-passport/${body.data.packet_id}/html`
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNearbyResources(zip: string): Promise<ResourceSearchResult[]> {
  if (!zip.trim()) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/resources/nearby?zip=${encodeURIComponent(zip.trim())}`,
      { headers: { "Content-Type": "application/json" }, signal: controller.signal }
    );
    const body = (await response.json()) as
      | { data: { resources: BackendResource[] } }
      | { error: { message: string } };
    if (!response.ok || "error" in body) return [];
    return body.data.resources.map((record) => ({
      name: record.name,
      type: record.type,
      address: record.address ?? undefined,
      phone: record.phone ?? undefined,
      distance:
        record.distance_miles !== null && record.distance_miles !== undefined
          ? `${record.distance_miles.toFixed(1)} mi`
          : undefined,
      officialSource: record.url ?? record.source_url,
      retrievedDate: record.retrieved_at,
      languageSupport: record.verified_language_support,
      isCached: record.is_cached,
      sourceId: record.source_id,
      sourceUrl: record.source_url
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

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

/* ------------------------------ real backend ------------------------------ */

type EnvelopeOr<T> = ApiEnvelope<T> | ApiErrorEnvelope;

// 5s per call is generous — the backend is deterministic and shouldn't hang.
// A hard cap here prevents Mission Control from spinning forever when the
// API is degraded; withMockFallback catches the resulting AbortError and
// substitutes the mock, so the UI stays usable during a demo hiccup.
const API_TIMEOUT_MS = 5000;

export class ApiUnreachableError extends Error {
  status: number;
  path: string;
  constructor(path: string, cause: string, status = 500) {
    super(`Backend unreachable at ${path}: ${cause}`);
    this.name = "ApiUnreachableError";
    this.status = status;
    this.path = path;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: controller.signal
    });
  } catch (err) {
    // Network error, DNS failure, refused connection, or AbortController timeout
    // all land here. Normalize as a 500-class ApiUnreachableError so the UI can
    // show one consistent "backend not reachable" state.
    const cause =
      err instanceof DOMException && err.name === "AbortError"
        ? `timeout after ${API_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new ApiUnreachableError(path, cause);
  } finally {
    clearTimeout(timer);
  }

  let body: EnvelopeOr<T> | null = null;
  try {
    body = (await response.json()) as EnvelopeOr<T>;
  } catch {
    // Non-JSON response — treat as an unreachable/broken backend.
    throw new ApiUnreachableError(path, `non-JSON response (HTTP ${response.status})`, response.status);
  }
  if (!response.ok || (body && "error" in body)) {
    const message =
      body && "error" in body ? body.error.message : `HTTP ${response.status}`;
    throw new ApiUnreachableError(path, message, response.status);
  }
  return (body as ApiEnvelope<T>).data;
}

function readCachedCaseId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CASE_ID_KEY);
}

function writeCachedCaseId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CASE_ID_KEY, id);
}

async function ensureCaseId(language: "en" | "es"): Promise<string> {
  const cached = readCachedCaseId();
  if (cached) return cached;
  const created = await apiFetch<{ case_id: string }>("/api/cases", {
    method: "POST",
    body: JSON.stringify({ language, explanation_style: "simple" })
  });
  writeCachedCaseId(created.case_id);
  return created.case_id;
}

/** Map a frontend CaseDraft into the backend's canonical (canonical_name, value) pairs. */
function draftToConfirmations(draft: CaseDraft): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  // Always assert coverage need on this flow — the user is here for coverage.
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

const PATHWAY_LABELS: Record<string, string> = {
  medi_cal_likely: "You may be a match for Medi-Cal",
  covered_ca_likely: "You may be a match for Covered California",
  mixed_household: "Mixed-status household — a counselor should review this",
  human_review: "A counselor should review your intake"
};

function pathwayToPreview(payload: {
  likely_pathway: string;
  explanation_simple: string;
  missing_questions?: string[];
  verification_flags?: string[];
  next_best_action?: string;
  triggered_rule_ids?: string[];
  human_review_required?: boolean;
}): PathwayPreview {
  const label = PATHWAY_LABELS[payload.likely_pathway] ?? "Pathway preview";
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

// Default form the review + application flows map against. The backend
// field_mapper currently uses a shared FIELD_MAP regardless of form_id, so
// this ID is stable — it just needs to exist in data/form_catalog.json.
const DEFAULT_REVIEW_FORM_ID = "CCFRM604";

type BackendMappedField = {
  official_field_label: string;
  canonical_field_name: string;
  value: string | number | boolean | null;
  source_type: string;
  source_ref: string;
  confidence: number;
  needs_review: boolean;
  risk_level: string;
  explanation_simple: string;
};

const PLAIN_LANGUAGE_LABELS: Record<string, string> = {
  "location.zip": "What ZIP code do you live in?",
  "household.size": "How many people live in your household?",
  "income.estimate": "What is your approximate household income?",
  "income.frequency": "How often do you receive that income?",
  "insurance.current_status": "What is your current health insurance status?",
  "insurance.recent_coverage_loss": "Did you recently lose coverage?",
  "employer.coverage_offer": "Do you currently get health insurance through a job?"
};

function mapBackendField(field: BackendMappedField): FormFieldValue {
  const canonical = field.canonical_field_name;
  return {
    id: canonical.split(".").join("_"),
    officialFieldLabel: field.official_field_label,
    plainLanguageLabel: PLAIN_LANGUAGE_LABELS[canonical] ?? field.official_field_label,
    value: field.value,
    sourceType: field.source_type as FormFieldValue["sourceType"],
    confidence: field.confidence,
    needsReview: field.needs_review,
    explanation: field.explanation_simple,
    riskLevel: (field.risk_level || "low") as FormFieldValue["riskLevel"]
  };
}

export const liveCareGuideApi: CareGuideApiClient = {
  async createCase() {
    const caseId = await ensureCaseId("en");
    return { caseId };
  },

  async submitIntakeMessage(_message, draft) {
    // The confirmed-fact path is what the pathway engine reads; leave the
    // message endpoint for a future PR that renders normalized suggestions.
    return draft;
  },

  async evaluatePathway(draft) {
    const caseId = await ensureCaseId(draft.language);
    for (const [canonical_name, value] of draftToConfirmations(draft)) {
      await apiFetch("/api/intake/confirm", {
        method: "POST",
        body: JSON.stringify({ case_id: caseId, canonical_name, value, confirmed: true })
      });
    }
    const result = await apiFetch<Parameters<typeof pathwayToPreview>[0]>(
      "/api/eligibility/evaluate",
      { method: "POST", body: JSON.stringify({ case_id: caseId }) }
    );
    return pathwayToPreview(result);
  },

  async routeForms() {
    // Not surfaced in the current UI; leave stubbed until a page needs it.
    return mockCareGuideApi.routeForms({} as CaseDraft);
  },

  async mapFormFields(draft) {
    const caseId = await ensureCaseId(draft.language);
    const response = await apiFetch<{ form_id: string; fields: BackendMappedField[] }>(
      "/api/forms/map-fields",
      {
        method: "POST",
        body: JSON.stringify({ case_id: caseId, form_id: DEFAULT_REVIEW_FORM_ID })
      }
    );
    return response.fields.map(mapBackendField);
  },

  async verifyPacket(_fields) {
    // Backend verifies the packet by case+form, not by a field payload. It
    // reads the persisted FormFieldValue rows written by /api/forms/map-fields
    // (which the caller just POSTed via mapFormFields), so calling verify
    // right after map-fields sees the correct state.
    const caseId = await ensureCaseId("en");
    const response = await apiFetch<{
      blocking_flags: string[];
      warnings: string[];
      ready_for_handoff: boolean;
    }>("/api/forms/verify", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, form_id: DEFAULT_REVIEW_FORM_ID })
    });
    // The Review page's ready check is `flags.length === 0`, so combine
    // blocking flags (which stop handoff) with warnings (soft, informational).
    return {
      ready: response.ready_for_handoff,
      flags: [...response.blocking_flags, ...response.warnings]
    };
  },

  async getNearbyResources() {
    return [];
  },

  async createHandoffPassport() {
    return { summaryId: "handoff-pending" };
  }
};

/* ------------------------------ mock fallback ----------------------------- */

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
        ? "You may be a match for Medi-Cal"
        : "Demo pathway preview",
      supportingLine: "Based on the household and income information you provided.",
      reasons: [
        "Your household details are enough to prepare a careful pathway preview.",
        draft.recentCoverageLoss
          ? "You shared that coverage may have changed recently."
          : "Coverage changes and current insurance status still need review.",
        "CareBridge keeps final eligibility language separate from this preview."
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

/* --------- default client: live only. Mock stays exported for tests. ------ */

// Default client is the real backend. No silent fallback to mock — if the
// backend is unreachable (network error, timeout, non-2xx), apiFetch throws
// with a clear message and the calling UI component surfaces the failure
// as an error state instead of pretending everything is fine with fake data.
// This surfaces "backend not set up" as a visible 500-class error to the user,
// which is the correct signal when a deploy is misconfigured.
export const careGuideApi: CareGuideApiClient = liveCareGuideApi;
export { API_BASE_URL };
