import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.auth import AuthService


class FakeUserRepository:
    def __init__(self):
        self.created_payload = None
        self.user_by_email = None
        self.user_by_id = None

    def get_by_email(self, email: str):
        return self.user_by_email

    def create_user(self, payload: dict):
        self.created_payload = payload
        return {
            "usuario_id": "11111111-1111-1111-1111-111111111111",
            "nombre": payload["nombre"],
            "email": payload["email"],
            "rol": payload["rol"],
            "activo": True,
            "created_at": "2026-03-19T00:00:00Z",
        }

    def get_by_id(self, user_id: str):
        return self.user_by_id


def test_register_assigns_registrador_role_even_if_client_cannot_choose_role() -> None:
    repository = FakeUserRepository()
    service = AuthService(repository)

    service.register(
        {
            "nombre": "Usuario",
            "email": "usuario@example.com",
            "password": "una-clave-segura-123",
        }
    )

    assert repository.created_payload is not None
    assert repository.created_payload["rol"] == "REGISTRADOR"


def test_admin_register_can_assign_requested_role() -> None:
    repository = FakeUserRepository()
    service = AuthService(repository)

    service.register(
        {
            "nombre": "Admin creado",
            "email": "admin.creado@example.com",
            "password": "una-clave-segura-123",
        },
        role="ADMIN",
    )

    assert repository.created_payload is not None
    assert repository.created_payload["rol"] == "ADMIN"


def test_get_current_user_rejects_inactive_users() -> None:
    repository = FakeUserRepository()
    repository.user_by_id = {
        "usuario_id": "11111111-1111-1111-1111-111111111111",
        "nombre": "Usuario",
        "email": "usuario@example.com",
        "password_hash": "hash",
        "rol": "REGISTRADOR",
        "activo": False,
        "created_at": "2026-03-19T00:00:00Z",
    }
    service = AuthService(repository)

    with pytest.raises(HTTPException) as exc_info:
        service.get_current_user("11111111-1111-1111-1111-111111111111")

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "El usuario esta inactivo"
