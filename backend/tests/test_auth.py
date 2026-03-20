import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.dependencies import get_optional_current_user


def _build_app(monkeypatch, **env_vars):
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)

    import app.config as config_module
    import app.api.routes.auth as auth_routes_module
    import main as main_module

    importlib.reload(config_module)
    importlib.reload(auth_routes_module)
    importlib.reload(main_module)
    return main_module.create_app()


def test_register_endpoint_is_hidden_when_public_registration_is_disabled(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev", ALLOW_PUBLIC_REGISTRATION="false")
    with TestClient(app) as client:
        response = client.post(
            "/auth/register",
            json={
                "nombre": "Usuario Prueba",
                "email": "prueba@example.com",
                "password": "supersegura123",
                "rol": "ADMIN",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Not Found"


def test_admin_can_create_users_even_when_public_registration_is_disabled(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev", ALLOW_PUBLIC_REGISTRATION="false")

    class FakeAuthService:
        def register(self, payload: dict, role: str | None = None) -> dict:
            return {
                "access_token": "created-user-token",
                "token_type": "bearer",
                "user": {
                    "usuario_id": "22222222-2222-2222-2222-222222222222",
                    "nombre": payload["nombre"],
                    "email": payload["email"],
                    "rol": role or "REGISTRADOR",
                    "activo": True,
                    "created_at": "2026-03-19T00:00:00Z",
                },
            }

    app.dependency_overrides[get_optional_current_user] = lambda: {
        "usuario_id": "11111111-1111-1111-1111-111111111111",
        "rol": "ADMIN",
        "activo": True,
    }
    import app.api.routes.auth as auth_routes_module

    app.dependency_overrides[auth_routes_module.get_auth_service] = lambda: FakeAuthService()

    with TestClient(app) as client:
        response = client.post(
            "/auth/register",
            json={
                "nombre": "Usuario Admin",
                "email": "admin.crea@example.com",
                "password": "supersegura123",
                "rol": "APROBADOR",
            },
        )

    assert response.status_code == 201
    assert response.json()["user"]["rol"] == "APROBADOR"


def test_non_admin_cannot_create_users_when_authenticated(monkeypatch) -> None:
    app = _build_app(monkeypatch, ENV="dev", ALLOW_PUBLIC_REGISTRATION="false")

    app.dependency_overrides[get_optional_current_user] = lambda: {
        "usuario_id": "33333333-3333-3333-3333-333333333333",
        "rol": "REGISTRADOR",
        "activo": True,
    }

    with TestClient(app) as client:
        response = client.post(
            "/auth/register",
            json={
                "nombre": "Intento invalido",
                "email": "invalido@example.com",
                "password": "supersegura123",
                "rol": "ADMIN",
            },
        )

    assert response.status_code == 403
