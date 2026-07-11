from html import escape

from sqlmodel import Session

from app.core.constants import OFFICIAL_PACKET_TITLE
from app.models.case import Case
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
    case = session.get(Case, case_id)
    if case:
        case.user_reviewed = True
        case.status = "handoff_created"
        session.add(case)
    session.add(packet)
    session.commit()
    session.refresh(packet)
    return {"packet_id": packet.id, "title": OFFICIAL_PACKET_TITLE, "html": html, "user_reviewed": True}


def get_handoff_packet_html(session: Session, packet_id: str) -> str | None:
    packet = session.get(HandoffPacket, packet_id)
    if not packet:
        return None
    return packet.html_path_or_content_ref


# --- Rendering ---------------------------------------------------------------

PATHWAY_LABELS = {
    "medi_cal_likely": "Medi-Cal — likely pathway",
    "covered_ca_likely": "Covered California — likely pathway",
    "mixed_household": "Mixed-status household — human review",
    "human_review": "Human review required",
}


def _render_packet(detail: dict) -> str:
    pathway_row = detail.get("latest_pathway_result") or {}
    pathway_key = pathway_row.get("pathway") or "human_review"
    pathway_label = PATHWAY_LABELS.get(pathway_key, pathway_key.replace("_", " ").title())
    pathway_explanation = escape((pathway_row.get("explanation_simple") or "").strip())
    missing = pathway_row.get("missing_questions") or []
    verification_flags = detail.get("verification_flags") or []
    triggered_forms = detail.get("triggered_forms") or []

    confirmed_facts = [f for f in detail.get("facts", []) if f.get("confirmed_by_user")]

    return f"""<!doctype html>
<html lang="{escape(detail.get("language", "en"))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(OFFICIAL_PACKET_TITLE)}</title>
<style>
{_stylesheet()}
</style>
</head>
<body>
<main class="page">
  <header class="header">
    <div>
      <p class="eyebrow">CareGuide - Handoff Passport</p>
      <h1>{escape(OFFICIAL_PACKET_TITLE)}</h1>
    </div>
    <button type="button" class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  </header>

  <p class="disclaimer">
    <strong>Not an official submission.</strong> This is a CareGuide-generated
    review packet the user prepared before speaking with a certified counselor.
    The state or county makes the final coverage decision.
  </p>

  <section>
    <h2>Likely pathway</h2>
    <p class="pathway-label">{escape(pathway_label)}</p>
    { f'<p class="pathway-explanation">{pathway_explanation}</p>' if pathway_explanation else '' }
  </section>

  <section>
    <h2>Confirmed information</h2>
    { _confirmed_facts_table(confirmed_facts) if confirmed_facts else '<p class="empty">No facts confirmed by the user.</p>' }
  </section>

  <section>
    <h2>Items to review with the counselor</h2>
    { _list_or_empty(missing, "The user still needs to answer:") }
    { _list_or_empty(verification_flags, "Verification flags:") }
  </section>

  <section>
    <h2>Prepared forms</h2>
    { _forms_list(triggered_forms) if triggered_forms else '<p class="empty">No forms triggered yet.</p>' }
  </section>

  <section>
    <h2>Source list</h2>
    <ul class="sources">
      { _source_list_html(triggered_forms) }
    </ul>
  </section>

  <footer class="footer">
    <p>Prepared for review on {escape(utc_now_iso())}. Case ID: {escape(str(detail.get("case_id", "")))}.</p>
    <p>CareBridge CA does not submit forms, apply signatures, appoint representatives, or make eligibility determinations. Every value shown here originated from the user and has been reviewed by them before this packet was generated.</p>
  </footer>
</main>
</body>
</html>
"""


def _stylesheet() -> str:
    return """
:root {
  --ink: #10204F;
  --muted: #4B5878;
  --line: rgba(16, 32, 79, 0.14);
  --cream: #F4EEE5;
  --accent: #315ED6;
  --danger: #B45309;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
main.page { max-width: 780px; margin: 0 auto; padding: 32px 40px 40px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; margin-bottom: 24px; }
.eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; color: var(--accent); font-weight: 800; }
h1 { margin: 6px 0 0; font-size: 24px; line-height: 1.2; }
h2 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
section { margin-bottom: 22px; }
.disclaimer { background: var(--cream); border-left: 4px solid var(--danger); padding: 12px 16px; margin-bottom: 24px; font-size: 14px; }
.pathway-label { font-size: 20px; font-weight: 800; margin: 0 0 8px; color: var(--accent); }
.pathway-explanation { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: var(--cream); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); font-size: 13px; }
.empty { color: var(--muted); font-style: italic; font-size: 14px; }
ul { padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.55; }
ul.sources li { margin-bottom: 4px; word-break: break-all; }
.footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); line-height: 1.5; }
.print-btn { padding: 10px 18px; border-radius: 8px; background: var(--accent); color: #fff; border: none; font-weight: 700; font-size: 14px; cursor: pointer; }
.print-btn:hover { background: #274EB7; }
@media print {
  main.page { padding: 12mm 15mm; max-width: none; }
  .no-print { display: none !important; }
  .header { border-color: #000; }
  .pathway-label { color: #000; }
  body { font-size: 12px; }
}
"""


def _confirmed_facts_table(facts: list[dict]) -> str:
    rows = "".join(
        f"""<tr>
          <td>{escape(_pretty_fact_name(fact['canonical_name']))}</td>
          <td>{escape(str(fact.get('value', '')))}</td>
          <td class="mono">{escape(fact.get('source_type', ''))} ({escape(f"{fact.get('confidence', 0):.2f}")})</td>
        </tr>"""
        for fact in facts
    )
    return f"""<table>
<thead><tr><th>Question</th><th>User's answer</th><th>Source</th></tr></thead>
<tbody>{rows}</tbody>
</table>"""


def _forms_list(triggered_forms: list[dict]) -> str:
    items = "".join(
        f"""<li>
          <strong>{escape(str(form.get('form_name') or form.get('form_id', '')))}</strong>
          { ' <span class="empty">(CareBridge preview worksheet — not an official form)</span>' if form.get('is_preview') else '' }
          <br>
          <a href="{escape(form.get('official_url', ''))}" target="_blank" rel="noopener noreferrer">{escape(form.get('official_url', ''))}</a>
        </li>"""
        for form in triggered_forms
    )
    return f"<ul>{items}</ul>"


def _list_or_empty(items: list[str], heading: str) -> str:
    if not items:
        return ""
    items_html = "".join(f"<li>{escape(str(item))}</li>" for item in items)
    return f"<p><strong>{escape(heading)}</strong></p><ul>{items_html}</ul>"


def _source_list_html(triggered_forms: list[dict]) -> str:
    seen: set[str] = set()
    entries: list[str] = []
    for form in triggered_forms:
        url = form.get("official_url")
        if not url or url in seen:
            continue
        seen.add(url)
        label = form.get("form_name") or form.get("form_id") or url
        entries.append(f'<li><strong>{escape(str(label))}</strong>: <a href="{escape(url)}" target="_blank" rel="noopener noreferrer">{escape(url)}</a></li>')
    if not entries:
        return "<li class=\"empty\">No official source URLs referenced.</li>"
    return "".join(entries)


def _pretty_fact_name(canonical_name: str) -> str:
    return canonical_name.replace(".", " · ").replace("_", " ").title()


def _source_list(detail: dict) -> list[dict]:
    return [
        {"form_id": route["form_id"], "official_url": route["official_url"]}
        for route in detail.get("triggered_forms", [])
    ]
