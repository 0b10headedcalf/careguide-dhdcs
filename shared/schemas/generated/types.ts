export type ApiMeta = {
  request_id: string;
  timestamp: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  meta: ApiMeta;
};

export type CaseCreateRequest = {
  language?: "en" | "es";
  explanation_style?: "simple" | "standard" | "detailed";
  consent_status?: "not_requested" | "granted" | "declined" | "revoked";
};

export type IntakeMessageRequest = {
  case_id: string;
  message: string;
  language?: "en" | "es";
  input_mode?: "text" | "voice";
};

export type IntakeConfirmRequest = {
  case_id: string;
  canonical_name: string;
  value: unknown;
  confirmed: boolean;
};

