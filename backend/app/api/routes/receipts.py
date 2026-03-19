from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies import get_current_user, get_receipt_service, require_roles
from app.schemas.common import ReceiptCreate, ReceiptDecision, ReceiptRead, ReceiptUpdate, ReceiptWithBalanceRead
from app.services.receipts import ReceiptService

router = APIRouter(prefix="/comprobantes", tags=["comprobantes"])


@router.get("", response_model=list[ReceiptWithBalanceRead], summary="Listar comprobantes")
def list_receipts(
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> list[ReceiptWithBalanceRead]:
    return service.list_receipts(current_user)


@router.post(
    "",
    response_model=ReceiptRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear comprobante",
)
def create_receipt(
    payload: ReceiptCreate,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> ReceiptRead:
    return service.create_receipt(payload.model_dump(mode="json"), current_user)


@router.get("/{comprobante_id}", response_model=ReceiptRead, summary="Detalle de comprobante")
def get_receipt(
    comprobante_id: str,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> ReceiptRead:
    return service.get_receipt(comprobante_id, current_user)


@router.patch("/{comprobante_id}", response_model=ReceiptRead, summary="Actualizar comprobante")
def update_receipt(
    comprobante_id: str,
    payload: ReceiptUpdate,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> ReceiptRead:
    receipt = service.update_receipt(
        comprobante_id,
        payload.model_dump(exclude_none=True, mode="json"),
        current_user,
    )
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return receipt


@router.delete("/{comprobante_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar comprobante")
def delete_receipt(
    comprobante_id: str,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> Response:
    deleted = service.delete_receipt(comprobante_id, current_user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{comprobante_id}/aprobar", response_model=ReceiptRead, summary="Aprobar comprobante")
def approve_receipt(
    comprobante_id: str,
    payload: ReceiptDecision,
    current_user: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ReceiptService = Depends(get_receipt_service),
) -> ReceiptRead:
    receipt = service.approve_receipt(
        comprobante_id,
        str(current_user["usuario_id"]),
        str(current_user["rol"]),
        payload.observacion,
    )
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return receipt


@router.post("/{comprobante_id}/rechazar", response_model=ReceiptRead, summary="Rechazar comprobante")
def reject_receipt(
    comprobante_id: str,
    payload: ReceiptDecision,
    current_user: dict = Depends(require_roles("ADMIN", "APROBADOR")),
    service: ReceiptService = Depends(get_receipt_service),
) -> ReceiptRead:
    receipt = service.reject_receipt(comprobante_id, str(current_user["usuario_id"]), payload.observacion)
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return receipt
