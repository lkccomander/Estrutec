from app.repositories.log_entries import LogEntryRepository


class LogEntryService:
    def __init__(self, repository: LogEntryRepository):
        self._repository = repository

    def list_entries(self) -> list[dict]:
        return self._repository.list_entries()

    def create_entry(self, mensaje: str, usuario_id: str) -> dict:
        return self._repository.create_entry({"mensaje": mensaje, "usuario_id": usuario_id})
