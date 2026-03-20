from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_current_user, get_log_entry_service
from app.schemas.common import LogEntryCreate, LogEntryRead, LogEntryUpdate
from app.services.log_entries import LogEntryService

router = APIRouter(prefix="/log", tags=["log"])


@router.get("", response_model=list[LogEntryRead], summary="Listar mensajes del log")
def list_log_entries(
    current_user: dict = Depends(get_current_user),
    service: LogEntryService = Depends(get_log_entry_service),
) -> list[LogEntryRead]:
    return service.list_entries(current_user)


@router.post(
    "",
    response_model=LogEntryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Guardar mensaje en el log",
)
def create_log_entry(
    payload: LogEntryCreate,
    current_user: dict = Depends(get_current_user),
    service: LogEntryService = Depends(get_log_entry_service),
) -> LogEntryRead:
    return service.create_entry(payload.mensaje, str(current_user["usuario_id"]))


@router.patch(
    "/{log_id}",
    response_model=LogEntryRead,
    summary="Actualizar estado de una entrada del log",
)
def update_log_entry(
    log_id: str,
    payload: LogEntryUpdate,
    current_user: dict = Depends(get_current_user),
    service: LogEntryService = Depends(get_log_entry_service),
) -> LogEntryRead:
    return service.update_entry(log_id, payload.estado, payload.comentario_estado, current_user)
