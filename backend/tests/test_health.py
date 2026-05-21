import importlib
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _build_app(monkeypatch, **env_vars):
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)

    import app.config as config_module
    import app.api.routes.health as health_routes_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(health_routes_module)
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


def test_startup_migrations_retry_before_succeeding(monkeypatch) -> None:
    attempts = {"count": 0}

    def fake_run_startup_migrations() -> None:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("db unavailable")

    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("STARTUP_DB_RETRY_ATTEMPTS", "3")
    monkeypatch.setenv("STARTUP_DB_RETRY_DELAY_SECONDS", "0")

    import app.config as config_module
    import app.api.routes.health as health_routes_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(health_routes_module)
    importlib.reload(main_module)
    monkeypatch.setattr(main_module, "_run_startup_migrations", fake_run_startup_migrations)

    app = main_module.create_app()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert attempts["count"] == 3


def test_startup_migrations_raise_after_retry_exhausted(monkeypatch) -> None:
    attempts = {"count": 0}

    def fake_run_startup_migrations() -> None:
        attempts["count"] += 1
        raise RuntimeError("db unavailable")

    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("STARTUP_DB_RETRY_ATTEMPTS", "2")
    monkeypatch.setenv("STARTUP_DB_RETRY_DELAY_SECONDS", "0")

    import app.config as config_module
    import app.api.routes.health as health_routes_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(health_routes_module)
    importlib.reload(main_module)
    monkeypatch.setattr(main_module, "_run_startup_migrations", fake_run_startup_migrations)

    app = main_module.create_app()

    with pytest.raises(RuntimeError, match="db unavailable"):
        with TestClient(app):
            pass

    assert attempts["count"] == 2
