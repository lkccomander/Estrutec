import re

from fastapi import HTTPException, status

_SENSITIVE_PATTERNS = (
    re.compile(r"\bpassword\b", re.IGNORECASE),
    re.compile(r"\bcontrasena\b", re.IGNORECASE),
    re.compile(r"\bauthorization\b", re.IGNORECASE),
    re.compile(r"\bbearer\s+[a-z0-9\-_\.=]+\b", re.IGNORECASE),
    re.compile(r"\baccess[_\-\s]?token\b", re.IGNORECASE),
    re.compile(r"\brefresh[_\-\s]?token\b", re.IGNORECASE),
    re.compile(r"\bcookie\b", re.IGNORECASE),
    re.compile(r"\bdatabase_url\b", re.IGNORECASE),
    re.compile(r"\.env\b", re.IGNORECASE),
    re.compile(r"\bapi[_\-]?key\b", re.IGNORECASE),
)


def ensure_safe_log_text(value: str | None, *, field_name: str) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return None

    for pattern in _SENSITIVE_PATTERNS:
        if pattern.search(normalized_value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"El campo {field_name} contiene informacion sensible. "
                    "Elimina secretos, tokens o credenciales antes de guardarlo."
                ),
            )

    return normalized_value
