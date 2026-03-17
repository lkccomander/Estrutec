from fastapi import HTTPException, status

from app.repositories.receipts import ReceiptRepository


class ReceiptService:
    def __init__(self, repository: ReceiptRepository):
        self._repository = repository

    def list_receipts(self) -> list[dict]:
        return self._repository.list_receipts()

    def create_receipt(self, payload: dict) -> dict:
        return self._repository.create_receipt(payload)

    def get_receipt(self, receipt_id: str) -> dict | None:
        return self._repository.get_receipt(receipt_id)

    def update_receipt(self, receipt_id: str, payload: dict) -> dict | None:
        return self._repository.update_receipt(receipt_id, payload)

    def delete_receipt(self, receipt_id: str) -> bool:
        return self._repository.delete_receipt(receipt_id)

    def approve_receipt(self, receipt_id: str, approver_id: str, observacion: str | None) -> dict | None:
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

    def list_attachments(self, receipt_id: str) -> list[dict]:
        return self._repository.list_attachments(receipt_id)

    def create_attachment(self, receipt_id: str, payload: dict) -> dict:
        return self._repository.create_attachment(receipt_id, payload)

    def delete_attachment(self, receipt_id: str, attachment_id: str) -> bool:
        return self._repository.delete_attachment(receipt_id, attachment_id)
