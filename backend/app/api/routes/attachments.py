from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies import get_current_user, get_receipt_service
from app.schemas.common import AttachmentCreate, AttachmentRead
from app.services.receipts import ReceiptService

router = APIRouter(prefix="/comprobantes/{comprobante_id}/adjuntos", tags=["adjuntos"])


@router.get("", response_model=list[AttachmentRead], summary="Listar adjuntos")
def list_attachments(
    comprobante_id: str,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> list[AttachmentRead]:
    return service.list_attachments(comprobante_id, current_user)


@router.post(
    "",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear adjunto",
)
def create_attachment(
    comprobante_id: str,
    payload: AttachmentCreate,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> AttachmentRead:
    return service.create_attachment(comprobante_id, payload.model_dump(), current_user)


@router.delete(
    "/{adjunto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar adjunto",
)
def delete_attachment(
    comprobante_id: str,
    adjunto_id: str,
    current_user: dict = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_service),
) -> Response:
    deleted = service.delete_attachment(comprobante_id, adjunto_id, current_user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
