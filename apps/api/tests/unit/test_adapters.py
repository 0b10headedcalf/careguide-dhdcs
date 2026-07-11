from app.adapters.datasf import normalize_datasf_record
from app.adapters.hrsa import normalize_hrsa_feature


def test_hrsa_normalization_preserves_source_metadata():
    record = normalize_hrsa_feature(
        {
            "attributes": {
                "OBJECTID": 123,
                "SITE_NM": "Public Health Center",
                "SITE_PHONE_NUM": "555-0100",
                "SITE_ADDRESS": "1 Main",
                "SITE_CITY": "San Francisco",
                "SITE_STATE_ABBR": "CA",
                "SITE_ZIP_CD": "94102",
                "HCC_TYP_DESC": "Health Center",
            },
            "geometry": {"x": -122.4, "y": 37.7},
        },
        "https://example.test/hrsa",
    )
    assert record["name"] == "Public Health Center"
    assert record["verified_language_support"] == []
    assert record["source_id"] == "hrsa_health_centers"


def test_datasf_normalization_does_not_invent_language_support():
    record = normalize_datasf_record(
        {"facility_name": "City Clinic", "facility_type": "Clinic", "services": "Primary care"},
        "https://example.test/datasf",
    )
    assert record["name"] == "City Clinic"
    assert record["verified_language_support"] == []

