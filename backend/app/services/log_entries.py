from fastapi import HTTPException, status

from app.repositories.log_entries import LogEntryRepository
from app.schemas.roles import UserRole


class LogEntryService:
    def __init__(self, repository: LogEntryRepository):
        self._repository = repository

    def list_entries(self, current_user: dict) -> list[dict]:
        if current_user["rol"] in {UserRole.ADMIN.value, UserRole.APROBADOR.value}:
            return self._repository.list_entries()
        return self._repository.list_entries_by_user(str(current_user["usuario_id"]))

    def list_entries_for_admin(self) -> list[dict]:
        return self._repository.list_entries()

    def create_entry(self, mensaje: str, usuario_id: str) -> dict:
        return self._repository.create_entry({"mensaje": mensaje, "usuario_id": usuario_id})

    def update_entry(self, log_id: str, estado: str, comentario_estado: str | None, current_user: dict) -> dict:
        entry = self._repository.get_entry(log_id)
        if entry is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada de log no encontrada")

        if (
            current_user["rol"] not in {UserRole.ADMIN.value, UserRole.APROBADOR.value}
            and str(entry["usuario_id"]) != str(current_user["usuario_id"])
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes actualizar esta entrada")

        normalized_status = estado.strip().upper()
        if normalized_status not in {"PENDIENTE", "COMPLETADO", "RECHAZADO"}:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Estado de log invalido")

        return self._repository.update_entry(
            log_id,
            {
                "estado": normalized_status,
                "comentario_estado": comentario_estado.strip() if comentario_estado and comentario_estado.strip() else None,
            },
        )
