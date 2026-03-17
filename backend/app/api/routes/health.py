from fastapi import APIRouter

from app.config import settings
from app.db.connection import check_database_connection

router = APIRouter(tags=["health"])


@router.get("/", summary="Estado basico de la API")
def read_root() -> dict[str, str]:
    return {"message": "API de gastos funcionando"}


@router.get("/health", summary="Estado general")
def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@router.get("/health/db", summary="Estado de la base de datos")
def health_db() -> dict[str, str]:
    return check_database_connection()
