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
