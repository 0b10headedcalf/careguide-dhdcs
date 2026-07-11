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
export async function fetchNearbyResources(zip: string): Promise<ResourceSearchResult[]> {
  if (!zip.trim()) return [];
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/resources/nearby?zip=${encodeURIComponent(zip.trim())}`,
      { headers: { "Content-Type": "application/json" } }
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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
  });
  const body = (await response.json()) as EnvelopeOr<T>;
  if (!response.ok || "error" in body) {
    const message = "error" in body ? body.error.message : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body.data;
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

  // The remaining methods still route through the mock until wired individually.
  async routeForms() {
    return mockCareGuideApi.routeForms({} as CaseDraft);
  },
  async mapFormFields(draft) {
    return mockCareGuideApi.mapFormFields(draft);
  },
  async verifyPacket(fields) {
    return mockCareGuideApi.verifyPacket(fields);
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

/* --------- default client: prefer live, fall back to mock on error -------- */

function withMockFallback(live: CareGuideApiClient, mock: CareGuideApiClient): CareGuideApiClient {
  return {
    async createCase() {
      try {
        return await live.createCase();
      } catch (err) {
        console.warn("[careGuideApi] createCase falling back to mock:", err);
        return mock.createCase();
      }
    },
    async submitIntakeMessage(message, draft) {
      try {
        return await live.submitIntakeMessage(message, draft);
      } catch (err) {
        console.warn("[careGuideApi] submitIntakeMessage falling back to mock:", err);
        return mock.submitIntakeMessage(message, draft);
      }
    },
    async evaluatePathway(draft) {
      try {
        return await live.evaluatePathway(draft);
      } catch (err) {
        console.warn("[careGuideApi] evaluatePathway falling back to mock:", err);
        return mock.evaluatePathway(draft);
      }
    },
    async routeForms(draft) {
      try {
        return await live.routeForms(draft);
      } catch {
        return mock.routeForms(draft);
      }
    },
    async mapFormFields(draft) {
      try {
        return await live.mapFormFields(draft);
      } catch {
        return mock.mapFormFields(draft);
      }
    },
    async verifyPacket(fields) {
      try {
        return await live.verifyPacket(fields);
      } catch {
        return mock.verifyPacket(fields);
      }
    },
    async getNearbyResources(zip) {
      try {
        return await live.getNearbyResources(zip);
      } catch {
        return mock.getNearbyResources(zip);
      }
    },
    async createHandoffPassport(draft) {
      try {
        return await live.createHandoffPassport(draft);
      } catch {
        return mock.createHandoffPassport(draft);
      }
    }
  };
}

export const careGuideApi = withMockFallback(liveCareGuideApi, mockCareGuideApi);
export { API_BASE_URL };
