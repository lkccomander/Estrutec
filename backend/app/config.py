import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    app_name: str = "Elatilo API"
    app_version: str = "0.1.0"
    database_url: str | None = os.getenv("DATABASE_URL")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
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


settings = Settings()
