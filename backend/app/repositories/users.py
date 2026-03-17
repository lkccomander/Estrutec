from psycopg.rows import dict_row


class UserRepository:
    def __init__(self, connection):
        self._connection = connection

    def list_users(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT usuario_id, nombre, email, rol, activo, created_at
                FROM usuario
                ORDER BY created_at ASC
                """
            )
            return cursor.fetchall()

    def list_public_users(self) -> list[dict]:
        return self.list_users()

    def get_by_email(self, email: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    usuario_id,
                    nombre,
                    email,
                    password_hash,
                    rol,
                    activo,
                    created_at
                FROM usuario
                WHERE email = %s
                """,
                (email,),
            )
            return cursor.fetchone()

    def get_by_id(self, user_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    usuario_id,
                    nombre,
                    email,
                    password_hash,
                    rol,
                    activo,
                    created_at
                FROM usuario
                WHERE usuario_id = %s
                """,
                (user_id,),
            )
            return cursor.fetchone()

    def get_public_by_id(self, user_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT usuario_id, nombre, email, rol, activo, created_at
                FROM usuario
                WHERE usuario_id = %s
                """,
                (user_id,),
            )
            return cursor.fetchone()

    def create_user(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO usuario (
                    nombre,
                    email,
                    password_hash,
                    rol
                )
                VALUES (
                    %(nombre)s,
                    %(email)s,
                    %(password_hash)s,
                    %(rol)s
                )
                RETURNING usuario_id, nombre, email, rol, activo, created_at
                """,
                payload,
            )
            user = cursor.fetchone()
        self._connection.commit()
        return user

    def update_password_hash(self, user_id: str, password_hash: str) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE usuario
                SET password_hash = %s
                WHERE usuario_id = %s
                """,
                (password_hash, user_id),
            )
        self._connection.commit()

    def update_user(self, user_id: str, payload: dict) -> dict | None:
        if not payload:
            return self.get_public_by_id(user_id)

        allowed_fields = {"nombre", "rol", "activo"}
        fields = []
        values = []
        for key, value in payload.items():
            if key in allowed_fields:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return self.get_public_by_id(user_id)

        values.append(user_id)
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE usuario
                SET {", ".join(fields)}
                WHERE usuario_id = %s
                RETURNING usuario_id, nombre, email, rol, activo, created_at
                """,
                tuple(values),
            )
            user = cursor.fetchone()
        self._connection.commit()
        return user
