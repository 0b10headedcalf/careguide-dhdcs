import type {
  CaseDraft,
  DocumentChecklistEntry,
  FormFieldValue,
  PathwayPreview,
  ResourceSearchResult
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
        ? "You may be a match for Medi-Cal"
        : "Demo pathway preview",
      supportingLine: "Based on the household and income information you provided.",
      reasons: [
        "Your household details are enough to prepare a careful pathway preview.",
        draft.recentCoverageLoss
          ? "You shared that coverage may have changed recently."
          : "Coverage changes and current insurance status still need review.",
        "CareGuide keeps final eligibility language separate from this preview."
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
export { API_BASE_URL };

