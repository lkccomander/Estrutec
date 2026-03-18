import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app


def test_health_endpoint_returns_app_metadata() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_db_endpoint_reports_database_status() -> None:
    with TestClient(app) as client:
        response = client.get("/health/db")

    assert response.status_code == 200
    payload = response.json()
    expected_database_name = urlparse(os.environ["DATABASE_URL"]).path.lstrip("/")
    assert payload["status"] == "ok"
    assert payload["database"] == expected_database_name
