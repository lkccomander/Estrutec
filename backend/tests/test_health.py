import importlib
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _build_app(monkeypatch, **env_vars):
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)

    import app.config as config_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(main_module)
    return main_module.create_app()


def test_health_endpoint_returns_app_metadata(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev")
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_db_endpoint_reports_database_status(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev")
    with TestClient(app) as client:
        response = client.get("/health/db")

    assert response.status_code == 200
    payload = response.json()
    expected_database_name = urlparse(os.environ["DATABASE_URL"]).path.lstrip("/")
    assert payload["status"] == "ok"
    assert payload["database"] == expected_database_name


def test_health_db_endpoint_is_hidden_in_production(monkeypatch) -> None:
    app = _build_app(
        monkeypatch,
        ENV="prod",
        DATABASE_URL=os.environ["DATABASE_URL"],
        JWT_SECRET_KEY="x" * 48,
    )

    with TestClient(app) as client:
        response = client.get("/health/db")

    assert response.status_code == 404


def test_docs_and_openapi_are_disabled_in_production(monkeypatch) -> None:
    app = _build_app(
        monkeypatch,
        ENV="prod",
        DATABASE_URL=os.environ["DATABASE_URL"],
        JWT_SECRET_KEY="x" * 48,
    )

    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None
