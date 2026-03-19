from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    APROBADOR = "APROBADOR"
    REGISTRADOR = "REGISTRADOR"
