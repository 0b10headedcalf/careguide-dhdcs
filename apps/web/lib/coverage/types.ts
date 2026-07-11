export type Language = "en" | "es";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface CaseDraft {
  language: Language;
  zip?: string;
  coverageNeed?: string;
  currentInsurance?: string;
  recentCoverageLoss?: boolean;
  householdSize?: number;
  incomeEstimate?: number;
  incomeFrequency?: string;
  employerCoverageOffer?: "yes" | "no" | "unknown";
  needsCareNow?: boolean;
  confirmedFields: string[];
  /** User attestations about documents ("have" / "need_help"). Never implies upload. */
  docStatus?: Record<string, "have" | "need_help">;
}

export interface FormFieldValue {
  id: string;
  officialFieldLabel: string;
  plainLanguageLabel: string;
  value: string | number | boolean | null;
  sourceType:
    | "user"
    | "document"
    | "rule"
    | "agent_suggestion"
    | "agent_auto_confirmed"
    | "official_api";
  confidence?: number;
  needsReview: boolean;
  explanation: string;
  riskLevel?: "none" | "low" | "medium" | "high";
}

export interface PathwayPreview {
  label: string;
  supportingLine: string;
  reasons: string[];
  missingInformation: string[];
  reviewFlags: string[];
  nextStep: string;
}

export interface DocumentChecklistEntry {
  id: string;
  title: string;
  status: "Needed" | "Added" | "May be requested" | "Need help";
  explanation: string;
}

export interface ResourceSearchResult {
  name: string;
  type: string;
  distance?: string;
  address?: string;
  phone?: string;
  officialSource?: string;
  retrievedDate?: string;
  languageSupport?: string[];
  /** true when the record comes from data/cached_official rather than a live API. */
  isCached?: boolean;
  /** URL of the official source the record originally came from. */
  sourceUrl?: string;
  /** Human-readable source label, e.g. "HRSA", "DataSF". */
  sourceId?: string;
  /** Why the backend recommends this resource, when provided by the source. */
  reasonRecommended?: string;
}

