"""DataSF adapter spatial filter tests.

Pins that when the adapter is given lat/lng, it sends a within_circle $where
predicate to the SODA API — so SF-only dataset does not return irrelevant SF
facilities for a non-SF ZIP.
"""
from unittest.mock import patch

import pytest

from app.adapters.datasf import DataSFAdapter, METERS_PER_MILE


class _FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload

    def raise_for_status(self):
        return None


class _FakeClient:
    def __init__(self, *args, **kwargs):
        self.captured_params = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, params=None):
        self.captured_params = params
        return _FakeResponse([])


@pytest.mark.asyncio
async def test_spatial_filter_added_when_coords_given():
    fake_client = _FakeClient()

    def _factory(*args, **kwargs):
        return fake_client

    with patch("app.adapters.datasf.httpx.AsyncClient", side_effect=_factory):
        adapter = DataSFAdapter()
        await adapter.nearby(lat=37.7599, lng=-122.4148, radius_miles=3.0)

    assert fake_client.captured_params is not None
    where = fake_client.captured_params.get("$where", "")
    assert "within_circle(location, 37.7599, -122.4148" in where
    expected_meters = int(3.0 * METERS_PER_MILE)
    assert str(expected_meters) in where
    assert fake_client.captured_params["$limit"] == 200


@pytest.mark.asyncio
async def test_no_spatial_filter_when_coords_missing():
    fake_client = _FakeClient()

    def _factory(*args, **kwargs):
        return fake_client

    with patch("app.adapters.datasf.httpx.AsyncClient", side_effect=_factory):
        adapter = DataSFAdapter()
        await adapter.nearby(lat=None, lng=None, radius_miles=3.0)

    assert fake_client.captured_params is not None
    assert "$where" not in fake_client.captured_params
    assert fake_client.captured_params["$limit"] == 50
