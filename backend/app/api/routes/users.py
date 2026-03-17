from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user, get_user_service, require_roles
from app.schemas.common import UserRead, UserUpdate
from app.services.users import UserService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("", response_model=list[UserRead], summary="Listar usuarios")
def list_users(
    _: dict = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> list[UserRead]:
    return service.list_users()


@router.get("/{usuario_id}", response_model=UserRead, summary="Detalle de usuario")
def get_user(
    usuario_id: str,
    _: dict = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserRead:
    user = service.get_user(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{usuario_id}", response_model=UserRead, summary="Actualizar usuario")
def update_user(
    usuario_id: str,
    payload: UserUpdate,
    _: dict = Depends(require_roles("ADMIN")),
    service: UserService = Depends(get_user_service),
) -> UserRead:
    user = service.update_user(usuario_id, payload.model_dump(exclude_none=True))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{usuario_id}/activar", response_model=UserRead, summary="Activar usuario")
def activate_user(
    usuario_id: str,
    _: dict = Depends(require_roles("ADMIN")),
    service: UserService = Depends(get_user_service),
) -> UserRead:
    user = service.set_user_active(usuario_id, True)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{usuario_id}/desactivar", response_model=UserRead, summary="Desactivar usuario")
def deactivate_user(
    usuario_id: str,
    _: dict = Depends(require_roles("ADMIN")),
    service: UserService = Depends(get_user_service),
) -> UserRead:
    user = service.set_user_active(usuario_id, False)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
