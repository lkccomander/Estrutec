from collections.abc import Generator

import psycopg
from fastapi import HTTPException

from app.config import settings


def get_database_url() -> str:
    if not settings.database_url:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL no esta configurada en backend/.env",
        )
    return settings.database_url


def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    try:
        with psycopg.connect(get_database_url()) as connection:
            yield connection
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo conectar a PostgreSQL: {exc}",
        ) from exc


def check_database_connection() -> dict[str, str]:
    try:
        with psycopg.connect(get_database_url()) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_database(), current_user;")
                database_name, current_user = cursor.fetchone()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo conectar a PostgreSQL: {exc}",
        ) from exc

    return {
        "status": "ok",
        "database": database_name,
        "user": current_user,
    }
