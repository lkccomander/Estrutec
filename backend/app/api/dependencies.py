from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.connection import get_db_connection
from app.repositories.budgets import BudgetRepository
from app.repositories.log_entries import LogEntryRepository
from app.repositories.projects import ProjectRepository
from app.repositories.receipts import ReceiptRepository
from app.repositories.users import UserRepository
from app.security import decode_access_token
from app.services.auth import AuthService
from app.services.budgets import BudgetService
from app.services.log_entries import LogEntryService
from app.services.projects import ProjectService
from app.services.receipts import ReceiptService
from app.services.users import UserService

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


def get_user_service(connection=Depends(get_db_connection)) -> UserService:
    return UserService(UserRepository(connection))


def get_auth_service(connection=Depends(get_db_connection)) -> AuthService:
    return AuthService(UserRepository(connection))


def get_budget_service(connection=Depends(get_db_connection)) -> BudgetService:
    return BudgetService(BudgetRepository(connection))


def get_project_service(connection=Depends(get_db_connection)) -> ProjectService:
    return ProjectService(ProjectRepository(connection))


def get_log_entry_service(connection=Depends(get_db_connection)) -> LogEntryService:
    return LogEntryService(LogEntryRepository(connection))


def get_receipt_service(connection=Depends(get_db_connection)) -> ReceiptService:
    return ReceiptService(ReceiptRepository(connection))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    if not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token requerido",
        )

    user_id = decode_access_token(credentials.credentials)
    return auth_service.get_current_user(user_id)


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict | None:
    if not credentials or not credentials.credentials:
        return None

    user_id = decode_access_token(credentials.credentials)
    return auth_service.get_current_user(user_id)


def require_roles(*roles: str) -> Callable:
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["rol"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta accion",
            )
        return current_user

    return dependency


def require_self_or_roles(*roles: str) -> Callable:
    def dependency(
        usuario_id: str,
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        if current_user["rol"] in roles or str(current_user["usuario_id"]) == usuario_id:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta accion",
        )

    return dependency
