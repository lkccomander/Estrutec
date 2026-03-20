import importlib
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _build_app(monkeypatch, **env_vars):
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)

    import app.config as config_module
    import app.api.routes.auth as auth_routes_module
    import app.api.routes.health as health_routes_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(auth_routes_module)
    importlib.reload(health_routes_module)
    importlib.reload(main_module)
    return main_module.create_app()


def test_security_headers_are_added_to_responses(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev")

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Permissions-Policy"] == "geolocation=(), microphone=(), camera=()"
    assert response.headers["X-Permitted-Cross-Domain-Policies"] == "none"
    assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"


def test_rate_limit_returns_429_for_login(monkeypatch) -> None:
    app = _build_app(
        monkeypatch,
        ENV="dev",
        RATE_LIMIT_WINDOW_SECONDS="60",
        RATE_LIMIT_AUTH_MAX_REQUESTS="2",
    )

    with TestClient(app) as client:
        first = client.post("/auth/login", json={"email": "demo@example.com", "password": "bad-pass"})
        second = client.post("/auth/login", json={"email": "demo@example.com", "password": "bad-pass"})
        third = client.post("/auth/login", json={"email": "demo@example.com", "password": "bad-pass"})

    assert first.status_code == 401
    assert second.status_code == 401
    assert third.status_code == 429
    assert third.json()["detail"] == "Too Many Requests"
    assert "Retry-After" in third.headers


def test_rate_limit_applies_to_public_health(monkeypatch) -> None:
    app = _build_app(
        monkeypatch,
        ENV="dev",
        DATABASE_URL=os.environ["DATABASE_URL"],
        RATE_LIMIT_WINDOW_SECONDS="60",
        RATE_LIMIT_PUBLIC_MAX_REQUESTS="1",
    )

    with TestClient(app) as client:
        first = client.get("/health")
        second = client.get("/health")

    assert first.status_code == 200
    assert second.status_code == 429
