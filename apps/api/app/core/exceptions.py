from fastapi import status


class CareBridgeError(Exception):
    code = "CAREBRIDGE_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class CaseNotFoundError(CareBridgeError):
    code = "CASE_NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND


class SourceUnavailableError(CareBridgeError):
    code = "SOURCE_UNAVAILABLE"
    status_code = status.HTTP_424_FAILED_DEPENDENCY


class InvalidRuleConfigurationError(CareBridgeError):
    code = "INVALID_RULE_CONFIGURATION"
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT


class FormNotFoundError(CareBridgeError):
    code = "FORM_NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND


class VerificationBlockedError(CareBridgeError):
    code = "VERIFICATION_BLOCKED"
    status_code = status.HTTP_409_CONFLICT


class ExternalAPIError(CareBridgeError):
    code = "EXTERNAL_API_ERROR"
    status_code = status.HTTP_424_FAILED_DEPENDENCY


class LLMUnavailableError(CareBridgeError):
    code = "LLM_UNAVAILABLE"
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class ConsentRequiredError(CareBridgeError):
    code = "CONSENT_REQUIRED"
    status_code = status.HTTP_409_CONFLICT
