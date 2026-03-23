import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.routes.attachments import create_attachment, delete_attachment, list_attachments
from app.schemas.common import AttachmentCreate
from app.services.receipts import ReceiptService


class FakeAttachmentRepository:
    def __init__(self) -> None:
        self.created_payload = None

    def get_receipt(self, receipt_id: str):
        if receipt_id != "receipt-1":
            return None

        return {
            "comprobante_id": "receipt-1",
            "usuario_creador_id": "creator-1",
            "usuario_aprobador_id": None,
            "estado": "PENDIENTE",
            "presupuesto_id": "budget-1",
            "fecha": "2026-03-20",
            "numero_referencia": None,
            "numero_factura": None,
            "negocio": "Negocio",
            "cedula": None,
            "descripcion": "Desc",
            "monto_gasto": 10,
            "moneda": "CRC",
            "tipo_cambio": None,
            "monto_presupuesto": None,
            "tipo_comprobante": "FACTURA_FOTO",
            "observacion": None,
            "balance": None,
            "created_at": "2026-03-20T00:00:00Z",
            "updated_at": "2026-03-20T00:00:00Z",
        }

    def create_attachment(self, receipt_id: str, payload: dict):
        self.created_payload = payload
        return {"receipt_id": receipt_id, **payload}

    def list_attachments(self, receipt_id: str):
        return [{"adjunto_id": "att-1", "comprobante_id": receipt_id}]

    def delete_attachment(self, receipt_id: str, attachment_id: str):
        return True


class FakeAttachmentApiService:
    def __init__(self) -> None:
        self.created_payload = None
        self.deleted_payload = None

    def list_attachments(self, receipt_id: str, current_user: dict) -> list[dict]:
        if current_user["rol"] == "REGISTRADOR" and current_user["usuario_id"] != "creator-1":
            raise HTTPException(status_code=403, detail="No tienes permisos para acceder a este comprobante")

        return [
            {
                "adjunto_id": "11111111-1111-1111-1111-111111111111",
                "comprobante_id": receipt_id,
                "cdn_path": "https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0",
                "nombre_archivo": "doc.png",
                "tipo_archivo": "image/png",
                "orden": 1,
                "created_at": "2026-03-23T00:00:00Z",
            }
        ]

    def create_attachment(self, receipt_id: str, payload: dict, current_user: dict) -> dict:
        if current_user["rol"] == "REGISTRADOR" and current_user["usuario_id"] != "creator-1":
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar este comprobante")

        self.created_payload = {
            "receipt_id": receipt_id,
            "payload": payload,
            "current_user": current_user,
        }
        return {
            "adjunto_id": "22222222-2222-2222-2222-222222222222",
            "comprobante_id": receipt_id,
            **payload,
            "created_at": "2026-03-23T00:00:00Z",
        }

    def delete_attachment(self, receipt_id: str, attachment_id: str, current_user: dict) -> bool:
        if current_user["rol"] == "REGISTRADOR" and current_user["usuario_id"] != "creator-1":
            raise HTTPException(status_code=403, detail="No tienes permisos para modificar este comprobante")

        self.deleted_payload = {
            "receipt_id": receipt_id,
            "attachment_id": attachment_id,
            "current_user": current_user,
        }
        return attachment_id != "missing-att"


def test_attachment_create_normalizes_metadata_fields() -> None:
    payload = AttachmentCreate(
        cdn_path="  https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0  ",
        nombre_archivo="  factura.png  ",
        tipo_archivo="   ",
        orden=2,
    )

    assert payload.model_dump() == {
        "cdn_path": "https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0",
        "nombre_archivo": "factura.png",
        "tipo_archivo": None,
        "orden": 2,
    }


def test_attachment_create_rejects_blank_cdn_path() -> None:
    with pytest.raises(ValidationError) as exc_info:
        AttachmentCreate(cdn_path="   ", nombre_archivo="archivo.png")

    assert "El cdn_path es obligatorio." in str(exc_info.value)


def test_attachment_create_rejects_non_positive_order() -> None:
    with pytest.raises(ValidationError) as exc_info:
        AttachmentCreate(cdn_path="https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0", orden=0)

    assert "greater than 0" in str(exc_info.value)


def test_creator_can_create_attachment() -> None:
    repository = FakeAttachmentRepository()
    service = ReceiptService(repository)

    payload = AttachmentCreate(
        cdn_path="https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0",
        nombre_archivo="doc.png",
        tipo_archivo="image/png",
    ).model_dump()

    service.create_attachment("receipt-1", payload, {"usuario_id": "creator-1", "rol": "REGISTRADOR"})

    assert repository.created_payload == payload


def test_non_owner_cannot_create_attachment() -> None:
    service = ReceiptService(FakeAttachmentRepository())

    with pytest.raises(HTTPException) as exc_info:
        service.create_attachment(
            "receipt-1",
            {"cdn_path": "https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0", "orden": 1},
            {"usuario_id": "other-user", "rol": "REGISTRADOR"},
        )

    assert exc_info.value.status_code == 403


def test_privileged_user_can_list_attachments_from_other_users_receipt() -> None:
    service = ReceiptService(FakeAttachmentRepository())

    attachments = service.list_attachments("receipt-1", {"usuario_id": "approver-1", "rol": "APROBADOR"})

    assert attachments == [{"adjunto_id": "att-1", "comprobante_id": "receipt-1"}]


def test_list_attachments_route_returns_service_payload() -> None:
    service = FakeAttachmentApiService()
    current_user = {
        "usuario_id": "approver-1",
        "rol": "APROBADOR",
        "activo": True,
    }

    payload = list_attachments("receipt-1", current_user=current_user, service=service)

    assert payload == [
        {
            "adjunto_id": "11111111-1111-1111-1111-111111111111",
            "comprobante_id": "receipt-1",
            "cdn_path": "https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0",
            "nombre_archivo": "doc.png",
            "tipo_archivo": "image/png",
            "orden": 1,
            "created_at": "2026-03-23T00:00:00Z",
        }
    ]


def test_create_attachment_route_returns_created_attachment_and_normalized_payload() -> None:
    service = FakeAttachmentApiService()
    current_user = {
        "usuario_id": "creator-1",
        "rol": "REGISTRADOR",
        "activo": True,
    }

    payload = create_attachment(
        "receipt-1",
        AttachmentCreate(
            cdn_path="  https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0  ",
            nombre_archivo="  doc.png  ",
            tipo_archivo="   ",
            orden=1,
        ),
        current_user=current_user,
        service=service,
    )

    assert service.created_payload == {
        "receipt_id": "receipt-1",
        "payload": {
            "cdn_path": "https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0",
            "nombre_archivo": "doc.png",
            "tipo_archivo": None,
            "orden": 1,
        },
        "current_user": {
            "usuario_id": "creator-1",
            "rol": "REGISTRADOR",
            "activo": True,
        },
    }
    assert payload["nombre_archivo"] == "doc.png"
    assert payload["tipo_archivo"] is None


def test_create_attachment_route_raises_403_for_non_owner() -> None:
    with pytest.raises(HTTPException) as exc_info:
        create_attachment(
            "receipt-1",
            AttachmentCreate(cdn_path="https://www.dropbox.com/scl/fi/7u7c0vhd90yvttwuibpqm/110457861_3_2026.PDF?rlkey=uaiu6mel4v8ty9j8hh9nr7ll5&dl=0", orden=1),
            current_user={"usuario_id": "other-user", "rol": "REGISTRADOR", "activo": True},
            service=FakeAttachmentApiService(),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "No tienes permisos para modificar este comprobante"


def test_delete_attachment_route_raises_404_when_attachment_does_not_exist() -> None:
    with pytest.raises(HTTPException) as exc_info:
        delete_attachment(
            "receipt-1",
            "missing-att",
            current_user={"usuario_id": "creator-1", "rol": "REGISTRADOR", "activo": True},
            service=FakeAttachmentApiService(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Adjunto no encontrado"


def test_delete_attachment_route_returns_204_response() -> None:
    service = FakeAttachmentApiService()
    response = delete_attachment(
        "receipt-1",
        "att-1",
        current_user={"usuario_id": "creator-1", "rol": "REGISTRADOR", "activo": True},
        service=service,
    )

    assert response.status_code == 204
    assert service.deleted_payload == {
        "receipt_id": "receipt-1",
        "attachment_id": "att-1",
        "current_user": {
            "usuario_id": "creator-1",
            "rol": "REGISTRADOR",
            "activo": True,
        },
    }
