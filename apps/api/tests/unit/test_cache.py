from sqlmodel import Session

from app.db.session import engine
from app.services.cache_service import cache_official_response


def test_source_cache_metadata_present():
    with Session(engine) as session:
        snapshot = cache_official_response(
            session,
            "covered_ca_forms",
            "official_website",
            "https://www.coveredca.com/support/forms/",
            {"ok": True},
            200,
        )
    assert snapshot.source_id == "covered_ca_forms"
    assert snapshot.source_url.startswith("https://")
    assert snapshot.content_hash
    assert snapshot.is_current is True

