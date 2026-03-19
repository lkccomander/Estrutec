import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


_DEFAULT_JWT_SECRET = "change-this-in-production"


class Settings(BaseModel):
    env: str = os.getenv("ENV", "dev").lower()
    app_name: str = "Elatilo API"
    app_version: str = "0.1.0"
    database_url: str | None = os.getenv("DATABASE_URL")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", _DEFAULT_JWT_SECRET)
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    allow_public_registration: bool = os.getenv("ALLOW_PUBLIC_REGISTRATION", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        ).split(",")
        if origin.strip()
    ]
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    rate_limit_public_max_requests: int = int(os.getenv("RATE_LIMIT_PUBLIC_MAX_REQUESTS", "60"))
    rate_limit_auth_max_requests: int = int(os.getenv("RATE_LIMIT_AUTH_MAX_REQUESTS", "5"))
    trusted_proxy_headers: bool = os.getenv("TRUSTED_PROXY_HEADERS", "true").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"

    def model_post_init(self, __context) -> None:
        if not self.is_prod:
            return

        if not self.database_url:
            raise RuntimeError("DATABASE_URL no esta configurada en produccion.")

        if (
            not self.jwt_secret_key
            or self.jwt_secret_key == _DEFAULT_JWT_SECRET
            or len(self.jwt_secret_key) < 32
        ):
            raise RuntimeError(
                "JWT_SECRET_KEY no es segura para produccion. "
                "Configura un secreto fuerte de al menos 32 caracteres."
            )


settings = Settings()
