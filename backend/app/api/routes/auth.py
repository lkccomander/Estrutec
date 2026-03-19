from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_auth_service, get_current_user
from app.config import settings
from app.schemas.auth import AuthResponse, CurrentUser, LoginRequest, RegisterRequest
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar usuario",
    include_in_schema=settings.allow_public_registration,
)
def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    if not settings.allow_public_registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return AuthResponse(**service.register(payload.model_dump()))


@router.post("/login", response_model=AuthResponse, summary="Iniciar sesion")
def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    return AuthResponse(**service.login(payload.email, payload.password))


@router.get("/me", response_model=CurrentUser, summary="Usuario autenticado")
def me(current_user: dict = Depends(get_current_user)) -> CurrentUser:
    current_user.pop("password_hash", None)
    return CurrentUser(**current_user)
