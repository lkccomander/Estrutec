from pathlib import Path

import psycopg
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.attachments import router as attachments_router
from app.api.routes.auth import router as auth_router
from app.api.routes.budgets import router as budgets_router
from app.api.routes.exchange_rates import router as exchange_rates_router
from app.api.routes.health import router as health_router
from app.api.routes.log_entries import router as log_entries_router
from app.api.routes.projects import router as projects_router
from app.api.routes.receipts import router as receipts_router
from app.api.routes.users import router as users_router
from app.config import settings
from app.db.connection import get_database_url
from app.middleware.rate_limit import RateLimitMiddleware, RateLimitRule
from app.middleware.security_headers import SecurityHeadersMiddleware


def _resolve_database_dir() -> Path:
    backend_dir = Path(__file__).resolve().parent
    candidates = [
        backend_dir / "DATABASE",
        backend_dir.parent / "DATABASE",
    ]

    for candidate in candidates:
        if (candidate / "DB.SQL").exists() and (candidate / "migrations").is_dir():
            return candidate

    searched_paths = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(
        "No se encontro DATABASE/ con DB.SQL y migrations/. "
        f"Rutas revisadas: {searched_paths}"
    )


def _run_startup_migrations() -> None:
    database_dir = _resolve_database_dir()
    baseline_sql = database_dir / "DB.SQL"
    migrations_dir = database_dir / "migrations"

    try:
        with psycopg.connect(get_database_url(), autocommit=True) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS app_migration_log (
                        migration_name TEXT PRIMARY KEY,
                        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )

                cursor.execute(baseline_sql.read_text(encoding="utf-8"))

                for sql_path in sorted(migrations_dir.glob("*.sql")):
                    migration_name = sql_path.name
                    cursor.execute(
                        """
                        SELECT 1
                        FROM app_migration_log
                        WHERE migration_name = %s
                        """,
                        (migration_name,),
                    )
                    if cursor.fetchone():
                        continue

                    cursor.execute(sql_path.read_text(encoding="utf-8"))
                    cursor.execute(
                        """
                        INSERT INTO app_migration_log (migration_name)
                        VALUES (%s)
                        ON CONFLICT (migration_name) DO NOTHING
                        """,
                        (migration_name,),
                    )
    except Exception as exc:
        raise RuntimeError(
            "No se pudieron ejecutar las migraciones de arranque. "
            "Revisa permisos de la base de datos y el contenido de DATABASE/."
        ) from exc


def _friendly_validation_message(exc: RequestValidationError) -> str:
    for error in exc.errors():
        location = error.get("loc", ())
        error_type = error.get("type")

        if "password" in location and error_type == "string_too_short":
            min_length = error.get("ctx", {}).get("min_length", 8)
            return (
                f"La contrasena es demasiado corta. "
                f"Usa al menos {min_length} caracteres."
            )

        if "email" in location:
            return "Revisa el correo electronico ingresado."

    return "Hay datos invalidos en el formulario. Revisa los campos e intenta de nuevo."


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API para gestion de presupuestos y comprobantes de gastos.",
        docs_url=None if settings.is_prod else "/docs",
        redoc_url=None if settings.is_prod else "/redoc",
        openapi_url=None if settings.is_prod else "/openapi.json",
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": _friendly_validation_message(exc),
                "fields": exc.errors(),
                "path": str(request.url.path),
            },
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        trust_proxy_headers=settings.trusted_proxy_headers,
        rules=[
            RateLimitRule(
                path="/",
                methods=("GET",),
                max_requests=settings.rate_limit_public_max_requests,
                window_seconds=settings.rate_limit_window_seconds,
            ),
            RateLimitRule(
                path="/health",
                methods=("GET",),
                max_requests=settings.rate_limit_public_max_requests,
                window_seconds=settings.rate_limit_window_seconds,
            ),
            RateLimitRule(
                path="/auth/login",
                methods=("POST",),
                max_requests=settings.rate_limit_auth_max_requests,
                window_seconds=settings.rate_limit_window_seconds,
            ),
            RateLimitRule(
                path="/auth/register",
                methods=("POST",),
                max_requests=settings.rate_limit_auth_max_requests,
                window_seconds=settings.rate_limit_window_seconds,
            ),
        ],
    )
    app.add_event_handler("startup", _run_startup_migrations)
    app.include_router(health_router)
    app.include_router(exchange_rates_router)
    app.include_router(log_entries_router)
    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(projects_router)
    app.include_router(budgets_router)
    app.include_router(receipts_router)
    app.include_router(attachments_router)
    return app


app = create_app()
