import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.log_entries import LogEntryService
from app.services.receipts import ReceiptService


class FakeReceiptRepository:
    def __init__(self):
        self.created_payload = None
        self.updated_payload = None
        self.deleted_receipt_id = None
        self.receipt = {
            "comprobante_id": "receipt-1",
            "usuario_creador_id": "creator-1",
            "usuario_aprobador_id": None,
            "estado": "PENDIENTE",
        }

    def list_receipts(self):
        return [{"scope": "all"}]

    def list_receipts_by_creator(self, user_id: str):
        return [{"scope": user_id}]

    def create_receipt(self, payload: dict):
        self.created_payload = payload
        return payload

    def get_receipt(self, receipt_id: str):
        if receipt_id == self.receipt["comprobante_id"]:
            return {
                **self.receipt,
                "presupuesto_id": "budget-1",
                "fecha": "2026-03-19",
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
                "created_at": "2026-03-19T00:00:00Z",
                "updated_at": "2026-03-19T00:00:00Z",
            }
        return None

    def update_receipt(self, receipt_id: str, payload: dict):
        self.updated_payload = payload
        return self.get_receipt(receipt_id)

    def delete_receipt(self, receipt_id: str):
        self.deleted_receipt_id = receipt_id
        return True

    def approve_receipt(self, receipt_id: str, approver_id: str, observacion: str | None):
        return self.get_receipt(receipt_id)

    def reject_receipt(self, receipt_id: str, approver_id: str, observacion: str | None):
        return self.get_receipt(receipt_id)

    def list_attachments(self, receipt_id: str):
        return [{"adjunto_id": "att-1"}]

    def create_attachment(self, receipt_id: str, payload: dict):
        return payload

    def delete_attachment(self, receipt_id: str, attachment_id: str):
        return True


class FakeLogEntryRepository:
    def list_entries(self):
        return [{"scope": "all"}]

    def list_entries_by_user(self, user_id: str):
        return [{"scope": user_id}]

    def create_entry(self, payload: dict):
        return payload


def test_receipt_creator_id_is_forced_from_authenticated_user() -> None:
    repository = FakeReceiptRepository()
    service = ReceiptService(repository)

    current_user = {"usuario_id": "current-user", "rol": "REGISTRADOR"}
    payload = {"usuario_creador_id": "other-user", "descripcion": "algo"}

    service.create_receipt(payload, current_user)

    assert repository.created_payload is not None
    assert repository.created_payload["usuario_creador_id"] == "current-user"


def test_registrador_only_lists_own_receipts() -> None:
    service = ReceiptService(FakeReceiptRepository())

    results = service.list_receipts({"usuario_id": "creator-1", "rol": "REGISTRADOR"})

    assert results == [{"scope": "creator-1"}]


def test_registrador_cannot_view_other_users_receipt() -> None:
    service = ReceiptService(FakeReceiptRepository())

    with pytest.raises(HTTPException) as exc_info:
        service.get_receipt("receipt-1", {"usuario_id": "other-user", "rol": "REGISTRADOR"})

    assert exc_info.value.status_code == 403


def test_creator_can_update_own_receipt() -> None:
    repository = FakeReceiptRepository()
    service = ReceiptService(repository)

    service.update_receipt("receipt-1", {"descripcion": "nuevo"}, {"usuario_id": "creator-1", "rol": "REGISTRADOR"})

    assert repository.updated_payload == {"descripcion": "nuevo"}


def test_non_owner_cannot_delete_receipt() -> None:
    service = ReceiptService(FakeReceiptRepository())

    with pytest.raises(HTTPException) as exc_info:
        service.delete_receipt("receipt-1", {"usuario_id": "other-user", "rol": "APROBADOR"})

    assert exc_info.value.status_code == 403


def test_privileged_user_can_view_any_receipt() -> None:
    service = ReceiptService(FakeReceiptRepository())

    receipt = service.get_receipt("receipt-1", {"usuario_id": "approver-1", "rol": "APROBADOR"})

    assert receipt["comprobante_id"] == "receipt-1"


def test_user_cannot_approve_own_receipt() -> None:
    service = ReceiptService(FakeReceiptRepository())

    with pytest.raises(HTTPException) as exc_info:
        service.approve_receipt("receipt-1", "creator-1", "APROBADOR", None)

    assert exc_info.value.status_code == 403


def test_admin_can_approve_own_receipt() -> None:
    repository = FakeReceiptRepository()
    repository.receipt = {
        **repository.receipt,
        "usuario_creador_id": "admin-1",
    }
    service = ReceiptService(repository)

    receipt = service.approve_receipt("receipt-1", "admin-1", "ADMIN", None)

    assert receipt is not None


def test_log_entries_are_filtered_for_non_privileged_users() -> None:
    service = LogEntryService(FakeLogEntryRepository())

    entries = service.list_entries({"usuario_id": "user-1", "rol": "REGISTRADOR"})

    assert entries == [{"scope": "user-1"}]


def test_log_entries_are_global_for_privileged_users() -> None:
    service = LogEntryService(FakeLogEntryRepository())

    entries = service.list_entries({"usuario_id": "admin-1", "rol": "ADMIN"})

    assert entries == [{"scope": "all"}]
