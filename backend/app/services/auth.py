from fastapi import HTTPException, status

from app.repositories.users import UserRepository
from app.security import (
    create_access_token,
    hash_password,
    needs_password_rehash,
    verify_password,
)


class AuthService:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def register(self, payload: dict) -> dict:
        existing_user = self._repository.get_by_email(payload["email"])
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con ese email",
            )

        user_to_create = {
            "nombre": payload["nombre"],
            "email": payload["email"],
            "password_hash": hash_password(payload["password"]),
            "rol": payload["rol"],
        }
        user = self._repository.create_user(user_to_create)
        token = create_access_token(str(user["usuario_id"]))
        return {"access_token": token, "token_type": "bearer", "user": user}

    def login(self, email: str, password: str) -> dict:
        user = self._repository.get_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales invalidas",
            )

        if not user["activo"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario esta inactivo",
            )

        if needs_password_rehash(user["password_hash"]):
            new_password_hash = hash_password(password)
            self._repository.update_password_hash(str(user["usuario_id"]), new_password_hash)
            user["password_hash"] = new_password_hash

        token = create_access_token(str(user["usuario_id"]))
        return {"access_token": token, "token_type": "bearer", "user": user}

    def get_current_user(self, user_id: str) -> dict:
        user = self._repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        return user
