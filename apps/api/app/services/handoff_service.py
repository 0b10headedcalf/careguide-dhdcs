from html import escape

from sqlmodel import Session

from app.core.constants import OFFICIAL_PACKET_TITLE
from app.models.handoff import HandoffPacket
from app.services.case_service import case_detail
from app.utils.dates import utc_now_iso
from app.utils.json import dumps_json


def create_handoff_packet(session: Session, case_id: str, user_reviewed: bool) -> dict:
    if not user_reviewed:
        raise ValueError("User review is required before creating a handoff packet.")
    detail = case_detail(session, case_id)
    html = _render_packet(detail)
    packet = HandoffPacket(
        case_id=case_id,
        packet_version="1",
        user_reviewed=True,
        html_path_or_content_ref=html,
        source_list_json=dumps_json(_source_list(detail)),
    )
    session.add(packet)
    session.commit()
    session.refresh(packet)
    return {"packet_id": packet.id, "title": OFFICIAL_PACKET_TITLE, "html": html, "user_reviewed": True}


def _render_packet(detail: dict) -> str:
    facts = "".join(
        f"<li><strong>{escape(fact['canonical_name'])}</strong>: {escape(str(fact['value']))}</li>"
        for fact in detail["facts"]
        if fact["confirmed_by_user"]
    )
    missing = "".join(f"<li>{escape(flag)}</li>" for flag in detail.get("verification_flags", []))
    return f"""
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>{escape(OFFICIAL_PACKET_TITLE)}</title></head>
<body>
  <h1>{escape(OFFICIAL_PACKET_TITLE)}</h1>
  <p><strong>Not an official submission.</strong></p>
  <p>User review timestamp: {escape(utc_now_iso())}</p>
  <h2>Likely pathway</h2>
  <p>{escape(str((detail.get("latest_pathway_result") or {}).get("pathway", "Not evaluated")))}</p>
  <h2>Confirmed facts</h2>
  <ul>{facts}</ul>
  <h2>Missing fields and verification warnings</h2>
  <ul>{missing}</ul>
  <h2>Triggered forms</h2>
  <ul>{"".join(f"<li>{escape(route['form_id'])}: {escape(route['official_url'])}</li>" for route in detail.get("triggered_forms", []))}</ul>
  <h2>Source list</h2>
  <p>Official source URLs are listed with triggered forms and resources when available.</p>
</body>
</html>
"""


def _source_list(detail: dict) -> list[dict]:
    return [{"form_id": route["form_id"], "official_url": route["official_url"]} for route in detail.get("triggered_forms", [])]

