/**
 * Lightweight runtime validators for backend API responses (zod-equivalent,
 * no dependency). Every API response is validated before it reaches UI state;
 * a shape mismatch throws ApiValidationError so callers can show a
 * developer-visible panel in non-production and a friendly error in production.
 */

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export type Validator<T> = (value: unknown, path: string) => T;

function fail(path: string, expected: string, value: unknown): never {
  throw new ApiValidationError(
    `Invalid API response at ${path}: expected ${expected}, got ${
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value
    }`
  );
}

export const vString: Validator<string> = (value, path) =>
  typeof value === "string" ? value : fail(path, "string", value);

export const vNumber: Validator<number> = (value, path) =>
  typeof value === "number" && Number.isFinite(value) ? value : fail(path, "number", value);

export const vBoolean: Validator<boolean> = (value, path) =>
  typeof value === "boolean" ? value : fail(path, "boolean", value);

export const vUnknown: Validator<unknown> = (value) => value;

export function vOptional<T>(inner: Validator<T>): Validator<T | undefined> {
  return (value, path) => (value === undefined ? undefined : inner(value, path));
}

export function vNullable<T>(inner: Validator<T>): Validator<T | null> {
  return (value, path) => (value === null ? null : inner(value, path));
}

/** undefined and null both collapse to undefined. */
export function vMaybe<T>(inner: Validator<T>): Validator<T | undefined> {
  return (value, path) =>
    value === undefined || value === null ? undefined : inner(value, path);
}

export function vArray<T>(inner: Validator<T>): Validator<T[]> {
  return (value, path) => {
    if (!Array.isArray(value)) fail(path, "array", value);
    return value.map((item, index) => inner(item, `${path}[${index}]`));
  };
}

export function vObject<T extends Record<string, unknown>>(shape: {
  [K in keyof T]: Validator<T[K]>;
}): Validator<T> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      fail(path, "object", value);
    }
    const record = value as Record<string, unknown>;
    const result = {} as T;
    for (const key of Object.keys(shape) as Array<keyof T>) {
      result[key] = shape[key](record[key as string], `${path}.${String(key)}`);
    }
    return result;
  };
}

/* ------------------------------ API shapes ------------------------------ */

export const caseCreatedSchema = vObject({
  case_id: vString,
  language: vString,
  status: vString
});
export type CaseCreated = ReturnType<typeof caseCreatedSchema>;

export const caseFactSchema = vObject({
  canonical_name: vString,
  value: vUnknown,
  source_type: vString,
  confidence: vMaybe(vNumber),
  confirmed_by_user: vMaybe(vBoolean),
  needs_review: vMaybe(vBoolean),
  risk_level: vMaybe(vString)
});
export type CaseFact = ReturnType<typeof caseFactSchema>;

export const caseDetailSchema = vObject({
  case_id: vString,
  language: vString,
  status: vString,
  user_reviewed: vMaybe(vBoolean),
  facts: vArray(caseFactSchema),
  latest_pathway_result: vMaybe(
    vObject({
      pathway: vMaybe(vString),
      explanation_simple: vMaybe(vString)
    })
  ),
  triggered_forms: vMaybe(vArray(vObject({ form_id: vString, official_url: vMaybe(vString) }))),
  uploaded_documents: vMaybe(vArray(vUnknown)),
  progress_summary: vMaybe(
    vObject({
      intake_complete: vMaybe(vBoolean),
      forms_triggered: vMaybe(vNumber),
      resources_selected: vMaybe(vNumber),
      next_action: vMaybe(vString)
    })
  )
});
export type CaseDetail = ReturnType<typeof caseDetailSchema>;

export const intakeConfirmSchema = vObject({
  case_id: vString,
  canonical_name: vString,
  confirmed: vBoolean
});
export type IntakeConfirmResult = ReturnType<typeof intakeConfirmSchema>;

export const intakeMessageSchema = vObject({
  case_delta: vArray(
    vObject({
      canonical_name: vString,
      suggested_value: vUnknown,
      source_type: vMaybe(vString),
      source_ref: vString,
      confidence: vNumber,
      needs_review: vBoolean,
      explanation_simple: vString,
      auto_confirmed: vMaybe(vBoolean)
    })
  ),
  next_question: vString,
  confirmation_needed: vBoolean,
  warnings: vArray(vString),
  auto_confirmed_facts: vArray(vString)
});
export type IntakeMessageResult = ReturnType<typeof intakeMessageSchema>;

export const actionPlanSchema = vObject({
  case_id: vString,
  status: vString,
  next_action: vString,
  needs_human_review: vBoolean,
  missing_information: vArray(vString)
});
export type ActionPlan = ReturnType<typeof actionPlanSchema>;

export const pathwayResultSchema = vObject({
  likely_pathway: vString,
  explanation_simple: vString,
  missing_questions: vMaybe(vArray(vString)),
  verification_flags: vMaybe(vArray(vString)),
  next_best_action: vMaybe(vString),
  triggered_rule_ids: vMaybe(vArray(vString)),
  human_review_required: vMaybe(vBoolean)
});
export type PathwayResult = ReturnType<typeof pathwayResultSchema>;

export const triggeredFormsSchema = vObject({
  triggered_forms: vArray(
    vObject({
      form_id: vString,
      official_url: vMaybe(vString)
    })
  )
});
export type TriggeredForms = ReturnType<typeof triggeredFormsSchema>;

export const formFieldSchema = vObject({
  official_field_label: vString,
  canonical_field_name: vString,
  value: vUnknown,
  source_type: vString,
  source_ref: vMaybe(vString),
  confidence: vMaybe(vNumber),
  needs_review: vBoolean,
  risk_level: vMaybe(vString),
  explanation_simple: vString
});
export type BackendFormField = ReturnType<typeof formFieldSchema>;

export const mappedFieldsSchema = vObject({
  form_id: vString,
  fields: vArray(formFieldSchema)
});
export type MappedFields = ReturnType<typeof mappedFieldsSchema>;

export const verifyPacketSchema = vObject({
  blocking_flags: vArray(vString),
  warnings: vArray(vString),
  ready_for_handoff: vBoolean
});
export type VerifyPacketResult = ReturnType<typeof verifyPacketSchema>;

export const backendResourceSchema = vObject({
  resource_id: vMaybe(vString),
  name: vString,
  type: vString,
  address: vMaybe(vString),
  phone: vMaybe(vString),
  url: vMaybe(vString),
  distance_miles: vMaybe(vNumber),
  verified_language_support: vMaybe(vArray(vString)),
  source_id: vString,
  source_url: vString,
  retrieved_at: vString,
  is_cached: vBoolean,
  reason_recommended: vMaybe(vString)
});

export const nearbyResourcesSchema = vObject({
  resources: vArray(backendResourceSchema)
});
export type NearbyResources = ReturnType<typeof nearbyResourcesSchema>;

export const handoffPacketSchema = vObject({
  packet_id: vString,
  title: vString,
  html: vString,
  user_reviewed: vBoolean
});
export type HandoffPacket = ReturnType<typeof handoffPacketSchema>;

export const agentMessageSchema = vObject({
  assistant_message: vString,
  next_question: vMaybe(vString),
  suggested_case_updates: vArray(vUnknown),
  form_field_candidates: vArray(vUnknown),
  needs_confirmation: vBoolean,
  safety_flags: vArray(vString),
  next_action: vString,
  agent_available: vBoolean,
  metadata: vMaybe(vUnknown)
});
export type AgentMessageResult = ReturnType<typeof agentMessageSchema>;

export const transcriptionSchema = vObject({
  text: vString,
  language_code: vMaybe(vString),
  language_probability: vMaybe(vNumber),
  words: vArray(vUnknown),
  source: vString
});
export type TranscriptionResult = ReturnType<typeof transcriptionSchema>;

export const documentSchema = vObject({
  document_id: vString,
  case_id: vString,
  filename: vString,
  document_type: vMaybe(vString),
  mime_type: vString,
  size_bytes: vNumber,
  sha256: vString,
  status: vString,
  extraction_status: vString,
  extracted_text_preview: vMaybe(vString),
  needs_confirmation: vBoolean,
  confirmed_by_user: vBoolean
});
export type UploadedDocument = ReturnType<typeof documentSchema>;

export const documentListSchema = vObject({
  documents: vArray(documentSchema)
});
