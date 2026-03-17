from app.repositories.users import UserRepository


class UserService:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def list_users(self) -> list[dict]:
        return self._repository.list_users()

    def get_user(self, user_id: str) -> dict | None:
        return self._repository.get_public_by_id(user_id)

    def update_user(self, user_id: str, payload: dict) -> dict | None:
        return self._repository.update_user(user_id, payload)

    def set_user_active(self, user_id: str, active: bool) -> dict | None:
        return self._repository.update_user(user_id, {"activo": active})
