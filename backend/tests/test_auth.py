import importlib
import sys
from pathlib import Path

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
