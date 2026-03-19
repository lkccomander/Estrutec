from fastapi import HTTPException, status

from app.repositories.receipts import ReceiptRepository
from app.schemas.roles import UserRole


class ReceiptService:
    def __init__(self, repository: ReceiptRepository):
        self._repository = repository

    def _is_privileged(self, current_user: dict) -> bool:
        return current_user["rol"] in {UserRole.ADMIN.value, UserRole.APROBADOR.value}

    def _get_receipt_or_404(self, receipt_id: str) -> dict:
        receipt = self._repository.get_receipt(receipt_id)
        if not receipt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comprobante no encontrado",
            )
        return receipt

    def _ensure_can_view_receipt(self, receipt: dict, current_user: dict) -> None:
        if self._is_privileged(current_user):
            return

        if str(receipt["usuario_creador_id"]) == str(current_user["usuario_id"]):
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este comprobante",
        )

    def _ensure_can_manage_receipt(self, receipt: dict, current_user: dict) -> None:
        if current_user["rol"] == UserRole.ADMIN.value:
            return

        if str(receipt["usuario_creador_id"]) == str(current_user["usuario_id"]):
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este comprobante",
        )

    def list_receipts(self, current_user: dict) -> list[dict]:
        if self._is_privileged(current_user):
            return self._repository.list_receipts()
        return self._repository.list_receipts_by_creator(str(current_user["usuario_id"]))

    def create_receipt(self, payload: dict, current_user: dict) -> dict:
        payload["usuario_creador_id"] = str(current_user["usuario_id"])
        return self._repository.create_receipt(payload)

    def get_receipt(self, receipt_id: str, current_user: dict) -> dict:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_view_receipt(receipt, current_user)
        return receipt

    def update_receipt(self, receipt_id: str, payload: dict, current_user: dict) -> dict | None:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_manage_receipt(receipt, current_user)
        return self._repository.update_receipt(receipt_id, payload)

    def delete_receipt(self, receipt_id: str, current_user: dict) -> bool:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_manage_receipt(receipt, current_user)
        return self._repository.delete_receipt(receipt_id)

    def approve_receipt(
        self,
        receipt_id: str,
        approver_id: str,
        approver_role: str,
        observacion: str | None,
    ) -> dict | None:
        receipt = self._get_receipt_or_404(receipt_id)
        if (
            str(receipt["usuario_creador_id"]) == approver_id
            and approver_role != UserRole.ADMIN.value
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes aprobar un comprobante creado por tu propio usuario.",
            )

        try:
            return self._repository.approve_receipt(receipt_id, approver_id, observacion)
        except Exception as exc:
            error_message = str(exc)

            if "Saldo insuficiente" in error_message:
                self._repository.mark_receipt_pending(
                    receipt_id,
                    "Pendiente: el monto del comprobante sobrepasa el saldo restante del presupuesto.",
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "El comprobante no se puede aprobar porque su monto "
                        "sobrepasa el saldo restante del presupuesto."
                    ),
                ) from exc

            if "Moneda incompatible" in error_message:
                self._repository.mark_receipt_pending(
                    receipt_id,
                    "Pendiente: la moneda del comprobante no coincide con la del presupuesto.",
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "El comprobante no se puede aprobar porque su moneda "
                        "no coincide con la del presupuesto."
                    ),
                ) from exc

            if "Tipo de cambio requerido" in error_message:
                self._repository.mark_receipt_pending(
                    receipt_id,
                    "Pendiente: debes indicar el tipo de cambio para convertir el comprobante a la moneda del presupuesto.",
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "El comprobante no se puede aprobar porque falta el tipo de cambio "
                        "para convertirlo a la moneda del presupuesto."
                    ),
                ) from exc

            raise

    def reject_receipt(self, receipt_id: str, approver_id: str, observacion: str | None) -> dict | None:
        receipt = self._get_receipt_or_404(receipt_id)
        if str(receipt["usuario_creador_id"]) == approver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes rechazar un comprobante creado por tu propio usuario.",
            )

        try:
            return self._repository.reject_receipt(receipt_id, approver_id, observacion)
        except Exception as exc:
            error_message = str(exc)

            if "aprobado" in error_message.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede rechazar un comprobante que ya fue aprobado.",
                ) from exc

            raise

    def list_attachments(self, receipt_id: str, current_user: dict) -> list[dict]:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_view_receipt(receipt, current_user)
        return self._repository.list_attachments(receipt_id)

    def create_attachment(self, receipt_id: str, payload: dict, current_user: dict) -> dict:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_manage_receipt(receipt, current_user)
        return self._repository.create_attachment(receipt_id, payload)

    def delete_attachment(self, receipt_id: str, attachment_id: str, current_user: dict) -> bool:
        receipt = self._get_receipt_or_404(receipt_id)
        self._ensure_can_manage_receipt(receipt, current_user)
        return self._repository.delete_attachment(receipt_id, attachment_id)
