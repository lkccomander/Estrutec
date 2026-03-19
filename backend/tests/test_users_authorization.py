import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.dependencies import get_current_user, get_user_service
from app.api.routes.users import router as users_router


class FakeUserService:
    def list_users(self):
        return [
            {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "nombre": "Admin",
                "email": "admin@example.com",
                "rol": "ADMIN",
                "activo": True,
                "created_at": "2026-03-19T00:00:00Z",
            }
        ]

    def get_user(self, user_id: str):
        return {
            "usuario_id": user_id,
            "nombre": "Usuario",
            "email": "usuario@example.com",
            "rol": "REGISTRADOR",
            "activo": True,
            "created_at": "2026-03-19T00:00:00Z",
        }


def _create_test_client(current_user: dict) -> TestClient:
    app = FastAPI()
    app.include_router(users_router)
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_user_service] = lambda: FakeUserService()
    return TestClient(app)


def test_list_users_requires_admin() -> None:
    current_user = {
        "usuario_id": "22222222-2222-2222-2222-222222222222",
        "rol": "REGISTRADOR",
    }

    with _create_test_client(current_user) as client:
        response = client.get("/usuarios")

    assert response.status_code == 403


def test_admin_can_list_users() -> None:
    current_user = {
        "usuario_id": "11111111-1111-1111-1111-111111111111",
        "rol": "ADMIN",
    }

    with _create_test_client(current_user) as client:
        response = client.get("/usuarios")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_user_can_view_own_profile_but_not_other_users() -> None:
    current_user = {
        "usuario_id": "33333333-3333-3333-3333-333333333333",
        "rol": "REGISTRADOR",
    }

    with _create_test_client(current_user) as client:
        own_response = client.get("/usuarios/33333333-3333-3333-3333-333333333333")
        other_response = client.get("/usuarios/44444444-4444-4444-4444-444444444444")

    assert own_response.status_code == 200
    assert other_response.status_code == 403
