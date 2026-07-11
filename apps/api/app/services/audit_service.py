from sqlmodel import Session

from app.models.audit import AuditEvent
from app.utils.json import dumps_json
from app.utils.redaction import redact_payload


def append_audit_event(
    session: Session,
    event_type: str,
    actor_type: str,
    payload: dict,
    case_id: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        case_id=case_id,
        event_type=event_type,
        actor_type=actor_type,
        redacted_payload_json=dumps_json(redact_payload(payload)),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

