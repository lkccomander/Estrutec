from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    nombre: str
    email: str
    password: str = Field(min_length=8, max_length=128)
    rol: str = "REGISTRADOR"


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    usuario_id: UUID
    nombre: str
    email: str
    rol: str
    activo: bool
    created_at: datetime


class AuthResponse(AuthToken):
    user: CurrentUser
