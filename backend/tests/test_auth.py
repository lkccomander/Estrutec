import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app


def test_register_endpoint_is_hidden_when_public_registration_is_disabled() -> None:
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
