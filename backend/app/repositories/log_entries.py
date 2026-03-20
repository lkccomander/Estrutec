from psycopg.rows import dict_row


class LogEntryRepository:
    def __init__(self, connection):
        self._connection = connection

    def _log_entry_select_clause(self) -> str:
        return """
                SELECT
                    l.log_id,
                    l.mensaje,
                    l.usuario_id,
                    u.nombre AS autor_nombre,
                    u.email AS autor_email,
                    l.created_at,
                    l.estado,
                    l.comentario_estado,
                    l.updated_at
                FROM log_entry l
                JOIN usuario u ON u.usuario_id = l.usuario_id
        """

    def list_entries(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {self._log_entry_select_clause()}
                ORDER BY l.created_at DESC
                """
            )
            return cursor.fetchall()

    def list_entries_by_user(self, user_id: str) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {self._log_entry_select_clause()}
                WHERE l.usuario_id = %s
                ORDER BY l.created_at DESC
                """,
                (user_id,),
            )
            return cursor.fetchall()

    def create_entry(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO log_entry (
                    mensaje,
                    usuario_id
                )
                VALUES (
                    %(mensaje)s,
                    %(usuario_id)s
                )
                RETURNING log_id
                """,
                payload,
            )
            log_id = cursor.fetchone()["log_id"]
            cursor.execute(
                """
                SELECT
                    l.log_id,
                    l.mensaje,
                    l.usuario_id,
                    u.nombre AS autor_nombre,
                    u.email AS autor_email,
                    l.created_at
                FROM log_entry l
                JOIN usuario u ON u.usuario_id = l.usuario_id
                WHERE l.log_id = %s
                """,
                (log_id,),
            )
            entry = cursor.fetchone()
        self._connection.commit()
        return entry

    def get_entry(self, log_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {self._log_entry_select_clause()}
                WHERE l.log_id = %s
                """,
                (log_id,),
            )
            return cursor.fetchone()

    def update_entry(self, log_id: str, payload: dict) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE log_entry
                SET estado = %(estado)s,
                    comentario_estado = %(comentario_estado)s,
                    updated_at = NOW()
                WHERE log_id = %(log_id)s
                RETURNING log_id
                """,
                {"log_id": log_id, **payload},
            )
            if cursor.fetchone() is None:
                self._connection.rollback()
                return None

            cursor.execute(
                f"""
                {self._log_entry_select_clause()}
                WHERE l.log_id = %s
                """,
                (log_id,),
            )
            entry = cursor.fetchone()
        self._connection.commit()
        return entry
