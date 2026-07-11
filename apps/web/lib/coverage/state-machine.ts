/**
 * Frontend mirror of the case lifecycle. The backend's `case.status` string is
 * normalized into this machine so UI copy and routing derive from one place.
 */

export const CASE_STATES = [
  "STARTED",
  "INTAKE_IN_PROGRESS",
  "PATHWAY_IDENTIFIED",
  "DOCUMENTS_PENDING",
  "FORM_DRAFTED",
  "VERIFICATION_NEEDED",
  "READY_FOR_HUMAN_REVIEW",
  "HANDOFF_CREATED"
] as const;

export type CaseState = (typeof CASE_STATES)[number];

/** Transient UI states any API-backed control can be in. */
export type UiState =
  | "idle"
  | "loading"
  | "listening"
  | "processing"
  | "waiting_for_user"
  | "saving"
  | "success"
  | "empty"
  | "error"
  | "unsupported_browser"
  | "needs_human_review";

const BACKEND_STATUS_MAP: Record<string, CaseState> = {
  created: "STARTED",
  started: "STARTED",
  intake: "INTAKE_IN_PROGRESS",
  intake_in_progress: "INTAKE_IN_PROGRESS",
  pathway_ready: "PATHWAY_IDENTIFIED",
  pathway_identified: "PATHWAY_IDENTIFIED",
  documents_pending: "DOCUMENTS_PENDING",
  form_drafted: "FORM_DRAFTED",
  verification_needed: "VERIFICATION_NEEDED",
  ready_for_human_review: "READY_FOR_HUMAN_REVIEW",
  handoff_created: "HANDOFF_CREATED"
};

export function caseStateFromBackend(status: string | null | undefined): CaseState {
  if (!status) return "STARTED";
  return BACKEND_STATUS_MAP[status.toLowerCase()] ?? "STARTED";
}

/** Where the user should land when they continue a case in this state. */
export function nextRouteForState(state: CaseState): string {
  switch (state) {
    case "STARTED":
    case "INTAKE_IN_PROGRESS":
      return "/coverage/intake";
    case "PATHWAY_IDENTIFIED":
      return "/coverage/results";
    case "DOCUMENTS_PENDING":
      return "/coverage/documents";
    case "FORM_DRAFTED":
      return "/coverage/application";
    case "VERIFICATION_NEEDED":
    case "READY_FOR_HUMAN_REVIEW":
      return "/coverage/review";
    case "HANDOFF_CREATED":
      return "/coverage/help";
  }
}

export function stateLabel(state: CaseState): string {
  switch (state) {
    case "STARTED":
      return "Case started";
    case "INTAKE_IN_PROGRESS":
      return "Intake in progress";
    case "PATHWAY_IDENTIFIED":
      return "Likely pathway identified";
    case "DOCUMENTS_PENDING":
      return "Documents pending";
    case "FORM_DRAFTED":
      return "Application drafted";
    case "VERIFICATION_NEEDED":
      return "Verification needed";
    case "READY_FOR_HUMAN_REVIEW":
      return "Ready for human review";
    case "HANDOFF_CREATED":
      return "Handoff packet created";
  }
}
