import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel


TEST_DB = Path(__file__).resolve().parent / "test_carebridge.db"
TEST_CACHE_DIR = Path(os.environ.get("TMPDIR", "/tmp")) / "carebridge_test_official_cache"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["OFFICIAL_CACHE_DIR"] = str(TEST_CACHE_DIR)

from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_db():
    engine.dispose()
    shutil.rmtree(TEST_CACHE_DIR, ignore_errors=True)
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)
    shutil.rmtree(TEST_CACHE_DIR, ignore_errors=True)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def case_id(client):
    response = client.post("/api/cases", json={"language": "en", "explanation_style": "simple"})
    assert response.status_code == 200
    return response.json()["data"]["case_id"]
